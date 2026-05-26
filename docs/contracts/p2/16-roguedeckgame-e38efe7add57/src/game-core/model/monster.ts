import type { MonsterId, MonsterIntentId } from "../ids";
import type { EffectDefinition } from "./effect";

export type MonsterIntentType = "attack" | "block" | "debuff" | "special";

export type MonsterIntentDefinition = {
  readonly id: MonsterIntentId;
  readonly type: MonsterIntentType;
  readonly description: string;
  readonly effects: readonly EffectDefinition[];
};

export type MonsterDefinition = {
  readonly id: MonsterId;
  readonly name: string;
  readonly maxHp: number;
  readonly tags: readonly string[];
  readonly intentPool: readonly MonsterIntentDefinition[];
};
