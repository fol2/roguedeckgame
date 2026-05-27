import {
  claimRunPendingReward,
  completeRunCombatNode,
  completeRunNonCombatNode,
  createCombatRng,
  createContentContext,
  createRun,
  endPlayerTurn,
  petDefinitionId,
  petInstanceId,
  playCard,
  playerClassId,
  resolveEnemyTurn,
  selectRunNode,
  startCombatForRunNode,
  starterRegistry,
  currentRuntimeMetadata,
  skipRunPendingReward,
  type CardDefinition,
  type CardInstanceId,
  type CombatantId,
  type CombatState,
  type GameActionError,
  type GameActionResult,
  type GameEvent,
  type AgentAction,
  type AgentTrace,
  createAgentStateHash,
  createTraceStep,
  type PetInstance,
  type RewardOptionId,
  type RunNodeId,
  type RunState
} from "../../game-core";
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

export type RunSandboxState = {
  readonly run: RunState;
  readonly petInstances: readonly PetInstance[];
  readonly combat?: CombatState;
  readonly lastEvents: readonly GameEvent[];
};

export type RunSandboxController = {
  readonly getState: () => RunSandboxState;
  readonly getRunViewModel: () => RunViewModel;
  readonly getCombatViewModel: () => CombatViewModel | undefined;
  readonly getAgentTrace: () => AgentTrace;
  readonly getCombatDebugViewModel: (
    input?: DebugInputSnapshot,
    playbackObservations?: readonly CombatPlaybackObservation[],
    parityDiagnostics?: readonly CombatParityDiagnostic[]
  ) => CombatDebugViewModel;
  readonly getRewardViewModel: () => RewardViewModel | undefined;
  readonly selectMapNode: (nodeId: RunNodeId) => GameActionResult<RunSandboxState>;
  readonly playHandCard: (
    cardInstanceId: CardInstanceId,
    targetId: CombatantId | undefined,
    expectedRevision: number | undefined,
    requestId: string
  ) => GameActionResult<RunSandboxState>;
  readonly endTurn: (expectedRevision: number | undefined, requestId: string) => GameActionResult<RunSandboxState>;
  readonly completeCombatIfEnded: () => GameActionResult<RunSandboxState>;
  readonly claimRewardOption: (rewardOptionId: RewardOptionId) => GameActionResult<RunSandboxState>;
  readonly skipReward: () => GameActionResult<RunSandboxState>;
  readonly completeNonCombatNode: () => GameActionResult<RunSandboxState>;
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
    unlockedMemoryIds: [],
    storyFlags: []
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
  cardInstanceId: CardInstanceId
): CardDefinition | undefined => {
  const cardInstance = state.combat?.cardInstances.find((candidate) => candidate.id === cardInstanceId);

  return cardInstance
    ? starterRegistry.cards.find((candidate) => candidate.id === cardInstance.cardId)
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

const createInitialState = (seed: string | number): GameActionResult<RunSandboxState> => {
  const petInstances = createSandboxPetInstances();
  const activePetInstanceIds = petInstances.map((pet) => pet.id);
  const runResult = createRun({
    seed,
    playerClassId: playerClassId("novice_tamer"),
    activePetInstanceIds,
    petInstances,
    registry: starterRegistry
  });
  const state: RunSandboxState = {
    run: runResult.state,
    petInstances,
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
  seed: string | number = DEFAULT_SANDBOX_SEED
): RunSandboxController => {
  let actionRng = createCombatRng(`${String(seed)}:agent-driver`);
  let state = createInitialState(seed).state;
  let revision = 0;
  let seenGameplayRequestIds = new Set<string>();
  let traceSteps: AgentTrace["steps"] = [];
  const content = createContentContext(starterRegistry);

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
        createAgentStateHash(result.state, { schemaVersion: currentRuntimeMetadata.traceSchemaVersion })
      )
    ];

    return result;
  };

  const rejectIfStaleRevision = (
    expectedRevision: number | undefined,
    path: string
  ): GameActionResult<RunSandboxState> | undefined => {
    if (expectedRevision === undefined || expectedRevision === revision) {
      return undefined;
    }

    return reject(createError(
      "stale_combat_revision",
      `Combat view revision ${expectedRevision} is stale; latest revision is ${revision}.`,
      path
    ));
  };

  const rejectIfInvalidRequest = (
    requestId: string,
    path: string
  ): GameActionResult<RunSandboxState> | undefined => {
    if (!requestId) {
      return reject(createError(
        "missing_request_id",
        "Gameplay requests must include a request id.",
        path
      ));
    }

    if (seenGameplayRequestIds.has(requestId)) {
      return reject(createError(
        "duplicate_request",
        `Gameplay request '${requestId}' was already submitted.`,
        path
      ));
    }

    seenGameplayRequestIds.add(requestId);

    return undefined;
  };

  return {
    getState: () => state,
    getRunViewModel: () => buildRunViewModel(state.run, state.lastEvents, starterRegistry),
    getCombatViewModel: () => state.combat
      ? buildCombatViewModel({
          run: state.run,
          petInstances: state.petInstances,
          combat: state.combat,
          lastEvents: state.lastEvents
        }, content, revision)
      : undefined,
    getAgentTrace: () => ({
      schemaVersion: currentRuntimeMetadata.traceSchemaVersion,
      seed,
      mode: "regression",
      finalStatus: state.run.status,
      steps: traceSteps
    }),
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
    selectMapNode: (nodeId) => {
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
        registry: starterRegistry,
        petInstances: state.petInstances,
        seed: `${String(seed)}:${nodeId}:combat`
      });
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

      const invalidRequest = rejectIfInvalidRequest(requestId, "requestId");
      if (invalidRequest) {
        return invalidRequest;
      }

      const staleRevision = rejectIfStaleRevision(expectedRevision, "combat.revision");
      if (staleRevision) {
        return staleRevision;
      }

      const card = findCardDefinition(state, cardInstanceId);
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
        starterRegistry,
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

      const invalidRequest = rejectIfInvalidRequest(requestId, "requestId");
      if (invalidRequest) {
        return invalidRequest;
      }

      const staleRevision = rejectIfStaleRevision(expectedRevision, "combat.revision");
      if (staleRevision) {
        return staleRevision;
      }

      const endResult = endPlayerTurn(state.combat, { registry: starterRegistry, rng: actionRng });
      if (!endResult.ok) {
        const result = toResult(false, replaceState(state, {}, endResult.events), endResult.events, endResult.errors);

        return recordAgentAction({ type: "endTurn" }, result);
      }

      if (endResult.state.phase === "won" || endResult.state.phase === "lost") {
        const result = toResult(true, replaceState(state, { combat: endResult.state }, endResult.events), endResult.events, []);

        return recordAgentAction({ type: "endTurn" }, result);
      }

      const enemyResult = resolveEnemyTurn(endResult.state, starterRegistry, actionRng);
      const events = [...endResult.events, ...enemyResult.events];
      const nextCombat = enemyResult.ok ? enemyResult.state : endResult.state;

      const result = toResult(enemyResult.ok, replaceState(state, { combat: nextCombat }, events), events, enemyResult.errors);

      return recordAgentAction({ type: "endTurn" }, result);
    },
    completeCombatIfEnded: () => {
      if (!state.combat) {
        return reject(createError("missing_combat", "There is no active combat to complete.", "combat"));
      }

      if (state.combat.phase !== "won" && state.combat.phase !== "lost") {
        return reject(createError("combat_not_ended", `Combat is '${state.combat.phase}'.`, "combat.phase"));
      }

      const completeResult = completeRunCombatNode({
        run: state.run,
        combat: state.combat,
        registry: starterRegistry,
        petInstances: state.petInstances,
        rewardSeed: `${String(seed)}:${state.run.map?.currentNodeId ?? "node"}:reward`
      });
      const next = completeResult.ok
        ? replaceState(state, { run: completeResult.state, combat: undefined }, completeResult.events)
        : replaceState(state, { run: completeResult.state }, completeResult.events);

      const result = toResult(completeResult.ok, next, completeResult.events, completeResult.errors);

      return recordAgentAction({ type: "completeCombatIfEnded" }, result);
    },
    claimRewardOption: (rewardOptionId) => {
      const claimResult = claimRunPendingReward({
        run: state.run,
        selectedOptionId: rewardOptionId,
        registry: starterRegistry,
        petInstances: state.petInstances
      });
      if (!claimResult.ok) {
        return toResult(false, replaceState(state, {}, claimResult.events), claimResult.events, claimResult.errors);
      }

      const next = replaceState(
        state,
        {
          run: claimResult.state.run,
          petInstances: claimResult.state.petInstances,
          combat: undefined
        },
        claimResult.events
      );

      const result = toResult(claimResult.ok, next, claimResult.events, claimResult.errors);

      return recordAgentAction({ type: "claimReward", rewardOptionId }, result);
    },
    skipReward: () => {
      const skipResult = skipRunPendingReward({
        run: state.run,
        petInstances: state.petInstances
      });
      if (!skipResult.ok) {
        return toResult(false, replaceState(state, {}, skipResult.events), skipResult.events, skipResult.errors);
      }

      const next = replaceState(
        state,
        {
          run: skipResult.state.run,
          petInstances: skipResult.state.petInstances,
          combat: undefined
        },
        skipResult.events
      );

      const result = toResult(skipResult.ok, next, skipResult.events, skipResult.errors);

      return recordAgentAction({ type: "skipReward" }, result);
    },
    completeNonCombatNode: () => {
      const completion = completeRunNonCombatNode(state.run);
      if (!completion.ok) {
        return toResult(false, replaceState(state, {}, completion.events), completion.events, completion.errors);
      }

      const next = replaceState(state, { run: completion.state, combat: undefined }, completion.events);

      const result = toResult(completion.ok, next, completion.events, completion.errors);

      return recordAgentAction({ type: "completeNonCombatNode" }, result);
    },
    reset: () => {
      const resetResult = createInitialState(seed);

      actionRng = createCombatRng(`${String(seed)}:agent-driver`);
      state = resetResult.state;
      revision = 0;
      seenGameplayRequestIds = new Set();
      traceSteps = [];

      return resetResult;
    }
  };
};
