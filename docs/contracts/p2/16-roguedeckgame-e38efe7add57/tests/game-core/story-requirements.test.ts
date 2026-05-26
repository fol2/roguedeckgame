import { describe, expect, it } from "vitest";
import {
  canApplyStoryEvent,
  petMemoryId,
  playerClassId,
  storyEventId,
  storyFlagId
} from "../../src/game-core";
import { createEmberFoxInstanceFixture, createRunFixture } from "../../src/game-core/testing/fixtures";
import {
  createNodeCompletedStoryContext,
  createStoryEventFixture,
  createStoryRegistryFixture
} from "../../src/game-core/testing/story-fixtures";

describe("pet story requirements", () => {
  it("passes and fails playerClassIs deterministically", () => {
    const storyEvent = createStoryEventFixture({
      requirements: [{ type: "playerClassIs", playerClassId: playerClassId("novice_tamer") }]
    });
    const registry = createStoryRegistryFixture(storyEvent);
    const petInstance = createEmberFoxInstanceFixture();

    expect(canApplyStoryEvent({
      storyEvent,
      petInstance,
      petInstances: [petInstance],
      registry,
      context: createNodeCompletedStoryContext()
    }).state).toBe(true);

    expect(canApplyStoryEvent({
      storyEvent,
      petInstance,
      petInstances: [petInstance],
      registry,
      context: createNodeCompletedStoryContext({
        run: createRunFixture({ playerClassId: playerClassId("wrong_class") })
      })
    }).state).toBe(false);
  });

  it("passes and fails activePetHasTag", () => {
    const storyEvent = createStoryEventFixture({
      requirements: [{ type: "activePetHasTag", tag: "fox" }]
    });
    const registry = createStoryRegistryFixture(storyEvent);
    const petInstance = createEmberFoxInstanceFixture();

    expect(canApplyStoryEvent({
      storyEvent,
      petInstance,
      petInstances: [petInstance],
      registry,
      context: createNodeCompletedStoryContext()
    }).state).toBe(true);

    expect(canApplyStoryEvent({
      storyEvent: { ...storyEvent, requirements: [{ type: "activePetHasTag", tag: "wolf" }] },
      petInstance,
      petInstances: [petInstance],
      registry,
      context: createNodeCompletedStoryContext()
    }).state).toBe(false);
  });

  it("checks bond, memory, seen event, and pet story flags", () => {
    const petInstance = createEmberFoxInstanceFixture({
      bondLevel: 2,
      unlockedMemoryIds: [petMemoryId("test_memory")],
      storyFlags: [storyFlagId("test_story_flag")],
      seenStoryEventIds: [storyEventId("seen_story")]
    });
    const storyEvent = createStoryEventFixture({
      requirements: [
        { type: "petBondAtLeast", bondLevel: 2 },
        { type: "hasPetMemory", memoryId: petMemoryId("test_memory") },
        { type: "hasSeenEvent", eventId: storyEventId("seen_story") },
        { type: "hasPetStoryFlag", flagId: storyFlagId("test_story_flag") },
        { type: "lacksPetStoryFlag", flagId: storyFlagId("missing_story_flag") }
      ]
    });
    const registry = createStoryRegistryFixture(storyEvent);

    expect(canApplyStoryEvent({
      storyEvent,
      petInstance,
      petInstances: [petInstance],
      registry,
      context: createNodeCompletedStoryContext()
    }).state).toBe(true);

    expect(canApplyStoryEvent({
      storyEvent: { ...storyEvent, requirements: [{ type: "petBondAtLeast", bondLevel: 3 }] },
      petInstance,
      petInstances: [petInstance],
      registry,
      context: createNodeCompletedStoryContext()
    }).state).toBe(false);

    expect(canApplyStoryEvent({
      storyEvent: { ...storyEvent, requirements: [{ type: "hasPetMemory", memoryId: petMemoryId("missing_memory") }] },
      petInstance,
      petInstances: [petInstance],
      registry,
      context: createNodeCompletedStoryContext()
    }).state).toBe(false);

    expect(canApplyStoryEvent({
      storyEvent: { ...storyEvent, requirements: [{ type: "hasSeenEvent", eventId: storyEventId("missing_seen_story") }] },
      petInstance,
      petInstances: [petInstance],
      registry,
      context: createNodeCompletedStoryContext()
    }).state).toBe(false);

    expect(canApplyStoryEvent({
      storyEvent: { ...storyEvent, requirements: [{ type: "hasPetStoryFlag", flagId: storyFlagId("missing_story_flag") }] },
      petInstance,
      petInstances: [petInstance],
      registry,
      context: createNodeCompletedStoryContext()
    }).state).toBe(false);

    expect(canApplyStoryEvent({
      storyEvent: { ...storyEvent, requirements: [{ type: "lacksPetStoryFlag", flagId: storyFlagId("test_story_flag") }] },
      petInstance,
      petInstances: [petInstance],
      registry,
      context: createNodeCompletedStoryContext()
    }).state).toBe(false);
  });

  it("checks run status, completed node type, and trigger", () => {
    const petInstance = createEmberFoxInstanceFixture();
    const storyEvent = createStoryEventFixture({
      trigger: "nodeCompleted",
      requirements: [
        { type: "runStatusIs", status: "map_select" },
        { type: "completedRunNodeType", nodeType: "combat" }
      ]
    });
    const registry = createStoryRegistryFixture(storyEvent);

    expect(canApplyStoryEvent({
      storyEvent,
      petInstance,
      petInstances: [petInstance],
      registry,
      context: createNodeCompletedStoryContext()
    }).state).toBe(true);

    expect(canApplyStoryEvent({
      storyEvent,
      petInstance,
      petInstances: [petInstance],
      registry,
      context: createNodeCompletedStoryContext({ trigger: "combatWon" })
    }).state).toBe(false);
  });
});
