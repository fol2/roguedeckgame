import { rewardPoolId } from "../../ids";
import type { RewardPoolDefinition } from "../../model/reward";

export const normalRewardPool: RewardPoolDefinition = {
  id: rewardPoolId("normal"),
  name: "Normal Encounter Rewards",
  rewardTypes: ["card", "petUpgrade", "deckOperation"],
  tags: ["normal", "act1_forest"]
};

export const eliteRewardPool: RewardPoolDefinition = {
  id: rewardPoolId("elite"),
  name: "Elite Encounter Rewards",
  rewardTypes: ["card", "petUpgrade", "deckOperation"],
  tags: ["elite", "act1_forest"]
};

export const bossRewardPool: RewardPoolDefinition = {
  id: rewardPoolId("boss"),
  name: "Boss Encounter Rewards",
  rewardTypes: ["card", "petUpgrade"],
  tags: ["boss", "act1_forest"]
};

export const rewardPools = [
  normalRewardPool,
  eliteRewardPool,
  bossRewardPool
] as const;
