import {
  petMemoryId,
  petDefinitionId,
  playerClassId,
  storyEventId,
  storyFlagId,
  upgradeId
} from "../../ids";
import type { PetSideStoryDefinition, StoryEventDefinition } from "../../model/story";

export const emberFoxSideStory: StoryEventDefinition = {
  id: storyEventId("ember_fox_side_story"),
  title: "Burned Orchard",
  description: "A small memory hook for Ember Fox's first side story.",
  tags: ["pet", "fox", "memory", "burn"],
  requirements: [
    { type: "playerClassIs", playerClassId: playerClassId("novice_tamer") },
    { type: "activePetHasTag", tag: "fox" }
  ],
  outcomes: [
    {
      type: "unlockPetMemory",
      memoryId: petMemoryId("ember_fox_memory_burned_orchard")
    },
    {
      type: "setStoryFlag",
      flagId: storyFlagId("ember_fox_memory_01_unlocked")
    },
    {
      type: "unlockPetUpgrade",
      upgradeId: upgradeId("warm_bond")
    }
  ]
};

export const emberFoxStoryEvents = [emberFoxSideStory] as const;

export const emberFoxPetSideStory: PetSideStoryDefinition = {
  id: storyEventId("ember_fox_side_story"),
  petDefinitionId: petDefinitionId("ember_fox"),
  memoryIds: [petMemoryId("ember_fox_memory_burned_orchard")],
  storyFlagIds: [storyFlagId("ember_fox_memory_01_unlocked")],
  events: [emberFoxSideStory]
};

export const emberFoxPetSideStories = [emberFoxPetSideStory] as const;
