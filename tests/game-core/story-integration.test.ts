import { describe, expect, it } from "vitest";
import {
  applyPetStoryEvent,
  cardInstanceId,
  combatantId,
  createCombat,
  createRng,
  createSaveSnapshot,
  evaluatePetSideStories,
  petDefinitionId,
  parseSaveSnapshot,
  petInstanceId,
  playCard,
  restoreSaveSnapshot,
  serializeSaveSnapshot,
  starterRegistry,
  storyFlagId,
  storyEventId,
  petMemoryId,
  upgradeId
} from "../../src/game-core";
import { createHandTunedCombatFixture } from "../../src/game-core/testing/combat-fixtures";
import { createEmberFoxInstanceFixture } from "../../src/game-core/testing/fixtures";
import { createStartedRunFixture } from "../../src/game-core/testing/run-fixtures";
import { createNodeCompletedStoryContext } from "../../src/game-core/testing/story-fixtures";

describe("Ember Fox side story integration", () => {
  it("unlocks the first memory, flag, Warm Bond, and survives save restore", () => {
    const run = createStartedRunFixture({ status: "map_select" });
    const petInstances = [createEmberFoxInstanceFixture()];
    const story = evaluatePetSideStories({
      run,
      petInstances,
      registry: starterRegistry,
      context: createNodeCompletedStoryContext({ run, completedNodeType: "combat" })
    });

    expect(story.ok).toBe(true);
    expect(story.state.petInstances[0]).toMatchObject({
      unlockedMemoryIds: [petMemoryId("ember_fox_memory_burned_orchard")],
      storyFlags: [storyFlagId("ember_fox_memory_01_unlocked")],
      unlockedUpgradeIds: [upgradeId("warm_bond")],
      bondXp: 1
    });
    expect(run.storyFlags).toEqual([]);

    const repeated = evaluatePetSideStories({
      run,
      petInstances: story.state.petInstances,
      registry: starterRegistry,
      context: createNodeCompletedStoryContext({ run, completedNodeType: "combat" })
    });
    expect(repeated.ok).toBe(true);
    expect(repeated.events).toEqual([]);

    const snapshot = createSaveSnapshot({
      profileId: "story_profile",
      activeRun: run,
      petInstances: story.state.petInstances,
      now: "2026-05-25T00:00:00.000Z"
    });
    const serialized = serializeSaveSnapshot(snapshot.state);
    const parsed = parseSaveSnapshot(serialized.state);
    const restored = restoreSaveSnapshot(parsed.state);

    expect(restored.state.petInstances[0].unlockedMemoryIds).toEqual([petMemoryId("ember_fox_memory_burned_orchard")]);
    expect(restored.state.petInstances[0].storyFlags).toEqual([storyFlagId("ember_fox_memory_01_unlocked")]);
    expect(restored.state.petInstances[0].unlockedUpgradeIds).toEqual([upgradeId("warm_bond")]);

    const combat = createCombat({
      run,
      registry: starterRegistry,
      petInstances: restored.state.petInstances,
      monsterIds: [starterRegistry.monsters[0].id],
      seed: "story-warm-bond-combat",
      openingHandSize: 0
    });
    const tunedCombat = {
      ...createHandTunedCombatFixture(),
      activePetInstanceIds: combat.state.activePetInstanceIds,
      petInstances: combat.state.petInstances,
      runPetStates: combat.state.runPetStates
    };
    const played = playCard(
      tunedCombat,
      {
        type: "playCard",
        cardInstanceId: cardInstanceId("fox_bite:1"),
        targetId: combatantId("monster:training_slime:0")
      },
      starterRegistry,
      createRng("story-warm-bond-play")
    );

    expect(played.events.map((event) => event.type)).toContain("CardCostModified");
    expect(played.state.energy).toBe(3);
  });

  it("does not apply to inactive pets during automatic evaluation", () => {
    const run = createStartedRunFixture({ status: "map_select" });
    const petInstances = [
      createEmberFoxInstanceFixture(),
      createEmberFoxInstanceFixture({ id: petInstanceId("ember_fox_inactive"), nickname: "Banked Ember" })
    ];
    const result = evaluatePetSideStories({
      run,
      petInstances,
      registry: starterRegistry,
      context: createNodeCompletedStoryContext({ run, completedNodeType: "combat" })
    });

    expect(result.state.petInstances[0].seenStoryEventIds).toEqual([starterRegistry.storyEvents[0].id]);
    expect(result.state.petInstances[1].seenStoryEventIds).toEqual([]);
  });

  it("uses context run when evaluating active pets without a separate run input", () => {
    const run = createStartedRunFixture({ status: "map_select" });
    const petInstances = [createEmberFoxInstanceFixture()];
    const result = evaluatePetSideStories({
      petInstances,
      registry: starterRegistry,
      context: createNodeCompletedStoryContext({ run, completedNodeType: "combat" })
    });

    expect(result.ok).toBe(true);
    expect(result.state.run).toBe(run);
    expect(result.state.petInstances[0].unlockedMemoryIds).toEqual([petMemoryId("ember_fox_memory_burned_orchard")]);
  });

  it("can explicitly apply a side story to a specified inactive pet", () => {
    const run = createStartedRunFixture({ status: "map_select" });
    const petInstances = [
      createEmberFoxInstanceFixture(),
      createEmberFoxInstanceFixture({ id: petInstanceId("ember_fox_inactive"), nickname: "Banked Ember" })
    ];
    const result = applyPetStoryEvent({
      storyEventId: starterRegistry.storyEvents[0].id,
      petInstanceId: petInstanceId("ember_fox_inactive"),
      run,
      petInstances,
      registry: starterRegistry,
      context: createNodeCompletedStoryContext({ run, completedNodeType: "combat" })
    });

    expect(result.ok).toBe(true);
    expect(result.state.petInstances[1].unlockedMemoryIds).toEqual([petMemoryId("ember_fox_memory_burned_orchard")]);
  });

  it("evaluates chained side-story requirements against updated pet progress", () => {
    const run = createStartedRunFixture({ status: "map_select" });
    const petInstances = [createEmberFoxInstanceFixture()];
    const firstStoryEvent = {
      ...starterRegistry.storyEvents[0],
      id: storyEventId("chain_first"),
      outcomes: [{ type: "unlockPetMemory", memoryId: petMemoryId("chain_memory") }] as const
    };
    const secondStoryEvent = {
      ...starterRegistry.storyEvents[0],
      id: storyEventId("chain_second"),
      requirements: [
        { type: "playerClassIs", playerClassId: run.playerClassId },
        { type: "activePetHasTag", tag: "fox" },
        { type: "hasPetMemory", memoryId: petMemoryId("chain_memory") }
      ] as const,
      outcomes: [{ type: "setStoryFlag", flagId: storyFlagId("chain_flag") }] as const
    };
    const registry = {
      ...starterRegistry,
      storyEvents: [firstStoryEvent, secondStoryEvent],
      petSideStories: [
        {
          id: firstStoryEvent.id,
          petDefinitionId: petDefinitionId("ember_fox"),
          memoryIds: [petMemoryId("chain_memory")],
          storyFlagIds: [storyFlagId("chain_flag")],
          events: [firstStoryEvent, secondStoryEvent]
        }
      ]
    };
    const result = evaluatePetSideStories({
      run,
      petInstances,
      registry,
      context: createNodeCompletedStoryContext({ run, completedNodeType: "combat" })
    });

    expect(result.ok).toBe(true);
    expect(result.state.petInstances[0].unlockedMemoryIds).toEqual([petMemoryId("chain_memory")]);
    expect(result.state.petInstances[0].storyFlags).toEqual([storyFlagId("chain_flag")]);
  });
});
