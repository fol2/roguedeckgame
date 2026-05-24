import { describe, expect, it } from "vitest";
import {
  cardId,
  combatantId,
  petInstanceId,
  storyFlagId,
  statusId,
  type GameEvent,
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

  it("keeps GameEvent objects serializable as plain data", () => {
    const events: readonly GameEvent[] = [
      { type: "CardPlayed", cardId: cardId("fox_bite"), sourceId: combatantId("player") },
      { type: "EnergySpent", amount: 1, remaining: 2 },
      { type: "CardDrawn", cardId: cardId("focus") },
      { type: "CardMoved", cardId: cardId("focus"), from: "draw", to: "hand" },
      {
        type: "DamageDealt",
        sourceId: combatantId("player"),
        targetId: combatantId("training_slime"),
        amount: 5
      },
      { type: "BlockGained", targetId: combatantId("player"), amount: 5 },
      { type: "StatusApplied", targetId: combatantId("training_slime"), statusId: statusId("burn"), stacks: 2 },
      { type: "PetCommanded", petInstanceId: petInstanceId("ember_fox_001"), cardId: cardId("fox_bite") },
      { type: "PetReacted", petInstanceId: petInstanceId("ember_fox_001"), reaction: "guard" },
      { type: "RewardOffered", upgradeIds: [] },
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
