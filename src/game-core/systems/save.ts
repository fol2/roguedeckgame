import type { GameActionError, GameActionResult } from "../model/action";
import type { GameEvent } from "../model/event";
import type { GameContentRegistry } from "../model/registry";
import type { PetInstance } from "../model/pet";
import type {
  SaveRestoredState,
  SaveSlotMetadata,
  SaveSnapshot,
  SaveStore
} from "../model/save";
import { SAVE_SCHEMA_VERSION, UNKNOWN_SAVE_CONTENT_VERSION } from "../model/save";
import type { RunState } from "../model/run";
import { act1NormalBalance } from "../data/balance/act1-normal";
import { starterRegistry } from "../data/registry";
import { buildContentIndex } from "./content-index";

export type CreateSaveSnapshotInput = {
  readonly profileId: string;
  readonly contentVersion?: string;
  readonly registry?: GameContentRegistry;
  readonly activeRun?: RunState;
  readonly petInstances: readonly PetInstance[];
  readonly globalStoryFlags?: SaveSnapshot["globalStoryFlags"];
  readonly now?: string;
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

const invalidSnapshot = (): SaveSnapshot => ({
  schemaVersion: SAVE_SCHEMA_VERSION,
  contentVersion: UNKNOWN_SAVE_CONTENT_VERSION,
  createdAt: "",
  updatedAt: "",
  profileId: "",
  petInstances: [],
  globalStoryFlags: []
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isStringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const hasDuplicateStrings = (values: readonly string[]): boolean =>
  new Set(values).size !== values.length;

const isValidSeed = (value: unknown): value is string | number =>
  typeof value === "string" || (typeof value === "number" && Number.isFinite(value));

const isJsonStringifiable = (value: unknown, seen = new WeakSet<object>()): boolean => {
  if (typeof value === "function" || typeof value === "bigint" || typeof value === "symbol") {
    return false;
  }

  if (value === null || typeof value !== "object") {
    return true;
  }

  if (seen.has(value)) {
    return false;
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.every((item) => item !== undefined && isJsonStringifiable(item, seen));
  }

  return Object.values(value).every((item) => item === undefined || isJsonStringifiable(item, seen));
};

const normaliseLegacyActiveRunHp = (run: unknown): unknown => {
  if (!isRecord(run)) {
    return run;
  }

  const defaultMaxHp = act1NormalBalance.player.maxHp;
  const explicitMaxHp = typeof run.playerMaxHp === "number" && Number.isFinite(run.playerMaxHp)
    ? run.playerMaxHp
    : undefined;
  const explicitHp = typeof run.playerHp === "number" && Number.isFinite(run.playerHp)
    ? run.playerHp
    : undefined;
  const playerMaxHp = "playerMaxHp" in run && run.playerMaxHp !== undefined
    ? run.playerMaxHp
    : Math.max(defaultMaxHp, explicitHp ?? defaultMaxHp);
  const playerHp = "playerHp" in run && run.playerHp !== undefined
    ? run.playerHp
    : run.status === "lost"
      ? 0
      : explicitMaxHp ?? defaultMaxHp;

  return {
    ...run,
    playerHp,
    playerMaxHp
  };
};

const normaliseLegacySaveSnapshot = (snapshot: unknown): unknown => {
  if (!isRecord(snapshot)) {
    return snapshot;
  }

  return {
    ...snapshot,
    contentVersion: typeof snapshot.contentVersion === "string" && snapshot.contentVersion.length > 0
      ? snapshot.contentVersion
      : UNKNOWN_SAVE_CONTENT_VERSION,
    activeRun: "activeRun" in snapshot && snapshot.activeRun !== undefined
      ? normaliseLegacyActiveRunHp(snapshot.activeRun)
      : snapshot.activeRun
  };
};

const validateRewardOption = (option: unknown, path: string): GameActionError | undefined => {
  if (!isRecord(option)) {
    return error("invalid_save_reward_option", "Save reward option must be an object.", path);
  }

  if (typeof option.id !== "string") {
    return error("invalid_save_reward_option", "Save reward option id must be a string.", `${path}.id`);
  }

  if (option.type === "card") {
    return typeof option.cardId === "string"
      ? undefined
      : error("invalid_save_reward_option", "Save card reward option cardId must be a string.", `${path}.cardId`);
  }

  if (option.type === "petUpgrade") {
    if (typeof option.petInstanceId !== "string") {
      return error("invalid_save_reward_option", "Save pet upgrade option petInstanceId must be a string.", `${path}.petInstanceId`);
    }

    if (typeof option.petDefinitionId !== "string") {
      return error("invalid_save_reward_option", "Save pet upgrade option petDefinitionId must be a string.", `${path}.petDefinitionId`);
    }

    if (typeof option.upgradeId !== "string") {
      return error("invalid_save_reward_option", "Save pet upgrade option upgradeId must be a string.", `${path}.upgradeId`);
    }

    return undefined;
  }

  return error("invalid_save_reward_option", "Save reward option type is unsupported.", `${path}.type`);
};

const validateRewardOffer = (rewardOffer: unknown, path: string): GameActionError | undefined => {
  const knownStatuses = new Set(["open", "claimed", "skipped"]);

  if (!isRecord(rewardOffer)) {
    return error("invalid_save_reward_offer", "Save pendingRewardOffer must be an object.", path);
  }

  if (typeof rewardOffer.id !== "string") {
    return error("invalid_save_reward_offer", "Save pendingRewardOffer.id must be a string.", `${path}.id`);
  }

  if (rewardOffer.source !== "combat") {
    return error("invalid_save_reward_offer", "Save pendingRewardOffer.source must be 'combat'.", `${path}.source`);
  }

  if (typeof rewardOffer.combatId !== "string") {
    return error("invalid_save_reward_offer", "Save pendingRewardOffer.combatId must be a string.", `${path}.combatId`);
  }

  if (!isValidSeed(rewardOffer.seed)) {
    return error("invalid_save_reward_offer", "Save pendingRewardOffer.seed must be a finite number or string.", `${path}.seed`);
  }

  if (typeof rewardOffer.status !== "string" || !knownStatuses.has(rewardOffer.status)) {
    return error("invalid_save_reward_offer", "Save pendingRewardOffer.status is unsupported.", `${path}.status`);
  }

  if (!Array.isArray(rewardOffer.options)) {
    return error("invalid_save_reward_offer", "Save pendingRewardOffer.options must be an array.", `${path}.options`);
  }

  const optionIds = new Set<string>();
  for (let index = 0; index < rewardOffer.options.length; index += 1) {
    const optionError = validateRewardOption(rewardOffer.options[index], `${path}.options[${index}]`);
    if (optionError) {
      return optionError;
    }

    const option = rewardOffer.options[index];
    if (isRecord(option)) {
      if (optionIds.has(option.id as string)) {
        return error("invalid_save_reward_offer", "Save pendingRewardOffer option ids must be unique.", `${path}.options[${index}].id`);
      }
      optionIds.add(option.id as string);
    }
  }

  if ("selectedOptionId" in rewardOffer && rewardOffer.selectedOptionId !== undefined && typeof rewardOffer.selectedOptionId !== "string") {
    return error("invalid_save_reward_offer", "Save pendingRewardOffer.selectedOptionId must be a string when present.", `${path}.selectedOptionId`);
  }

  if (rewardOffer.status === "open" && "selectedOptionId" in rewardOffer && rewardOffer.selectedOptionId !== undefined) {
    return error("invalid_save_reward_offer", "Open pendingRewardOffer must not include a selectedOptionId.", `${path}.selectedOptionId`);
  }

  return undefined;
};

const validateRunMap = (map: unknown, path: string): GameActionError | undefined => {
  const knownNodeTypes = new Set(["combat", "elite", "rest", "event", "boss"]);
  const knownNodeStatuses = new Set(["locked", "available", "active", "completed", "skipped"]);

  if (!isRecord(map)) {
    return error("invalid_save_run_map", "Save activeRun.map must be an object.", path);
  }

  if (typeof map.id !== "string") {
    return error("invalid_save_run_map", "Save activeRun.map.id must be a string.", `${path}.id`);
  }

  if (typeof map.templateId !== "string") {
    return error("invalid_save_run_map", "Save activeRun.map.templateId must be a string.", `${path}.templateId`);
  }

  if (!isValidSeed(map.seed)) {
    return error("invalid_save_run_map", "Save activeRun.map.seed must be a finite number or string.", `${path}.seed`);
  }

  if (!Array.isArray(map.nodes) || map.nodes.length === 0) {
    return error("invalid_save_run_map", "Save activeRun.map.nodes must be a non-empty array.", `${path}.nodes`);
  }

  const nodeIds = new Set<string>();
  for (let index = 0; index < map.nodes.length; index += 1) {
    const node = map.nodes[index];
    const nodePath = `${path}.nodes[${index}]`;
    if (!isRecord(node)) {
      return error("invalid_save_run_map_node", "Save run map node must be an object.", nodePath);
    }

    if (typeof node.id !== "string") {
      return error("invalid_save_run_map_node", "Save run map node id must be a string.", `${nodePath}.id`);
    }
    if (nodeIds.has(node.id)) {
      return error("invalid_save_run_map_node", "Save run map node ids must be unique.", `${nodePath}.id`);
    }
    nodeIds.add(node.id);

    if (typeof node.type !== "string" || !knownNodeTypes.has(node.type)) {
      return error("invalid_save_run_map_node", "Save run map node type is unsupported.", `${nodePath}.type`);
    }

    if (!Number.isInteger(node.layer)) {
      return error("invalid_save_run_map_node", "Save run map node layer must be an integer.", `${nodePath}.layer`);
    }

    if (typeof node.status !== "string" || !knownNodeStatuses.has(node.status)) {
      return error("invalid_save_run_map_node", "Save run map node status is unsupported.", `${nodePath}.status`);
    }

    if ("encounterId" in node && node.encounterId !== undefined && typeof node.encounterId !== "string") {
      return error("invalid_save_run_map_node", "Save run map node encounterId must be a string when present.", `${nodePath}.encounterId`);
    }

    if (
      (node.type === "combat" || node.type === "elite" || node.type === "boss") &&
      (typeof node.encounterId !== "string" || node.encounterId.length === 0)
    ) {
      return error("invalid_save_run_map_node", "Save combat, elite, and boss map nodes must include an encounterId.", `${nodePath}.encounterId`);
    }

    if (!isStringArray(node.nextNodeIds)) {
      return error("invalid_save_run_map_node", "Save run map node nextNodeIds must be an array.", `${nodePath}.nextNodeIds`);
    }

    if (!isStringArray(node.previousNodeIds)) {
      return error("invalid_save_run_map_node", "Save run map node previousNodeIds must be an array.", `${nodePath}.previousNodeIds`);
    }
  }

  for (let index = 0; index < map.nodes.length; index += 1) {
    const node = map.nodes[index];
    if (!isRecord(node)) {
      return error("invalid_save_run_map_node", "Save run map node must be an object.", `${path}.nodes[${index}]`);
    }

    const nextNodeIds = node.nextNodeIds as readonly string[];
    if (new Set(nextNodeIds).size !== nextNodeIds.length) {
      return error("invalid_save_run_map_node", "Save run map node nextNodeIds must not contain duplicates.", `${path}.nodes[${index}].nextNodeIds`);
    }

    for (let nextIndex = 0; nextIndex < nextNodeIds.length; nextIndex += 1) {
      if (!nodeIds.has(nextNodeIds[nextIndex])) {
        return error("invalid_save_run_map_node", "Save run map node nextNodeIds must reference existing nodes.", `${path}.nodes[${index}].nextNodeIds[${nextIndex}]`);
      }
    }

    const previousNodeIds = node.previousNodeIds as readonly string[];
    if (new Set(previousNodeIds).size !== previousNodeIds.length) {
      return error("invalid_save_run_map_node", "Save run map node previousNodeIds must not contain duplicates.", `${path}.nodes[${index}].previousNodeIds`);
    }

    for (let previousIndex = 0; previousIndex < previousNodeIds.length; previousIndex += 1) {
      if (!nodeIds.has(previousNodeIds[previousIndex])) {
        return error("invalid_save_run_map_node", "Save run map node previousNodeIds must reference existing nodes.", `${path}.nodes[${index}].previousNodeIds[${previousIndex}]`);
      }
    }
  }

  const nodesById = new Map(
    map.nodes
      .filter(isRecord)
      .map((node) => [node.id, node])
      .filter((entry): entry is [string, Record<string, unknown>] => typeof entry[0] === "string")
  );
  for (let index = 0; index < map.nodes.length; index += 1) {
    const node = map.nodes[index];
    if (!isRecord(node) || typeof node.id !== "string") {
      return error("invalid_save_run_map_node", "Save run map node must be an object with a string id.", `${path}.nodes[${index}]`);
    }

    const nextNodeIds = node.nextNodeIds as readonly string[];
    for (let nextIndex = 0; nextIndex < nextNodeIds.length; nextIndex += 1) {
      const nextNode = nodesById.get(nextNodeIds[nextIndex]);
      const nextPreviousIds = Array.isArray(nextNode?.previousNodeIds) ? nextNode.previousNodeIds : [];
      if (!nextPreviousIds.includes(node.id)) {
        return error("invalid_save_run_map_node", "Save run map nextNodeIds and previousNodeIds must be reciprocal.", `${path}.nodes[${index}].nextNodeIds[${nextIndex}]`);
      }
    }

    const previousNodeIds = node.previousNodeIds as readonly string[];
    for (let previousIndex = 0; previousIndex < previousNodeIds.length; previousIndex += 1) {
      const previousNode = nodesById.get(previousNodeIds[previousIndex]);
      const previousNextIds = Array.isArray(previousNode?.nextNodeIds) ? previousNode.nextNodeIds : [];
      if (!previousNextIds.includes(node.id)) {
        return error("invalid_save_run_map_node", "Save run map nextNodeIds and previousNodeIds must be reciprocal.", `${path}.nodes[${index}].previousNodeIds[${previousIndex}]`);
      }
    }
  }

  if ("currentNodeId" in map && map.currentNodeId !== undefined) {
    if (typeof map.currentNodeId !== "string" || !nodeIds.has(map.currentNodeId)) {
      return error("invalid_save_run_map", "Save activeRun.map.currentNodeId must reference an existing node.", `${path}.currentNodeId`);
    }
  }

  return undefined;
};

const validateRunState = (run: unknown): GameActionError | undefined => {
  const knownStatuses = new Set(["not_started", "map_select", "combat", "reward", "completed", "lost"]);

  if (!isRecord(run)) {
    return error("invalid_save_active_run", "Save activeRun must be an object.", "activeRun");
  }

  if (typeof run.id !== "string") {
    return error("invalid_save_active_run", "Save activeRun.id must be a string.", "activeRun.id");
  }

  if (!isValidSeed(run.seed)) {
    return error("invalid_save_active_run", "Save activeRun.seed must be a finite number or string.", "activeRun.seed");
  }

  if (typeof run.playerClassId !== "string") {
    return error("invalid_save_active_run", "Save activeRun.playerClassId must be a string.", "activeRun.playerClassId");
  }

  if (typeof run.playerMaxHp !== "number" || !Number.isFinite(run.playerMaxHp) || run.playerMaxHp < 0) {
    return error("invalid_save_active_run", "Save activeRun.playerMaxHp must be a non-negative finite number.", "activeRun.playerMaxHp");
  }

  if (typeof run.playerHp !== "number" || !Number.isFinite(run.playerHp) || run.playerHp < 0) {
    return error("invalid_save_active_run", "Save activeRun.playerHp must be a non-negative finite number.", "activeRun.playerHp");
  }

  if (run.playerHp > run.playerMaxHp) {
    return error("invalid_save_active_run", "Save activeRun.playerHp must not exceed playerMaxHp.", "activeRun.playerHp");
  }

  if (run.status === "lost" && run.playerHp > 0) {
    return error("invalid_save_active_run", "Save lost activeRun must not retain positive playerHp.", "activeRun.playerHp");
  }

  if (run.status === "completed" && run.playerHp <= 0) {
    return error("invalid_save_active_run", "Save completed activeRun must retain positive playerHp.", "activeRun.playerHp");
  }

  if (!isStringArray(run.activePetInstanceIds)) {
    return error("invalid_save_active_run", "Save activeRun.activePetInstanceIds must be an array.", "activeRun.activePetInstanceIds");
  }

  if (typeof run.status !== "string" || !knownStatuses.has(run.status)) {
    return error("invalid_save_active_run", "Save activeRun.status is unsupported.", "activeRun.status");
  }

  if (!isStringArray(run.deckCardIds)) {
    return error("invalid_save_active_run", "Save activeRun.deckCardIds must be an array.", "activeRun.deckCardIds");
  }

  if (!isStringArray(run.runFlags)) {
    return error("invalid_save_active_run", "Save activeRun.runFlags must be an array.", "activeRun.runFlags");
  }

  if (!isStringArray(run.storyFlags)) {
    return error("invalid_save_active_run", "Save activeRun.storyFlags must be an array.", "activeRun.storyFlags");
  }

  if ("map" in run && run.map !== undefined) {
    const mapError = validateRunMap(run.map, "activeRun.map");
    if (mapError) {
      return mapError;
    }
  }

  if ("pendingRewardOffer" in run && run.pendingRewardOffer !== undefined) {
    const rewardError = validateRewardOffer(run.pendingRewardOffer, "activeRun.pendingRewardOffer");
    if (rewardError) {
      return rewardError;
    }
  }

  if ((run.status === "map_select" || run.status === "combat" || run.status === "reward") && !isRecord(run.map)) {
    return error("invalid_save_active_run", `Save activeRun with status '${run.status}' must include a map.`, "activeRun.map");
  }

  const mapNodes = isRecord(run.map) && Array.isArray(run.map.nodes) ? run.map.nodes : [];
  const activeNodes = mapNodes.filter((node) => isRecord(node) && node.status === "active");
  const activeCombatNodes = activeNodes.filter((node) =>
    isRecord(node) && (node.type === "combat" || node.type === "elite" || node.type === "boss")
  );

  if (run.status === "combat" && (activeNodes.length !== 1 || activeCombatNodes.length !== 1)) {
    return error(
      "invalid_save_active_run",
      "Combat runs must include exactly one active map node and it must be combat, elite, or boss.",
      "activeRun.map.nodes"
    );
  }

  if (run.status === "combat" && isRecord(run.map) && run.map.currentNodeId !== activeCombatNodes[0]?.id) {
    return error("invalid_save_active_run", "Combat run currentNodeId must match the active combat node.", "activeRun.map.currentNodeId");
  }

  if (run.status === "map_select") {
    if (activeNodes.length > 0) {
      return error("invalid_save_active_run", "Map-select runs must not contain an active map node.", "activeRun.map.nodes");
    }

    if (isRecord(run.map) && run.map.currentNodeId !== undefined) {
      return error("invalid_save_active_run", "Map-select runs must not contain a currentNodeId.", "activeRun.map.currentNodeId");
    }

    if (!mapNodes.some((node) => isRecord(node) && node.status === "available")) {
      return error("invalid_save_active_run", "Map-select runs must contain at least one available map node.", "activeRun.map.nodes");
    }
  }

  if (run.status === "reward") {
    if (activeNodes.length !== 1 || activeCombatNodes.length !== 1) {
      return error(
        "invalid_save_active_run",
        "Reward runs must include exactly one active map node and it must be combat, elite, or boss.",
        "activeRun.map.nodes"
      );
    }

    if (!("pendingRewardOffer" in run) || run.pendingRewardOffer === undefined) {
      return error("invalid_save_active_run", "Reward runs must include an open pending reward offer.", "activeRun.pendingRewardOffer");
    }

    const rewardOffer = run.pendingRewardOffer;
    if (!isRecord(rewardOffer) || rewardOffer.status !== "open") {
      return error("invalid_save_active_run", "Reward runs must include an open pending reward offer.", "activeRun.pendingRewardOffer.status");
    }

    if (rewardOffer.combatId !== run.id) {
      return error("invalid_save_active_run", "Reward pendingRewardOffer.combatId must match the active run id.", "activeRun.pendingRewardOffer.combatId");
    }

    if (isRecord(run.map) && run.map.currentNodeId !== activeCombatNodes[0]?.id) {
      return error("invalid_save_active_run", "Reward run currentNodeId must match the active combat node.", "activeRun.map.currentNodeId");
    }
  }

  if (run.status !== "reward" && "pendingRewardOffer" in run && run.pendingRewardOffer !== undefined) {
    return error("invalid_save_active_run", "Only reward runs may contain a pending reward offer.", "activeRun.pendingRewardOffer");
  }

  return undefined;
};

const validatePetInstance = (petInstance: unknown, index: number): GameActionError | undefined => {
  const path = `petInstances[${index}]`;

  if (!isRecord(petInstance)) {
    return error("invalid_save_pet_instance", "Save pet instance must be an object.", path);
  }

  if (typeof petInstance.id !== "string") {
    return error("invalid_save_pet_instance", "Save pet instance id must be a string.", `${path}.id`);
  }

  if (typeof petInstance.definitionId !== "string") {
    return error("invalid_save_pet_instance", "Save pet instance definitionId must be a string.", `${path}.definitionId`);
  }

  if (typeof petInstance.nickname !== "string") {
    return error("invalid_save_pet_instance", "Save pet instance nickname must be a string.", `${path}.nickname`);
  }

  if (
    typeof petInstance.bondLevel !== "number" ||
    !Number.isInteger(petInstance.bondLevel) ||
    petInstance.bondLevel < 0
  ) {
    return error("invalid_save_pet_instance", "Save pet instance bondLevel must be a non-negative integer.", `${path}.bondLevel`);
  }

  if (typeof petInstance.bondXp !== "number" || !Number.isFinite(petInstance.bondXp) || petInstance.bondXp < 0) {
    return error("invalid_save_pet_instance", "Save pet instance bondXp must be a non-negative number.", `${path}.bondXp`);
  }

  const arrayFields = [
    "unlockedUpgradeIds",
    "chosenEvolutionNodeIds",
    "unlockedMemoryIds",
    "storyFlags"
  ] as const;
  for (const field of arrayFields) {
    if (!isStringArray(petInstance[field])) {
      return error("invalid_save_pet_instance", `Save pet instance ${field} must be an array.`, `${path}.${field}`);
    }

    if (hasDuplicateStrings(petInstance[field])) {
      return error("invalid_save_pet_instance", `Save pet instance ${field} must not contain duplicates.`, `${path}.${field}`);
    }
  }

  if (
    "unlockedEvolutionNodeIds" in petInstance &&
    petInstance.unlockedEvolutionNodeIds !== undefined &&
    !isStringArray(petInstance.unlockedEvolutionNodeIds)
  ) {
    return error(
      "invalid_save_pet_instance",
      "Save pet instance unlockedEvolutionNodeIds must be an array when present.",
      `${path}.unlockedEvolutionNodeIds`
    );
  }
  if (isStringArray(petInstance.unlockedEvolutionNodeIds) && hasDuplicateStrings(petInstance.unlockedEvolutionNodeIds)) {
    return error(
      "invalid_save_pet_instance",
      "Save pet instance unlockedEvolutionNodeIds must not contain duplicates.",
      `${path}.unlockedEvolutionNodeIds`
    );
  }

  if (
    "seenStoryEventIds" in petInstance &&
    petInstance.seenStoryEventIds !== undefined &&
    !isStringArray(petInstance.seenStoryEventIds)
  ) {
    return error(
      "invalid_save_pet_instance",
      "Save pet instance seenStoryEventIds must be an array when present.",
      `${path}.seenStoryEventIds`
    );
  }
  if (isStringArray(petInstance.seenStoryEventIds) && hasDuplicateStrings(petInstance.seenStoryEventIds)) {
    return error(
      "invalid_save_pet_instance",
      "Save pet instance seenStoryEventIds must not contain duplicates.",
      `${path}.seenStoryEventIds`
    );
  }

  return undefined;
};

const normalisePetInstance = (petInstance: PetInstance): PetInstance => ({
  id: petInstance.id,
  definitionId: petInstance.definitionId,
  nickname: petInstance.nickname,
  bondLevel: petInstance.bondLevel,
  bondXp: petInstance.bondXp,
  unlockedUpgradeIds: [...petInstance.unlockedUpgradeIds],
  chosenEvolutionNodeIds: [...petInstance.chosenEvolutionNodeIds],
  unlockedEvolutionNodeIds: [...(petInstance.unlockedEvolutionNodeIds ?? [])],
  unlockedMemoryIds: [...petInstance.unlockedMemoryIds],
  storyFlags: [...petInstance.storyFlags],
  seenStoryEventIds: [...(petInstance.seenStoryEventIds ?? [])]
});

const normaliseRunState = (run: RunState): RunState => {
  const map = run.map
    ? {
        id: run.map.id,
        templateId: run.map.templateId,
        seed: run.map.seed,
        nodes: run.map.nodes.map((node) => ({
          id: node.id,
          type: node.type,
          layer: node.layer,
          status: node.status,
          encounterId: node.encounterId,
          nextNodeIds: [...node.nextNodeIds],
          previousNodeIds: [...node.previousNodeIds]
        })),
        currentNodeId: run.map.currentNodeId
      }
    : undefined;
  const pendingRewardOffer = run.pendingRewardOffer
    ? {
        id: run.pendingRewardOffer.id,
        source: run.pendingRewardOffer.source,
        combatId: run.pendingRewardOffer.combatId,
        seed: run.pendingRewardOffer.seed,
        status: run.pendingRewardOffer.status,
        options: run.pendingRewardOffer.options.map((option) =>
          option.type === "card"
            ? {
                id: option.id,
                type: option.type,
                cardId: option.cardId
              }
            : {
                id: option.id,
                type: option.type,
                petInstanceId: option.petInstanceId,
                petDefinitionId: option.petDefinitionId,
                upgradeId: option.upgradeId
              }
        ),
        selectedOptionId: run.pendingRewardOffer.selectedOptionId
      }
    : undefined;

  return {
    id: run.id,
    seed: run.seed,
    playerClassId: run.playerClassId,
    activePetInstanceIds: [...run.activePetInstanceIds],
    status: run.status,
    playerHp: run.playerHp,
    playerMaxHp: run.playerMaxHp,
    map,
    pendingRewardOffer,
    deckCardIds: [...run.deckCardIds],
    runFlags: [...run.runFlags],
    storyFlags: [...run.storyFlags]
  };
};

export const validateSaveSnapshot = (
  snapshot: unknown
): GameActionResult<SaveSnapshot> => {
  const state = isRecord(snapshot) ? normaliseLegacySaveSnapshot(snapshot) as SaveSnapshot : invalidSnapshot();

  if (!isRecord(snapshot)) {
    return reject(state, error("invalid_save_snapshot", "Save snapshot must be an object.", "snapshot"));
  }

  if (!isJsonStringifiable(snapshot)) {
    return reject(state, error("invalid_save_snapshot", "Save snapshot must contain only JSON-serializable data.", "snapshot"));
  }

  if (snapshot.schemaVersion !== SAVE_SCHEMA_VERSION) {
    return reject(
      state,
      error("unsupported_save_schema_version", `Save schema version '${String(snapshot.schemaVersion)}' is not supported.`, "schemaVersion")
    );
  }

  const snapshotForValidation = normaliseLegacySaveSnapshot(snapshot);
  if (!isRecord(snapshotForValidation)) {
    return reject(state, error("invalid_save_snapshot", "Save snapshot must be an object.", "snapshot"));
  }

  if (typeof snapshotForValidation.contentVersion !== "string" || snapshotForValidation.contentVersion.length === 0) {
    return reject(state, error("invalid_save_snapshot", "Save contentVersion must be a non-empty string.", "contentVersion"));
  }

  if (typeof snapshotForValidation.createdAt !== "string" || snapshotForValidation.createdAt.length === 0) {
    return reject(state, error("invalid_save_snapshot", "Save createdAt must be a non-empty string.", "createdAt"));
  }

  if (typeof snapshotForValidation.updatedAt !== "string" || snapshotForValidation.updatedAt.length === 0) {
    return reject(state, error("invalid_save_snapshot", "Save updatedAt must be a non-empty string.", "updatedAt"));
  }

  if (typeof snapshotForValidation.profileId !== "string" || snapshotForValidation.profileId.length === 0) {
    return reject(state, error("invalid_save_snapshot", "Save profileId must be a non-empty string.", "profileId"));
  }

  if (!Array.isArray(snapshotForValidation.petInstances)) {
    return reject(state, error("invalid_save_snapshot", "Save petInstances must be an array.", "petInstances"));
  }

  for (let index = 0; index < snapshotForValidation.petInstances.length; index += 1) {
    const petError = validatePetInstance(snapshotForValidation.petInstances[index], index);
    if (petError) {
      return reject(state, petError);
    }
  }

  const savedPetInstances = snapshotForValidation.petInstances as readonly PetInstance[];
  const savedPetIds = savedPetInstances.map((petInstance) => petInstance.id);
  if (new Set(savedPetIds).size !== savedPetIds.length) {
    return reject(state, error("invalid_save_pet_instance", "Save pet instance ids must be unique.", "petInstances"));
  }

  const savedPetsById = new Map(savedPetInstances.map((petInstance) => [petInstance.id, petInstance]));

  if (!isStringArray(snapshotForValidation.globalStoryFlags)) {
    return reject(state, error("invalid_save_snapshot", "Save globalStoryFlags must be an array.", "globalStoryFlags"));
  }

  if ("activeRun" in snapshotForValidation && snapshotForValidation.activeRun !== undefined) {
    const runError = validateRunState(snapshotForValidation.activeRun);
    if (runError) {
      return reject(state, runError);
    }

    const activeRun = snapshotForValidation.activeRun as unknown as RunState;
    if (activeRun.activePetInstanceIds.length === 0) {
      return reject(state, error("invalid_save_active_run", "Save activeRun must reference at least one active pet.", "activeRun.activePetInstanceIds"));
    }

    if (new Set(activeRun.activePetInstanceIds).size !== activeRun.activePetInstanceIds.length) {
      return reject(state, error("invalid_save_active_run", "Save activeRun active pet ids must be unique.", "activeRun.activePetInstanceIds"));
    }

    const missingPetInstanceId = activeRun.activePetInstanceIds.find((petInstanceId) => !savedPetsById.has(petInstanceId));
    if (missingPetInstanceId) {
      return reject(
        state,
        error("invalid_save_active_run", `Save activeRun references missing pet instance '${missingPetInstanceId}'.`, "activeRun.activePetInstanceIds")
      );
    }

    const rewardOptions = activeRun.pendingRewardOffer?.options ?? [];
    for (let optionIndex = 0; optionIndex < rewardOptions.length; optionIndex += 1) {
      const option = rewardOptions[optionIndex];
      if (option.type !== "petUpgrade") {
        continue;
      }

      const petInstance = savedPetsById.get(option.petInstanceId);
      if (!petInstance) {
        return reject(
          state,
          error("invalid_save_reward_option", `Pet upgrade reward option references missing pet instance '${option.petInstanceId}'.`, `activeRun.pendingRewardOffer.options[${optionIndex}].petInstanceId`)
        );
      }

      if (petInstance.definitionId !== option.petDefinitionId) {
        return reject(
          state,
          error("invalid_save_reward_option", `Pet upgrade reward option pet definition '${option.petDefinitionId}' does not match saved pet '${petInstance.id}'.`, `activeRun.pendingRewardOffer.options[${optionIndex}].petDefinitionId`)
        );
      }

      if (petInstance.unlockedUpgradeIds.includes(option.upgradeId)) {
        return reject(
          state,
          error("invalid_save_reward_option", `Pet upgrade reward option '${option.upgradeId}' is already unlocked for saved pet '${petInstance.id}'.`, `activeRun.pendingRewardOffer.options[${optionIndex}].upgradeId`)
        );
      }
    }
  }

  const validatedSnapshot = snapshotForValidation as unknown as SaveSnapshot;
  const canonicalSnapshot: SaveSnapshot = {
    schemaVersion: SAVE_SCHEMA_VERSION,
    contentVersion: validatedSnapshot.contentVersion,
    createdAt: validatedSnapshot.createdAt,
    updatedAt: validatedSnapshot.updatedAt,
    profileId: validatedSnapshot.profileId,
    activeRun: validatedSnapshot.activeRun ? normaliseRunState(validatedSnapshot.activeRun) : undefined,
    petInstances: validatedSnapshot.petInstances.map(normalisePetInstance),
    globalStoryFlags: [...validatedSnapshot.globalStoryFlags]
  };

  return {
    ok: true,
    state: canonicalSnapshot,
    events: [],
    errors: []
  };
};

export const validateSaveSnapshotContent = (
  snapshot: SaveSnapshot,
  registry: GameContentRegistry
): GameActionResult<SaveSnapshot> => {
  const validation = validateSaveSnapshot(snapshot);
  if (!validation.ok) {
    return validation;
  }

  let contentIndex: ReturnType<typeof buildContentIndex>;
  try {
    contentIndex = buildContentIndex(registry);
  } catch {
    return reject(validation.state, error("invalid_content_registry", "Content registry could not be indexed for save validation.", "registry"));
  }

  if (
    validation.state.contentVersion !== UNKNOWN_SAVE_CONTENT_VERSION &&
    validation.state.contentVersion !== registry.contentVersion
  ) {
    return reject(
      validation.state,
      error(
        "incompatible_save_content_version",
        `Save contentVersion '${validation.state.contentVersion}' does not match registry contentVersion '${registry.contentVersion}'.`,
        "contentVersion"
      )
    );
  }

  for (let petIndex = 0; petIndex < validation.state.petInstances.length; petIndex += 1) {
    const petInstance = validation.state.petInstances[petIndex];
    const petDefinition = contentIndex.petsById.get(petInstance.definitionId);
    if (!petDefinition) {
      return reject(
        validation.state,
        error("unknown_save_content_reference", `Saved pet references unknown pet definition '${petInstance.definitionId}'.`, `petInstances[${petIndex}].definitionId`)
      );
    }

    const evolutionNodeIds = new Set(petDefinition.evolutionTree.map((node) => node.id));
    for (let upgradeIndex = 0; upgradeIndex < petInstance.unlockedUpgradeIds.length; upgradeIndex += 1) {
      const upgradeId = petInstance.unlockedUpgradeIds[upgradeIndex];
      const upgrade = contentIndex.petUpgradesById.get(upgradeId);
      if (!upgrade || upgrade.petDefinitionId !== petInstance.definitionId) {
        return reject(
          validation.state,
          error("unknown_save_content_reference", `Saved pet references unknown or incompatible upgrade '${upgradeId}'.`, `petInstances[${petIndex}].unlockedUpgradeIds[${upgradeIndex}]`)
        );
      }
    }

    for (let nodeIndex = 0; nodeIndex < petInstance.chosenEvolutionNodeIds.length; nodeIndex += 1) {
      const nodeId = petInstance.chosenEvolutionNodeIds[nodeIndex];
      if (!evolutionNodeIds.has(nodeId)) {
        return reject(
          validation.state,
          error("unknown_save_content_reference", `Saved pet references unknown evolution node '${nodeId}'.`, `petInstances[${petIndex}].chosenEvolutionNodeIds[${nodeIndex}]`)
        );
      }
    }

    for (let nodeIndex = 0; nodeIndex < (petInstance.unlockedEvolutionNodeIds ?? []).length; nodeIndex += 1) {
      const nodeId = (petInstance.unlockedEvolutionNodeIds ?? [])[nodeIndex];
      if (!evolutionNodeIds.has(nodeId)) {
        return reject(
          validation.state,
          error("unknown_save_content_reference", `Saved pet references unknown evolution node '${nodeId}'.`, `petInstances[${petIndex}].unlockedEvolutionNodeIds[${nodeIndex}]`)
        );
      }
    }

    for (let eventIndex = 0; eventIndex < (petInstance.seenStoryEventIds ?? []).length; eventIndex += 1) {
      const eventId = (petInstance.seenStoryEventIds ?? [])[eventIndex];
      if (!contentIndex.storyEventsById.has(eventId)) {
        return reject(
          validation.state,
          error("unknown_save_content_reference", `Saved pet references unknown story event '${eventId}'.`, `petInstances[${petIndex}].seenStoryEventIds[${eventIndex}]`)
        );
      }
    }
  }

  const activeRun = validation.state.activeRun;
  if (!activeRun) {
    return validation;
  }

  if (!contentIndex.playersById.has(activeRun.playerClassId)) {
    return reject(
      validation.state,
      error("unknown_save_content_reference", `Saved run references unknown player class '${activeRun.playerClassId}'.`, "activeRun.playerClassId")
    );
  }

  for (let cardIndex = 0; cardIndex < activeRun.deckCardIds.length; cardIndex += 1) {
    const cardId = activeRun.deckCardIds[cardIndex];
    if (!contentIndex.cardsById.has(cardId)) {
      return reject(
        validation.state,
        error("unknown_save_content_reference", `Saved run references unknown deck card '${cardId}'.`, `activeRun.deckCardIds[${cardIndex}]`)
      );
    }
  }

  if (activeRun.map) {
    if (!contentIndex.runMapTemplatesById.has(activeRun.map.templateId)) {
      return reject(
        validation.state,
        error("unknown_save_content_reference", `Saved run references unknown map template '${activeRun.map.templateId}'.`, "activeRun.map.templateId")
      );
    }

    for (let nodeIndex = 0; nodeIndex < activeRun.map.nodes.length; nodeIndex += 1) {
      const encounterId = activeRun.map.nodes[nodeIndex].encounterId;
      if (encounterId && !contentIndex.encountersById.has(encounterId)) {
        return reject(
          validation.state,
          error("unknown_save_content_reference", `Saved map node references unknown encounter '${encounterId}'.`, `activeRun.map.nodes[${nodeIndex}].encounterId`)
        );
      }
    }
  }

  const rewardOptions = activeRun.pendingRewardOffer?.options ?? [];
  for (let optionIndex = 0; optionIndex < rewardOptions.length; optionIndex += 1) {
    const option = rewardOptions[optionIndex];
    if (option.type === "card" && !contentIndex.cardsById.has(option.cardId)) {
      return reject(
        validation.state,
        error("unknown_save_content_reference", `Saved reward references unknown card '${option.cardId}'.`, `activeRun.pendingRewardOffer.options[${optionIndex}].cardId`)
      );
    }

    if (option.type === "petUpgrade") {
      const upgrade = contentIndex.petUpgradesById.get(option.upgradeId);
      if (!contentIndex.petsById.has(option.petDefinitionId)) {
        return reject(
          validation.state,
          error("unknown_save_content_reference", `Saved reward references unknown pet definition '${option.petDefinitionId}'.`, `activeRun.pendingRewardOffer.options[${optionIndex}].petDefinitionId`)
        );
      }

      if (!upgrade || upgrade.petDefinitionId !== option.petDefinitionId) {
        return reject(
          validation.state,
          error("unknown_save_content_reference", `Saved reward references unknown or incompatible pet upgrade '${option.upgradeId}'.`, `activeRun.pendingRewardOffer.options[${optionIndex}].upgradeId`)
        );
      }
    }
  }

  return validation;
};

export const createSaveSnapshot = (
  input: CreateSaveSnapshotInput
): GameActionResult<SaveSnapshot> => {
  if (!isRecord(input)) {
    return reject(invalidSnapshot(), error("invalid_save_snapshot", "Save input must be an object.", "input"));
  }

  const now = typeof input.now === "string" ? input.now : new Date().toISOString();
  const contentVersion = input.contentVersion ?? input.registry?.contentVersion ?? starterRegistry.contentVersion;
  const snapshot = {
    schemaVersion: SAVE_SCHEMA_VERSION,
    contentVersion,
    createdAt: now,
    updatedAt: now,
    profileId: input.profileId,
    activeRun: input.activeRun,
    petInstances: input.petInstances,
    globalStoryFlags: input.globalStoryFlags ?? []
  } as unknown as SaveSnapshot;
  const validation = validateSaveSnapshot(snapshot);
  if (!validation.ok) {
    return validation;
  }

  return {
    ok: true,
    state: validation.state,
    events: [
      {
        type: "SaveSnapshotCreated",
        profileId: snapshot.profileId,
        schemaVersion: snapshot.schemaVersion,
        hasActiveRun: Boolean(snapshot.activeRun)
      }
    ],
    errors: []
  };
};

export const serializeSaveSnapshot = (
  snapshot: SaveSnapshot
): GameActionResult<string> => {
  const validation = validateSaveSnapshot(snapshot);
  if (!validation.ok) {
    return reject("", validation.errors[0]);
  }

  try {
    return { ok: true, state: JSON.stringify(validation.state), events: [], errors: [] };
  } catch {
    return reject("", error("invalid_save_snapshot", "Save snapshot could not be serialized as JSON.", "snapshot"));
  }
};

export const parseSaveSnapshot = (
  json: string
): GameActionResult<SaveSnapshot> => {
  try {
    const parsed = JSON.parse(json) as unknown;
    return validateSaveSnapshot(parsed);
  } catch {
    return reject(invalidSnapshot(), error("invalid_save_json", "Save JSON could not be parsed.", "json"));
  }
};

export const restoreSaveSnapshot = (
  snapshot: SaveSnapshot,
  registry?: GameContentRegistry
): GameActionResult<SaveRestoredState> => {
  const validation = registry
    ? validateSaveSnapshotContent(snapshot, registry)
    : validateSaveSnapshot(snapshot);
  if (!validation.ok) {
    return reject(
      {
        activeRun: undefined,
        petInstances: [],
        globalStoryFlags: []
      },
      validation.errors[0]
    );
  }

  return {
    ok: true,
    state: {
      activeRun: validation.state.activeRun,
      petInstances: validation.state.petInstances,
      globalStoryFlags: validation.state.globalStoryFlags
    },
    events: [],
    errors: []
  };
};

const metadataFromSerialized = (slotId: string, serializedSnapshot: string): SaveSlotMetadata => {
  try {
    const parsed = JSON.parse(serializedSnapshot) as unknown;
    if (!isRecord(parsed)) {
      return { slotId, updatedAt: "", schemaVersion: 0, contentVersion: UNKNOWN_SAVE_CONTENT_VERSION, hasActiveRun: false };
    }

    return {
      slotId,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
      schemaVersion: typeof parsed.schemaVersion === "number" ? parsed.schemaVersion : 0,
      contentVersion: typeof parsed.contentVersion === "string" && parsed.contentVersion.length > 0
        ? parsed.contentVersion
        : UNKNOWN_SAVE_CONTENT_VERSION,
      hasActiveRun: Boolean(parsed.activeRun)
    };
  } catch {
    return { slotId, updatedAt: "", schemaVersion: 0, contentVersion: UNKNOWN_SAVE_CONTENT_VERSION, hasActiveRun: false };
  }
};

export const createMemorySaveStore = (): SaveStore => {
  const slots = new Map<string, string>();

  return {
    write: (slotId, serializedSnapshot) => {
      slots.set(slotId, serializedSnapshot);
    },
    read: (slotId) => slots.get(slotId),
    delete: (slotId) => {
      slots.delete(slotId);
    },
    list: () =>
      [...slots.entries()].map(([slotId, serializedSnapshot]) =>
        metadataFromSerialized(slotId, serializedSnapshot)
      )
  };
};

export const saveToSlot = async (
  store: SaveStore,
  slotId: string,
  snapshot: SaveSnapshot
): Promise<GameActionResult<SaveSlotMetadata>> => {
  const serialized = serializeSaveSnapshot(snapshot);
  const metadata = metadataFromSerialized(slotId, serialized.state);
  if (!serialized.ok) {
    return reject(metadata, serialized.errors[0]);
  }

  try {
    await store.write(slotId, serialized.state);
  } catch {
    return reject(metadata, error("save_slot_write_failed", `Save slot '${slotId}' could not be written.`, "slotId"));
  }

  const savedMetadata = metadataFromSerialized(slotId, serialized.state);

  return {
    ok: true,
    state: savedMetadata,
    events: [{ type: "SaveSlotWritten", slotId, updatedAt: savedMetadata.updatedAt, schemaVersion: savedMetadata.schemaVersion }],
    errors: []
  };
};

export const loadFromSlot = async (
  store: SaveStore,
  slotId: string,
  registry?: GameContentRegistry
): Promise<GameActionResult<SaveSnapshot>> => {
  let serialized: string | undefined;
  try {
    serialized = await store.read(slotId);
  } catch {
    return reject(invalidSnapshot(), error("save_slot_read_failed", `Save slot '${slotId}' could not be read.`, "slotId"));
  }

  if (serialized === undefined) {
    return reject(invalidSnapshot(), error("missing_save_slot", `Save slot '${slotId}' does not exist.`, "slotId"));
  }

  const parsed = parseSaveSnapshot(serialized);
  if (!parsed.ok) {
    return reject(parsed.state, error("corrupt_save_slot", `Save slot '${slotId}' contains invalid data.`, "slotId"));
  }

  const contentValidation = registry
    ? validateSaveSnapshotContent(parsed.state, registry)
    : parsed;
  if (!contentValidation.ok) {
    return reject(contentValidation.state, error("corrupt_save_slot", `Save slot '${slotId}' contains incompatible content references.`, "slotId"));
  }

  return {
    ok: true,
    state: contentValidation.state,
    events: [
      {
        type: "SaveSlotLoaded",
        slotId,
        updatedAt: contentValidation.state.updatedAt,
        schemaVersion: contentValidation.state.schemaVersion
      }
    ],
    errors: []
  };
};

export const deleteSaveSlot = async (
  store: SaveStore,
  slotId: string
): Promise<GameActionResult<SaveSlotMetadata>> => {
  const state: SaveSlotMetadata = {
    slotId,
    updatedAt: "",
    schemaVersion: SAVE_SCHEMA_VERSION,
    contentVersion: UNKNOWN_SAVE_CONTENT_VERSION,
    hasActiveRun: false
  };

  try {
    await store.delete(slotId);
  } catch {
    return reject(state, error("save_slot_delete_failed", `Save slot '${slotId}' could not be deleted.`, "slotId"));
  }

  return {
    ok: true,
    state,
    events: [{ type: "SaveSlotDeleted", slotId }],
    errors: []
  };
};
