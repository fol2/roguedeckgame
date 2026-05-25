import { describe, expect, it } from "vitest";
import {
  cardId,
  claimReward,
  petDefinitionId,
  petInstanceId,
  rewardOptionId,
  skipReward,
  starterRegistry,
  upgradeId
} from "../../src/game-core";
import {
  createCardRewardOfferFixture,
  createOpenRewardOfferFixture,
  createPetUpgradeRewardOfferFixture,
  createRewardPetInstancesFixture,
  createRewardRunFixture
} from "../../src/game-core/testing/reward-fixtures";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe("claimReward", () => {
  it("appends a claimed card reward to the run deck", () => {
    const run = createRewardRunFixture();
    const rewardOffer = createCardRewardOfferFixture();
    const result = claimReward({
      rewardOffer,
      selectedOptionId: rewardOffer.options[0].id,
      run,
      petInstances: createRewardPetInstancesFixture(),
      registry: starterRegistry
    });

    expect(result.ok).toBe(true);
    expect(result.state.rewardOffer.status).toBe("claimed");
    expect(result.state.rewardOffer.selectedOptionId).toBe(rewardOffer.options[0].id);
    expect(result.state.run.deckCardIds).toEqual([...run.deckCardIds, cardId("ember_spark")]);
  });

  it("emits RewardSelected and CardRewardAdded for card rewards", () => {
    const rewardOffer = createCardRewardOfferFixture();
    const result = claimReward({
      rewardOffer,
      selectedOptionId: rewardOffer.options[0].id,
      run: createRewardRunFixture(),
      petInstances: createRewardPetInstancesFixture(),
      registry: starterRegistry
    });

    expect(result.events).toEqual([
      {
        type: "RewardSelected",
        rewardOfferId: rewardOffer.id,
        rewardOptionId: rewardOffer.options[0].id,
        rewardType: "card"
      },
      { type: "CardRewardAdded", cardId: cardId("ember_spark") }
    ]);
  });

  it("appends a claimed pet upgrade to the target pet instance", () => {
    const rewardOffer = createPetUpgradeRewardOfferFixture();
    const result = claimReward({
      rewardOffer,
      selectedOptionId: rewardOffer.options[0].id,
      run: createRewardRunFixture(),
      petInstances: createRewardPetInstancesFixture(),
      registry: starterRegistry
    });

    expect(result.ok).toBe(true);
    expect(result.state.petInstances[0].unlockedUpgradeIds).toEqual([upgradeId("burning_fang")]);
  });

  it("emits RewardSelected and PetUpgradeUnlocked for pet upgrade rewards", () => {
    const rewardOffer = createPetUpgradeRewardOfferFixture();
    const result = claimReward({
      rewardOffer,
      selectedOptionId: rewardOffer.options[0].id,
      run: createRewardRunFixture(),
      petInstances: createRewardPetInstancesFixture(),
      registry: starterRegistry
    });

    expect(result.events).toEqual([
      {
        type: "RewardSelected",
        rewardOfferId: rewardOffer.id,
        rewardOptionId: rewardOffer.options[0].id,
        rewardType: "petUpgrade"
      },
      {
        type: "PetUpgradeUnlocked",
        petInstanceId: petInstanceId("ember_fox_001"),
        upgradeId: upgradeId("burning_fang")
      }
    ]);
  });

  it("rejects an invalid option without mutating inputs", () => {
    const rewardOffer = createOpenRewardOfferFixture();
    const run = createRewardRunFixture();
    const petInstances = createRewardPetInstancesFixture();
    const before = { rewardOffer: clone(rewardOffer), run: clone(run), petInstances: clone(petInstances) };
    const result = claimReward({
      rewardOffer,
      selectedOptionId: rewardOptionId("missing_option"),
      run,
      petInstances,
      registry: starterRegistry
    });

    expect(result.ok).toBe(false);
    expect(result.state).toEqual({ rewardOffer, run, petInstances });
    expect(result.errors.map((rewardError) => rewardError.code)).toEqual(["missing_reward_option"]);
    expect(result.events.map((event) => event.type)).toEqual(["ActionRejected"]);
    expect(clone(rewardOffer)).toEqual(before.rewardOffer);
    expect(clone(run)).toEqual(before.run);
    expect(clone(petInstances)).toEqual(before.petInstances);
  });

  it("rejects an already claimed reward", () => {
    const rewardOffer = createCardRewardOfferFixture({ status: "claimed" });
    const result = claimReward({
      rewardOffer,
      selectedOptionId: rewardOffer.options[0].id,
      run: createRewardRunFixture(),
      petInstances: createRewardPetInstancesFixture(),
      registry: starterRegistry
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((rewardError) => rewardError.code)).toEqual(["reward_offer_not_open"]);
  });

  it("rejects a skipped reward", () => {
    const rewardOffer = createCardRewardOfferFixture({ status: "skipped" });
    const result = claimReward({
      rewardOffer,
      selectedOptionId: rewardOffer.options[0].id,
      run: createRewardRunFixture(),
      petInstances: createRewardPetInstancesFixture(),
      registry: starterRegistry
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((rewardError) => rewardError.code)).toEqual(["reward_offer_not_open"]);
  });

  it("rejects an upgrade already owned by the target pet", () => {
    const rewardOffer = createPetUpgradeRewardOfferFixture();
    const result = claimReward({
      rewardOffer,
      selectedOptionId: rewardOffer.options[0].id,
      run: createRewardRunFixture(),
      petInstances: createRewardPetInstancesFixture({ unlockedUpgradeIds: [upgradeId("burning_fang")] }),
      registry: starterRegistry
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((rewardError) => rewardError.code)).toEqual(["pet_upgrade_already_unlocked"]);
  });

  it("rejects an upgrade for the wrong pet definition", () => {
    const rewardOffer = createPetUpgradeRewardOfferFixture({
      options: [
        {
          type: "petUpgrade",
          id: rewardOptionId("wrong_pet_definition"),
          petInstanceId: petInstanceId("ember_fox_001"),
          petDefinitionId: petDefinitionId("future_pet"),
          upgradeId: upgradeId("burning_fang")
        }
      ]
    });
    const result = claimReward({
      rewardOffer,
      selectedOptionId: rewardOffer.options[0].id,
      run: createRewardRunFixture(),
      petInstances: createRewardPetInstancesFixture(),
      registry: starterRegistry
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((rewardError) => rewardError.code)).toEqual(["pet_upgrade_definition_mismatch"]);
  });

  it("rejects a missing reward card", () => {
    const rewardOffer = createCardRewardOfferFixture({
      options: [
        {
          type: "card",
          id: rewardOptionId("missing_card_option"),
          cardId: cardId("missing_card")
        }
      ]
    });
    const result = claimReward({
      rewardOffer,
      selectedOptionId: rewardOffer.options[0].id,
      run: createRewardRunFixture(),
      petInstances: createRewardPetInstancesFixture(),
      registry: starterRegistry
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((rewardError) => rewardError.code)).toEqual(["missing_reward_card"]);
  });

  it("rejects an ineligible card option supplied by the reward offer", () => {
    const rewardOffer = createCardRewardOfferFixture({
      options: [
        {
          type: "card",
          id: rewardOptionId("starter_card_option"),
          cardId: cardId("strike")
        }
      ]
    });
    const result = claimReward({
      rewardOffer,
      selectedOptionId: rewardOffer.options[0].id,
      run: createRewardRunFixture(),
      petInstances: createRewardPetInstancesFixture(),
      registry: starterRegistry
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((rewardError) => rewardError.code)).toEqual(["ineligible_reward_card"]);
  });

  it("rejects a missing pet instance", () => {
    const rewardOffer = createPetUpgradeRewardOfferFixture();
    const result = claimReward({
      rewardOffer,
      selectedOptionId: rewardOffer.options[0].id,
      run: createRewardRunFixture(),
      petInstances: [],
      registry: starterRegistry
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((rewardError) => rewardError.code)).toEqual(["missing_pet_instance"]);
  });

  it("rejects a pet upgrade for an inactive pet instance", () => {
    const rewardOffer = createPetUpgradeRewardOfferFixture();
    const result = claimReward({
      rewardOffer,
      selectedOptionId: rewardOffer.options[0].id,
      run: createRewardRunFixture({ activePetInstanceIds: [] }),
      petInstances: createRewardPetInstancesFixture(),
      registry: starterRegistry
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((rewardError) => rewardError.code)).toEqual(["inactive_pet_instance"]);
  });

  it("rejects a missing pet upgrade", () => {
    const rewardOffer = createPetUpgradeRewardOfferFixture({
      options: [
        {
          type: "petUpgrade",
          id: rewardOptionId("missing_upgrade_option"),
          petInstanceId: petInstanceId("ember_fox_001"),
          petDefinitionId: petDefinitionId("ember_fox"),
          upgradeId: upgradeId("missing_upgrade")
        }
      ]
    });
    const result = claimReward({
      rewardOffer,
      selectedOptionId: rewardOffer.options[0].id,
      run: createRewardRunFixture(),
      petInstances: createRewardPetInstancesFixture(),
      registry: starterRegistry
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((rewardError) => rewardError.code)).toEqual(["missing_pet_upgrade"]);
  });

  it("skips an open reward and emits RewardSkipped", () => {
    const rewardOffer = createOpenRewardOfferFixture();
    const run = createRewardRunFixture();
    const petInstances = createRewardPetInstancesFixture();
    const result = skipReward({ rewardOffer, run, petInstances });

    expect(result.ok).toBe(true);
    expect(result.state.rewardOffer.status).toBe("skipped");
    expect(result.state.run).toBe(run);
    expect(result.state.petInstances).toBe(petInstances);
    expect(result.events).toEqual([{ type: "RewardSkipped", rewardOfferId: rewardOffer.id }]);
  });

  it.each(["claimed", "skipped"] as const)("rejects skipping an already %s reward", (status) => {
    const rewardOffer = createOpenRewardOfferFixture(undefined, { status });
    const result = skipReward({
      rewardOffer,
      run: createRewardRunFixture(),
      petInstances: createRewardPetInstancesFixture()
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((rewardError) => rewardError.code)).toEqual(["reward_offer_not_open"]);
  });

  it("returns serializable plain claim and skip results", () => {
    const rewardOffer = createOpenRewardOfferFixture();
    const claimResult = claimReward({
      rewardOffer,
      selectedOptionId: rewardOffer.options[0].id,
      run: createRewardRunFixture(),
      petInstances: createRewardPetInstancesFixture(),
      registry: starterRegistry
    });
    const skipResult = skipReward({
      rewardOffer,
      run: createRewardRunFixture(),
      petInstances: createRewardPetInstancesFixture()
    });

    expect(JSON.parse(JSON.stringify(claimResult))).toEqual(claimResult);
    expect(JSON.parse(JSON.stringify(skipResult))).toEqual(skipResult);
  });
});
