import type { EffectDefinition } from "../model/effect";
import type { EncounterType } from "../model/encounter";
import type { PetModifierRule } from "../model/pet";
import type { PlayerClassModifierRule } from "../model/player";
import type { GameContentRegistry } from "../model/registry";
import type { RunState } from "../model/run";
import type { RunNodeType } from "../model/run-map";
import { burnStatusDefinition } from "../model/status";
import type { StoryOutcome, StoryRequirement, StoryTrigger } from "../model/story";
import { buildContentIndex } from "./content-index";
import {
  getRuntimeSupportedStatusIds,
  validateStatusBehaviourDefinition
} from "./status-behaviours";
import { knownPetModifierRuleTypeValues } from "./pet-modifiers";
import { knownPlayerClassModifierRuleTypeValues } from "./class-modifiers";
import { knownPetModifierSelectorCardTypes } from "./pet-modifier-selectors";
import { validateEffects } from "./effect-validation";

export type ValidationIssueSeverity = "error" | "warning";

export type ValidationIssue = {
  readonly severity: ValidationIssueSeverity;
  readonly code: string;
  readonly message: string;
  readonly path: string;
};

export type ValidationResult = {
  readonly issues: readonly ValidationIssue[];
  readonly errors: readonly ValidationIssue[];
  readonly warnings: readonly ValidationIssue[];
};

const issue = (
  severity: ValidationIssueSeverity,
  code: string,
  message: string,
  path: string
): ValidationIssue => ({ severity, code, message, path });

const validatePetModifierRule = (
  petDefinitionIds: ReadonlySet<string>,
  statusIds: ReadonlySet<string>,
  rule: PetModifierRule,
  path: string
): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];

  if (typeof rule !== "object" || rule === null) {
    issues.push(
      issue(
        "error",
        "invalid_pet_modifier_rule",
        "Pet modifier rule must be an object.",
        path
      )
    );
    return issues;
  }

  if (!knownPetModifierRuleTypeValues.includes(rule.type)) {
    issues.push(
      issue(
        "error",
        "unknown_pet_modifier_rule",
        `Unknown pet modifier rule '${String(rule.type)}'.`,
        path
      )
    );
    return issues;
  }

  if (rule.type !== "triggerOnEnemyDefeatedWithStatus") {
    if (!rule.selector || typeof rule.selector !== "object" || Array.isArray(rule.selector)) {
      issues.push(
        issue(
          "error",
          "invalid_pet_modifier_rule",
          "Pet modifier rule is missing a card selector.",
          `${path}.selector`
        )
      );
    } else {
      if ("tagsAny" in rule.selector && !Array.isArray(rule.selector.tagsAny)) {
        issues.push(
          issue(
            "error",
            "invalid_pet_modifier_rule",
            "Pet modifier selector tagsAny must be an array.",
            `${path}.selector.tagsAny`
          )
        );
      }

      if ("tagsAll" in rule.selector && !Array.isArray(rule.selector.tagsAll)) {
        issues.push(
          issue(
            "error",
            "invalid_pet_modifier_rule",
            "Pet modifier selector tagsAll must be an array.",
            `${path}.selector.tagsAll`
          )
        );
      }

      if (
        "cardType" in rule.selector &&
        !knownPetModifierSelectorCardTypes.includes(rule.selector.cardType as typeof knownPetModifierSelectorCardTypes[number])
      ) {
        issues.push(
          issue(
            "error",
            "invalid_pet_modifier_rule",
            "Pet modifier selector cardType is unknown.",
            `${path}.selector.cardType`
          )
        );
      }

      if (
        "requiresPetDefinitionId" in rule.selector &&
        (
          typeof rule.selector.requiresPetDefinitionId !== "string" ||
          rule.selector.requiresPetDefinitionId.length === 0 ||
          !petDefinitionIds.has(rule.selector.requiresPetDefinitionId)
        )
      ) {
        issues.push(
          issue(
            "error",
            "invalid_pet_modifier_rule",
            "Pet modifier selector requiresPetDefinitionId must reference a known pet definition.",
            `${path}.selector.requiresPetDefinitionId`
          )
        );
      }
    }
  }

  if (rule.type === "modifyPetCommandEffectAmount" && rule.effectType === "applyStatus") {
    if ("statusId" in rule && (typeof rule.statusId !== "string" || !statusIds.has(rule.statusId))) {
      issues.push(
        issue(
          "error",
          "unknown_pet_modifier_status",
          `Pet modifier references unknown status '${rule.statusId}'.`,
          `${path}.statusId`
        )
      );
    }
  }

  if (rule.type === "modifyPetCommandEffectAmount") {
    if (rule.effectType !== "petAttack" && rule.effectType !== "applyStatus") {
      issues.push(
        issue(
          "error",
          "invalid_pet_modifier_rule",
          "Pet command effect modifier references an unknown effect type.",
          `${path}.effectType`
        )
      );
    }

    if (typeof rule.amount !== "number" || !Number.isFinite(rule.amount)) {
      issues.push(
        issue(
          "error",
          "invalid_pet_modifier_rule",
          "Pet command effect modifier amount must be a finite number.",
          `${path}.amount`
        )
      );
    }
  }

  if (rule.type === "modifyPetCommandCost") {
    if (typeof rule.amount !== "number" || !Number.isFinite(rule.amount)) {
      issues.push(
        issue(
          "error",
          "invalid_pet_modifier_rule",
          "Pet command cost modifier amount must be a finite number.",
          `${path}.amount`
        )
      );
    }

    if (
      "minCost" in rule &&
      (typeof rule.minCost !== "number" || !Number.isInteger(rule.minCost) || rule.minCost < 0)
    ) {
      issues.push(
        issue(
          "error",
          "invalid_pet_modifier_rule",
          "Pet command cost modifier minCost must be a non-negative integer.",
          `${path}.minCost`
        )
      );
    }
  }

  if (
    "limit" in rule &&
    (
      typeof rule.limit !== "object" ||
      rule.limit === null ||
      Array.isArray(rule.limit) ||
      (rule.limit.type !== "oncePerCombat" && rule.limit.type !== "oncePerTurn")
    )
  ) {
    issues.push(
      issue(
        "error",
        "invalid_pet_modifier_rule",
        "Pet modifier limit type is unknown.",
        `${path}.limit.type`
      )
    );
  }

  if (rule.type === "triggerOnEnemyDefeatedWithStatus") {
    if (!statusIds.has(rule.requiredStatusId)) {
      issues.push(
        issue(
          "error",
          "unknown_pet_modifier_status",
          `Pet modifier references unknown status '${rule.requiredStatusId}'.`,
          `${path}.requiredStatusId`
        )
      );
    }

    if (Array.isArray(rule.effects)) {
      issues.push(...validateEffects(rule.effects, path, { statusIds }));

      rule.effects.forEach((effectDefinition, effectIndex) => {
        if (typeof effectDefinition !== "object" || effectDefinition === null) {
          issues.push(
            issue(
              "error",
              "invalid_pet_modifier_rule",
              "Pet trigger effect must be an object.",
              `${path}.effects[${effectIndex}]`
            )
          );
          return;
        }

        if (
          effectDefinition.type === "draw" &&
          (!Number.isInteger(effectDefinition.amount) || effectDefinition.amount <= 0)
        ) {
          issues.push(
            issue(
              "error",
              "invalid_pet_modifier_rule",
              "Pet trigger draw amount must be a positive integer.",
              `${path}.effects[${effectIndex}].amount`
            )
          );
        }
      });
    } else {
      issues.push(
        issue(
          "error",
          "invalid_pet_modifier_rule",
          "Pet trigger modifier effects must be an array.",
          `${path}.effects`
        )
      );
    }
  }

  return issues;
};

const validatePlayerClassModifierRule = (
  statusIds: ReadonlySet<string>,
  rule: PlayerClassModifierRule,
  path: string
): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];

  if (!isRecord(rule)) {
    return [issue("error", "invalid_player_class_modifier_rule", "Player class modifier rule must be an object.", path)];
  }

  if (!knownPlayerClassModifierRuleTypeValues.includes(String(rule.type))) {
    return [
      issue(
        "error",
        "unknown_player_class_modifier_rule",
        `Player class modifier rule '${String(rule.type)}' is unknown.`,
        `${path}.type`
      )
    ];
  }

  if (rule.type === "triggerOnStatusApplied" && rule.statusId !== undefined && !statusIds.has(rule.statusId)) {
    issues.push(issue("error", "unknown_player_class_modifier_status", `Player class modifier references unknown status '${rule.statusId}'.`, `${path}.statusId`));
  }

  if (!Array.isArray(rule.effects)) {
    issues.push(issue("error", "invalid_player_class_modifier_rule", "Player class modifier rule effects must be an array.", `${path}.effects`));
    return issues;
  }

  issues.push(...validateEffects(rule.effects, path, { statusIds }));

  if (
    "limit" in rule &&
    rule.limit !== undefined &&
    (
      !isRecord(rule.limit) ||
      (rule.limit.type !== "oncePerCombat" && rule.limit.type !== "oncePerTurn")
    )
  ) {
    issues.push(issue("error", "invalid_player_class_modifier_rule", "Player class modifier limit type is unknown.", `${path}.limit`));
  }

  return issues;
};

type RunMapTemplateCandidate = {
  readonly id?: unknown;
  readonly nodes?: unknown;
};

type RunMapNodeCandidate = {
  readonly id?: unknown;
  readonly type?: unknown;
  readonly layer?: unknown;
  readonly encounterIds?: unknown;
  readonly nextNodeIds?: unknown;
};

type EncounterCandidate = {
  readonly id?: unknown;
  readonly type?: unknown;
  readonly monsterIds?: unknown;
};

type StoryEventCandidate = {
  readonly id?: unknown;
  readonly trigger?: unknown;
  readonly repeatable?: unknown;
  readonly requirements?: unknown;
  readonly outcomes?: unknown;
};

type PetSideStoryCandidate = {
  readonly id?: unknown;
  readonly petDefinitionId?: unknown;
  readonly memoryIds?: unknown;
  readonly storyFlagIds?: unknown;
  readonly events?: unknown;
};

type PetUpgradeCandidate = {
  readonly id?: unknown;
  readonly petDefinitionId?: unknown;
  readonly modifiers?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isString = (value: unknown): value is string => typeof value === "string";

const storyRequirementTypes = new Set<StoryRequirement["type"]>([
  "petBondAtLeast",
  "hasPetMemory",
  "bossDefeated",
  "chapterUnlocked",
  "hasSeenEvent",
  "activePetHasTag",
  "playerClassIs",
  "hasPetStoryFlag",
  "lacksPetStoryFlag",
  "runStatusIs",
  "completedRunNodeType"
]);

const storyOutcomeTypes = new Set<StoryOutcome["type"]>([
  "setStoryFlag",
  "unlockPetMemory",
  "unlockPetUpgrade",
  "unlockEvolutionNode",
  "addBondXp",
  "markStoryEventSeen"
]);

const storyTriggers = new Set<StoryTrigger>([
  "manual",
  "runCreated",
  "combatWon",
  "nodeCompleted",
  "runCompleted"
]);

const isRunMapNodeCandidate = (value: unknown): value is RunMapNodeCandidate =>
  isRecord(value);

const validateRunMapTemplates = (registry: GameContentRegistry): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const encounters = Array.isArray(registry.encounters) ? registry.encounters.filter(isRecord) : [];
  const runMapTemplates = Array.isArray(registry.runMapTemplates) ? registry.runMapTemplates : [];
  const encountersById = new Map(
    encounters
      .filter((encounter): encounter is EncounterCandidate & { readonly id: string } => typeof encounter.id === "string")
      .map((encounter) => [encounter.id, encounter])
  );
  const combatNodeTypes = new Set<RunNodeType>(["combat", "elite", "boss"]);
  const knownNodeTypes = new Set<RunNodeType>(["combat", "elite", "rest", "event", "boss"]);

  if (!Array.isArray(registry.runMapTemplates)) {
    issues.push(
      issue("error", "invalid_run_map_templates", "Run map templates must be an array.", "runMapTemplates")
    );
    return issues;
  }

  runMapTemplates.forEach((templateValue: unknown, templateIndex: number) => {
    if (!isRecord(templateValue)) {
      issues.push(
        issue(
          "error",
          "invalid_run_map_template",
          "Run map template must be an object.",
          `runMapTemplates[${templateIndex}]`
        )
      );
      return;
    }

    const template = templateValue as RunMapTemplateCandidate;
    if (!Array.isArray(template.nodes)) {
      issues.push(
        issue(
          "error",
          "invalid_run_map_template_nodes",
          `Run map template '${String(template.id)}' nodes must be an array.`,
          `runMapTemplates[${templateIndex}].nodes`
        )
      );
      return;
    }

    if (template.nodes.length === 0) {
      issues.push(
        issue(
          "error",
          "empty_run_map_template",
          `Run map template '${String(template.id)}' must have at least one node.`,
          `runMapTemplates[${templateIndex}].nodes`
        )
      );
      return;
    }

    const validNodes = template.nodes.filter(isRunMapNodeCandidate);
    const nodeIds = new Set(validNodes.map((node) => node.id).filter((nodeId): nodeId is string => typeof nodeId === "string"));
    const seenNodeIds = new Set<string>();
    const duplicateNodeIds = new Set<string>();

    validNodes.forEach((node) => {
      if (typeof node.id !== "string") {
        return;
      }

      if (seenNodeIds.has(node.id)) {
        duplicateNodeIds.add(node.id);
      }
      seenNodeIds.add(node.id);
    });

    duplicateNodeIds.forEach((nodeId) => {
      issues.push(
        issue(
          "error",
          "duplicate_id",
          `Duplicate id '${nodeId}' in runMapTemplates[${templateIndex}].nodes.`,
          `runMapTemplates[${templateIndex}].nodes`
        )
      );
    });

    template.nodes.forEach((nodeValue: unknown, nodeIndex: number) => {
      const path = `runMapTemplates[${templateIndex}].nodes[${nodeIndex}]`;

      if (!isRunMapNodeCandidate(nodeValue)) {
        issues.push(
          issue("error", "invalid_run_map_node", "Run map node must be an object.", path)
        );
        return;
      }

      const node = nodeValue;
      if (typeof node.id !== "string") {
        issues.push(
          issue(
            "error",
            "invalid_run_node_id",
            "Run node id must be a string.",
            `${path}.id`
          )
        );
      }

      if (!knownNodeTypes.has(node.type as RunNodeType)) {
        issues.push(
          issue("error", "unknown_run_node_type", `Run node '${node.id}' has unknown type '${String(node.type)}'.`, `${path}.type`)
        );
      }

      if (!Number.isInteger(node.layer)) {
        issues.push(
          issue(
            "error",
            "invalid_run_node_layer",
            `Run node '${String(node.id)}' layer must be an integer.`,
            `${path}.layer`
          )
        );
      }

      if (!Array.isArray(node.nextNodeIds)) {
        issues.push(
          issue(
            "error",
            "invalid_run_node_connections",
            `Run node '${String(node.id)}' nextNodeIds must be an array.`,
            `${path}.nextNodeIds`
          )
        );
      }

      const nextNodeIds = Array.isArray(node.nextNodeIds) ? node.nextNodeIds : [];
      nextNodeIds.forEach((nextNodeId: unknown, nextIndex: number) => {
        const nextNode = validNodes.find((candidate) => candidate.id === nextNodeId);

        if (typeof nextNodeId !== "string" || !nextNode) {
          issues.push(
            issue(
              "error",
              "missing_run_node_connection",
              `Run node '${node.id}' connects to missing node '${nextNodeId}'.`,
              `${path}.nextNodeIds[${nextIndex}]`
            )
          );
          return;
        }

        const nodeLayer = node.layer;
        const nextNodeLayer = nextNode.layer;
        if (
          Number.isInteger(nodeLayer) &&
          Number.isInteger(nextNodeLayer) &&
          typeof nodeLayer === "number" &&
          typeof nextNodeLayer === "number" &&
          nextNodeLayer <= nodeLayer
        ) {
          issues.push(
            issue(
              "error",
              "invalid_run_node_layer_connection",
              `Run node '${node.id}' connects to '${nextNodeId}' without moving to a later layer.`,
              `${path}.nextNodeIds[${nextIndex}]`
            )
          );
        }
      });

      if (combatNodeTypes.has(node.type as RunNodeType)) {
        if (!Array.isArray(node.encounterIds) || node.encounterIds.length === 0) {
          issues.push(
            issue(
              "error",
              "missing_run_node_encounter",
              `Run node '${node.id}' must reference at least one encounter.`,
              `${path}.encounterIds`
            )
          );
        }

        const encounterIdsForNode = Array.isArray(node.encounterIds) ? node.encounterIds : [];
        encounterIdsForNode.forEach((encounterId: unknown, encounterIndex: number) => {
          if (typeof encounterId !== "string") {
            issues.push(
              issue(
                "error",
                "missing_run_node_encounter",
                `Run node '${String(node.id)}' references invalid encounter '${String(encounterId)}'.`,
                `${path}.encounterIds[${encounterIndex}]`
              )
            );
            return;
          }

          const encounter = encountersById.get(encounterId);
          if (!encounter) {
            issues.push(
              issue(
                "error",
                "missing_run_node_encounter",
                `Run node '${node.id}' references missing encounter '${encounterId}'.`,
                `${path}.encounterIds[${encounterIndex}]`
              )
            );
            return;
          }

          if (encounter.type !== node.type) {
            issues.push(
              issue(
                "error",
                "run_node_encounter_type_mismatch",
                `Run node '${node.id}' has type '${node.type}' but references '${encounter.type}' encounter '${encounter.id}'.`,
                `${path}.encounterIds[${encounterIndex}]`
              )
            );
          }
        });
      }

      if (node.encounterIds !== undefined && !Array.isArray(node.encounterIds)) {
        issues.push(
          issue(
            "error",
            "invalid_run_node_encounters",
            `Run node '${String(node.id)}' encounterIds must be an array when present.`,
            `${path}.encounterIds`
          )
        );
      }

      if ((node.type === "event" || node.type === "rest") && Array.isArray(node.encounterIds) && node.encounterIds.length > 0) {
        issues.push(
          issue(
            "warning",
            "non_combat_node_has_encounter",
            `Run node '${node.id}' is '${node.type}' but has encounter ids.`,
            `${path}.encounterIds`
          )
        );
      }

      if (nextNodeIds.length === 0 && node.type !== "boss") {
        issues.push(
          issue(
            "error",
            "run_node_dead_end",
            `Run node '${node.id}' is a non-boss dead end.`,
            `${path}.nextNodeIds`
          )
        );
      }
    });

    const numericLayers = validNodes.map((node) => node.layer).filter((layer): layer is number => Number.isInteger(layer));
    if (numericLayers.length === 0) {
      issues.push(
        issue(
          "error",
          "invalid_run_map_layers",
          `Run map template '${String(template.id)}' has no valid node layers.`,
          `runMapTemplates[${templateIndex}].nodes`
        )
      );
      return;
    }

    const firstLayer = Math.min(...numericLayers);
    validNodes.forEach((node, nodeIndex) => {
      if (node.layer === firstLayer) {
        return;
      }

      const hasPreviousNode = validNodes.some((candidate) =>
        Array.isArray(candidate.nextNodeIds) && candidate.nextNodeIds.includes(node.id)
      );
      if (!hasPreviousNode) {
        issues.push(
          issue(
            "error",
            "missing_run_node_previous_connection",
            `Run node '${node.id}' has no previous node.`,
            `runMapTemplates[${templateIndex}].nodes[${nodeIndex}]`
          )
        );
      }
    });

    const bossNodes = validNodes.filter((node) => node.type === "boss");
    if (bossNodes.length === 0) {
      issues.push(
        issue(
          "error",
          "missing_run_map_boss_node",
          `Run map template '${template.id}' has no boss node.`,
          `runMapTemplates[${templateIndex}].nodes`
        )
      );
    }

    const firstLayerNodes = validNodes.filter((node) => node.layer === firstLayer);
    const reachable = new Set<string>(
      firstLayerNodes.map((node) => node.id).filter((nodeId): nodeId is string => typeof nodeId === "string")
    );
    let changed = true;

    while (changed) {
      changed = false;

      for (const node of validNodes) {
        if (typeof node.id !== "string") {
          continue;
        }

        if (!reachable.has(node.id)) {
          continue;
        }

        for (const nextNodeId of Array.isArray(node.nextNodeIds) ? node.nextNodeIds : []) {
          if (typeof nextNodeId === "string" && nodeIds.has(nextNodeId) && !reachable.has(nextNodeId)) {
            reachable.add(nextNodeId);
            changed = true;
          }
        }
      }
    }

    if (bossNodes.some((node) => typeof node.id !== "string" || !reachable.has(node.id))) {
      issues.push(
        issue(
          "error",
          "unreachable_run_map_boss_node",
          `Run map template '${template.id}' has an unreachable boss node.`,
          `runMapTemplates[${templateIndex}].nodes`
        )
      );
    }
  });

  return issues;
};

export const validateRegistry = (registry: GameContentRegistry): ValidationResult => {
  if (!isRecord(registry)) {
    const invalidRegistry = [
      issue("error", "invalid_registry", "Registry must be an object.", "registry")
    ];

    return {
      issues: invalidRegistry,
      errors: invalidRegistry,
      warnings: []
    };
  }

  const registryRecord = registry as unknown as {
    readonly contentVersion?: unknown;
    readonly cards?: unknown;
    readonly pets?: unknown;
    readonly players?: unknown;
    readonly monsters?: unknown;
    readonly encounters?: unknown;
    readonly runMapTemplates?: unknown;
    readonly petUpgrades?: unknown;
    readonly petModifiers?: unknown;
    readonly playerClassModifiers?: unknown;
    readonly storyEvents?: unknown;
    readonly petSideStories?: unknown;
    readonly statuses?: unknown;
  };

  const contentIndex = buildContentIndex({
    contentVersion: typeof registryRecord.contentVersion === "string" ? registryRecord.contentVersion : "",
    cards: Array.isArray(registryRecord.cards) ? registryRecord.cards : [],
    statuses: Array.isArray(registryRecord.statuses) ? registryRecord.statuses : [burnStatusDefinition],
    pets: Array.isArray(registryRecord.pets) ? registryRecord.pets : [],
    players: Array.isArray(registryRecord.players) ? registryRecord.players : [],
    monsters: Array.isArray(registryRecord.monsters) ? registryRecord.monsters : [],
    encounters: Array.isArray(registryRecord.encounters) ? registryRecord.encounters : [],
    runMapTemplates: Array.isArray(registryRecord.runMapTemplates) ? registryRecord.runMapTemplates : [],
    petUpgrades: Array.isArray(registryRecord.petUpgrades) ? registryRecord.petUpgrades : [],
    petModifiers: Array.isArray(registryRecord.petModifiers) ? registryRecord.petModifiers : [],
    playerClassModifiers: Array.isArray(registryRecord.playerClassModifiers) ? registryRecord.playerClassModifiers : [],
    storyEvents: Array.isArray(registryRecord.storyEvents) ? registryRecord.storyEvents : [],
    petSideStories: Array.isArray(registryRecord.petSideStories) ? registryRecord.petSideStories : []
  } as unknown as GameContentRegistry);

  const issues: ValidationIssue[] = contentIndex.duplicateIds.map((duplicate) =>
    issue("error", "duplicate_id", `Duplicate id '${duplicate.id}' in ${duplicate.collection}.`, duplicate.collection)
  );

  if (
    "contentVersion" in registryRecord &&
    registryRecord.contentVersion !== undefined &&
    (typeof registryRecord.contentVersion !== "string" || registryRecord.contentVersion.length === 0)
  ) {
    issues.push(issue("error", "invalid_content_version", "Content version must be a non-empty string.", "contentVersion"));
  }

  if (!Array.isArray(registryRecord.cards)) {
    issues.push(issue("error", "invalid_cards", "Cards must be an array.", "cards"));
  }

  if (
    "statuses" in registryRecord &&
    registryRecord.statuses !== undefined &&
    !Array.isArray(registryRecord.statuses)
  ) {
    issues.push(issue("error", "invalid_statuses", "Statuses must be an array.", "statuses"));
  }

  if (!Array.isArray(registryRecord.players)) {
    issues.push(issue("error", "invalid_players", "Players must be an array.", "players"));
  }

  if (!Array.isArray(registryRecord.monsters)) {
    issues.push(issue("error", "invalid_monsters", "Monsters must be an array.", "monsters"));
  }

  if (!Array.isArray(registryRecord.storyEvents)) {
    issues.push(issue("error", "invalid_story_events", "Story events must be an array.", "storyEvents"));
  }

  if (!Array.isArray(registryRecord.petSideStories)) {
    issues.push(issue("error", "invalid_pet_side_stories", "Pet side stories must be an array.", "petSideStories"));
  }

  if (!Array.isArray(registryRecord.pets)) {
    issues.push(issue("error", "invalid_pets", "Pets must be an array.", "pets"));
  }

  if (!Array.isArray(registryRecord.petUpgrades)) {
    issues.push(issue("error", "invalid_pet_upgrades", "Pet upgrades must be an array.", "petUpgrades"));
  }

  if (registryRecord.petModifiers !== undefined && !Array.isArray(registryRecord.petModifiers)) {
    issues.push(issue("error", "invalid_pet_modifiers", "Pet modifiers must be an array when present.", "petModifiers"));
  }

  if (registryRecord.playerClassModifiers !== undefined && !Array.isArray(registryRecord.playerClassModifiers)) {
    issues.push(issue("error", "invalid_player_class_modifiers", "Player class modifiers must be an array when present.", "playerClassModifiers"));
  }

  const cardDefinitions = Array.isArray(registryRecord.cards) ? registryRecord.cards : [];
  const statusDefinitions = Array.isArray(registryRecord.statuses) ? registryRecord.statuses : [burnStatusDefinition];
  const playerDefinitions = Array.isArray(registryRecord.players) ? registryRecord.players : [];
  const monsterDefinitions = Array.isArray(registryRecord.monsters) ? registryRecord.monsters : [];
  const storyEventDefinitions = Array.isArray(registryRecord.storyEvents) ? registryRecord.storyEvents : [];
  const petSideStoryDefinitions = Array.isArray(registryRecord.petSideStories) ? registryRecord.petSideStories : [];
  const petDefinitions = Array.isArray(registryRecord.pets) ? registryRecord.pets : [];
  const petUpgradeDefinitions = Array.isArray(registryRecord.petUpgrades) ? registryRecord.petUpgrades : [];
  const standalonePetModifierDefinitions = Array.isArray(registryRecord.petModifiers) ? registryRecord.petModifiers : [];
  const playerClassModifierDefinitions = Array.isArray(registryRecord.playerClassModifiers) ? registryRecord.playerClassModifiers : [];
  const cardIds = new Set(
    cardDefinitions
      .filter(isRecord)
      .map((card) => card.id)
      .filter(isString)
  );
  const supportedStatusEffectIds = getRuntimeSupportedStatusIds({
    statuses: statusDefinitions as readonly NonNullable<GameContentRegistry["statuses"]>[number][]
  });
  const monsterIds = new Set(
    monsterDefinitions
      .filter(isRecord)
      .map((monster) => monster.id)
      .filter(isString)
  );
  const petDefinitionIds = new Set<string>(
    petDefinitions
      .filter(isRecord)
      .map((pet) => pet.id)
      .filter(isString)
  );
  const playerClassIds = new Set(
    playerDefinitions
      .filter(isRecord)
      .map((player) => player.id)
      .filter(isString)
  );
  const playerClassModifierIds = new Set(
    playerClassModifierDefinitions
      .filter(isRecord)
      .map((modifier) => modifier.id)
      .filter(isString)
  );
  const storyEventIds = new Set(
    storyEventDefinitions
      .filter(isRecord)
      .map((storyEvent) => storyEvent.id)
      .filter(isString)
  );
  const topLevelStoryEventsById = new Map(
    storyEventDefinitions
      .filter(isRecord)
      .map((storyEvent) => [storyEvent.id, storyEvent])
      .filter((entry): entry is [string, Record<string, unknown>] => typeof entry[0] === "string")
  );
  const embeddedStoryEventIdValues = petSideStoryDefinitions
    .filter(isRecord)
    .flatMap((petSideStory) => Array.isArray(petSideStory.events) ? petSideStory.events : [])
    .filter(isRecord)
    .map((storyEvent) => storyEvent.id)
    .filter(isString);
  const embeddedStoryEventIds = new Set(embeddedStoryEventIdValues);
  const seenEmbeddedStoryEventIds = new Set<string>();
  const duplicateEmbeddedStoryEventIds = new Set<string>();
  embeddedStoryEventIdValues.forEach((storyEventId) => {
    if (seenEmbeddedStoryEventIds.has(storyEventId)) {
      duplicateEmbeddedStoryEventIds.add(storyEventId);
    }
    seenEmbeddedStoryEventIds.add(storyEventId);
  });
  duplicateEmbeddedStoryEventIds.forEach((storyEventId) => {
    issues.push(
      issue(
        "error",
        "duplicate_embedded_story_event",
        `Embedded story event '${storyEventId}' is declared more than once.`,
        "petSideStories.events"
      )
    );
  });
  const sideStoryIdByEventId = new Map<string, string>();
  petSideStoryDefinitions
    .filter(isRecord)
    .forEach((petSideStory) => {
      if (typeof petSideStory.id !== "string") {
        return;
      }

      const linkedEventIds = [
        petSideStory.id,
        ...(Array.isArray(petSideStory.events)
          ? petSideStory.events
              .filter(isRecord)
              .map((storyEvent) => storyEvent.id)
              .filter(isString)
          : [])
      ];

      linkedEventIds.forEach((storyEventId) => {
        const existingSideStoryId = sideStoryIdByEventId.get(storyEventId);
        if (existingSideStoryId && existingSideStoryId !== petSideStory.id) {
          issues.push(
            issue(
              "error",
              "ambiguous_pet_side_story_event",
              `Story event '${storyEventId}' is linked to multiple pet side stories.`,
              "petSideStories"
            )
          );
        }

        sideStoryIdByEventId.set(storyEventId, petSideStory.id as string);
      });
    });
  const allStoryEventIds = new Set([...storyEventIds, ...embeddedStoryEventIds]);
  const petSideStoryIds = new Set(
    petSideStoryDefinitions
      .filter(isRecord)
      .map((petSideStory) => petSideStory.id)
      .filter(isString)
  );
  const upgradeIds = new Set(
    petUpgradeDefinitions
      .filter(isRecord)
      .map((upgrade) => upgrade.id)
      .filter(isString)
  );
  const upgradesById = new Map(
    petUpgradeDefinitions
      .filter(isRecord)
      .map((upgrade) => [upgrade.id, upgrade])
      .filter((entry): entry is [string, Record<string, unknown>] => typeof entry[0] === "string")
  );
  const evolutionNodeIds = new Set(
    petDefinitions
      .filter(isRecord)
      .flatMap((pet) => Array.isArray(pet.evolutionTree) ? pet.evolutionTree : [])
      .filter(isRecord)
      .map((evolutionNode) => evolutionNode.id)
      .filter(isString)
  );

  const validateStoryRequirementPayload = (
    requirement: StoryRequirement,
    path: string,
    storyEventId: unknown
  ): ValidationIssue[] => {
    switch (requirement.type) {
      case "petBondAtLeast":
        return Number.isInteger(requirement.bondLevel) && requirement.bondLevel >= 0
          ? []
          : [issue("error", "invalid_story_requirement", `Story event '${String(storyEventId)}' petBondAtLeast requires a non-negative integer bondLevel.`, path)];
      case "hasPetMemory":
        return typeof requirement.memoryId === "string" && requirement.memoryId.length > 0
          ? []
          : [issue("error", "invalid_story_requirement", `Story event '${String(storyEventId)}' hasPetMemory requires a memoryId.`, path)];
      case "bossDefeated":
        return typeof requirement.bossId === "string" && requirement.bossId.length > 0
          ? []
          : [issue("error", "invalid_story_requirement", `Story event '${String(storyEventId)}' bossDefeated requires a bossId.`, path)];
      case "chapterUnlocked":
        return typeof requirement.chapterId === "string" && requirement.chapterId.length > 0
          ? []
          : [issue("error", "invalid_story_requirement", `Story event '${String(storyEventId)}' chapterUnlocked requires a chapterId.`, path)];
      case "hasSeenEvent":
        if (typeof requirement.eventId !== "string" || requirement.eventId.length === 0) {
          return [issue("error", "invalid_story_requirement", `Story event '${String(storyEventId)}' hasSeenEvent requires an eventId.`, path)];
        }

        return allStoryEventIds.has(requirement.eventId)
          ? []
          : [issue("error", "missing_story_event_requirement", `Story event '${String(storyEventId)}' references missing seen event '${requirement.eventId}'.`, path)];
      case "activePetHasTag":
        return typeof requirement.tag === "string" && requirement.tag.length > 0
          ? []
          : [issue("error", "invalid_story_requirement", `Story event '${String(storyEventId)}' activePetHasTag requires a tag.`, path)];
      case "playerClassIs":
        if (typeof requirement.playerClassId !== "string" || requirement.playerClassId.length === 0) {
          return [issue("error", "invalid_story_requirement", `Story event '${String(storyEventId)}' playerClassIs requires a playerClassId.`, path)];
        }

        return playerClassIds.has(requirement.playerClassId)
          ? []
          : [issue("error", "missing_story_player_class", `Story event '${String(storyEventId)}' references missing player class '${requirement.playerClassId}'.`, path)];
      case "hasPetStoryFlag":
      case "lacksPetStoryFlag":
        return typeof requirement.flagId === "string" && requirement.flagId.length > 0
          ? []
          : [issue("error", "invalid_story_requirement", `Story event '${String(storyEventId)}' ${requirement.type} requires a flagId.`, path)];
      case "runStatusIs":
        return (
          requirement.status === "not_started" ||
          requirement.status === "map_select" ||
          requirement.status === "combat" ||
          requirement.status === "reward" ||
          requirement.status === "completed" ||
          requirement.status === "lost"
        )
          ? []
          : [issue("error", "invalid_story_requirement", `Story event '${String(storyEventId)}' runStatusIs requires a supported run status.`, path)];
      case "completedRunNodeType":
        return (
          requirement.nodeType === "combat" ||
          requirement.nodeType === "elite" ||
          requirement.nodeType === "rest" ||
          requirement.nodeType === "event" ||
          requirement.nodeType === "boss"
        )
          ? []
          : [issue("error", "invalid_story_requirement", `Story event '${String(storyEventId)}' completedRunNodeType requires a supported node type.`, path)];
      default:
        return [issue("error", "unknown_story_requirement", `Story event '${String(storyEventId)}' has unknown requirement '${String((requirement as { readonly type?: unknown }).type)}'.`, path)];
    }
  };

  const validateStoryOutcomePayload = (
    outcome: StoryOutcome,
    path: string,
    storyEventId: unknown
  ): ValidationIssue[] => {
    switch (outcome.type) {
      case "setStoryFlag":
        return typeof outcome.flagId === "string" && outcome.flagId.length > 0
          ? []
          : [issue("error", "invalid_story_outcome", `Story event '${String(storyEventId)}' setStoryFlag requires a flagId.`, path)];
      case "unlockPetMemory":
        return typeof outcome.memoryId === "string" && outcome.memoryId.length > 0
          ? []
          : [issue("error", "invalid_story_outcome", `Story event '${String(storyEventId)}' unlockPetMemory requires a memoryId.`, path)];
      case "unlockPetUpgrade":
        if (typeof outcome.upgradeId !== "string" || outcome.upgradeId.length === 0) {
          return [issue("error", "invalid_story_outcome", `Story event '${String(storyEventId)}' unlockPetUpgrade requires an upgradeId.`, path)];
        }

        return upgradeIds.has(outcome.upgradeId)
          ? []
          : [issue("error", "missing_story_upgrade", `Story event '${String(storyEventId)}' references missing upgrade '${outcome.upgradeId}'.`, path)];
      case "unlockEvolutionNode":
        if (typeof outcome.evolutionNodeId !== "string" || outcome.evolutionNodeId.length === 0) {
          return [issue("error", "invalid_story_outcome", `Story event '${String(storyEventId)}' unlockEvolutionNode requires an evolutionNodeId.`, path)];
        }

        return evolutionNodeIds.has(outcome.evolutionNodeId)
          ? []
          : [issue("error", "missing_story_evolution_node", `Story event '${String(storyEventId)}' references missing evolution node '${outcome.evolutionNodeId}'.`, path)];
      case "addBondXp":
        return Number.isInteger(outcome.amount) && outcome.amount > 0
          ? []
          : [issue("error", "invalid_story_bond_xp", `Story event '${String(storyEventId)}' has invalid bond XP amount.`, path)];
      case "markStoryEventSeen":
        if (typeof outcome.eventId !== "string" || outcome.eventId.length === 0) {
          return [issue("error", "invalid_story_outcome", `Story event '${String(storyEventId)}' markStoryEventSeen requires an eventId.`, path)];
        }

        return allStoryEventIds.has(outcome.eventId)
          ? []
          : [issue("error", "missing_story_event_requirement", `Story event '${String(storyEventId)}' marks missing seen event '${outcome.eventId}'.`, path)];
      default:
        return [issue("error", "unknown_story_outcome", `Story event '${String(storyEventId)}' has unknown outcome '${String((outcome as { readonly type?: unknown }).type)}'.`, path)];
    }
  };

  playerDefinitions.forEach((playerValue, playerIndex) => {
    if (!isRecord(playerValue)) {
      issues.push(issue("error", "invalid_player", "Player definition must be an object.", `players[${playerIndex}]`));
      return;
    }

    const player = playerValue;
    if (typeof player.id !== "string") {
      issues.push(issue("error", "invalid_player_id", "Player id must be a string.", `players[${playerIndex}].id`));
    }

    if (!Array.isArray(player.startingDeckCardIds)) {
      issues.push(issue("error", "invalid_starting_deck", `Player '${String(player.id)}' startingDeckCardIds must be an array.`, `players[${playerIndex}].startingDeckCardIds`));
    }

    const startingDeckCardIds = Array.isArray(player.startingDeckCardIds) ? player.startingDeckCardIds : [];
    startingDeckCardIds.forEach((cardId, cardIndex) => {
      if (!cardIds.has(cardId)) {
        issues.push(
          issue(
            "error",
            "missing_starting_deck_card",
            `Player '${String(player.id)}' references missing starting card '${cardId}'.`,
            `players[${playerIndex}].startingDeckCardIds[${cardIndex}]`
          )
        );
      }
    });

    if ("classModifierIds" in player && player.classModifierIds !== undefined && !Array.isArray(player.classModifierIds)) {
      issues.push(issue("error", "invalid_player_class_modifiers", `Player '${String(player.id)}' classModifierIds must be an array.`, `players[${playerIndex}].classModifierIds`));
    }

    const classModifierIds = Array.isArray(player.classModifierIds) ? player.classModifierIds : [];
    classModifierIds.forEach((modifierId, modifierIndex) => {
      if (!playerClassModifierIds.has(modifierId)) {
        issues.push(
          issue(
            "error",
            "missing_player_class_modifier",
            `Player '${String(player.id)}' references missing class modifier '${modifierId}'.`,
            `players[${playerIndex}].classModifierIds[${modifierIndex}]`
          )
        );
      }
    });

    if ("startingResources" in player && player.startingResources !== undefined && !Array.isArray(player.startingResources)) {
      issues.push(issue("error", "invalid_player_class_resource", `Player '${String(player.id)}' startingResources must be an array.`, `players[${playerIndex}].startingResources`));
    }

    const startingResources = Array.isArray(player.startingResources) ? player.startingResources : [];
    startingResources.forEach((resource, resourceIndex) => {
      if (!isRecord(resource)) {
        issues.push(issue("error", "invalid_player_class_resource", "Player class starting resource must be an object.", `players[${playerIndex}].startingResources[${resourceIndex}]`));
        return;
      }

      if (typeof resource.id !== "string" || resource.id.length === 0) {
        issues.push(issue("error", "invalid_player_class_resource", "Player class starting resource id must be a non-empty string.", `players[${playerIndex}].startingResources[${resourceIndex}].id`));
      }

      if (typeof resource.amount !== "number" || !Number.isInteger(resource.amount) || resource.amount < 0) {
        issues.push(issue("error", "invalid_player_class_resource", "Player class starting resource amount must be a non-negative integer.", `players[${playerIndex}].startingResources[${resourceIndex}].amount`));
      }
    });

    if (
      typeof player.maxActivePets === "number" &&
      typeof player.petSlotCount === "number" &&
      player.maxActivePets > player.petSlotCount
    ) {
      issues.push(
        issue(
          "error",
          "invalid_pet_slot_capacity",
          `Player '${String(player.id)}' allows more active pets than pet slots.`,
          `players[${playerIndex}]`
        )
      );
    }
  });

  playerClassModifierDefinitions.forEach((modifierValue, modifierIndex) => {
    if (!isRecord(modifierValue)) {
      issues.push(issue("error", "invalid_player_class_modifier", "Player class modifier definition must be an object.", `playerClassModifiers[${modifierIndex}]`));
      return;
    }

    if (typeof modifierValue.id !== "string" || modifierValue.id.length === 0) {
      issues.push(issue("error", "invalid_player_class_modifier", "Player class modifier id must be a non-empty string.", `playerClassModifiers[${modifierIndex}].id`));
    }

    if (typeof modifierValue.name !== "string" || modifierValue.name.length === 0) {
      issues.push(issue("error", "invalid_player_class_modifier", "Player class modifier name must be a non-empty string.", `playerClassModifiers[${modifierIndex}].name`));
    }

    if (typeof modifierValue.description !== "string" || modifierValue.description.length === 0) {
      issues.push(issue("error", "invalid_player_class_modifier", "Player class modifier description must be a non-empty string.", `playerClassModifiers[${modifierIndex}].description`));
    }

    if (!Array.isArray(modifierValue.tags)) {
      issues.push(issue("error", "invalid_player_class_modifier", "Player class modifier tags must be an array.", `playerClassModifiers[${modifierIndex}].tags`));
    }

    if ("rules" in modifierValue && modifierValue.rules !== undefined && !Array.isArray(modifierValue.rules)) {
      issues.push(issue("error", "invalid_player_class_modifier", "Player class modifier rules must be an array when present.", `playerClassModifiers[${modifierIndex}].rules`));
    }

    const rules = Array.isArray(modifierValue.rules) ? modifierValue.rules : [];
    rules.forEach((rule, ruleIndex) => {
      issues.push(...validatePlayerClassModifierRule(
        supportedStatusEffectIds,
        rule as PlayerClassModifierRule,
        `playerClassModifiers[${modifierIndex}].rules[${ruleIndex}]`
      ));
    });
  });

  petDefinitions.forEach((petValue, petIndex) => {
    if (!isRecord(petValue)) {
      issues.push(issue("error", "invalid_pet", "Pet definition must be an object.", `pets[${petIndex}]`));
      return;
    }

    const pet = petValue;
    if (typeof pet.id !== "string") {
      issues.push(issue("error", "invalid_pet_id", "Pet definition id must be a string.", `pets[${petIndex}].id`));
    }

    if (!Array.isArray(pet.baseCommandCardIds)) {
      issues.push(
        issue(
          "error",
          "invalid_pet_command_cards",
          `Pet '${String(pet.id)}' baseCommandCardIds must be an array.`,
          `pets[${petIndex}].baseCommandCardIds`
        )
      );
    }

    const baseCommandCardIds = Array.isArray(pet.baseCommandCardIds) ? pet.baseCommandCardIds : [];
    baseCommandCardIds.forEach((cardId, cardIndex) => {
      if (!cardIds.has(cardId)) {
        issues.push(
          issue(
            "error",
            "missing_pet_command_card",
            `Pet '${String(pet.id)}' references missing command card '${cardId}'.`,
            `pets[${petIndex}].baseCommandCardIds[${cardIndex}]`
          )
        );
      }
    });

    if (typeof pet.sideStoryId === "string" && !allStoryEventIds.has(pet.sideStoryId) && !petSideStoryIds.has(pet.sideStoryId)) {
      issues.push(
        issue(
          "error",
          "missing_pet_side_story",
          `Pet '${String(pet.id)}' references missing side story '${pet.sideStoryId}'.`,
          `pets[${petIndex}].sideStoryId`
        )
      );
    }
  });

  statusDefinitions.forEach((statusValue, statusIndex) => {
    if (!isRecord(statusValue)) {
      issues.push(issue("error", "invalid_status", "Status definition must be an object.", `statuses[${statusIndex}]`));
      return;
    }

    if (typeof statusValue.id !== "string" || statusValue.id.length === 0) {
      issues.push(issue("error", "invalid_status", "Status id must be a non-empty string.", `statuses[${statusIndex}].id`));
    }

    if (typeof statusValue.name !== "string" || statusValue.name.length === 0) {
      issues.push(issue("error", "invalid_status", "Status name must be a non-empty string.", `statuses[${statusIndex}].name`));
    }

    if (!Array.isArray(statusValue.tags)) {
      issues.push(issue("error", "invalid_status", "Status tags must be an array.", `statuses[${statusIndex}].tags`));
    }

    if (typeof statusValue.description !== "string" || statusValue.description.length === 0) {
      issues.push(issue("error", "invalid_status", "Status description must be a non-empty string.", `statuses[${statusIndex}].description`));
    }

    if (
      "behaviour" in statusValue &&
      statusValue.behaviour !== undefined &&
      !validateStatusBehaviourDefinition(statusValue.behaviour)
    ) {
      issues.push(issue("error", "invalid_status_behaviour", "Status behaviour is not supported.", `statuses[${statusIndex}].behaviour`));
    }
  });

  cardDefinitions.forEach((cardValue, cardIndex) => {
    if (!isRecord(cardValue)) {
      issues.push(issue("error", "invalid_card", "Card definition must be an object.", `cards[${cardIndex}]`));
      return;
    }

    const card = cardValue;
    if (
      typeof card.requiresPetDefinitionId === "string" &&
      !petDefinitionIds.has(card.requiresPetDefinitionId)
    ) {
      issues.push(
        issue(
          "error",
          "missing_required_pet_definition",
          `Card '${String(card.id)}' references missing pet definition '${String(card.requiresPetDefinitionId)}'.`,
          `cards[${cardIndex}].requiresPetDefinitionId`
        )
      );
    }

    if (!Array.isArray(card.effects)) {
      issues.push(issue("error", "invalid_card_effects", `Card '${String(card.id)}' effects must be an array.`, `cards[${cardIndex}].effects`));
      return;
    }

    issues.push(...validateEffects(card.effects as readonly EffectDefinition[], `cards[${cardIndex}]`, { statusIds: supportedStatusEffectIds }));
  });

  monsterDefinitions.forEach((monsterValue, monsterIndex) => {
    if (!isRecord(monsterValue)) {
      issues.push(issue("error", "invalid_monster", "Monster definition must be an object.", `monsters[${monsterIndex}]`));
      return;
    }

    const monster = monsterValue;
    if (!Array.isArray(monster.intentPool)) {
      issues.push(issue("error", "invalid_monster_intents", `Monster '${String(monster.id)}' intentPool must be an array.`, `monsters[${monsterIndex}].intentPool`));
      return;
    }

    monster.intentPool.forEach((intent, intentIndex) => {
      if (!isRecord(intent) || !Array.isArray(intent.effects)) {
        issues.push(issue("error", "invalid_monster_intent", "Monster intent must be an object with effects.", `monsters[${monsterIndex}].intentPool[${intentIndex}]`));
        return;
      }

      issues.push(...validateEffects(intent.effects as readonly EffectDefinition[], `monsters[${monsterIndex}].intentPool[${intentIndex}]`, { statusIds: supportedStatusEffectIds }));
    });

    if ("intentSchedule" in monster && monster.intentSchedule !== undefined) {
      if (!Array.isArray(monster.intentSchedule)) {
        issues.push(issue("error", "invalid_monster_intent_schedule", `Monster '${String(monster.id)}' intentSchedule must be an array when present.`, `monsters[${monsterIndex}].intentSchedule`));
      } else {
        const intentIds = new Set(
          monster.intentPool
            .filter(isRecord)
            .map((intent) => intent.id)
            .filter(isString)
        );
        monster.intentSchedule.forEach((step, stepIndex) => {
          if (!isRecord(step) || typeof step.intentId !== "string" || !intentIds.has(step.intentId)) {
            issues.push(issue("error", "invalid_monster_intent_schedule", "Monster intent schedule step must reference an intent in the monster intent pool.", `monsters[${monsterIndex}].intentSchedule[${stepIndex}].intentId`));
          }

          if ("conditions" in step && step.conditions !== undefined && !Array.isArray(step.conditions)) {
            issues.push(issue("error", "invalid_monster_intent_schedule", "Monster intent schedule conditions must be an array when present.", `monsters[${monsterIndex}].intentSchedule[${stepIndex}].conditions`));
          }

          const conditions: readonly unknown[] = Array.isArray(step.conditions) ? step.conditions : [];
          conditions.forEach((condition, conditionIndex) => {
            const conditionPath = `monsters[${monsterIndex}].intentSchedule[${stepIndex}].conditions[${conditionIndex}]`;
            if (!isRecord(condition)) {
              issues.push(issue("error", "invalid_monster_intent_schedule", "Monster intent schedule condition must be an object.", conditionPath));
              return;
            }

            if (condition.type === "hpAtOrBelowRatio") {
              if (typeof condition.ratio !== "number" || !Number.isFinite(condition.ratio) || condition.ratio <= 0 || condition.ratio > 1) {
                issues.push(issue("error", "invalid_monster_intent_schedule", "Monster intent schedule hp ratio must be above 0 and at most 1.", `${conditionPath}.ratio`));
              }
              return;
            }

            if (condition.type === "turnNumberModulo") {
              if (typeof condition.modulo !== "number" || !Number.isInteger(condition.modulo) || condition.modulo <= 0) {
                issues.push(issue("error", "invalid_monster_intent_schedule", "Monster intent schedule modulo must be a positive integer.", `${conditionPath}.modulo`));
              }

              if (
                typeof condition.equals !== "number" ||
                !Number.isInteger(condition.equals) ||
                condition.equals < 0 ||
                (typeof condition.modulo === "number" && Number.isInteger(condition.modulo) && condition.modulo > 0 && condition.equals >= condition.modulo)
              ) {
                issues.push(issue("error", "invalid_monster_intent_schedule", "Monster intent schedule equals must be an integer from 0 to modulo - 1.", `${conditionPath}.equals`));
              }
              return;
            }

            issues.push(issue("error", "invalid_monster_intent_schedule", `Monster intent schedule condition type '${String(condition.type)}' is unknown.`, `${conditionPath}.type`));
          });
        });
      }
    }
  });

  const knownEncounterTypes = new Set<EncounterType>(["combat", "elite", "boss"]);
  if (!Array.isArray(registry.encounters)) {
    issues.push(
      issue("error", "invalid_encounters", "Encounters must be an array.", "encounters")
    );
  }

  const encounterDefinitions = Array.isArray(registry.encounters) ? registry.encounters : [];
  encounterDefinitions.forEach((encounterValue, encounterIndex) => {
    if (!isRecord(encounterValue)) {
      issues.push(
        issue(
          "error",
          "invalid_encounter",
          "Encounter definition must be an object.",
          `encounters[${encounterIndex}]`
        )
      );
      return;
    }

    const encounter = encounterValue as EncounterCandidate;
    if (typeof encounter.id !== "string") {
      issues.push(
        issue(
          "error",
          "invalid_encounter_id",
          "Encounter id must be a string.",
          `encounters[${encounterIndex}].id`
        )
      );
    }

    if (!knownEncounterTypes.has(encounter.type as EncounterType)) {
      issues.push(
        issue(
          "error",
          "unknown_encounter_type",
          `Encounter '${encounter.id}' has unknown type '${String(encounter.type)}'.`,
          `encounters[${encounterIndex}].type`
        )
      );
    }

    if (!Array.isArray(encounter.monsterIds) || encounter.monsterIds.length === 0) {
      issues.push(
        issue(
          "error",
          "missing_encounter_monster",
          `Encounter '${encounter.id}' must reference at least one monster.`,
          `encounters[${encounterIndex}].monsterIds`
        )
      );
    }

    const encounterMonsterIds = Array.isArray(encounter.monsterIds) ? encounter.monsterIds : [];
    encounterMonsterIds.forEach((monsterId, monsterIndex) => {
      if (typeof monsterId !== "string" || !monsterIds.has(monsterId)) {
        issues.push(
          issue(
            "error",
            "missing_encounter_monster",
            `Encounter '${encounter.id}' references missing monster '${monsterId}'.`,
            `encounters[${encounterIndex}].monsterIds[${monsterIndex}]`
          )
        );
      }
    });
  });

  issues.push(...validateRunMapTemplates(registry));

  const petModifierIds = new Set<string>();
  petUpgradeDefinitions.forEach((upgradeValue, upgradeIndex) => {
    if (!isRecord(upgradeValue)) {
      issues.push(
        issue(
          "error",
          "invalid_pet_upgrade",
          "Pet upgrade definition must be an object.",
          `petUpgrades[${upgradeIndex}]`
        )
      );
      return;
    }

    const upgrade = upgradeValue as PetUpgradeCandidate;
    if (typeof upgrade.id !== "string" || upgrade.id.length === 0) {
      issues.push(
        issue(
          "error",
          "invalid_pet_upgrade",
          "Pet upgrade id must be a non-empty string.",
          `petUpgrades[${upgradeIndex}].id`
        )
      );
    }

    if (typeof upgrade.petDefinitionId !== "string" || !petDefinitionIds.has(upgrade.petDefinitionId)) {
      issues.push(
        issue(
          "error",
          "missing_upgrade_pet_definition",
          `Upgrade '${upgrade.id}' references missing pet definition '${upgrade.petDefinitionId}'.`,
          `petUpgrades[${upgradeIndex}].petDefinitionId`
        )
      );
    }

    if (!Array.isArray(upgrade.modifiers)) {
      issues.push(
        issue(
          "error",
          "invalid_pet_upgrade_modifiers",
          `Upgrade '${String(upgrade.id)}' modifiers must be an array.`,
          `petUpgrades[${upgradeIndex}].modifiers`
        )
      );
    }

    const modifiers = Array.isArray(upgrade.modifiers) ? upgrade.modifiers : [];
    modifiers.forEach((modifier, modifierIndex) => {
      if (typeof modifier !== "object" || modifier === null) {
        issues.push(
          issue(
            "error",
            "invalid_pet_modifier",
            "Pet modifier definition must be an object.",
            `petUpgrades[${upgradeIndex}].modifiers[${modifierIndex}]`
          )
        );
        return;
      }

      if (typeof modifier.id !== "string" || modifier.id.length === 0) {
        issues.push(
          issue(
            "error",
            "invalid_pet_modifier",
            "Pet modifier id must be a non-empty string.",
            `petUpgrades[${upgradeIndex}].modifiers[${modifierIndex}].id`
          )
        );
        return;
      }

      if (petModifierIds.has(modifier.id)) {
        issues.push(
          issue(
            "error",
            "duplicate_pet_modifier_id",
            `Duplicate modifier id '${modifier.id}' on upgrade '${upgrade.id}'.`,
            `petUpgrades[${upgradeIndex}].modifiers[${modifierIndex}].id`
          )
        );
      }
      petModifierIds.add(modifier.id);

      if (!Array.isArray(modifier.rules) || modifier.rules.length === 0) {
        issues.push(
          issue(
            "error",
            "missing_pet_modifier_rules",
            `Modifier '${modifier.id}' has no rules.`,
            `petUpgrades[${upgradeIndex}].modifiers[${modifierIndex}].rules`
          )
        );
      }

      if (Array.isArray(modifier.rules)) {
        modifier.rules.forEach((rule: unknown, ruleIndex: number) => {
          issues.push(...validatePetModifierRule(
            petDefinitionIds,
            supportedStatusEffectIds,
            rule as PetModifierRule,
            `petUpgrades[${upgradeIndex}].modifiers[${modifierIndex}].rules[${ruleIndex}]`
          ));
        });
      }
    });
  });

  const standalonePetModifierIds = new Set<string>();
  standalonePetModifierDefinitions.forEach((modifier, modifierIndex) => {
    if (typeof modifier !== "object" || modifier === null) {
      issues.push(
        issue(
          "error",
          "invalid_pet_modifier",
          "Pet modifier definition must be an object.",
          `petModifiers[${modifierIndex}]`
        )
      );
      return;
    }

    if (typeof modifier.id !== "string" || modifier.id.length === 0) {
      issues.push(
        issue(
          "error",
          "invalid_pet_modifier",
          "Pet modifier id must be a non-empty string.",
          `petModifiers[${modifierIndex}].id`
        )
      );
      return;
    }

    if (standalonePetModifierIds.has(modifier.id)) {
      issues.push(
        issue(
          "error",
          "duplicate_pet_modifier_id",
          `Duplicate standalone modifier id '${modifier.id}'.`,
          `petModifiers[${modifierIndex}].id`
        )
      );
    }
    standalonePetModifierIds.add(modifier.id);

    if (!Array.isArray(modifier.rules) || modifier.rules.length === 0) {
      issues.push(
        issue(
          "error",
          "missing_pet_modifier_rules",
          `Modifier '${modifier.id}' has no rules.`,
          `petModifiers[${modifierIndex}].rules`
        )
      );
    }

    if (Array.isArray(modifier.rules)) {
      modifier.rules.forEach((rule: unknown, ruleIndex: number) => {
        issues.push(...validatePetModifierRule(petDefinitionIds, supportedStatusEffectIds, rule as PetModifierRule, `petModifiers[${modifierIndex}].rules[${ruleIndex}]`));
      });
    }
  });

  storyEventDefinitions.forEach((storyEventValue, storyIndex) => {
    if (!isRecord(storyEventValue)) {
      issues.push(
        issue("error", "invalid_story_event", "Story event must be an object.", `storyEvents[${storyIndex}]`)
      );
      return;
    }

    const storyEvent = storyEventValue as StoryEventCandidate;
    if (typeof storyEvent.id !== "string" || storyEvent.id.length === 0) {
      issues.push(
        issue("error", "invalid_story_event_id", "Story event id must be a string.", `storyEvents[${storyIndex}].id`)
      );
    }

    if (typeof storyEventValue.title !== "string" || storyEventValue.title.length === 0) {
      issues.push(
        issue("error", "invalid_story_event_metadata", `Story event '${String(storyEvent.id)}' title must be a non-empty string.`, `storyEvents[${storyIndex}].title`)
      );
    }

    if (typeof storyEventValue.description !== "string" || storyEventValue.description.length === 0) {
      issues.push(
        issue("error", "invalid_story_event_metadata", `Story event '${String(storyEvent.id)}' description must be a non-empty string.`, `storyEvents[${storyIndex}].description`)
      );
    }

    if (
      !Array.isArray(storyEventValue.tags) ||
      storyEventValue.tags.some((tag) => typeof tag !== "string" || tag.length === 0)
    ) {
      issues.push(
        issue("error", "invalid_story_event_metadata", `Story event '${String(storyEvent.id)}' tags must be a string array.`, `storyEvents[${storyIndex}].tags`)
      );
    }

    if (storyEvent.trigger !== undefined && !storyTriggers.has(storyEvent.trigger as StoryTrigger)) {
      issues.push(
        issue(
          "error",
          "unknown_story_trigger",
          `Story event '${String(storyEvent.id)}' has unknown trigger '${String(storyEvent.trigger)}'.`,
          `storyEvents[${storyIndex}].trigger`
        )
      );
    }

    if (storyEvent.repeatable !== undefined && typeof storyEvent.repeatable !== "boolean") {
      issues.push(
        issue(
          "error",
          "invalid_story_repeatable",
          `Story event '${String(storyEvent.id)}' repeatable must be a boolean when present.`,
          `storyEvents[${storyIndex}].repeatable`
        )
      );
    }

    if (!Array.isArray(storyEvent.requirements)) {
      issues.push(
        issue(
          "error",
          "invalid_story_requirements",
          `Story event '${String(storyEvent.id)}' requirements must be an array.`,
          `storyEvents[${storyIndex}].requirements`
        )
      );
    }

    const requirements = Array.isArray(storyEvent.requirements) ? storyEvent.requirements : [];
    requirements.forEach((requirementValue, requirementIndex) => {
      if (!isRecord(requirementValue)) {
        issues.push(
          issue(
            "error",
            "invalid_story_requirement",
            "Story requirement must be an object.",
            `storyEvents[${storyIndex}].requirements[${requirementIndex}]`
          )
        );
        return;
      }

      const requirement = requirementValue as StoryRequirement;
      if (!storyRequirementTypes.has(requirement.type)) {
        issues.push(
          issue(
            "error",
            "unknown_story_requirement",
            `Story event '${String(storyEvent.id)}' has unknown requirement '${String(requirement.type)}'.`,
            `storyEvents[${storyIndex}].requirements[${requirementIndex}]`
          )
        );
        return;
      }

      issues.push(...validateStoryRequirementPayload(
        requirement,
        `storyEvents[${storyIndex}].requirements[${requirementIndex}]`,
        storyEvent.id
      ));
    });

    if (!Array.isArray(storyEvent.outcomes)) {
      issues.push(
        issue(
          "error",
          "invalid_story_outcomes",
          `Story event '${String(storyEvent.id)}' outcomes must be an array.`,
          `storyEvents[${storyIndex}].outcomes`
        )
      );
    }

    const outcomes = Array.isArray(storyEvent.outcomes) ? storyEvent.outcomes : [];
    outcomes.forEach((outcomeValue, outcomeIndex) => {
      if (!isRecord(outcomeValue)) {
        issues.push(
          issue(
            "error",
            "invalid_story_outcome",
            "Story outcome must be an object.",
            `storyEvents[${storyIndex}].outcomes[${outcomeIndex}]`
          )
        );
        return;
      }

      const outcome = outcomeValue as StoryOutcome;
      if (!storyOutcomeTypes.has(outcome.type)) {
        issues.push(
          issue(
            "error",
            "unknown_story_outcome",
            `Story event '${String(storyEvent.id)}' has unknown outcome '${String(outcome.type)}'.`,
            `storyEvents[${storyIndex}].outcomes[${outcomeIndex}]`
          )
        );
        return;
      }

      issues.push(...validateStoryOutcomePayload(
        outcome,
        `storyEvents[${storyIndex}].outcomes[${outcomeIndex}]`,
        storyEvent.id
      ));
    });
  });

  petSideStoryDefinitions.forEach((petSideStoryValue, petSideStoryIndex) => {
    if (!isRecord(petSideStoryValue)) {
      issues.push(
        issue(
          "error",
          "invalid_pet_side_story",
          "Pet side story must be an object.",
          `petSideStories[${petSideStoryIndex}]`
        )
      );
      return;
    }

    const petSideStory = petSideStoryValue as PetSideStoryCandidate;
    if (typeof petSideStory.petDefinitionId !== "string" || !petDefinitionIds.has(petSideStory.petDefinitionId)) {
      issues.push(
        issue(
          "error",
          "missing_pet_side_story_pet",
          `Pet side story '${petSideStory.id}' references missing pet definition '${petSideStory.petDefinitionId}'.`,
          `petSideStories[${petSideStoryIndex}].petDefinitionId`
        )
      );
    }

    if (typeof petSideStory.id !== "string" || petSideStory.id.length === 0) {
      issues.push(
        issue(
          "error",
          "invalid_pet_side_story_id",
          "Pet side story id must be a string.",
          `petSideStories[${petSideStoryIndex}].id`
        )
      );
    }

    if (!Array.isArray(petSideStory.memoryIds)) {
      issues.push(
        issue(
          "error",
          "invalid_pet_side_story_memories",
          `Pet side story '${String(petSideStory.id)}' memoryIds must be an array.`,
          `petSideStories[${petSideStoryIndex}].memoryIds`
        )
      );
    } else {
      petSideStory.memoryIds.forEach((memoryId, memoryIndex) => {
        if (typeof memoryId !== "string" || memoryId.length === 0) {
          issues.push(
            issue(
              "error",
              "invalid_pet_side_story_memory",
              `Pet side story '${String(petSideStory.id)}' memoryIds must contain only strings.`,
              `petSideStories[${petSideStoryIndex}].memoryIds[${memoryIndex}]`
            )
          );
        }
      });
    }

    if (!Array.isArray(petSideStory.storyFlagIds)) {
      issues.push(
        issue(
          "error",
          "invalid_pet_side_story_flags",
          `Pet side story '${String(petSideStory.id)}' storyFlagIds must be an array.`,
          `petSideStories[${petSideStoryIndex}].storyFlagIds`
        )
      );
    } else {
      petSideStory.storyFlagIds.forEach((flagId, flagIndex) => {
        if (typeof flagId !== "string" || flagId.length === 0) {
          issues.push(
            issue(
              "error",
              "invalid_pet_side_story_flag",
              `Pet side story '${String(petSideStory.id)}' storyFlagIds must contain only strings.`,
              `petSideStories[${petSideStoryIndex}].storyFlagIds[${flagIndex}]`
            )
          );
        }
      });
    }

    if (!Array.isArray(petSideStory.events)) {
      issues.push(
        issue(
          "error",
          "invalid_pet_side_story_events",
          `Pet side story '${String(petSideStory.id)}' events must be an array.`,
          `petSideStories[${petSideStoryIndex}].events`
        )
      );
      return;
    }

    const sideStoryMemoryIds = new Set((Array.isArray(petSideStory.memoryIds) ? petSideStory.memoryIds : []).filter(isString));
    const sideStoryFlagIds = new Set((Array.isArray(petSideStory.storyFlagIds) ? petSideStory.storyFlagIds : []).filter(isString));

    petSideStory.events.forEach((eventValue, eventIndex) => {
      if (!isRecord(eventValue)) {
        issues.push(
          issue(
            "error",
            "invalid_pet_side_story_nested_event",
            "Pet side story event must be an object.",
            `petSideStories[${petSideStoryIndex}].events[${eventIndex}]`
          )
        );
        return;
      }

      const event = eventValue as StoryEventCandidate;
      if (typeof event.id !== "string" || event.id.length === 0) {
        issues.push(
          issue(
            "error",
            "missing_pet_side_story_nested_event",
            `Pet side story '${petSideStory.id}' includes an event without a valid id.`,
            `petSideStories[${petSideStoryIndex}].events[${eventIndex}]`
          )
        );
      }

      if (typeof eventValue.title !== "string" || eventValue.title.length === 0) {
        issues.push(
          issue(
            "error",
            "invalid_story_event_metadata",
            `Pet side story event '${String(event.id)}' title must be a non-empty string.`,
            `petSideStories[${petSideStoryIndex}].events[${eventIndex}].title`
          )
        );
      }

      if (typeof eventValue.description !== "string" || eventValue.description.length === 0) {
        issues.push(
          issue(
            "error",
            "invalid_story_event_metadata",
            `Pet side story event '${String(event.id)}' description must be a non-empty string.`,
            `petSideStories[${petSideStoryIndex}].events[${eventIndex}].description`
          )
        );
      }

      if (
        !Array.isArray(eventValue.tags) ||
        eventValue.tags.some((tag) => typeof tag !== "string" || tag.length === 0)
      ) {
        issues.push(
          issue(
            "error",
            "invalid_story_event_metadata",
            `Pet side story event '${String(event.id)}' tags must be a string array.`,
            `petSideStories[${petSideStoryIndex}].events[${eventIndex}].tags`
          )
        );
      }

      if (event.trigger !== undefined && !storyTriggers.has(event.trigger as StoryTrigger)) {
        issues.push(
          issue(
            "error",
            "unknown_story_trigger",
            `Pet side story event '${String(event.id)}' has unknown trigger '${String(event.trigger)}'.`,
            `petSideStories[${petSideStoryIndex}].events[${eventIndex}].trigger`
          )
        );
      }

      if (event.repeatable !== undefined && typeof event.repeatable !== "boolean") {
        issues.push(
          issue(
            "error",
            "invalid_story_repeatable",
            `Pet side story event '${String(event.id)}' repeatable must be a boolean when present.`,
            `petSideStories[${petSideStoryIndex}].events[${eventIndex}].repeatable`
          )
        );
      }

      if (!Array.isArray(event.requirements)) {
        issues.push(
          issue(
            "error",
            "invalid_story_requirements",
            `Pet side story event '${String(event.id)}' requirements must be an array.`,
            `petSideStories[${petSideStoryIndex}].events[${eventIndex}].requirements`
          )
        );
      }

      const eventRequirements = Array.isArray(event.requirements) ? event.requirements : [];
      eventRequirements.forEach((requirementValue, requirementIndex) => {
        if (!isRecord(requirementValue)) {
          issues.push(
            issue(
              "error",
              "invalid_story_requirement",
              "Story requirement must be an object.",
              `petSideStories[${petSideStoryIndex}].events[${eventIndex}].requirements[${requirementIndex}]`
            )
          );
          return;
        }

        const requirement = requirementValue as StoryRequirement;
        if (!storyRequirementTypes.has(requirement.type)) {
          issues.push(
            issue(
              "error",
              "unknown_story_requirement",
              `Pet side story event '${String(event.id)}' has unknown requirement '${String(requirement.type)}'.`,
              `petSideStories[${petSideStoryIndex}].events[${eventIndex}].requirements[${requirementIndex}]`
            )
          );
          return;
        }

        issues.push(...validateStoryRequirementPayload(
          requirement,
          `petSideStories[${petSideStoryIndex}].events[${eventIndex}].requirements[${requirementIndex}]`,
          event.id
        ));
      });

      if (!Array.isArray(event.outcomes)) {
        issues.push(
          issue(
            "error",
            "invalid_story_outcomes",
            `Pet side story event '${String(event.id)}' outcomes must be an array.`,
            `petSideStories[${petSideStoryIndex}].events[${eventIndex}].outcomes`
          )
        );
      }

      const eventOutcomes = Array.isArray(event.outcomes) ? event.outcomes : [];
      eventOutcomes.forEach((outcomeValue, outcomeIndex) => {
        if (!isRecord(outcomeValue)) {
          issues.push(
            issue(
              "error",
              "invalid_story_outcome",
              "Story outcome must be an object.",
              `petSideStories[${petSideStoryIndex}].events[${eventIndex}].outcomes[${outcomeIndex}]`
            )
          );
          return;
        }

        const outcome = outcomeValue as StoryOutcome;
        if (!storyOutcomeTypes.has(outcome.type)) {
          issues.push(
            issue(
              "error",
              "unknown_story_outcome",
              `Pet side story event '${String(event.id)}' has unknown outcome '${String(outcome.type)}'.`,
              `petSideStories[${petSideStoryIndex}].events[${eventIndex}].outcomes[${outcomeIndex}]`
            )
          );
          return;
        }

        issues.push(...validateStoryOutcomePayload(
          outcome,
          `petSideStories[${petSideStoryIndex}].events[${eventIndex}].outcomes[${outcomeIndex}]`,
          event.id
        ));

        if (outcome.type === "unlockPetMemory" && !sideStoryMemoryIds.has(outcome.memoryId)) {
          issues.push(
            issue(
              "error",
              "missing_pet_side_story_memory",
              `Pet side story '${String(petSideStory.id)}' unlocks undeclared memory '${outcome.memoryId}'.`,
              `petSideStories[${petSideStoryIndex}].events[${eventIndex}].outcomes[${outcomeIndex}]`
            )
          );
        }

        if (outcome.type === "setStoryFlag" && !sideStoryFlagIds.has(outcome.flagId)) {
          issues.push(
            issue(
              "error",
              "missing_pet_side_story_flag",
              `Pet side story '${String(petSideStory.id)}' sets undeclared flag '${outcome.flagId}'.`,
              `petSideStories[${petSideStoryIndex}].events[${eventIndex}].outcomes[${outcomeIndex}]`
            )
          );
        }

        if (outcome.type === "unlockPetUpgrade") {
          const upgrade = upgradesById.get(outcome.upgradeId);
          if (upgrade && upgrade.petDefinitionId !== petSideStory.petDefinitionId) {
            issues.push(
              issue(
                "error",
                "wrong_pet_story_upgrade",
                `Pet side story '${String(petSideStory.id)}' unlocks upgrade '${outcome.upgradeId}' for a different pet definition.`,
                `petSideStories[${petSideStoryIndex}].events[${eventIndex}].outcomes[${outcomeIndex}]`
              )
            );
          }
        }
      });
    });

    const actualStoryEvents = [
      ...petSideStory.events
        .filter(isRecord)
        .map((event) => typeof event.id === "string" ? topLevelStoryEventsById.get(event.id) ?? event : event),
      ...(typeof petSideStory.id === "string" && topLevelStoryEventsById.has(petSideStory.id)
        ? [topLevelStoryEventsById.get(petSideStory.id)]
        : [])
    ].filter((event): event is Record<string, unknown> => Boolean(event) && isRecord(event));

    actualStoryEvents.forEach((event, eventIndex) => {
      const eventOutcomes = Array.isArray(event.outcomes) ? event.outcomes : [];
      eventOutcomes.forEach((outcomeValue, outcomeIndex) => {
        if (!isRecord(outcomeValue)) {
          return;
        }

        const outcome = outcomeValue as StoryOutcome;
        if (outcome.type === "unlockPetMemory" && !sideStoryMemoryIds.has(outcome.memoryId)) {
          issues.push(
            issue(
              "error",
              "missing_pet_side_story_memory",
              `Pet side story '${String(petSideStory.id)}' top-level event unlocks undeclared memory '${outcome.memoryId}'.`,
              `petSideStories[${petSideStoryIndex}].actualEvents[${eventIndex}].outcomes[${outcomeIndex}]`
            )
          );
        }

        if (outcome.type === "setStoryFlag" && !sideStoryFlagIds.has(outcome.flagId)) {
          issues.push(
            issue(
              "error",
              "missing_pet_side_story_flag",
              `Pet side story '${String(petSideStory.id)}' top-level event sets undeclared flag '${outcome.flagId}'.`,
              `petSideStories[${petSideStoryIndex}].actualEvents[${eventIndex}].outcomes[${outcomeIndex}]`
            )
          );
        }

        if (outcome.type === "unlockPetUpgrade") {
          const upgrade = upgradesById.get(outcome.upgradeId);
          if (upgrade && upgrade.petDefinitionId !== petSideStory.petDefinitionId) {
            issues.push(
              issue(
                "error",
                "wrong_pet_story_upgrade",
                `Pet side story '${String(petSideStory.id)}' top-level event unlocks upgrade '${outcome.upgradeId}' for a different pet definition.`,
                `petSideStories[${petSideStoryIndex}].actualEvents[${eventIndex}].outcomes[${outcomeIndex}]`
              )
            );
          }
        }
      });
    });
  });

  const errors = issues.filter((validationIssue) => validationIssue.severity === "error");
  const warnings = issues.filter((validationIssue) => validationIssue.severity === "warning");

  return { issues, errors, warnings };
};

export const validateRunStateShape = (runState: RunState): ValidationResult => {
  const issues: ValidationIssue[] = [];

  if (!Array.isArray(runState.activePetInstanceIds)) {
    issues.push(
      issue(
        "error",
        "run_active_pets_not_array",
        "RunState.activePetInstanceIds must be an array.",
        "activePetInstanceIds"
      )
    );
  }

  const errors = issues.filter((validationIssue) => validationIssue.severity === "error");
  const warnings = issues.filter((validationIssue) => validationIssue.severity === "warning");

  return { issues, errors, warnings };
};
