import { describe, expect, it } from "vitest";
import {
  cardId,
  petDefinitionId,
  petInstanceId,
  rewardOfferId,
  rewardOptionId,
  runId,
  upgradeId,
  type RewardOfferState
} from "../../src/game-core";
import { buildRewardViewModel } from "../../src/game-phaser/view-models/reward-view-model";

const offer: RewardOfferState = {
  id: rewardOfferId("reward-view"),
  source: "combat",
  combatId: runId("run-view"),
  seed: "reward-seed",
  status: "open",
  options: [
    {
      id: rewardOptionId("reward-view:card:ember_spark"),
      type: "card",
      cardId: cardId("ember_spark")
    },
    {
      id: rewardOptionId("reward-view:upgrade:burning_fang"),
      type: "petUpgrade",
      petInstanceId: petInstanceId("pet-a"),
      petDefinitionId: petDefinitionId("ember_fox"),
      upgradeId: upgradeId("burning_fang")
    }
  ]
};

describe("Reward view model", () => {
  it("builds serializable card and pet upgrade reward options", () => {
    const viewModel = buildRewardViewModel(offer, [
      { type: "RewardOffered", rewardOfferId: offer.id, options: offer.options }
    ]);

    expect(viewModel.rewardOfferId).toBe("reward-view");
    expect(viewModel.status).toBe("open");
    expect(viewModel.options[0]).toMatchObject({
      type: "card",
      title: "Ember Spark",
      description: "Deal 4 damage and apply 1 burn."
    });
    expect(viewModel.options[1]).toMatchObject({
      type: "petUpgrade",
      title: "Burning Fang",
      description: "Ember Fox burn commands hit harder and apply more Burn."
    });
    expect(viewModel.eventMessages).toEqual(["Reward offered: 2 options"]);
    expect(JSON.parse(JSON.stringify(viewModel))).toEqual(viewModel);
  });

  it("uses fallback labels for missing card and upgrade definitions", () => {
    const missingOffer: RewardOfferState = {
      ...offer,
      options: [
        {
          id: rewardOptionId("reward-view:card:missing"),
          type: "card",
          cardId: cardId("missing_card")
        },
        {
          id: rewardOptionId("reward-view:upgrade:missing"),
          type: "petUpgrade",
          petInstanceId: petInstanceId("pet-a"),
          petDefinitionId: petDefinitionId("ember_fox"),
          upgradeId: upgradeId("missing_upgrade")
        }
      ]
    };
    const viewModel = buildRewardViewModel(missingOffer, []);

    expect(viewModel.options[0]?.title).toBe("Unknown Card");
    expect(viewModel.options[0]?.description).toContain("missing_card");
    expect(viewModel.options[1]?.title).toBe("Unknown Pet Upgrade");
    expect(viewModel.options[1]?.description).toContain("missing_upgrade");
  });
});
