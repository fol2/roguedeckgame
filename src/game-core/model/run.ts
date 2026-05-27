import type {
  CardId,
  PetInstanceId,
  PlayerClassId,
  RunId,
  StoryFlagId
} from "../ids";
import type { RewardOfferState } from "./reward";
import type { RunMapState } from "./run-map";

export type RunStatus =
  | "not_started"
  | "map_select"
  | "combat"
  | "reward"
  | "completed"
  | "lost";

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
  readonly status: RunStatus;
  readonly map?: RunMapState;
  readonly pendingRewardOffer?: RewardOfferState;
  readonly playerHp: number;
  readonly playerMaxHp: number;
  readonly deckCardIds: readonly CardId[];
  readonly upgradedDeckCardIds?: readonly CardId[];
  readonly runFlags: readonly string[];
  readonly storyFlags: readonly StoryFlagId[];
};
