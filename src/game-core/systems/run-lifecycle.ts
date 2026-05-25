import {
  runId,
  type EncounterId,
  type PetInstanceId,
  type PlayerClassId,
  type RewardOptionId,
  type RunNodeId,
  type RunTemplateId
} from "../ids";
import type { GameActionError, GameActionResult } from "../model/action";
import type { CombatState } from "../model/combat";
import type { EncounterDefinition } from "../model/encounter";
import type { GameEvent } from "../model/event";
import type { PetInstance } from "../model/pet";
import type { GameContentRegistry } from "../model/registry";
import type { RunState } from "../model/run";
import type { RunNodeState, RunNodeType } from "../model/run-map";
import { createCombat } from "./combat";
import { claimReward, generateCombatRewardOffer, skipReward } from "./rewards";
import { generateRunMap } from "./run-map";

export type CreateRunInput = {
  readonly seed: string | number;
  readonly playerClassId: PlayerClassId;
  readonly activePetInstanceIds: readonly PetInstanceId[];
  readonly petInstances: readonly PetInstance[];
  readonly registry: GameContentRegistry;
  readonly runTemplateId?: RunTemplateId;
};

export type StartCombatForRunNodeInput = {
  readonly run: RunState;
  readonly registry: GameContentRegistry;
  readonly petInstances: readonly PetInstance[];
  readonly seed?: string | number;
};

export type CompleteRunCombatNodeInput = {
  readonly run: RunState;
  readonly combat: CombatState;
  readonly registry: GameContentRegistry;
  readonly petInstances: readonly PetInstance[];
  readonly rewardSeed?: string | number;
};

export type ClaimRunPendingRewardInput = {
  readonly run: RunState;
  readonly selectedOptionId: RewardOptionId;
  readonly registry: GameContentRegistry;
  readonly petInstances: readonly PetInstance[];
};

export type SkipRunPendingRewardInput = {
  readonly run: RunState;
  readonly petInstances: readonly PetInstance[];
};

export type RunRewardClaimState = {
  readonly run: RunState;
  readonly petInstances: readonly PetInstance[];
};

const combatNodeTypes = new Set<RunNodeType>(["combat", "elite", "boss"]);

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

const rejectRun = (
  state: RunState,
  actionError: GameActionError
): GameActionResult<RunState> => ({
  ok: false,
  state,
  events: [rejectedEvent(actionError)],
  errors: [actionError]
});

const createRejectedRunState = (input: CreateRunInput): RunState => ({
  id: runId(`run:rejected:${String(input.seed)}`),
  seed: input.seed,
  playerClassId: input.playerClassId,
  activePetInstanceIds: [...input.activePetInstanceIds],
  status: "not_started",
  deckCardIds: [],
  runFlags: [],
  storyFlags: []
});

const rejectCreateRun = (
  input: CreateRunInput,
  actionError: GameActionError
): GameActionResult<RunState> => ({
  ok: false,
  state: createRejectedRunState(input),
  events: [rejectedEvent(actionError)],
  errors: [actionError]
});

const originalRewardState = (
  run: RunState,
  petInstances: readonly PetInstance[]
): RunRewardClaimState => ({ run, petInstances });

const rejectReward = (
  state: RunRewardClaimState,
  actionError: GameActionError
): GameActionResult<RunRewardClaimState> => ({
  ok: false,
  state,
  events: [rejectedEvent(actionError)],
  errors: [actionError]
});

const findActiveNode = (run: RunState): RunNodeState | undefined =>
  run.map?.nodes.find((node) => node.status === "active");

const findActiveNodes = (run: RunState): readonly RunNodeState[] =>
  run.map?.nodes.filter((node) => node.status === "active") ?? [];

const activeCombatNode = (run: RunState): RunNodeState | undefined => {
  const activeNodes = findActiveNodes(run).filter((node) => combatNodeTypes.has(node.type));
  return activeNodes.length === 1 ? activeNodes[0] : undefined;
};

const findEncounter = (
  registry: GameContentRegistry,
  encounterId?: EncounterId
): EncounterDefinition | undefined =>
  encounterId ? registry.encounters.find((encounter) => encounter.id === encounterId) : undefined;

const advanceFromActiveNode = (
  run: RunState,
  completedNode: RunNodeState
): { readonly run: RunState; readonly events: readonly GameEvent[] } => {
  const map = run.map;

  if (!map) {
    return { run, events: [] };
  }

  const nextNodeIds = new Set(completedNode.nextNodeIds);
  const nodes = map.nodes.map((node) => {
    if (node.id === completedNode.id) {
      return { ...node, status: "completed" as const };
    }

    if (nextNodeIds.has(node.id) && node.status === "locked") {
      return { ...node, status: "available" as const };
    }

    return node;
  });
  const availableNodeIds = nodes
    .filter((node) => nextNodeIds.has(node.id) && node.status === "available")
    .map((node) => node.id);
  const status = availableNodeIds.length > 0 ? "map_select" : "completed";
  const nextRun: RunState = {
    ...run,
    status,
    map: {
      ...map,
      currentNodeId: undefined,
      nodes
    },
    pendingRewardOffer: undefined
  };
  const events: GameEvent[] = [
    { type: "RunNodeCompleted", nodeId: completedNode.id },
    { type: "RunAdvanced", availableNodeIds }
  ];

  if (status === "completed") {
    events.push({ type: "RunEnded", outcome: "completed" });
  }

  return { run: nextRun, events };
};

const createRejectedCombatState = (input: StartCombatForRunNodeInput): CombatState => {
  const combatResult = createCombat({
    run: input.run,
    registry: input.registry,
    petInstances: input.petInstances,
    monsterIds: [],
    seed: input.seed ?? `${String(input.run.seed)}:rejected-combat`,
    openingHandSize: 0
  });

  return combatResult.state;
};

const rejectCombat = (
  input: StartCombatForRunNodeInput,
  actionError: GameActionError
): GameActionResult<CombatState> => ({
  ok: false,
  state: createRejectedCombatState(input),
  events: [rejectedEvent(actionError)],
  errors: [actionError]
});

export const createRun = (input: CreateRunInput): GameActionResult<RunState> => {
  const { seed, playerClassId, activePetInstanceIds, petInstances, registry } = input;
  const player = registry.players.find((candidate) => candidate.id === playerClassId);

  if (!player) {
    return rejectCreateRun(
      input,
      error("missing_player_class", `Player class '${playerClassId}' is not registered.`, "playerClassId")
    );
  }

  if (activePetInstanceIds.length === 0) {
    return rejectCreateRun(input, error("missing_active_pet", "At least one active pet is required.", "activePetInstanceIds"));
  }

  if (new Set(activePetInstanceIds).size !== activePetInstanceIds.length) {
    return rejectCreateRun(input, error("duplicate_active_pet", "Active pet instance ids must be unique.", "activePetInstanceIds"));
  }

  const missingPetInstanceId = activePetInstanceIds.find((petInstanceId) =>
    !petInstances.some((petInstance) => petInstance.id === petInstanceId)
  );
  if (missingPetInstanceId) {
    return rejectCreateRun(
      input,
      error("missing_active_pet_instance", `Active pet instance '${missingPetInstanceId}' was not provided.`, "petInstances")
    );
  }

  const activePetInstances = activePetInstanceIds.map((petInstanceId) =>
    petInstances.find((petInstance) => petInstance.id === petInstanceId)
  ) as readonly PetInstance[];
  const missingPetDefinition = activePetInstances.find((petInstance) =>
    !registry.pets.some((pet) => pet.id === petInstance.definitionId)
  );
  if (missingPetDefinition) {
    return rejectCreateRun(
      input,
      error(
        "missing_active_pet_definition",
        `Active pet instance '${missingPetDefinition.id}' references missing pet definition '${missingPetDefinition.definitionId}'.`,
        "registry.pets"
      )
    );
  }

  if (activePetInstanceIds.length > player.maxActivePets) {
    return rejectCreateRun(
      input,
      error(
        "too_many_active_pets",
        `Player class '${player.id}' allows ${player.maxActivePets} active pet(s).`,
        "activePetInstanceIds"
      )
    );
  }

  const template = input.runTemplateId
    ? registry.runMapTemplates.find((candidate) => candidate.id === input.runTemplateId)
    : registry.runMapTemplates[0];
  if (!template) {
    return rejectCreateRun(input, error("missing_run_map_template", "Run map template is not registered.", "runTemplateId"));
  }

  const mapResult = generateRunMap({ seed, template });
  if (!mapResult.ok) {
    return rejectCreateRun(input, mapResult.errors[0]);
  }

  const state: RunState = {
    id: runId(`run:${String(seed)}`),
    seed,
    playerClassId,
    activePetInstanceIds: [...activePetInstanceIds],
    status: "map_select",
    map: mapResult.state,
    deckCardIds: [...player.startingDeckCardIds],
    runFlags: [],
    storyFlags: []
  };
  const events: readonly GameEvent[] = [
    {
      type: "RunCreated",
      runId: state.id,
      seed,
      playerClassId,
      activePetInstanceIds: state.activePetInstanceIds
    },
    ...mapResult.events
  ];

  return { ok: true, state, events, errors: [] };
};

export const selectRunNode = (
  run: RunState,
  nodeId: RunNodeId
): GameActionResult<RunState> => {
  if (run.status !== "map_select") {
    return rejectRun(
      run,
      error("invalid_run_status", `Cannot select a run node while run status is '${run.status}'.`, "run.status")
    );
  }

  if (run.pendingRewardOffer?.status === "open") {
    return rejectRun(run, error("pending_reward_open", "Cannot select a node while a reward is pending.", "run.pendingRewardOffer"));
  }

  if (!run.map) {
    return rejectRun(run, error("missing_run_map", "Run has no map.", "run.map"));
  }

  const selectedNode = run.map.nodes.find((node) => node.id === nodeId);
  if (!selectedNode) {
    return rejectRun(run, error("missing_run_node", `Run node '${nodeId}' does not exist.`, "nodeId"));
  }

  if (selectedNode.status !== "available") {
    return rejectRun(
      run,
      error("run_node_not_available", `Run node '${nodeId}' is '${selectedNode.status}'.`, "nodeId")
    );
  }

  const nextStatus = combatNodeTypes.has(selectedNode.type) ? "combat" : "map_select";
  const nodes = run.map.nodes.map((node) => {
    if (node.id === selectedNode.id) {
      return { ...node, status: "active" as const };
    }

    if (node.layer === selectedNode.layer && node.status === "available") {
      return { ...node, status: "locked" as const };
    }

    return node;
  });
  const state: RunState = {
    ...run,
    status: nextStatus,
    map: { ...run.map, currentNodeId: nodeId, nodes }
  };

  return { ok: true, state, events: [{ type: "RunNodeSelected", nodeId }], errors: [] };
};

export const startCombatForRunNode = (
  input: StartCombatForRunNodeInput
): GameActionResult<CombatState> => {
  const { run, registry, petInstances } = input;

  if (run.status !== "combat") {
    return rejectCombat(
      input,
      error("invalid_run_status", `Cannot start combat while run status is '${run.status}'.`, "run.status")
    );
  }

  const activeNodes = findActiveNodes(run).filter((node) => combatNodeTypes.has(node.type));
  if (activeNodes.length !== 1) {
    return rejectCombat(
      input,
      error("invalid_active_combat_node", "Run must have exactly one active combat, elite, or boss node.", "run.map.nodes")
    );
  }

  const node = activeNodes[0];
  const encounter = findEncounter(registry, node.encounterId);
  if (!encounter) {
    return rejectCombat(
      input,
      error("missing_encounter", `Encounter '${String(node.encounterId)}' is not registered.`, "run.map.nodes")
    );
  }

  if (encounter.monsterIds.length === 0) {
    return rejectCombat(
      input,
      error("missing_encounter_monster_ids", `Encounter '${encounter.id}' has no monster ids.`, "registry.encounters")
    );
  }

  const combatSeed = input.seed ?? `${String(run.seed)}:${node.id}:${encounter.id}`;
  const combatResult = createCombat({
    run,
    registry,
    petInstances,
    monsterIds: encounter.monsterIds,
    seed: combatSeed
  });
  if (!combatResult.ok) {
    return combatResult;
  }

  const runEvent: GameEvent = {
    type: "RunCombatStarted",
    nodeId: node.id,
    encounterId: encounter.id,
    combatId: combatResult.state.id
  };

  return {
    ok: true,
    state: combatResult.state,
    events: [runEvent, ...combatResult.events],
    errors: []
  };
};

export const completeRunCombatNode = (
  input: CompleteRunCombatNodeInput
): GameActionResult<RunState> => {
  const { run, combat, registry, petInstances } = input;

  if (run.status !== "combat") {
    return rejectRun(
      run,
      error("invalid_run_status", `Cannot complete combat while run status is '${run.status}'.`, "run.status")
    );
  }

  const node = activeCombatNode(run);
  if (!node) {
    return rejectRun(run, error("invalid_active_combat_node", "Run has no active combat, elite, or boss node.", "run.map.nodes"));
  }

  if (combat.phase !== "won" && combat.phase !== "lost") {
    return rejectRun(
      run,
      error("combat_not_ended", `Cannot complete run combat while combat phase is '${combat.phase}'.`, "combat.phase")
    );
  }

  if (combat.id !== run.id) {
    return rejectRun(
      run,
      error("combat_run_mismatch", `Combat '${combat.id}' does not belong to run '${run.id}'.`, "combat.id")
    );
  }

  const combatCompletedEvent: GameEvent = {
    type: "RunCombatCompleted",
    nodeId: node.id,
    outcome: combat.phase
  };

  if (combat.phase === "lost") {
    return {
      ok: true,
      state: { ...run, status: "lost", pendingRewardOffer: undefined },
      events: [combatCompletedEvent, { type: "RunEnded", outcome: "lost" }],
      errors: []
    };
  }

  const encounter = findEncounter(registry, node.encounterId);
  if (!encounter) {
    return rejectRun(
      run,
      error("missing_encounter", `Encounter '${String(node.encounterId)}' is not registered.`, "run.map.nodes")
    );
  }

  if (encounter.monsterIds.length === 0) {
    return rejectRun(
      run,
      error("missing_encounter_monster_ids", `Encounter '${encounter.id}' has no monster ids.`, "registry.encounters")
    );
  }

  if (node.type === "boss") {
    const advanced = advanceFromActiveNode(run, node);
    return {
      ok: true,
      state: { ...advanced.run, status: "completed", pendingRewardOffer: undefined },
      events: [combatCompletedEvent, ...advanced.events],
      errors: []
    };
  }

  const rewardSeed = input.rewardSeed ?? `${String(run.seed)}:${node.id}:${encounter?.rewardSeedSalt ?? "reward"}`;
  const rewardResult = generateCombatRewardOffer({
    combat,
    run,
    registry,
    petInstances,
    seed: rewardSeed
  });
  if (!rewardResult.ok) {
    return rejectRun(run, rewardResult.errors[0]);
  }

  const state: RunState = {
    ...run,
    status: "reward",
    pendingRewardOffer: rewardResult.state
  };

  return {
    ok: true,
    state,
    events: [
      combatCompletedEvent,
      ...rewardResult.events,
      { type: "RunRewardPending", nodeId: node.id, rewardOfferId: rewardResult.state.id }
    ],
    errors: []
  };
};

export const claimRunPendingReward = (
  input: ClaimRunPendingRewardInput
): GameActionResult<RunRewardClaimState> => {
  const { run, selectedOptionId, registry, petInstances } = input;
  const originalState = originalRewardState(run, petInstances);

  if (run.status !== "reward") {
    return rejectReward(
      originalState,
      error("invalid_run_status", `Cannot claim a run reward while run status is '${run.status}'.`, "run.status")
    );
  }

  if (!run.pendingRewardOffer || run.pendingRewardOffer.status !== "open") {
    return rejectReward(originalState, error("missing_pending_reward", "Run has no open pending reward.", "run.pendingRewardOffer"));
  }

  const node = activeCombatNode(run);
  if (!node) {
    return rejectReward(originalState, error("invalid_active_combat_node", "Run has no active reward node.", "run.map.nodes"));
  }

  const claimResult = claimReward({
    rewardOffer: run.pendingRewardOffer,
    selectedOptionId,
    run,
    petInstances,
    registry
  });
  if (!claimResult.ok) {
    return {
      ok: false,
      state: originalState,
      events: claimResult.events,
      errors: claimResult.errors
    };
  }

  const advanced = advanceFromActiveNode(
    { ...claimResult.state.run, pendingRewardOffer: undefined },
    node
  );
  return {
    ok: true,
    state: { run: advanced.run, petInstances: claimResult.state.petInstances },
    events: [...claimResult.events, ...advanced.events],
    errors: []
  };
};

export const skipRunPendingReward = (
  input: SkipRunPendingRewardInput
): GameActionResult<RunRewardClaimState> => {
  const { run, petInstances } = input;
  const originalState = originalRewardState(run, petInstances);

  if (run.status !== "reward") {
    return rejectReward(
      originalState,
      error("invalid_run_status", `Cannot skip a run reward while run status is '${run.status}'.`, "run.status")
    );
  }

  if (!run.pendingRewardOffer || run.pendingRewardOffer.status !== "open") {
    return rejectReward(originalState, error("missing_pending_reward", "Run has no open pending reward.", "run.pendingRewardOffer"));
  }

  const node = activeCombatNode(run);
  if (!node) {
    return rejectReward(originalState, error("invalid_active_combat_node", "Run has no active reward node.", "run.map.nodes"));
  }

  const skipResult = skipReward({
    rewardOffer: run.pendingRewardOffer,
    run,
    petInstances
  });
  if (!skipResult.ok) {
    return {
      ok: false,
      state: originalState,
      events: skipResult.events,
      errors: skipResult.errors
    };
  }

  const advanced = advanceFromActiveNode(
    { ...skipResult.state.run, pendingRewardOffer: undefined },
    node
  );
  return {
    ok: true,
    state: { run: advanced.run, petInstances: skipResult.state.petInstances },
    events: [...skipResult.events, ...advanced.events],
    errors: []
  };
};

export const completeRunNonCombatNode = (
  run: RunState
): GameActionResult<RunState> => {
  if (run.status !== "map_select") {
    return rejectRun(
      run,
      error("invalid_run_status", `Cannot complete a non-combat node while run status is '${run.status}'.`, "run.status")
    );
  }

  const node = findActiveNode(run);

  if (!node || (node.type !== "event" && node.type !== "rest")) {
    return rejectRun(run, error("invalid_active_non_combat_node", "Run has no active event or rest node.", "run.map.nodes"));
  }

  const advanced = advanceFromActiveNode(run, node);
  return { ok: true, state: advanced.run, events: advanced.events, errors: [] };
};
