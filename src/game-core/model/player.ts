import type { CardId, PlayerClassId, PlayerClassModifierId, RelicId, StatusId } from "../ids";
import type { EffectDefinition } from "./effect";
import type { CardSelector, PetModifierLimit } from "./pet";

export type PlayerClassStartingResourceDefinition = {
  readonly id: string;
  readonly amount: number;
};

export type PlayerClassModifierDefinition = {
  readonly id: PlayerClassModifierId;
  readonly name: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly rules?: readonly PlayerClassModifierRule[];
};

export type TriggerOnCardPlayedRule = {
  readonly type: "triggerOnCardPlayed";
  readonly selector?: CardSelector;
  readonly effects: readonly EffectDefinition[];
  readonly limit?: PetModifierLimit;
};

export type TriggerOnStatusAppliedRule = {
  readonly type: "triggerOnStatusApplied";
  readonly statusId?: StatusId;
  readonly effects: readonly EffectDefinition[];
  readonly limit?: PetModifierLimit;
};

export type PlayerClassModifierRule =
  | TriggerOnCardPlayedRule
  | TriggerOnStatusAppliedRule;

export type PlayerClassDefinition = {
  readonly id: PlayerClassId;
  readonly name: string;
  readonly startingDeckCardIds: readonly CardId[];
  readonly startingRelicIds: readonly RelicId[];
  readonly classModifierIds?: readonly PlayerClassModifierId[];
  readonly startingResources?: readonly PlayerClassStartingResourceDefinition[];
  readonly maxHp: number;
  readonly maxActivePets: number;
  readonly petSlotCount: number;
  readonly classTags: readonly string[];
};
