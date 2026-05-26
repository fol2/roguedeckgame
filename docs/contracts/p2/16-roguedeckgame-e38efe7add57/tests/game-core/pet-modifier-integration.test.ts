import { describe, expect, it } from "vitest";
import {
  cardInstanceId,
  claimReward,
  combatantId,
  createCombat,
  createRng,
  monsterId,
  petInstanceId,
  playCard,
  starterRegistry,
  upgradeId
} from "../../src/game-core";
import { createHandTunedCombatFixture } from "../../src/game-core/testing/combat-fixtures";
import {
  createBurningFangRewardOfferFixture,
  createOpenRewardOfferFixture,
  createPetUpgradeRewardOptionFixture
} from "../../src/game-core/testing/reward-fixtures";
import { createEmberFoxInstanceFixture, createRunFixture } from "../../src/game-core/testing/fixtures";

describe("pet modifier reward integration", () => {
  it("uses a reward-claimed Burning Fang upgrade in the next combat", () => {
    const run = createRunFixture();
    const petInstances = [createEmberFoxInstanceFixture()];
    const option = createPetUpgradeRewardOptionFixture({
      petInstanceId: petInstanceId("ember_fox_001"),
      upgradeId: upgradeId("burning_fang")
    });
    const claim = claimReward({
      rewardOffer: createBurningFangRewardOfferFixture({ options: [option] }),
      selectedOptionId: option.id,
      run,
      petInstances,
      registry: starterRegistry
    });
    expect(claim.ok).toBe(true);
    expect(claim.state.petInstances[0].unlockedUpgradeIds).toEqual([upgradeId("burning_fang")]);

    const combat = createCombat({
      run: claim.state.run,
      registry: starterRegistry,
      petInstances: claim.state.petInstances,
      monsterIds: [monsterId("training_slime")],
      seed: "reward-to-modifier",
      openingHandSize: 0
    });
    expect(combat.ok).toBe(true);
    expect(combat.state.runPetStates[0].activeModifierIds).toEqual(["burning_fang_modifier"]);

    const state = {
      ...createHandTunedCombatFixture(),
      activePetInstanceIds: combat.state.activePetInstanceIds,
      petInstances: combat.state.petInstances,
      runPetStates: combat.state.runPetStates
    };
    const result = playCard(
      state,
      {
        type: "playCard",
        cardInstanceId: cardInstanceId("fox_bite:1"),
        targetId: combatantId("monster:training_slime:0")
      },
      starterRegistry,
      createRng("reward-modifier-bite")
    );

    expect(result.ok).toBe(true);
    expect(result.state.monsters[0].hp).toBe(15);
    expect(result.state.monsters[0].statuses).toEqual([{ statusId: "burn", stacks: 3 }]);
  });

  it("rejects combat creation when an unlocked upgrade definition is missing", () => {
    const result = createCombat({
      run: createRunFixture(),
      registry: {
        ...starterRegistry,
        petUpgrades: starterRegistry.petUpgrades.filter((upgrade) => upgrade.id !== upgradeId("burning_fang"))
      },
      petInstances: [createEmberFoxInstanceFixture({ unlockedUpgradeIds: [upgradeId("burning_fang")] })],
      monsterIds: [monsterId("training_slime")],
      seed: "missing-upgrade",
      openingHandSize: 0
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["missing_pet_upgrade_definition"]);
  });

  it("rejects invalid active modifier definitions during combat creation", () => {
    const result = createCombat({
      run: createRunFixture(),
      registry: {
        ...starterRegistry,
        petUpgrades: starterRegistry.petUpgrades.map((upgrade) =>
          upgrade.id === upgradeId("burning_fang")
            ? {
                ...upgrade,
                modifiers: [undefined as unknown as typeof upgrade.modifiers[0]]
              }
            : upgrade
        )
      },
      petInstances: [createEmberFoxInstanceFixture({ unlockedUpgradeIds: [upgradeId("burning_fang")] })],
      monsterIds: [monsterId("training_slime")],
      seed: "invalid-modifier-definition",
      openingHandSize: 0
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["invalid_pet_modifier"]);
  });

  it("rejects active modifier definitions with non-string ids during combat creation", () => {
    const result = createCombat({
      run: createRunFixture(),
      registry: {
        ...starterRegistry,
        petUpgrades: starterRegistry.petUpgrades.map((upgrade) =>
          upgrade.id === upgradeId("burning_fang")
            ? {
                ...upgrade,
                modifiers: [
                  {
                    ...upgrade.modifiers[0],
                    id: 123 as unknown as typeof upgrade.modifiers[0]["id"]
                  }
                ]
              }
            : upgrade
        )
      },
      petInstances: [createEmberFoxInstanceFixture({ unlockedUpgradeIds: [upgradeId("burning_fang")] })],
      monsterIds: [monsterId("training_slime")],
      seed: "invalid-modifier-id",
      openingHandSize: 0
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["invalid_pet_modifier"]);
  });
});
