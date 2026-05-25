import {
  createCombatRng,
  createRun,
  endPlayerTurn,
  petInstanceId,
  playCard,
  playerClassId,
  resolveEnemyTurn,
  selectRunNode,
  startCombatForRunNode,
  starterRegistry,
  type CardDefinition,
  type CardInstanceId,
  type CombatantId,
  type GameActionError,
  type GameActionResult,
  type GameEvent,
  type PetInstance,
  type RunNodeState
} from "../../game-core";
import {
  buildCombatViewModel,
  type CombatSandboxState,
  type CombatViewModel
} from "../view-models/combat-view-model";

export type { CombatSandboxState } from "../view-models/combat-view-model";

export type CombatSandboxController = {
  readonly getState: () => CombatSandboxState;
  readonly getViewModel: () => CombatViewModel;
  readonly playHandCard: (cardInstanceId: CardInstanceId) => GameActionResult<CombatSandboxState>;
  readonly endTurn: () => GameActionResult<CombatSandboxState>;
  readonly reset: () => GameActionResult<CombatSandboxState>;
};

const DEFAULT_SANDBOX_SEED = "phaser-combat-sandbox";

const createSandboxPetInstances = (): readonly PetInstance[] => [
  {
    id: petInstanceId("sandbox:ember_fox"),
    definitionId: starterRegistry.pets[0].id,
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

const fail = (
  current: CombatSandboxState,
  error: GameActionError
): GameActionResult<CombatSandboxState> => ({
  ok: false,
  state: replaceState(current, current.combat, [rejectedEvent(error)]),
  events: [rejectedEvent(error)],
  errors: [error]
});

const firstAvailableCombatNode = (
  nodes: readonly RunNodeState[] | undefined
): RunNodeState | undefined =>
  nodes?.find((node) => node.status === "available" && (
    node.type === "combat" ||
    node.type === "elite" ||
    node.type === "boss"
  ));

const findCardDefinition = (
  state: CombatSandboxState,
  cardInstanceId: CardInstanceId
): CardDefinition | undefined => {
  const cardInstance = state.combat.cardInstances.find((candidate) => candidate.id === cardInstanceId);

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

const firstAliveMonsterId = (state: CombatSandboxState): CombatantId | undefined =>
  state.combat.monsters.find((monster) => monster.alive)?.id;

const replaceState = (
  current: CombatSandboxState,
  combat: CombatSandboxState["combat"],
  events: readonly GameEvent[]
): CombatSandboxState => ({
  ...current,
  combat,
  lastEvents: events
});

const createInitialState = (seed: string | number): GameActionResult<CombatSandboxState> => {
  const petInstances = createSandboxPetInstances();
  const activePetInstanceIds = petInstances.map((pet) => pet.id);
  const createdRun = createRun({
    seed,
    playerClassId: playerClassId("novice_tamer"),
    activePetInstanceIds,
    petInstances,
    registry: starterRegistry
  });

  if (!createdRun.ok) {
    const state = {
      run: createdRun.state,
      petInstances,
      combat: startCombatForRunNode({
        run: createdRun.state,
        registry: starterRegistry,
        petInstances,
        seed
      }).state,
      lastEvents: createdRun.events
    };

    return { ok: false, state, events: createdRun.events, errors: createdRun.errors };
  }

  const node = firstAvailableCombatNode(createdRun.state.map?.nodes);
  if (!node) {
    const error = createError("missing_combat_node", "No available combat node was found.", "run.map.nodes");
    const placeholderCombat = startCombatForRunNode({
      run: createdRun.state,
      registry: starterRegistry,
      petInstances,
      seed
    }).state;
    const state = {
      run: createdRun.state,
      petInstances,
      combat: placeholderCombat,
      lastEvents: [rejectedEvent(error)]
    };

    return { ok: false, state, events: state.lastEvents, errors: [error] };
  }

  const selectedRun = selectRunNode(createdRun.state, node.id);
  if (!selectedRun.ok) {
    const placeholderCombat = startCombatForRunNode({
      run: selectedRun.state,
      registry: starterRegistry,
      petInstances,
      seed
    }).state;
    const state = {
      run: selectedRun.state,
      petInstances,
      combat: placeholderCombat,
      lastEvents: [...createdRun.events, ...selectedRun.events]
    };

    return { ok: false, state, events: state.lastEvents, errors: selectedRun.errors };
  }

  const combatResult = startCombatForRunNode({
    run: selectedRun.state,
    registry: starterRegistry,
    petInstances,
    seed: `${String(seed)}:combat`
  });
  const state = {
    run: selectedRun.state,
    petInstances,
    combat: combatResult.state,
    lastEvents: [...createdRun.events, ...selectedRun.events, ...combatResult.events]
  };

  return {
    ok: combatResult.ok,
    state,
    events: state.lastEvents,
    errors: combatResult.errors
  };
};

export const createCombatSandboxController = (
  seed: string | number = DEFAULT_SANDBOX_SEED
): CombatSandboxController => {
  const rng = createCombatRng(`${String(seed)}:actions`);
  let state = createInitialState(seed).state;

  return {
    getState: () => state,
    getViewModel: () => buildCombatViewModel(state, starterRegistry),
    playHandCard: (cardInstanceId) => {
      const card = findCardDefinition(state, cardInstanceId);

      if (!card) {
        const result = fail(
          state,
          createError("missing_card_definition", `Card instance '${cardInstanceId}' has no card definition.`, "cardInstanceId")
        );

        state = result.state;

        return result;
      }

      const targetId = cardNeedsDefaultTarget(card) ? firstAliveMonsterId(state) : undefined;
      const result = playCard(
        state.combat,
        { type: "playCard", cardInstanceId, targetId },
        starterRegistry,
        rng
      );

      if (!result.ok) {
        state = replaceState(state, state.combat, result.events);

        return { ok: false, state, events: result.events, errors: result.errors };
      }

      state = replaceState(state, result.state, result.events);

      return { ok: true, state, events: result.events, errors: [] };
    },
    endTurn: () => {
      const endResult = endPlayerTurn(state.combat);

      if (!endResult.ok) {
        state = replaceState(state, state.combat, endResult.events);

        return { ok: false, state, events: endResult.events, errors: endResult.errors };
      }

      if (endResult.state.phase === "won" || endResult.state.phase === "lost") {
        state = replaceState(state, endResult.state, endResult.events);

        return { ok: true, state, events: endResult.events, errors: [] };
      }

      const enemyResult = resolveEnemyTurn(endResult.state, starterRegistry, rng);
      const events = [...endResult.events, ...enemyResult.events];

      if (!enemyResult.ok) {
        state = replaceState(state, state.combat, events);

        return { ok: false, state, events, errors: enemyResult.errors };
      }

      state = replaceState(state, enemyResult.state, events);

      return { ok: true, state, events, errors: [] };
    },
    reset: () => {
      const result = createInitialState(seed);

      state = result.state;

      return result;
    }
  };
};
