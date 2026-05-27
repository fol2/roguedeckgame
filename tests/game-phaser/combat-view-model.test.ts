import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { starterRegistry, statusId } from "../../src/game-core";
import { createCombatSandboxController } from "../../src/game-phaser/controllers/CombatSandboxController";
import {
  buildCombatViewModel,
  getCardKeywordExplanations
} from "../../src/game-phaser/view-models/combat-view-model";

const root = process.cwd();

describe("Combat view model", () => {
  it("maps core combat state to serializable display data", () => {
    const controller = createCombatSandboxController("view-model-map");
    const viewModel = buildCombatViewModel(controller.getState());

    expect(viewModel.player).toMatchObject({
      name: "Novice Tamer",
      type: "player",
      alive: true
    });
    expect(viewModel.pets[0]).toMatchObject({
      name: "Ember Fox",
      nickname: "Ember"
    });
    expect(viewModel.monsters[0]?.type).toBe("monster");
    expect(JSON.parse(JSON.stringify(viewModel))).toEqual(viewModel);
  });

  it("includes hand card labels, costs, draw count, and discard count", () => {
    const viewModel = createCombatSandboxController("view-model-hand").getViewModel();
    const card = viewModel.hand[0];

    expect(card?.name).toEqual(expect.any(String));
    expect(card?.description.length).toBeGreaterThan(0);
    expect(card?.cost).toEqual(expect.any(Number));
    expect(card?.tagTooltips.length).toBe(card?.tags.length);
    expect(card?.tagTooltips[0]).toEqual(expect.objectContaining({
      title: expect.any(String),
      body: expect.any(String)
    }));
    expect(card?.keywordExplanations.length).toBeGreaterThan(0);
    expect(card?.detail.lines).toContain("Keywords:");
    expect(viewModel.drawPile.count + viewModel.discardPile.count + viewModel.hand.length).toBeGreaterThan(0);
  });

  it("owns pet and card tooltip copy in the combat view model", () => {
    const viewModel = createCombatSandboxController("view-model-tooltip-copy").getViewModel();
    const pet = viewModel.pets[0];
    const card = viewModel.hand.find((candidate) => candidate.tags.length > 0);

    expect(pet?.tooltip).toMatchObject({
      title: "Ember",
      body: expect.stringContaining("Mood:")
    });
    expect(pet?.detail.lines).toEqual(expect.arrayContaining([
      expect.stringContaining("Active modifiers:")
    ]));
    expect(pet?.statusTooltips[0]).toMatchObject({
      title: expect.any(String),
      body: expect.any(String)
    });
    expect(card?.tagTooltips[0]).toMatchObject({
      tag: card?.tags[0],
      title: expect.any(String),
      body: expect.any(String)
    });
  });

  it("exposes rich status, player, pile, enemy, intent, and card detail copy", () => {
    const controller = createCombatSandboxController("view-model-detail-copy");
    const state = controller.getState();
    const burnedMonster = {
      ...state.combat.monsters[0]!,
      statuses: [
        { statusId: statusId("burn"), stacks: 4 },
        { statusId: statusId("burn"), stacks: 3 },
        { statusId: statusId("burn"), stacks: 2 },
        { statusId: statusId("burn"), stacks: 1 },
        { statusId: statusId("burn"), stacks: 5 }
      ]
    };
    const viewModel = buildCombatViewModel({
      ...state,
      combat: {
        ...state.combat,
        monsters: [burnedMonster]
      }
    });
    const burn = viewModel.monsters[0]?.statuses[0];
    const representativeKeywords = getCardKeywordExplanations(["burn", "guard", "block", "command"], "pet-command");

    expect(viewModel.player.tooltip.body).toContain("HP");
    expect(viewModel.player.detail.lines).toEqual(expect.arrayContaining([
      expect.stringContaining("Block:")
    ]));
    expect(viewModel.drawPile.tooltip.body).toContain("Full pile inspection is deferred");
    expect(viewModel.discardPile.detail.lines).toContain(`Cards: ${viewModel.discardPile.count}`);
    expect(viewModel.monsters[0]?.detail.lines).toEqual(expect.arrayContaining([
      expect.stringContaining("HP:")
    ]));
    expect(viewModel.monsters[0]?.statusOverflowTooltip).toMatchObject({
      title: "More statuses",
      body: expect.stringContaining("Burn 5")
    });
    expect(viewModel.monsterIntents[0]?.detail.lines).toEqual(expect.arrayContaining([
      expect.stringContaining("Target:")
    ]));
    expect(burn?.tooltip).toContain("At the start of this unit's turn");
    expect(burn?.tooltip).toContain("ignoring Block");
    expect(burn?.tooltip).toContain("Expires at 0");
    expect(representativeKeywords.map((keyword) => keyword.keyword)).toEqual(expect.arrayContaining([
      "Burn",
      "Guard",
      "Block",
      "Pet-Command"
    ]));
    expect(representativeKeywords.map((keyword) => `${keyword.keyword}: ${keyword.explanation}`).join("\n")).toContain("Guard: Helps protect the Keeper");
  });

  it("uses registered status copy and deterministic unknown-status fallback", () => {
    const controller = createCombatSandboxController("view-model-custom-status");
    const state = controller.getState();
    const customStatusId = statusId("frost");
    const unknownStatusId = statusId("mystery_status");
    const monster = {
      ...state.combat.monsters[0]!,
      statuses: [
        { statusId: customStatusId, stacks: 2 },
        { statusId: unknownStatusId, stacks: 1 }
      ]
    };
    const viewModel = buildCombatViewModel({
      ...state,
      combat: {
        ...state.combat,
        monsters: [monster]
      }
    }, {
      ...starterRegistry,
      statuses: [
        ...(starterRegistry.statuses ?? []),
        {
          id: customStatusId,
          name: "Frost",
          tags: ["slow"],
          description: "Reduces speed during future timing hooks."
        }
      ]
    });

    expect(viewModel.monsters[0]?.statuses[0]).toMatchObject({
      statusId: customStatusId,
      label: "Frost 2",
      tooltip: expect.stringContaining("Reduces speed during future timing hooks.")
    });
    expect(viewModel.monsters[0]?.statuses[1]).toMatchObject({
      statusId: unknownStatusId,
      label: "mystery_status 1",
      tooltip: expect.stringContaining("Timing and duration are not defined yet.")
    });
  });

  it("exposes interaction metadata for targeting, caps, and stale-request revision checks", () => {
    const viewModel = createCombatSandboxController("view-model-interaction").getViewModel();
    const targetable = viewModel.hand.find((card) => card.requiresManualTarget);

    expect(viewModel.revision).toEqual(expect.any(Number));
    expect(viewModel.uiCaps).toMatchObject({
      maxHandCards: 10,
      maxEnemies: 3,
      maxPetSlots: 3,
      maxEnemyVisibleStatuses: 4,
      maxPlayerVisibleStatuses: 5,
      maxPetVisibleStatuses: 3,
      maxCardVisibleTags: 4
    });
    expect(targetable).toMatchObject({
      playMode: "selectEnemy",
      targetKind: expect.stringMatching(/enemy/i)
    });
    expect(targetable?.validTargetIds.length).toBeGreaterThan(0);
  });

  it("keeps multiple active pet slots visible in the combat view model", () => {
    const controller = createCombatSandboxController("view-model-multi-pet");
    const state = controller.getState();
    const activePetId = state.combat.activePetInstanceIds[0]!;
    const secondPetId = `${activePetId}:second` as typeof activePetId;
    const secondPet = {
      ...state.petInstances[0]!,
      id: secondPetId,
      nickname: "Cinder"
    };
    const viewModel = buildCombatViewModel({
      ...state,
      petInstances: [...state.petInstances, secondPet],
      combat: {
        ...state.combat,
        activePetInstanceIds: [activePetId, secondPetId],
        petInstances: [...state.combat.petInstances, secondPet],
        runPetStates: [
          ...state.combat.runPetStates,
          {
            ...state.combat.runPetStates[0]!,
            petInstanceId: secondPetId
          }
        ]
      }
    });

    expect(viewModel.pets.map((pet) => [pet.nickname, pet.slotIndex])).toEqual([
      ["Ember", 0],
      ["Cinder", 1]
    ]);
  });

  it("includes monster intent labels", () => {
    const viewModel = createCombatSandboxController("view-model-intents").getViewModel();

    expect(viewModel.monsterIntents[0]?.label).toEqual(expect.any(String));
    expect(viewModel.monsterIntents[0]?.abilityId).toEqual(expect.any(String));
    expect(viewModel.monsterIntents[0]?.description.length).toBeGreaterThan(0);
    expect(viewModel.monsterIntents[0]?.targetHint).toEqual(expect.any(String));
  });

  it("uses planned monster ability effects for intent display metadata", () => {
    const controller = createCombatSandboxController("view-model-planned-ability-intent");
    const state = controller.getState();
    const plannedAbility = state.combat.plannedMonsterAbilities?.[0];

    expect(plannedAbility).toBeDefined();

    const viewModel = buildCombatViewModel(state, {
      ...starterRegistry,
      monsterAbilities: (starterRegistry.monsterAbilities ?? []).map((ability) =>
        ability.id === plannedAbility!.abilityId
          ? {
              ...ability,
              description: "Planned ability display copy.",
              effects: [
                {
                  type: "damage",
                  amount: 99,
                  target: { type: "target" }
                }
              ]
            }
          : ability
      )
    });

    expect(viewModel.monsterIntents[0]).toMatchObject({
      abilityId: plannedAbility!.abilityId,
      description: "Planned ability display copy.",
      targetHint: "keeper",
      amount: 99
    });
  });

  it("reports unsupported Phase 1 UI counts without hiding the latest state", () => {
    const controller = createCombatSandboxController("view-model-ui-warnings");
    const state = controller.getState();
    const monster = state.combat.monsters[0]!;
    const cardInstanceId = state.combat.hand[0]!;
    const viewModel = buildCombatViewModel({
      ...state,
      combat: {
        ...state.combat,
        activePetInstanceIds: [
          ...state.combat.activePetInstanceIds,
          ...state.combat.activePetInstanceIds,
          ...state.combat.activePetInstanceIds,
          ...state.combat.activePetInstanceIds
        ],
        hand: Array.from({ length: 11 }, () => cardInstanceId),
        monsters: [monster, monster, monster, monster]
      }
    });

    expect(viewModel.uiWarnings).toEqual([
      "Unsupported Phase 1 hand size: 11/10.",
      "Unsupported Phase 1 enemy count: 4/3.",
      "Unsupported Phase 1 active pet slots: 4/3."
    ]);
    expect(viewModel.hand).toHaveLength(11);
    expect(viewModel.monsters).toHaveLength(4);
  });

  it("represents won and lost phases", () => {
    const controller = createCombatSandboxController("view-model-ended");
    const baseState = controller.getState();
    const won = buildCombatViewModel({
      ...baseState,
      combat: { ...baseState.combat, phase: "won" },
      lastEvents: [{ type: "CombatEnded", outcome: "won" }]
    });
    const lost = buildCombatViewModel({
      ...baseState,
      combat: { ...baseState.combat, phase: "lost" },
      lastEvents: [{ type: "CombatEnded", outcome: "lost" }]
    });

    expect(won.phase).toBe("won");
    expect(won.eventMessages).toContain("Combat won.");
    expect(lost.phase).toBe("lost");
    expect(lost.eventMessages).toContain("Combat lost.");
  });

  it("keeps view-model files free from Phaser imports", async () => {
    const source = await readFile(
      join(root, "src/game-phaser/view-models/combat-view-model.ts"),
      "utf8"
    );

    expect(source).not.toMatch(/from\s+["']phaser(?:\/[^"']*)?["']/);
  });
});
