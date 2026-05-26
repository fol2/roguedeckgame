import {
  petDefinitionId,
  petInstanceId,
  petMemoryId,
  playerClassId,
  storyEventId,
  storyFlagId,
  upgradeId
} from "../ids";
import { starterRegistry } from "../data/registry";
import type { GameContentRegistry } from "../model/registry";
import type { PetStoryContext, StoryEventDefinition } from "../model/story";
import { createEmberFoxInstanceFixture, createRunFixture } from "./fixtures";

export const createNodeCompletedStoryContext = (
  overrides: Partial<PetStoryContext> = {}
): PetStoryContext => ({
  trigger: "nodeCompleted",
  run: createRunFixture({ status: "map_select" }),
  completedNodeType: "combat",
  ...overrides
});

export const createStoryEventFixture = (
  overrides: Partial<StoryEventDefinition> = {}
): StoryEventDefinition => ({
  id: storyEventId("test_pet_story"),
  title: "Test Pet Story",
  description: "Small test side story.",
  tags: ["pet", "test"],
  trigger: "nodeCompleted",
  requirements: [
    { type: "playerClassIs", playerClassId: playerClassId("novice_tamer") },
    { type: "activePetHasTag", tag: "fox" }
  ],
  outcomes: [
    { type: "unlockPetMemory", memoryId: petMemoryId("test_memory") },
    { type: "setStoryFlag", flagId: storyFlagId("test_story_flag") },
    { type: "unlockPetUpgrade", upgradeId: upgradeId("warm_bond") },
    { type: "addBondXp", amount: 1 }
  ],
  ...overrides
});

export const createStoryRegistryFixture = (
  storyEvent: StoryEventDefinition = createStoryEventFixture(),
  overrides: Partial<GameContentRegistry> = {}
): GameContentRegistry => ({
  ...starterRegistry,
  storyEvents: [storyEvent],
  petSideStories: [
    {
      id: storyEvent.id,
      petDefinitionId: petDefinitionId("ember_fox"),
      memoryIds: [petMemoryId("test_memory"), petMemoryId("ember_fox_memory_burned_orchard")],
      storyFlagIds: [storyFlagId("test_story_flag"), storyFlagId("ember_fox_memory_01_unlocked")],
      events: [storyEvent]
    }
  ],
  ...overrides
});

export const createInactiveStoryPetInstancesFixture = () => [
  createEmberFoxInstanceFixture(),
  createEmberFoxInstanceFixture({
    id: petInstanceId("ember_fox_inactive"),
    nickname: "Banked Ember"
  })
] as const;
