import type { CardId, PlayerClassId, RelicId } from "../ids";

export type PlayerClassDefinition = {
  readonly id: PlayerClassId;
  readonly name: string;
  readonly startingDeckCardIds: readonly CardId[];
  readonly startingRelicIds: readonly RelicId[];
  readonly maxHp: number;
  readonly maxActivePets: number;
  readonly petSlotCount: number;
  readonly classTags: readonly string[];
};
