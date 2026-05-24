import type {
  CardId,
  PetInstanceId,
  PlayerClassId,
  RunId,
  StoryFlagId
} from "../ids";

export type RunConfig = {
  readonly seed: string | number;
  readonly playerClassId: PlayerClassId;
  readonly activePetInstanceIds: readonly PetInstanceId[];
};

export type RunState = {
  readonly id: RunId;
  readonly seed: string | number;
  readonly playerClassId: PlayerClassId;
  readonly activePetInstanceIds: readonly PetInstanceId[];
  readonly deckCardIds: readonly CardId[];
  readonly runFlags: readonly string[];
  readonly storyFlags: readonly StoryFlagId[];
};
