import type { CardId, PlayerClassId, PlayerClassModifierId, RelicId } from "../ids";

export type PlayerClassStartingResourceDefinition = {
  readonly id: string;
  readonly amount: number;
};

export type PlayerClassModifierDefinition = {
  readonly id: PlayerClassModifierId;
  readonly name: string;
  readonly description: string;
  readonly tags: readonly string[];
};

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
