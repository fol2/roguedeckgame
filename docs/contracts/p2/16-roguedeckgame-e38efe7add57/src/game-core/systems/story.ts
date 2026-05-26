import type { PetInstanceId, StoryEventId } from "../ids";
import type { GameActionError, GameActionResult } from "../model/action";
import type { GameEvent } from "../model/event";
import type { PetInstance } from "../model/pet";
import type { GameContentRegistry } from "../model/registry";
import type {
  PetSideStoryDefinition,
  PetStoryContext,
  StoryEventDefinition,
  StoryOutcome,
  StoryRequirement
} from "../model/story";

export type PetStoryProgressState = {
  readonly run?: PetStoryContext["run"];
  readonly petInstances: readonly PetInstance[];
};

export type StoryEventApplicationInput = {
  readonly storyEventId: StoryEventId;
  readonly petInstanceId: PetInstanceId;
  readonly run?: PetStoryContext["run"];
  readonly petInstances: readonly PetInstance[];
  readonly registry: GameContentRegistry;
  readonly context: PetStoryContext;
};

export type StoryEventCheckInput = {
  readonly storyEvent: StoryEventDefinition;
  readonly petInstance: PetInstance;
  readonly run?: PetStoryContext["run"];
  readonly petInstances: readonly PetInstance[];
  readonly registry: GameContentRegistry;
  readonly context: PetStoryContext;
  readonly allowInactivePet?: boolean;
};

export type EvaluatePetSideStoriesInput = {
  readonly run?: PetStoryContext["run"];
  readonly petInstances: readonly PetInstance[];
  readonly registry: GameContentRegistry;
  readonly context: PetStoryContext;
  readonly petInstanceId?: PetInstanceId;
};

const error = (code: string, message: string, path?: string): GameActionError => ({
  code,
  message,
  path
});

const rejectedEvent = (actionError: GameActionError): GameEvent => ({
  type: "ActionRejected",
  code: actionError.code,
  message: actionError.message,
  path: actionError.path
});

const reject = <TState>(
  state: TState,
  actionError: GameActionError
): GameActionResult<TState> => ({
  ok: false,
  state,
  events: [rejectedEvent(actionError)],
  errors: [actionError]
});

const uniqueAppend = <T>(values: readonly T[] | undefined, value: T): readonly T[] =>
  values?.includes(value) ? [...values] : [...(values ?? []), value];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalisePetInstance = (petInstance: PetInstance): PetInstance => ({
  ...petInstance,
  unlockedEvolutionNodeIds: petInstance.unlockedEvolutionNodeIds ?? [],
  seenStoryEventIds: petInstance.seenStoryEventIds ?? []
});

const knownStoryTriggers = new Set(["manual", "runCreated", "combatWon", "nodeCompleted", "runCompleted"]);

const validateStoryRegistryCollections = (
  registry: GameContentRegistry
): GameActionError | undefined => {
  if (!isRecord(registry)) {
    return error("invalid_story_registry", "Registry must be an object.", "registry");
  }

  const candidate = registry as unknown as {
    readonly pets?: unknown;
    readonly petUpgrades?: unknown;
    readonly storyEvents?: unknown;
    readonly petSideStories?: unknown;
  };

  if (!Array.isArray(candidate.pets)) {
    return error("invalid_story_registry", "Registry pets must be an array.", "registry.pets");
  }

  if (!Array.isArray(candidate.storyEvents)) {
    return error("invalid_story_registry", "Registry storyEvents must be an array.", "registry.storyEvents");
  }

  if (!Array.isArray(candidate.petSideStories)) {
    return error("invalid_story_registry", "Registry petSideStories must be an array.", "registry.petSideStories");
  }

  if (!Array.isArray(candidate.petUpgrades)) {
    return error("invalid_story_registry", "Registry petUpgrades must be an array.", "registry.petUpgrades");
  }

  for (let index = 0; index < candidate.petUpgrades.length; index += 1) {
    const upgrade = candidate.petUpgrades[index];
    if (
      !isRecord(upgrade) ||
      typeof upgrade.id !== "string" ||
      typeof upgrade.petDefinitionId !== "string"
    ) {
      return error("invalid_story_registry", "Registry petUpgrades must contain upgrade objects with string ids and petDefinitionIds.", `registry.petUpgrades[${index}]`);
    }
  }

  return undefined;
};

const findDuplicateString = (values: readonly string[]): string | undefined => {
  const seen = new Set<string>();
  return values.find((value) => {
    if (seen.has(value)) {
      return true;
    }

    seen.add(value);
    return false;
  });
};

const validateStoryRegistryAmbiguity = (
  registry: GameContentRegistry
): GameActionError | undefined => {
  const storyEventIds = registry.storyEvents
    .filter(isRecord)
    .map((storyEvent) => storyEvent.id)
    .filter((id) => typeof id === "string");
  const duplicateStoryEventId = findDuplicateString(storyEventIds);
  if (duplicateStoryEventId) {
    return error("ambiguous_story_event", `Story event '${duplicateStoryEventId}' is registered more than once.`, "registry.storyEvents");
  }

  const petSideStoryIds = registry.petSideStories
    .filter(isRecord)
    .map((sideStory) => sideStory.id)
    .filter((id) => typeof id === "string");
  const duplicatePetSideStoryId = findDuplicateString(petSideStoryIds);
  if (duplicatePetSideStoryId) {
    return error("ambiguous_pet_side_story", `Pet side story '${duplicatePetSideStoryId}' is registered more than once.`, "registry.petSideStories");
  }

  const embeddedStoryEventIds = registry.petSideStories
    .filter(isRecord)
    .flatMap((sideStory) => Array.isArray(sideStory.events) ? sideStory.events : [])
    .filter(isRecord)
    .map((storyEvent) => storyEvent.id)
    .filter((id): id is string => typeof id === "string");
  const duplicateEmbeddedStoryEventId = findDuplicateString(embeddedStoryEventIds);
  if (duplicateEmbeddedStoryEventId) {
    return error(
      "ambiguous_story_event",
      `Embedded story event '${duplicateEmbeddedStoryEventId}' is declared more than once.`,
      "registry.petSideStories.events"
    );
  }

  const sideStoryIdByEventId = new Map<string, string>();
  for (const sideStory of registry.petSideStories.filter(isRecord)) {
    if (typeof sideStory.id !== "string") {
      continue;
    }

    const linkedEventIds = [
      sideStory.id,
      ...(Array.isArray(sideStory.events)
        ? sideStory.events
            .filter(isRecord)
            .map((storyEvent) => storyEvent.id)
            .filter((id): id is string => typeof id === "string")
        : [])
    ];

    for (const storyEventId of linkedEventIds) {
      const existingSideStoryId = sideStoryIdByEventId.get(storyEventId);
      if (existingSideStoryId && existingSideStoryId !== sideStory.id) {
        return error(
          "ambiguous_pet_side_story",
          `Story event '${storyEventId}' is linked to multiple pet side stories.`,
          "registry.petSideStories"
        );
      }

      sideStoryIdByEventId.set(storyEventId, sideStory.id);
    }
  }

  return undefined;
};

const findStoryEvent = (
  registry: GameContentRegistry,
  storyEventId: StoryEventId
): StoryEventDefinition | undefined => {
  const registeredEvent = (Array.isArray(registry.storyEvents) ? registry.storyEvents : [])
    .filter(isRecord)
    .find((storyEvent) => storyEvent.id === storyEventId) as StoryEventDefinition | undefined;

  if (registeredEvent) {
    return registeredEvent;
  }

  return (Array.isArray(registry.petSideStories) ? registry.petSideStories : [])
    .filter(isRecord)
    .flatMap((sideStory) => Array.isArray(sideStory.events) ? sideStory.events : [])
    .filter(isRecord)
    .find((storyEvent) => storyEvent.id === storyEventId) as StoryEventDefinition | undefined;
};

const findPetSideStoryForEvent = (
  registry: GameContentRegistry,
  storyEventId: StoryEventId
): PetSideStoryDefinition | undefined =>
  (Array.isArray(registry.petSideStories) ? registry.petSideStories : [])
    .filter(isRecord)
    .find((sideStory) =>
    sideStory.id === storyEventId ||
    (
      Array.isArray(sideStory.events) &&
      sideStory.events
        .filter(isRecord)
        .some((storyEvent) => storyEvent.id === storyEventId)
    )
  ) as PetSideStoryDefinition | undefined;

const validateRequirementShape = (requirement: StoryRequirement): GameActionError | undefined => {
  if (!isRecord(requirement)) {
    return error("invalid_story_requirement", "Story requirement must be an object.", "requirements");
  }

  switch (requirement.type) {
    case "petBondAtLeast":
      return Number.isInteger(requirement.bondLevel) && requirement.bondLevel >= 0
        ? undefined
        : error("invalid_story_requirement", "petBondAtLeast requires a non-negative integer bondLevel.", "requirements.bondLevel");
    case "hasPetMemory":
      return typeof requirement.memoryId === "string" && requirement.memoryId.length > 0
        ? undefined
        : error("invalid_story_requirement", "hasPetMemory requires a memoryId.", "requirements.memoryId");
    case "bossDefeated":
      return typeof requirement.bossId === "string" && requirement.bossId.length > 0
        ? undefined
        : error("invalid_story_requirement", "bossDefeated requires a bossId.", "requirements.bossId");
    case "chapterUnlocked":
      return typeof requirement.chapterId === "string" && requirement.chapterId.length > 0
        ? undefined
        : error("invalid_story_requirement", "chapterUnlocked requires a chapterId.", "requirements.chapterId");
    case "hasSeenEvent":
      return typeof requirement.eventId === "string" && requirement.eventId.length > 0
        ? undefined
        : error("invalid_story_requirement", "hasSeenEvent requires an eventId.", "requirements.eventId");
    case "activePetHasTag":
      return typeof requirement.tag === "string" && requirement.tag.length > 0
        ? undefined
        : error("invalid_story_requirement", "activePetHasTag requires a tag.", "requirements.tag");
    case "playerClassIs":
      return typeof requirement.playerClassId === "string" && requirement.playerClassId.length > 0
        ? undefined
        : error("invalid_story_requirement", "playerClassIs requires a playerClassId.", "requirements.playerClassId");
    case "hasPetStoryFlag":
      return typeof requirement.flagId === "string" && requirement.flagId.length > 0
        ? undefined
        : error("invalid_story_requirement", "hasPetStoryFlag requires a flagId.", "requirements.flagId");
    case "lacksPetStoryFlag":
      return typeof requirement.flagId === "string" && requirement.flagId.length > 0
        ? undefined
        : error("invalid_story_requirement", "lacksPetStoryFlag requires a flagId.", "requirements.flagId");
    case "runStatusIs":
      return (
        requirement.status === "not_started" ||
        requirement.status === "map_select" ||
        requirement.status === "combat" ||
        requirement.status === "reward" ||
        requirement.status === "completed" ||
        requirement.status === "lost"
      )
        ? undefined
        : error("invalid_story_requirement", "runStatusIs requires a supported run status.", "requirements.status");
    case "completedRunNodeType":
      return (
        requirement.nodeType === "combat" ||
        requirement.nodeType === "elite" ||
        requirement.nodeType === "rest" ||
        requirement.nodeType === "event" ||
        requirement.nodeType === "boss"
      )
        ? undefined
        : error("invalid_story_requirement", "completedRunNodeType requires a supported node type.", "requirements.nodeType");
    default:
      return error("unknown_story_requirement", "Story requirement type is not supported.", "requirements");
  }
};

const validateStoryEventShape = (storyEvent: StoryEventDefinition): GameActionError | undefined => {
  if (!isRecord(storyEvent) || typeof storyEvent.id !== "string" || storyEvent.id.length === 0) {
    return error("invalid_story_event", "Story event must be an object with a string id.", "storyEvent.id");
  }

  if (typeof storyEvent.title !== "string" || storyEvent.title.length === 0) {
    return error("invalid_story_event", "Story event title must be a non-empty string.", "storyEvent.title");
  }

  if (typeof storyEvent.description !== "string" || storyEvent.description.length === 0) {
    return error("invalid_story_event", "Story event description must be a non-empty string.", "storyEvent.description");
  }

  if (
    !Array.isArray(storyEvent.tags) ||
    storyEvent.tags.some((tag) => typeof tag !== "string" || tag.length === 0)
  ) {
    return error("invalid_story_event", "Story event tags must be a string array.", "storyEvent.tags");
  }

  if (storyEvent.trigger !== undefined && !knownStoryTriggers.has(storyEvent.trigger)) {
    return error("invalid_story_event", "Story event trigger is unsupported.", "storyEvent.trigger");
  }

  if (storyEvent.repeatable !== undefined && typeof storyEvent.repeatable !== "boolean") {
    return error("invalid_story_event", "Story event repeatable must be a boolean when present.", "storyEvent.repeatable");
  }

  if (!Array.isArray(storyEvent.requirements)) {
    return error("invalid_story_requirements", "Story event requirements must be an array.", "storyEvent.requirements");
  }

  if (!Array.isArray(storyEvent.outcomes)) {
    return error("invalid_story_outcomes", "Story event outcomes must be an array.", "storyEvent.outcomes");
  }

  for (const requirement of storyEvent.requirements) {
    const requirementError = validateRequirementShape(requirement);
    if (requirementError) {
      return requirementError;
    }
  }

  for (const outcome of storyEvent.outcomes) {
    const outcomeError = validateOutcome(outcome);
    if (outcomeError) {
      return outcomeError;
    }
  }

  return undefined;
};

const validatePetSideStoryRuntimeShape = (
  sideStory: PetSideStoryDefinition,
  registry: GameContentRegistry
): GameActionError | undefined => {
  if (typeof sideStory.id !== "string" || sideStory.id.length === 0) {
    return error("invalid_story_registry", "Pet side story id must be a string.", "registry.petSideStories.id");
  }

  if (typeof sideStory.petDefinitionId !== "string" || sideStory.petDefinitionId.length === 0) {
    return error(
      "invalid_story_registry",
      "Pet side story petDefinitionId must be a string.",
      "registry.petSideStories.petDefinitionId"
    );
  }

  if (
    !Array.isArray(sideStory.memoryIds) ||
    sideStory.memoryIds.some((memoryId) => typeof memoryId !== "string" || memoryId.length === 0)
  ) {
    return error("invalid_story_registry", "Pet side story memoryIds must be a string array.", "registry.petSideStories.memoryIds");
  }

  if (
    !Array.isArray(sideStory.storyFlagIds) ||
    sideStory.storyFlagIds.some((flagId) => typeof flagId !== "string" || flagId.length === 0)
  ) {
    return error("invalid_story_registry", "Pet side story storyFlagIds must be a string array.", "registry.petSideStories.storyFlagIds");
  }

  if (!Array.isArray(sideStory.events)) {
    return error("invalid_story_registry", "Pet side story events must be an array.", "registry.petSideStories.events");
  }

  const memoryIds = new Set(sideStory.memoryIds);
  const storyFlagIds = new Set(sideStory.storyFlagIds);

  for (const storyEvent of sideStory.events) {
    const storyEventError = validateStoryEventShape(storyEvent);
    if (storyEventError) {
      return storyEventError;
    }

    for (const outcome of storyEvent.outcomes) {
      if (outcome.type === "unlockPetMemory" && !memoryIds.has(outcome.memoryId)) {
        return error(
          "missing_pet_side_story_memory",
          `Pet side story '${sideStory.id}' unlocks undeclared memory '${outcome.memoryId}'.`,
          "registry.petSideStories.events.outcomes"
        );
      }

      if (outcome.type === "setStoryFlag" && !storyFlagIds.has(outcome.flagId)) {
        return error(
          "missing_pet_side_story_flag",
          `Pet side story '${sideStory.id}' sets undeclared flag '${outcome.flagId}'.`,
          "registry.petSideStories.events.outcomes"
        );
      }

      if (outcome.type === "unlockPetUpgrade") {
        const upgrade = findPetUpgrade(registry, outcome.upgradeId);
        if (!upgrade || upgrade.petDefinitionId !== sideStory.petDefinitionId) {
          return error(
            "wrong_pet_story_upgrade",
            `Pet side story '${sideStory.id}' embeds upgrade '${outcome.upgradeId}' for a different pet definition.`,
            "registry.petSideStories.events.outcomes"
          );
        }
      }
    }
  }

  return undefined;
};

const validateStoryEventDeclarations = (
  sideStory: PetSideStoryDefinition,
  storyEvent: StoryEventDefinition,
  registry: GameContentRegistry
): GameActionError | undefined => {
  const storyEventError = validateStoryEventShape(storyEvent);
  if (storyEventError) {
    return storyEventError;
  }

  const memoryIds = new Set(sideStory.memoryIds);
  const storyFlagIds = new Set(sideStory.storyFlagIds);

  for (const outcome of storyEvent.outcomes) {
    if (outcome.type === "unlockPetMemory" && !memoryIds.has(outcome.memoryId)) {
      return error(
        "missing_pet_side_story_memory",
        `Pet side story '${sideStory.id}' applies undeclared memory '${outcome.memoryId}'.`,
        "storyEvent.outcomes"
      );
    }

    if (outcome.type === "setStoryFlag" && !storyFlagIds.has(outcome.flagId)) {
      return error(
        "missing_pet_side_story_flag",
        `Pet side story '${sideStory.id}' applies undeclared flag '${outcome.flagId}'.`,
        "storyEvent.outcomes"
      );
    }

    if (outcome.type === "unlockPetUpgrade") {
      const upgrade = findPetUpgrade(registry, outcome.upgradeId);
      if (!upgrade || upgrade.petDefinitionId !== sideStory.petDefinitionId) {
        return error(
          "wrong_pet_story_upgrade",
          `Pet side story '${sideStory.id}' applies upgrade '${outcome.upgradeId}' for a different pet definition.`,
          "storyEvent.outcomes"
        );
      }
    }
  }

  return undefined;
};

const findPetUpgrade = (
  registry: GameContentRegistry,
  upgradeId: string
): Record<string, unknown> | undefined =>
  registry.petUpgrades
    .filter(isRecord)
    .find((candidate) => candidate.id === upgradeId);

const globalFlagsFor = (
  run: PetStoryContext["run"] | undefined,
  context: PetStoryContext
): readonly string[] => [
  ...(run?.storyFlags ?? []),
  ...(context.run?.storyFlags ?? []),
  ...(context.globalStoryFlags ?? [])
];

const isActivePet = (
  run: PetStoryContext["run"] | undefined,
  petInstance: PetInstance
): boolean =>
  !run || run.activePetInstanceIds.includes(petInstance.id);

const requirementMet = (
  requirement: StoryRequirement,
  input: StoryEventCheckInput
): GameActionResult<boolean> => {
  const requirementError = validateRequirementShape(requirement);
  if (requirementError) {
    return reject(false, requirementError);
  }

  const petInstance = normalisePetInstance(input.petInstance);
  const run = input.run ?? input.context.run;
  const petDefinition = input.registry.pets
    .filter(isRecord)
    .find((pet) => pet.id === petInstance.definitionId);

  switch (requirement.type) {
    case "petBondAtLeast":
      return { ok: true, state: petInstance.bondLevel >= requirement.bondLevel, events: [], errors: [] };
    case "hasPetMemory":
      return { ok: true, state: petInstance.unlockedMemoryIds.includes(requirement.memoryId), events: [], errors: [] };
    case "bossDefeated":
      return {
        ok: true,
        state: globalFlagsFor(run, input.context).includes(`boss:${requirement.bossId}:defeated`),
        events: [],
        errors: []
      };
    case "chapterUnlocked":
      return {
        ok: true,
        state: globalFlagsFor(run, input.context).includes(`chapter:${requirement.chapterId}:unlocked`),
        events: [],
        errors: []
      };
    case "hasSeenEvent":
      return { ok: true, state: petInstance.seenStoryEventIds?.includes(requirement.eventId) ?? false, events: [], errors: [] };
    case "activePetHasTag":
      return {
        ok: true,
        state:
          (input.allowInactivePet === true || isActivePet(run, petInstance)) &&
          Array.isArray(petDefinition?.tags) &&
          petDefinition.tags.includes(requirement.tag),
        events: [],
        errors: []
      };
    case "playerClassIs":
      return { ok: true, state: run?.playerClassId === requirement.playerClassId, events: [], errors: [] };
    case "hasPetStoryFlag":
      return { ok: true, state: petInstance.storyFlags.includes(requirement.flagId), events: [], errors: [] };
    case "lacksPetStoryFlag":
      return { ok: true, state: !petInstance.storyFlags.includes(requirement.flagId), events: [], errors: [] };
    case "runStatusIs":
      return { ok: true, state: run?.status === requirement.status, events: [], errors: [] };
    case "completedRunNodeType":
      return { ok: true, state: input.context.completedNodeType === requirement.nodeType, events: [], errors: [] };
    default:
      return reject(false, error("unknown_story_requirement", "Story requirement type is not supported.", "requirements"));
  }
};

const validateOutcome = (outcome: unknown): GameActionError | undefined => {
  if (!isRecord(outcome)) {
    return error("invalid_story_outcome", "Story outcome must be an object.", "outcomes");
  }

  const storyOutcome = outcome as StoryOutcome;
  switch (storyOutcome.type) {
    case "setStoryFlag":
      return typeof storyOutcome.flagId === "string" && storyOutcome.flagId.length > 0
        ? undefined
        : error("invalid_story_outcome", "setStoryFlag requires a flagId.", "outcomes.flagId");
    case "unlockPetMemory":
      return typeof storyOutcome.memoryId === "string" && storyOutcome.memoryId.length > 0
        ? undefined
        : error("invalid_story_outcome", "unlockPetMemory requires a memoryId.", "outcomes.memoryId");
    case "unlockPetUpgrade":
      return typeof storyOutcome.upgradeId === "string" && storyOutcome.upgradeId.length > 0
        ? undefined
        : error("invalid_story_outcome", "unlockPetUpgrade requires an upgradeId.", "outcomes.upgradeId");
    case "unlockEvolutionNode":
      return typeof storyOutcome.evolutionNodeId === "string" && storyOutcome.evolutionNodeId.length > 0
        ? undefined
        : error("invalid_story_outcome", "unlockEvolutionNode requires an evolutionNodeId.", "outcomes.evolutionNodeId");
    case "markStoryEventSeen":
      return typeof storyOutcome.eventId === "string" && storyOutcome.eventId.length > 0
        ? undefined
        : error("invalid_story_outcome", "markStoryEventSeen requires an eventId.", "outcomes.eventId");
    case "addBondXp":
      return Number.isInteger(storyOutcome.amount) && storyOutcome.amount > 0
        ? undefined
        : error("invalid_story_bond_xp", "Story bond XP outcome must be a positive integer.", "outcomes");
    default:
      return error("unknown_story_outcome", "Story outcome type is not supported.", "outcomes");
  }
};

export const canApplyStoryEvent = (
  input: StoryEventCheckInput
): GameActionResult<boolean> => {
  const registryError = validateStoryRegistryCollections(input.registry);
  if (registryError) {
    return reject(false, registryError);
  }

  const storyEvent = input.storyEvent;
  const petInstance = normalisePetInstance(input.petInstance);

  const storyEventError = validateStoryEventShape(storyEvent);
  if (storyEventError) {
    return reject(false, storyEventError);
  }

  if (storyEvent.trigger && storyEvent.trigger !== input.context.trigger) {
    return { ok: true, state: false, events: [], errors: [] };
  }

  if (storyEvent.repeatable !== true && petInstance.seenStoryEventIds?.includes(storyEvent.id)) {
    return { ok: true, state: false, events: [], errors: [] };
  }

  for (const outcome of storyEvent.outcomes) {
    const outcomeError = validateOutcome(outcome);
    if (outcomeError) {
      return reject(false, outcomeError);
    }
  }

  for (const requirement of storyEvent.requirements) {
    const result = requirementMet(requirement, { ...input, petInstance });
    if (!result.ok) {
      return result;
    }

    if (!result.state) {
      return { ok: true, state: false, events: [], errors: [] };
    }
  }

  return { ok: true, state: true, events: [], errors: [] };
};

const applyOutcome = (
  petInstance: PetInstance,
  outcome: StoryOutcome
): { readonly petInstance: PetInstance; readonly events: readonly GameEvent[] } => {
  const normalised = normalisePetInstance(petInstance);

  switch (outcome.type) {
    case "unlockPetMemory": {
      const nextMemoryIds = uniqueAppend(normalised.unlockedMemoryIds, outcome.memoryId);
      return {
        petInstance: { ...normalised, unlockedMemoryIds: nextMemoryIds },
        events: nextMemoryIds.length === normalised.unlockedMemoryIds.length
          ? []
          : [{ type: "PetMemoryUnlocked", petInstanceId: normalised.id, memoryId: outcome.memoryId }]
      };
    }
    case "setStoryFlag": {
      const nextFlags = uniqueAppend(normalised.storyFlags, outcome.flagId);
      return {
        petInstance: { ...normalised, storyFlags: nextFlags },
        events: nextFlags.length === normalised.storyFlags.length
          ? []
          : [{ type: "PetStoryFlagSet", petInstanceId: normalised.id, flagId: outcome.flagId }]
      };
    }
    case "unlockPetUpgrade": {
      const nextUpgradeIds = uniqueAppend(normalised.unlockedUpgradeIds, outcome.upgradeId);
      return {
        petInstance: { ...normalised, unlockedUpgradeIds: nextUpgradeIds },
        events: nextUpgradeIds.length === normalised.unlockedUpgradeIds.length
          ? []
          : [{ type: "PetUpgradeUnlocked", petInstanceId: normalised.id, upgradeId: outcome.upgradeId }]
      };
    }
    case "unlockEvolutionNode": {
      const nextEvolutionNodeIds = uniqueAppend(normalised.unlockedEvolutionNodeIds, outcome.evolutionNodeId);
      return {
        petInstance: { ...normalised, unlockedEvolutionNodeIds: nextEvolutionNodeIds },
        events: nextEvolutionNodeIds.length === (normalised.unlockedEvolutionNodeIds ?? []).length
          ? []
          : [{ type: "PetEvolutionNodeUnlocked", petInstanceId: normalised.id, evolutionNodeId: outcome.evolutionNodeId }]
      };
    }
    case "addBondXp": {
      const total = normalised.bondXp + outcome.amount;
      return {
        petInstance: { ...normalised, bondXp: total },
        events: [{ type: "PetBondXpAdded", petInstanceId: normalised.id, amount: outcome.amount, total }]
      };
    }
    case "markStoryEventSeen": {
      const nextSeen = uniqueAppend(normalised.seenStoryEventIds, outcome.eventId);
      return {
        petInstance: { ...normalised, seenStoryEventIds: nextSeen },
        events: nextSeen.length === (normalised.seenStoryEventIds ?? []).length
          ? []
          : [{ type: "StoryEventSeen", petInstanceId: normalised.id, storyEventId: outcome.eventId }]
      };
    }
    default:
      return { petInstance: normalised, events: [] };
  }
};

export const applyPetStoryEvent = (
  input: StoryEventApplicationInput
): GameActionResult<PetStoryProgressState> => {
  const run = input.run ?? input.context.run;
  const originalState: PetStoryProgressState = {
    run,
    petInstances: input.petInstances
  };
  const registryError = validateStoryRegistryCollections(input.registry);
  if (registryError) {
    return reject(originalState, registryError);
  }
  const ambiguityError = validateStoryRegistryAmbiguity(input.registry);
  if (ambiguityError) {
    return reject(originalState, ambiguityError);
  }

  const storyEvent = findStoryEvent(input.registry, input.storyEventId);
  if (!storyEvent) {
    return reject(originalState, error("missing_story_event", `Story event '${input.storyEventId}' is not registered.`, "storyEventId"));
  }

  const petSideStory = findPetSideStoryForEvent(input.registry, storyEvent.id);
  if (!petSideStory) {
    return reject(originalState, error("missing_pet_side_story", `Story event '${storyEvent.id}' is not linked to a pet side story.`, "registry.petSideStories"));
  }

  const petSideStoryError = validatePetSideStoryRuntimeShape(petSideStory, input.registry);
  if (petSideStoryError) {
    return reject(originalState, petSideStoryError);
  }

  const declarationError = validateStoryEventDeclarations(petSideStory, storyEvent, input.registry);
  if (declarationError) {
    return reject(originalState, declarationError);
  }

  const petInstance = input.petInstances.find((candidate) => candidate.id === input.petInstanceId);
  if (!petInstance) {
    return reject(originalState, error("missing_pet_instance", `Pet instance '${input.petInstanceId}' does not exist.`, "petInstanceId"));
  }

  if (petInstance.definitionId !== petSideStory.petDefinitionId) {
    return reject(
      originalState,
      error(
        "pet_story_definition_mismatch",
        `Story event '${storyEvent.id}' does not apply to pet definition '${petInstance.definitionId}'.`,
        "petInstance.definitionId"
      )
    );
  }

  const normalisedPetInstance = normalisePetInstance(petInstance);
  if (storyEvent.repeatable !== true && normalisedPetInstance.seenStoryEventIds?.includes(storyEvent.id)) {
    return reject(
      originalState,
      error("story_event_already_seen", `Story event '${storyEvent.id}' has already been seen by '${petInstance.id}'.`, "petInstance.seenStoryEventIds")
    );
  }

  const canApply = canApplyStoryEvent({
    storyEvent,
    petInstance: normalisedPetInstance,
    run,
    petInstances: input.petInstances,
    registry: input.registry,
    context: input.context,
    allowInactivePet: true
  });
  if (!canApply.ok) {
    return reject(originalState, canApply.errors[0]);
  }

  if (!canApply.state) {
    return reject(originalState, error("story_requirements_not_met", `Story event '${storyEvent.id}' requirements are not met.`, "requirements"));
  }

  let nextPetInstance = normalisedPetInstance;
  const events: GameEvent[] = [];
  for (const outcome of storyEvent.outcomes) {
    const applied = applyOutcome(nextPetInstance, outcome);
    nextPetInstance = applied.petInstance;
    events.push(...applied.events);
  }

  if (storyEvent.repeatable !== true && !nextPetInstance.seenStoryEventIds?.includes(storyEvent.id)) {
    nextPetInstance = {
      ...nextPetInstance,
      seenStoryEventIds: [...(nextPetInstance.seenStoryEventIds ?? []), storyEvent.id]
    };
    events.push({ type: "StoryEventSeen", petInstanceId: nextPetInstance.id, storyEventId: storyEvent.id });
  }

  events.push({ type: "PetStoryEventCompleted", petInstanceId: nextPetInstance.id, storyEventId: storyEvent.id });

  const nextPetInstances = input.petInstances.map((candidate) =>
    candidate.id === nextPetInstance.id ? nextPetInstance : candidate
  );

  return {
    ok: true,
    state: {
      run,
      petInstances: nextPetInstances
    },
    events,
    errors: []
  };
};

export const evaluatePetSideStories = (
  input: EvaluatePetSideStoriesInput
): GameActionResult<PetStoryProgressState> => {
  const run = input.run ?? input.context.run;
  const originalState: PetStoryProgressState = {
    run,
    petInstances: input.petInstances
  };
  const registryError = validateStoryRegistryCollections(input.registry);
  if (registryError) {
    return reject(originalState, registryError);
  }
  const ambiguityError = validateStoryRegistryAmbiguity(input.registry);
  if (ambiguityError) {
    return reject(originalState, ambiguityError);
  }

  const activePetInstanceIds = new Set(run?.activePetInstanceIds ?? []);
  const explicitPetInstanceId = input.petInstanceId;
  let state = originalState;
  const events: GameEvent[] = [];

  for (const sideStory of input.registry.petSideStories) {
    if (!isRecord(sideStory)) {
      return reject(
        originalState,
        error("invalid_story_registry", "Pet side story must be an object.", "registry.petSideStories")
      );
    }

    if (typeof sideStory.petDefinitionId !== "string") {
      return reject(
        originalState,
        error("invalid_story_registry", "Pet side story petDefinitionId must be a string.", "registry.petSideStories.petDefinitionId")
      );
    }

    if (!Array.isArray(sideStory.events)) {
      return reject(
        originalState,
        error("invalid_story_registry", "Pet side story events must be an array.", "registry.petSideStories.events")
      );
    }

    const sideStoryError = validatePetSideStoryRuntimeShape(sideStory as unknown as PetSideStoryDefinition, input.registry);
    if (sideStoryError) {
      return reject(originalState, sideStoryError);
    }

    const candidates = state.petInstances.filter((petInstance) => {
      if (petInstance.definitionId !== sideStory.petDefinitionId) {
        return false;
      }

      if (explicitPetInstanceId) {
        return petInstance.id === explicitPetInstanceId;
      }

      return activePetInstanceIds.has(petInstance.id);
    });

    for (const petInstance of candidates) {
      for (const storyEvent of sideStory.events) {
        const currentPetInstance = state.petInstances.find((candidate) => candidate.id === petInstance.id) ?? petInstance;
        const sideStoryEvent = storyEvent as unknown as StoryEventDefinition;
        const registeredEvent = findStoryEvent(input.registry, sideStoryEvent.id) ?? sideStoryEvent;
        const declarationError = validateStoryEventDeclarations(sideStory as unknown as PetSideStoryDefinition, registeredEvent, input.registry);
        if (declarationError) {
          return reject(originalState, declarationError);
        }

        const canApply = canApplyStoryEvent({
          storyEvent: registeredEvent,
          petInstance: currentPetInstance,
          run,
          petInstances: state.petInstances,
          registry: input.registry,
          context: input.context
        });
        if (!canApply.ok) {
          return reject(originalState, canApply.errors[0]);
        }

        if (!canApply.state) {
          continue;
        }

        const result = applyPetStoryEvent({
          storyEventId: registeredEvent.id,
          petInstanceId: currentPetInstance.id,
          run,
          petInstances: state.petInstances,
          registry: input.registry,
          context: input.context
        });
        if (!result.ok) {
          return reject(originalState, result.errors[0]);
        }

        state = result.state;
        events.push(...result.events);
      }
    }
  }

  return { ok: true, state, events, errors: [] };
};
