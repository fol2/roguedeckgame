import type { EffectDefinition } from "../model/effect";
import { knownEffectTypes } from "../model/effect";
import type { GameContentRegistry } from "../model/registry";
import type { RunState } from "../model/run";

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
