import type { CardDefinition } from "./card";
import type { EncounterDefinition } from "./encounter";
import type { MonsterAbilityDefinition, MonsterDefinition } from "./monster";
import type { PetDefinition, PetModifierDefinition, PetUpgradeDefinition } from "./pet";
import type { PlayerClassDefinition, PlayerClassModifierDefinition } from "./player";
import type { GameContentRegistry } from "./registry";
import type { RunMapTemplateDefinition } from "./run-map";
import type { StatusDefinition } from "./status";
import type { PetSideStoryDefinition, StoryEventDefinition } from "./story";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { readonly [key: string]: JsonValue };

export type JsonSafe<T> =
  T extends string ? string :
  T extends number ? number :
  T extends boolean ? boolean :
  T extends null ? null :
  T extends undefined ? undefined :
  T extends readonly (infer Item)[] ? readonly JsonSafe<Item>[] :
  T extends object ? { readonly [Key in keyof T]: JsonSafe<T[Key]> } :
  never;

export type CardSchemaDefinition = JsonSafe<CardDefinition>;
export type StatusSchemaDefinition = JsonSafe<StatusDefinition>;
export type PetSchemaDefinition = JsonSafe<PetDefinition>;
export type PlayerClassSchemaDefinition = JsonSafe<PlayerClassDefinition>;
export type MonsterAbilitySchemaDefinition = JsonSafe<MonsterAbilityDefinition>;
export type MonsterSchemaDefinition = JsonSafe<MonsterDefinition>;
export type EncounterSchemaDefinition = JsonSafe<EncounterDefinition>;
export type RunMapTemplateSchemaDefinition = JsonSafe<RunMapTemplateDefinition>;
export type PetUpgradeSchemaDefinition = JsonSafe<PetUpgradeDefinition>;
export type PetModifierSchemaDefinition = JsonSafe<PetModifierDefinition>;
export type PlayerClassModifierSchemaDefinition = JsonSafe<PlayerClassModifierDefinition>;
export type StoryEventSchemaDefinition = JsonSafe<StoryEventDefinition>;
export type PetSideStorySchemaDefinition = JsonSafe<PetSideStoryDefinition>;

export type ContentSchema = {
  readonly contentVersion?: string;
  readonly cards: readonly CardSchemaDefinition[];
  readonly statuses?: readonly StatusSchemaDefinition[];
  readonly pets: readonly PetSchemaDefinition[];
  readonly players: readonly PlayerClassSchemaDefinition[];
  readonly monsterAbilities?: readonly MonsterAbilitySchemaDefinition[];
  readonly monsters: readonly MonsterSchemaDefinition[];
  readonly encounters: readonly EncounterSchemaDefinition[];
  readonly runMapTemplates: readonly RunMapTemplateSchemaDefinition[];
  readonly petUpgrades: readonly PetUpgradeSchemaDefinition[];
  readonly petModifiers?: readonly PetModifierSchemaDefinition[];
  readonly playerClassModifiers?: readonly PlayerClassModifierSchemaDefinition[];
  readonly storyEvents: readonly StoryEventSchemaDefinition[];
  readonly petSideStories: readonly PetSideStorySchemaDefinition[];
};

export type ContentSchemaCollection = Exclude<keyof GameContentRegistry, "contentVersion">;
