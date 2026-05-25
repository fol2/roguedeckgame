import { describe, expect, it } from "vitest";
import {
  cardId,
  cardInstanceId,
  combatantId,
  rewardOfferId,
  rewardOptionId,
  petDefinitionId,
  petInstanceId,
  storyFlagId,
  statusId,
  upgradeId,
  type GameEvent,
  petModifierId,
  type PetTarget,
  validateRunStateShape
} from "../../src/game-core";
import { createRunFixture } from "../../src/game-core/testing/fixtures";

describe("model shape", () => {
  it("uses activePetInstanceIds as an array on RunState", () => {
    const run = createRunFixture();

    expect(Array.isArray(run.activePetInstanceIds)).toBe(true);
    expect(run.activePetInstanceIds).toEqual([petInstanceId("ember_fox_001")]);
    expect(validateRunStateShape(run).errors).toEqual([]);
  });

  it("allows multiple active pet instance ids in the run model", () => {
    const run = createRunFixture({
      activePetInstanceIds: [petInstanceId("ember_fox_001"), petInstanceId("future_pet_002")]
    });

    expect(run.activePetInstanceIds).toHaveLength(2);
  });

  it("supports all required PetTarget variants", () => {
    const targets: readonly PetTarget[] = [
      { type: "leading" },
      { type: "allActive" },
      { type: "specific", petInstanceId: petInstanceId("ember_fox_001") },
      { type: "randomActive" },
      { type: "withTag", tag: "fox" }
    ];

    expect(targets.map((target) => target.type)).toEqual([
      "leading",
      "allActive",
      "specific",
      "randomActive",
      "withTag"
    ]);
  });

  it("models reward offers with card and pet upgrade options", () => {
    const rewardOffer = {
      id: rewardOfferId("reward_fixture"),
      source: "combat" as const,
      combatId: createRunFixture().id,
      seed: "reward-shape",
      status: "open" as const,
      options: [
        { id: rewardOptionId("reward_fixture:card:ember_spark"), type: "card" as const, cardId: cardId("ember_spark") },
        {
          id: rewardOptionId("reward_fixture:petUpgrade:ember_fox_001:burning_fang"),
          type: "petUpgrade" as const,
          petInstanceId: petInstanceId("ember_fox_001"),
          petDefinitionId: petDefinitionId("ember_fox"),
          upgradeId: upgradeId("burning_fang")
        }
      ]
    };

    expect(rewardOffer.options.map((option) => option.type)).toEqual(["card", "petUpgrade"]);
    expect(JSON.parse(JSON.stringify(rewardOffer))).toEqual(rewardOffer);
  });

  it("keeps GameEvent objects serializable as plain data", () => {
    const events: readonly GameEvent[] = [
      {
        type: "CardPlayed",
        cardInstanceId: cardInstanceId("fox_bite:1"),
        cardId: cardId("fox_bite"),
        sourceId: combatantId("player")
      },
      { type: "EnergySpent", amount: 1, remaining: 2 },
      { type: "CardDrawn", cardInstanceId: cardInstanceId("focus:1"), cardId: cardId("focus") },
      {
        type: "CardMoved",
        cardInstanceId: cardInstanceId("focus:1"),
        cardId: cardId("focus"),
        from: "draw",
        to: "hand"
      },
      {
        type: "DamageDealt",
        sourceId: combatantId("player"),
        targetId: combatantId("training_slime"),
        amount: 5,
        blocked: 0
      },
      { type: "BlockGained", targetId: combatantId("player"), amount: 5, total: 5 },
      { type: "StatusApplied", targetId: combatantId("training_slime"), statusId: statusId("burn"), stacks: 2 },
      {
        type: "PetCommanded",
        petInstanceId: petInstanceId("ember_fox_001"),
        cardInstanceId: cardInstanceId("fox_bite:1"),
        cardId: cardId("fox_bite")
      },
      { type: "PetReacted", petInstanceId: petInstanceId("ember_fox_001"), reaction: "guard" },
      { type: "DeckShuffled", from: "deck", to: "draw", count: 3 },
      { type: "ActionRejected", code: "sample", message: "Sample rejection" },
      { type: "CombatantDefeated", combatantId: combatantId("training_slime") },
      {
        type: "RewardOffered",
        rewardOfferId: rewardOfferId("reward_fixture"),
        options: [{ id: rewardOptionId("reward_fixture:card:ember_spark"), type: "card", cardId: cardId("ember_spark") }]
      },
      {
        type: "RewardSelected",
        rewardOfferId: rewardOfferId("reward_fixture"),
        rewardOptionId: rewardOptionId("reward_fixture:card:ember_spark"),
        rewardType: "card"
      },
      { type: "RewardSkipped", rewardOfferId: rewardOfferId("reward_fixture") },
      { type: "CardRewardAdded", cardId: cardId("ember_spark") },
      {
        type: "PetUpgradeUnlocked",
        petInstanceId: petInstanceId("ember_fox_001"),
        upgradeId: upgradeId("burning_fang")
      },
      {
        type: "CardCostModified",
        cardInstanceId: cardInstanceId("fox_bite:1"),
        cardId: cardId("fox_bite"),
        originalCost: 1,
        modifiedCost: 0,
        modifierId: petModifierId("warm_bond_modifier"),
        petInstanceId: petInstanceId("ember_fox_001")
      },
      {
        type: "PetModifierActivated",
        petInstanceId: petInstanceId("ember_fox_001"),
        upgradeId: upgradeId("warm_bond"),
        modifierId: petModifierId("warm_bond_modifier"),
        reason: "cardCost"
      },
      {
        type: "PetModifierConsumed",
        petInstanceId: petInstanceId("ember_fox_001"),
        modifierId: petModifierId("warm_bond_modifier"),
        scope: "combat"
      },
      { type: "StoryFlagSet", flagId: storyFlagId("ember_fox_memory_01_unlocked") },
      { type: "ValidationWarning", code: "sample", message: "Sample warning" }
    ];

    expect(JSON.parse(JSON.stringify(events))).toEqual(events);
  });

  it("does not import Phaser from game-core", () => {
    const modules = import.meta.glob("../../src/game-core/**/*.ts", {
      eager: true,
      query: "?raw",
      import: "default"
    });
    const offenders = Object.entries(modules).filter(([, contents]) => {
      if (typeof contents !== "string") {
        return true;
      }

      return /from\s+["']phaser["']|from\s+["']Phaser["']|import\s+["']phaser["']|import\s+["']Phaser["']/.test(contents);
    });

    expect(offenders).toEqual([]);
  });
});
