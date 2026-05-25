import type { EffectDefinition } from "../model/effect";
import { knownEffectTypes } from "../model/effect";
import type { CardType } from "../model/card";
import type { PetModifierRule } from "../model/pet";
import type { GameContentRegistry } from "../model/registry";
import type { RunState } from "../model/run";
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

const findDuplicateIds = <T extends { readonly id: string }>(
  collectionName: string,
  collection: readonly T[]
): ValidationIssue[] => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const item of collection) {
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

export const validateRegistry = (registry: GameContentRegistry): ValidationResult => {
  const issues: ValidationIssue[] = [
    ...findDuplicateIds("cards", registry.cards),
    ...findDuplicateIds("pets", registry.pets),
    ...findDuplicateIds("players", registry.players),
    ...findDuplicateIds("monsters", registry.monsters),
    ...findDuplicateIds("petUpgrades", registry.petUpgrades),
    ...findDuplicateIds("storyEvents", registry.storyEvents),
    ...findDuplicateIds("petSideStories", registry.petSideStories)
  ];

  const cardIds = new Set(registry.cards.map((card) => card.id));
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
