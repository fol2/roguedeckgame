import { enemyCardInstanceId, type CombatantId, type EnemyCardInstanceId, type MonsterAbilityId } from "../ids";
import type { GameActionError, GameActionResult } from "../model/action";
import type { ActiveMonsterIntent, CombatMonsterCardState, CombatState, MonsterCardZone, PlannedMonsterAbility } from "../model/combat";
import type { GameEvent } from "../model/event";
import type {
  MonsterAbilityDefinition,
  MonsterDefinition,
  MonsterIntentDefinition,
  MonsterIntentScheduleCondition
} from "../model/monster";
import type { GameContentRegistry } from "../model/registry";
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
  readonly events: readonly GameEvent[];
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
  monsterCombatantId: CombatantId
): CombatMonsterCardState | undefined =>
  state.monsterCardStates?.find((cardState) => cardState.monsterCombatantId === monsterCombatantId);

const getMonsterCardHandSize = (monsterDefinition: MonsterDefinition): number =>
  monsterDefinition.cardGame?.handSize ?? 0;

const getMonsterCardPlanSlots = (monsterDefinition: MonsterDefinition): number =>
  monsterDefinition.cardGame?.planSlots ?? 0;

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
  rng: Rng
): { readonly cardState: CombatMonsterCardState; readonly events: readonly GameEvent[] } => {
  const handSize = monsterDefinition.cardGame?.handSize ?? 0;
  let drawPile = [...cardState.drawPile];
  let hand = [...cardState.hand];
  let discardPile = [...cardState.discardPile];
  const events: GameEvent[] = [];

  for (const plannedCardInstanceId of getPlannedCardInstanceIds(cardState.planned)) {
    discardPile = [...discardPile, plannedCardInstanceId];
    const movedEvent = createEnemyCardMovedEvent(cardState, plannedCardInstanceId, "planned", "discard");
    if (movedEvent) {
      events.push(movedEvent);
    }
  }

  while (hand.length < handSize) {
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
  [...cardState.hand, ...cardState.drawPile, ...cardState.discardPile].find((cardInstanceId) =>
    getCardAbilityId(cardState, cardInstanceId) === abilityId
  );

const removeCardInstanceFromZones = (
  cardState: CombatMonsterCardState,
  cardInstanceId: EnemyCardInstanceId
): CombatMonsterCardState => ({
  ...cardState,
  hand: removeFirst(cardState.hand, cardInstanceId),
  drawPile: removeFirst(cardState.drawPile, cardInstanceId),
  discardPile: removeFirst(cardState.discardPile, cardInstanceId)
});

const removeCardInstancesFromZones = (
  cardState: CombatMonsterCardState,
  cardInstanceIds: readonly EnemyCardInstanceId[]
): CombatMonsterCardState =>
  cardInstanceIds.reduce(removeCardInstanceFromZones, cardState);

const selectMonsterCardPlan = (
  state: CombatState,
  monster: CombatState["monsters"][number],
  monsterDefinition: MonsterDefinition,
  intentPool: readonly ResolvedIntentSelection[],
  scheduledIntent: MonsterIntentDefinition | undefined,
  rng: Rng
): MonsterCardPlanResult => {
  if (!monsterDefinition.cardGame) {
    return { events: [] };
  }

  const existingCardState = getExistingCardState(state, monster.id);
  const created = existingCardState
    ? { cardState: existingCardState, events: [] }
    : createMonsterCardState(monster.id, monsterDefinition, rng);
  const createdCardState = {
    ...created.cardState,
    handSize: getMonsterCardHandSize(monsterDefinition),
    planSlots: getMonsterCardPlanSlots(monsterDefinition)
  };
  const drawn = drawMonsterCardHand(createdCardState, monsterDefinition, rng);
  const drawnState = drawn.cardState;
  const scheduledSelection = scheduledIntent
    ? intentPool.find((candidate) => candidate.intent.id === scheduledIntent.id)
    : undefined;
  const selectedCardInstanceId = scheduledSelection
    ? findCardInstanceForAbility(drawnState, scheduledSelection.ability.id)
    : rng.choice(drawnState.hand);
  const selectedAbilityId = selectedCardInstanceId
    ? getCardAbilityId(drawnState, selectedCardInstanceId)
    : scheduledSelection?.ability.id;
  const selected = selectedAbilityId
    ? intentPool.find((candidate) => candidate.ability.id === selectedAbilityId)
    : scheduledSelection;

  if (!selected || !selectedCardInstanceId) {
    return { cardState: drawnState, events: drawn.events };
  }
  const selectedSourceZone = getCardZone(drawnState, selectedCardInstanceId) ?? "hand";
  const stateWithoutSelected = removeCardInstanceFromZones(drawnState, selectedCardInstanceId);
  const selectedPlanMode = selected.ability.planMode ?? monsterDefinition.cardGame.defaultPlanMode;
  const candidateCardInstanceIds = selectedPlanMode === "adaptive" ||
    selectedPlanMode === "charging"
    ? stateWithoutSelected.hand.slice(0, Math.max(0, monsterDefinition.cardGame.planSlots - 1))
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
    events: [
      ...created.events,
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

  return {
    state: { ...state, monsterCardStates },
    events
  };
};

export const discardPlannedMonsterCard = (
  state: CombatState,
  monsterCombatantId: CombatantId
): CombatState => resolveDiscardPlannedMonsterCard(state, monsterCombatantId).state;

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

    if (ruleId === "prefer_guard_if_player_overblocks" && state.player.block >= 8) {
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
  const planned = findPlannedMonsterAbility(registry, monsterDefinition, monsterCombatantId, state);
  if ("code" in planned) {
    return planned;
  }

  const cardState = getExistingCardState(state, monsterCombatantId);
  const storedPlan = state.plannedMonsterAbilities?.find((candidate) =>
    candidate.monsterCombatantId === monsterCombatantId &&
    candidate.intentId === planned.intent.id
  );
  const planMode = cardState?.planned.planMode ?? storedPlan?.planMode;

  if (!monster || !cardState || planMode !== "adaptive") {
    const finalizedEvent: GameEvent = {
      type: "EnemyPlanFinalized",
      monsterId: monsterCombatantId,
      abilityId: planned.ability.id,
      intentId: planned.intent.id,
      ...(storedPlan?.cardInstanceId ? { cardInstanceId: storedPlan.cardInstanceId } : {}),
      ...(planMode ? { planMode } : {}),
      changed: false
    };
    const nextState = appendEvents(state, [finalizedEvent]);

    return {
      ...planned,
      cardInstanceId: storedPlan?.cardInstanceId,
      planMode,
      events: [finalizedEvent],
      state: nextState
    };
  }

  const plannedCardInstanceIds = getPlannedCardInstanceIds(cardState.planned);
  const candidates = plannedCardInstanceIds
    .map<AdaptiveCandidate | undefined>((cardInstanceIdValue) => {
      const abilityId = getCardInstanceAbility(cardState, cardInstanceIdValue);
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

  const fallback = candidates.find((candidate) =>
    candidate.ability.id === planned.ability.id &&
    candidate.intent.id === planned.intent.id
  );

  if (!fallback) {
    return error(
      "adaptive_plan_outside_candidate_set",
      `Monster '${monsterCombatantId}' planned adaptive ability '${planned.ability.id}' outside its candidate set.`,
      "monsterCardStates.planned"
    );
  }

  const resolved = resolveAdaptiveCandidate(state, monster, monsterDefinition, candidates, fallback);

  if (resolved.candidate.ability.id === planned.ability.id && resolved.candidate.intent.id === planned.intent.id) {
    const finalizedEvent: GameEvent = {
      type: "EnemyPlanFinalized",
      monsterId: monsterCombatantId,
      abilityId: planned.ability.id,
      intentId: planned.intent.id,
      ...(resolved.candidate.cardInstanceId ? { cardInstanceId: resolved.candidate.cardInstanceId } : {}),
      ...(planMode ? { planMode } : {}),
      changed: false
    };
    const nextState = appendEvents(state, [finalizedEvent]);

    return {
      ...planned,
      cardInstanceId: resolved.candidate.cardInstanceId,
      planMode,
      events: [finalizedEvent],
      state: nextState
    };
  }

  const changedEvent: GameEvent = {
    type: "EnemyPlanChanged",
    monsterId: monsterCombatantId,
    fromAbilityId: planned.ability.id,
    toAbilityId: resolved.candidate.ability.id,
    fromIntentId: planned.intent.id,
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
  const plannedAbilities = (state.plannedMonsterAbilities ?? []).map((candidate) =>
    candidate.monsterCombatantId === monsterCombatantId && candidate.intentId === planned.intent.id
      ? {
          monsterCombatantId,
          intentId: resolved.candidate.intent.id,
          abilityId: resolved.candidate.ability.id,
          ...(resolved.candidate.cardInstanceId ? { cardInstanceId: resolved.candidate.cardInstanceId } : {}),
          ...(planMode ? { planMode } : {})
        }
      : candidate
  );
  const monsterIntents = state.monsterIntents.map((candidate) =>
    candidate.monsterCombatantId === monsterCombatantId && candidate.intentId === planned.intent.id
      ? { monsterCombatantId, intentId: resolved.candidate.intent.id }
      : candidate
  );
  const nextState = appendEvents({ ...state, monsterIntents, plannedMonsterAbilities: plannedAbilities }, [changedEvent, finalizedEvent]);

  return {
    intent: resolved.candidate.intent,
    ability: resolved.candidate.ability,
    cardInstanceId: resolved.candidate.cardInstanceId,
    planMode,
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

const scheduleConditionMatches = (
  condition: MonsterIntentScheduleCondition,
  monster: CombatState["monsters"][number],
  state: CombatState
): boolean => {
  if (condition.type === "hpAtOrBelowRatio") {
    return monster.maxHp > 0 && monster.hp / monster.maxHp <= condition.ratio;
  }

  if (condition.type === "turnNumberModulo") {
    return condition.modulo > 0 && state.turnNumber % condition.modulo === condition.equals;
  }

  return false;
};

const chooseScheduledIntent = (
  monsterDefinition: MonsterDefinition,
  monster: CombatState["monsters"][number],
  state: CombatState,
  scheduledTurnNumber: number
): MonsterIntentDefinition | undefined => {
  const schedule = monsterDefinition.intentSchedule;
  if (!schedule || schedule.length === 0) {
    return undefined;
  }

  const conditionalStep = schedule.find((step) =>
    step.conditions !== undefined &&
    step.conditions.length > 0 &&
    step.conditions.every((condition) => scheduleConditionMatches(condition, monster, state))
  );
  const scheduleIndex = Math.max(0, scheduledTurnNumber - 1) % schedule.length;
  const scheduledStep = conditionalStep ?? schedule[scheduleIndex];

  return monsterDefinition.intentPool.find((intent) => intent.id === scheduledStep?.intentId);
};

export const chooseMonsterIntents = (
  state: CombatState,
  registry: GameContentRegistry,
  rng: Rng,
  options?: { readonly scheduledTurnNumber?: number }
): GameActionResult<CombatState> => {
  const candidates: IntentSelectionCandidate[] = [];
  const activeIntents: ActiveMonsterIntent[] = [];
  const plannedAbilities: PlannedMonsterAbility[] = [];
  const monsterCardStates = [...(state.monsterCardStates ?? [])];
  const events: GameEvent[] = [];

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

  for (const { monster, monsterDefinition, intentPool } of candidates) {
    const scheduledIntent = chooseScheduledIntent(
      monsterDefinition,
      monster,
      state,
      options?.scheduledTurnNumber ?? state.turnNumber
    );
    const cardPlan = selectMonsterCardPlan(state, monster, monsterDefinition, intentPool, scheduledIntent, rng);
    const selected = cardPlan.cardState
      ? cardPlan.selected
      : (
          scheduledIntent
            ? intentPool.find((candidate) => candidate.intent.id === scheduledIntent.id)
            : rng.choice(intentPool)
        );
    if (!selected) {
      return reject(
        state,
        error(
          "missing_monster_intent",
          `Scheduled intent '${String(scheduledIntent?.id)}' is not registered for monster '${monsterDefinition.id}'.`,
          "intentSchedule"
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

    activeIntents.push({ monsterCombatantId: monster.id, intentId: intent.id });
    plannedAbilities.push({
      monsterCombatantId: monster.id,
      intentId: intent.id,
      abilityId: ability.id,
      ...(cardPlan.selectedCardInstanceId ? { cardInstanceId: cardPlan.selectedCardInstanceId } : {}),
      ...(cardPlan.planMode ? { planMode: cardPlan.planMode } : {})
    });
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

  const persistentIntentVisibilityOverrides = (state.intentVisibilityOverrides ?? []).flatMap((override) => {
    if (override.expires === "combat" || override.expires === "never" || override.expires === "afterEnemyAction") {
      return [override];
    }

    if (override.expires === "nextPlan") {
      return [{ ...override, expires: "currentPlan" as const }];
    }

    return [];
  });
  const nextState = appendEvents({
    ...state,
    monsterIntents: activeIntents,
    plannedMonsterAbilities: plannedAbilities,
    monsterCardStates,
    intentVisibilityOverrides: persistentIntentVisibilityOverrides
  }, events);
  return { ok: true, state: nextState, events, errors: [] };
};
