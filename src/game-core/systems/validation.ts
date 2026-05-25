import type { EffectDefinition } from "../model/effect";
import { knownEffectTypes } from "../model/effect";
import type { CardType } from "../model/card";
import type { EncounterType } from "../model/encounter";
import type { PetModifierRule } from "../model/pet";
import type { GameContentRegistry } from "../model/registry";
import type { RunState } from "../model/run";
import type { RunNodeType } from "../model/run-map";
import { burnStatusDefinition } from "../model/status";
import { knownPetModifierRuleTypeValues } from "./pet-modifiers";

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

const findDuplicateIds = (
  collectionName: string,
  collection: unknown
): ValidationIssue[] => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  if (!Array.isArray(collection)) {
    return [];
  }

  for (const item of collection) {
    if (!isRecord(item) || typeof item.id !== "string") {
      continue;
    }

    if (seen.has(item.id)) {
      duplicates.add(item.id);
    }
    seen.add(item.id);
  }

  return [...duplicates].map((id) =>
    issue("error", "duplicate_id", `Duplicate id '${id}' in ${collectionName}.`, collectionName)
  );
};

const validateEffects = (
  effects: readonly EffectDefinition[],
  path: string
): ValidationIssue[] => {
  return effects.flatMap((effectDefinition, index) => {
    if (typeof effectDefinition !== "object" || effectDefinition === null) {
      return [
        issue(
          "error",
          "invalid_effect_definition",
          "Effect definition must be an object.",
          `${path}.effects[${index}]`
        )
      ];
    }

    if (knownEffectTypes.includes(effectDefinition.type)) {
      return [];
    }

    return [
      issue(
        "error",
        "unknown_effect_type",
        `Unknown effect type '${String(effectDefinition.type)}'.`,
        `${path}.effects[${index}]`
      )
    ];
  });
};

const validatePetModifierRule = (
  petDefinitionIds: ReadonlySet<string>,
  rule: PetModifierRule,
  path: string
): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const knownCardTypes = ["attack", "skill", "power", "pet-command"] as const satisfies readonly CardType[];

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
        !knownCardTypes.includes(rule.selector.cardType as CardType)
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
    if ("statusId" in rule && rule.statusId !== burnStatusDefinition.id) {
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
    if (rule.requiredStatusId !== burnStatusDefinition.id) {
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
      issues.push(...validateEffects(rule.effects, path));

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

        if (effectDefinition.type !== "draw") {
          issues.push(
            issue(
              "error",
              "invalid_pet_modifier_rule",
              "Pet trigger modifiers only support draw effects in this ticket.",
              `${path}.effects[${effectIndex}]`
            )
          );
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

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
  const issues: ValidationIssue[] = [
    ...findDuplicateIds("cards", registry.cards),
    ...findDuplicateIds("pets", registry.pets),
    ...findDuplicateIds("players", registry.players),
    ...findDuplicateIds("monsters", registry.monsters),
    ...findDuplicateIds("encounters", registry.encounters),
    ...findDuplicateIds("runMapTemplates", registry.runMapTemplates),
    ...findDuplicateIds("petUpgrades", registry.petUpgrades),
    ...findDuplicateIds("storyEvents", registry.storyEvents),
    ...findDuplicateIds("petSideStories", registry.petSideStories)
  ];

  const cardIds = new Set(registry.cards.map((card) => card.id));
  const monsterIds = new Set(registry.monsters.map((monster) => String(monster.id)));
  const petDefinitionIds = new Set(registry.pets.map((pet) => pet.id));
  const playerClassIds = new Set(registry.players.map((player) => player.id));
  const storyEventIds = new Set(registry.storyEvents.map((storyEvent) => storyEvent.id));
  const upgradeIds = new Set(registry.petUpgrades.map((upgrade) => upgrade.id));
  const evolutionNodeIds = new Set(
    registry.pets.flatMap((pet) => pet.evolutionTree.map((evolutionNode) => evolutionNode.id))
  );

  registry.players.forEach((player, playerIndex) => {
    player.startingDeckCardIds.forEach((cardId, cardIndex) => {
      if (!cardIds.has(cardId)) {
        issues.push(
          issue(
            "error",
            "missing_starting_deck_card",
            `Player '${player.id}' references missing starting card '${cardId}'.`,
            `players[${playerIndex}].startingDeckCardIds[${cardIndex}]`
          )
        );
      }
    });

    if (player.maxActivePets > player.petSlotCount) {
      issues.push(
        issue(
          "error",
          "invalid_pet_slot_capacity",
          `Player '${player.id}' allows more active pets than pet slots.`,
          `players[${playerIndex}]`
        )
      );
    }
  });

  registry.pets.forEach((pet, petIndex) => {
    pet.baseCommandCardIds.forEach((cardId, cardIndex) => {
      if (!cardIds.has(cardId)) {
        issues.push(
          issue(
            "error",
            "missing_pet_command_card",
            `Pet '${pet.id}' references missing command card '${cardId}'.`,
            `pets[${petIndex}].baseCommandCardIds[${cardIndex}]`
          )
        );
      }
    });

    if (pet.sideStoryId && !storyEventIds.has(pet.sideStoryId)) {
      issues.push(
        issue(
          "error",
          "missing_pet_side_story",
          `Pet '${pet.id}' references missing side story '${pet.sideStoryId}'.`,
          `pets[${petIndex}].sideStoryId`
        )
      );
    }
  });

  registry.cards.forEach((card, cardIndex) => {
    if (card.requiresPetDefinitionId && !petDefinitionIds.has(card.requiresPetDefinitionId)) {
      issues.push(
        issue(
          "error",
          "missing_required_pet_definition",
          `Card '${card.id}' references missing pet definition '${card.requiresPetDefinitionId}'.`,
          `cards[${cardIndex}].requiresPetDefinitionId`
        )
      );
    }

    issues.push(...validateEffects(card.effects, `cards[${cardIndex}]`));
  });

  registry.monsters.forEach((monster, monsterIndex) => {
    monster.intentPool.forEach((intent, intentIndex) => {
      issues.push(...validateEffects(intent.effects, `monsters[${monsterIndex}].intentPool[${intentIndex}]`));
    });
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
  registry.petUpgrades.forEach((upgrade, upgradeIndex) => {
    if (!petDefinitionIds.has(upgrade.petDefinitionId)) {
      issues.push(
        issue(
          "error",
          "missing_upgrade_pet_definition",
          `Upgrade '${upgrade.id}' references missing pet definition '${upgrade.petDefinitionId}'.`,
          `petUpgrades[${upgradeIndex}].petDefinitionId`
        )
      );
    }
    upgrade.modifiers.forEach((modifier, modifierIndex) => {
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
        modifier.rules.forEach((rule, ruleIndex) => {
          issues.push(...validatePetModifierRule(
            petDefinitionIds,
            rule,
            `petUpgrades[${upgradeIndex}].modifiers[${modifierIndex}].rules[${ruleIndex}]`
          ));
        });
      }
    });
  });

  const standalonePetModifierIds = new Set<string>();
  registry.petModifiers?.forEach((modifier, modifierIndex) => {
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
      modifier.rules.forEach((rule, ruleIndex) => {
      issues.push(...validatePetModifierRule(petDefinitionIds, rule, `petModifiers[${modifierIndex}].rules[${ruleIndex}]`));
      });
    }
  });

  registry.storyEvents.forEach((storyEvent, storyIndex) => {
    storyEvent.requirements.forEach((requirement, requirementIndex) => {
      if (requirement.type === "playerClassIs" && !playerClassIds.has(requirement.playerClassId)) {
        issues.push(
          issue(
            "error",
            "missing_story_player_class",
            `Story event '${storyEvent.id}' references missing player class '${requirement.playerClassId}'.`,
            `storyEvents[${storyIndex}].requirements[${requirementIndex}]`
          )
        );
      }

      if (requirement.type === "hasSeenEvent" && !storyEventIds.has(requirement.eventId)) {
        issues.push(
          issue(
            "error",
            "missing_story_event_requirement",
            `Story event '${storyEvent.id}' references missing seen event '${requirement.eventId}'.`,
            `storyEvents[${storyIndex}].requirements[${requirementIndex}]`
          )
        );
      }
    });

    storyEvent.outcomes.forEach((outcome, outcomeIndex) => {
      if (outcome.type === "unlockPetUpgrade" && !upgradeIds.has(outcome.upgradeId)) {
        issues.push(
          issue(
            "error",
            "missing_story_upgrade",
            `Story event '${storyEvent.id}' references missing upgrade '${outcome.upgradeId}'.`,
            `storyEvents[${storyIndex}].outcomes[${outcomeIndex}]`
          )
        );
      }

      if (outcome.type === "unlockEvolutionNode" && !evolutionNodeIds.has(outcome.evolutionNodeId)) {
        issues.push(
          issue(
            "error",
            "missing_story_evolution_node",
            `Story event '${storyEvent.id}' references missing evolution node '${outcome.evolutionNodeId}'.`,
            `storyEvents[${storyIndex}].outcomes[${outcomeIndex}]`
          )
        );
      }
    });
  });

  registry.petSideStories.forEach((petSideStory, petSideStoryIndex) => {
    if (!petDefinitionIds.has(petSideStory.petDefinitionId)) {
      issues.push(
        issue(
          "error",
          "missing_pet_side_story_pet",
          `Pet side story '${petSideStory.id}' references missing pet definition '${petSideStory.petDefinitionId}'.`,
          `petSideStories[${petSideStoryIndex}].petDefinitionId`
        )
      );
    }

    if (!storyEventIds.has(petSideStory.id)) {
      issues.push(
        issue(
          "error",
          "missing_pet_side_story_event",
          `Pet side story '${petSideStory.id}' has no matching story event.`,
          `petSideStories[${petSideStoryIndex}].id`
        )
      );
    }

    petSideStory.events.forEach((event, eventIndex) => {
      if (!storyEventIds.has(event.id)) {
        issues.push(
          issue(
            "error",
            "missing_pet_side_story_nested_event",
            `Pet side story '${petSideStory.id}' includes event '${event.id}' outside the story registry.`,
            `petSideStories[${petSideStoryIndex}].events[${eventIndex}]`
          )
        );
      }
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
