import type { AbilityDescriptor } from "./ability-descriptors";
import { getCardAbilityDescriptor, getMonsterAbilityDescriptor } from "./ability-descriptors";
import { createContentSchemaFromRegistry } from "./content-schema";
import { validateLevelAuthoringRegistry, validateRegistry, type ValidationIssue } from "./validation";
import type { CardDefinition } from "../model/card";
import type { EncounterDefinition } from "../model/encounter";
import type { MonsterAbilityDefinition, MonsterDefinition } from "../model/monster";
import type { PetDefinition, PetModifierDefinition, PetUpgradeDefinition } from "../model/pet";
import type { PlayerClassDefinition, PlayerClassModifierDefinition } from "../model/player";
import type { GameContentRegistry } from "../model/registry";
import type { RewardPoolDefinition } from "../model/reward";
import type { RunMapTemplateDefinition } from "../model/run-map";
import { burnStatusDefinition, type StatusDefinition } from "../model/status";
import type { PetSideStoryDefinition, StoryEventDefinition } from "../model/story";
import { buildContentDependencyReport, formatContentDependencyIssue, type ContentDependencyIssue } from "../testing/content-dependencies";
import { buildContentReport } from "../testing/content-report";
import { buildLevelAuthoringReport } from "../testing/level-authoring-report";

export type ContentWorkbenchCollectionId =
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

export type ContentWorkbenchSchemaCollection = {
  readonly id: ContentWorkbenchCollectionId;
  readonly count: number;
  readonly required: boolean;
};

export type ContentWorkbenchAbilityPreview = Pick<
  AbilityDescriptor,
  "source" | "id" | "name" | "description" | "displayRole" | "tags" | "targetProfile" | "effectSummaries"
>;

export type ContentWorkbenchCardItem = {
  readonly id: string;
  readonly name: string;
  readonly type: CardDefinition["type"];
  readonly rarity: string;
  readonly cost: number;
  readonly tags: readonly string[];
  readonly requiresPetDefinitionId?: string;
  readonly preview: ContentWorkbenchAbilityPreview;
};

export type ContentWorkbenchMonsterAbilityItem = {
  readonly id: string;
  readonly name: string;
  readonly intentType: MonsterAbilityDefinition["intentType"];
  readonly tags: readonly string[];
  readonly preview: ContentWorkbenchAbilityPreview;
};

export type ContentWorkbenchMonsterItem = {
  readonly id: string;
  readonly name: string;
  readonly maxHp: number;
  readonly tags: readonly string[];
  readonly abilityIds: readonly string[];
  readonly intentCount: number;
  readonly scheduledIntentCount: number;
};

export type ContentWorkbenchStatusItem = {
  readonly id: string;
  readonly name: string;
  readonly tags: readonly string[];
  readonly behaviourType?: string;
  readonly runtimeSupported: boolean;
};

export type ContentWorkbenchPlayerItem = {
  readonly id: string;
  readonly name: string;
  readonly maxHp: number;
  readonly maxActivePets: number;
  readonly petSlotCount: number;
  readonly startingDeckCardIds: readonly string[];
  readonly classTags: readonly string[];
};

export type ContentWorkbenchPetItem = {
  readonly id: string;
  readonly name: string;
  readonly species: string;
  readonly tags: readonly string[];
  readonly baseCommandCardIds: readonly string[];
  readonly evolutionNodeCount: number;
  readonly sideStoryId?: string;
};

export type ContentWorkbenchEncounterItem = {
  readonly id: string;
  readonly type: EncounterDefinition["type"];
  readonly name: string;
  readonly monsterIds: readonly string[];
  readonly tags: readonly string[];
  readonly actId?: string;
  readonly difficultyBand?: string;
  readonly budget?: number;
  readonly rewardPoolId?: string;
  readonly monsterGroupCount: number;
};

export type ContentWorkbenchRunMapItem = {
  readonly id: string;
  readonly name: string;
  readonly actId?: string;
  readonly nodeCount: number;
  readonly combatNodeCount: number;
  readonly budgetedNodeCount: number;
};

export type ContentWorkbenchRewardPoolItem = {
  readonly id: string;
  readonly name: string;
  readonly rewardTypes: readonly string[];
  readonly tags: readonly string[];
};

export type ContentWorkbenchPetUpgradeItem = {
  readonly id: string;
  readonly petDefinitionId: string;
  readonly name: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly modifierIds: readonly string[];
  readonly modifierCount: number;
  readonly unlockCardIds: readonly string[];
  readonly storyFlagUnlocks: readonly string[];
};

export type ContentWorkbenchPetModifierItem = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly ruleTypes: readonly string[];
};

export type ContentWorkbenchPlayerClassModifierItem = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly ruleTypes: readonly string[];
};

export type ContentWorkbenchStoryEventItem = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly trigger?: string;
  readonly repeatable: boolean;
  readonly tags: readonly string[];
  readonly requirementCount: number;
  readonly outcomeTypes: readonly string[];
};

export type ContentWorkbenchPetSideStoryItem = {
  readonly id: string;
  readonly petDefinitionId: string;
  readonly memoryIds: readonly string[];
  readonly storyFlagIds: readonly string[];
  readonly eventIds: readonly string[];
};

export type ContentWorkbenchDependencyEndpoint = {
  readonly collection: string;
  readonly id: string;
  readonly path: string;
};

export type ContentWorkbenchDependencyDiagnostic = {
  readonly severity: ContentDependencyIssue["severity"];
  readonly code: string;
  readonly path: string;
  readonly message: string;
  readonly source: ContentWorkbenchDependencyEndpoint;
  readonly target?: ContentWorkbenchDependencyEndpoint;
  readonly summary: string;
};

export type ContentWorkbenchCollectionCounts = {
  readonly [Collection in ContentWorkbenchCollectionId]: number;
};

export type ContentWorkbenchContentReport = {
  readonly counts: ContentWorkbenchCollectionCounts;
  readonly cardRarities: readonly string[];
  readonly cardTags: readonly string[];
  readonly effectTypes: readonly string[];
  readonly statusIds: readonly string[];
  readonly runtimeSupportedStatusIds: readonly string[];
  readonly metadataOnlyStatusIds: readonly string[];
  readonly statusBehaviourTypes: readonly string[];
  readonly petModifierRuleTypes: readonly string[];
  readonly playerClassModifierIds: readonly string[];
  readonly playerClassModifierRuleTypes: readonly string[];
  readonly deckOperationRewardTypes: readonly string[];
  readonly scheduledMonsterIds: readonly string[];
  readonly encounterTypes: readonly string[];
  readonly runMapNodeTypes: readonly string[];
  readonly dependencyReferenceCount: number;
  readonly dependencyMissingReferenceCount: number;
  readonly unusedCardIds: readonly string[];
  readonly unusedStatusIds: readonly string[];
};

export type ContentWorkbenchLevelReport = {
  readonly encounterBudgetsByType: Readonly<Record<string, number>>;
  readonly encounterCount: number;
  readonly runMapTemplateCount: number;
  readonly budgetedRunNodeCount: number;
  readonly combatRunNodeCount: number;
  readonly runMapTemplates: readonly {
    readonly id: string;
    readonly actId?: string;
    readonly nodeCount: number;
    readonly combatNodeCount: number;
    readonly budgetedNodeCount: number;
  }[];
};

export type ContentWorkbenchDiagnostics = {
  readonly registryErrors: readonly ValidationIssue[];
  readonly registryWarnings: readonly ValidationIssue[];
  readonly levelAuthoringErrors: readonly ValidationIssue[];
  readonly levelAuthoringWarnings: readonly ValidationIssue[];
  readonly dependencyIssues: readonly ContentWorkbenchDependencyDiagnostic[];
  readonly dependencyReferenceCount: number;
  readonly dependencyMissingReferenceCount: number;
};

export type ContentWorkbenchViewModel = {
  readonly contentVersion?: string;
  readonly schema: {
    readonly collectionCount: number;
    readonly collections: readonly ContentWorkbenchSchemaCollection[];
  };
  readonly diagnostics: ContentWorkbenchDiagnostics;
  readonly reports: {
    readonly content: ContentWorkbenchContentReport;
    readonly levelAuthoring: ContentWorkbenchLevelReport;
  };
  readonly sections: {
    readonly cards: readonly ContentWorkbenchCardItem[];
    readonly monsterAbilities: readonly ContentWorkbenchMonsterAbilityItem[];
    readonly monsters: readonly ContentWorkbenchMonsterItem[];
    readonly statuses: readonly ContentWorkbenchStatusItem[];
    readonly players: readonly ContentWorkbenchPlayerItem[];
    readonly pets: readonly ContentWorkbenchPetItem[];
    readonly encounters: readonly ContentWorkbenchEncounterItem[];
    readonly runMapTemplates: readonly ContentWorkbenchRunMapItem[];
    readonly rewardPools: readonly ContentWorkbenchRewardPoolItem[];
    readonly petUpgrades: readonly ContentWorkbenchPetUpgradeItem[];
    readonly petModifiers: readonly ContentWorkbenchPetModifierItem[];
    readonly playerClassModifiers: readonly ContentWorkbenchPlayerClassModifierItem[];
    readonly storyEvents: readonly ContentWorkbenchStoryEventItem[];
    readonly petSideStories: readonly ContentWorkbenchPetSideStoryItem[];
  };
};

const schemaCollections = [
  "cards",
  "statuses",
  "pets",
  "players",
  "monsterAbilities",
  "monsters",
  "encounters",
  "runMapTemplates",
  "rewardPools",
  "petUpgrades",
  "petModifiers",
  "playerClassModifiers",
  "storyEvents",
  "petSideStories"
] as const satisfies readonly ContentWorkbenchCollectionId[];

const requiredSchemaCollections = new Set<ContentWorkbenchCollectionId>([
  "cards",
  "pets",
  "players",
  "monsters",
  "encounters",
  "runMapTemplates",
  "petUpgrades",
  "storyEvents",
  "petSideStories"
]);

const sortedById = <Item extends { readonly id: string }>(items: readonly Item[]): readonly Item[] =>
  [...items].sort((left, right) => left.id.localeCompare(right.id, "en-GB"));

const abilityPreview = (descriptor: AbilityDescriptor): ContentWorkbenchAbilityPreview => ({
  source: descriptor.source,
  id: descriptor.id,
  name: descriptor.name,
  description: descriptor.description,
  displayRole: descriptor.displayRole,
  tags: descriptor.tags,
  targetProfile: descriptor.targetProfile,
  effectSummaries: descriptor.effectSummaries
});

const mapCard = (card: CardDefinition): ContentWorkbenchCardItem => ({
  id: card.id,
  name: card.name,
  type: card.type,
  rarity: card.rarity ?? "unknown",
  cost: card.cost,
  tags: card.tags,
  requiresPetDefinitionId: card.requiresPetDefinitionId,
  preview: abilityPreview(getCardAbilityDescriptor(card))
});

const mapMonsterAbility = (ability: MonsterAbilityDefinition): ContentWorkbenchMonsterAbilityItem => ({
  id: ability.id,
  name: ability.name,
  intentType: ability.intentType,
  tags: ability.tags,
  preview: abilityPreview(getMonsterAbilityDescriptor(ability))
});

const mapMonster = (monster: MonsterDefinition): ContentWorkbenchMonsterItem => ({
  id: monster.id,
  name: monster.name,
  maxHp: monster.maxHp,
  tags: monster.tags,
  abilityIds: [...(monster.abilityIds ?? [])].sort((left, right) => left.localeCompare(right, "en-GB")),
  intentCount: monster.intentPool.length,
  scheduledIntentCount: monster.intentSchedule?.length ?? 0
});

const mapStatus = (
  status: StatusDefinition,
  runtimeSupportedStatusIds: ReadonlySet<string>
): ContentWorkbenchStatusItem => ({
  id: status.id,
  name: status.name,
  tags: status.tags,
  behaviourType: status.behaviour?.type,
  runtimeSupported: runtimeSupportedStatusIds.has(status.id)
});

const mapPlayer = (player: PlayerClassDefinition): ContentWorkbenchPlayerItem => ({
  id: player.id,
  name: player.name,
  maxHp: player.maxHp,
  maxActivePets: player.maxActivePets,
  petSlotCount: player.petSlotCount,
  startingDeckCardIds: player.startingDeckCardIds,
  classTags: player.classTags
});

const mapPet = (pet: PetDefinition): ContentWorkbenchPetItem => ({
  id: pet.id,
  name: pet.name,
  species: pet.species,
  tags: pet.tags,
  baseCommandCardIds: pet.baseCommandCardIds,
  evolutionNodeCount: pet.evolutionTree.length,
  sideStoryId: pet.sideStoryId
});

const mapEncounter = (encounter: EncounterDefinition): ContentWorkbenchEncounterItem => ({
  id: encounter.id,
  type: encounter.type,
  name: encounter.name,
  monsterIds: encounter.monsterIds,
  tags: encounter.tags,
  actId: encounter.authoring?.actId,
  difficultyBand: encounter.authoring?.difficultyBand,
  budget: encounter.authoring?.budget,
  rewardPoolId: encounter.authoring?.rewardPoolId,
  monsterGroupCount: encounter.authoring?.monsterGroups.length ?? 0
});

const mapRunMap = (template: RunMapTemplateDefinition): ContentWorkbenchRunMapItem => ({
  id: template.id,
  name: template.name,
  actId: template.actId,
  nodeCount: template.nodes.length,
  combatNodeCount: template.nodes.filter((node) => node.type === "combat" || node.type === "elite" || node.type === "boss").length,
  budgetedNodeCount: template.nodes.filter((node) => node.authoring?.budgetMin !== undefined || node.authoring?.budgetMax !== undefined).length
});

const mapRewardPool = (rewardPool: RewardPoolDefinition): ContentWorkbenchRewardPoolItem => ({
  id: rewardPool.id,
  name: rewardPool.name,
  rewardTypes: rewardPool.rewardTypes,
  tags: rewardPool.tags
});

const mapPetUpgrade = (upgrade: PetUpgradeDefinition): ContentWorkbenchPetUpgradeItem => ({
  id: upgrade.id,
  petDefinitionId: upgrade.petDefinitionId,
  name: upgrade.name,
  description: upgrade.description,
  tags: upgrade.tags,
  modifierIds: upgrade.modifiers.map((modifier) => modifier.id),
  modifierCount: upgrade.modifiers.length,
  unlockCardIds: (upgrade.unlocks ?? []).map((unlock) => unlock.cardId),
  storyFlagUnlocks: upgrade.storyFlagUnlocks ?? []
});

const mapPetModifier = (modifier: PetModifierDefinition): ContentWorkbenchPetModifierItem => ({
  id: modifier.id,
  name: modifier.name,
  description: modifier.description,
  tags: modifier.tags,
  ruleTypes: modifier.rules.map((rule) => rule.type)
});

const mapPlayerClassModifier = (
  modifier: PlayerClassModifierDefinition
): ContentWorkbenchPlayerClassModifierItem => ({
  id: modifier.id,
  name: modifier.name,
  description: modifier.description,
  tags: modifier.tags,
  ruleTypes: (modifier.rules ?? []).map((rule) => rule.type)
});

const mapStoryEvent = (event: StoryEventDefinition): ContentWorkbenchStoryEventItem => ({
  id: event.id,
  title: event.title,
  description: event.description,
  trigger: event.trigger,
  repeatable: event.repeatable ?? false,
  tags: event.tags,
  requirementCount: event.requirements.length,
  outcomeTypes: event.outcomes.map((outcome) => outcome.type).sort((left, right) => left.localeCompare(right, "en-GB"))
});

const mapPetSideStory = (sideStory: PetSideStoryDefinition): ContentWorkbenchPetSideStoryItem => ({
  id: sideStory.id,
  petDefinitionId: sideStory.petDefinitionId,
  memoryIds: sideStory.memoryIds,
  storyFlagIds: sideStory.storyFlagIds,
  eventIds: sideStory.events.map((event) => event.id)
});

const mapDependencyEndpoint = (
  endpoint: ContentDependencyIssue["source"]
): ContentWorkbenchDependencyEndpoint => ({
  collection: endpoint.collection,
  id: endpoint.id,
  path: endpoint.path
});

const mapDependencyIssue = (issue: ContentDependencyIssue): ContentWorkbenchDependencyDiagnostic => ({
  severity: issue.severity,
  code: issue.code,
  path: issue.path,
  message: issue.message,
  source: mapDependencyEndpoint(issue.source),
  target: issue.target ? mapDependencyEndpoint(issue.target) : undefined,
  summary: formatContentDependencyIssue(issue)
});

const mapCollectionCounts = (
  schema: ReturnType<typeof createContentSchemaFromRegistry>
): ContentWorkbenchCollectionCounts =>
  Object.fromEntries(schemaCollections.map((collection) => [
    collection,
    schemaCollectionCount(schema, collection)
  ])) as ContentWorkbenchCollectionCounts;

const mapContentReport = (
  report: ReturnType<typeof buildContentReport>,
  schema: ReturnType<typeof createContentSchemaFromRegistry>
): ContentWorkbenchContentReport => ({
  counts: mapCollectionCounts(schema),
  cardRarities: report.cardRarities,
  cardTags: report.cardTags,
  effectTypes: report.effectTypes,
  statusIds: report.statusIds,
  runtimeSupportedStatusIds: report.runtimeSupportedStatusIds,
  metadataOnlyStatusIds: report.metadataOnlyStatusIds,
  statusBehaviourTypes: report.statusBehaviourTypes,
  petModifierRuleTypes: report.petModifierRuleTypes,
  playerClassModifierIds: report.playerClassModifierIds,
  playerClassModifierRuleTypes: report.playerClassModifierRuleTypes,
  deckOperationRewardTypes: report.deckOperationRewardTypes,
  scheduledMonsterIds: report.scheduledMonsterIds,
  encounterTypes: report.encounterTypes,
  runMapNodeTypes: report.runMapNodeTypes,
  dependencyReferenceCount: report.dependencyReferenceCount,
  dependencyMissingReferenceCount: report.dependencyMissingReferenceCount,
  unusedCardIds: report.unusedCardIds,
  unusedStatusIds: report.unusedStatusIds
});

const mapLevelReport = (
  report: ReturnType<typeof buildLevelAuthoringReport>
): ContentWorkbenchLevelReport => {
  const runMapTemplates = report.runMapTemplates.map((template) => ({
    id: template.id,
    actId: template.actId,
    nodeCount: template.nodeCount,
    combatNodeCount: template.combatNodeCount,
    budgetedNodeCount: template.budgetedNodeCount
  }));

  return {
    encounterBudgetsByType: report.encounterBudgetsByType,
    encounterCount: report.encounters.length,
    runMapTemplateCount: runMapTemplates.length,
    budgetedRunNodeCount: runMapTemplates.reduce((total, template) => total + template.budgetedNodeCount, 0),
    combatRunNodeCount: runMapTemplates.reduce((total, template) => total + template.combatNodeCount, 0),
    runMapTemplates
  };
};

const schemaCollectionCount = (
  schema: ReturnType<typeof createContentSchemaFromRegistry>,
  collection: ContentWorkbenchCollectionId
): number => {
  const value = schema[collection];
  return Array.isArray(value) ? value.length : 0;
};

export const buildContentWorkbenchViewModel = (registry: GameContentRegistry): ContentWorkbenchViewModel => {
  const schema = createContentSchemaFromRegistry(registry);
  const contentReport = buildContentReport(registry);
  const levelAuthoringReport = buildLevelAuthoringReport(registry);
  const dependencyReport = buildContentDependencyReport(registry);
  const registryValidation = validateRegistry(registry);
  const levelAuthoringValidation = validateLevelAuthoringRegistry(registry);
  const statuses = registry.statuses ?? [burnStatusDefinition];

  return {
    contentVersion: registry.contentVersion,
    schema: {
      collectionCount: schemaCollections.length,
      collections: schemaCollections.map((collection) => ({
        id: collection,
        count: schemaCollectionCount(schema, collection),
        required: requiredSchemaCollections.has(collection)
      }))
    },
    diagnostics: {
      registryErrors: registryValidation.errors,
      registryWarnings: registryValidation.warnings,
      levelAuthoringErrors: levelAuthoringValidation.errors,
      levelAuthoringWarnings: levelAuthoringValidation.warnings,
      dependencyIssues: dependencyReport.issues.map(mapDependencyIssue),
      dependencyReferenceCount: dependencyReport.coverage.referenceCount,
      dependencyMissingReferenceCount: dependencyReport.coverage.missingReferenceCount
    },
    reports: {
      content: mapContentReport(contentReport, schema),
      levelAuthoring: mapLevelReport(levelAuthoringReport)
    },
    sections: {
      cards: sortedById(registry.cards.map(mapCard)),
      monsterAbilities: sortedById((registry.monsterAbilities ?? []).map(mapMonsterAbility)),
      monsters: sortedById(registry.monsters.map(mapMonster)),
      statuses: sortedById(statuses.map((status) => mapStatus(status, new Set(contentReport.runtimeSupportedStatusIds)))),
      players: sortedById(registry.players.map(mapPlayer)),
      pets: sortedById(registry.pets.map(mapPet)),
      encounters: sortedById(registry.encounters.map(mapEncounter)),
      runMapTemplates: sortedById(registry.runMapTemplates.map(mapRunMap)),
      rewardPools: sortedById((registry.rewardPools ?? []).map(mapRewardPool)),
      petUpgrades: sortedById(registry.petUpgrades.map(mapPetUpgrade)),
      petModifiers: sortedById((registry.petModifiers ?? []).map(mapPetModifier)),
      playerClassModifiers: sortedById((registry.playerClassModifiers ?? []).map(mapPlayerClassModifier)),
      storyEvents: sortedById(registry.storyEvents.map(mapStoryEvent)),
      petSideStories: sortedById(registry.petSideStories.map(mapPetSideStory))
    }
  };
};
