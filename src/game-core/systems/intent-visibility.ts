import type { CombatantId } from "../ids";
import type { CombatState, IntentVisibilityLevel } from "../model/combat";
import type { MonsterAbilityDefinition, MonsterDefinition } from "../model/monster";
import type { GameContentRegistry } from "../model/registry";

const visibilityRank: Readonly<Record<IntentVisibilityLevel, number>> = {
  none: 0,
  unknown: 1,
  category: 2,
  rough: 3,
  exact: 4,
  scoped: 5
};

export const maxIntentVisibilityLevel = (
  a: IntentVisibilityLevel,
  b: IntentVisibilityLevel
): IntentVisibilityLevel =>
  visibilityRank[a] >= visibilityRank[b] ? a : b;

const minIntentVisibilityLevel = (
  a: IntentVisibilityLevel,
  b: IntentVisibilityLevel
): IntentVisibilityLevel =>
  visibilityRank[a] <= visibilityRank[b] ? a : b;

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

export const resolveEffectiveIntentVisibilityLevel = (input: {
  readonly state: CombatState;
  readonly registry: GameContentRegistry;
  readonly monsterCombatantId: CombatantId;
  readonly monsterDefinition?: MonsterDefinition;
  readonly ability?: MonsterAbilityDefinition;
}): IntentVisibilityLevel => {
  const baseLevel = resolvePassiveBaseLevel(input.state, input.registry, input.monsterDefinition);
  const telegraphBase = input.ability?.telegraph?.defaultVisibility
    ? minIntentVisibilityLevel(baseLevel, input.ability.telegraph.defaultVisibility)
    : baseLevel;
  const override = input.state.intentVisibilityOverrides?.find((candidate) =>
    candidate.monsterCombatantId === input.monsterCombatantId
  );

  return override ? maxIntentVisibilityLevel(telegraphBase, override.level) : telegraphBase;
};
