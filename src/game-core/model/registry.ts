import type { CardDefinition } from "./card";
import type { EncounterDefinition } from "./encounter";
import type { MonsterAbilityDefinition, MonsterDefinition } from "./monster";
import type { PetDefinition, PetModifierDefinition, PetUpgradeDefinition } from "./pet";
import type { PlayerClassDefinition, PlayerClassModifierDefinition } from "./player";
import type { PetSideStoryDefinition, StoryEventDefinition } from "./story";
import type { RunMapTemplateDefinition } from "./run-map";
import type { StatusDefinition } from "./status";

export type GameContentRegistry = {
  readonly contentVersion?: string;
  readonly cards: readonly CardDefinition[];
  readonly statuses?: readonly StatusDefinition[];
  readonly pets: readonly PetDefinition[];
  readonly players: readonly PlayerClassDefinition[];
  readonly monsterAbilities?: readonly MonsterAbilityDefinition[];
  readonly monsters: readonly MonsterDefinition[];
  readonly encounters: readonly EncounterDefinition[];
  readonly runMapTemplates: readonly RunMapTemplateDefinition[];
  readonly petUpgrades: readonly PetUpgradeDefinition[];
  readonly petModifiers?: readonly PetModifierDefinition[];
  readonly playerClassModifiers?: readonly PlayerClassModifierDefinition[];
  readonly storyEvents: readonly StoryEventDefinition[];
  readonly petSideStories: readonly PetSideStoryDefinition[];
};
