import { enemyCardInstanceId, type CombatantId, type EnemyCardInstanceId, type MonsterAbilityId } from "../ids";
import type { GameActionError, GameActionResult } from "../model/action";
import type { ActiveMonsterIntent, CardActorState, CombatMonsterCardState, CombatState, MonsterCardZone, PlannedMonsterAbility } from "../model/combat";
import type { GameEvent } from "../model/event";
import type {
  MonsterAbilityDefinition,
  MonsterDefinition,
  MonsterIntentDefinition
} from "../model/monster";
import type { GameContentRegistry } from "../model/registry";
import { ENEMY_TEAM_ID, findCardActor, getPlannedActorCardInstanceIds, replaceCardActorsAndProject } from "./card-actors";
import type { Rng } from "./rng";

type IntentSelectionCandidate = {
  readonly monster: CombatState["monsters"][number];
  readonly monsterDefinition: MonsterDefinition;
  readonly intentPool: readonly ResolvedIntentSelection[];
};

type ResolvedIntentSelection = {
  readonly intent: MonsterIntentDefinition;
  readonly ability: MonsterAbilityDefinition;
};

type MonsterCardPlanResult = {
  readonly selected?: ResolvedIntentSelection;
  readonly selectedCardInstanceId?: EnemyCardInstanceId;
  readonly planMode?: CombatMonsterCardState["planned"]["planMode"];
  readonly cardState?: CombatMonsterCardState;
  readonly cardActor?: CardActorState;
  readonly events: readonly GameEvent[];
};

type MonsterIntentPlanningOptions = {
  readonly opening?: boolean;
  readonly replanOnly?: boolean;
  readonly plannedByLeader?: boolean;
};

type PlannedMonsterSelection = {
  readonly monster: CombatState["monsters"][number];
  readonly monsterDefinition: MonsterDefinition;
  readonly intent: MonsterIntentDefinition;
  readonly ability: MonsterAbilityDefinition;
  readonly cardPlan: MonsterCardPlanResult;
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

const appendEvents = (state: CombatState, events: readonly GameEvent[]): CombatState => ({
  ...state,
  events: [...state.events, ...events]
});

const removeFirst = <T>(items: readonly T[], item: T): readonly T[] => {
  const index = items.indexOf(item);
  return index === -1 ? items : [...items.slice(0, index), ...items.slice(index + 1)];
};

const emptyPlan = (monsterDefinition: MonsterDefinition): CombatMonsterCardState["planned"] => ({
  planMode: monsterDefinition.cardGame?.defaultPlanMode ?? "locked",
  candidateCardInstanceIds: []
});

const emptyPlanForMode = (
  planMode: CombatMonsterCardState["planned"]["planMode"]
): CombatMonsterCardState["planned"] => ({
  planMode,
  candidateCardInstanceIds: []
});

const getPlannedCardInstanceIds = (
  plan: CombatMonsterCardState["planned"]
): readonly EnemyCardInstanceId[] => [
  ...(plan.lockedCardInstanceId ? [plan.lockedCardInstanceId] : []),
  ...plan.candidateCardInstanceIds
];

const createMonsterCardInstances = (
  monsterCombatantId: CombatantId,
  monsterDefinition: MonsterDefinition
): CombatMonsterCardState["cardInstances"] =>
  (monsterDefinition.cardGame?.deck ?? []).flatMap((entry) =>
    Array.from({ length: entry.copies }, (_, copyIndex) => ({
      id: enemyCardInstanceId(`${monsterCombatantId}:enemy-card:${entry.abilityId}:${copyIndex}`),
      abilityId: entry.abilityId
    }))
  );

const getExistingCardState = (
  state: CombatState,
  monsterCombatantId: CombatantId,
  monsterDefinition: MonsterDefinition
): CombatMonsterCardState | undefined => {
  const actor = findCardActor(state, monsterCombatantId);
  if (actor?.actorKind === "enemy") {
    return {
      monsterCombatantId,
      handSize: actor.maxHandSize,
      planSlots: getMonsterCardPlanSlots(monsterDefinition),
      cardInstances: actor.cardInstances
        .filter((cardInstance): cardInstance is typeof cardInstance & { readonly abilityId: MonsterAbilityId } =>
          cardInstance.abilityId !== undefined
        )
        .map((cardInstance) => ({
          id: cardInstance.id as EnemyCardInstanceId,
          abilityId: cardInstance.abilityId
        })),
      drawPile: actor.drawPile as readonly EnemyCardInstanceId[],
      hand: actor.hand as readonly EnemyCardInstanceId[],
      planned: {
        planMode: actor.planned.planMode ?? monsterDefinition.cardGame?.defaultPlanMode ?? "locked",
        ...(actor.planned.lockedCardInstanceId ? { lockedCardInstanceId: actor.planned.lockedCardInstanceId as EnemyCardInstanceId } : {}),
        candidateCardInstanceIds: actor.planned.candidateCardInstanceIds as readonly EnemyCardInstanceId[]
      },
      discardPile: actor.discardPile as readonly EnemyCardInstanceId[],
      exhaustPile: actor.exhaustPile as readonly EnemyCardInstanceId[]
    };
  }

  return state.monsterCardStates?.find((cardState) => cardState.monsterCombatantId === monsterCombatantId);
};

const getMonsterCardHandSize = (monsterDefinition: MonsterDefinition): number =>
  monsterDefinition.cardGame?.maxHandSize ?? monsterDefinition.cardGame?.handSize ?? 0;

const getMonsterOpeningHandSize = (monsterDefinition: MonsterDefinition): number =>
  monsterDefinition.cardGame?.openingHandSize ?? monsterDefinition.cardGame?.handSize ?? 0;

const getMonsterDrawPerTurn = (monsterDefinition: MonsterDefinition): number =>
  monsterDefinition.cardGame?.drawPerTurn ?? 0;

const getMonsterMaxEnergy = (monsterDefinition: MonsterDefinition): number =>
  monsterDefinition.cardGame?.maxEnergy ?? monsterDefinition.cardGame?.planSlots ?? 0;

const getMonsterEnergyRefill = (monsterDefinition: MonsterDefinition): number =>
  monsterDefinition.cardGame?.energyRefill ?? getMonsterMaxEnergy(monsterDefinition);

const getMonsterCardPlanSlots = (monsterDefinition: MonsterDefinition): number =>
  monsterDefinition.cardGame?.planSlots ?? 0;

export const getEnemyCardCost = (
  monsterDefinition: MonsterDefinition,
  abilityId: MonsterAbilityId | undefined
): number =>
  abilityId
    ? monsterDefinition.cardGame?.deck.find((entry) => entry.abilityId === abilityId)?.cost ?? 1
    : 1;

const createMonsterCardState = (
  monsterCombatantId: CombatantId,
  monsterDefinition: MonsterDefinition,
  rng: Rng
): { readonly cardState: CombatMonsterCardState; readonly events: readonly GameEvent[] } => {
  const cardInstances = createMonsterCardInstances(monsterCombatantId, monsterDefinition);
  const drawPile = rng.shuffle(cardInstances.map((cardInstance) => cardInstance.id));

  return {
    cardState: {
      monsterCombatantId,
      handSize: getMonsterCardHandSize(monsterDefinition),
      planSlots: getMonsterCardPlanSlots(monsterDefinition),
      cardInstances,
      drawPile,
      hand: [],
      planned: emptyPlan(monsterDefinition),
      discardPile: [],
      exhaustPile: []
    },
    events: drawPile.length > 0
      ? [{
          type: "EnemyDeckShuffled",
          monsterId: monsterCombatantId,
          from: "discard",
          to: "draw",
          count: drawPile.length
        }]
      : []
  };
};

const createEnemyCardActorFromCardState = (
  cardState: CombatMonsterCardState,
  monsterDefinition: MonsterDefinition
): CardActorState => ({
  actorId: cardState.monsterCombatantId,
  ownerCombatantId: cardState.monsterCombatantId,
  actorKind: "enemy",
  side: "enemySide",
  teamId: ENEMY_TEAM_ID,
  controllerKind: monsterDefinition.cardGame?.teamRole === "leader" ||
    monsterDefinition.cardGame?.canPlanAllies === true ||
    monsterDefinition.cardGame?.canChooseTeamOrder === true
    ? "leaderHeuristic"
    : "heuristicAi",
  cardInstances: cardState.cardInstances.map((cardInstance) => ({
    id: cardInstance.id,
    ownerActorId: cardState.monsterCombatantId,
    abilityId: cardInstance.abilityId
  })),
  drawPile: cardState.drawPile,
  hand: cardState.hand,
  planned: {
    planMode: cardState.planned.planMode,
    ...(cardState.planned.lockedCardInstanceId ? { lockedCardInstanceId: cardState.planned.lockedCardInstanceId } : {}),
    candidateCardInstanceIds: cardState.planned.candidateCardInstanceIds
  },
  playArea: [],
  discardPile: cardState.discardPile,
  exhaustPile: cardState.exhaustPile,
  removedPile: [],
  openingHandSize: getMonsterOpeningHandSize(monsterDefinition),
  drawPerTurn: getMonsterDrawPerTurn(monsterDefinition),
  maxHandSize: getMonsterCardHandSize(monsterDefinition),
  maxEnergy: getMonsterMaxEnergy(monsterDefinition),
  energy: Math.max(
    0,
    getMonsterEnergyRefill(monsterDefinition) - getPlannedCardInstanceIds(cardState.planned).reduce((total, cardInstanceId) =>
      total + getEnemyCardCost(monsterDefinition, getCardAbilityId(cardState, cardInstanceId)),
    0)
  ),
  energyRefill: getMonsterEnergyRefill(monsterDefinition),
  unplayedHandPolicy: "retain"
});

const getCardAbilityId = (
  cardState: CombatMonsterCardState,
  cardInstanceId: EnemyCardInstanceId
): MonsterAbilityId | undefined =>
  cardState.cardInstances.find((cardInstance) => cardInstance.id === cardInstanceId)?.abilityId;

const getCardZone = (
  cardState: CombatMonsterCardState,
  cardInstanceId: EnemyCardInstanceId
): MonsterCardZone | undefined => {
  if (cardState.drawPile.includes(cardInstanceId)) {
    return "draw";
  }

  if (cardState.hand.includes(cardInstanceId)) {
    return "hand";
  }

  if (getPlannedCardInstanceIds(cardState.planned).includes(cardInstanceId)) {
    return "planned";
  }

  if (cardState.discardPile.includes(cardInstanceId)) {
    return "discard";
  }

  if (cardState.exhaustPile.includes(cardInstanceId)) {
    return "exhaust";
  }

  return undefined;
};

const createEnemyCardMovedEvent = (
  cardState: CombatMonsterCardState,
  cardInstanceId: EnemyCardInstanceId,
  from: MonsterCardZone,
  to: MonsterCardZone
): GameEvent | undefined => {
  const abilityId = getCardAbilityId(cardState, cardInstanceId);

  return abilityId
    ? {
        type: "EnemyCardMoved",
        monsterId: cardState.monsterCombatantId,
        cardInstanceId,
        abilityId,
        from,
        to
      }
    : undefined;
};

const drawMonsterCardHand = (
  cardState: CombatMonsterCardState,
  monsterDefinition: MonsterDefinition,
  rng: Rng,
  drawCount: number
): { readonly cardState: CombatMonsterCardState; readonly events: readonly GameEvent[] } => {
  const maxHandSize = getMonsterCardHandSize(monsterDefinition);
  let drawPile = [...cardState.drawPile];
  let hand = [...cardState.hand];
  let discardPile = [...cardState.discardPile];
  const events: GameEvent[] = [];
  let drawnCount = 0;

  for (const plannedCardInstanceId of getPlannedCardInstanceIds(cardState.planned)) {
    if (hand.length >= maxHandSize) {
      break;
    }

    hand = [...hand, plannedCardInstanceId];
    const movedEvent = createEnemyCardMovedEvent(cardState, plannedCardInstanceId, "planned", "hand");
    if (movedEvent) {
      events.push(movedEvent);
    }
  }

  while (hand.length < maxHandSize && drawnCount < drawCount) {
    if (drawPile.length === 0) {
      if (discardPile.length === 0) {
        break;
      }

      events.push({
        type: "EnemyDeckShuffled",
        monsterId: cardState.monsterCombatantId,
        from: "discard",
        to: "draw",
        count: discardPile.length
      });
      drawPile = rng.shuffle(discardPile);
      discardPile = [];
    }

    const [drawn, ...remainingDrawPile] = drawPile;
    if (!drawn) {
      break;
    }

    hand = [...hand, drawn];
    drawnCount += 1;
    drawPile = remainingDrawPile;
    const movedEvent = createEnemyCardMovedEvent(cardState, drawn, "draw", "hand");
    if (movedEvent) {
      events.push(movedEvent);
    }
  }

  return {
    cardState: {
      ...cardState,
      drawPile,
      hand,
      planned: emptyPlan(monsterDefinition),
      discardPile
    },
    events
  };
};

const findCardInstanceForAbility = (
  cardState: CombatMonsterCardState,
  abilityId: MonsterAbilityId
): EnemyCardInstanceId | undefined =>
  cardState.hand.find((cardInstanceId) =>
    getCardAbilityId(cardState, cardInstanceId) === abilityId
  );

const removeCardInstanceFromZones = (
  cardState: CombatMonsterCardState,
  cardInstanceId: EnemyCardInstanceId
): CombatMonsterCardState => {
  const remainingPlanned = getPlannedCardInstanceIds(cardState.planned).filter((plannedCardInstanceId) =>
    plannedCardInstanceId !== cardInstanceId
  );
  const [lockedCardInstanceId, ...candidateCardInstanceIds] = remainingPlanned;

  return {
    ...cardState,
    hand: removeFirst(cardState.hand, cardInstanceId),
    drawPile: removeFirst(cardState.drawPile, cardInstanceId),
    discardPile: removeFirst(cardState.discardPile, cardInstanceId),
    planned: {
      planMode: cardState.planned.planMode,
      ...(lockedCardInstanceId ? { lockedCardInstanceId } : {}),
      candidateCardInstanceIds
    }
  };
};

const removeCardInstancesFromZones = (
  cardState: CombatMonsterCardState,
  cardInstanceIds: readonly EnemyCardInstanceId[]
): CombatMonsterCardState =>
  cardInstanceIds.reduce(removeCardInstanceFromZones, cardState);

const releasePlannedCardsToHand = (
  cardState: CombatMonsterCardState
): { readonly cardState: CombatMonsterCardState; readonly events: readonly GameEvent[] } => {
  const plannedCardInstanceIds = getPlannedCardInstanceIds(cardState.planned);
  if (plannedCardInstanceIds.length === 0) {
    return { cardState, events: [] };
  }

  const hand = [
    ...cardState.hand,
    ...plannedCardInstanceIds.filter((cardInstanceId) => !cardState.hand.includes(cardInstanceId))
  ];
  const events = plannedCardInstanceIds
    .map((cardInstanceId) => createEnemyCardMovedEvent(cardState, cardInstanceId, "planned", "hand"))
    .filter((event): event is GameEvent => event !== undefined);

  return {
    cardState: {
      ...cardState,
      hand,
      planned: emptyPlanForMode(cardState.planned.planMode)
    },
    events
  };
};

const getTeamLeaderCandidate = (
  candidates: readonly IntentSelectionCandidate[]
): IntentSelectionCandidate | undefined =>
  candidates.find(({ monsterDefinition }) =>
    monsterDefinition.cardGame?.teamRole === "leader" ||
    monsterDefinition.cardGame?.canPlanAllies === true ||
    monsterDefinition.cardGame?.canChooseTeamOrder === true
  );

const intentPriority = (ability: MonsterAbilityDefinition): number => {
  if (ability.intentType === "debuff") {
    return 0;
  }

  if (ability.intentType === "attack" || ability.tags.includes("attack")) {
    return 1;
  }

  if (ability.intentType === "special") {
    return 2;
  }

  if (ability.intentType === "charge") {
    return 3;
  }

  if (ability.intentType === "block" || ability.intentType === "buff") {
    return 4;
  }

  return 5;
};

const selectHeldCardPlan = (
  cardState: CombatMonsterCardState,
  intentPool: readonly ResolvedIntentSelection[],
  plannedByLeader: boolean
): { readonly cardInstanceId: EnemyCardInstanceId; readonly selected: ResolvedIntentSelection } | undefined => {
  const candidates = cardState.hand.flatMap((cardInstanceId) => {
    const abilityId = getCardAbilityId(cardState, cardInstanceId);
    const selected = intentPool.find((candidate) => candidate.ability.id === abilityId);
    return selected ? [{ cardInstanceId, selected }] : [];
  });

  if (!plannedByLeader) {
    return candidates[0];
  }

  return [...candidates].sort((left, right) => {
    const priorityDelta = intentPriority(left.selected.ability) - intentPriority(right.selected.ability);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return left.cardInstanceId.localeCompare(right.cardInstanceId);
  })[0];
};

const planTeamOrder = (
  plannedSelections: readonly PlannedMonsterSelection[],
  leader?: IntentSelectionCandidate
): { readonly order: readonly CombatantId[]; readonly events: readonly GameEvent[] } => {
  if (!leader?.monsterDefinition.cardGame?.canChooseTeamOrder) {
    return { order: plannedSelections.map((selection) => selection.monster.id), events: [] };
  }

  const orderedSelections = [...plannedSelections].sort((left, right) => {
    const priorityDelta = intentPriority(left.ability) - intentPriority(right.ability);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    const leftIsLeader = left.monster.id === leader.monster.id ? 1 : 0;
    const rightIsLeader = right.monster.id === leader.monster.id ? 1 : 0;
    if (leftIsLeader !== rightIsLeader) {
      return leftIsLeader - rightIsLeader;
    }

    return left.monster.id.localeCompare(right.monster.id);
  });
  const order = orderedSelections.map((selection) => selection.monster.id);

  return {
    order,
    events: [{
      type: "EnemyTeamPlanCreated",
      leaderMonsterId: leader.monster.id,
      monsterOrder: order,
      reason: "leader_team_order"
    }]
  };
};

const selectMonsterCardPlan = (
  state: CombatState,
  monster: CombatState["monsters"][number],
  monsterDefinition: MonsterDefinition,
  intentPool: readonly ResolvedIntentSelection[],
  rng: Rng,
  options: MonsterIntentPlanningOptions
): MonsterCardPlanResult => {
  if (!monsterDefinition.cardGame) {
    return { events: [] };
  }

  const existingCardState = getExistingCardState(state, monster.id, monsterDefinition);
  const created = existingCardState
    ? { cardState: existingCardState, events: [] }
    : createMonsterCardState(monster.id, monsterDefinition, rng);
  const createdCardState = {
    ...created.cardState,
    handSize: getMonsterCardHandSize(monsterDefinition),
    planSlots: getMonsterCardPlanSlots(monsterDefinition)
  };
  const replanned = options.replanOnly === true
    ? releasePlannedCardsToHand(createdCardState)
    : { cardState: createdCardState, events: [] };
  const isOpeningDraw = existingCardState === undefined || options.opening === true;
  const drawn = drawMonsterCardHand(
    replanned.cardState,
    monsterDefinition,
    rng,
    options.replanOnly === true
      ? 0
      : isOpeningDraw ? getMonsterOpeningHandSize(monsterDefinition) : getMonsterDrawPerTurn(monsterDefinition)
  );
  const drawnState = drawn.cardState;
  const heldPlan = selectHeldCardPlan(drawnState, intentPool, options.plannedByLeader === true);
  const selectedCardInstanceId = heldPlan?.cardInstanceId;
  const selected = heldPlan?.selected;

  if (!selected || !selectedCardInstanceId) {
    return {
      cardState: drawnState,
      cardActor: createEnemyCardActorFromCardState(drawnState, monsterDefinition),
      events: [...created.events, ...replanned.events, ...drawn.events]
    };
  }
  const selectedSourceZone = getCardZone(drawnState, selectedCardInstanceId) ?? "hand";
  const stateWithoutSelected = removeCardInstanceFromZones(drawnState, selectedCardInstanceId);
  const cardGame = monsterDefinition.cardGame;
  const selectedPlanMode = selected.ability.planMode ?? cardGame.defaultPlanMode;
  const remainingEnergy = Math.max(0, getMonsterEnergyRefill(monsterDefinition) - getEnemyCardCost(monsterDefinition, selected.ability.id));
  const candidateCardInstanceIds = selectedPlanMode === "adaptive" || selectedPlanMode === "charging"
    ? stateWithoutSelected.hand.reduce<EnemyCardInstanceId[]>((candidateIds, cardInstanceId) => {
        if (candidateIds.length >= Math.max(0, cardGame.planSlots - 1)) {
          return candidateIds;
        }

        const abilityId = getCardAbilityId(stateWithoutSelected, cardInstanceId);
        const nextCost = getEnemyCardCost(monsterDefinition, abilityId);
        const spent = candidateIds.reduce((total, candidateId) =>
          total + getEnemyCardCost(monsterDefinition, getCardAbilityId(stateWithoutSelected, candidateId)),
        0);

        return spent + nextCost <= remainingEnergy ? [...candidateIds, cardInstanceId] : candidateIds;
      }, [])
    : [];
  const stateWithoutPlannedCards = removeCardInstancesFromZones(stateWithoutSelected, candidateCardInstanceIds);
  const plannedCardEvents = [selectedCardInstanceId, ...candidateCardInstanceIds]
    .map((cardInstanceId, index) => {
      const from = index === 0
        ? selectedSourceZone
        : getCardZone(stateWithoutSelected, cardInstanceId) ?? "hand";
      return createEnemyCardMovedEvent(drawnState, cardInstanceId, from, "planned");
    })
    .filter((event): event is GameEvent => event !== undefined);

  return {
    selected,
    selectedCardInstanceId,
    planMode: selectedPlanMode,
    cardState: {
      ...stateWithoutPlannedCards,
      planned: {
        planMode: selectedPlanMode,
        lockedCardInstanceId: selectedCardInstanceId,
        candidateCardInstanceIds
      }
    },
    cardActor: createEnemyCardActorFromCardState({
      ...stateWithoutPlannedCards,
      planned: {
        planMode: selectedPlanMode,
        lockedCardInstanceId: selectedCardInstanceId,
        candidateCardInstanceIds
      }
    }, monsterDefinition),
    events: [
      ...created.events,
      ...replanned.events,
      ...drawn.events,
      ...plannedCardEvents,
      {
        type: "EnemyPlanCreated",
        monsterId: monster.id,
        abilityId: selected.ability.id,
        intentId: selected.intent.id,
        cardInstanceId: selectedCardInstanceId,
        candidateCardInstanceIds,
        planMode: selectedPlanMode
      }
    ]
  };
};

export const resolveDiscardPlannedMonsterCard = (
  state: CombatState,
  monsterCombatantId: CombatantId
): { readonly state: CombatState; readonly events: readonly GameEvent[] } => {
  const events: GameEvent[] = [];
  const monsterCardStates = (state.monsterCardStates ?? []).map((cardState) => {
    if (cardState.monsterCombatantId !== monsterCombatantId) {
      return cardState;
    }

    for (const plannedCardInstanceId of getPlannedCardInstanceIds(cardState.planned)) {
      const movedEvent = createEnemyCardMovedEvent(cardState, plannedCardInstanceId, "planned", "discard");
      if (movedEvent) {
        events.push(movedEvent);
      }
    }

    return {
      ...cardState,
      planned: emptyPlanForMode(cardState.planned.planMode),
      discardPile: [...cardState.discardPile, ...getPlannedCardInstanceIds(cardState.planned)]
    };
  });
  let updatedActor = false;
  const cardActors = state.cardActors.map((actor) => {
    if (actor.actorId !== monsterCombatantId) {
      return actor;
    }

    updatedActor = true;
    const plannedCardInstanceIds = getPlannedActorCardInstanceIds(actor.planned);
    return {
      ...actor,
      planned: { planMode: actor.planned.planMode, candidateCardInstanceIds: [] },
      discardPile: [...actor.discardPile, ...plannedCardInstanceIds]
    };
  });

  return {
    state: updatedActor
      ? replaceCardActorsAndProject({ ...state, monsterCardStates }, cardActors)
      : { ...state, monsterCardStates },
    events
  };
};

export const discardPlannedMonsterCard = (
  state: CombatState,
  monsterCombatantId: CombatantId
): CombatState => resolveDiscardPlannedMonsterCard(state, monsterCombatantId).state;

export const resolveDiscardSinglePlannedMonsterCard = (
  state: CombatState,
  monsterCombatantId: CombatantId,
  cardInstanceId: EnemyCardInstanceId
): { readonly state: CombatState; readonly events: readonly GameEvent[] } => {
  const events: GameEvent[] = [];
  const monsterCardStates = (state.monsterCardStates ?? []).map((cardState) => {
    if (cardState.monsterCombatantId !== monsterCombatantId) {
      return cardState;
    }

    const movedEvent = createEnemyCardMovedEvent(cardState, cardInstanceId, "planned", "discard");
    if (movedEvent) {
      events.push(movedEvent);
    }

    const remainingPlanned = getPlannedCardInstanceIds(cardState.planned).filter((plannedCardInstanceId) =>
      plannedCardInstanceId !== cardInstanceId
    );
    const [lockedCardInstanceId, ...candidateCardInstanceIds] = remainingPlanned;

    return {
      ...cardState,
      planned: {
        planMode: cardState.planned.planMode,
        ...(lockedCardInstanceId ? { lockedCardInstanceId } : {}),
        candidateCardInstanceIds
      },
      discardPile: [...cardState.discardPile, cardInstanceId]
    };
  });
  let updatedActor = false;
  const cardActors = state.cardActors.map((actor) => {
    if (actor.actorId !== monsterCombatantId) {
      return actor;
    }

    updatedActor = true;
    const remainingPlanned = getPlannedActorCardInstanceIds(actor.planned).filter((plannedCardInstanceId) =>
      plannedCardInstanceId !== cardInstanceId
    );
    const [lockedCardInstanceId, ...candidateCardInstanceIds] = remainingPlanned;
    return {
      ...actor,
      planned: {
        ...(actor.planned.planMode ? { planMode: actor.planned.planMode } : {}),
        ...(lockedCardInstanceId ? { lockedCardInstanceId } : {}),
        candidateCardInstanceIds
      },
      discardPile: [...actor.discardPile, cardInstanceId]
    };
  });

  return {
    state: updatedActor
      ? replaceCardActorsAndProject({ ...state, monsterCardStates }, cardActors)
      : { ...state, monsterCardStates },
    events
  };
};

export const findMonsterDefinition = (
  registry: GameContentRegistry,
  monster: { readonly definitionId?: CombatState["monsters"][number]["definitionId"] }
): MonsterDefinition | undefined =>
  monster.definitionId
    ? registry.monsters.find((monsterDefinition) => monsterDefinition.id === monster.definitionId)
    : undefined;

export const findMonsterIntent = (
  monsterDefinition: MonsterDefinition,
  monsterCombatantId: CombatantId,
  state: CombatState
): MonsterIntentDefinition | GameActionError => {
  if (!Array.isArray(monsterDefinition.intentPool)) {
    return error("missing_monster_intent_pool", `Monster '${monsterDefinition.id}' has no intent pool.`, "intentPool");
  }

  const activeIntent = state.monsterIntents.find((intent) => intent.monsterCombatantId === monsterCombatantId);
  if (!activeIntent) {
    return error("missing_monster_intent", `Monster '${monsterCombatantId}' has no selected intent.`, "monsterIntents");
  }

  return (
    monsterDefinition.intentPool.find((intent) => intent.id === activeIntent.intentId) ??
    error(
      "missing_monster_intent",
      `Intent '${activeIntent.intentId}' is not registered for monster '${monsterDefinition.id}'.`,
      "monsterIntents"
    )
  );
};

export const findMonsterAbility = (
  registry: GameContentRegistry,
  monsterDefinition: MonsterDefinition,
  intent: MonsterIntentDefinition
): MonsterAbilityDefinition | GameActionError => {
  if (!intent.abilityId) {
    return {
      id: intent.id as unknown as MonsterAbilityDefinition["id"],
      name: intent.description,
      intentType: intent.type,
      description: intent.description,
      tags: [],
      effects: intent.effects
    };
  }

  const ability = (registry.monsterAbilities ?? []).find((candidate) => candidate.id === intent.abilityId);
  if (!ability) {
    return error(
      "missing_monster_ability",
      `Monster intent '${intent.id}' references missing monster ability '${intent.abilityId}'.`,
      "registry.monsterAbilities"
    );
  }

  if (monsterDefinition.abilityIds && !monsterDefinition.abilityIds.includes(ability.id)) {
    return error(
      "monster_ability_not_owned",
      `Monster '${monsterDefinition.id}' cannot plan ability '${ability.id}'.`,
      "abilityIds"
    );
  }

  return ability;
};

const getCardInstanceAbility = (
  cardState: CombatMonsterCardState | undefined,
  cardInstanceId: EnemyCardInstanceId | undefined
): MonsterAbilityId | undefined =>
  cardInstanceId && cardState
    ? cardState.cardInstances.find((cardInstance) => cardInstance.id === cardInstanceId)?.abilityId
    : undefined;

const hasTag = (ability: MonsterAbilityDefinition, tag: string): boolean => ability.tags.includes(tag);

const getMonsterStatusStacks = (monster: CombatState["monsters"][number], statusId: string): number =>
  monster.statuses.find((status) => status.statusId === statusId)?.stacks ?? 0;

type AdaptiveCandidate = {
  readonly cardInstanceId?: EnemyCardInstanceId;
  readonly intent: MonsterIntentDefinition;
  readonly ability: MonsterAbilityDefinition;
};

const projectFinalizedMonsterPlan = (
  state: CombatState,
  monsterCombatantId: CombatantId,
  intent: MonsterIntentDefinition,
  ability: MonsterAbilityDefinition,
  cardInstanceId: EnemyCardInstanceId | undefined,
  planMode: CombatMonsterCardState["planned"]["planMode"] | undefined
): CombatState =>
  replaceCardActorsAndProject({
    ...state,
    monsterIntents: [
      ...state.monsterIntents.filter((activeIntent) => activeIntent.monsterCombatantId !== monsterCombatantId),
      { monsterCombatantId, intentId: intent.id }
    ],
    plannedMonsterAbilities: [
      ...(state.plannedMonsterAbilities ?? []).filter((planned) => planned.monsterCombatantId !== monsterCombatantId),
      {
        monsterCombatantId,
        intentId: intent.id,
        abilityId: ability.id,
        ...(cardInstanceId ? { cardInstanceId } : {}),
        ...(planMode ? { planMode } : {})
      }
    ]
  }, state.cardActors);

const pickCandidateByPredicate = (
  candidates: readonly AdaptiveCandidate[],
  predicate: (candidate: AdaptiveCandidate) => boolean
): AdaptiveCandidate | undefined => candidates.find(predicate);

const resolveAdaptiveCandidate = (
  state: CombatState,
  monster: CombatState["monsters"][number],
  monsterDefinition: MonsterDefinition,
  candidates: readonly AdaptiveCandidate[],
  fallback: AdaptiveCandidate
): { readonly candidate: AdaptiveCandidate; readonly reason: string } => {
  const adaptiveRuleIds = monsterDefinition.cardGame?.adaptiveRuleIds ?? [];

  for (const ruleId of adaptiveRuleIds) {
    if (ruleId === "prefer_shelter_when_burning" && getMonsterStatusStacks(monster, "burn") >= 2) {
      const candidate = pickCandidateByPredicate(candidates, (item) => hasTag(item.ability, "cleanse") || item.ability.intentType === "block");
      if (candidate) {
        return { candidate, reason: ruleId };
      }
    }

    if (ruleId === "phase_after_half_hp" && monster.maxHp > 0 && monster.hp / monster.maxHp <= 0.5) {
      const candidate = pickCandidateByPredicate(candidates, (item) => hasTag(item.ability, "phase") || item.ability.intentType === "charge" || item.ability.intentType === "special");
      if (candidate) {
        return { candidate, reason: ruleId };
      }
    }

    if (ruleId === "prefer_charge_when_safe" && state.player.block >= 8) {
      const candidate = pickCandidateByPredicate(candidates, (item) => item.ability.intentType === "charge");
      if (candidate) {
        return { candidate, reason: ruleId };
      }
    }

    if (ruleId === "prefer_guard_if_player_overblocks" && state.player.block >= 5) {
      const candidate = pickCandidateByPredicate(candidates, (item) => item.ability.intentType === "block" || hasTag(item.ability, "block"));
      if (candidate) {
        return { candidate, reason: ruleId };
      }
    }

    if (ruleId === "prefer_attack_if_player_low_block" && state.player.block <= 4) {
      const candidate = pickCandidateByPredicate(candidates, (item) => item.ability.intentType === "attack" || hasTag(item.ability, "attack"));
      if (candidate) {
        return { candidate, reason: ruleId };
      }
    }
  }

  return { candidate: fallback, reason: "locked_or_fallback" };
};

export type FinalizedMonsterPlan = {
  readonly intent: MonsterIntentDefinition;
  readonly ability: MonsterAbilityDefinition;
  readonly cardInstanceId?: EnemyCardInstanceId;
  readonly planMode?: CombatMonsterCardState["planned"]["planMode"];
  readonly sequence: readonly {
    readonly intent: MonsterIntentDefinition;
    readonly ability: MonsterAbilityDefinition;
    readonly cardInstanceId?: EnemyCardInstanceId;
  }[];
  readonly events: readonly GameEvent[];
  readonly state: CombatState;
};

export const finalizePlannedMonsterAbility = (
  registry: GameContentRegistry,
  monsterDefinition: MonsterDefinition,
  monsterCombatantId: CombatState["monsters"][number]["id"],
  state: CombatState
): FinalizedMonsterPlan | GameActionError => {
  const monster = state.monsters.find((candidate) => candidate.id === monsterCombatantId);
  const actor = findCardActor(state, monsterCombatantId);
  if (!actor || actor.actorKind !== "enemy") {
    return error(
      "missing_monster_card_actor",
      `Monster '${monsterCombatantId}' has no enemy Card Actor plan.`,
      "cardActors"
    );
  }

  const planMode = actor.planned.planMode;
  const plannedCardInstanceIds = getPlannedActorCardInstanceIds(actor.planned) as readonly EnemyCardInstanceId[];
  if (!Array.isArray(monsterDefinition.intentPool)) {
    return error("missing_monster_intent_pool", `Monster '${monsterDefinition.id}' has no intent pool.`, "intentPool");
  }

  const candidates = plannedCardInstanceIds
    .map<AdaptiveCandidate | undefined>((cardInstanceIdValue) => {
      const abilityId = actor.cardInstances.find((cardInstance) => cardInstance.id === cardInstanceIdValue)?.abilityId;
      const ability = abilityId
        ? registry.monsterAbilities?.find((candidate) => candidate.id === abilityId)
        : undefined;
      const intent = ability
        ? monsterDefinition.intentPool.find((candidate) => candidate.abilityId === ability.id)
        : undefined;

      return ability && intent
        ? { cardInstanceId: cardInstanceIdValue, intent, ability }
        : undefined;
    })
    .filter((candidate): candidate is AdaptiveCandidate => candidate !== undefined);
  const fallback = candidates[0];

  if (!fallback) {
    return error(
      "missing_planned_monster_ability",
      `Monster '${monsterCombatantId}' has no legal planned Card Actor ability.`,
      "cardActors.planned"
    );
  }

  const totalPlannedCost = candidates.reduce((total, candidate) =>
    total + getEnemyCardCost(monsterDefinition, candidate.ability.id),
  0);
  if (totalPlannedCost > actor.energyRefill) {
    return error(
      "insufficient_enemy_energy",
      `Monster '${monsterCombatantId}' planned ${totalPlannedCost} energy of cards with only ${actor.energyRefill} available.`,
      "cardActors.planned"
    );
  }

  if (!monster || planMode !== "adaptive") {
    const finalizedEvent: GameEvent = {
      type: "EnemyPlanFinalized",
      monsterId: monsterCombatantId,
      abilityId: fallback.ability.id,
      intentId: fallback.intent.id,
      ...(fallback.cardInstanceId ? { cardInstanceId: fallback.cardInstanceId } : {}),
      ...(planMode ? { planMode } : {}),
      changed: false
    };
    const projectedState = projectFinalizedMonsterPlan(
      state,
      monsterCombatantId,
      fallback.intent,
      fallback.ability,
      fallback.cardInstanceId,
      planMode
    );
    const nextState = appendEvents(projectedState, [finalizedEvent]);

    return {
      intent: fallback.intent,
      ability: fallback.ability,
      cardInstanceId: fallback.cardInstanceId,
      planMode,
      sequence: candidates,
      events: [finalizedEvent],
      state: nextState
    };
  }

  const resolved = resolveAdaptiveCandidate(state, monster, monsterDefinition, candidates, fallback);

  if (resolved.candidate.ability.id === fallback.ability.id && resolved.candidate.intent.id === fallback.intent.id) {
    const finalizedEvent: GameEvent = {
      type: "EnemyPlanFinalized",
      monsterId: monsterCombatantId,
      abilityId: fallback.ability.id,
      intentId: fallback.intent.id,
      ...(resolved.candidate.cardInstanceId ? { cardInstanceId: resolved.candidate.cardInstanceId } : {}),
      ...(planMode ? { planMode } : {}),
      changed: false
    };
    const projectedState = projectFinalizedMonsterPlan(
      state,
      monsterCombatantId,
      fallback.intent,
      fallback.ability,
      fallback.cardInstanceId,
      planMode
    );
    const nextState = appendEvents(projectedState, [finalizedEvent]);

    return {
      intent: fallback.intent,
      ability: fallback.ability,
      cardInstanceId: resolved.candidate.cardInstanceId,
      planMode,
      sequence: candidates,
      events: [finalizedEvent],
      state: nextState
    };
  }

  const changedEvent: GameEvent = {
    type: "EnemyPlanChanged",
    monsterId: monsterCombatantId,
    fromAbilityId: fallback.ability.id,
    toAbilityId: resolved.candidate.ability.id,
    fromIntentId: fallback.intent.id,
    toIntentId: resolved.candidate.intent.id,
    reason: resolved.reason
  };
  const finalizedEvent: GameEvent = {
    type: "EnemyPlanFinalized",
    monsterId: monsterCombatantId,
    abilityId: resolved.candidate.ability.id,
    intentId: resolved.candidate.intent.id,
    ...(resolved.candidate.cardInstanceId ? { cardInstanceId: resolved.candidate.cardInstanceId } : {}),
    ...(planMode ? { planMode } : {}),
    changed: true
  };
  const nextState = appendEvents(projectFinalizedMonsterPlan(
    state,
    monsterCombatantId,
    resolved.candidate.intent,
    resolved.candidate.ability,
    resolved.candidate.cardInstanceId,
    planMode
  ), [changedEvent, finalizedEvent]);

  return {
    intent: resolved.candidate.intent,
    ability: resolved.candidate.ability,
    cardInstanceId: resolved.candidate.cardInstanceId,
    planMode,
    sequence: [
      resolved.candidate,
      ...candidates.filter((candidate) => candidate.cardInstanceId !== resolved.candidate.cardInstanceId)
    ],
    events: [changedEvent, finalizedEvent],
    state: nextState
  };
};

export const findPlannedMonsterAbility = (
  registry: GameContentRegistry,
  monsterDefinition: MonsterDefinition,
  monsterCombatantId: CombatState["monsters"][number]["id"],
  state: CombatState
): { readonly intent: MonsterIntentDefinition; readonly ability: MonsterAbilityDefinition } | GameActionError => {
  const intent = findMonsterIntent(monsterDefinition, monsterCombatantId, state);
  if ("code" in intent) {
    return intent;
  }

  const hasPlannedAbilityStorage = Object.prototype.hasOwnProperty.call(state, "plannedMonsterAbilities");
  const plannedAbility = hasPlannedAbilityStorage
    ? (state.plannedMonsterAbilities ?? []).find((planned) =>
        planned.monsterCombatantId === monsterCombatantId &&
        planned.intentId === intent.id
      )
    : undefined;
  if (hasPlannedAbilityStorage && !plannedAbility && intent.abilityId) {
    return error(
      "missing_planned_monster_ability",
      `Monster '${monsterCombatantId}' has selected intent '${intent.id}' without a planned ability.`,
      "plannedMonsterAbilities"
    );
  }

  if (plannedAbility && intent.abilityId && plannedAbility.abilityId !== intent.abilityId) {
    return error(
      "planned_monster_ability_mismatch",
      `Monster '${monsterCombatantId}' planned ability '${plannedAbility.abilityId}' but intent '${intent.id}' references '${intent.abilityId}'.`,
      "plannedMonsterAbilities"
    );
  }

  const ability = findMonsterAbility(registry, monsterDefinition, intent);
  if ("code" in ability) {
    return ability;
  }

  if (plannedAbility && plannedAbility.abilityId !== ability.id) {
    return error(
      "planned_monster_ability_mismatch",
      `Monster '${monsterCombatantId}' planned ability '${plannedAbility.abilityId}' but resolved '${ability.id}'.`,
      "plannedMonsterAbilities"
    );
  }

  return { intent, ability };
};

export const chooseMonsterIntents = (
  state: CombatState,
  registry: GameContentRegistry,
  rng: Rng,
  options: MonsterIntentPlanningOptions = {}
): GameActionResult<CombatState> => {
  const candidates: IntentSelectionCandidate[] = [];
  const activeIntents: ActiveMonsterIntent[] = [];
  const plannedAbilities: PlannedMonsterAbility[] = [];
  const monsterCardStates = [...(state.monsterCardStates ?? [])];
  const cardActors = [...state.cardActors];
  const events: GameEvent[] = [];
  const plannedSelections: PlannedMonsterSelection[] = [];

  for (const monster of state.monsters) {
    if (!monster.alive) {
      continue;
    }

    const monsterDefinition = findMonsterDefinition(registry, monster);
    if (!monsterDefinition) {
      return reject(
        state,
        error("missing_monster_definition", `Monster combatant '${monster.id}' has no registered definition.`, "registry.monsters")
      );
    }

    if (!Array.isArray(monsterDefinition.intentPool)) {
      return reject(
        state,
        error("missing_monster_intent_pool", `Monster '${monsterDefinition.id}' has no intent pool.`, "intentPool")
      );
    }

    if (monsterDefinition.intentPool.length === 0) {
      return reject(
        state,
        error("empty_monster_intent_pool", `Monster '${monsterDefinition.id}' has no available intents.`, "intentPool")
      );
    }

    if (!monsterDefinition.cardGame) {
      return reject(
        state,
        error(
          "missing_monster_card_actor",
          `Monster '${monsterDefinition.id}' must define cardActor/cardGame data for v0.5 combat.`,
          "registry.monsters.cardGame"
        )
      );
    }

    const resolvedIntentPool: ResolvedIntentSelection[] = [];
    for (const intent of monsterDefinition.intentPool) {
      const ability = findMonsterAbility(registry, monsterDefinition, intent);
      if ("code" in ability) {
        return reject(state, ability);
      }

      resolvedIntentPool.push({ intent, ability });
    }

    candidates.push({
      monster,
      monsterDefinition,
      intentPool: resolvedIntentPool
    });
  }

  const leader = getTeamLeaderCandidate(candidates);
  const plannedByLeader = leader?.monsterDefinition.cardGame?.canPlanAllies === true;

  for (const { monster, monsterDefinition, intentPool } of candidates) {
    const cardPlan = selectMonsterCardPlan(
      state,
      monster,
      monsterDefinition,
      intentPool,
      rng,
      { ...options, plannedByLeader }
    );
    const selected = cardPlan.selected;
    if (!selected) {
      return reject(
        state,
        error(
          "missing_monster_intent",
          `Monster '${monsterDefinition.id}' has no legal card-backed intent to plan.`,
          "cardActors.hand"
        )
      );
    }
    const intent = selected.intent;
    const ability = selected.ability;
    if (cardPlan.cardState) {
      const existingIndex = monsterCardStates.findIndex((cardState) => cardState.monsterCombatantId === monster.id);
      if (existingIndex >= 0) {
        monsterCardStates[existingIndex] = cardPlan.cardState;
      } else {
        monsterCardStates.push(cardPlan.cardState);
      }
    }
    if (cardPlan.cardActor) {
      const existingActorIndex = cardActors.findIndex((actor) => actor.actorId === cardPlan.cardActor?.actorId);
      if (existingActorIndex >= 0) {
        cardActors[existingActorIndex] = cardPlan.cardActor;
      } else {
        cardActors.push(cardPlan.cardActor);
      }
    }

    activeIntents.push({ monsterCombatantId: monster.id, intentId: intent.id });
    plannedAbilities.push({
      monsterCombatantId: monster.id,
      intentId: intent.id,
      abilityId: ability.id,
      ...(cardPlan.selectedCardInstanceId ? { cardInstanceId: cardPlan.selectedCardInstanceId } : {}),
      ...(cardPlan.planMode ? { planMode: cardPlan.planMode } : {})
    });
    plannedSelections.push({ monster, monsterDefinition, intent, ability, cardPlan });
    events.push(...cardPlan.events);
    events.push({
      type: "MonsterAbilityPlanned",
      monsterId: monster.id,
      abilityId: ability.id,
      intentId: intent.id,
      intentType: ability.intentType,
      description: ability.description
    });
    events.push({
      type: "MonsterIntentSet",
      monsterId: monster.id,
      intentId: intent.id,
      intentType: ability.intentType,
      description: ability.description
    });
  }

  const teamPlan = planTeamOrder(plannedSelections, leader);
  events.push(...teamPlan.events);

  const persistentIntentVisibilityOverrides = (state.intentVisibilityOverrides ?? []).flatMap((override) => {
    if (override.expires === "combat" || override.expires === "never" || override.expires === "afterEnemyAction") {
      return [override];
    }

    if (override.expires === "nextPlan") {
      return [{ ...override, expires: "currentPlan" as const }];
    }

    return [];
  });
  const nextState = appendEvents(replaceCardActorsAndProject({
    ...state,
    monsterIntents: activeIntents,
    plannedMonsterAbilities: plannedAbilities,
    enemyPlanOrder: teamPlan.order,
    monsterCardStates,
    intentVisibilityOverrides: persistentIntentVisibilityOverrides
  }, cardActors), events);
  return { ok: true, state: nextState, events, errors: [] };
};
