import {
  cardInstanceId,
  type CardId,
  type CardInstanceId,
  type CombatantId,
  type EnemyCardInstanceId,
  type MonsterAbilityId,
  type MonsterIntentId
} from "../ids";
import type { GameActionError, GameActionResult } from "../model/action";
import type { CombatantTarget, EffectDefinition } from "../model/effect";
import type {
  CombatantState,
  CombatIntentVisibilityState,
  CombatMonsterCardState,
  CombatState,
  IntentVisibilityLevel,
  ScopeIntentDepth
} from "../model/combat";
import type { GameEvent } from "../model/event";
import type { GameContentRegistry } from "../model/registry";
import type { CombatStatusState } from "../model/status";
import { drawCards } from "./draw";
import { moveCardBetweenPiles } from "./card-piles";
import { getEffectDescriptor, type EffectResolverKey } from "./effect-descriptors";
import { getIntentVisibilityRank, resolveEffectiveIntentVisibilityLevel, shiftIntentVisibilityLevel } from "./intent-visibility";
import { checkCombatOutcome } from "./outcome";
import { resolvePetTargets } from "./pet-targets";
import type { Rng } from "./rng";
import { findStatusDefinition } from "./status-behaviours";

type EffectContext = {
  readonly sourceId: CombatantId;
  readonly targetId?: CombatantId;
  readonly defaultTargetId?: CombatantId;
  readonly cardInstanceId?: CardInstanceId;
  readonly cardId?: CardId;
  readonly intentId?: MonsterIntentId;
};

const error = (code: string, message: string, path?: string): GameActionError => ({
  code,
  message,
  path
});

const reject = (state: CombatState, actionError: GameActionError): GameActionResult<CombatState> => {
  const event: GameEvent = {
    type: "ActionRejected",
    code: actionError.code,
    message: actionError.message,
    path: actionError.path
  };

  return { ok: false, state, events: [event], errors: [actionError] };
};

const getCombatant = (state: CombatState, combatantId: CombatantId): CombatantState | undefined => {
  if (state.player.id === combatantId) {
    return state.player;
  }

  return state.monsters.find((monster) => monster.id === combatantId);
};

const updateCombatant = (
  state: CombatState,
  combatantId: CombatantId,
  update: (combatant: CombatantState) => CombatantState
): CombatState => {
  if (state.player.id === combatantId) {
    return { ...state, player: update(state.player) };
  }

  return {
    ...state,
    monsters: state.monsters.map((monster) => (monster.id === combatantId ? update(monster) : monster))
  };
};

const appendEvents = (state: CombatState, events: readonly GameEvent[]): CombatState => ({
  ...state,
  events: [...state.events, ...events]
});

const getPile = (state: CombatState, pile: "draw" | "hand" | "discard" | "exhaust"): readonly CardInstanceId[] => {
  if (pile === "draw") {
    return state.drawPile;
  }
  if (pile === "hand") {
    return state.hand;
  }
  if (pile === "discard") {
    return state.discardPile;
  }
  return state.exhaustPile;
};

const setPile = (
  state: CombatState,
  pile: "draw" | "hand" | "discard" | "exhaust",
  cards: readonly CardInstanceId[]
): CombatState => {
  if (pile === "draw") {
    return { ...state, drawPile: cards };
  }
  if (pile === "hand") {
    return { ...state, hand: cards };
  }
  if (pile === "discard") {
    return { ...state, discardPile: cards };
  }
  return { ...state, exhaustPile: cards };
};

const resolveCombatantTargets = (
  state: CombatState,
  sourceId: CombatantId,
  target: CombatantTarget,
  actionTargetId?: CombatantId
): readonly CombatantState[] | GameActionError => {
  if (target.type === "self") {
    const source = getCombatant(state, sourceId);
    return source
      ? [source]
      : error("invalid_source", `Source combatant '${sourceId}' does not exist.`, "sourceId");
  }

  if (target.type === "target") {
    const targetId = target.combatantId ?? actionTargetId;
    if (!targetId) {
      return error("missing_target", "This effect requires a target.", "targetId");
    }

    const combatant = getCombatant(state, targetId);
    if (!combatant) {
      return error("invalid_target", `Target combatant '${targetId}' does not exist.`, "targetId");
    }

    if (!combatant.alive) {
      return [];
    }

    return [combatant];
  }

  if (target.type === "allEnemies") {
    if (sourceId === state.player.id) {
      return state.monsters.filter((monster) => monster.alive);
    }

    return state.player.alive ? [state.player] : [];
  }

  if (target.type === "allAllies") {
    if (sourceId === state.player.id) {
      return state.player.alive ? [state.player] : [];
    }

    return state.monsters.filter((monster) => monster.alive);
  }

  return error("unknown_target", "Unknown combatant target.", "target");
};

const isActionError = (
  value: readonly CombatantState[] | GameActionError
): value is GameActionError => "code" in value;

export const applyDamage = (
  state: CombatState,
  sourceId: CombatantId,
  targetId: CombatantId,
  amount: number,
  options: { readonly ignoreBlock?: boolean } = {}
): { readonly state: CombatState; readonly events: readonly GameEvent[] } => {
  const target = getCombatant(state, targetId);
  if (!target || !target.alive) {
    return { state, events: [] };
  }

  const blocked = options.ignoreBlock ? 0 : Math.min(target.block, amount);
  const damage = Math.max(0, amount - blocked);
  const nextHp = Math.max(0, target.hp - damage);
  const wasAlive = target.alive;
  const isAlive = nextHp > 0;
  const events: GameEvent[] = [
    { type: "DamageDealt", sourceId, targetId, amount: damage, blocked }
  ];

  if (wasAlive && !isAlive) {
    events.push({ type: "CombatantDefeated", combatantId: targetId });
  }

  const nextState = updateCombatant(state, targetId, (combatant) => ({
    ...combatant,
    hp: nextHp,
    block: Math.max(0, combatant.block - blocked),
    alive: isAlive
  }));

  return { state: appendEvents(nextState, events), events };
};

const applyBlock = (
  state: CombatState,
  targetId: CombatantId,
  amount: number
): { readonly state: CombatState; readonly events: readonly GameEvent[] } => {
  const target = getCombatant(state, targetId);
  if (!target) {
    return { state, events: [] };
  }

  const total = target.block + amount;
  const event: GameEvent = { type: "BlockGained", targetId, amount, total };
  const nextState = updateCombatant(state, targetId, (combatant) => ({ ...combatant, block: total }));

  return { state: appendEvents(nextState, [event]), events: [event] };
};

const applyStatus = (
  state: CombatState,
  targetId: CombatantId,
  statusId: CombatStatusState["statusId"],
  stacks: number,
  duration: number | undefined,
  registry: GameContentRegistry
): { readonly state: CombatState; readonly events: readonly GameEvent[] } => {
  const target = getCombatant(state, targetId);
  if (!target) {
    return { state, events: [] };
  }

  const incomingDefinition = findStatusDefinition(registry, statusId);
  const blockingStatus = target.statuses.find((status) => {
    const statusDefinition = findStatusDefinition(registry, status.statusId);
    const behaviour = statusDefinition?.behaviour;
    if (behaviour?.type !== "statusImmunity") {
      return false;
    }

    return (behaviour.blocksStatusIds?.includes(statusId) ?? false) ||
      (incomingDefinition?.tags.some((tag) => behaviour.blocksTagsAny?.includes(tag) ?? false) ?? false);
  });
  if (blockingStatus) {
    const event: GameEvent = {
      type: "StatusApplicationBlocked",
      targetId,
      statusId,
      blockedByStatusId: blockingStatus.statusId
    };
    return { state: appendEvents(state, [event]), events: [event] };
  }

  const existing = target.statuses.find((status) => status.statusId === statusId);
  const stacking = incomingDefinition?.stacking;
  const resolveNextStacks = (currentStacks: number): number => {
    const added = currentStacks + stacks;
    return stacking?.maxStacks === undefined ? added : Math.min(stacking.maxStacks, added);
  };
  const resolveNextDuration = (currentDuration: number | undefined): number | undefined => {
    if (duration === undefined) {
      return currentDuration;
    }

    if (stacking?.durationPolicy === "replace") {
      return duration;
    }

    if (stacking?.durationPolicy === "keep") {
      return currentDuration ?? duration;
    }

    return Math.max(currentDuration ?? 0, duration);
  };
  const stacksBefore = existing?.stacks ?? 0;
  const stacksAfter = resolveNextStacks(stacksBefore);
  const appliedStacks = Math.max(0, stacksAfter - stacksBefore);
  const statuses = existing
    ? target.statuses.map((status) =>
        status.statusId === statusId
          ? {
              ...status,
              stacks: stacksAfter,
              duration: resolveNextDuration(status.duration)
            }
          : status
      )
    : [...target.statuses, { statusId, stacks: stacksAfter, ...(duration === undefined ? {} : { duration }) }];
  const event: GameEvent = { type: "StatusApplied", targetId, statusId, stacks: appliedStacks };
  const nextState = updateCombatant(state, targetId, (combatant) => ({ ...combatant, statuses }));

  return { state: appendEvents(nextState, [event]), events: [event] };
};

const removeStatusStacks = (
  state: CombatState,
  targetId: CombatantId,
  statusId: CombatStatusState["statusId"],
  stacks: number | undefined,
  eventType: "StatusCleansed" | "StatusConsumed"
): { readonly state: CombatState; readonly events: readonly GameEvent[] } => {
  const target = getCombatant(state, targetId);
  if (!target) {
    return { state, events: [] };
  }

  const status = target.statuses.find((candidate) => candidate.statusId === statusId);
  if (!status) {
    return { state, events: [] };
  }

  const stacksRemoved = stacks === undefined ? status.stacks : Math.min(status.stacks, stacks);
  const remainingStacks = Math.max(0, status.stacks - stacksRemoved);
  const event: GameEvent = eventType === "StatusCleansed"
    ? { type: "StatusCleansed", targetId, statusId, stacksRemoved, remainingStacks }
    : { type: "StatusConsumed", targetId, statusId, stacksConsumed: stacksRemoved, remainingStacks };
  const nextState = updateCombatant(state, targetId, (combatant) => ({
    ...combatant,
    statuses: remainingStacks > 0
      ? combatant.statuses.map((candidate) =>
          candidate.statusId === statusId ? { ...candidate, stacks: remainingStacks } : candidate
        )
      : combatant.statuses.filter((candidate) => candidate.statusId !== statusId)
  }));

  return { state: appendEvents(nextState, [event]), events: [event] };
};

const cleanseStatus = (
  state: CombatState,
  targetId: CombatantId,
  effect: Extract<EffectDefinition, { readonly type: "cleanseStatus" }>,
  registry: GameContentRegistry
): { readonly state: CombatState; readonly events: readonly GameEvent[] } => {
  const target = getCombatant(state, targetId);
  if (!target) {
    return { state, events: [] };
  }

  const matches = (status: CombatStatusState): boolean => {
    if (effect.statusId && status.statusId !== effect.statusId) {
      return false;
    }

    if (!effect.tagsAny || effect.tagsAny.length === 0) {
      return true;
    }

    const definition = findStatusDefinition(registry, status.statusId);
    return definition?.tags.some((tag) => effect.tagsAny?.includes(tag) ?? false) ?? false;
  };

  const events: GameEvent[] = [];
  let nextState = state;

  for (const status of target.statuses) {
    if (!matches(status)) {
      continue;
    }

    const result = removeStatusStacks(nextState, targetId, status.statusId, effect.stacks, "StatusCleansed");
    nextState = result.state;
    events.push(...result.events);
  }

  return { state: nextState, events };
};

const consumeStatus = (
  state: CombatState,
  targetId: CombatantId,
  effect: Extract<EffectDefinition, { readonly type: "consumeStatus" }>
): { readonly state: CombatState; readonly events: readonly GameEvent[] } => {
  return removeStatusStacks(state, targetId, effect.statusId, effect.stacks, "StatusConsumed");
};

type EffectHandlerInput<T extends EffectDefinition> = {
  readonly state: CombatState;
  readonly effect: T;
  readonly context: EffectContext;
  readonly registry: GameContentRegistry;
  readonly rng: Rng;
  readonly originalState: CombatState;
};

type EffectHandler = <T extends EffectDefinition>(
  input: EffectHandlerInput<T>
) => GameActionResult<CombatState>;

const resolveDrawEffect = (
  input: EffectHandlerInput<Extract<EffectDefinition, { readonly type: "draw" }>>
): GameActionResult<CombatState> => drawCards(input.state, input.effect.amount, input.rng);

const resolvePileMoveEffect = (
  input: EffectHandlerInput<Extract<EffectDefinition, { readonly type: "discard" | "exhaust" }>>
): GameActionResult<CombatState> => {
  let nextState = input.state;
  const events: GameEvent[] = [];
  const destination = input.effect.type === "discard" ? "discard" : "exhaust";
  const cardsToMove = nextState.hand
    .filter((cardInstanceIdValue) => cardInstanceIdValue !== input.context.cardInstanceId)
    .slice(0, input.effect.amount);

  for (const cardToMove of cardsToMove) {
    const moveResult = moveCardBetweenPiles(nextState, {
      cardInstanceId: cardToMove,
      from: "hand",
      to: destination
    });
    if (!moveResult.ok) {
      return reject(input.originalState, moveResult.error);
    }

    nextState = moveResult.state;
    events.push(moveResult.event);
  }

  return { ok: true, state: nextState, events, errors: [] };
};

const resolveRetainEffect = (
  input: EffectHandlerInput<Extract<EffectDefinition, { readonly type: "retain" }>>
): GameActionResult<CombatState> => {
  const existingRetained = new Set(input.state.retainedCardInstanceIds ?? []);
  const retained = input.state.hand
    .filter((cardInstanceIdValue) => !existingRetained.has(cardInstanceIdValue))
    .slice(0, input.effect.amount);
  const events = retained.map<GameEvent>((retainedCardInstanceId) => {
    const cardInstance = input.state.cardInstances.find((candidate) => candidate.id === retainedCardInstanceId);
    return {
      type: "CardRetained",
      cardInstanceId: retainedCardInstanceId,
      cardId: cardInstance?.cardId ?? input.context.cardId
    } as GameEvent;
  });
  const nextState = appendEvents(
    {
      ...input.state,
      retainedCardInstanceIds: [...existingRetained, ...retained]
    },
    events
  );

  return { ok: true, state: nextState, events, errors: [] };
};

const resolveCreateCardEffect = (
  input: EffectHandlerInput<Extract<EffectDefinition, { readonly type: "createCard" }>>
): GameActionResult<CombatState> => {
  const card = input.registry.cards.find((candidate) => candidate.id === input.effect.cardId);
  if (!card) {
    return reject(input.originalState, error("missing_card_definition", `Card '${input.effect.cardId}' is not registered.`, "cardId"));
  }

  const createdInstanceId = cardInstanceId(`${input.state.id}:created:${input.state.cardInstances.length}:${input.effect.cardId}`);
  const event: GameEvent = {
    type: "CardCreated",
    cardInstanceId: createdInstanceId,
    cardId: input.effect.cardId,
    to: input.effect.to
  };
  const nextStateWithCard = {
    ...input.state,
    cardInstances: [
      ...input.state.cardInstances,
      { id: createdInstanceId, cardId: input.effect.cardId, ownerId: input.state.player.id }
    ]
  };
  const nextState = appendEvents(
    setPile(nextStateWithCard, input.effect.to, [...getPile(nextStateWithCard, input.effect.to), createdInstanceId]),
    [event]
  );

  return { ok: true, state: nextState, events: [event], errors: [] };
};

const resolveGainEnergyEffect = (
  input: EffectHandlerInput<Extract<EffectDefinition, { readonly type: "gainEnergy" }>>
): GameActionResult<CombatState> => {
  const total = input.state.energy + input.effect.amount;
  const event: GameEvent = { type: "EnergyGained", amount: input.effect.amount, total };
  return {
    ok: true,
    state: appendEvents({ ...input.state, energy: total }, [event]),
    events: [event],
    errors: []
  };
};

const resolveStoryFlagEffect = (
  input: EffectHandlerInput<Extract<EffectDefinition, { readonly type: "setStoryFlag" }>>
): GameActionResult<CombatState> => {
  const warning: GameEvent = {
    type: "ValidationWarning",
    code: "story_flag_not_mutated_in_combat",
    message: `Story flag '${input.effect.flagId}' is not mutated during combat.`
  };

  return {
    ok: true,
    state: appendEvents(input.state, [warning]),
    events: [warning],
    errors: []
  };
};

const resolvePetReactEffect = (
  input: EffectHandlerInput<Extract<EffectDefinition, { readonly type: "petReact" }>>
): GameActionResult<CombatState> => {
  const petResolution = resolvePetTargets(input.state, input.registry, input.effect.petTarget, input.rng);
  if (!petResolution.ok) {
    return reject(input.originalState, petResolution.error);
  }

  const petEvents = petResolution.petInstanceIds.map<GameEvent>((petInstanceId) => ({
    type: "PetReacted",
    petInstanceId,
    reaction: input.effect.reaction
  }));

  return {
    ok: true,
    state: appendEvents(input.state, petEvents),
    events: petEvents,
    errors: []
  };
};

const resolveDamageLikeEffect = (
  input: EffectHandlerInput<Extract<EffectDefinition, { readonly type: "damage" | "petAttack" }>>
): GameActionResult<CombatState> => {
  const targets = resolveCombatantTargets(
    input.state,
    input.context.sourceId,
    input.effect.target,
    input.context.targetId ?? input.context.defaultTargetId
  );
  if (isActionError(targets)) {
    return reject(input.originalState, targets);
  }

  const repetitions =
    input.effect.type === "petAttack"
      ? resolvePetTargets(input.state, input.registry, input.effect.petTarget, input.rng)
      : { ok: true as const, petInstanceIds: [undefined] };
  if (!repetitions.ok) {
    return reject(input.originalState, repetitions.error);
  }

  let nextState = input.state;
  const events: GameEvent[] = [];

  for (const target of targets) {
    for (const _petInstanceId of repetitions.petInstanceIds) {
      const damageResult = applyDamage(nextState, input.context.sourceId, target.id, input.effect.amount);
      nextState = damageResult.state;
      events.push(...damageResult.events);
      const outcomeResult = checkCombatOutcome(nextState);
      nextState = outcomeResult.state;
      events.push(...outcomeResult.events);

      if (nextState.phase === "won" || nextState.phase === "lost") {
        break;
      }
    }

    if (nextState.phase === "won" || nextState.phase === "lost") {
      break;
    }
  }

  return { ok: true, state: nextState, events, errors: [] };
};

const resolveBlockLikeEffect = (
  input: EffectHandlerInput<Extract<EffectDefinition, { readonly type: "block" | "petBlock" }>>
): GameActionResult<CombatState> => {
  const targets = resolveCombatantTargets(
    input.state,
    input.context.sourceId,
    input.effect.target,
    input.context.targetId ?? input.context.defaultTargetId
  );
  if (isActionError(targets)) {
    return reject(input.originalState, targets);
  }

  const repetitions =
    input.effect.type === "petBlock"
      ? resolvePetTargets(input.state, input.registry, input.effect.petTarget, input.rng)
      : { ok: true as const, petInstanceIds: [undefined] };
  if (!repetitions.ok) {
    return reject(input.originalState, repetitions.error);
  }

  let nextState = input.state;
  const events: GameEvent[] = [];

  for (const target of targets) {
    for (const _petInstanceId of repetitions.petInstanceIds) {
      const blockResult = applyBlock(nextState, target.id, input.effect.amount);
      nextState = blockResult.state;
      events.push(...blockResult.events);
    }
  }

  return { ok: true, state: nextState, events, errors: [] };
};

const resolveApplyStatusEffect = (
  input: EffectHandlerInput<Extract<EffectDefinition, { readonly type: "applyStatus" }>>
): GameActionResult<CombatState> => {
  const targets = resolveCombatantTargets(
    input.state,
    input.context.sourceId,
    input.effect.target,
    input.context.targetId ?? input.context.defaultTargetId
  );
  if (isActionError(targets)) {
    return reject(input.originalState, targets);
  }

  let nextState = input.state;
  const events: GameEvent[] = [];

  for (const target of targets) {
    const statusResult = applyStatus(
      nextState,
      target.id,
      input.effect.statusId,
      input.effect.stacks,
      input.effect.duration,
      input.registry
    );
    nextState = statusResult.state;
    events.push(...statusResult.events);
  }

  return { ok: true, state: nextState, events, errors: [] };
};

const resolveCleanseStatusEffect = (
  input: EffectHandlerInput<Extract<EffectDefinition, { readonly type: "cleanseStatus" }>>
): GameActionResult<CombatState> => {
  const targets = resolveCombatantTargets(
    input.state,
    input.context.sourceId,
    input.effect.target,
    input.context.targetId ?? input.context.defaultTargetId
  );
  if (isActionError(targets)) {
    return reject(input.originalState, targets);
  }

  let nextState = input.state;
  const events: GameEvent[] = [];

  for (const target of targets) {
    const cleanseResult = cleanseStatus(nextState, target.id, input.effect, input.registry);
    nextState = cleanseResult.state;
    events.push(...cleanseResult.events);
  }

  return { ok: true, state: nextState, events, errors: [] };
};

const resolveConsumeStatusEffect = (
  input: EffectHandlerInput<Extract<EffectDefinition, { readonly type: "consumeStatus" }>>
): GameActionResult<CombatState> => {
  const targets = resolveCombatantTargets(
    input.state,
    input.context.sourceId,
    input.effect.target,
    input.context.targetId ?? input.context.defaultTargetId
  );
  if (isActionError(targets)) {
    return reject(input.originalState, targets);
  }

  let nextState = input.state;
  const events: GameEvent[] = [];

  for (const target of targets) {
    const consumeResult = consumeStatus(nextState, target.id, input.effect);
    nextState = consumeResult.state;
    events.push(...consumeResult.events);
  }

  return { ok: true, state: nextState, events, errors: [] };
};

type IntentVisibilityEffect = Extract<EffectDefinition, { readonly type: "improveIntentVisibility" | "revealIntent" | "scopeIntent" | "obscureIntent" }>;

const improveIntentVisibilityLevel = (
  current: IntentVisibilityLevel,
  amount: number,
  maxLevel: IntentVisibilityLevel | undefined
): IntentVisibilityLevel => {
  if (maxLevel !== undefined && getIntentVisibilityRank(current) > getIntentVisibilityRank(maxLevel)) {
    return current;
  }

  return shiftIntentVisibilityLevel(current, amount, { maxLevel });
};

const getMonsterCardState = (
  state: CombatState,
  monsterCombatantId: CombatantId
): CombatMonsterCardState | undefined =>
  state.monsterCardStates?.find((cardState) => cardState.monsterCombatantId === monsterCombatantId);

const getPlannedEnemyCardInstanceIds = (
  cardState: CombatMonsterCardState | undefined
): readonly EnemyCardInstanceId[] => {
  if (!cardState) {
    return [];
  }

  return [
    ...(cardState.planned.lockedCardInstanceId ? [cardState.planned.lockedCardInstanceId] : []),
    ...cardState.planned.candidateCardInstanceIds
  ];
};

const getEnemyAbilityIdsForCardInstances = (
  cardState: CombatMonsterCardState | undefined,
  cardInstanceIds: readonly EnemyCardInstanceId[]
): readonly MonsterAbilityId[] => {
  if (!cardState) {
    return [];
  }

  const abilityIds = cardInstanceIds
    .map((cardInstanceIdValue) => cardState.cardInstances.find((cardInstance) => cardInstance.id === cardInstanceIdValue)?.abilityId)
    .filter((abilityId): abilityId is MonsterAbilityId => abilityId !== undefined);

  return [...new Set(abilityIds)];
};

const resolveScopeLevel = (
  depth: ScopeIntentDepth,
  cardState: CombatMonsterCardState | undefined
): IntentVisibilityLevel => {
  if (depth === "category") {
    return "category";
  }

  if (
    depth === "exactIfLocked" &&
    cardState?.planned.planMode === "locked" &&
    cardState.planned.lockedCardInstanceId !== undefined &&
    cardState.planned.candidateCardInstanceIds.length === 0
  ) {
    return "exact";
  }

  return "scoped";
};

const addVisibilityOverride = (
  overrides: readonly CombatIntentVisibilityState[],
  override: CombatIntentVisibilityState
): readonly CombatIntentVisibilityState[] => {
  if (override.mode === "ceiling") {
    return [
      ...overrides.filter((candidate) => !(
        candidate.monsterCombatantId === override.monsterCombatantId &&
        candidate.mode === "ceiling" &&
        candidate.source === override.source &&
        candidate.expires === override.expires
      )),
      override
    ];
  }

  if (override.mode === "set") {
    return [
      ...overrides.filter((candidate) => !(
        candidate.monsterCombatantId === override.monsterCombatantId &&
        candidate.mode === "set"
      )),
      override
    ];
  }

  return [
    ...overrides.filter((candidate) => !(
      candidate.monsterCombatantId === override.monsterCombatantId &&
      (candidate.mode === undefined || candidate.mode === "floor") &&
      candidate.source === override.source &&
      candidate.expires === override.expires &&
      candidate.sourceCardInstanceId === override.sourceCardInstanceId
    )),
    override
  ];
};

const resolveIntentVisibilityEffect = (
  input: EffectHandlerInput<IntentVisibilityEffect>
): GameActionResult<CombatState> => {
  const targets = resolveCombatantTargets(
    input.state,
    input.context.sourceId,
    input.effect.target,
    input.context.targetId ?? input.context.defaultTargetId
  );
  if (isActionError(targets)) {
    return reject(input.originalState, targets);
  }

  let overrides: readonly CombatIntentVisibilityState[] = [...(input.state.intentVisibilityOverrides ?? [])];
  const events: GameEvent[] = [];

  for (const target of targets) {
    if (target.type !== "monster" || !target.alive) {
      continue;
    }

    const monsterDefinition = target.definitionId
      ? input.registry.monsters.find((monster) => monster.id === target.definitionId)
      : undefined;
    const intent = input.state.monsterIntents.find((candidate) => candidate.monsterCombatantId === target.id);
    const plannedAbility = intent
      ? input.state.plannedMonsterAbilities?.find((planned) =>
          planned.monsterCombatantId === target.id &&
          planned.intentId === intent.intentId
        )
      : undefined;
    const intentDefinition = intent
      ? monsterDefinition?.intentPool.find((candidate) => candidate.id === intent.intentId)
      : undefined;
    const abilityId = plannedAbility?.abilityId ?? intentDefinition?.abilityId;
    const ability = abilityId
      ? input.registry.monsterAbilities?.find((candidate) => candidate.id === abilityId)
      : undefined;
    const currentLevel = resolveEffectiveIntentVisibilityLevel({
      state: { ...input.state, intentVisibilityOverrides: overrides },
      registry: input.registry,
      monsterCombatantId: target.id,
      monsterDefinition,
      ability
    });
    const cardState = getMonsterCardState(input.state, target.id);
    const source = input.effect.source ?? (input.effect.type === "obscureIntent" ? "enemyObscure" : "card");
    const expires = input.effect.expires ?? (input.effect.type === "obscureIntent" ? "nextPlan" : "currentPlan");
    const plannedCandidateCardInstanceIds = getPlannedEnemyCardInstanceIds(cardState);

    let nextLevel: IntentVisibilityLevel;
    let mode: CombatIntentVisibilityState["mode"] = "floor";
    let scopeDepth: ScopeIntentDepth | undefined;
    let scopedCandidateCardInstanceIds: readonly EnemyCardInstanceId[] | undefined;
    let scopedCandidateAbilityIds: readonly MonsterAbilityId[] | undefined;

    if (input.effect.type === "improveIntentVisibility") {
      nextLevel = improveIntentVisibilityLevel(currentLevel, input.effect.amount, input.effect.maxLevel);
    } else if (input.effect.type === "revealIntent") {
      nextLevel = input.effect.level;
    } else if (input.effect.type === "scopeIntent") {
      scopeDepth = input.effect.depth;
      nextLevel = resolveScopeLevel(input.effect.depth, cardState);
      if (input.effect.depth !== "category") {
        scopedCandidateCardInstanceIds = plannedCandidateCardInstanceIds;
        const candidateAbilityIds = getEnemyAbilityIdsForCardInstances(cardState, plannedCandidateCardInstanceIds);
        scopedCandidateAbilityIds = candidateAbilityIds.length > 0
          ? candidateAbilityIds
          : abilityId ? [abilityId] : [];
      }
    } else {
      mode = "ceiling";
      nextLevel = input.effect.level ?? shiftIntentVisibilityLevel(currentLevel, -(input.effect.amount ?? 1));
    }

    const wouldImprove = mode === "floor" && getIntentVisibilityRank(nextLevel) > getIntentVisibilityRank(currentLevel);
    const wouldObscure = mode === "ceiling" && getIntentVisibilityRank(nextLevel) < getIntentVisibilityRank(currentLevel);
    const wouldScope = scopeDepth !== undefined &&
      (scopedCandidateAbilityIds?.length ?? 0) > 0 &&
      getIntentVisibilityRank(nextLevel) > getIntentVisibilityRank(currentLevel);
    if (!wouldImprove && !wouldObscure && !wouldScope) {
      continue;
    }

    const nextOverride: CombatIntentVisibilityState = {
      monsterCombatantId: target.id,
      level: nextLevel,
      source,
      expires,
      mode,
      ...(input.context.cardInstanceId ? { sourceCardInstanceId: input.context.cardInstanceId } : {}),
      ...(scopeDepth ? { scopeDepth } : {}),
      ...(scopedCandidateCardInstanceIds ? { scopedCandidateCardInstanceIds } : {}),
      ...(scopedCandidateAbilityIds ? { scopedCandidateAbilityIds } : {})
    };

    const nextOverrides = addVisibilityOverride(overrides, nextOverride);
    const effectiveNextLevel = resolveEffectiveIntentVisibilityLevel({
      state: { ...input.state, intentVisibilityOverrides: nextOverrides },
      registry: input.registry,
      monsterCombatantId: target.id,
      monsterDefinition,
      ability
    });

    overrides = nextOverrides;

    if (effectiveNextLevel === currentLevel) {
      continue;
    }

    events.push({
      type: "EnemyIntentVisibilityChanged",
      monsterId: target.id,
      previousLevel: currentLevel,
      level: effectiveNextLevel,
      source,
      expires,
      mode,
      ...(scopeDepth && effectiveNextLevel === "scoped" ? { scopeDepth } : {}),
      ...(scopedCandidateCardInstanceIds && effectiveNextLevel === "scoped" ? { scopedCandidateCardInstanceIds } : {}),
      ...(scopedCandidateAbilityIds && effectiveNextLevel === "scoped" ? { scopedCandidateAbilityIds } : {})
    });
  }

  return {
    ok: true,
    state: appendEvents({ ...input.state, intentVisibilityOverrides: overrides }, events),
    events,
    errors: []
  };
};

const effectResolvers: Record<EffectResolverKey, EffectHandler> = {
  draw: resolveDrawEffect as EffectHandler,
  pileMove: resolvePileMoveEffect as EffectHandler,
  retain: resolveRetainEffect as EffectHandler,
  createCard: resolveCreateCardEffect as EffectHandler,
  gainEnergy: resolveGainEnergyEffect as EffectHandler,
  storyFlag: resolveStoryFlagEffect as EffectHandler,
  petReact: resolvePetReactEffect as EffectHandler,
  damageLike: resolveDamageLikeEffect as EffectHandler,
  blockLike: resolveBlockLikeEffect as EffectHandler,
  applyStatus: resolveApplyStatusEffect as EffectHandler,
  cleanseStatus: resolveCleanseStatusEffect as EffectHandler,
  consumeStatus: resolveConsumeStatusEffect as EffectHandler,
  intentVisibility: resolveIntentVisibilityEffect as EffectHandler
};

export const resolveEffects = (
  state: CombatState,
  effects: readonly EffectDefinition[],
  context: EffectContext,
  registry: GameContentRegistry,
  rng: Rng
): GameActionResult<CombatState> => {
  let nextState = state;
  const events: GameEvent[] = [];

  for (const effectDefinition of effects) {
    const handler = effectResolvers[getEffectDescriptor(effectDefinition.type).resolverKey];
    const result = handler({
      state: nextState,
      effect: effectDefinition,
      context,
      registry,
      rng,
      originalState: state
    });
    if (!result.ok) {
      return result;
    }

    nextState = result.state;
    events.push(...result.events);
  }

  return { ok: true, state: nextState, events, errors: [] };
};

export const resolveCardEffects = resolveEffects;
