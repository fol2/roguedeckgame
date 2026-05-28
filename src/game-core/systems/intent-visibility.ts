import type { CombatantId } from "../ids";
import type { CombatState, IntentVisibilityLevel } from "../model/combat";
import type { MonsterAbilityDefinition, MonsterDefinition } from "../model/monster";
import type { GameContentRegistry } from "../model/registry";

export const intentVisibilityLevels = ["none", "unknown", "category", "rough", "scoped", "exact"] as const satisfies readonly IntentVisibilityLevel[];

const visibilityRank: Readonly<Record<IntentVisibilityLevel, number>> = {
  none: 0,
  unknown: 1,
  category: 2,
  rough: 3,
  scoped: 4,
  exact: 5
};

export const getIntentVisibilityRank = (level: IntentVisibilityLevel): number => visibilityRank[level];

export const maxIntentVisibilityLevel = (
  a: IntentVisibilityLevel,
  b: IntentVisibilityLevel
): IntentVisibilityLevel =>
  visibilityRank[a] >= visibilityRank[b] ? a : b;

export const minIntentVisibilityLevel = (
  a: IntentVisibilityLevel,
  b: IntentVisibilityLevel
): IntentVisibilityLevel =>
  visibilityRank[a] <= visibilityRank[b] ? a : b;

export const shiftIntentVisibilityLevel = (
  current: IntentVisibilityLevel,
  amount: number,
  bounds: { readonly minLevel?: IntentVisibilityLevel; readonly maxLevel?: IntentVisibilityLevel } = {}
): IntentVisibilityLevel => {
  const currentRank = getIntentVisibilityRank(current);
  const minRank = bounds.minLevel === undefined ? 0 : getIntentVisibilityRank(bounds.minLevel);
  const maxRank = bounds.maxLevel === undefined ? intentVisibilityLevels.length - 1 : getIntentVisibilityRank(bounds.maxLevel);
  const nextRank = Math.min(maxRank, Math.max(minRank, currentRank + amount));

  return intentVisibilityLevels[nextRank] ?? current;
};

const isAdvancedEnemy = (monsterDefinition: MonsterDefinition | undefined): boolean =>
  monsterDefinition?.tags.some((tag) =>
    tag === "elite" || tag === "boss" || tag === "rare-bearer"
  ) ?? false;

const appliesToMonster = (
  appliesTo: "normalEnemies" | "allEnemies",
  monsterDefinition: MonsterDefinition | undefined
): boolean =>
  appliesTo === "allEnemies" || !isAdvancedEnemy(monsterDefinition);

const resolvePassiveBaseLevel = (
  state: CombatState,
  registry: GameContentRegistry,
  monsterDefinition: MonsterDefinition | undefined
): IntentVisibilityLevel => {
  const playerDefinition = registry.players.find((player) => player.id === state.player.definitionId);
  const modifierIds = playerDefinition?.classModifierIds ?? [];
  let passiveLevel: IntentVisibilityLevel = monsterDefinition?.cardGame?.defaultIntentVisibility ?? "unknown";

  for (const modifierId of modifierIds) {
    const modifier = registry.playerClassModifiers?.find((candidate) => candidate.id === modifierId);

    for (const rule of modifier?.rules ?? []) {
      if (
        rule.type === "intentVisibilityPassive" &&
        appliesToMonster(rule.appliesTo, monsterDefinition)
      ) {
        passiveLevel = maxIntentVisibilityLevel(passiveLevel, rule.level);
      }
    }
  }

  return passiveLevel;
};

export const resolveBaseIntentVisibilityLevel = (input: {
  readonly state: CombatState;
  readonly registry: GameContentRegistry;
  readonly monsterDefinition?: MonsterDefinition;
  readonly ability?: MonsterAbilityDefinition;
}): IntentVisibilityLevel => {
  const baseLevel = resolvePassiveBaseLevel(input.state, input.registry, input.monsterDefinition);

  return input.ability?.telegraph?.defaultVisibility
    ? minIntentVisibilityLevel(baseLevel, input.ability.telegraph.defaultVisibility)
    : baseLevel;
};

export const resolveEffectiveIntentVisibilityLevel = (input: {
  readonly state: CombatState;
  readonly registry: GameContentRegistry;
  readonly monsterCombatantId: CombatantId;
  readonly monsterDefinition?: MonsterDefinition;
  readonly ability?: MonsterAbilityDefinition;
}): IntentVisibilityLevel => {
  const telegraphBase = resolveBaseIntentVisibilityLevel(input);
  const overrides = input.state.intentVisibilityOverrides?.filter((candidate) =>
    candidate.monsterCombatantId === input.monsterCombatantId
  ) ?? [];
  const setOverride = overrides.find((override) => override.mode === "set");
  if (setOverride) {
    return setOverride.level;
  }

  const ceilingLevel = overrides
    .filter((override) => override.mode === "ceiling")
    .reduce<IntentVisibilityLevel | undefined>((current, override) =>
      current === undefined ? override.level : minIntentVisibilityLevel(current, override.level),
    undefined);
  const afterFloor = overrides
    .filter((override) => override.mode === undefined || override.mode === "floor")
    .reduce<IntentVisibilityLevel>((current, override) => maxIntentVisibilityLevel(current, override.level), telegraphBase);

  return ceilingLevel === undefined
    ? afterFloor
    : minIntentVisibilityLevel(afterFloor, ceilingLevel);
};
