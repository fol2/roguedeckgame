import { emberFoxCards } from "./cards/ember-fox-cards";
import { rewardCards } from "./cards/reward-cards";
import { starterCards } from "./cards/starter-cards";
import { forestEncounters } from "./encounters/forest-encounters";
import { forestMonsters } from "./monsters/forest-monsters";
import { pets as petDefinitions } from "./pets/ember-fox";
import { players as playerDefinitions } from "./players/novice-tamer";
import { runMapTemplates as forestRunMapTemplates } from "./run-maps/act1-forest";
import { emberFoxPetSideStories, emberFoxStoryEvents } from "./story/ember-fox-story";
import { emberFoxUpgrades } from "./upgrades/ember-fox-upgrades";
import type { GameContentRegistry } from "../model/registry";

export const starterRegistry: GameContentRegistry = {
  cards: [...starterCards, ...emberFoxCards, ...rewardCards],
  pets: petDefinitions,
  players: playerDefinitions,
  monsters: forestMonsters,
  encounters: forestEncounters,
  runMapTemplates: forestRunMapTemplates,
  petUpgrades: emberFoxUpgrades,
  petModifiers: emberFoxUpgrades.flatMap((upgrade) => upgrade.modifiers),
  storyEvents: emberFoxStoryEvents,
  petSideStories: emberFoxPetSideStories
};

export const cards = starterRegistry.cards;
export const pets = starterRegistry.pets;
export const players = starterRegistry.players;
export const monsters = starterRegistry.monsters;
export const encounters = starterRegistry.encounters;
export const runMapTemplates = starterRegistry.runMapTemplates;
export const petUpgrades = starterRegistry.petUpgrades;
export const petModifiers = starterRegistry.petModifiers ?? [];
export const storyEvents = starterRegistry.storyEvents;
export const petSideStories = starterRegistry.petSideStories;
