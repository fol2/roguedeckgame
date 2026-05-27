import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  cardId,
  starterRegistry
} from "../../src/game-core";
import { buildContentWorkbenchViewModel } from "../../src/game-core/workbench";

describe("content workbench view model", () => {
  it("builds deterministic read-only sections for starter content", () => {
    const first = buildContentWorkbenchViewModel(starterRegistry);
    const second = buildContentWorkbenchViewModel(starterRegistry);

    expect(first).toEqual(second);
    expect(first.contentVersion).toBe("starter-act1-forest-v1");
    expect(first.schema.collectionCount).toBe(14);
    expect(Object.keys(first.sections).sort()).toEqual(
      first.schema.collections.map((collection) => collection.id).sort()
    );
    expect(first.schema.collections.find((collection) => collection.id === "cards")).toMatchObject({
      count: 12,
      required: true
    });
    expect(first.schema.collections.find((collection) => collection.id === "rewardPools")).toMatchObject({
      count: 3,
      required: false
    });
    expect(first.schema.collections.find((collection) => collection.id === "petUpgrades")).toMatchObject({
      count: 3,
      required: true
    });
    expect(first.schema.collections.find((collection) => collection.id === "petModifiers")).toMatchObject({
      count: 3,
      required: false
    });
    expect(first.schema.collections.find((collection) => collection.id === "playerClassModifiers")).toMatchObject({
      count: 0,
      required: false
    });
    expect(first.schema.collections.find((collection) => collection.id === "storyEvents")).toMatchObject({
      count: 1,
      required: true
    });
    expect(first.schema.collections.find((collection) => collection.id === "petSideStories")).toMatchObject({
      count: 1,
      required: true
    });
    expect(first.sections.cards.map((card) => card.id)).toEqual([
      "coordinated_strike",
      "defend",
      "ember_spark",
      "focus",
      "fox_bite",
      "fox_fetch",
      "fox_flare",
      "fox_guard",
      "kindle",
      "quick_guard",
      "strike",
      "study_command"
    ]);
    expect(first.sections.cards.find((card) => card.id === "strike")?.preview).toMatchObject({
      source: "card",
      displayRole: "attack",
      targetProfile: {
        targetKind: "enemy",
        requiresManualTarget: true
      },
      effectSummaries: [{ type: "damage", amount: 6, combatantTarget: "target" }]
    });
    expect(first.sections.monsterAbilities.find((ability) => ability.id === "ash_mite_burn")?.preview).toMatchObject({
      source: "monsterAbility",
      displayRole: "debuff",
      targetProfile: {
        targetKind: "enemy",
        usesDefaultTarget: true
      }
    });
    expect(first.sections.statuses).toEqual([expect.objectContaining({
      id: "burn",
      behaviourType: "startOfTurnDamage",
      runtimeSupported: true,
      descriptorLines: expect.arrayContaining([
        "Burn 1",
        "Cleanse emits StatusCleansed; consume emits StatusConsumed."
      ])
    })]);
    expect(first.sections.runMapTemplates).toEqual([expect.objectContaining({
      id: "act1_forest",
      nodeCount: 7,
      combatNodeCount: 5,
      budgetedNodeCount: 5
    })]);
    expect(first.sections.petUpgrades.map((upgrade) => upgrade.id)).toEqual([
      "ash_instinct",
      "burning_fang",
      "warm_bond"
    ]);
    expect(first.sections.petUpgrades.find((upgrade) => upgrade.id === "warm_bond")).toMatchObject({
      petDefinitionId: "ember_fox",
      modifierIds: ["warm_bond_modifier"],
      modifierCount: 1
    });
    expect(first.sections.petModifiers.map((modifier) => modifier.id)).toEqual([
      "ash_instinct_modifier",
      "burning_fang_modifier",
      "warm_bond_modifier"
    ]);
    expect(first.sections.playerClassModifiers).toEqual([]);
    expect(first.sections.storyEvents).toEqual([expect.objectContaining({
      id: "ember_fox_side_story",
      outcomeTypes: ["addBondXp", "setStoryFlag", "unlockPetMemory", "unlockPetUpgrade"]
    })]);
    expect(first.sections.petSideStories).toEqual([expect.objectContaining({
      id: "ember_fox_side_story",
      petDefinitionId: "ember_fox",
      eventIds: ["ember_fox_side_story"]
    })]);
    expect(first.diagnostics.registryErrors).toEqual([]);
    expect(first.diagnostics.levelAuthoringErrors).toEqual([]);
    expect(first.diagnostics.dependencyReferenceCount).toBeGreaterThan(0);
    expect(first.reports.content.counts.monsterAbilities).toBe(10);
    expect(first.reports.content.counts.petModifiers).toBe(3);
    expect(first.reports.content.dependencyReferenceCount).toBe(first.diagnostics.dependencyReferenceCount);
    expect(first.reports.content.dependencyMissingReferenceCount).toBe(0);
    expect(first.reports.levelAuthoring.encounterBudgetsByType).toEqual({
      boss: 8,
      combat: 6,
      elite: 5
    });
    expect(first.reports.levelAuthoring).toMatchObject({
      encounterCount: 5,
      runMapTemplateCount: 1,
      budgetedRunNodeCount: 5,
      combatRunNodeCount: 5
    });
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
  });

  it("surfaces validation and dependency diagnostics without throwing", () => {
    const viewModel = buildContentWorkbenchViewModel({
      ...starterRegistry,
      players: [{
        ...starterRegistry.players[0],
        startingDeckCardIds: [cardId("missing_card")]
      }]
    });

    expect(viewModel.diagnostics.registryErrors).toContainEqual(expect.objectContaining({
      code: "missing_starting_deck_card",
      path: "players[0].startingDeckCardIds[0]"
    }));
    expect(viewModel.diagnostics.dependencyIssues).toContainEqual(expect.objectContaining({
      code: "missing_dependency",
      path: "players[0].startingDeckCardIds[0]",
      message: "players 'novice_tamer' references missing cards 'missing_card'.",
      source: {
        collection: "players",
        id: "novice_tamer",
        path: "players[0]"
      },
      target: {
        collection: "cards",
        id: "missing_card",
        path: "players[0].startingDeckCardIds[0]"
      }
    }));
  });

  it("keeps the workbench foundation inside game-core without Phaser imports", () => {
    const source = readFileSync("src/game-core/systems/content-workbench.ts", "utf8");

    expect(source).not.toContain("phaser");
    expect(source).not.toContain("game-phaser");
  });
});
