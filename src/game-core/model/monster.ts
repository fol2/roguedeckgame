import type { MonsterAbilityId, MonsterId, MonsterIntentId } from "../ids";
import type { EffectDefinition } from "./effect";

export type MonsterIntentType = "attack" | "block" | "debuff" | "special";

export type MonsterAbilityDefinition = {
  readonly id: MonsterAbilityId;
  readonly name: string;
  readonly intentType: MonsterIntentType;
  readonly description: string;
  readonly tags: readonly string[];
  readonly effects: readonly EffectDefinition[];
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

export type MonsterDefinition = {
  readonly id: MonsterId;
  readonly name: string;
  readonly maxHp: number;
  readonly tags: readonly string[];
  readonly abilityIds?: readonly MonsterAbilityId[];
  readonly intentPool: readonly MonsterIntentDefinition[];
  readonly intentSchedule?: readonly MonsterIntentScheduleStep[];
};
