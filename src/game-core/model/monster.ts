import type { MonsterAbilityId, MonsterId, MonsterIntentId } from "../ids";
import type { IntentVisibilityLevel } from "./combat";
import type { EffectDefinition } from "./effect";

export type MonsterIntentType = "attack" | "block" | "debuff" | "buff" | "special" | "charge" | "unknown";

export type EnemyCardTier = "basic" | "advanced" | "elite" | "boss" | "rareBearer" | "special";
export type EnemyPlanMode = "locked" | "adaptive" | "charging" | "scriptedPhase";

export type MonsterAbilityTelegraphDefinition = {
  readonly defaultVisibility?: IntentVisibilityLevel;
  readonly amountLabelMode?: "hidden" | "rough" | "exact";
  readonly targetHint?: "keeper" | "self" | "ally" | "allEnemies" | "pet" | "unknown";
};

export type MonsterAbilityDefinition = {
  readonly id: MonsterAbilityId;
  readonly name: string;
  readonly intentType: MonsterIntentType;
  readonly description: string;
  readonly tags: readonly string[];
  readonly effects: readonly EffectDefinition[];
  readonly tier?: EnemyCardTier;
  readonly planMode?: EnemyPlanMode;
  readonly telegraph?: MonsterAbilityTelegraphDefinition;
};

export type MonsterIntentDefinition = {
  readonly id: MonsterIntentId;
  readonly type: MonsterIntentType;
  readonly description: string;
  readonly effects: readonly EffectDefinition[];
  readonly abilityId?: MonsterAbilityId;
};

export type MonsterIntentScheduleCondition =
  | { readonly type: "hpAtOrBelowRatio"; readonly ratio: number }
  | { readonly type: "turnNumberModulo"; readonly modulo: number; readonly equals: number };

export type MonsterIntentScheduleStep = {
  readonly intentId: MonsterIntentId;
  readonly conditions?: readonly MonsterIntentScheduleCondition[];
};

export type EnemyCardDeckEntryDefinition = {
  readonly abilityId: MonsterAbilityId;
  readonly copies: number;
  readonly cost?: number;
};

export type EnemyTeamRole = "independent" | "leader" | "support";

export type MonsterCardGameDefinition = {
  readonly deck: readonly EnemyCardDeckEntryDefinition[];
  readonly openingHandSize: number;
  readonly drawPerTurn: number;
  readonly maxHandSize: number;
  readonly maxEnergy: number;
  readonly energyRefill?: number;
  readonly handSize: number;
  readonly planSlots: number;
  readonly defaultPlanMode: EnemyPlanMode;
  readonly defaultIntentVisibility: IntentVisibilityLevel;
  readonly adaptiveRuleIds?: readonly string[];
  readonly teamRole?: EnemyTeamRole;
  readonly canPlanAllies?: boolean;
  readonly canChooseTeamOrder?: boolean;
};

export type MonsterDefinition = {
  readonly id: MonsterId;
  readonly name: string;
  readonly maxHp: number;
  readonly tags: readonly string[];
  readonly abilityIds?: readonly MonsterAbilityId[];
  readonly intentPool: readonly MonsterIntentDefinition[];
  readonly intentSchedule?: readonly MonsterIntentScheduleStep[];
  readonly cardGame?: MonsterCardGameDefinition;
};
