import type { CardId, CardInstanceId, CombatantId, EnemyCardInstanceId, MonsterAbilityId } from "../ids";
import type {
  CardActorCardInstanceId,
  CardActorPlanState,
  CardActorState,
  CombatMonsterCardInstance,
  CombatMonsterCardState,
  CombatState
} from "../model/combat";
import type { EnemyPlanMode } from "../model/monster";

export const PLAYER_TEAM_ID = "player";
export const ENEMY_TEAM_ID = "enemy";

const emptyPlan = (planMode?: EnemyPlanMode): CardActorPlanState => ({
  ...(planMode ? { planMode } : {}),
  candidateCardInstanceIds: []
});

export const getPlannedActorCardInstanceIds = (
  plan: CardActorPlanState
): readonly CardActorCardInstanceId[] => [
  ...(plan.lockedCardInstanceId ? [plan.lockedCardInstanceId] : []),
  ...plan.candidateCardInstanceIds
];

export const createPlayerCardActor = (
  ownerCombatantId: CombatantId,
  cardInstances: readonly { readonly id: CardInstanceId; readonly cardId: CardId }[],
  drawPile: readonly CardInstanceId[],
  options?: {
    readonly openingHandSize?: number;
    readonly drawPerTurn?: number;
    readonly maxHandSize?: number;
    readonly maxEnergy?: number;
    readonly energy?: number;
  }
): CardActorState => {
  const maxEnergy = options?.maxEnergy ?? 3;

  return {
    actorId: ownerCombatantId,
    ownerCombatantId,
    actorKind: "player",
    side: "playerSide",
    teamId: PLAYER_TEAM_ID,
    controllerKind: "human",
    cardInstances: cardInstances.map((cardInstance) => ({
      id: cardInstance.id,
      ownerActorId: ownerCombatantId,
      cardId: cardInstance.cardId
    })),
    drawPile,
    hand: [],
    planned: emptyPlan(),
    playArea: [],
    discardPile: [],
    exhaustPile: [],
    removedPile: [],
    openingHandSize: options?.openingHandSize ?? 5,
    drawPerTurn: options?.drawPerTurn ?? 3,
    maxHandSize: options?.maxHandSize ?? 10,
    maxEnergy,
    energy: options?.energy ?? maxEnergy,
    energyRefill: maxEnergy,
    unplayedHandPolicy: "retain"
  };
};

export const createEnemyCardActor = (
  ownerCombatantId: CombatantId,
  cardInstances: readonly CombatMonsterCardInstance[],
  drawPile: readonly EnemyCardInstanceId[],
  options: {
    readonly openingHandSize: number;
    readonly drawPerTurn: number;
    readonly maxHandSize: number;
    readonly maxEnergy: number;
    readonly energyRefill?: number;
    readonly planMode: EnemyPlanMode;
  }
): CardActorState => ({
  actorId: ownerCombatantId,
  ownerCombatantId,
  actorKind: "enemy",
  side: "enemySide",
  teamId: ENEMY_TEAM_ID,
  controllerKind: "heuristicAi",
  cardInstances: cardInstances.map((cardInstance) => ({
    id: cardInstance.id,
    ownerActorId: ownerCombatantId,
    abilityId: cardInstance.abilityId
  })),
  drawPile,
  hand: [],
  planned: emptyPlan(options.planMode),
  playArea: [],
  discardPile: [],
  exhaustPile: [],
  removedPile: [],
  openingHandSize: options.openingHandSize,
  drawPerTurn: options.drawPerTurn,
  maxHandSize: options.maxHandSize,
  maxEnergy: options.maxEnergy,
  energy: options.maxEnergy,
  energyRefill: options.energyRefill ?? options.maxEnergy,
  unplayedHandPolicy: "retain"
});

export const findPlayerCardActor = (state: CombatState): CardActorState | undefined =>
  state.cardActors.find((actor) => actor.actorKind === "player" && actor.ownerCombatantId === state.player.id);

export const findCardActor = (
  state: CombatState,
  actorId: CombatantId
): CardActorState | undefined =>
  state.cardActors.find((actor) => actor.actorId === actorId);

export const updateCardActor = (
  state: CombatState,
  actor: CardActorState
): CombatState => ({
  ...state,
  cardActors: state.cardActors.map((candidate) =>
    candidate.actorId === actor.actorId ? actor : candidate
  )
});

const removeFirst = <T>(items: readonly T[], item: T): readonly T[] => {
  const index = items.indexOf(item);
  return index < 0 ? items : [...items.slice(0, index), ...items.slice(index + 1)];
};

type ActorZone = "draw" | "hand" | "planned" | "discard" | "exhaust" | "removed";

const actorZoneCards = (actor: CardActorState, zone: ActorZone): readonly CardActorCardInstanceId[] => {
  if (zone === "draw") {
    return actor.drawPile;
  }

  if (zone === "hand") {
    return actor.hand;
  }

  if (zone === "planned") {
    return getPlannedActorCardInstanceIds(actor.planned);
  }

  if (zone === "discard") {
    return actor.discardPile;
  }

  if (zone === "exhaust") {
    return actor.exhaustPile;
  }

  return actor.removedPile;
};

const setActorZoneCards = (
  actor: CardActorState,
  zone: ActorZone,
  cards: readonly CardActorCardInstanceId[]
): CardActorState => {
  if (zone === "draw") {
    return { ...actor, drawPile: cards };
  }

  if (zone === "hand") {
    return { ...actor, hand: cards };
  }

  if (zone === "planned") {
    const [lockedCardInstanceId, ...candidateCardInstanceIds] = cards;
    return {
      ...actor,
      planned: {
        ...(actor.planned.planMode ? { planMode: actor.planned.planMode } : {}),
        ...(lockedCardInstanceId ? { lockedCardInstanceId } : {}),
        candidateCardInstanceIds
      }
    };
  }

  if (zone === "discard") {
    return { ...actor, discardPile: cards };
  }

  if (zone === "exhaust") {
    return { ...actor, exhaustPile: cards };
  }

  return { ...actor, removedPile: cards };
};

export const moveActorCard = (
  actor: CardActorState,
  cardInstanceId: CardActorCardInstanceId,
  from: ActorZone,
  to: ActorZone
): CardActorState | undefined => {
  const fromCards = actorZoneCards(actor, from);
  const nextFromCards = removeFirst(fromCards, cardInstanceId);
  if (nextFromCards === fromCards) {
    return undefined;
  }

  const actorWithoutCard = setActorZoneCards(actor, from, nextFromCards);
  const toCards = actorZoneCards(actorWithoutCard, to);
  return setActorZoneCards(actorWithoutCard, to, [...toCards, cardInstanceId]);
};

const asPlayerCardInstanceIds = (
  cards: readonly CardActorCardInstanceId[]
): readonly CardInstanceId[] =>
  cards as readonly CardInstanceId[];

const asEnemyCardInstanceIds = (
  cards: readonly CardActorCardInstanceId[]
): readonly EnemyCardInstanceId[] =>
  cards as readonly EnemyCardInstanceId[];

const projectMonsterCardStates = (
  state: CombatState
): readonly CombatMonsterCardState[] => {
  const legacyByMonster = new Map(
    (state.monsterCardStates ?? []).map((cardState) => [cardState.monsterCombatantId, cardState])
  );

  return state.cardActors
    .filter((actor) => actor.actorKind === "enemy")
    .map((actor) => {
      const legacy = legacyByMonster.get(actor.ownerCombatantId);
      const planMode = actor.planned.planMode ?? legacy?.planned.planMode ?? "locked";
      const cardInstances = actor.cardInstances
        .filter((cardInstance): cardInstance is typeof cardInstance & { readonly abilityId: MonsterAbilityId } =>
          cardInstance.abilityId !== undefined
        )
        .map((cardInstance) => ({
          id: cardInstance.id as EnemyCardInstanceId,
          abilityId: cardInstance.abilityId
        }));

      return {
        monsterCombatantId: actor.ownerCombatantId,
        handSize: actor.maxHandSize,
        planSlots: legacy?.planSlots ?? Math.max(1, actor.maxEnergy),
        cardInstances,
        drawPile: asEnemyCardInstanceIds(actor.drawPile),
        hand: asEnemyCardInstanceIds(actor.hand),
        planned: {
          planMode,
          ...(actor.planned.lockedCardInstanceId
            ? { lockedCardInstanceId: actor.planned.lockedCardInstanceId as EnemyCardInstanceId }
            : {}),
          candidateCardInstanceIds: asEnemyCardInstanceIds(actor.planned.candidateCardInstanceIds)
        },
        discardPile: asEnemyCardInstanceIds(actor.discardPile),
        exhaustPile: asEnemyCardInstanceIds(actor.exhaustPile)
      };
    });
};

export const projectCombatStateFromCardActors = (state: CombatState): CombatState => {
  const playerActor = findPlayerCardActor(state);
  if (!playerActor) {
    return state;
  }

  return {
    ...state,
    cardInstances: playerActor.cardInstances
      .filter((cardInstance): cardInstance is typeof cardInstance & { readonly cardId: CardId } =>
        cardInstance.cardId !== undefined
      )
      .map((cardInstance) => ({
        id: cardInstance.id as CardInstanceId,
        cardId: cardInstance.cardId,
        ownerId: playerActor.ownerCombatantId
      })),
    drawPile: asPlayerCardInstanceIds(playerActor.drawPile),
    hand: asPlayerCardInstanceIds(playerActor.hand),
    discardPile: asPlayerCardInstanceIds(playerActor.discardPile),
    exhaustPile: asPlayerCardInstanceIds(playerActor.exhaustPile),
    energy: playerActor.energy,
    maxEnergy: playerActor.maxEnergy,
    monsterCardStates: projectMonsterCardStates(state)
  };
};

export const replaceCardActorsAndProject = (
  state: CombatState,
  cardActors: readonly CardActorState[]
): CombatState =>
  projectCombatStateFromCardActors({ ...state, cardActors });
