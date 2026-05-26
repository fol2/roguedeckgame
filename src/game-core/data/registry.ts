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
import { burnStatusDefinition } from "../model/status";

export const starterRegistry: GameContentRegistry = {
  contentVersion: "starter-act1-forest-v1",
  cards: [...starterCards, ...emberFoxCards, ...rewardCards],
  statuses: [burnStatusDefinition],
  pets: petDefinitions,
  players: playerDefinitions,
  monsters: forestMonsters,
  encounters: forestEncounters,
  runMapTemplates: forestRunMapTemplates,
  petUpgrades: emberFoxUpgrades,
  petModifiers: emberFoxUpgrades.flatMap((upgrade) => upgrade.modifiers),
  playerClassModifiers: [],
  storyEvents: emberFoxStoryEvents,
  petSideStories: emberFoxPetSideStories
};

export const cards = starterRegistry.cards;
export const statuses = starterRegistry.statuses;
export const pets = starterRegistry.pets;
export const players = starterRegistry.players;
export const monsters = starterRegistry.monsters;
export const encounters = starterRegistry.encounters;
export const runMapTemplates = starterRegistry.runMapTemplates;
export const petUpgrades = starterRegistry.petUpgrades;
export const petModifiers = starterRegistry.petModifiers ?? [];
export const playerClassModifiers = starterRegistry.playerClassModifiers ?? [];
export const storyEvents = starterRegistry.storyEvents;
export const petSideStories = starterRegistry.petSideStories;
