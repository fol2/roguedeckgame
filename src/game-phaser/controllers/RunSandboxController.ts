import {
  claimRunPendingReward,
  completeRunCombatNode,
  completeRunNonCombatNode,
  createCombatRng,
  createContentContext,
  createRun,
  createRuntimeMetadata,
  endPlayerTurn,
  petDefinitionId,
  petInstanceId,
  playCard,
  playerClassId,
  resolveEnemyTurn,
  selectRunNode,
  startCombatForRunNode,
  starterRegistry,
  skipRunPendingReward,
  type CardDefinition,
  type CardInstanceId,
  type CombatantId,
  type CombatState,
  type GameActionError,
  type GameActionResult,
  type GameEvent,
  type GameContentRegistry,
  type PetInstance,
  type PetInstanceId,
  type RewardOptionId,
  type RunNodeId,
  type RunState
} from "../../game-core";
import {
  createAgentStateHash,
  createTraceStep,
  type AgentAction,
  type AgentTrace
} from "../../game-core/debug";
import { applyNodeCompletedPetSideStories } from "../../game-core/systems/story";
import type { RuntimeMetadata } from "../../game-core/model/runtime-metadata";
import {
  buildCombatViewModel,
  type CombatViewModel
} from "../view-models/combat-view-model";
import {
  buildRewardViewModel,
  type RewardViewModel
} from "../view-models/reward-view-model";
import {
  buildRunViewModel,
  type RunViewModel
} from "../view-models/run-view-model";
import {
  buildCombatDebugViewModel,
  type CombatDebugViewModel,
  type DebugInputSnapshot
} from "../view-models/debug-view-model";
import type { CombatPlaybackObservation } from "../animation/combat-playback-policy";
import type { CombatParityDiagnostic } from "../debug/combat-parity";
import { createRunSandboxRequestGuard } from "./run-sandbox-request-guard";

export type RunSandboxState = {
  readonly run: RunState;
  readonly petInstances: readonly PetInstance[];
  readonly combat?: CombatState;
  readonly lastEvents: readonly GameEvent[];
};

export type RunSandboxControllerConfig = {
  readonly seed?: string | number;
  readonly registry?: GameContentRegistry;
  readonly petInstances?: readonly PetInstance[];
  readonly activePetInstanceIds?: readonly PetInstanceId[];
};

export type RunSandboxController = {
  readonly getState: () => RunSandboxState;
  readonly getRunViewModel: () => RunViewModel;
  readonly getCombatViewModel: () => CombatViewModel | undefined;
  readonly getAgentTrace: () => AgentTrace;
  readonly getRuntimeMetadata: () => RuntimeMetadata;
  readonly getCombatDebugViewModel: (
    input?: DebugInputSnapshot,
    playbackObservations?: readonly CombatPlaybackObservation[],
    parityDiagnostics?: readonly CombatParityDiagnostic[]
  ) => CombatDebugViewModel;
  readonly getRewardViewModel: () => RewardViewModel | undefined;
  readonly getRevision: () => number;
  readonly selectMapNode: (
    nodeId: RunNodeId,
    expectedRevision: number,
    requestId: string
  ) => GameActionResult<RunSandboxState>;
  readonly playHandCard: (
    cardInstanceId: CardInstanceId,
    targetId: CombatantId | undefined,
    expectedRevision: number | undefined,
    requestId: string
  ) => GameActionResult<RunSandboxState>;
  readonly endTurn: (expectedRevision: number | undefined, requestId: string) => GameActionResult<RunSandboxState>;
  readonly completeCombatIfEnded: (expectedRevision: number | undefined, requestId: string) => GameActionResult<RunSandboxState>;
  readonly claimRewardOption: (
    rewardOptionId: RewardOptionId,
    expectedRevision: number,
    requestId: string
  ) => GameActionResult<RunSandboxState>;
  readonly skipReward: (expectedRevision: number, requestId: string) => GameActionResult<RunSandboxState>;
  readonly completeNonCombatNode: (expectedRevision: number, requestId: string) => GameActionResult<RunSandboxState>;
  readonly reset: () => GameActionResult<RunSandboxState>;
};

const DEFAULT_SANDBOX_SEED = "phaser-run-sandbox";

const createSandboxPetInstances = (): readonly PetInstance[] => [
  {
    id: petInstanceId("ember_fox_001"),
    definitionId: petDefinitionId("ember_fox"),
    nickname: "Ember",
    bondLevel: 1,
    bondXp: 0,
    unlockedUpgradeIds: [],
    chosenEvolutionNodeIds: [],
    unlockedEvolutionNodeIds: [],
    unlockedMemoryIds: [],
    storyFlags: [],
    seenStoryEventIds: []
  }
];

const createError = (code: string, message: string, path?: string): GameActionError => ({
  code,
  message,
  path
});

const rejectedEvent = (error: GameActionError): GameEvent => ({
  type: "ActionRejected",
  code: error.code,
  message: error.message,
  path: error.path
});

const replaceState = (
  current: RunSandboxState,
  next: Partial<Omit<RunSandboxState, "lastEvents">>,
  events: readonly GameEvent[]
): RunSandboxState => ({
  ...current,
  ...next,
  lastEvents: events
});

const findCardDefinition = (
  state: RunSandboxState,
  cardInstanceId: CardInstanceId,
  registry: GameContentRegistry
): CardDefinition | undefined => {
  const cardInstance = state.combat?.cardInstances.find((candidate) => candidate.id === cardInstanceId);

  return cardInstance
    ? registry.cards.find((candidate) => candidate.id === cardInstance.cardId)
    : undefined;
};

const cardNeedsDefaultTarget = (card: CardDefinition): boolean =>
  card.effects.some((effect) =>
    "target" in effect &&
    effect.target.type === "target" &&
    effect.target.combatantId === undefined
  );

const firstAliveMonsterId = (combat: CombatState): CombatantId | undefined =>
  combat.monsters.find((monster) => monster.alive)?.id;

const normaliseControllerConfig = (
  seedOrConfig: string | number | RunSandboxControllerConfig
): Required<Pick<RunSandboxControllerConfig, "seed" | "registry" | "petInstances" | "activePetInstanceIds">> => {
  if (typeof seedOrConfig === "string" || typeof seedOrConfig === "number") {
    const petInstances = createSandboxPetInstances();

    return {
      seed: seedOrConfig,
      registry: starterRegistry,
      petInstances,
      activePetInstanceIds: petInstances.map((pet) => pet.id)
    };
  }

  const petInstances = seedOrConfig.petInstances ?? createSandboxPetInstances();

  return {
    seed: seedOrConfig.seed ?? DEFAULT_SANDBOX_SEED,
    registry: seedOrConfig.registry ?? starterRegistry,
    petInstances,
    activePetInstanceIds: seedOrConfig.activePetInstanceIds ?? petInstances.map((pet) => pet.id)
  };
};

const createInitialState = (
  config: Required<Pick<RunSandboxControllerConfig, "seed" | "registry" | "petInstances" | "activePetInstanceIds">>
): GameActionResult<RunSandboxState> => {
  const runResult = createRun({
    seed: config.seed,
    playerClassId: playerClassId("novice_tamer"),
    activePetInstanceIds: config.activePetInstanceIds,
    petInstances: config.petInstances,
    registry: config.registry
  });
  const state: RunSandboxState = {
    run: runResult.state,
    petInstances: config.petInstances,
    lastEvents: runResult.events
  };

  return {
    ok: runResult.ok,
    state,
    events: runResult.events,
    errors: runResult.errors
  };
};

export const createRunSandboxController = (
  seedOrConfig: string | number | RunSandboxControllerConfig = DEFAULT_SANDBOX_SEED
): RunSandboxController => {
  const config = normaliseControllerConfig(seedOrConfig);
  const { seed, registry } = config;
  const runtimeMetadata = createRuntimeMetadata(registry);
  let actionRng = createCombatRng(`${String(seed)}:agent-driver`);
  let state = createInitialState(config).state;
  let revision = 0;
  const seenGameplayRequestIds = new Set<string>();
  let traceSteps: AgentTrace["steps"] = [];
  const content = createContentContext(registry);

  const clearPreviousCombatSceneRequestIds = (): void => {
    for (const requestId of seenGameplayRequestIds) {
      if (requestId.startsWith("combat-ui-") || requestId.startsWith("combat-complete-")) {
        seenGameplayRequestIds.delete(requestId);
      }
    }
  };

  const commit = (next: RunSandboxState): RunSandboxState => {
    state = next;
    revision += 1;

    return state;
  };

  const toResult = (
    ok: boolean,
    next: RunSandboxState,
    events: readonly GameEvent[],
    errors: readonly GameActionError[]
  ): GameActionResult<RunSandboxState> => ({
    ok,
    state: commit(next),
    events,
    errors
  });

  const reject = (error: GameActionError): GameActionResult<RunSandboxState> => {
    const events = [rejectedEvent(error)];

    return toResult(false, replaceState(state, {}, events), events, [error]);
  };

  const recordAgentAction = (
    action: AgentAction,
    result: GameActionResult<RunSandboxState>
  ): GameActionResult<RunSandboxState> => {
    traceSteps = [
      ...traceSteps,
      createTraceStep(
        traceSteps.length,
        action,
        "legal",
        result.ok,
        result.events,
        result.errors,
        createAgentStateHash(result.state, { schemaVersion: runtimeMetadata.traceSchemaVersion })
      )
    ];

    return result;
  };

  const requestGuard = createRunSandboxRequestGuard<RunSandboxState>(
    () => revision,
    seenGameplayRequestIds,
    reject
  );

  return {
    getState: () => state,
    getRunViewModel: () => buildRunViewModel(state.run, state.lastEvents, registry),
    getCombatViewModel: () => state.combat
      ? buildCombatViewModel({
          run: state.run,
          petInstances: state.petInstances,
          combat: state.combat,
          lastEvents: state.lastEvents
        }, content, revision)
      : undefined,
    getAgentTrace: () => ({
      schemaVersion: runtimeMetadata.traceSchemaVersion,
      seed,
      mode: "regression",
      finalStatus: state.run.status,
      steps: traceSteps
    }),
    getRuntimeMetadata: () => runtimeMetadata,
    getCombatDebugViewModel: (input, playbackObservations, parityDiagnostics) => buildCombatDebugViewModel(state, state.combat
      ? buildCombatViewModel({
          run: state.run,
          petInstances: state.petInstances,
          combat: state.combat,
          lastEvents: state.lastEvents
        }, content, revision)
      : undefined, input, undefined, playbackObservations, parityDiagnostics),
    getRewardViewModel: () => state.run.pendingRewardOffer
      ? buildRewardViewModel(state.run.pendingRewardOffer, state.lastEvents, content, state.petInstances)
      : undefined,
    getRevision: () => revision,
    selectMapNode: (nodeId, expectedRevision, requestId) => {
      const invalidRequest = requestGuard.rejectIfInvalidRequest(requestId, "requestId");
      if (invalidRequest) {
        return invalidRequest;
      }

      const staleRevision = requestGuard.rejectIfInvalidRunRevision(expectedRevision, "run.revision");
      if (staleRevision) {
        return staleRevision;
      }

      const selectedRun = selectRunNode(state.run, nodeId);

      if (!selectedRun.ok) {
        return toResult(false, replaceState(state, { run: selectedRun.state }, selectedRun.events), selectedRun.events, selectedRun.errors);
      }

      if (selectedRun.state.status !== "combat") {
        const result = toResult(true, replaceState(state, { run: selectedRun.state, combat: undefined }, selectedRun.events), selectedRun.events, []);

        return recordAgentAction({ type: "selectMapNode", nodeId }, result);
      }

      const combatResult = startCombatForRunNode({
        run: selectedRun.state,
        registry,
        petInstances: state.petInstances,
        seed: `${String(seed)}:${nodeId}:combat`
      });
      if (combatResult.ok) {
        clearPreviousCombatSceneRequestIds();
      }
      const events = [...selectedRun.events, ...combatResult.events];
      const next = replaceState(
        state,
        { run: selectedRun.state, combat: combatResult.state },
        events
      );

      const result = toResult(combatResult.ok, next, events, combatResult.errors);

      return recordAgentAction({ type: "selectMapNode", nodeId }, result);
    },
    playHandCard: (cardInstanceId, explicitTargetId, expectedRevision, requestId) => {
      if (!state.combat) {
        return reject(createError("missing_combat", "There is no active combat.", "combat"));
      }

      const invalidRequest = requestGuard.rejectIfInvalidRequest(requestId, "requestId");
      if (invalidRequest) {
        return invalidRequest;
      }

      const staleRevision = requestGuard.rejectIfStaleCombatRevision(expectedRevision, "combat.revision");
      if (staleRevision) {
        return staleRevision;
      }

      const card = findCardDefinition(state, cardInstanceId, registry);
      if (!card) {
        return reject(createError(
          "missing_card_definition",
          `Card instance '${cardInstanceId}' has no card definition.`,
          "cardInstanceId"
        ));
      }

      const targetId = explicitTargetId ?? (cardNeedsDefaultTarget(card) ? firstAliveMonsterId(state.combat) : undefined);
      const cardResult = playCard(
        state.combat,
        { type: "playCard", cardInstanceId, targetId },
        registry,
        actionRng
      );
      const nextCombat = cardResult.ok ? cardResult.state : state.combat;
      const next = replaceState(state, { combat: nextCombat }, cardResult.events);

      const result = toResult(cardResult.ok, next, cardResult.events, cardResult.errors);

      return recordAgentAction({ type: "playCard", cardInstanceId, targetId }, result);
    },
    endTurn: (expectedRevision, requestId) => {
      if (!state.combat) {
        return reject(createError("missing_combat", "There is no active combat.", "combat"));
      }

      const invalidRequest = requestGuard.rejectIfInvalidRequest(requestId, "requestId");
      if (invalidRequest) {
        return invalidRequest;
      }

      const staleRevision = requestGuard.rejectIfStaleCombatRevision(expectedRevision, "combat.revision");
      if (staleRevision) {
        return staleRevision;
      }

      const endResult = endPlayerTurn(state.combat, { registry, rng: actionRng });
      if (!endResult.ok) {
        const result = toResult(false, replaceState(state, {}, endResult.events), endResult.events, endResult.errors);

        return recordAgentAction({ type: "endTurn" }, result);
      }

      if (endResult.state.phase === "won" || endResult.state.phase === "lost") {
        const result = toResult(true, replaceState(state, { combat: endResult.state }, endResult.events), endResult.events, []);

        return recordAgentAction({ type: "endTurn" }, result);
      }

      const enemyResult = resolveEnemyTurn(endResult.state, registry, actionRng);
      const events = [...endResult.events, ...enemyResult.events];
      const nextCombat = enemyResult.ok ? enemyResult.state : endResult.state;

      const result = toResult(enemyResult.ok, replaceState(state, { combat: nextCombat }, events), events, enemyResult.errors);

      return recordAgentAction({ type: "endTurn" }, result);
    },
    completeCombatIfEnded: (expectedRevision, requestId) => {
      const invalidRequest = requestGuard.rejectIfInvalidRequest(requestId, "requestId");
      if (invalidRequest) {
        return invalidRequest;
      }

      const staleRevision = requestGuard.rejectIfStaleRunRevision(expectedRevision, "run.revision");
      if (staleRevision) {
        return staleRevision;
      }

      if (!state.combat) {
        return reject(createError("missing_combat", "There is no active combat to complete.", "combat"));
      }

      if (state.combat.phase !== "won" && state.combat.phase !== "lost") {
        return reject(createError("combat_not_ended", `Combat is '${state.combat.phase}'.`, "combat.phase"));
      }

      const completedNodeType = state.run.map?.nodes.find((node) => node.status === "active")?.type;
      const completeResult = completeRunCombatNode({
        run: state.run,
        combat: state.combat,
        registry,
        petInstances: state.petInstances,
        rewardSeed: `${String(seed)}:${state.run.map?.currentNodeId ?? "node"}:reward`
      });
      const next = completeResult.ok
        ? replaceState(state, { run: completeResult.state, combat: undefined }, completeResult.events)
        : replaceState(state, { run: completeResult.state }, completeResult.events);

      if (!completeResult.ok || completeResult.state.status === "reward") {
        const result = toResult(completeResult.ok, next, completeResult.events, completeResult.errors);

        return recordAgentAction({ type: "completeCombatIfEnded" }, result);
      }

      const storyResult = applyNodeCompletedPetSideStories({
        run: completeResult.state,
        petInstances: state.petInstances,
        registry,
        completedNodeType,
        priorEvents: completeResult.events
      });
      const result = storyResult.ok
        ? toResult(true, replaceState(state, {
            run: storyResult.state.run ?? completeResult.state,
            petInstances: storyResult.state.petInstances,
            combat: undefined
          }, storyResult.events), storyResult.events, [])
        : toResult(false, replaceState(state, {}, storyResult.events), storyResult.events, storyResult.errors);

      return recordAgentAction({ type: "completeCombatIfEnded" }, result);
    },
    claimRewardOption: (rewardOptionId, expectedRevision, requestId) => {
      const invalidRequest = requestGuard.rejectIfInvalidRequest(requestId, "requestId");
      if (invalidRequest) {
        return invalidRequest;
      }

      const staleRevision = requestGuard.rejectIfInvalidRunRevision(expectedRevision, "run.revision");
      if (staleRevision) {
        return staleRevision;
      }

      const claimResult = claimRunPendingReward({
        run: state.run,
        selectedOptionId: rewardOptionId,
        registry,
        petInstances: state.petInstances
      });
      if (!claimResult.ok) {
        return toResult(false, replaceState(state, {}, claimResult.events), claimResult.events, claimResult.errors);
      }

      const completedNodeType = state.run.map?.nodes.find((node) => node.status === "active")?.type;
      const storyResult = applyNodeCompletedPetSideStories({
        run: claimResult.state.run,
        petInstances: claimResult.state.petInstances,
        registry,
        completedNodeType,
        priorEvents: claimResult.events
      });
      if (!storyResult.ok) {
        const result = toResult(false, replaceState(state, {}, storyResult.events), storyResult.events, storyResult.errors);

        return recordAgentAction({ type: "claimReward", rewardOptionId }, result);
      }

      const next = replaceState(
        state,
        {
          run: storyResult.state.run ?? claimResult.state.run,
          petInstances: storyResult.state.petInstances,
          combat: undefined
        },
        storyResult.events
      );

      const result = toResult(claimResult.ok, next, storyResult.events, claimResult.errors);

      return recordAgentAction({ type: "claimReward", rewardOptionId }, result);
    },
    skipReward: (expectedRevision, requestId) => {
      const invalidRequest = requestGuard.rejectIfInvalidRequest(requestId, "requestId");
      if (invalidRequest) {
        return invalidRequest;
      }

      const staleRevision = requestGuard.rejectIfInvalidRunRevision(expectedRevision, "run.revision");
      if (staleRevision) {
        return staleRevision;
      }

      const skipResult = skipRunPendingReward({
        run: state.run,
        petInstances: state.petInstances
      });
      if (!skipResult.ok) {
        return toResult(false, replaceState(state, {}, skipResult.events), skipResult.events, skipResult.errors);
      }

      const completedNodeType = state.run.map?.nodes.find((node) => node.status === "active")?.type;
      const storyResult = applyNodeCompletedPetSideStories({
        run: skipResult.state.run,
        petInstances: skipResult.state.petInstances,
        registry,
        completedNodeType,
        priorEvents: skipResult.events
      });
      if (!storyResult.ok) {
        const result = toResult(false, replaceState(state, {}, storyResult.events), storyResult.events, storyResult.errors);

        return recordAgentAction({ type: "skipReward" }, result);
      }

      const next = replaceState(
        state,
        {
          run: storyResult.state.run ?? skipResult.state.run,
          petInstances: storyResult.state.petInstances,
          combat: undefined
        },
        storyResult.events
      );

      const result = toResult(skipResult.ok, next, storyResult.events, skipResult.errors);

      return recordAgentAction({ type: "skipReward" }, result);
    },
    completeNonCombatNode: (expectedRevision, requestId) => {
      const invalidRequest = requestGuard.rejectIfInvalidRequest(requestId, "requestId");
      if (invalidRequest) {
        return invalidRequest;
      }

      const staleRevision = requestGuard.rejectIfInvalidRunRevision(expectedRevision, "run.revision");
      if (staleRevision) {
        return staleRevision;
      }

      const completion = completeRunNonCombatNode(state.run);
      if (!completion.ok) {
        return toResult(false, replaceState(state, {}, completion.events), completion.events, completion.errors);
      }

      const completedNodeType = state.run.map?.nodes.find((node) => node.status === "active")?.type;
      const storyResult = applyNodeCompletedPetSideStories({
        run: completion.state,
        petInstances: state.petInstances,
        registry,
        completedNodeType,
        priorEvents: completion.events
      });
      if (!storyResult.ok) {
        const result = toResult(false, replaceState(state, {}, storyResult.events), storyResult.events, storyResult.errors);

        return recordAgentAction({ type: "completeNonCombatNode" }, result);
      }

      const next = replaceState(state, {
        run: storyResult.state.run ?? completion.state,
        petInstances: storyResult.state.petInstances,
        combat: undefined
      }, storyResult.events);

      const result = toResult(completion.ok, next, storyResult.events, completion.errors);

      return recordAgentAction({ type: "completeNonCombatNode" }, result);
    },
    reset: () => {
      const resetResult = createInitialState(config);

      actionRng = createCombatRng(`${String(seed)}:agent-driver`);
      state = resetResult.state;
      revision = 0;
      seenGameplayRequestIds.clear();
      traceSteps = [];

      return resetResult;
    }
  };
};
