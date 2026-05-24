import type { CardDefinition } from "./card";
import type { MonsterDefinition } from "./monster";
import type { PetDefinition, PetUpgradeDefinition } from "./pet";
import type { PlayerClassDefinition } from "./player";
import type { PetSideStoryDefinition, StoryEventDefinition } from "./story";

export type GameContentRegistry = {
  readonly cards: readonly CardDefinition[];
  readonly pets: readonly PetDefinition[];
  readonly players: readonly PlayerClassDefinition[];
  readonly monsters: readonly MonsterDefinition[];
  readonly petUpgrades: readonly PetUpgradeDefinition[];
  readonly storyEvents: readonly StoryEventDefinition[];
  readonly petSideStories: readonly PetSideStoryDefinition[];
};
