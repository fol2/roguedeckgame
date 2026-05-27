import type {
  CardId,
  EncounterId,
  MonsterId,
  MonsterAbilityId,
  PetDefinitionId,
  PetModifierId,
  PlayerClassModifierId,
  PlayerClassId,
  RewardPoolId,
  RunTemplateId,
  StoryEventId,
  StatusId,
  UpgradeId
} from "../ids";
import type { CardDefinition } from "../model/card";
import type { EncounterDefinition } from "../model/encounter";
import type { MonsterAbilityDefinition, MonsterDefinition } from "../model/monster";
import type { PetDefinition, PetModifierDefinition, PetUpgradeDefinition } from "../model/pet";
import type { PlayerClassDefinition, PlayerClassModifierDefinition } from "../model/player";
import type { RewardPoolDefinition } from "../model/reward";
import type { GameContentRegistry } from "../model/registry";
import type { RunMapTemplateDefinition } from "../model/run-map";
import { burnStatusDefinition, type StatusDefinition } from "../model/status";
import type { PetSideStoryDefinition, StoryEventDefinition } from "../model/story";

export type IndexedContentCollection =
  | "cards"
  | "statuses"
  | "pets"
  | "players"
  | "monsterAbilities"
  | "monsters"
  | "encounters"
  | "runMapTemplates"
  | "rewardPools"
  | "petUpgrades"
  | "petModifiers"
  | "playerClassModifiers"
  | "storyEvents"
  | "petSideStories";

export type DuplicateContentId = {
  readonly collection: IndexedContentCollection;
  readonly id: string;
};

export type ContentIndex = {
  readonly cardsById: ReadonlyMap<CardId, CardDefinition>;
  readonly statusesById: ReadonlyMap<StatusId, StatusDefinition>;
  readonly petsById: ReadonlyMap<PetDefinitionId, PetDefinition>;
  readonly playersById: ReadonlyMap<PlayerClassId, PlayerClassDefinition>;
  readonly monsterAbilitiesById?: ReadonlyMap<MonsterAbilityId, MonsterAbilityDefinition>;
  readonly monstersById: ReadonlyMap<MonsterId, MonsterDefinition>;
  readonly encountersById: ReadonlyMap<EncounterId, EncounterDefinition>;
  readonly runMapTemplatesById: ReadonlyMap<RunTemplateId, RunMapTemplateDefinition>;
  readonly rewardPoolsById: ReadonlyMap<RewardPoolId, RewardPoolDefinition>;
  readonly petUpgradesById: ReadonlyMap<UpgradeId, PetUpgradeDefinition>;
  readonly petModifiersById: ReadonlyMap<PetModifierId, PetModifierDefinition>;
  readonly playerClassModifiersById: ReadonlyMap<PlayerClassModifierId, PlayerClassModifierDefinition>;
  readonly storyEventsById: ReadonlyMap<StoryEventId, StoryEventDefinition>;
  readonly petSideStoriesById: ReadonlyMap<StoryEventId, PetSideStoryDefinition>;
  readonly duplicateIds: readonly DuplicateContentId[];
};

export type ContentContext = {
  readonly registry: GameContentRegistry;
  readonly index: ContentIndex;
};

type DefinitionWithId = {
  readonly id: unknown;
};

type IndexedMapResult<Id extends string, Definition> = {
  readonly map: ReadonlyMap<Id, Definition>;
  readonly duplicateIds: readonly string[];
};

const buildIndexedMap = <Id extends string, Definition>(
  collection: readonly Definition[],
  getId: (definition: Definition) => unknown
): IndexedMapResult<Id, Definition> => {
  const map = new Map<Id, Definition>();
  const seen = new Set<string>();
  const duplicateIds = new Set<string>();

  for (const definition of collection) {
    const id = getId(definition);
    if (typeof id !== "string") {
      continue;
    }

    if (seen.has(id)) {
      duplicateIds.add(id);
    }
    seen.add(id);
    map.set(id as Id, definition);
  }

  return { map, duplicateIds: [...duplicateIds] };
};

const collect = <Id extends string, Definition extends DefinitionWithId>(
  collectionName: IndexedContentCollection,
  collection: readonly Definition[]
): {
  readonly map: ReadonlyMap<Id, Definition>;
  readonly duplicateIds: readonly DuplicateContentId[];
} => {
  const result = buildIndexedMap<Id, Definition>(collection, (definition) =>
    typeof definition === "object" && definition !== null ? definition.id : undefined
  );

  return {
    map: result.map,
    duplicateIds: result.duplicateIds.map((id) => ({ collection: collectionName, id }))
  };
};

export const buildContentIndex = (registry: GameContentRegistry): ContentIndex => {
  const cards = collect<CardId, CardDefinition>("cards", registry.cards);
  const statuses = collect<StatusId, StatusDefinition>("statuses", registry.statuses ?? [burnStatusDefinition]);
  const pets = collect<PetDefinitionId, PetDefinition>("pets", registry.pets);
  const players = collect<PlayerClassId, PlayerClassDefinition>("players", registry.players);
  const monsterAbilities = collect<MonsterAbilityId, MonsterAbilityDefinition>("monsterAbilities", registry.monsterAbilities ?? []);
  const monsters = collect<MonsterId, MonsterDefinition>("monsters", registry.monsters);
  const encounters = collect<EncounterId, EncounterDefinition>("encounters", registry.encounters);
  const runMapTemplates = collect<RunTemplateId, RunMapTemplateDefinition>("runMapTemplates", registry.runMapTemplates);
  const rewardPools = collect<RewardPoolId, RewardPoolDefinition>("rewardPools", registry.rewardPools ?? []);
  const petUpgrades = collect<UpgradeId, PetUpgradeDefinition>("petUpgrades", registry.petUpgrades);
  const petModifiers = collect<PetModifierId, PetModifierDefinition>("petModifiers", registry.petModifiers ?? []);
  const playerClassModifiers = collect<PlayerClassModifierId, PlayerClassModifierDefinition>("playerClassModifiers", registry.playerClassModifiers ?? []);
  const storyEvents = collect<StoryEventId, StoryEventDefinition>("storyEvents", registry.storyEvents);
  const petSideStories = collect<StoryEventId, PetSideStoryDefinition>("petSideStories", registry.petSideStories);

  return {
    cardsById: cards.map,
    statusesById: statuses.map,
    petsById: pets.map,
    playersById: players.map,
    monsterAbilitiesById: monsterAbilities.map,
    monstersById: monsters.map,
    encountersById: encounters.map,
    runMapTemplatesById: runMapTemplates.map,
    rewardPoolsById: rewardPools.map,
    petUpgradesById: petUpgrades.map,
    petModifiersById: petModifiers.map,
    playerClassModifiersById: playerClassModifiers.map,
    storyEventsById: storyEvents.map,
    petSideStoriesById: petSideStories.map,
    duplicateIds: [
      ...cards.duplicateIds,
      ...statuses.duplicateIds,
      ...pets.duplicateIds,
      ...players.duplicateIds,
      ...monsterAbilities.duplicateIds,
      ...monsters.duplicateIds,
      ...encounters.duplicateIds,
      ...runMapTemplates.duplicateIds,
      ...rewardPools.duplicateIds,
      ...petUpgrades.duplicateIds,
      ...petModifiers.duplicateIds,
      ...playerClassModifiers.duplicateIds,
      ...storyEvents.duplicateIds,
      ...petSideStories.duplicateIds
    ]
  };
};

export const createContentContext = (registry: GameContentRegistry): ContentContext => ({
  registry,
  index: buildContentIndex(registry)
});
