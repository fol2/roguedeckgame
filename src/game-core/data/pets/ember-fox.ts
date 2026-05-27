import { cardId, evolutionNodeId, petDefinitionId, storyEventId } from "../../ids";
import type { PetDefinition } from "../../model/pet";

export const emberFox: PetDefinition = {
  id: petDefinitionId("ember_fox"),
  name: "Ember Fox",
  species: "Fox",
  tags: ["pet", "fox", "fire", "burn", "command"],
  baseCommandCardIds: [cardId("fox_bite"), cardId("tailguard"), cardId("kindle_mark"), cardId("fetch_signal")],
  sideStoryId: storyEventId("ember_fox_side_story"),
  evolutionTree: [
    {
      id: evolutionNodeId("ember_fox_kindled_path"),
      name: "Kindled Path",
      description: "A future evolution branch for burn and command synergies.",
      tags: ["fox", "burn", "command"],
      requirements: [{ type: "petBondAtLeast", bondLevel: 2 }],
      unlocks: []
    }
  ]
};

export const pets = [emberFox] as const;
