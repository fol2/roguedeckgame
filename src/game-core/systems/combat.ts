import {
  cardInstanceId,
  combatantId,
  type CardInstanceId,
  type CombatantId,
  type MonsterId,
  type PetInstanceId
} from "../ids";
import type { GameActionError, GameActionResult, PlayCardAction, CreateCombatResult } from "../model/action";
import type { CardDefinition } from "../model/card";
import type { CombatantState, CombatCardInstance, CombatState } from "../model/combat";
import type { CombatantTarget, EffectDefinition, PetTarget } from "../model/effect";
import type { GameEvent } from "../model/event";
import type { MonsterDefinition } from "../model/monster";
import type { PetInstance, RunPetState } from "../model/pet";
import type { GameContentRegistry } from "../model/registry";
import type { RunState } from "../model/run";
import { drawCards } from "./draw";
import { resolveCardEffects, resolveEffects } from "./effects";
import { checkCombatOutcome } from "./outcome";
import { chooseMonsterIntents, findMonsterDefinition, findMonsterIntent } from "./monster-intents";
import {
  applyPetCommandCostModifiers,
  applyPetCommandEffectModifiers,
  createRunPetStateWithActiveModifiers,
  resetTurnPetModifierUsage,
  resolvePetCommandOwnerIds,
  resolvePetModifierTriggersAfterEvents
} from "./pet-modifiers";
import { createRng, type Rng } from "./rng";
import { processStartOfTurnStatuses } from "./statuses";

const PLAYER_COMBATANT_ID = combatantId("player");
const DEFAULT_OPENING_HAND_SIZE = 5;
const DEFAULT_MAX_ENERGY = 3;
const DEFAULT_PLAYER_HP = 70;

export type CreateCombatInput = {
  readonly run: RunState;
  readonly registry: GameContentRegistry;
  readonly petInstances: readonly PetInstance[];
  readonly monsterIds: readonly MonsterId[];
  readonly seed: string | number;
  readonly openingHandSize?: number;
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

const reject = (state: CombatState, actionError: GameActionError): GameActionResult<CombatState> => ({
  ok: false,
  state,
  events: [rejectedEvent(actionError)],
  errors: [actionError]
});

const createRejectedState = (input: CreateCombatInput): CombatState => {
  const activePetInstances = input.petInstances.filter((petInstance) =>
    input.run.activePetInstanceIds.includes(petInstance.id)
  );
  const cardInstances: CombatCardInstance[] = input.run.deckCardIds.map((cardId, index) => ({
    id: cardInstanceId(`${input.run.id}:card:${index}:${cardId}`),
    cardId,
    ownerId: PLAYER_COMBATANT_ID
  }));

  return {
    id: input.run.id,
    seed: input.seed,
    turnNumber: 0,
    phase: "not_started",
    activeActorId: PLAYER_COMBATANT_ID,
    player: createPlayerCombatant(input.run, input.registry),
    monsters: [],
    activePetInstanceIds: [...input.run.activePetInstanceIds],
    petInstances: activePetInstances,
    runPetStates: activePetInstances.map(createRunPetState),
    monsterIntents: [],
    cardInstances,
    drawPile: [],
    hand: [],
    discardPile: [],
    exhaustPile: [],
    energy: 0,
    maxEnergy: DEFAULT_MAX_ENERGY,
    events: []
  };
};

const rejectCreate = (input: CreateCombatInput, actionError: GameActionError): CreateCombatResult => ({
  ok: false,
  state: createRejectedState(input),
  events: [rejectedEvent(actionError)],
  errors: [actionError]
});

const createPlayerCombatant = (run: RunState, registry: GameContentRegistry): CombatantState => {
  const playerDefinition = registry.players.find((player) => player.id === run.playerClassId);

  return {
    id: PLAYER_COMBATANT_ID,
    definitionId: run.playerClassId,
    name: playerDefinition?.name ?? "Player",
    type: "player",
    hp: DEFAULT_PLAYER_HP,
    maxHp: DEFAULT_PLAYER_HP,
    block: 0,
    statuses: [],
    alive: true
  };
};

const createMonsterCombatant = (
  monsterDefinition: MonsterDefinition,
  index: number
): CombatantState => ({
  id: combatantId(`monster:${monsterDefinition.id}:${index}`),
  definitionId: monsterDefinition.id,
  name: monsterDefinition.name,
  type: "monster",
  hp: monsterDefinition.maxHp,
  maxHp: monsterDefinition.maxHp,
  block: 0,
  statuses: [],
  alive: true
});

const createRunPetState = (petInstance: PetInstance): RunPetState => ({
  petInstanceId: petInstance.id,
  mood: "calm",
  activeModifierIds: [],
  temporaryModifierIds: [],
  usedModifierIdsThisCombat: [],
  usedModifierIdsThisTurn: [],
  fatigue: 0
});

const findCardInstance = (state: CombatState, cardInstanceId: CardInstanceId) =>
  state.cardInstances.find((cardInstance) => cardInstance.id === cardInstanceId);

const findCombatant = (state: CombatState, combatantId: CombatantId): CombatantState | undefined => {
  if (state.player.id === combatantId) {
    return state.player;
  }

  return state.monsters.find((monster) => monster.id === combatantId);
};

const appendEvents = (state: CombatState, events: readonly GameEvent[]): CombatState => ({
  ...state,
  events: [...state.events, ...events]
});

const targetNeedsActionTarget = (target: CombatantTarget): boolean =>
  target.type === "target" && target.combatantId === undefined;

const validateCombatantTarget = (
  state: CombatState,
  target: CombatantTarget,
  actionTargetId?: CombatantId
): GameActionError | undefined => {
  if (!targetNeedsActionTarget(target)) {
    if (target.type === "target" && target.combatantId) {
      const combatant = findCombatant(state, target.combatantId);
      if (!combatant) {
        return error("invalid_target", `Target combatant '${target.combatantId}' does not exist.`, "targetId");
      }

      if (!combatant.alive) {
        return error("dead_target", `Target combatant '${target.combatantId}' is defeated.`, "targetId");
      }
    }

    return undefined;
  }

  if (!actionTargetId) {
    return error("missing_target", "This card requires a target.", "targetId");
  }

  const combatant = findCombatant(state, actionTargetId);
  if (!combatant) {
    return error("invalid_target", `Target combatant '${actionTargetId}' does not exist.`, "targetId");
  }

  return combatant.alive
    ? undefined
    : error("dead_target", `Target combatant '${actionTargetId}' is defeated.`, "targetId");
};

const validatePetTarget = (
  state: CombatState,
  registry: GameContentRegistry,
  petTarget: PetTarget
): GameActionError | undefined => {
  const activeIds = [...state.activePetInstanceIds];

  if (petTarget.type === "leading" || petTarget.type === "randomActive" || petTarget.type === "allActive") {
    return activeIds.length > 0
      ? undefined
      : error("missing_active_pet", "No active pet is available.", "activePetInstanceIds");
  }

  if (petTarget.type === "specific") {
    return activeIds.includes(petTarget.petInstanceId)
      ? undefined
      : error("missing_specific_pet", `Pet instance '${petTarget.petInstanceId}' is not active.`, "petTarget");
  }

  const hasTaggedPet = state.petInstances
    .filter((petInstance) => activeIds.includes(petInstance.id))
    .some((petInstance) => {
      const definition = registry.pets.find((pet) => pet.id === petInstance.definitionId);
      return definition?.tags.includes(petTarget.tag) ?? false;
    });

  return hasTaggedPet
    ? undefined
    : error("missing_tagged_pet", `No active pet has tag '${petTarget.tag}'.`, "petTarget");
};

const validateCardEffects = (
  state: CombatState,
  card: CardDefinition,
  action: PlayCardAction,
  registry: GameContentRegistry
): GameActionError | undefined => {
  for (const effectDefinition of card.effects) {
    if ("target" in effectDefinition) {
      const targetError = validateCombatantTarget(state, effectDefinition.target, action.targetId);
      if (targetError) {
        return targetError;
      }
    }

    if ("petTarget" in effectDefinition) {
      const petError = validatePetTarget(state, registry, effectDefinition.petTarget);
      if (petError) {
        return petError;
      }
    }
  }

  return undefined;
};

const hasRequiredActivePet = (
  state: CombatState,
  card: CardDefinition
): boolean => {
  if (!card.requiresPetDefinitionId) {
    return true;
  }

  return state.petInstances
    .filter((petInstance) => state.activePetInstanceIds.includes(petInstance.id))
    .some((petInstance) => petInstance.definitionId === card.requiresPetDefinitionId);
};

const lockSinglePetTarget = (
  effectDefinition: EffectDefinition,
  ownerPetInstanceIds: readonly PetInstanceId[]
): EffectDefinition => {
  if (ownerPetInstanceIds.length !== 1 || !("petTarget" in effectDefinition)) {
    return effectDefinition;
  }

  return {
    ...effectDefinition,
    petTarget: { type: "specific", petInstanceId: ownerPetInstanceIds[0] }
  };
};

export const createCombat = (input: CreateCombatInput): CreateCombatResult => {
  const rng = createRng(input.seed);
  const activePetInstances = input.run.activePetInstanceIds.map((activePetInstanceId) =>
    input.petInstances.find((petInstance) => petInstance.id === activePetInstanceId)
  );

  const missingPetIndex = activePetInstances.findIndex((petInstance) => petInstance === undefined);
  if (missingPetIndex >= 0) {
    const missingPetInstanceId = input.run.activePetInstanceIds[missingPetIndex];
    return rejectCreate(
      input,
      error(
        "missing_active_pet_instance",
        `Active pet instance '${missingPetInstanceId}' was not provided.`,
        "petInstances"
      )
    );
  }

  const missingPetDefinition = activePetInstances.find((petInstance) =>
    petInstance ? !input.registry.pets.some((pet) => pet.id === petInstance.definitionId) : false
  );
  if (missingPetDefinition) {
    return rejectCreate(
      input,
      error(
        "missing_active_pet_definition",
        `Active pet instance '${missingPetDefinition.id}' references missing pet definition '${missingPetDefinition.definitionId}'.`,
        "registry.pets"
      )
    );
  }

  const cardDefinitions = new Set(input.registry.cards.map((card) => card.id));
  const missingCardId = input.run.deckCardIds.find((cardId) => !cardDefinitions.has(cardId));
  if (missingCardId) {
    return rejectCreate(
      input,
      error("missing_card_definition", `Deck card '${missingCardId}' is not registered.`, "run.deckCardIds")
    );
  }

  if (input.monsterIds.length === 0) {
    return rejectCreate(input, error("missing_monster_ids", "Combat requires at least one monster.", "monsterIds"));
  }

  const runPetStates: RunPetState[] = [];
  for (const petInstance of activePetInstances as readonly PetInstance[]) {
    const runPetStateResult = createRunPetStateWithActiveModifiers(petInstance, input.registry);
    if (!runPetStateResult.ok) {
      return rejectCreate(input, runPetStateResult.error);
    }

    runPetStates.push(runPetStateResult.value);
  }

  const monsters = input.monsterIds.map((monsterId, index) => {
    const monsterDefinition = input.registry.monsters.find((monster) => monster.id === monsterId);
    return monsterDefinition ? createMonsterCombatant(monsterDefinition, index) : undefined;
  });
  const missingMonsterIndex = monsters.findIndex((monster) => monster === undefined);
  if (missingMonsterIndex >= 0) {
    return rejectCreate(
      input,
      error("missing_monster_definition", `Monster '${input.monsterIds[missingMonsterIndex]}' is not registered.`, "monsterIds")
    );
  }

  const cardInstances: CombatCardInstance[] = input.run.deckCardIds.map((cardId, index) => ({
    id: cardInstanceId(`${input.run.id}:card:${index}:${cardId}`),
    cardId,
    ownerId: PLAYER_COMBATANT_ID
  }));
  const shuffledDrawPile = rng.shuffle(cardInstances.map((cardInstance) => cardInstance.id));
  const initialEvents: GameEvent[] = [
    { type: "CombatStarted", combatId: input.run.id, seed: input.seed },
    { type: "DeckShuffled", from: "deck", to: "draw", count: shuffledDrawPile.length }
  ];

  let initialState: CombatState = {
    id: input.run.id,
    seed: input.seed,
    turnNumber: 1,
    phase: "player_turn",
    activeActorId: PLAYER_COMBATANT_ID,
    player: createPlayerCombatant(input.run, input.registry),
    monsters: monsters as readonly CombatantState[],
    activePetInstanceIds: [...input.run.activePetInstanceIds],
    petInstances: activePetInstances as readonly PetInstance[],
    runPetStates,
    monsterIntents: [],
    cardInstances,
    drawPile: shuffledDrawPile,
    hand: [],
    discardPile: [],
    exhaustPile: [],
    energy: DEFAULT_MAX_ENERGY,
    maxEnergy: DEFAULT_MAX_ENERGY,
    events: initialEvents
  };

  const intentResult = chooseMonsterIntents(initialState, input.registry, rng);
  if (!intentResult.ok) {
    return rejectCreate(input, intentResult.errors[0] ?? error("monster_intent_selection_failed", "Monster intent selection failed."));
  }

  const turnStarted: GameEvent = { type: "TurnStarted", turnNumber: 1, actorId: PLAYER_COMBATANT_ID };
  initialState = appendEvents(intentResult.state, [turnStarted]);
  const openingHandSize = input.openingHandSize ?? DEFAULT_OPENING_HAND_SIZE;
  const drawResult = drawCards(initialState, openingHandSize, rng);
  if (!drawResult.ok) {
    return drawResult;
  }

  return {
    ok: true,
    state: drawResult.state,
    events: [...initialEvents, ...intentResult.events, turnStarted, ...drawResult.events],
    errors: []
  };
};

export const playCard = (
  state: CombatState,
  action: PlayCardAction,
  registry: GameContentRegistry,
  rng: Rng
): GameActionResult<CombatState> => {
  if (state.phase === "won" || state.phase === "lost") {
    return reject(state, error("combat_already_ended", "Cards cannot be played after combat has ended.", "phase"));
  }

  if (state.phase !== "player_turn") {
    return reject(state, error("invalid_phase", "Cards can only be played during the player turn.", "phase"));
  }

  if (!state.hand.includes(action.cardInstanceId)) {
    return reject(state, error("card_not_in_hand", `Card instance '${action.cardInstanceId}' is not in hand.`, "hand"));
  }

  const cardInstance = findCardInstance(state, action.cardInstanceId);
  if (!cardInstance) {
    return reject(
      state,
      error("missing_card_instance", `Card instance '${action.cardInstanceId}' does not exist.`, "cardInstances")
    );
  }

  const card = registry.cards.find((cardDefinition) => cardDefinition.id === cardInstance.cardId);
  if (!card) {
    return reject(state, error("missing_card_definition", `Card '${cardInstance.cardId}' is not registered.`, "registry.cards"));
  }

  if (card.type === "pet-command" && !hasRequiredActivePet(state, card)) {
    return reject(
      state,
      error("missing_required_active_pet", `Card '${card.id}' requires an active pet of definition '${card.requiresPetDefinitionId}'.`, "activePetInstanceIds")
    );
  }

  const validationError = validateCardEffects(state, card, action, registry);
  if (validationError) {
    return reject(state, validationError);
  }

  const ownerPetResult = resolvePetCommandOwnerIds(state, registry, card, rng);
  if (!ownerPetResult.ok) {
    return reject(state, ownerPetResult.error);
  }

  const costModifierResult = applyPetCommandCostModifiers(
    {
      state,
      card,
      cardInstanceId: cardInstance.id,
      cardId: cardInstance.cardId,
      ownerPetInstanceIds: ownerPetResult.value
    },
    registry
  );
  if (!costModifierResult.ok) {
    return reject(state, costModifierResult.error);
  }

  if (state.energy < costModifierResult.value.cost) {
    return reject(
      state,
      error(
        "insufficient_energy",
        `Playing '${card.name}' requires ${costModifierResult.value.cost} energy.`,
        "energy"
      )
    );
  }

  const effectModifierResult = applyPetCommandEffectModifiers(
    {
      state,
      card,
      effects: card.effects.map((effectDefinition) => lockSinglePetTarget(effectDefinition, ownerPetResult.value)),
      ownerPetInstanceIds: ownerPetResult.value
    },
    registry
  );
  if (!effectModifierResult.ok) {
    return reject(state, effectModifierResult.error);
  }

  const cardPlayed: GameEvent = {
    type: "CardPlayed",
    cardInstanceId: cardInstance.id,
    cardId: cardInstance.cardId,
    sourceId: PLAYER_COMBATANT_ID
  };
  const energySpent: GameEvent = {
    type: "EnergySpent",
    amount: costModifierResult.value.cost,
    remaining: state.energy - costModifierResult.value.cost
  };
  const openingEvents = [
    cardPlayed,
    ...costModifierResult.value.events,
    ...effectModifierResult.value.events,
    energySpent
  ];
  let nextState = appendEvents(
    { ...costModifierResult.value.state, energy: state.energy - costModifierResult.value.cost },
    openingEvents
  );
  const events: GameEvent[] = [...openingEvents];

  if (card.type === "pet-command") {
    const petCommandEvents = ownerPetResult.value.map<GameEvent>((petInstanceId) => ({
      type: "PetCommanded",
      petInstanceId,
      cardInstanceId: cardInstance.id,
      cardId: cardInstance.cardId
    }));
    nextState = appendEvents(nextState, petCommandEvents);
    events.push(...petCommandEvents);
  }

  const effectResult = resolveCardEffects(
    nextState,
    effectModifierResult.value.effects,
    {
      sourceId: PLAYER_COMBATANT_ID,
      targetId: action.targetId,
      cardInstanceId: cardInstance.id,
      cardId: cardInstance.cardId
    },
    registry,
    rng
  );
  if (!effectResult.ok) {
    return reject(
      state,
      effectResult.errors[0] ?? error("effect_resolution_failed", "Card effect resolution failed.")
    );
  }

  const triggerResult = resolvePetModifierTriggersAfterEvents({
    stateBeforeEffects: nextState,
    stateAfterEffects: effectResult.state,
    effectEvents: effectResult.events,
    registry,
    rng
  });
  if (!triggerResult.ok) {
    return reject(
      state,
      triggerResult.errors[0] ?? error("pet_modifier_trigger_failed", "Pet modifier trigger resolution failed.")
    );
  }

  const movedCard: GameEvent = {
    type: "CardMoved",
    cardInstanceId: cardInstance.id,
    cardId: cardInstance.cardId,
    from: "hand",
    to: "discard"
  };
  nextState = appendEvents(
    {
      ...triggerResult.state,
      hand: triggerResult.state.hand.filter((cardInstanceId) => cardInstanceId !== cardInstance.id),
      discardPile: [...triggerResult.state.discardPile, cardInstance.id]
    },
    [movedCard]
  );
  events.push(...effectResult.events, ...triggerResult.events, movedCard);

  return { ok: true, state: nextState, events, errors: [] };
};

export const endPlayerTurn = (state: CombatState): GameActionResult<CombatState> => {
  if (state.phase !== "player_turn") {
    return reject(state, error("invalid_phase", "Only the player turn can be ended by this action.", "phase"));
  }

  const cardByInstanceId = new Map(state.cardInstances.map((cardInstance) => [cardInstance.id, cardInstance]));
  const missingCardInstanceId = state.hand.find((cardInstanceId) => !cardByInstanceId.has(cardInstanceId));
  if (missingCardInstanceId) {
    return reject(
      state,
      error("missing_card_instance", `Card instance '${missingCardInstanceId}' does not exist.`, "hand")
    );
  }

  const moveEvents = state.hand.map<GameEvent>((cardInstanceId) => {
    const cardInstance = cardByInstanceId.get(cardInstanceId)!;
    return {
      type: "CardMoved",
      cardInstanceId,
      cardId: cardInstance.cardId,
      from: "hand",
      to: "discard"
    };
  });
  const turnEnded: GameEvent = {
    type: "TurnEnded",
    turnNumber: state.turnNumber,
    actorId: state.player.id
  };
  const events = [...moveEvents, turnEnded];
  const nextState = appendEvents(
    {
      ...state,
      phase: "enemy_turn",
      hand: [],
      discardPile: [...state.discardPile, ...state.hand]
    },
    events
  );

  return { ok: true, state: nextState, events, errors: [] };
};

export const startPlayerTurn = (
  state: CombatState,
  rng: Rng
): GameActionResult<CombatState> => {
  if (state.phase === "won" || state.phase === "lost") {
    return reject(state, error("combat_already_ended", "A new player turn cannot start after combat has ended.", "phase"));
  }

  if (state.phase !== "enemy_turn") {
    return reject(state, error("invalid_phase", "A player turn can only start after the enemy turn.", "phase"));
  }

  const statusResult = processStartOfTurnStatuses(state, state.player.id);
  if (!statusResult.ok) {
    return statusResult;
  }

  if (statusResult.state.phase === "won" || statusResult.state.phase === "lost") {
    return statusResult;
  }

  return startPlayerTurnAfterStatusTicks(statusResult.state, rng, statusResult.events, state);
};

const startPlayerTurnAfterStatusTicks = (
  state: CombatState,
  rng: Rng,
  previousEvents: readonly GameEvent[] = [],
  originalStateForReject: CombatState = state
): GameActionResult<CombatState> => {
  const turnStarted: GameEvent = {
    type: "TurnStarted",
    turnNumber: state.turnNumber + 1,
    actorId: state.player.id
  };
  const nextState = appendEvents(
    {
      ...resetTurnPetModifierUsage(state),
      phase: "player_turn",
      activeActorId: state.player.id,
      turnNumber: state.turnNumber + 1,
      energy: state.maxEnergy,
      player: { ...state.player, block: 0 }
    },
    [turnStarted]
  );
  const drawResult = drawCards(nextState, DEFAULT_OPENING_HAND_SIZE, rng);
  if (!drawResult.ok) {
    return reject(originalStateForReject, drawResult.errors[0] ?? error("draw_failed", "Could not draw cards for the player turn."));
  }

  return { ok: true, state: drawResult.state, events: [...previousEvents, turnStarted, ...drawResult.events], errors: [] };
};

export const resolveEnemyTurn = (
  state: CombatState,
  registry: GameContentRegistry,
  rng: Rng
): GameActionResult<CombatState> => {
  if (state.phase === "won" || state.phase === "lost") {
    return reject(state, error("combat_already_ended", "The enemy turn cannot resolve after combat has ended.", "phase"));
  }

  if (state.phase !== "enemy_turn") {
    return reject(state, error("invalid_phase", "Enemy turn resolution requires the enemy turn phase.", "phase"));
  }

  const originalState = state;
  let nextState = state;
  const events: GameEvent[] = [];

  for (const monster of nextState.monsters) {
    if (!monster.alive) {
      continue;
    }

    const statusResult = processStartOfTurnStatuses(nextState, monster.id);
    if (!statusResult.ok) {
      return reject(originalState, statusResult.errors[0] ?? error("status_resolution_failed", "Status resolution failed."));
    }

    nextState = statusResult.state;
    events.push(...statusResult.events);

    if (nextState.phase === "won" || nextState.phase === "lost") {
      return { ok: true, state: nextState, events, errors: [] };
    }
  }

  for (const monster of nextState.monsters) {
    if (!monster.alive) {
      continue;
    }

    const monsterDefinition = findMonsterDefinition(registry, monster);
    if (!monsterDefinition) {
      return reject(
        originalState,
        error("missing_monster_definition", `Monster combatant '${monster.id}' has no registered definition.`, "registry.monsters")
      );
    }

    const intent = findMonsterIntent(monsterDefinition, monster.id, nextState);
    if ("code" in intent) {
      return reject(originalState, intent);
    }

    const resolvedEvent: GameEvent = {
      type: "MonsterIntentResolved",
      monsterId: monster.id,
      intentId: intent.id
    };
    nextState = appendEvents({ ...nextState, activeActorId: monster.id }, [resolvedEvent]);
    events.push(resolvedEvent);

    const effectResult = resolveEffects(
      nextState,
      intent.effects,
      {
        sourceId: monster.id,
        defaultTargetId: nextState.player.id,
        intentId: intent.id
      },
      registry,
      rng
    );
    if (!effectResult.ok) {
      return reject(
        originalState,
        effectResult.errors[0] ?? error("effect_resolution_failed", "Monster intent effect resolution failed.")
      );
    }

    nextState = effectResult.state;
    events.push(...effectResult.events);

    const outcomeResult = checkCombatOutcome(nextState);
    nextState = outcomeResult.state;
    events.push(...outcomeResult.events);

    if (nextState.phase === "won" || nextState.phase === "lost") {
      return { ok: true, state: nextState, events, errors: [] };
    }
  }

  const clearedIntentState = { ...nextState, monsterIntents: [] };
  const playerStatusResult = processStartOfTurnStatuses(clearedIntentState, clearedIntentState.player.id);
  if (!playerStatusResult.ok) {
    return reject(
      originalState,
      playerStatusResult.errors[0] ?? error("status_resolution_failed", "Status resolution failed.")
    );
  }

  nextState = playerStatusResult.state;
  events.push(...playerStatusResult.events);

  if (nextState.phase === "won" || nextState.phase === "lost") {
    return { ok: true, state: nextState, events, errors: [] };
  }

  const intentResult = chooseMonsterIntents(nextState, registry, rng);
  if (!intentResult.ok) {
    return reject(
      originalState,
      intentResult.errors[0] ?? error("monster_intent_selection_failed", "Monster intent selection failed.")
    );
  }

  const turnResult = startPlayerTurnAfterStatusTicks(intentResult.state, rng, [], originalState);
  if (!turnResult.ok) {
    return reject(originalState, turnResult.errors[0] ?? error("turn_start_failed", "Player turn start failed."));
  }

  return {
    ok: true,
    state: turnResult.state,
    events: [...events, ...intentResult.events, ...turnResult.events],
    errors: []
  };
};

export const createCombatRng = createRng;
