import type { CardId, DeckId, PlayerClassId, PlayerClassModifierId, RelicId, StatusId } from "../ids";
import type { IntentVisibilityLevel } from "./combat";
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

export type IntentVisibilityPassiveRule = {
  readonly type: "intentVisibilityPassive";
  readonly level: IntentVisibilityLevel;
  readonly appliesTo: "normalEnemies" | "allEnemies";
};

export type PlayerClassModifierRule =
  | TriggerOnCardPlayedRule
  | TriggerOnStatusAppliedRule
  | IntentVisibilityPassiveRule;

export type PlayerClassDefinition = {
  readonly id: PlayerClassId;
  readonly name: string;
  readonly startingDeckId?: DeckId;
  readonly startingDeckCardIds: readonly CardId[];
  readonly startingRelicIds: readonly RelicId[];
  readonly classModifierIds?: readonly PlayerClassModifierId[];
  readonly startingResources?: readonly PlayerClassStartingResourceDefinition[];
  readonly maxHp: number;
  readonly maxActivePets: number;
  readonly petSlotCount: number;
  readonly classTags: readonly string[];
};
