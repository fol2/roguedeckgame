import type {
  CardId,
  PetDefinitionId,
  PetInstanceId,
  RewardOfferId,
  RewardOptionId,
  RunId,
  UpgradeId
} from "../ids";
import type { PetInstance } from "./pet";
import type { RunState } from "./run";

export type CardRewardOption = {
  readonly id: RewardOptionId;
  readonly type: "card";
  readonly cardId: CardId;
};

export type PetUpgradeRewardOption = {
  readonly id: RewardOptionId;
  readonly type: "petUpgrade";
  readonly petInstanceId: PetInstanceId;
  readonly petDefinitionId: PetDefinitionId;
  readonly upgradeId: UpgradeId;
};

export type RewardOption = CardRewardOption | PetUpgradeRewardOption;

export type RewardOfferStatus = "open" | "claimed" | "skipped";

export type RewardOfferState = {
  readonly id: RewardOfferId;
  readonly source: "combat";
  readonly combatId: RunId;
  readonly seed: string | number;
  readonly status: RewardOfferStatus;
  readonly options: readonly RewardOption[];
  readonly selectedOptionId?: RewardOptionId;
};

export type RewardClaimState = {
  readonly rewardOffer: RewardOfferState;
  readonly run: RunState;
  readonly petInstances: readonly PetInstance[];
};

export type RewardDefinition =
  | { readonly type: "petUpgrade"; readonly upgradeId: UpgradeId }
  | { readonly type: "card"; readonly cardId: CardId };
