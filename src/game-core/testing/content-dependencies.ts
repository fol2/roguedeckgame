import type { CardDefinition } from "../model/card";
import type { EffectDefinition } from "../model/effect";
import type { GameContentRegistry } from "../model/registry";
import type { StoryOutcome, StoryRequirement } from "../model/story";
import { burnStatusDefinition } from "../model/status";
import { buildContentIndex, type IndexedContentCollection } from "../systems/content-index";

export type ContentDependencyCollection =
  | IndexedContentCollection
  | "evolutionNodes"
  | "monsterIntents"
  | "petMemories"
  | "runMapNodes"
  | "storyFlags";

export type ContentDependencySource = {
  readonly collection: ContentDependencyCollection;
  readonly id: string;
  readonly path: string;
};

export type ContentDependencyTarget = {
  readonly collection: ContentDependencyCollection;
  readonly id: string;
  readonly path: string;
};

export type ContentDependencyReference = {
  readonly kind: string;
  readonly source: ContentDependencySource;
  readonly target: ContentDependencyTarget;
  readonly resolved: boolean;
};

export type ContentDependencyIssue = {
  readonly severity: "error" | "warning";
  readonly code: string;
  readonly message: string;
  readonly path: string;
  readonly source: ContentDependencySource;
  readonly target?: ContentDependencyTarget;
};

export type ContentDependencyCoverage = {
  readonly referenceCount: number;
  readonly missingReferenceCount: number;
  readonly orphanedIssueCount: number;
  readonly highRiskIssueCount: number;
  readonly unusedCardIds: readonly string[];
  readonly unusedStatusIds: readonly string[];
};

export type ContentDependencyReport = {
  readonly references: readonly ContentDependencyReference[];
  readonly issues: readonly ContentDependencyIssue[];
  readonly coverage: ContentDependencyCoverage;
};

type DefinitionById = ReadonlyMap<string, unknown>;

type ReferenceCollector = {
  readonly registries: ReadonlyMap<ContentDependencyCollection, DefinitionById>;
  readonly references: ContentDependencyReference[];
  readonly referencedIds: Map<ContentDependencyCollection, Set<string>>;
  readonly highRiskIssues: ContentDependencyIssue[];
};

type SideStoryDependencyScope = {
  readonly memoryIds: ReadonlySet<string>;
  readonly storyFlagIds: ReadonlySet<string>;
};

const sorted = (values: Iterable<string>): readonly string[] =>
  [...values].sort((a, b) => a.localeCompare(b));

const source = (
  collection: ContentDependencyCollection,
  id: unknown,
  path: string
): ContentDependencySource => ({
  collection,
  id: typeof id === "string" ? id : String(id),
  path
});

const buildRegistries = (registry: GameContentRegistry): ReadonlyMap<ContentDependencyCollection, DefinitionById> => {
  const index = buildContentIndex(registry);
  const evolutionNodes = new Map<string, unknown>();
  const petMemories = new Map<string, unknown>();
  const storyEvents = new Map<string, unknown>(index.storyEventsById as DefinitionById);
  const storyFlags = new Map<string, unknown>();
  registry.pets.forEach((pet) => {
    pet.evolutionTree.forEach((node) => {
      evolutionNodes.set(node.id, node);
    });
  });
  registry.petSideStories.forEach((sideStory) => {
    sideStory.memoryIds.forEach((memoryId) => petMemories.set(memoryId, sideStory));
    sideStory.storyFlagIds.forEach((flagId) => storyFlags.set(flagId, sideStory));
    sideStory.events.forEach((event) => storyEvents.set(event.id, event));
  });

  return new Map<ContentDependencyCollection, DefinitionById>([
    ["cards", index.cardsById as DefinitionById],
    ["decks", index.decksById as DefinitionById],
    ["statuses", index.statusesById as DefinitionById],
    ["pets", index.petsById as DefinitionById],
    ["players", index.playersById as DefinitionById],
    ["monsterAbilities", index.monsterAbilitiesById as DefinitionById],
    ["monsters", index.monstersById as DefinitionById],
    ["encounters", index.encountersById as DefinitionById],
    ["runMapTemplates", index.runMapTemplatesById as DefinitionById],
    ["rewardPools", index.rewardPoolsById as DefinitionById],
    ["petUpgrades", index.petUpgradesById as DefinitionById],
    ["petModifiers", index.petModifiersById as DefinitionById],
    ["playerClassModifiers", index.playerClassModifiersById as DefinitionById],
    ["storyEvents", storyEvents],
    ["petSideStories", index.petSideStoriesById as DefinitionById],
    ["evolutionNodes", evolutionNodes],
    ["monsterIntents", new Map()],
    ["petMemories", petMemories],
    ["runMapNodes", new Map()],
    ["storyFlags", storyFlags]
  ]);
};

const addReference = (
  collector: ReferenceCollector,
  kind: string,
  refSource: ContentDependencySource,
  targetCollection: ContentDependencyCollection,
  targetId: unknown,
  targetPath: string
): void => {
  if (typeof targetId !== "string" || targetId.length === 0) {
    return;
  }

  const resolved = collector.registries.get(targetCollection)?.has(targetId) ?? false;
  const target: ContentDependencyTarget = {
    collection: targetCollection,
    id: targetId,
    path: targetPath
  };

  collector.references.push({
    kind,
    source: refSource,
    target,
    resolved
  });

  if (resolved) {
    const ids = collector.referencedIds.get(targetCollection) ?? new Set<string>();
    ids.add(targetId);
    collector.referencedIds.set(targetCollection, ids);
  }
};

const addScopedReference = (
  collector: ReferenceCollector,
  kind: string,
  refSource: ContentDependencySource,
  targetCollection: ContentDependencyCollection,
  targetId: unknown,
  targetPath: string,
  scopedIds: ReadonlySet<string>
): void => {
  if (typeof targetId !== "string" || targetId.length === 0) {
    return;
  }

  const resolved = scopedIds.has(targetId);
  const target: ContentDependencyTarget = {
    collection: targetCollection,
    id: targetId,
    path: targetPath
  };

  collector.references.push({
    kind,
    source: refSource,
    target,
    resolved
  });

  if (resolved) {
    const ids = collector.referencedIds.get(targetCollection) ?? new Set<string>();
    ids.add(targetId);
    collector.referencedIds.set(targetCollection, ids);
  }
};

const warningIssue = (
  code: string,
  message: string,
  issueSource: ContentDependencySource,
  path = issueSource.path,
  target?: ContentDependencyTarget
): ContentDependencyIssue => ({
  severity: "warning",
  code,
  message,
  path,
  source: issueSource,
  target
});

const buildSideStoryScope = (sideStory: {
  readonly memoryIds: readonly string[];
  readonly storyFlagIds: readonly string[];
}): SideStoryDependencyScope => ({
  memoryIds: new Set<string>(sideStory.memoryIds),
  storyFlagIds: new Set<string>(sideStory.storyFlagIds)
});

const buildSideStoryScopeByEventId = (
  registry: GameContentRegistry
): ReadonlyMap<string, SideStoryDependencyScope> => {
  const scopes = new Map<string, SideStoryDependencyScope>();

  registry.petSideStories.forEach((sideStory) => {
    const scope = buildSideStoryScope(sideStory);
    scopes.set(sideStory.id, scope);
    sideStory.events.forEach((event) => {
      scopes.set(event.id, scope);
    });
  });

  return scopes;
};

const collectEffectReferences = (
  collector: ReferenceCollector,
  effects: readonly EffectDefinition[],
  refSource: ContentDependencySource,
  path: string
): void => {
  effects.forEach((effect, effectIndex) => {
    const effectPath = `${path}.effects[${effectIndex}]`;
    if (effect.type === "applyStatus" || effect.type === "consumeStatus") {
      addReference(collector, "effectStatus", refSource, "statuses", effect.statusId, `${effectPath}.statusId`);
    }

    if (effect.type === "cleanseStatus" && effect.statusId !== undefined) {
      addReference(collector, "effectStatus", refSource, "statuses", effect.statusId, `${effectPath}.statusId`);
    }

    if (effect.type === "createCard") {
      addReference(collector, "effectCreateCard", refSource, "cards", effect.cardId, `${effectPath}.cardId`);
    }

    if (effect.type === "setStoryFlag") {
      addReference(collector, "effectStoryFlag", refSource, "storyFlags", effect.flagId, `${effectPath}.flagId`);
    }
  });
};

const collectStatusReferences = (collector: ReferenceCollector, registry: GameContentRegistry): void => {
  (registry.statuses ?? [burnStatusDefinition]).forEach((status, statusIndex) => {
    const refSource = source("statuses", status.id, `statuses[${statusIndex}]`);
    if (status.behaviour?.type === "statusImmunity") {
      (status.behaviour.blocksStatusIds ?? []).forEach((blockedStatusId, blockedIndex) => {
        addReference(collector, "statusImmunityBlockedStatus", refSource, "statuses", blockedStatusId, `statuses[${statusIndex}].behaviour.blocksStatusIds[${blockedIndex}]`);
      });
    }
  });
};

const collectStoryRequirementReferences = (
  collector: ReferenceCollector,
  requirement: StoryRequirement,
  refSource: ContentDependencySource,
  path: string,
  scope?: SideStoryDependencyScope
): void => {
  if (requirement.type === "hasSeenEvent") {
    addReference(collector, "storyRequirementEvent", refSource, "storyEvents", requirement.eventId, `${path}.eventId`);
  }

  if (requirement.type === "hasPetMemory") {
    if (scope?.memoryIds) {
      addScopedReference(collector, "storyRequirementMemory", refSource, "petMemories", requirement.memoryId, `${path}.memoryId`, scope.memoryIds);
    } else {
      addReference(collector, "storyRequirementMemory", refSource, "petMemories", requirement.memoryId, `${path}.memoryId`);
    }
  }

  if (requirement.type === "playerClassIs") {
    addReference(collector, "storyRequirementPlayerClass", refSource, "players", requirement.playerClassId, `${path}.playerClassId`);
  }

  if (requirement.type === "hasPetStoryFlag" || requirement.type === "lacksPetStoryFlag") {
    if (scope?.storyFlagIds) {
      addScopedReference(collector, "storyRequirementFlag", refSource, "storyFlags", requirement.flagId, `${path}.flagId`, scope.storyFlagIds);
    } else {
      addReference(collector, "storyRequirementFlag", refSource, "storyFlags", requirement.flagId, `${path}.flagId`);
    }
  }
};

const collectStoryOutcomeReferences = (
  collector: ReferenceCollector,
  outcome: StoryOutcome,
  refSource: ContentDependencySource,
  path: string,
  scope?: SideStoryDependencyScope
): void => {
  if (outcome.type === "unlockPetUpgrade") {
    addReference(collector, "storyOutcomeUpgrade", refSource, "petUpgrades", outcome.upgradeId, `${path}.upgradeId`);
  }

  if (outcome.type === "setStoryFlag") {
    if (scope?.storyFlagIds) {
      addScopedReference(collector, "storyOutcomeFlag", refSource, "storyFlags", outcome.flagId, `${path}.flagId`, scope.storyFlagIds);
    } else {
      addReference(collector, "storyOutcomeFlag", refSource, "storyFlags", outcome.flagId, `${path}.flagId`);
    }
  }

  if (outcome.type === "unlockPetMemory") {
    if (scope?.memoryIds) {
      addScopedReference(collector, "storyOutcomeMemory", refSource, "petMemories", outcome.memoryId, `${path}.memoryId`, scope.memoryIds);
    } else {
      addReference(collector, "storyOutcomeMemory", refSource, "petMemories", outcome.memoryId, `${path}.memoryId`);
    }
  }

  if (outcome.type === "unlockEvolutionNode") {
    addReference(collector, "storyOutcomeEvolutionNode", refSource, "evolutionNodes", outcome.evolutionNodeId, `${path}.evolutionNodeId`);
  }

  if (outcome.type === "markStoryEventSeen") {
    addReference(collector, "storyOutcomeEvent", refSource, "storyEvents", outcome.eventId, `${path}.eventId`);
  }
};

const collectCardReferences = (collector: ReferenceCollector, registry: GameContentRegistry): void => {
  registry.cards.forEach((card, cardIndex) => {
    const refSource = source("cards", card.id, `cards[${cardIndex}]`);
    if (card.requiresPetDefinitionId !== undefined) {
      addReference(collector, "cardRequiredPet", refSource, "pets", card.requiresPetDefinitionId, `cards[${cardIndex}].requiresPetDefinitionId`);
    }
    collectEffectReferences(collector, card.effects, refSource, `cards[${cardIndex}]`);
  });
};

const collectPlayerReferences = (collector: ReferenceCollector, registry: GameContentRegistry): void => {
  registry.players.forEach((player, playerIndex) => {
    const refSource = source("players", player.id, `players[${playerIndex}]`);
    if (player.startingDeckId !== undefined) {
      addReference(collector, "playerStartingDeck", refSource, "decks", player.startingDeckId, `players[${playerIndex}].startingDeckId`);
    }
    player.startingDeckCardIds.forEach((cardId, cardIndex) => {
      addReference(collector, "playerStartingDeckCard", refSource, "cards", cardId, `players[${playerIndex}].startingDeckCardIds[${cardIndex}]`);
    });
    (player.classModifierIds ?? []).forEach((modifierId, modifierIndex) => {
      addReference(collector, "playerClassModifier", refSource, "playerClassModifiers", modifierId, `players[${playerIndex}].classModifierIds[${modifierIndex}]`);
    });
  });
};

const collectDeckReferences = (collector: ReferenceCollector, registry: GameContentRegistry): void => {
  (registry.decks ?? []).forEach((deck, deckIndex) => {
    const refSource = source("decks", deck.id, `decks[${deckIndex}]`);
    addReference(collector, "deckOwnerPlayerClass", refSource, "players", deck.ownerPlayerClassId, `decks[${deckIndex}].ownerPlayerClassId`);
    deck.cardIds.forEach((cardId, cardIndex) => {
      addReference(collector, "deckCard", refSource, "cards", cardId, `decks[${deckIndex}].cardIds[${cardIndex}]`);
    });
  });
};

const collectPetReferences = (collector: ReferenceCollector, registry: GameContentRegistry): void => {
  registry.pets.forEach((pet, petIndex) => {
    const refSource = source("pets", pet.id, `pets[${petIndex}]`);
    pet.baseCommandCardIds.forEach((cardId, cardIndex) => {
      addReference(collector, "petBaseCommand", refSource, "cards", cardId, `pets[${petIndex}].baseCommandCardIds[${cardIndex}]`);
    });
    if (pet.sideStoryId !== undefined) {
      addReference(collector, "petSideStory", refSource, "petSideStories", pet.sideStoryId, `pets[${petIndex}].sideStoryId`);
    }
    pet.evolutionTree.forEach((node, nodeIndex) => {
      const nodeSource = source("evolutionNodes", node.id, `pets[${petIndex}].evolutionTree[${nodeIndex}]`);
      node.requirements.forEach((requirement, requirementIndex) => {
        collectStoryRequirementReferences(collector, requirement, nodeSource, `pets[${petIndex}].evolutionTree[${nodeIndex}].requirements[${requirementIndex}]`);
      });
      node.unlocks.forEach((unlock, unlockIndex) => {
        addReference(collector, "evolutionUnlockCard", nodeSource, "cards", unlock.cardId, `pets[${petIndex}].evolutionTree[${nodeIndex}].unlocks[${unlockIndex}].cardId`);
        if (unlock.requirement) {
          collectStoryRequirementReferences(collector, unlock.requirement, nodeSource, `pets[${petIndex}].evolutionTree[${nodeIndex}].unlocks[${unlockIndex}].requirement`);
        }
      });
    });
  });
};

const collectMonsterReferences = (collector: ReferenceCollector, registry: GameContentRegistry): void => {
  (registry.monsterAbilities ?? []).forEach((ability, abilityIndex) => {
    const refSource = source("monsterAbilities", ability.id, `monsterAbilities[${abilityIndex}]`);
    collectEffectReferences(collector, ability.effects, refSource, `monsterAbilities[${abilityIndex}]`);
  });

  registry.monsters.forEach((monster, monsterIndex) => {
    const refSource = source("monsters", monster.id, `monsters[${monsterIndex}]`);
    (monster.abilityIds ?? []).forEach((abilityId, abilityIndex) => {
      addReference(collector, "monsterAbility", refSource, "monsterAbilities", abilityId, `monsters[${monsterIndex}].abilityIds[${abilityIndex}]`);
    });
    monster.intentPool.forEach((intent, intentIndex) => {
      if (intent.abilityId !== undefined) {
        addReference(collector, "monsterIntentAbility", refSource, "monsterAbilities", intent.abilityId, `monsters[${monsterIndex}].intentPool[${intentIndex}].abilityId`);
      }
      collectEffectReferences(collector, intent.effects, refSource, `monsters[${monsterIndex}].intentPool[${intentIndex}]`);
    });
    const intentIds = new Set(monster.intentPool.map((intent) => intent.id));
    (monster.intentSchedule ?? []).forEach((step, stepIndex) => {
      addScopedReference(
        collector,
        "monsterScheduledIntent",
        refSource,
        "monsterIntents",
        step.intentId,
        `monsters[${monsterIndex}].intentSchedule[${stepIndex}].intentId`,
        intentIds
      );
    });
  });
};

const collectEncounterReferences = (collector: ReferenceCollector, registry: GameContentRegistry): void => {
  registry.encounters.forEach((encounter, encounterIndex) => {
    const refSource = source("encounters", encounter.id, `encounters[${encounterIndex}]`);
    encounter.monsterIds.forEach((monsterId, monsterIndex) => {
      addReference(collector, "encounterMonster", refSource, "monsters", monsterId, `encounters[${encounterIndex}].monsterIds[${monsterIndex}]`);
    });
    if (encounter.authoring?.rewardPoolId !== undefined) {
      addReference(collector, "encounterRewardPool", refSource, "rewardPools", encounter.authoring.rewardPoolId, `encounters[${encounterIndex}].authoring.rewardPoolId`);
    }
    const monsterGroups: readonly { readonly monsterIds?: unknown }[] =
      encounter.authoring && Array.isArray(encounter.authoring.monsterGroups)
        ? encounter.authoring.monsterGroups
        : [];
    monsterGroups.forEach((monsterGroup, groupIndex) => {
      const monsterIds: readonly unknown[] = Array.isArray(monsterGroup.monsterIds)
        ? monsterGroup.monsterIds
        : [];
      monsterIds.forEach((monsterId, monsterIndex) => {
        addReference(
          collector,
          "encounterMonsterGroupMonster",
          refSource,
          "monsters",
          monsterId,
          `encounters[${encounterIndex}].authoring.monsterGroups[${groupIndex}].monsterIds[${monsterIndex}]`
        );
      });
    });
  });
};

const collectRunMapReferences = (collector: ReferenceCollector, registry: GameContentRegistry): void => {
  registry.runMapTemplates.forEach((template, templateIndex) => {
    const refSource = source("runMapTemplates", template.id, `runMapTemplates[${templateIndex}]`);
    const nodeIds = new Set(template.nodes.map((node) => node.id));
    template.nodes.forEach((node, nodeIndex) => {
      (node.encounterIds ?? []).forEach((encounterId, encounterIndex) => {
        addReference(collector, "runNodeEncounter", refSource, "encounters", encounterId, `runMapTemplates[${templateIndex}].nodes[${nodeIndex}].encounterIds[${encounterIndex}]`);
      });
      node.nextNodeIds.forEach((nextNodeId, nextNodeIndex) => {
        addScopedReference(
          collector,
          "runNodeConnection",
          refSource,
          "runMapNodes",
          nextNodeId,
          `runMapTemplates[${templateIndex}].nodes[${nodeIndex}].nextNodeIds[${nextNodeIndex}]`,
          nodeIds
        );
      });
    });
  });
};

const collectModifierRuleReferences = (
  collector: ReferenceCollector,
  refSource: ContentDependencySource,
  rule: { readonly type: string; readonly [key: string]: unknown },
  path: string
): void => {
  if (
    "selector" in rule &&
    typeof rule.selector === "object" &&
    rule.selector !== null &&
    !Array.isArray(rule.selector) &&
    "requiresPetDefinitionId" in rule.selector
  ) {
    addReference(collector, "modifierSelectorPet", refSource, "pets", rule.selector.requiresPetDefinitionId, `${path}.selector.requiresPetDefinitionId`);
  }

  if ("statusId" in rule) {
    addReference(collector, "modifierStatus", refSource, "statuses", rule.statusId, `${path}.statusId`);
  }

  if ("requiredStatusId" in rule) {
    addReference(collector, "modifierRequiredStatus", refSource, "statuses", rule.requiredStatusId, `${path}.requiredStatusId`);
  }

  if (Array.isArray(rule.effects)) {
    collectEffectReferences(collector, rule.effects as readonly EffectDefinition[], refSource, path);
  }
};

const collectPetUpgradeReferences = (collector: ReferenceCollector, registry: GameContentRegistry): void => {
  registry.petUpgrades.forEach((upgrade, upgradeIndex) => {
    const refSource = source("petUpgrades", upgrade.id, `petUpgrades[${upgradeIndex}]`);
    addReference(collector, "petUpgradePet", refSource, "pets", upgrade.petDefinitionId, `petUpgrades[${upgradeIndex}].petDefinitionId`);
    upgrade.modifiers.forEach((modifier, modifierIndex) => {
      const modifierSource = source("petModifiers", modifier.id, `petUpgrades[${upgradeIndex}].modifiers[${modifierIndex}]`);
      modifier.rules.forEach((rule, ruleIndex) => {
        collectModifierRuleReferences(collector, modifierSource, rule, `petUpgrades[${upgradeIndex}].modifiers[${modifierIndex}].rules[${ruleIndex}]`);
      });
    });
    (upgrade.unlocks ?? []).forEach((unlock, unlockIndex) => {
      addReference(collector, "petUpgradeUnlockCard", refSource, "cards", unlock.cardId, `petUpgrades[${upgradeIndex}].unlocks[${unlockIndex}].cardId`);
      if (unlock.requirement) {
        collectStoryRequirementReferences(collector, unlock.requirement, refSource, `petUpgrades[${upgradeIndex}].unlocks[${unlockIndex}].requirement`);
      }
    });
    (upgrade.storyFlagUnlocks ?? []).forEach((flagId, flagIndex) => {
      addReference(collector, "petUpgradeStoryFlag", refSource, "storyFlags", flagId, `petUpgrades[${upgradeIndex}].storyFlagUnlocks[${flagIndex}]`);
    });
  });

  (registry.petModifiers ?? []).forEach((modifier, modifierIndex) => {
    const refSource = source("petModifiers", modifier.id, `petModifiers[${modifierIndex}]`);
    modifier.rules.forEach((rule, ruleIndex) => {
      collectModifierRuleReferences(collector, refSource, rule, `petModifiers[${modifierIndex}].rules[${ruleIndex}]`);
    });
  });
};

const collectPlayerClassModifierReferences = (collector: ReferenceCollector, registry: GameContentRegistry): void => {
  (registry.playerClassModifiers ?? []).forEach((modifier, modifierIndex) => {
    const refSource = source("playerClassModifiers", modifier.id, `playerClassModifiers[${modifierIndex}]`);
    (modifier.rules ?? []).forEach((rule, ruleIndex) => {
      collectModifierRuleReferences(collector, refSource, rule, `playerClassModifiers[${modifierIndex}].rules[${ruleIndex}]`);
    });
  });
};

const collectStoryReferences = (collector: ReferenceCollector, registry: GameContentRegistry): void => {
  const sideStoryScopeByEventId = buildSideStoryScopeByEventId(registry);
  registry.storyEvents.forEach((storyEvent, storyIndex) => {
    const refSource = source("storyEvents", storyEvent.id, `storyEvents[${storyIndex}]`);
    const sideStoryScope = sideStoryScopeByEventId.get(storyEvent.id);
    storyEvent.requirements.forEach((requirement, requirementIndex) => {
      collectStoryRequirementReferences(collector, requirement, refSource, `storyEvents[${storyIndex}].requirements[${requirementIndex}]`, sideStoryScope);
    });
    storyEvent.outcomes.forEach((outcome, outcomeIndex) => {
      collectStoryOutcomeReferences(collector, outcome, refSource, `storyEvents[${storyIndex}].outcomes[${outcomeIndex}]`, sideStoryScope);
    });
  });

  registry.petSideStories.forEach((sideStory, sideStoryIndex) => {
    const refSource = source("petSideStories", sideStory.id, `petSideStories[${sideStoryIndex}]`);
    const sideStoryScope = buildSideStoryScope(sideStory);
    addReference(collector, "petSideStoryPet", refSource, "pets", sideStory.petDefinitionId, `petSideStories[${sideStoryIndex}].petDefinitionId`);
    sideStory.events.forEach((storyEvent, eventIndex) => {
      const eventSource = source("storyEvents", storyEvent.id, `petSideStories[${sideStoryIndex}].events[${eventIndex}]`);
      storyEvent.requirements.forEach((requirement, requirementIndex) => {
        collectStoryRequirementReferences(collector, requirement, eventSource, `petSideStories[${sideStoryIndex}].events[${eventIndex}].requirements[${requirementIndex}]`, sideStoryScope);
      });
      storyEvent.outcomes.forEach((outcome, outcomeIndex) => {
        collectStoryOutcomeReferences(collector, outcome, eventSource, `petSideStories[${sideStoryIndex}].events[${eventIndex}].outcomes[${outcomeIndex}]`, sideStoryScope);
      });
    });
  });
};

const missingReferenceIssue = (reference: ContentDependencyReference): ContentDependencyIssue => ({
  severity: "error",
  code: "missing_dependency",
  message: `${reference.source.collection} '${reference.source.id}' references missing ${reference.target.collection} '${reference.target.id}'.`,
  path: reference.target.path,
  source: reference.source,
  target: reference.target
});

const unusedIssue = (
  collection: "cards" | "statuses",
  definition: CardDefinition | { readonly id: string },
  path: string
): ContentDependencyIssue => ({
  severity: "warning",
  code: "unused_content",
  message: `${collection} '${definition.id}' is not referenced by current authored content.`,
  path,
  source: source(collection, definition.id, path)
});

const isRewardReachableCard = (card: CardDefinition, registry: GameContentRegistry): boolean => {
  if (card.source === "legacy") {
    return true;
  }

  if (card.rarity === "starter" || card.rarity === "special") {
    return false;
  }

  if (card.tags.includes("unrewardable")) {
    return false;
  }

  if (!card.requiresPetDefinitionId) {
    return true;
  }

  return registry.pets.some((pet) => pet.id === card.requiresPetDefinitionId);
};

const collectUnusedIssues = (
  registry: GameContentRegistry,
  referencedIds: ReadonlyMap<ContentDependencyCollection, Set<string>>
): readonly ContentDependencyIssue[] => {
  const issues: ContentDependencyIssue[] = [];
  const referencedCards = referencedIds.get("cards") ?? new Set<string>();
  const referencedStatuses = referencedIds.get("statuses") ?? new Set<string>();

  registry.cards.forEach((card, cardIndex) => {
    if (!referencedCards.has(card.id) && !isRewardReachableCard(card, registry)) {
      issues.push(unusedIssue("cards", card, `cards[${cardIndex}]`));
    }
  });

  (registry.statuses ?? [burnStatusDefinition]).forEach((status, statusIndex) => {
    if (!referencedStatuses.has(status.id)) {
      issues.push(unusedIssue("statuses", status, `statuses[${statusIndex}]`));
    }
  });

  return issues;
};

const collectOrphanedIssues = (
  registry: GameContentRegistry,
  referencedIds: ReadonlyMap<ContentDependencyCollection, Set<string>>
): readonly ContentDependencyIssue[] => {
  const issues: ContentDependencyIssue[] = [];
  const referencedFlags = referencedIds.get("storyFlags") ?? new Set<string>();
  const referencedMemories = referencedIds.get("petMemories") ?? new Set<string>();

  registry.petSideStories.forEach((sideStory, sideStoryIndex) => {
    sideStory.storyFlagIds.forEach((flagId, flagIndex) => {
      if (!referencedFlags.has(flagId)) {
        const issueSource = source("storyFlags", flagId, `petSideStories[${sideStoryIndex}].storyFlagIds[${flagIndex}]`);
        issues.push(warningIssue(
          "orphaned_content",
          `Story flag '${flagId}' is declared but not referenced by current authored content.`,
          issueSource
        ));
      }
    });

    sideStory.memoryIds.forEach((memoryId, memoryIndex) => {
      if (!referencedMemories.has(memoryId)) {
        const issueSource = source("petMemories", memoryId, `petSideStories[${sideStoryIndex}].memoryIds[${memoryIndex}]`);
        issues.push(warningIssue(
          "orphaned_content",
          `Pet memory '${memoryId}' is declared but not referenced by current authored content.`,
          issueSource
        ));
      }
    });
  });

  return issues;
};

const collectHighRiskIssues = (registry: GameContentRegistry): readonly ContentDependencyIssue[] => {
  const issues: ContentDependencyIssue[] = [];

  registry.monsters.forEach((monster, monsterIndex) => {
    monster.intentPool.forEach((intent, intentIndex) => {
      if (intent.abilityId === undefined) {
        const issueSource = source("monsters", monster.id, `monsters[${monsterIndex}].intentPool[${intentIndex}]`);
        issues.push(warningIssue(
          "high_risk_dependency",
          `Monster intent '${intent.id}' uses direct effects without a registered monster ability.`,
          issueSource,
          `monsters[${monsterIndex}].intentPool[${intentIndex}].abilityId`
        ));
      }
    });
  });

  return issues;
};

const sortReferences = (
  references: readonly ContentDependencyReference[]
): readonly ContentDependencyReference[] =>
  [...references].sort((left, right) =>
    `${left.source.path}|${left.kind}|${left.target.collection}|${left.target.id}`.localeCompare(
      `${right.source.path}|${right.kind}|${right.target.collection}|${right.target.id}`
    )
  );

const sortIssues = (issues: readonly ContentDependencyIssue[]): readonly ContentDependencyIssue[] =>
  [...issues].sort((left, right) =>
    `${left.severity}|${left.code}|${left.path}|${left.message}`.localeCompare(
      `${right.severity}|${right.code}|${right.path}|${right.message}`
    )
  );

export const buildContentDependencyReport = (registry: GameContentRegistry): ContentDependencyReport => {
  const collector: ReferenceCollector = {
    registries: buildRegistries(registry),
    references: [],
    referencedIds: new Map(),
    highRiskIssues: []
  };

  collectStatusReferences(collector, registry);
  collectCardReferences(collector, registry);
  collectDeckReferences(collector, registry);
  collectPlayerReferences(collector, registry);
  collectPetReferences(collector, registry);
  collectMonsterReferences(collector, registry);
  collectEncounterReferences(collector, registry);
  collectRunMapReferences(collector, registry);
  collectPetUpgradeReferences(collector, registry);
  collectPlayerClassModifierReferences(collector, registry);
  collectStoryReferences(collector, registry);

  const references = sortReferences(collector.references);
  const issues = sortIssues([
    ...references.filter((reference) => !reference.resolved).map(missingReferenceIssue),
    ...collectUnusedIssues(registry, collector.referencedIds),
    ...collectOrphanedIssues(registry, collector.referencedIds),
    ...collectHighRiskIssues(registry)
  ]);
  const unusedCardIds = sorted(
    issues
      .filter((issue) => issue.code === "unused_content" && issue.source.collection === "cards")
      .map((issue) => issue.source.id)
  );
  const unusedStatusIds = sorted(
    issues
      .filter((issue) => issue.code === "unused_content" && issue.source.collection === "statuses")
      .map((issue) => issue.source.id)
  );

  return {
    references,
    issues,
    coverage: {
      referenceCount: references.length,
      missingReferenceCount: references.filter((reference) => !reference.resolved).length,
      orphanedIssueCount: issues.filter((issue) => issue.code === "orphaned_content").length,
      highRiskIssueCount: issues.filter((issue) => issue.code === "high_risk_dependency").length,
      unusedCardIds,
      unusedStatusIds
    }
  };
};

export const formatContentDependencyIssue = (issue: ContentDependencyIssue): string => {
  const target = issue.target
    ? ` target=${issue.target.collection}:${issue.target.id}`
    : "";

  return `${issue.severity.toUpperCase()} ${issue.code} path=${issue.path} source=${issue.source.collection}:${issue.source.id}${target} message=${issue.message}`;
};
