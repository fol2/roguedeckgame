import type { CardId, CardInstanceId, CombatantId, MonsterIntentId, PetInstanceId } from "../ids";
import type { GameActionError, GameActionResult } from "../model/action";
import type { CombatantTarget, EffectDefinition, PetTarget } from "../model/effect";
import type { CombatantState, CombatState } from "../model/combat";
import type { GameEvent } from "../model/event";
import type { GameContentRegistry } from "../model/registry";
import type { CombatStatusState } from "../model/status";
import { drawCards } from "./draw";
import { getEffectDescriptor, type EffectResolverKey } from "./effect-descriptors";
import { checkCombatOutcome } from "./outcome";
import type { Rng } from "./rng";

type EffectContext = {
  readonly sourceId: CombatantId;
  readonly targetId?: CombatantId;
  readonly defaultTargetId?: CombatantId;
  readonly cardInstanceId?: CardInstanceId;
  readonly cardId?: CardId;
  readonly intentId?: MonsterIntentId;
};

type PetTargetResolution =
  | { readonly ok: true; readonly petInstanceIds: readonly PetInstanceId[] }
  | { readonly ok: false; readonly error: GameActionError };

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

export const resolvePetTargets = (
  state: CombatState,
  registry: GameContentRegistry,
  petTarget: PetTarget,
  rng: Rng
): PetTargetResolution => {
  const activeIds = [...state.activePetInstanceIds];
  const activePetInstances = state.petInstances.filter((petInstance) => activeIds.includes(petInstance.id));

  if (petTarget.type === "leading") {
    const leadingPetInstanceId = activeIds[0];
    return leadingPetInstanceId
      ? { ok: true, petInstanceIds: [leadingPetInstanceId] }
      : { ok: false, error: error("missing_active_pet", "No active pet is available.", "activePetInstanceIds") };
  }

  if (petTarget.type === "allActive") {
    return activeIds.length > 0
      ? { ok: true, petInstanceIds: activeIds }
      : { ok: false, error: error("missing_active_pet", "No active pet is available.", "activePetInstanceIds") };
  }

  if (petTarget.type === "specific") {
    return activePetInstances.some((petInstance) => petInstance.id === petTarget.petInstanceId)
      ? { ok: true, petInstanceIds: [petTarget.petInstanceId] }
      : {
          ok: false,
          error: error(
            "missing_specific_pet",
            `Pet instance '${petTarget.petInstanceId}' is not active.`,
            "petTarget.petInstanceId"
          )
        };
  }

  if (petTarget.type === "randomActive") {
    return activeIds.length > 0
      ? { ok: true, petInstanceIds: [rng.choice(activeIds)] }
      : { ok: false, error: error("missing_active_pet", "No active pet is available.", "activePetInstanceIds") };
  }

  const matchingIds = activePetInstances
    .filter((petInstance) => {
      const definition = registry.pets.find((pet) => pet.id === petInstance.definitionId);
      return definition?.tags.includes(petTarget.tag) ?? false;
    })
    .map((petInstance) => petInstance.id);

  return matchingIds.length > 0
    ? { ok: true, petInstanceIds: matchingIds }
    : {
        ok: false,
        error: error("missing_tagged_pet", `No active pet has tag '${petTarget.tag}'.`, "petTarget.tag")
      };
};

export const applyDamage = (
  state: CombatState,
  sourceId: CombatantId,
  targetId: CombatantId,
  amount: number,
  options: { readonly ignoreBlock?: boolean } = {}
): { readonly state: CombatState; readonly events: readonly GameEvent[] } => {
  const target = getCombatant(state, targetId);
  if (!target) {
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
  stacks: number
): { readonly state: CombatState; readonly events: readonly GameEvent[] } => {
  const target = getCombatant(state, targetId);
  if (!target) {
    return { state, events: [] };
  }

  const existing = target.statuses.find((status) => status.statusId === statusId);
  const statuses = existing
    ? target.statuses.map((status) =>
        status.statusId === statusId ? { ...status, stacks: status.stacks + stacks } : status
      )
    : [...target.statuses, { statusId, stacks }];
  const event: GameEvent = { type: "StatusApplied", targetId, statusId, stacks };
  const nextState = updateCombatant(state, targetId, (combatant) => ({ ...combatant, statuses }));

  return { state: appendEvents(nextState, [event]), events: [event] };
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
    const statusResult = applyStatus(nextState, target.id, input.effect.statusId, input.effect.stacks);
    nextState = statusResult.state;
    events.push(...statusResult.events);
  }

  return { ok: true, state: nextState, events, errors: [] };
};

const effectResolvers: Record<EffectResolverKey, EffectHandler> = {
  draw: resolveDrawEffect as EffectHandler,
  storyFlag: resolveStoryFlagEffect as EffectHandler,
  petReact: resolvePetReactEffect as EffectHandler,
  damageLike: resolveDamageLikeEffect as EffectHandler,
  blockLike: resolveBlockLikeEffect as EffectHandler,
  applyStatus: resolveApplyStatusEffect as EffectHandler
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
