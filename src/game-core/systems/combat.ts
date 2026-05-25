import {
  cardInstanceId,
  combatantId,
  type CardInstanceId,
  type CombatantId,
  type MonsterId
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
import { resolveCardEffects, resolvePetTargets } from "./effects";
import { createRng, type Rng } from "./rng";

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
  temporaryModifierIds: [],
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

const firstPetTarget = (effects: readonly EffectDefinition[]): PetTarget => {
  const petEffect = effects.find((effectDefinition) => "petTarget" in effectDefinition);
  return petEffect && "petTarget" in petEffect ? petEffect.petTarget : { type: "leading" };
};

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
    { type: "DeckShuffled", from: "deck", to: "draw", count: shuffledDrawPile.length },
    { type: "TurnStarted", turnNumber: 1, actorId: PLAYER_COMBATANT_ID }
  ];

  const initialState: CombatState = {
    id: input.run.id,
    seed: input.seed,
    turnNumber: 1,
    phase: "player_turn",
    activeActorId: PLAYER_COMBATANT_ID,
    player: createPlayerCombatant(input.run, input.registry),
    monsters: monsters as readonly CombatantState[],
    activePetInstanceIds: [...input.run.activePetInstanceIds],
    petInstances: activePetInstances as readonly PetInstance[],
    runPetStates: (activePetInstances as readonly PetInstance[]).map(createRunPetState),
    cardInstances,
    drawPile: shuffledDrawPile,
    hand: [],
    discardPile: [],
    exhaustPile: [],
    energy: DEFAULT_MAX_ENERGY,
    maxEnergy: DEFAULT_MAX_ENERGY,
    events: initialEvents
  };

  const openingHandSize = input.openingHandSize ?? DEFAULT_OPENING_HAND_SIZE;
  const drawResult = drawCards(initialState, openingHandSize, rng);
  if (!drawResult.ok) {
    return drawResult;
  }

  return {
    ok: true,
    state: drawResult.state,
    events: [...initialEvents, ...drawResult.events],
    errors: []
  };
};

export const playCard = (
  state: CombatState,
  action: PlayCardAction,
  registry: GameContentRegistry,
  rng: Rng
): GameActionResult<CombatState> => {
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

  if (state.energy < card.cost) {
    return reject(state, error("insufficient_energy", `Playing '${card.name}' requires ${card.cost} energy.`, "energy"));
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

  const cardPlayed: GameEvent = {
    type: "CardPlayed",
    cardInstanceId: cardInstance.id,
    cardId: cardInstance.cardId,
    sourceId: PLAYER_COMBATANT_ID
  };
  const energySpent: GameEvent = {
    type: "EnergySpent",
    amount: card.cost,
    remaining: state.energy - card.cost
  };
  let nextState = appendEvents({ ...state, energy: state.energy - card.cost }, [cardPlayed, energySpent]);
  const events: GameEvent[] = [cardPlayed, energySpent];

  if (card.type === "pet-command") {
    const petResolution = resolvePetTargets(nextState, registry, firstPetTarget(card.effects), rng);
    if (!petResolution.ok) {
      return reject(state, petResolution.error);
    }

    const petCommandEvents = petResolution.petInstanceIds.map<GameEvent>((petInstanceId) => ({
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
    card.effects,
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

  const movedCard: GameEvent = {
    type: "CardMoved",
    cardInstanceId: cardInstance.id,
    cardId: cardInstance.cardId,
    from: "hand",
    to: "discard"
  };
  nextState = appendEvents(
    {
      ...effectResult.state,
      hand: effectResult.state.hand.filter((cardInstanceId) => cardInstanceId !== cardInstance.id),
      discardPile: [...effectResult.state.discardPile, cardInstance.id]
    },
    [movedCard]
  );
  events.push(...effectResult.events, movedCard);

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
  const turnStarted: GameEvent = {
    type: "TurnStarted",
    turnNumber: state.turnNumber + 1,
    actorId: state.player.id
  };
  const nextState = appendEvents(
    {
      ...state,
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
    return drawResult;
  }

  return { ok: true, state: drawResult.state, events: [turnStarted, ...drawResult.events], errors: [] };
};

export const createCombatRng = createRng;
