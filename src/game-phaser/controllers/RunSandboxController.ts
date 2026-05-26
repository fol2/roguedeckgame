import {
  claimRunPendingReward,
  completeRunCombatNode,
  completeRunNonCombatNode,
  createCombatRng,
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
  skipRunPendingReward,
  type CardDefinition,
  type CardInstanceId,
  type CombatantId,
  type CombatState,
  type GameActionError,
  type GameActionResult,
  type GameEvent,
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
    id: petInstanceId("sandbox:ember_fox"),
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
  let actionRng = createCombatRng(`${String(seed)}:actions`);
  let state = createInitialState(seed).state;
  let revision = 0;
  let seenGameplayRequestIds = new Set<string>();

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
        }, starterRegistry, revision)
      : undefined,
    getRewardViewModel: () => state.run.pendingRewardOffer
      ? buildRewardViewModel(state.run.pendingRewardOffer, state.lastEvents, starterRegistry, state.petInstances)
      : undefined,
    selectMapNode: (nodeId) => {
      const selectedRun = selectRunNode(state.run, nodeId);

      if (!selectedRun.ok) {
        return toResult(false, replaceState(state, { run: selectedRun.state }, selectedRun.events), selectedRun.events, selectedRun.errors);
      }

      if (selectedRun.state.status !== "combat") {
        return toResult(true, replaceState(state, { run: selectedRun.state, combat: undefined }, selectedRun.events), selectedRun.events, []);
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

      return toResult(combatResult.ok, next, events, combatResult.errors);
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

      return result;
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

      const endResult = endPlayerTurn(state.combat);
      if (!endResult.ok) {
        return toResult(false, replaceState(state, {}, endResult.events), endResult.events, endResult.errors);
      }

      if (endResult.state.phase === "won" || endResult.state.phase === "lost") {
        const result = toResult(true, replaceState(state, { combat: endResult.state }, endResult.events), endResult.events, []);

        return result;
      }

      const enemyResult = resolveEnemyTurn(endResult.state, starterRegistry, actionRng);
      const events = [...endResult.events, ...enemyResult.events];
      const nextCombat = enemyResult.ok ? enemyResult.state : endResult.state;

      const result = toResult(enemyResult.ok, replaceState(state, { combat: nextCombat }, events), events, enemyResult.errors);

      return result;
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

      return toResult(completeResult.ok, next, completeResult.events, completeResult.errors);
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

      return toResult(claimResult.ok, next, claimResult.events, claimResult.errors);
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

      return toResult(skipResult.ok, next, skipResult.events, skipResult.errors);
    },
    completeNonCombatNode: () => {
      const completion = completeRunNonCombatNode(state.run);
      if (!completion.ok) {
        return toResult(false, replaceState(state, {}, completion.events), completion.events, completion.errors);
      }

      const next = replaceState(state, { run: completion.state, combat: undefined }, completion.events);

      return toResult(completion.ok, next, completion.events, completion.errors);
    },
    reset: () => {
      const resetResult = createInitialState(seed);

      actionRng = createCombatRng(`${String(seed)}:actions`);
      state = resetResult.state;
      revision = 0;
      seenGameplayRequestIds = new Set();

      return resetResult;
    }
  };
};
