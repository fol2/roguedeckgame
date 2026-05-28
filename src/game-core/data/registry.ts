import { emberFoxCards } from "./cards/ember-fox-cards";
import { rewardCards } from "./cards/reward-cards";
import { starterCards } from "./cards/starter-cards";
import { decks as deckDefinitions } from "./decks/novice-tamer-starter";
import { forestEncounters } from "./encounters/forest-encounters";
import { forestMonsterAbilities, forestMonsters } from "./monsters/forest-monsters";
import { pets as petDefinitions } from "./pets/ember-fox";
import { ashboundKeeperClassModifiers } from "./players/ashbound-keeper-modifiers";
import { players as playerDefinitions } from "./players/novice-tamer";
import { runMapTemplates as forestRunMapTemplates } from "./run-maps/act1-forest";
import { rewardPools as rewardPoolDefinitions } from "./rewards/reward-pools";
import { emberFoxPetSideStories, emberFoxStoryEvents } from "./story/ember-fox-story";
import { emberFoxUpgrades } from "./upgrades/ember-fox-upgrades";
import type { GameContentRegistry } from "../model/registry";
import { burnStatusDefinition } from "../model/status";

export const starterRegistry: GameContentRegistry = {
  contentVersion: "ashwood-trail-reveal-scope-v4",
  cards: [...starterCards, ...emberFoxCards, ...rewardCards],
  decks: deckDefinitions,
  statuses: [burnStatusDefinition],
  pets: petDefinitions,
  players: playerDefinitions,
  monsterAbilities: forestMonsterAbilities,
  monsters: forestMonsters,
  encounters: forestEncounters,
  runMapTemplates: forestRunMapTemplates,
  rewardPools: rewardPoolDefinitions,
  petUpgrades: emberFoxUpgrades,
  petModifiers: emberFoxUpgrades.flatMap((upgrade) => upgrade.modifiers),
  playerClassModifiers: ashboundKeeperClassModifiers,
  storyEvents: emberFoxStoryEvents,
  petSideStories: emberFoxPetSideStories
};

export const cards = starterRegistry.cards;
export const decks = starterRegistry.decks ?? [];
export const statuses = starterRegistry.statuses;
export const pets = starterRegistry.pets;
export const players = starterRegistry.players;
export const monsterAbilities = starterRegistry.monsterAbilities ?? [];
export const monsters = starterRegistry.monsters;
export const encounters = starterRegistry.encounters;
export const runMapTemplates = starterRegistry.runMapTemplates;
export const rewardPools = starterRegistry.rewardPools ?? [];
export const petUpgrades = starterRegistry.petUpgrades;
export const petModifiers = starterRegistry.petModifiers ?? [];
export const playerClassModifiers = starterRegistry.playerClassModifiers ?? [];
export const storyEvents = starterRegistry.storyEvents;
export const petSideStories = starterRegistry.petSideStories;
