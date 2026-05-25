import type { CardId, CardInstanceId, CombatantId, PetInstanceId } from "../ids";
import type { GameActionError, GameActionResult } from "../model/action";
import type { CombatantTarget, EffectDefinition, PetTarget } from "../model/effect";
import type { CombatantState, CombatState } from "../model/combat";
import type { GameEvent } from "../model/event";
import type { GameContentRegistry } from "../model/registry";
import type { CombatStatusState } from "../model/status";
import { drawCards } from "./draw";
import type { Rng } from "./rng";

type EffectContext = {
  readonly sourceId: CombatantId;
  readonly targetId?: CombatantId;
  readonly cardInstanceId: CardInstanceId;
  readonly cardId: CardId;
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
    return activeIds.includes(petTarget.petInstanceId)
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

  const matchingIds = state.petInstances
    .filter((petInstance) => activeIds.includes(petInstance.id))
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

const applyDamage = (
  state: CombatState,
  sourceId: CombatantId,
  targetId: CombatantId,
  amount: number
): { readonly state: CombatState; readonly events: readonly GameEvent[] } => {
  const target = getCombatant(state, targetId);
  if (!target) {
    return { state, events: [] };
  }

  const blocked = Math.min(target.block, amount);
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

export const resolveCardEffects = (
  state: CombatState,
  effects: readonly EffectDefinition[],
  context: EffectContext,
  registry: GameContentRegistry,
  rng: Rng
): GameActionResult<CombatState> => {
  let nextState = state;
  const events: GameEvent[] = [];

  for (const effectDefinition of effects) {
    if (effectDefinition.type === "draw") {
      const drawResult = drawCards(nextState, effectDefinition.amount, rng);
      if (!drawResult.ok) {
        return drawResult;
      }

      nextState = drawResult.state;
      events.push(...drawResult.events);
      continue;
    }

    if (effectDefinition.type === "setStoryFlag") {
      const warning: GameEvent = {
        type: "ValidationWarning",
        code: "story_flag_not_mutated_in_combat",
        message: `Story flag '${effectDefinition.flagId}' is not mutated during combat.`
      };
      nextState = appendEvents(nextState, [warning]);
      events.push(warning);
      continue;
    }

    if (effectDefinition.type === "petReact") {
      const petResolution = resolvePetTargets(nextState, registry, effectDefinition.petTarget, rng);
      if (!petResolution.ok) {
        return reject(state, petResolution.error);
      }

      const petEvents = petResolution.petInstanceIds.map<GameEvent>((petInstanceId) => ({
        type: "PetReacted",
        petInstanceId,
        reaction: effectDefinition.reaction
      }));
      nextState = appendEvents(nextState, petEvents);
      events.push(...petEvents);
      continue;
    }

    if (effectDefinition.type === "damage" || effectDefinition.type === "petAttack") {
      const targets = resolveCombatantTargets(
        nextState,
        context.sourceId,
        effectDefinition.target,
        context.targetId
      );
      if (isActionError(targets)) {
        return reject(state, targets);
      }

      const repetitions =
        effectDefinition.type === "petAttack"
          ? resolvePetTargets(nextState, registry, effectDefinition.petTarget, rng)
          : { ok: true as const, petInstanceIds: [undefined] };
      if (!repetitions.ok) {
        return reject(state, repetitions.error);
      }

      for (const target of targets) {
        for (const _petInstanceId of repetitions.petInstanceIds) {
          const damageResult = applyDamage(nextState, context.sourceId, target.id, effectDefinition.amount);
          nextState = damageResult.state;
          events.push(...damageResult.events);
        }
      }
      continue;
    }

    if (effectDefinition.type === "block" || effectDefinition.type === "petBlock") {
      const targets = resolveCombatantTargets(
        nextState,
        context.sourceId,
        effectDefinition.target,
        context.targetId
      );
      if (isActionError(targets)) {
        return reject(state, targets);
      }

      const repetitions =
        effectDefinition.type === "petBlock"
          ? resolvePetTargets(nextState, registry, effectDefinition.petTarget, rng)
          : { ok: true as const, petInstanceIds: [undefined] };
      if (!repetitions.ok) {
        return reject(state, repetitions.error);
      }

      for (const target of targets) {
        for (const _petInstanceId of repetitions.petInstanceIds) {
          const blockResult = applyBlock(nextState, target.id, effectDefinition.amount);
          nextState = blockResult.state;
          events.push(...blockResult.events);
        }
      }
      continue;
    }

    if (effectDefinition.type === "applyStatus") {
      const targets = resolveCombatantTargets(
        nextState,
        context.sourceId,
        effectDefinition.target,
        context.targetId
      );
      if (isActionError(targets)) {
        return reject(state, targets);
      }

      for (const target of targets) {
        const statusResult = applyStatus(nextState, target.id, effectDefinition.statusId, effectDefinition.stacks);
        nextState = statusResult.state;
        events.push(...statusResult.events);
      }
    }
  }

  return { ok: true, state: nextState, events, errors: [] };
};
