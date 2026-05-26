import type { CardDefinition } from "../model/card";
import type { CombatState } from "../model/combat";
import type { EffectDefinition, PetTarget } from "../model/effect";
import type { GameEvent } from "../model/event";
import type {
  ModifyPetCommandCostRule,
  ModifyPetCommandEffectAmountRule,
  PetInstance,
  PetModifierDefinition,
  PetModifierRule,
  RunPetState,
  TriggerOnEnemyDefeatedWithStatusRule
} from "../model/pet";
import type { GameActionError, GameActionResult } from "../model/action";
import type { GameContentRegistry } from "../model/registry";
import { burnStatusDefinition } from "../model/status";
import type { CardId, CardInstanceId, PetInstanceId, PetModifierId, UpgradeId } from "../ids";
import { validateEffects } from "./effect-validation";
import { resolveEffects } from "./effects";
import {
  knownPetModifierSelectorCardTypes,
  matchesPetModifierCardSelector
} from "./pet-modifier-selectors";
import type { Rng } from "./rng";
import { createTriggerWindow, petModifierTriggerMatches } from "./trigger-rules";

export type PetModifierContext = {
  readonly petInstanceId: PetInstanceId;
  readonly petDefinitionId: PetInstance["definitionId"];
  readonly upgradeId: UpgradeId;
  readonly modifierId: PetModifierId;
  readonly modifier: PetModifierDefinition;
};

export type PetModifierResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: GameActionError };

type CostModifierInput = {
  readonly state: CombatState;
  readonly card: CardDefinition;
  readonly cardInstanceId: CardInstanceId;
  readonly cardId: CardId;
  readonly ownerPetInstanceIds: readonly PetInstanceId[];
};

type CostModifierResult = {
  readonly cost: number;
  readonly state: CombatState;
  readonly events: readonly GameEvent[];
};

type EffectModifierInput = {
  readonly state: CombatState;
  readonly card: CardDefinition;
  readonly effects: readonly EffectDefinition[];
  readonly ownerPetInstanceIds: readonly PetInstanceId[];
};

type EffectModifierResult = {
  readonly effects: readonly EffectDefinition[];
  readonly events: readonly GameEvent[];
};

type TriggerInput = {
  readonly stateBeforeEffects: CombatState;
  readonly stateAfterEffects: CombatState;
  readonly effectEvents: readonly GameEvent[];
  readonly registry: GameContentRegistry;
  readonly rng: Rng;
};

const knownPetModifierRuleTypes = [
  "modifyPetCommandCost",
  "modifyPetCommandEffectAmount",
  "triggerOnEnemyDefeatedWithStatus"
] as const satisfies readonly PetModifierRule["type"][];

export const knownPetModifierRuleTypeValues: readonly string[] = knownPetModifierRuleTypes;

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

const appendEvents = (state: CombatState, events: readonly GameEvent[]): CombatState => ({
  ...state,
  events: [...state.events, ...events]
});

const findPetInstance = (state: CombatState, petInstanceId: PetInstanceId): PetInstance | undefined =>
  state.petInstances.find((petInstance) => petInstance.id === petInstanceId);

const findRunPetState = (state: CombatState, petInstanceId: PetInstanceId): RunPetState | undefined =>
  state.runPetStates.find((runPetState) => runPetState.petInstanceId === petInstanceId);

const updateRunPetState = (
  state: CombatState,
  petInstanceId: PetInstanceId,
  update: (runPetState: RunPetState) => RunPetState
): CombatState => ({
  ...state,
  runPetStates: state.runPetStates.map((runPetState) =>
    runPetState.petInstanceId === petInstanceId ? update(runPetState) : runPetState
  )
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) && !Array.isArray(value);

const isKnownRule = (rule: PetModifierRule): boolean =>
  knownPetModifierRuleTypes.includes(rule.type);

const validateCardSelector = (
  rule: PetModifierRule,
  path: string,
  petDefinitionIds: ReadonlySet<string>
): GameActionError | undefined => {
  if (rule.type === "triggerOnEnemyDefeatedWithStatus") {
    return undefined;
  }

  if (!isPlainRecord(rule.selector)) {
    return error("invalid_pet_modifier_rule", "Pet modifier rule is missing a card selector.", path);
  }

  if ("tagsAny" in rule.selector && !Array.isArray(rule.selector.tagsAny)) {
    return error("invalid_pet_modifier_rule", "Pet modifier selector tagsAny must be an array.", path);
  }

  if ("tagsAll" in rule.selector && !Array.isArray(rule.selector.tagsAll)) {
    return error("invalid_pet_modifier_rule", "Pet modifier selector tagsAll must be an array.", path);
  }

  if (
    "cardType" in rule.selector &&
    !knownPetModifierSelectorCardTypes.includes(rule.selector.cardType as typeof knownPetModifierSelectorCardTypes[number])
  ) {
    return error("invalid_pet_modifier_rule", "Pet modifier selector cardType is unknown.", path);
  }

  if (
    "requiresPetDefinitionId" in rule.selector &&
    (
      typeof rule.selector.requiresPetDefinitionId !== "string" ||
      rule.selector.requiresPetDefinitionId.length === 0 ||
      !petDefinitionIds.has(rule.selector.requiresPetDefinitionId)
    )
  ) {
    return error(
      "invalid_pet_modifier_rule",
      "Pet modifier selector requiresPetDefinitionId must reference a known pet definition.",
      path
    );
  }

  return undefined;
};

const validateModifierRule = (
  rule: PetModifierRule,
  path: string,
  petDefinitionIds: ReadonlySet<string>,
  statusIds: ReadonlySet<string>
): GameActionError | undefined => {
  if (!isRecord(rule)) {
    return error("invalid_pet_modifier_rule", "Pet modifier rule must be an object.", path);
  }

  if (!isKnownRule(rule)) {
    return error("unknown_pet_modifier_rule", `Unknown pet modifier rule '${String(rule.type)}'.`, path);
  }

  const selectorError = validateCardSelector(rule, path, petDefinitionIds);
  if (selectorError) {
    return selectorError;
  }

  if (rule.type === "modifyPetCommandCost") {
    if (typeof rule.amount !== "number" || !Number.isFinite(rule.amount)) {
      return error("invalid_pet_modifier_rule", "Pet command cost modifier amount must be a finite number.", path);
    }

    if (
      "minCost" in rule &&
      (typeof rule.minCost !== "number" || !Number.isInteger(rule.minCost) || rule.minCost < 0)
    ) {
      return error("invalid_pet_modifier_rule", "Pet command cost modifier minCost must be a non-negative integer.", path);
    }

    if (
      "limit" in rule &&
      (
        !isPlainRecord(rule.limit) ||
        (rule.limit.type !== "oncePerCombat" && rule.limit.type !== "oncePerTurn")
      )
    ) {
      return error("invalid_pet_modifier_rule", "Pet command cost modifier limit type is unknown.", path);
    }

    return undefined;
  }

  if (rule.type === "modifyPetCommandEffectAmount") {
    if (rule.effectType !== "petAttack" && rule.effectType !== "applyStatus") {
      return error("invalid_pet_modifier_rule", "Pet command effect modifier references an unknown effect type.", path);
    }

    if (
      rule.effectType === "applyStatus" &&
      "statusId" in rule &&
      (typeof rule.statusId !== "string" || !statusIds.has(rule.statusId))
    ) {
      return error("invalid_pet_modifier_rule", `Pet command effect modifier references unknown status '${rule.statusId}'.`, path);
    }

    return typeof rule.amount === "number" && Number.isFinite(rule.amount)
      ? undefined
      : error("invalid_pet_modifier_rule", "Pet command effect modifier amount must be a finite number.", path);
  }

  if (!rule.requiredStatusId) {
    return error("invalid_pet_modifier_rule", "Pet trigger modifier is missing a required status id.", path);
  }

  if (!statusIds.has(rule.requiredStatusId)) {
    return error("invalid_pet_modifier_rule", `Pet trigger modifier references unknown status '${rule.requiredStatusId}'.`, path);
  }

  if (!Array.isArray(rule.effects)) {
    return error("invalid_pet_modifier_rule", "Pet trigger modifier effects must be an array.", path);
  }

  if (
    "limit" in rule &&
    (
      !isPlainRecord(rule.limit) ||
      (rule.limit.type !== "oncePerCombat" && rule.limit.type !== "oncePerTurn")
    )
  ) {
    return error("invalid_pet_modifier_rule", "Pet trigger modifier limit type is unknown.", path);
  }

  const effectIssues = validateEffects(rule.effects, path, { statusIds });
  if (effectIssues.length > 0) {
    return error("invalid_pet_modifier_rule", effectIssues[0]?.message ?? "Pet trigger effects are invalid.", path);
  }

  if (
    rule.effects.some((effectDefinition) =>
      effectDefinition.type === "draw" &&
      (!Number.isInteger(effectDefinition.amount) || effectDefinition.amount <= 0)
    )
  ) {
    return error("invalid_pet_modifier_rule", "Pet trigger draw amount must be a positive integer.", path);
  }

  return undefined;
};

const validateModifier = (
  modifier: PetModifierDefinition,
  path: string,
  registry: GameContentRegistry
): GameActionError | undefined => {
  if (!isRecord(modifier)) {
    return error("invalid_pet_modifier", "Pet modifier definition must be an object.", path);
  }

  if (typeof modifier.id !== "string" || modifier.id.length === 0) {
    return error("invalid_pet_modifier", "Pet modifier id must be a non-empty string.", `${path}.id`);
  }

  if (!Array.isArray(modifier.rules) || modifier.rules.length === 0) {
    return error("missing_pet_modifier_rules", `Pet modifier '${modifier.id}' has no rules.`, `${path}.rules`);
  }

  const petDefinitionIds = new Set(registry.pets.map((pet) => pet.id));
  const statusIds = new Set((registry.statuses ?? [burnStatusDefinition]).map((status) => status.id));

  for (const [ruleIndex, rule] of modifier.rules.entries()) {
    const ruleError = validateModifierRule(rule, `${path}.rules[${ruleIndex}]`, petDefinitionIds, statusIds);
    if (ruleError) {
      return ruleError;
    }
  }

  return undefined;
};

export const createRunPetStateWithActiveModifiers = (
  petInstance: PetInstance,
  registry: GameContentRegistry
): PetModifierResult<RunPetState> => {
  const activeModifierIds: PetModifierId[] = [];

  for (const [upgradeIndex, upgradeId] of petInstance.unlockedUpgradeIds.entries()) {
    const upgrade = registry.petUpgrades.find((candidate) => candidate.id === upgradeId);
    if (!upgrade) {
      return {
        ok: false,
        error: error(
          "missing_pet_upgrade_definition",
          `Unlocked pet upgrade '${upgradeId}' is not registered.`,
          `petInstances.${petInstance.id}.unlockedUpgradeIds[${upgradeIndex}]`
        )
      };
    }

    if (upgrade.petDefinitionId !== petInstance.definitionId) {
      return {
        ok: false,
        error: error(
          "mismatched_pet_upgrade_definition",
          `Unlocked pet upgrade '${upgradeId}' does not belong to pet definition '${petInstance.definitionId}'.`,
          `petInstances.${petInstance.id}.unlockedUpgradeIds[${upgradeIndex}]`
        )
      };
    }

    for (const [modifierIndex, modifier] of upgrade.modifiers.entries()) {
      const modifierError = validateModifier(modifier, `petUpgrades.${upgrade.id}.modifiers[${modifierIndex}]`, registry);
      if (modifierError) {
        return { ok: false, error: modifierError };
      }

      activeModifierIds.push(modifier.id);
    }
  }

  return {
    ok: true,
    value: {
      petInstanceId: petInstance.id,
      mood: "calm",
      activeModifierIds,
      temporaryModifierIds: [],
      usedModifierIdsThisCombat: [],
      usedModifierIdsThisTurn: [],
      fatigue: 0
    }
  };
};

export const resetTurnPetModifierUsage = (state: CombatState): CombatState => ({
  ...state,
  runPetStates: state.runPetStates.map((runPetState) => ({
    ...runPetState,
    usedModifierIdsThisTurn: []
  }))
});

export const getActivePetModifierContexts = (
  state: CombatState,
  registry: GameContentRegistry
): PetModifierResult<readonly PetModifierContext[]> => {
  const contexts: PetModifierContext[] = [];

  for (const activePetInstanceId of state.activePetInstanceIds) {
    const petInstance = findPetInstance(state, activePetInstanceId);
    if (!petInstance) {
      return {
        ok: false,
        error: error(
          "missing_active_pet_instance",
          `Active pet instance '${activePetInstanceId}' is not present in combat state.`,
          "petInstances"
        )
      };
    }

    const runPetState = findRunPetState(state, petInstance.id);
    if (!runPetState) {
      return {
        ok: false,
        error: error(
          "missing_run_pet_state",
          `Active pet instance '${petInstance.id}' has no run pet state.`,
          "runPetStates"
        )
      };
    }

    for (const [upgradeIndex, upgradeId] of petInstance.unlockedUpgradeIds.entries()) {
      const upgrade = registry.petUpgrades.find((candidate) => candidate.id === upgradeId);
      if (!upgrade) {
        return {
          ok: false,
          error: error(
            "missing_pet_upgrade_definition",
            `Unlocked pet upgrade '${upgradeId}' is not registered.`,
            `petInstances.${petInstance.id}.unlockedUpgradeIds[${upgradeIndex}]`
          )
        };
      }

      if (upgrade.petDefinitionId !== petInstance.definitionId) {
        return {
          ok: false,
          error: error(
            "mismatched_pet_upgrade_definition",
            `Unlocked pet upgrade '${upgradeId}' does not belong to pet definition '${petInstance.definitionId}'.`,
            `petInstances.${petInstance.id}.unlockedUpgradeIds[${upgradeIndex}]`
          )
        };
      }

      for (const [modifierIndex, modifier] of upgrade.modifiers.entries()) {
        const modifierError = validateModifier(modifier, `petUpgrades.${upgrade.id}.modifiers[${modifierIndex}]`, registry);
        if (modifierError) {
          return { ok: false, error: modifierError };
        }

        if (runPetState.activeModifierIds.includes(modifier.id)) {
          contexts.push({
            petInstanceId: petInstance.id,
            petDefinitionId: petInstance.definitionId,
            upgradeId: upgrade.id,
            modifierId: modifier.id,
            modifier
          });
        }
      }
    }

    for (const [temporaryModifierIndex, temporaryModifierId] of runPetState.temporaryModifierIds.entries()) {
      const modifier = registry.petModifiers?.find((candidate) => candidate.id === temporaryModifierId);
      if (!modifier) {
        return {
          ok: false,
          error: error(
            "missing_pet_modifier_definition",
            `Temporary pet modifier '${temporaryModifierId}' is not registered.`,
            `runPetStates.${petInstance.id}.temporaryModifierIds[${temporaryModifierIndex}]`
          )
        };
      }

      const modifierError = validateModifier(modifier, `petModifiers.${temporaryModifierId}`, registry);
      if (modifierError) {
        return { ok: false, error: modifierError };
      }

      contexts.push({
        petInstanceId: petInstance.id,
        petDefinitionId: petInstance.definitionId,
        upgradeId: "temporary" as UpgradeId,
        modifierId: modifier.id,
        modifier
      });
    }
  }

  return { ok: true, value: contexts };
};

const isModifierUsed = (state: CombatState, context: PetModifierContext, limit: ModifyPetCommandCostRule["limit"]): boolean => {
  if (!limit) {
    return false;
  }

  const runPetState = findRunPetState(state, context.petInstanceId);
  if (!runPetState) {
    return false;
  }

  return limit.type === "oncePerCombat"
    ? runPetState.usedModifierIdsThisCombat.includes(context.modifierId)
    : runPetState.usedModifierIdsThisTurn.includes(context.modifierId);
};

const consumeModifier = (
  state: CombatState,
  context: PetModifierContext,
  limit: NonNullable<ModifyPetCommandCostRule["limit"]>
): CombatState => updateRunPetState(state, context.petInstanceId, (runPetState) => ({
  ...runPetState,
  usedModifierIdsThisCombat: limit.type === "oncePerCombat" && !runPetState.usedModifierIdsThisCombat.includes(context.modifierId)
    ? [...runPetState.usedModifierIdsThisCombat, context.modifierId]
    : runPetState.usedModifierIdsThisCombat,
  usedModifierIdsThisTurn: limit.type === "oncePerTurn" && !runPetState.usedModifierIdsThisTurn.includes(context.modifierId)
    ? [...runPetState.usedModifierIdsThisTurn, context.modifierId]
    : runPetState.usedModifierIdsThisTurn
}));

const activationEvent = (
  context: PetModifierContext,
  reason: "cardCost" | "effectAmount" | "enemyDefeatedWithStatus"
): GameEvent => ({
  type: "PetModifierActivated",
  petInstanceId: context.petInstanceId,
  upgradeId: context.upgradeId,
  modifierId: context.modifierId,
  reason
});

const consumedEvent = (
  context: PetModifierContext,
  limit: NonNullable<ModifyPetCommandCostRule["limit"]>
): GameEvent => ({
  type: "PetModifierConsumed",
  petInstanceId: context.petInstanceId,
  modifierId: context.modifierId,
  scope: limit.type === "oncePerCombat" ? "combat" : "turn"
});

const ownerContexts = (
  contexts: readonly PetModifierContext[],
  ownerPetInstanceIds: readonly PetInstanceId[]
): readonly PetModifierContext[] =>
  contexts.filter((context) => ownerPetInstanceIds.includes(context.petInstanceId));

export const applyPetCommandCostModifiers = (
  input: CostModifierInput,
  registry: GameContentRegistry
): PetModifierResult<CostModifierResult> => {
  const contextResult = getActivePetModifierContexts(input.state, registry);
  if (!contextResult.ok) {
    return contextResult;
  }

  let nextState = input.state;
  let cost = input.card.cost;
  const events: GameEvent[] = [];

  for (const context of ownerContexts(contextResult.value, input.ownerPetInstanceIds)) {
    for (const rule of context.modifier.rules) {
      if (rule.type !== "modifyPetCommandCost" || !matchesPetModifierCardSelector(input.card, rule)) {
        continue;
      }

      if (isModifierUsed(nextState, context, rule.limit)) {
        continue;
      }

      const minCost = rule.minCost ?? 0;
      const modifiedCost = Math.max(minCost, cost + rule.amount);
      if (modifiedCost === cost) {
        continue;
      }

      events.push(activationEvent(context, "cardCost"));
      events.push({
        type: "CardCostModified",
        cardInstanceId: input.cardInstanceId,
        cardId: input.cardId,
        originalCost: cost,
        modifiedCost,
        modifierId: context.modifierId,
        petInstanceId: context.petInstanceId
      });

      if (rule.limit) {
        nextState = consumeModifier(nextState, context, rule.limit);
        events.push(consumedEvent(context, rule.limit));
      }

      cost = modifiedCost;
    }
  }

  return { ok: true, value: { cost, state: nextState, events } };
};

export const applyPetCommandEffectModifiers = (
  input: EffectModifierInput,
  registry: GameContentRegistry
): PetModifierResult<EffectModifierResult> => {
  const contextResult = getActivePetModifierContexts(input.state, registry);
  if (!contextResult.ok) {
    return contextResult;
  }

  const activatedKeys = new Set<string>();
  const events: GameEvent[] = [];
  const contexts = ownerContexts(contextResult.value, input.ownerPetInstanceIds);
  const effects = input.effects.map((effectDefinition) => {
    let amountDelta = 0;
    let stackDelta = 0;

    for (const context of contexts) {
      for (const rule of context.modifier.rules) {
        if (rule.type !== "modifyPetCommandEffectAmount" || !matchesPetModifierCardSelector(input.card, rule)) {
          continue;
        }

        if (effectDefinition.type === "petAttack" && rule.effectType === "petAttack") {
          amountDelta += rule.amount;
          activatedKeys.add(`${context.petInstanceId}:${context.modifierId}`);
        }

        if (
          effectDefinition.type === "applyStatus" &&
          rule.effectType === "applyStatus" &&
          (!rule.statusId || rule.statusId === effectDefinition.statusId)
        ) {
          stackDelta += rule.amount;
          activatedKeys.add(`${context.petInstanceId}:${context.modifierId}`);
        }
      }
    }

    if (effectDefinition.type === "petAttack" && amountDelta !== 0) {
      return { ...effectDefinition, amount: effectDefinition.amount + amountDelta };
    }

    if (effectDefinition.type === "applyStatus" && stackDelta !== 0) {
      return { ...effectDefinition, stacks: effectDefinition.stacks + stackDelta };
    }

    return effectDefinition;
  });

  for (const context of contexts) {
    if (activatedKeys.has(`${context.petInstanceId}:${context.modifierId}`)) {
      events.push(activationEvent(context, "effectAmount"));
    }
  }

  return { ok: true, value: { effects, events } };
};

const firstPetTarget = (effects: readonly EffectDefinition[]): PetTarget | undefined => {
  const petEffect = effects.find((effectDefinition) => "petTarget" in effectDefinition);
  return petEffect && "petTarget" in petEffect ? petEffect.petTarget : undefined;
};

export const resolvePetCommandOwnerIds = (
  state: CombatState,
  registry: GameContentRegistry,
  card: CardDefinition,
  rng: Rng
): PetModifierResult<readonly PetInstanceId[]> => {
  if (card.type !== "pet-command") {
    return { ok: true, value: [] };
  }

  const activeIds = [...state.activePetInstanceIds];
  const petTarget = firstPetTarget(card.effects);

  if (!petTarget && card.requiresPetDefinitionId) {
    const matchingPet = state.petInstances
      .filter((petInstance) => activeIds.includes(petInstance.id))
      .find((petInstance) => petInstance.definitionId === card.requiresPetDefinitionId);

    return matchingPet
      ? { ok: true, value: [matchingPet.id] }
      : {
          ok: false,
          error: error(
            "missing_required_active_pet",
            `Card '${card.id}' requires an active pet of definition '${card.requiresPetDefinitionId}'.`,
            "activePetInstanceIds"
          )
        };
  }

  const target = petTarget ?? { type: "leading" as const };

  if (target.type === "leading") {
    return activeIds[0]
      ? { ok: true, value: [activeIds[0]] }
      : { ok: false, error: error("missing_active_pet", "No active pet is available.", "activePetInstanceIds") };
  }

  if (target.type === "allActive") {
    return activeIds.length > 0
      ? { ok: true, value: activeIds }
      : { ok: false, error: error("missing_active_pet", "No active pet is available.", "activePetInstanceIds") };
  }

  if (target.type === "specific") {
    return activeIds.includes(target.petInstanceId)
      ? { ok: true, value: [target.petInstanceId] }
      : {
          ok: false,
          error: error("missing_specific_pet", `Pet instance '${target.petInstanceId}' is not active.`, "petTarget.petInstanceId")
        };
  }

  if (target.type === "randomActive") {
    return activeIds.length > 0
      ? { ok: true, value: [rng.choice(activeIds)] }
      : { ok: false, error: error("missing_active_pet", "No active pet is available.", "activePetInstanceIds") };
  }

  const matchingIds = state.petInstances
    .filter((petInstance) => activeIds.includes(petInstance.id))
    .filter((petInstance) => {
      const definition = registry.pets.find((pet) => pet.id === petInstance.definitionId);
      return definition?.tags.includes(target.tag) ?? false;
    })
    .map((petInstance) => petInstance.id);

  return matchingIds.length > 0
    ? { ok: true, value: matchingIds }
    : { ok: false, error: error("missing_tagged_pet", `No active pet has tag '${target.tag}'.`, "petTarget.tag") };
};

export const resolvePetModifierTriggersAfterEvents = (
  input: TriggerInput
): GameActionResult<CombatState> => {
  const triggerWindow = createTriggerWindow({
    stateBeforeEffects: input.stateBeforeEffects,
    stateAfterEffects: input.stateAfterEffects,
    effectEvents: input.effectEvents
  });

  if (triggerWindow.phase !== "player_turn") {
    const actionError = error(
      "invalid_phase",
      "Pet modifier triggers can only resolve during the player turn.",
      "phase"
    );
    return {
      ok: false,
      state: input.stateBeforeEffects,
      events: [rejectedEvent(actionError)],
      errors: [actionError]
    };
  }

  if (triggerWindow.outcome === "won" || triggerWindow.outcome === "lost") {
    return { ok: true, state: input.stateAfterEffects, events: [], errors: [] };
  }

  const contextResult = getActivePetModifierContexts(input.stateAfterEffects, input.registry);
  if (!contextResult.ok) {
    return {
      ok: false,
      state: input.stateBeforeEffects,
      events: [rejectedEvent(contextResult.error)],
      errors: [contextResult.error]
    };
  }

  let nextState = input.stateAfterEffects;
  const events: GameEvent[] = [];

  for (const context of contextResult.value) {
    for (const rule of context.modifier.rules) {
      if (rule.type !== "triggerOnEnemyDefeatedWithStatus") {
        continue;
      }

      if (!petModifierTriggerMatches(rule, triggerWindow)) {
        continue;
      }

      if (isModifierUsed(nextState, context, rule.limit)) {
        continue;
      }

      const activation = activationEvent(context, "enemyDefeatedWithStatus");
      const modifierEvents = rule.limit ? [activation, consumedEvent(context, rule.limit)] : [activation];
      nextState = rule.limit ? consumeModifier(nextState, context, rule.limit) : nextState;
      nextState = appendEvents(nextState, modifierEvents);
      events.push(...modifierEvents);

      if (rule.effects.length > 0) {
        const effectResult = resolveEffects(
          nextState,
          rule.effects,
          { sourceId: nextState.player.id },
          input.registry,
          input.rng
        );
        if (!effectResult.ok) {
          return effectResult;
        }

        nextState = effectResult.state;
        events.push(...effectResult.events);
      }
    }
  }

  return { ok: true, state: nextState, events, errors: [] };
};
