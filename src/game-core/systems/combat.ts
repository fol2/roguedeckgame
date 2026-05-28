import { act1NormalBalance } from "../data/balance/act1-normal";
import {
  cardInstanceId,
  combatantId,
  type CardInstanceId,
  type CombatantId,
  type EncounterId,
  type MonsterId,
  type PetInstanceId,
  type RunNodeId
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
import {
  createPlayerCardActor,
  findCardActor,
  findPlayerCardActor,
  projectCombatStateFromCardActors,
  updateCardActor
} from "./card-actors";
import { buildCardActionContract } from "./card-action-contract";
import { cardNeedsActionTarget, targetNeedsActionTarget } from "./card-actions";
import { moveCardBetweenPiles } from "./card-piles";
import { drawCards } from "./draw";
import { resolveCardEffects, resolveEffects } from "./effects";
import { checkCombatOutcome } from "./outcome";
import {
  chooseMonsterIntents,
  finalizePlannedMonsterAbility,
  findMonsterDefinition,
  resolveDiscardSinglePlannedMonsterCard
} from "./monster-intents";
import {
  applyPetCommandCostModifiers,
  applyPetCommandEffectModifiers,
  createRunPetStateWithActiveModifiers,
  resetTurnPetModifierUsage,
  resolvePetCommandOwnerIds
} from "./pet-modifiers";
import { createRng, type Rng } from "./rng";
import { processEndOfTurnStatuses, processStartOfTurnStatuses } from "./statuses";
import { resolveTriggerQueueAfterEvents } from "./trigger-queue";

const PLAYER_COMBATANT_ID = combatantId("player");
const DEFAULT_OPENING_HAND_SIZE = 5;
const DEFAULT_DRAW_PER_TURN = 3;
const DEFAULT_MAX_HAND_SIZE = 10;
const DEFAULT_MAX_ENERGY = 3;
const DEFAULT_PLAYER_MAX_HP = act1NormalBalance.player.maxHp;

export type CreateCombatInput = {
  readonly run: RunState;
  readonly registry: GameContentRegistry;
  readonly petInstances: readonly PetInstance[];
  readonly monsterIds: readonly MonsterId[];
  readonly seed: string | number;
  readonly runNodeId?: RunNodeId;
  readonly encounterId?: EncounterId;
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
    runNodeId: input.runNodeId,
    encounterId: input.encounterId,
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
    plannedMonsterAbilities: [],
    monsterCardStates: [],
    cardActors: [
      createPlayerCardActor(PLAYER_COMBATANT_ID, cardInstances, [], {
        openingHandSize: input.openingHandSize ?? DEFAULT_OPENING_HAND_SIZE,
        drawPerTurn: DEFAULT_DRAW_PER_TURN,
        maxHandSize: DEFAULT_MAX_HAND_SIZE,
        maxEnergy: DEFAULT_MAX_ENERGY,
        energy: 0
      })
    ],
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
  const maxHp = run.playerMaxHp ?? DEFAULT_PLAYER_MAX_HP;
  const hp = Math.max(0, Math.min(run.playerHp ?? maxHp, maxHp));

  return {
    id: PLAYER_COMBATANT_ID,
    definitionId: run.playerClassId,
    name: playerDefinition?.name ?? "Player",
    type: "player",
    hp,
    maxHp,
    block: 0,
    statuses: [],
    alive: hp > 0
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

const getEnemyActionOrder = (state: CombatState): readonly CombatantState[] => {
  const aliveMonsters = state.monsters.filter((monster) => monster.alive);
  const order = state.enemyPlanOrder ?? [];
  const ordered = order.flatMap((monsterId) => aliveMonsters.find((monster) => monster.id === monsterId) ?? []);
  const orderedIds = new Set(ordered.map((monster) => monster.id));

  return [
    ...ordered,
    ...aliveMonsters.filter((monster) => !orderedIds.has(monster.id))
  ];
};

const enemyPlanSignature = (state: CombatState): string =>
  JSON.stringify({
    order: state.enemyPlanOrder ?? state.monsterIntents.map((intent) => intent.monsterCombatantId),
    intents: state.monsterIntents.map((intent) => [intent.monsterCombatantId, intent.intentId]),
    planned: (state.plannedMonsterAbilities ?? []).map((planned) => [
      planned.monsterCombatantId,
      planned.intentId,
      planned.abilityId
    ])
  });

const canReplanEnemyPlans = (state: CombatState): boolean =>
  Object.prototype.hasOwnProperty.call(state, "plannedMonsterAbilities") &&
  state.monsters
    .filter((monster) => monster.alive)
    .every((monster) => findCardActor(state, monster.id)?.actorKind === "enemy");

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

  if (combatant.type !== "monster") {
    return error("invalid_target_type", "Player card targets must be alive monsters.", "targetId");
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
  if (action.targetId !== undefined && !cardNeedsActionTarget(card)) {
    return error("unexpected_card_target", "Targetless cards must not include a target id.", "targetId");
  }

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

type PlayableCardContext = {
  readonly cardInstance: CombatCardInstance;
  readonly card: CardDefinition;
};

type PlayableCardContextResult =
  | { readonly ok: true; readonly value: PlayableCardContext }
  | { readonly ok: false; readonly error: GameActionError };

type StageResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: GameActionError };

type CardOpeningStage = {
  readonly state: CombatState;
  readonly effects: readonly EffectDefinition[];
  readonly events: readonly GameEvent[];
};

const resolvePlayableCardContext = (
  state: CombatState,
  action: PlayCardAction,
  registry: GameContentRegistry
): PlayableCardContextResult => {
  if (state.phase === "won" || state.phase === "lost") {
    return { ok: false, error: error("combat_already_ended", "Cards cannot be played after combat has ended.", "phase") };
  }

  if (state.phase !== "player_turn") {
    return { ok: false, error: error("invalid_phase", "Cards can only be played during the player turn.", "phase") };
  }

  if (!state.hand.includes(action.cardInstanceId)) {
    return { ok: false, error: error("card_not_in_hand", `Card instance '${action.cardInstanceId}' is not in hand.`, "hand") };
  }

  const cardInstance = findCardInstance(state, action.cardInstanceId);
  if (!cardInstance) {
    return {
      ok: false,
      error: error("missing_card_instance", `Card instance '${action.cardInstanceId}' does not exist.`, "cardInstances")
    };
  }

  const card = registry.cards.find((cardDefinition) => cardDefinition.id === cardInstance.cardId);
  if (!card) {
    return {
      ok: false,
      error: error("missing_card_definition", `Card '${cardInstance.cardId}' is not registered.`, "registry.cards")
    };
  }

  if (card.type === "pet-command" && !hasRequiredActivePet(state, card)) {
    return {
      ok: false,
      error: error(
        "missing_required_active_pet",
        `Card '${card.id}' requires an active pet of definition '${card.requiresPetDefinitionId}'.`,
        "activePetInstanceIds"
      )
    };
  }

  const validationError = validateCardEffects(state, card, action, registry);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  return { ok: true, value: { cardInstance, card } };
};

const createPetCommandEvents = (
  cardInstance: CombatCardInstance,
  ownerPetInstanceIds: readonly PetInstanceId[]
): readonly GameEvent[] =>
  ownerPetInstanceIds.map<GameEvent>((petInstanceId) => ({
    type: "PetCommanded",
    petInstanceId,
    cardInstanceId: cardInstance.id,
    cardId: cardInstance.cardId
  }));

const resolveCardOpeningStage = (
  state: CombatState,
  context: PlayableCardContext,
  registry: GameContentRegistry,
  rng: Rng
): StageResult<CardOpeningStage> => {
  const { card, cardInstance } = context;
  const ownerPetResult = resolvePetCommandOwnerIds(state, registry, card, rng);
  if (!ownerPetResult.ok) {
    return { ok: false, error: ownerPetResult.error };
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
    return { ok: false, error: costModifierResult.error };
  }

  if (state.energy < costModifierResult.value.cost) {
    return {
      ok: false,
      error: error(
        "insufficient_energy",
        `Playing '${card.name}' requires ${costModifierResult.value.cost} energy.`,
        "energy"
      )
    };
  }

  const lockedEffects = card.effects.map((effectDefinition) =>
    lockSinglePetTarget(effectDefinition, ownerPetResult.value)
  );
  const effectModifierResult = applyPetCommandEffectModifiers(
    {
      state,
      card,
      effects: lockedEffects,
      ownerPetInstanceIds: ownerPetResult.value
    },
    registry
  );
  if (!effectModifierResult.ok) {
    return { ok: false, error: effectModifierResult.error };
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
  const remainingEnergy = state.energy - costModifierResult.value.cost;
  const playerActor = findPlayerCardActor(costModifierResult.value.state);
  const stateWithSpentEnergy = playerActor
    ? projectCombatStateFromCardActors(updateCardActor(costModifierResult.value.state, {
        ...playerActor,
        energy: remainingEnergy
      }))
    : { ...costModifierResult.value.state, energy: remainingEnergy };
  let nextState = appendEvents(stateWithSpentEnergy, openingEvents);
  const events: GameEvent[] = [...openingEvents];

  if (card.type === "pet-command") {
    const petCommandEvents = createPetCommandEvents(cardInstance, ownerPetResult.value);
    nextState = appendEvents(nextState, petCommandEvents);
    events.push(...petCommandEvents);
  }

  return {
    ok: true,
    value: {
      state: nextState,
      effects: effectModifierResult.value.effects,
      events
    }
  };
};

const resolveCardEffectStage = (
  openingStage: CardOpeningStage,
  context: PlayableCardContext,
  action: PlayCardAction,
  registry: GameContentRegistry,
  rng: Rng
): StageResult<{ readonly state: CombatState; readonly events: readonly GameEvent[] }> => {
  const effectResult = resolveCardEffects(
    openingStage.state,
    openingStage.effects,
    {
      sourceId: PLAYER_COMBATANT_ID,
      targetId: action.targetId,
      cardInstanceId: context.cardInstance.id,
      cardId: context.cardInstance.cardId
    },
    registry,
    rng
  );
  if (!effectResult.ok) {
    return {
      ok: false,
      error: effectResult.errors[0] ?? error("effect_resolution_failed", "Card effect resolution failed.")
    };
  }

  const triggerResult = resolveTriggerQueueAfterEvents({
    stateBeforeEffects: openingStage.state,
    stateAfterEffects: effectResult.state,
    effectEvents: [...openingStage.events, ...effectResult.events],
    registry,
    rng
  });
  if (!triggerResult.ok) {
    return {
      ok: false,
      error: triggerResult.errors[0] ?? error("pet_modifier_trigger_failed", "Pet modifier trigger resolution failed.")
    };
  }

  return {
    ok: true,
    value: {
      state: triggerResult.state,
      events: [...effectResult.events, ...triggerResult.events]
    }
  };
};

const movePlayedCardToDiscard = (
  state: CombatState,
  cardInstance: CombatCardInstance
): StageResult<{ readonly state: CombatState; readonly event: GameEvent }> => {
  const moveResult = moveCardBetweenPiles(state, {
    cardInstanceId: cardInstance.id,
    from: "hand",
    to: "discard"
  });
  if (!moveResult.ok) {
    return { ok: false, error: moveResult.error };
  }

  return {
    ok: true,
    value: {
      state: moveResult.state,
      event: moveResult.event
    }
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
  const missingCardActorMonster = (monsters as readonly CombatantState[])
    .map((monster) => input.registry.monsters.find((monsterDefinition) => monsterDefinition.id === monster.definitionId))
    .find((monsterDefinition) => !monsterDefinition?.cardGame);
  if (missingCardActorMonster) {
    return rejectCreate(
      input,
      error(
        "missing_monster_card_actor",
        `Monster '${missingCardActorMonster.id}' must define cardActor/cardGame data for v0.5 combat.`,
        "registry.monsters.cardGame"
      )
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
    runNodeId: input.runNodeId,
    encounterId: input.encounterId,
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
    plannedMonsterAbilities: [],
    monsterCardStates: [],
    cardActors: [
      createPlayerCardActor(PLAYER_COMBATANT_ID, cardInstances, shuffledDrawPile, {
        openingHandSize: input.openingHandSize ?? DEFAULT_OPENING_HAND_SIZE,
        drawPerTurn: DEFAULT_DRAW_PER_TURN,
        maxHandSize: DEFAULT_MAX_HAND_SIZE,
        maxEnergy: DEFAULT_MAX_ENERGY
      })
    ],
    cardInstances,
    drawPile: shuffledDrawPile,
    hand: [],
    discardPile: [],
    exhaustPile: [],
    energy: DEFAULT_MAX_ENERGY,
    maxEnergy: DEFAULT_MAX_ENERGY,
    events: initialEvents
  };
  initialState = projectCombatStateFromCardActors(initialState);

  const openingHandSize = input.openingHandSize ?? DEFAULT_OPENING_HAND_SIZE;
  const drawResult = drawCards(initialState, openingHandSize, rng);
  if (!drawResult.ok) {
    return drawResult;
  }

  const intentResult = chooseMonsterIntents(drawResult.state, input.registry, rng, { opening: true });
  if (!intentResult.ok) {
    return rejectCreate(input, intentResult.errors[0] ?? error("monster_intent_selection_failed", "Monster intent selection failed."));
  }

  const turnStarted: GameEvent = { type: "TurnStarted", turnNumber: 1, actorId: PLAYER_COMBATANT_ID };
  initialState = appendEvents(intentResult.state, [turnStarted]);

  return {
    ok: true,
    state: initialState,
    events: [...initialEvents, ...drawResult.events, ...intentResult.events, turnStarted],
    errors: []
  };
};

export const playCard = (
  state: CombatState,
  action: PlayCardAction,
  registry: GameContentRegistry,
  rng: Rng
): GameActionResult<CombatState> => {
  const originalState = state;
  state = projectCombatStateFromCardActors(state);
  const actionContract = buildCardActionContract(
    state,
    { cardInstanceId: action.cardInstanceId, targetId: action.targetId, mode: "submit" },
    registry
  );
  if (!actionContract.playable) {
    return reject(
      originalState,
      actionContract.actionError ?? error("card_not_playable", actionContract.unplayableReason ?? "Card is not playable.")
    );
  }

  const playableCard = resolvePlayableCardContext(state, action, registry);
  if (!playableCard.ok) {
    return reject(originalState, playableCard.error);
  }

  const openingStage = resolveCardOpeningStage(state, playableCard.value, registry, rng);
  if (!openingStage.ok) {
    return reject(originalState, openingStage.error);
  }

  const effectStage = resolveCardEffectStage(openingStage.value, playableCard.value, action, registry, rng);
  if (!effectStage.ok) {
    return reject(originalState, effectStage.error);
  }

  const finalMove = movePlayedCardToDiscard(effectStage.value.state, playableCard.value.cardInstance);
  if (!finalMove.ok) {
    return reject(originalState, finalMove.error);
  }

  const replanResult = finalMove.value.state.phase === "player_turn" && canReplanEnemyPlans(finalMove.value.state)
    ? chooseMonsterIntents(finalMove.value.state, registry, rng, { replanOnly: true })
    : undefined;
  if (replanResult && !replanResult.ok) {
    return reject(originalState, replanResult.errors[0] ?? error("monster_replan_failed", "Enemy plan recompute failed after player action."));
  }
  const planChanged = replanResult
    ? enemyPlanSignature(finalMove.value.state) !== enemyPlanSignature(replanResult.state)
    : false;
  const nextState = planChanged && replanResult ? replanResult.state : finalMove.value.state;
  const replanEvents = planChanged ? replanResult?.events ?? [] : [];

  return {
    ok: true,
    state: nextState,
    events: [
      ...openingStage.value.events,
      ...effectStage.value.events,
      finalMove.value.event,
      ...replanEvents
    ],
    errors: []
  };
};

export const endPlayerTurn = (
  state: CombatState,
  options?: { readonly registry: GameContentRegistry; readonly rng: Rng }
): GameActionResult<CombatState> => {
  const originalState = state;
  state = projectCombatStateFromCardActors(state);
  if (state.phase !== "player_turn") {
    return reject(originalState, error("invalid_phase", "Only the player turn can be ended by this action.", "phase"));
  }

  const statusResult = processEndOfTurnStatuses(state, state.player.id, options);
  if (!statusResult.ok) {
    return reject(state, statusResult.errors[0] ?? error("status_resolution_failed", "Status resolution failed."));
  }

  if (statusResult.state.phase === "won" || statusResult.state.phase === "lost") {
    return { ok: true, state: statusResult.state, events: statusResult.events, errors: [] };
  }

  const turnEnded: GameEvent = {
    type: "TurnEnded",
    turnNumber: state.turnNumber,
    actorId: state.player.id
  };
  const events = [...statusResult.events, turnEnded];
  const nextState = appendEvents(
    {
      ...statusResult.state,
      phase: "enemy_turn",
      retainedCardInstanceIds: [],
      intentVisibilityOverrides: (statusResult.state.intentVisibilityOverrides ?? []).filter((override) =>
        override.expires !== "endOfPlayerTurn"
      )
    },
    [turnEnded]
  );

  return { ok: true, state: nextState, events, errors: [] };
};

export const startPlayerTurn = (
  state: CombatState,
  rng: Rng,
  registry?: GameContentRegistry
): GameActionResult<CombatState> => {
  const originalState = state;
  if (state.phase === "won" || state.phase === "lost") {
    return reject(state, error("combat_already_ended", "A new player turn cannot start after combat has ended.", "phase"));
  }

  state = projectCombatStateFromCardActors(state);

  if (state.phase !== "enemy_turn") {
    return reject(originalState, error("invalid_phase", "A player turn can only start after the enemy turn.", "phase"));
  }

  const statusResult = processStartOfTurnStatuses(
    state,
    state.player.id,
    registry ? { registry, rng } : undefined
  );
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
  const baseState = {
    ...resetTurnPetModifierUsage(state),
    phase: "player_turn" as const,
    activeActorId: state.player.id,
    turnNumber: state.turnNumber + 1,
    player: { ...state.player, block: 0 }
  };
  const playerActor = findPlayerCardActor(baseState);
  const stateWithRefilledActor = playerActor
    ? projectCombatStateFromCardActors(updateCardActor(baseState, {
        ...playerActor,
        energy: playerActor.energyRefill
      }))
    : { ...baseState, energy: state.maxEnergy };
  const nextState = appendEvents(stateWithRefilledActor, [turnStarted]);
  const drawResult = drawCards(nextState, playerActor?.drawPerTurn ?? DEFAULT_DRAW_PER_TURN, rng);
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

    const statusResult = processStartOfTurnStatuses(nextState, monster.id, { registry, rng });
    if (!statusResult.ok) {
      return reject(originalState, statusResult.errors[0] ?? error("status_resolution_failed", "Status resolution failed."));
    }

    nextState = statusResult.state;
    events.push(...statusResult.events);

    if (nextState.phase === "won" || nextState.phase === "lost") {
      return { ok: true, state: nextState, events, errors: [] };
    }
  }

  for (const monster of getEnemyActionOrder(nextState)) {
    const monsterDefinition = findMonsterDefinition(registry, monster);
    if (!monsterDefinition) {
      return reject(
        originalState,
        error("missing_monster_definition", `Monster combatant '${monster.id}' has no registered definition.`, "registry.monsters")
      );
    }

    const planned = finalizePlannedMonsterAbility(registry, monsterDefinition, monster.id, nextState);
    if ("code" in planned) {
      return reject(originalState, planned);
    }
    nextState = planned.state;
    events.push(...planned.events);

    for (const plannedStep of planned.sequence) {
      const abilityPlayedEvent: GameEvent = {
        type: "MonsterAbilityPlayed",
        monsterId: monster.id,
        abilityId: plannedStep.ability.id,
        intentId: plannedStep.intent.id
      };
      const resolvedEvent: GameEvent = {
        type: "MonsterIntentResolved",
        monsterId: monster.id,
        intentId: plannedStep.intent.id
      };
      const resolutionEvents = [abilityPlayedEvent, resolvedEvent];
      nextState = appendEvents({ ...nextState, activeActorId: monster.id }, resolutionEvents);
      events.push(...resolutionEvents);

      const effectResult = resolveEffects(
        nextState,
        plannedStep.ability.effects,
        {
          sourceId: monster.id,
          defaultTargetId: nextState.player.id,
          intentId: plannedStep.intent.id
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

      const enemyCardResolvedEvent: GameEvent | undefined = plannedStep.cardInstanceId
        ? {
            type: "EnemyCardResolved",
            monsterId: monster.id,
            cardInstanceId: plannedStep.cardInstanceId,
            abilityId: plannedStep.ability.id,
            intentId: plannedStep.intent.id
          }
        : undefined;
      const stateAfterResolutionEvent = enemyCardResolvedEvent
        ? appendEvents(effectResult.state, [enemyCardResolvedEvent])
        : effectResult.state;
      const discardResult = plannedStep.cardInstanceId
        ? resolveDiscardSinglePlannedMonsterCard(stateAfterResolutionEvent, monster.id, plannedStep.cardInstanceId)
        : { state: stateAfterResolutionEvent, events: [] };
      nextState = appendEvents(discardResult.state, discardResult.events);
      nextState = {
        ...nextState,
        intentVisibilityOverrides: (nextState.intentVisibilityOverrides ?? []).filter((override) =>
          !(override.expires === "afterEnemyAction" && override.monsterCombatantId === monster.id)
        )
      };
      events.push(...effectResult.events, ...(enemyCardResolvedEvent ? [enemyCardResolvedEvent] : []), ...discardResult.events);

      const outcomeResult = checkCombatOutcome(nextState);
      nextState = outcomeResult.state;
      events.push(...outcomeResult.events);

      if (nextState.phase === "won" || nextState.phase === "lost") {
        return { ok: true, state: nextState, events, errors: [] };
      }
    }
  }

  const clearedIntentState = { ...nextState, monsterIntents: [], plannedMonsterAbilities: [] };
  const playerStatusResult = processStartOfTurnStatuses(clearedIntentState, clearedIntentState.player.id, { registry, rng });
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
