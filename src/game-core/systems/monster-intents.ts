import type { CombatantId } from "../ids";
import type { GameActionError, GameActionResult } from "../model/action";
import type { ActiveMonsterIntent, CombatState, PlannedMonsterAbility } from "../model/combat";
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
    const selected = scheduledIntent
      ? intentPool.find((candidate) => candidate.intent.id === scheduledIntent.id)
      : rng.choice(intentPool);
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

    activeIntents.push({ monsterCombatantId: monster.id, intentId: intent.id });
    plannedAbilities.push({ monsterCombatantId: monster.id, intentId: intent.id, abilityId: ability.id });
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

  const nextState = appendEvents({ ...state, monsterIntents: activeIntents, plannedMonsterAbilities: plannedAbilities }, events);
  return { ok: true, state: nextState, events, errors: [] };
};
