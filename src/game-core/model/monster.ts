import type { MonsterId, MonsterIntentId } from "../ids";
import type { EffectDefinition } from "./effect";

export type MonsterIntentType = "attack" | "block" | "debuff" | "special";

export type MonsterIntentDefinition = {
  readonly id: MonsterIntentId;
  readonly type: MonsterIntentType;
  readonly description: string;
  readonly effects: readonly EffectDefinition[];
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
  readonly intentPool: readonly MonsterIntentDefinition[];
  readonly intentSchedule?: readonly MonsterIntentScheduleStep[];
};
