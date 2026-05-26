import { describe, expect, it } from "vitest";
import {
  cardId,
  cardInstanceId,
  claimReward,
  combatantId,
  createRng,
  generateCombatRewardOffer,
  petInstanceId,
  playCard,
  starterRegistry,
  upgradeId
} from "../../src/game-core";
import { createNearlyDeadMonsterFixture } from "../../src/game-core/testing/combat-fixtures";
import {
  createMultiPetRewardFixture,
  createRewardPetInstancesFixture,
  createRewardRunFixture,
  createWonCombatFixture,
  createLostCombatFixture
} from "../../src/game-core/testing/reward-fixtures";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe("reward integration", () => {
  it("plays a lethal card to win combat, then generates rewards", () => {
    const combatResult = playCard(
      createNearlyDeadMonsterFixture(),
      {
        type: "playCard",
        cardInstanceId: cardInstanceId("strike:1"),
        targetId: combatantId("monster:training_slime:0")
      },
      starterRegistry,
      createRng("lethal-reward")
    );
    const rewardResult = generateCombatRewardOffer({
      combat: combatResult.state,
      run: createRewardRunFixture(),
      registry: starterRegistry,
      petInstances: createRewardPetInstancesFixture(),
      seed: "post-combat"
    });

    expect(combatResult.state.phase).toBe("won");
    expect(rewardResult.ok).toBe(true);
    expect(rewardResult.events.map((event) => event.type)).toEqual(["RewardOffered"]);
  });

  it("claims a card reward after combat win and updates the run deck", () => {
    const rewardResult = generateCombatRewardOffer({
      combat: createWonCombatFixture(),
      run: createRewardRunFixture(),
      registry: starterRegistry,
      petInstances: createRewardPetInstancesFixture(),
      seed: "claim-card-post-combat",
      cardOptionCount: 99,
      petUpgradeOptionCount: 0
    });
    const cardOption = rewardResult.state.options.find((option) => option.type === "card");
    expect(cardOption).toBeDefined();

    const claimResult = claimReward({
      rewardOffer: rewardResult.state,
      selectedOptionId: cardOption!.id,
      run: createRewardRunFixture(),
      petInstances: createRewardPetInstancesFixture(),
      registry: starterRegistry
    });

    expect(claimResult.ok).toBe(true);
    expect(claimResult.state.run.deckCardIds).toContain((cardOption as { readonly cardId: ReturnType<typeof cardId> }).cardId);
  });

  it("claims a pet upgrade after combat win and updates the matching pet instance", () => {
    const rewardResult = generateCombatRewardOffer({
      combat: createWonCombatFixture(),
      run: createRewardRunFixture(),
      registry: starterRegistry,
      petInstances: createRewardPetInstancesFixture(),
      seed: "claim-upgrade-post-combat",
      cardOptionCount: 0,
      petUpgradeOptionCount: 99
    });
    const upgradeOption = rewardResult.state.options.find((option) => option.type === "petUpgrade");
    expect(upgradeOption).toBeDefined();

    const claimResult = claimReward({
      rewardOffer: rewardResult.state,
      selectedOptionId: upgradeOption!.id,
      run: createRewardRunFixture(),
      petInstances: createRewardPetInstancesFixture(),
      registry: starterRegistry
    });

    expect(claimResult.ok).toBe(true);
    expect(claimResult.state.petInstances[0].unlockedUpgradeIds).toContain(
      (upgradeOption as { readonly upgradeId: ReturnType<typeof upgradeId> }).upgradeId
    );
  });

  it("does not generate rewards for lost combat", () => {
    const result = generateCombatRewardOffer({
      combat: createLostCombatFixture(),
      run: createRewardRunFixture(),
      registry: starterRegistry,
      petInstances: createRewardPetInstancesFixture(),
      seed: "lost-integration"
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((rewardError) => rewardError.code)).toEqual(["combat_not_won"]);
  });

  it("can create pet upgrade options for more than one active pet instance", () => {
    const fixture = createMultiPetRewardFixture();
    const result = generateCombatRewardOffer({
      combat: fixture.combat,
      run: fixture.run,
      registry: starterRegistry,
      petInstances: fixture.petInstances,
      seed: "multi-pet-reward",
      cardOptionCount: 0,
      petUpgradeOptionCount: 99
    });
    const targetedPetIds = new Set(
      result.state.options
        .filter((option) => option.type === "petUpgrade")
        .map((option) => option.petInstanceId)
    );

    expect(targetedPetIds).toEqual(new Set([petInstanceId("ember_fox_001"), petInstanceId("ember_fox_002")]));
  });

  it("does not mutate original RunState or PetInstance[] when claiming rewards", () => {
    const run = createRewardRunFixture();
    const petInstances = createRewardPetInstancesFixture();
    const rewardResult = generateCombatRewardOffer({
      combat: createWonCombatFixture(),
      run,
      registry: starterRegistry,
      petInstances,
      seed: "claim-mutation",
      cardOptionCount: 99,
      petUpgradeOptionCount: 99
    });
    const before = { run: clone(run), petInstances: clone(petInstances) };

    for (const option of rewardResult.state.options) {
      claimReward({
        rewardOffer: rewardResult.state,
        selectedOptionId: option.id,
        run,
        petInstances,
        registry: starterRegistry
      });
    }

    expect(clone(run)).toEqual(before.run);
    expect(clone(petInstances)).toEqual(before.petInstances);
  });
});
