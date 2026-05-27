import {
  cardId,
  combatantId,
  encounterId,
  evolutionNodeId,
  monsterAbilityId,
  monsterId,
  monsterIntentId,
  petDefinitionId,
  petInstanceId,
  petMemoryId,
  petModifierId,
  playerClassId,
  playerClassModifierId,
  relicId,
  runMapId,
  runNodeId,
  runTemplateId,
  statusId,
  storyEventId,
  storyFlagId,
  upgradeId
} from "../ids";
import type { CardDefinition } from "../model/card";
import type {
  CardSchemaDefinition,
  ContentSchema,
  ContentSchemaCollection,
  EncounterSchemaDefinition,
  MonsterAbilitySchemaDefinition,
  MonsterSchemaDefinition,
  PetModifierSchemaDefinition,
  PetSchemaDefinition,
  PetSideStorySchemaDefinition,
  PetUpgradeSchemaDefinition,
  PlayerClassModifierSchemaDefinition,
  PlayerClassSchemaDefinition,
  RunMapTemplateSchemaDefinition,
  StatusSchemaDefinition,
  StoryEventSchemaDefinition
} from "../model/content-schema";
import type { EncounterDefinition } from "../model/encounter";
import type { MonsterAbilityDefinition, MonsterDefinition, MonsterIntentDefinition } from "../model/monster";
import type { PetModifierDefinition, PetUpgradeDefinition } from "../model/pet";
import type { PetDefinition } from "../model/pet";
import type { PlayerClassDefinition, PlayerClassModifierDefinition } from "../model/player";
import type { GameContentRegistry } from "../model/registry";
import type { RunMapTemplateDefinition } from "../model/run-map";
import type { StatusDefinition } from "../model/status";
import type { PetSideStoryDefinition, StoryEventDefinition } from "../model/story";
import { validateRegistry, type ValidationIssue, type ValidationResult } from "./validation";

export type ContentSchemaCompileIssue = ValidationIssue;

export type ContentSchemaCompileOptions = {
  readonly baseRegistry?: GameContentRegistry;
};

export type ContentSchemaCompileResult = {
  readonly ok: boolean;
  readonly registry?: GameContentRegistry;
  readonly issues: readonly ContentSchemaCompileIssue[];
  readonly validation?: ValidationResult;
};

const contentSchemaCollections = [
  "cards",
  "statuses",
  "pets",
  "players",
  "monsterAbilities",
  "monsters",
  "encounters",
  "runMapTemplates",
  "petUpgrades",
  "petModifiers",
  "playerClassModifiers",
  "storyEvents",
  "petSideStories"
] as const satisfies readonly ContentSchemaCollection[];

const requiredContentSchemaCollections = [
  "cards",
  "pets",
  "players",
  "monsters",
  "encounters",
  "runMapTemplates",
  "petUpgrades",
  "storyEvents",
  "petSideStories"
] as const satisfies readonly ContentSchemaCollection[];

type SchemaRecord = Record<string, unknown>;

const issue = (
  code: string,
  message: string,
  path: string
): ContentSchemaCompileIssue => ({
  severity: "error",
  code,
  message,
  path
});

const isRecord = (value: unknown): value is SchemaRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const getSchemaCollection = (
  schema: SchemaRecord,
  baseRegistry: GameContentRegistry | undefined,
  collection: ContentSchemaCollection
): readonly unknown[] | undefined => {
  const schemaValue = schema[collection];
  if (schemaValue !== undefined) {
    return Array.isArray(schemaValue) ? schemaValue : undefined;
  }

  return baseRegistry?.[collection] as readonly unknown[] | undefined;
};

const addDuplicateIdIssues = (
  issues: ContentSchemaCompileIssue[],
  entries: readonly { readonly id: unknown; readonly path: string }[],
  label: string
): void => {
  const idPaths = new Map<string, string[]>();

  entries.forEach((entry) => {
    if (typeof entry.id !== "string" || entry.id.length === 0) {
      return;
    }

    idPaths.set(entry.id, [...(idPaths.get(entry.id) ?? []), entry.path]);
  });

  idPaths.forEach((paths, id) => {
    if (paths.length < 2) {
      return;
    }

    paths.forEach((path) => {
      issues.push(issue("duplicate_schema_id", `Duplicate content schema id '${id}' in ${label}.`, path));
    });
  });
};

const addNestedDuplicateIdIssues = (
  issues: ContentSchemaCompileIssue[],
  schema: SchemaRecord,
  baseRegistry: GameContentRegistry | undefined
): void => {
  const runMapTemplates = getSchemaCollection(schema, baseRegistry, "runMapTemplates") ?? [];
  runMapTemplates.forEach((template, templateIndex) => {
    if (!isRecord(template) || !Array.isArray(template.nodes)) {
      return;
    }

    addDuplicateIdIssues(
      issues,
      template.nodes.map((node, nodeIndex) => ({
        id: isRecord(node) ? node.id : undefined,
        path: `runMapTemplates[${templateIndex}].nodes[${nodeIndex}].id`
      })),
      `runMapTemplates[${templateIndex}].nodes`
    );
  });

  const petSideStories = getSchemaCollection(schema, baseRegistry, "petSideStories") ?? [];
  const embeddedSideStoryEventEntries: { readonly id: unknown; readonly path: string }[] = [];
  petSideStories.forEach((sideStory, sideStoryIndex) => {
    if (!isRecord(sideStory) || !Array.isArray(sideStory.events)) {
      return;
    }

    embeddedSideStoryEventEntries.push(
      ...sideStory.events.map((event, eventIndex) => ({
        id: isRecord(event) ? event.id : undefined,
        path: `petSideStories[${sideStoryIndex}].events[${eventIndex}].id`
      }))
    );
  });

  addDuplicateIdIssues(
    issues,
    embeddedSideStoryEventEntries,
    "petSideStories.events"
  );
};

const validateSchemaShell = (
  input: unknown,
  baseRegistry: GameContentRegistry | undefined
): { readonly schema?: SchemaRecord; readonly issues: readonly ContentSchemaCompileIssue[] } => {
  if (!isRecord(input)) {
    return {
      issues: [issue("invalid_content_schema", "Content schema must be an object.", "schema")]
    };
  }

  const issues: ContentSchemaCompileIssue[] = [];

  if (
    "contentVersion" in input &&
    input.contentVersion !== undefined &&
    (typeof input.contentVersion !== "string" || input.contentVersion.length === 0)
  ) {
    issues.push(issue("invalid_schema_content_version", "Content schema version must be a non-empty string.", "contentVersion"));
  }

  requiredContentSchemaCollections.forEach((collection) => {
    if (input[collection] === undefined && baseRegistry?.[collection] === undefined) {
      issues.push(
        issue(
          "missing_schema_collection",
          `Content schema collection '${collection}' is required.`,
          collection
        )
      );
    }
  });

  contentSchemaCollections.forEach((collection) => {
    if (input[collection] !== undefined && !Array.isArray(input[collection])) {
      issues.push(issue("invalid_schema_collection", `Content schema collection '${collection}' must be an array.`, collection));
      return;
    }

    const values = getSchemaCollection(input, baseRegistry, collection);
    if (!values) {
      return;
    }

    const entries: { readonly id: unknown; readonly path: string }[] = [];
    values.forEach((value, index) => {
      const path = `${collection}[${index}]`;
      if (!isRecord(value)) {
        issues.push(issue("invalid_schema_entry", `Content schema entry '${path}' must be an object.`, path));
        return;
      }

      if (typeof value.id !== "string" || value.id.length === 0) {
        issues.push(issue("invalid_schema_id", `Content schema entry '${path}' must have a non-empty string id.`, `${path}.id`));
        return;
      }

      entries.push({ id: value.id, path: `${path}.id` });
    });

    addDuplicateIdIssues(issues, entries, collection);
  });

  addNestedDuplicateIdIssues(issues, input, baseRegistry);

  return { schema: input, issues };
};

const mapIdValue = <Id extends string>(
  value: unknown,
  toId: (value: string) => Id
): unknown => typeof value === "string" ? toId(value) : value;

const mapArrayValue = (
  value: unknown,
  mapItem: (item: unknown) => unknown
): unknown => Array.isArray(value) ? value.map(mapItem) : value;

const mapRecordValue = (
  value: unknown,
  mapValue: (record: SchemaRecord) => SchemaRecord
): unknown => isRecord(value) ? mapValue(value) : value;

const mapCombatantTarget = (target: unknown): unknown =>
  mapRecordValue(target, (record) => ({
    ...record,
    ...("combatantId" in record ? { combatantId: mapIdValue(record.combatantId, combatantId) } : {})
  }));

const mapPetTarget = (target: unknown): unknown =>
  mapRecordValue(target, (record) => ({
    ...record,
    ...("petInstanceId" in record ? { petInstanceId: mapIdValue(record.petInstanceId, petInstanceId) } : {})
  }));

const mapEffect = (effect: unknown): unknown =>
  mapRecordValue(effect, (record) => ({
    ...record,
    ...("target" in record ? { target: mapCombatantTarget(record.target) } : {}),
    ...("petTarget" in record ? { petTarget: mapPetTarget(record.petTarget) } : {}),
    ...("cardId" in record ? { cardId: mapIdValue(record.cardId, cardId) } : {}),
    ...("statusId" in record ? { statusId: mapIdValue(record.statusId, statusId) } : {}),
    ...("flagId" in record ? { flagId: mapIdValue(record.flagId, storyFlagId) } : {})
  }));

const mapEffects = (definitions: unknown): unknown =>
  mapArrayValue(definitions, mapEffect);

const mapCard = (card: CardSchemaDefinition): CardDefinition => ({
  ...card,
  id: cardId(card.id),
  type: card.type as CardDefinition["type"],
  rarity: card.rarity as CardDefinition["rarity"],
  requiresPetDefinitionId: card.requiresPetDefinitionId === undefined
    ? undefined
    : petDefinitionId(card.requiresPetDefinitionId),
  effects: mapEffects(card.effects)
} as CardDefinition);

const mapStatus = (status: StatusSchemaDefinition): StatusDefinition => ({
  ...status,
  id: statusId(status.id),
  behaviour: status.behaviour === undefined
    ? undefined
    : mapRecordValue(status.behaviour, (record) => ({
        ...record,
        ...("blocksStatusIds" in record
          ? { blocksStatusIds: mapArrayValue(record.blocksStatusIds, (id) => mapIdValue(id, statusId)) }
          : {})
      })) as StatusDefinition["behaviour"]
} as StatusDefinition);

const mapStoryRequirement = (requirement: unknown): unknown =>
  mapRecordValue(requirement, (record) => {
  switch (record.type) {
    case "hasPetMemory":
      return { ...record, memoryId: mapIdValue(record.memoryId, petMemoryId) };
    case "hasSeenEvent":
      return { ...record, eventId: mapIdValue(record.eventId, storyEventId) };
    case "playerClassIs":
      return { ...record, playerClassId: mapIdValue(record.playerClassId, playerClassId) };
    case "hasPetStoryFlag":
    case "lacksPetStoryFlag":
      return { ...record, flagId: mapIdValue(record.flagId, storyFlagId) };
    default:
      return record;
  }
});

const mapStoryOutcome = (outcome: unknown): unknown =>
  mapRecordValue(outcome, (record) => {
  switch (record.type) {
    case "setStoryFlag":
      return { ...record, flagId: mapIdValue(record.flagId, storyFlagId) };
    case "unlockPetMemory":
      return { ...record, memoryId: mapIdValue(record.memoryId, petMemoryId) };
    case "unlockPetUpgrade":
      return { ...record, upgradeId: mapIdValue(record.upgradeId, upgradeId) };
    case "unlockEvolutionNode":
      return { ...record, evolutionNodeId: mapIdValue(record.evolutionNodeId, evolutionNodeId) };
    case "markStoryEventSeen":
      return { ...record, eventId: mapIdValue(record.eventId, storyEventId) };
    default:
      return record;
  }
});

const mapStoryEvent = (storyEvent: unknown): StoryEventDefinition =>
  mapRecordValue(storyEvent, (record) => ({
    ...record,
    id: mapIdValue(record.id, storyEventId),
    trigger: record.trigger as StoryEventDefinition["trigger"],
    requirements: mapArrayValue(record.requirements, mapStoryRequirement),
    outcomes: mapArrayValue(record.outcomes, mapStoryOutcome)
  })) as StoryEventDefinition;

const mapPet = (pet: PetSchemaDefinition): PetDefinition => ({
  ...pet,
  id: petDefinitionId(pet.id),
  baseCommandCardIds: mapArrayValue(pet.baseCommandCardIds, (id) => mapIdValue(id, cardId)),
  evolutionTree: mapArrayValue(pet.evolutionTree, (node) =>
    mapRecordValue(node, (record) => ({
      ...record,
      id: mapIdValue(record.id, evolutionNodeId),
      requirements: mapArrayValue(record.requirements, mapStoryRequirement),
      unlocks: mapArrayValue(record.unlocks, (unlock) =>
        mapRecordValue(unlock, (unlockRecord) => ({
          ...unlockRecord,
          cardId: mapIdValue(unlockRecord.cardId, cardId),
          requirement: mapStoryRequirement(unlockRecord.requirement)
        }))
      )
    }))
  ),
  sideStoryId: pet.sideStoryId === undefined ? undefined : storyEventId(pet.sideStoryId)
} as PetDefinition);

const mapPlayer = (player: PlayerClassSchemaDefinition): PlayerClassDefinition => ({
  ...player,
  id: playerClassId(player.id),
  startingDeckCardIds: mapArrayValue(player.startingDeckCardIds, (id) => mapIdValue(id, cardId)),
  startingRelicIds: mapArrayValue(player.startingRelicIds, (id) => mapIdValue(id, relicId)),
  classModifierIds: mapArrayValue(player.classModifierIds, (id) => mapIdValue(id, playerClassModifierId))
} as PlayerClassDefinition);

const mapMonsterAbility = (ability: MonsterAbilitySchemaDefinition): MonsterAbilityDefinition => ({
  ...ability,
  id: monsterAbilityId(ability.id),
  intentType: ability.intentType as MonsterAbilityDefinition["intentType"],
  effects: mapEffects(ability.effects)
} as MonsterAbilityDefinition);

const mapMonsterIntent = (intent: unknown): MonsterIntentDefinition =>
  mapRecordValue(intent, (record) => ({
    ...record,
    id: mapIdValue(record.id, monsterIntentId),
    abilityId: mapIdValue(record.abilityId, monsterAbilityId),
    effects: mapEffects(record.effects)
  })) as MonsterIntentDefinition;

const mapMonster = (monster: MonsterSchemaDefinition): MonsterDefinition => ({
  ...monster,
  id: monsterId(monster.id),
  abilityIds: mapArrayValue(monster.abilityIds, (id) => mapIdValue(id, monsterAbilityId)),
  intentPool: mapArrayValue(monster.intentPool, mapMonsterIntent),
  intentSchedule: mapArrayValue(monster.intentSchedule, (step) =>
    mapRecordValue(step, (record) => ({
      ...record,
      intentId: mapIdValue(record.intentId, monsterIntentId)
    }))
  )
} as MonsterDefinition);

const mapEncounter = (encounter: EncounterSchemaDefinition): EncounterDefinition => ({
  ...encounter,
  id: encounterId(encounter.id),
  type: encounter.type as EncounterDefinition["type"],
  monsterIds: mapArrayValue(encounter.monsterIds, (id) => mapIdValue(id, monsterId))
} as EncounterDefinition);

const mapRunMapTemplate = (template: RunMapTemplateSchemaDefinition): RunMapTemplateDefinition => ({
  ...template,
  id: runTemplateId(template.id),
  mapId: runMapId(template.mapId),
  nodes: mapArrayValue(template.nodes, (node) =>
    mapRecordValue(node, (record) => ({
      ...record,
      id: mapIdValue(record.id, runNodeId),
      type: record.type as RunMapTemplateDefinition["nodes"][number]["type"],
      encounterIds: mapArrayValue(record.encounterIds, (id) => mapIdValue(id, encounterId)),
      nextNodeIds: mapArrayValue(record.nextNodeIds, (id) => mapIdValue(id, runNodeId))
    }))
  )
} as RunMapTemplateDefinition);

const mapCardSelector = (selector: unknown): unknown =>
  mapRecordValue(selector, (record) => ({
    ...record,
    ...("requiresPetDefinitionId" in record
      ? { requiresPetDefinitionId: mapIdValue(record.requiresPetDefinitionId, petDefinitionId) }
      : {})
  }));

const mapPetModifierRule = (rule: unknown): unknown =>
  mapRecordValue(rule, (record) => ({
    ...record,
    ...("selector" in record ? { selector: mapCardSelector(record.selector) } : {}),
    ...("statusId" in record ? { statusId: mapIdValue(record.statusId, statusId) } : {}),
    ...("requiredStatusId" in record ? { requiredStatusId: mapIdValue(record.requiredStatusId, statusId) } : {}),
    ...("effects" in record ? { effects: mapEffects(record.effects) } : {})
  }));

const mapPlayerClassModifierRule = (rule: unknown): unknown =>
  mapRecordValue(rule, (record) => ({
    ...record,
    ...("selector" in record ? { selector: mapCardSelector(record.selector) } : {}),
    ...("statusId" in record ? { statusId: mapIdValue(record.statusId, statusId) } : {}),
    ...("effects" in record ? { effects: mapEffects(record.effects) } : {})
  }));

const mapPetModifier = (modifier: unknown): PetModifierDefinition =>
  mapRecordValue(modifier, (record) => ({
    ...record,
    id: mapIdValue(record.id, petModifierId),
    rules: mapArrayValue(record.rules, mapPetModifierRule)
  })) as PetModifierDefinition;

const mapPetUpgrade = (upgrade: PetUpgradeSchemaDefinition): PetUpgradeDefinition => ({
  ...upgrade,
  id: upgradeId(upgrade.id),
  petDefinitionId: petDefinitionId(upgrade.petDefinitionId),
  modifiers: mapArrayValue(upgrade.modifiers, mapPetModifier),
  unlocks: mapArrayValue(upgrade.unlocks, (unlock) =>
    mapRecordValue(unlock, (record) => ({
      ...record,
      cardId: mapIdValue(record.cardId, cardId),
      requirement: mapStoryRequirement(record.requirement)
    }))
  ),
  storyFlagUnlocks: mapArrayValue(upgrade.storyFlagUnlocks, (id) => mapIdValue(id, storyFlagId))
} as PetUpgradeDefinition);

const mapPlayerClassModifier = (
  modifier: unknown
): PlayerClassModifierDefinition =>
  mapRecordValue(modifier, (record) => ({
    ...record,
    id: mapIdValue(record.id, playerClassModifierId),
    rules: mapArrayValue(record.rules, mapPlayerClassModifierRule)
  })) as PlayerClassModifierDefinition;

const mapPetSideStory = (sideStory: PetSideStorySchemaDefinition): PetSideStoryDefinition => ({
  ...sideStory,
  id: storyEventId(sideStory.id),
  petDefinitionId: petDefinitionId(sideStory.petDefinitionId),
  memoryIds: mapArrayValue(sideStory.memoryIds, (id) => mapIdValue(id, petMemoryId)),
  storyFlagIds: mapArrayValue(sideStory.storyFlagIds, (id) => mapIdValue(id, storyFlagId)),
  events: mapArrayValue(sideStory.events, mapStoryEvent)
} as PetSideStoryDefinition);

const collectionOrDefault = <Item>(
  schema: SchemaRecord,
  baseRegistry: GameContentRegistry | undefined,
  collection: ContentSchemaCollection
): readonly Item[] => {
  const value = schema[collection] ?? baseRegistry?.[collection] ?? [];
  return cloneJson(value) as readonly Item[];
};

const collectionOrUndefined = <Item>(
  schema: SchemaRecord,
  baseRegistry: GameContentRegistry | undefined,
  collection: ContentSchemaCollection
): readonly Item[] | undefined => {
  const value = schema[collection] ?? baseRegistry?.[collection];
  return value === undefined ? undefined : cloneJson(value) as readonly Item[];
};

const toRegistry = (
  schema: SchemaRecord,
  baseRegistry: GameContentRegistry | undefined
): GameContentRegistry => {
  const statuses = collectionOrUndefined<StatusSchemaDefinition>(schema, baseRegistry, "statuses");
  const monsterAbilities = collectionOrUndefined<MonsterAbilitySchemaDefinition>(schema, baseRegistry, "monsterAbilities");
  const petModifiers = collectionOrUndefined<PetModifierSchemaDefinition>(schema, baseRegistry, "petModifiers");
  const playerClassModifiers = collectionOrUndefined<PlayerClassModifierSchemaDefinition>(schema, baseRegistry, "playerClassModifiers");

  return {
    contentVersion: typeof schema.contentVersion === "string"
      ? schema.contentVersion
      : baseRegistry?.contentVersion,
    cards: collectionOrDefault<CardSchemaDefinition>(schema, baseRegistry, "cards").map(mapCard),
    ...(statuses === undefined ? {} : { statuses: statuses.map(mapStatus) }),
    pets: collectionOrDefault<PetSchemaDefinition>(schema, baseRegistry, "pets").map(mapPet),
    players: collectionOrDefault<PlayerClassSchemaDefinition>(schema, baseRegistry, "players").map(mapPlayer),
    ...(monsterAbilities === undefined ? {} : { monsterAbilities: monsterAbilities.map(mapMonsterAbility) }),
    monsters: collectionOrDefault<MonsterSchemaDefinition>(schema, baseRegistry, "monsters").map(mapMonster),
    encounters: collectionOrDefault<EncounterSchemaDefinition>(schema, baseRegistry, "encounters").map(mapEncounter),
    runMapTemplates: collectionOrDefault<RunMapTemplateSchemaDefinition>(schema, baseRegistry, "runMapTemplates").map(mapRunMapTemplate),
    petUpgrades: collectionOrDefault<PetUpgradeSchemaDefinition>(schema, baseRegistry, "petUpgrades").map(mapPetUpgrade),
    ...(petModifiers === undefined ? {} : { petModifiers: petModifiers.map(mapPetModifier) }),
    ...(playerClassModifiers === undefined ? {} : { playerClassModifiers: playerClassModifiers.map(mapPlayerClassModifier) }),
    storyEvents: collectionOrDefault<StoryEventSchemaDefinition>(schema, baseRegistry, "storyEvents").map(mapStoryEvent),
    petSideStories: collectionOrDefault<PetSideStorySchemaDefinition>(schema, baseRegistry, "petSideStories").map(mapPetSideStory)
  };
};

export const createContentSchemaFromRegistry = (registry: GameContentRegistry): ContentSchema =>
  cloneJson(registry) as ContentSchema;

export const compileContentSchema = (
  input: unknown,
  options: ContentSchemaCompileOptions = {}
): ContentSchemaCompileResult => {
  const shell = validateSchemaShell(input, options.baseRegistry);
  if (!shell.schema || shell.issues.some((schemaIssue) => schemaIssue.severity === "error")) {
    return {
      ok: false,
      issues: shell.issues
    };
  }

  let registry: GameContentRegistry;
  try {
    registry = toRegistry(shell.schema, options.baseRegistry);
  } catch (error) {
    return {
      ok: false,
      issues: [
        ...shell.issues,
        issue(
          "invalid_schema_payload",
          error instanceof Error ? error.message : "Content schema payload could not be compiled.",
          "schema"
        )
      ]
    };
  }

  const validation = validateRegistry(registry);
  const issues = [...shell.issues, ...validation.issues];

  return {
    ok: issues.length === 0,
    registry,
    issues,
    validation
  };
};
