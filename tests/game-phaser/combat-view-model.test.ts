import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  cardInstanceId,
  combatantId,
  createCombat,
  monsterAbilityId,
  monsterId,
  monsterIntentId,
  type IntentVisibilityLevel,
  starterRegistry,
  statusId,
  upgradeId
} from "../../src/game-core";
import { createCombatSandboxController } from "../../src/game-phaser/controllers/CombatSandboxController";
import {
  buildCombatViewModel,
  getCardKeywordExplanations
} from "../../src/game-phaser/view-models/combat-view-model";
import { CombatAssetKeys } from "../../src/game-phaser/assets/combat-asset-keys";
import { createHandTunedCombatFixture } from "../../src/game-core/testing/combat-fixtures";
import { createEmberFoxInstanceFixture, createRunFixture } from "../../src/game-core/testing/fixtures";

const root = process.cwd();

describe("Combat view model", () => {
  it("maps core combat state to serializable display data", () => {
    const controller = createCombatSandboxController("view-model-map");
    const viewModel = buildCombatViewModel(controller.getState());

    expect(viewModel.player).toMatchObject({
      name: "Ashbound Keeper",
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

  it("describes hidden card tags from the overflow slot boundary", () => {
    const viewModel = createCombatSandboxController("view-model-tag-overflow").getViewModel();
    const card = viewModel.hand.find((candidate) => candidate.tags.length > 3);

    expect(card?.tagOverflowTooltip).toMatchObject({
      title: "More tags",
      body: card?.tags.slice(2).join(", ")
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
      tooltip: expect.stringContaining("No runtime behaviour is configured.")
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
      maxCardVisibleTags: 3
    });
    expect(targetable).toMatchObject({
      playMode: "selectEnemy",
      targetKind: expect.stringMatching(/enemy/i)
    });
    expect(targetable?.validTargetIds.length).toBeGreaterThan(0);
  });

  it("uses core card action contracts for pet-command cost and playability", () => {
    const controller = createCombatSandboxController("view-model-warm-bond-contract");
    const baseState = controller.getState();
    const pet = createEmberFoxInstanceFixture({ unlockedUpgradeIds: [upgradeId("warm_bond")] });
    const combat = createCombat({
      run: createRunFixture({ activePetInstanceIds: [pet.id] }),
      registry: starterRegistry,
      petInstances: [pet],
      monsterIds: [monsterId("training_slime")],
      seed: "view-model-warm-bond-contract",
      openingHandSize: 0
    });
    if (!combat.ok) {
      throw new Error(combat.errors[0]?.message ?? "Could not create combat.");
    }

    const tunedCombat = createHandTunedCombatFixture();
    const viewModel = buildCombatViewModel({
      ...baseState,
      petInstances: [pet],
      combat: {
        ...tunedCombat,
        activePetInstanceIds: combat.state.activePetInstanceIds,
        petInstances: combat.state.petInstances,
        runPetStates: combat.state.runPetStates,
        energy: 0,
        hand: [cardInstanceId("fox_bite:1")]
      }
    });
    const foxBite = viewModel.hand[0];

    expect(foxBite).toMatchObject({
      cardId: "fox_bite",
      cost: 0,
      playable: true,
      commandPetSlotIndex: 0,
      targetKind: "petAndEnemy",
      playMode: "selectEnemy"
    });
    expect(foxBite?.validTargetIds).toEqual(["monster:training_slime:0"]);
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
    expect(viewModel.monsterIntents[0]?.description.length).toBeGreaterThan(0);
    expect(viewModel.monsterIntents[0]?.targetHint).toEqual(expect.any(String));
  });

  it("exposes enemy card holding readouts without rendering enemy cards as battlefield cards", () => {
    const viewModel = createCombatSandboxController("view-model-enemy-holdings").getViewModel();
    const holding = viewModel.enemyCardHoldings[0]!;

    expect(holding).toMatchObject({
      monsterId: viewModel.monsters[0]?.id,
      drawCount: expect.any(Number),
      handCount: expect.any(Number),
      plannedCount: expect.any(Number),
      discardCount: expect.any(Number),
      exhaustCount: expect.any(Number),
      planMode: expect.any(String),
      candidateCount: expect.any(Number)
    });
    expect(holding.candidateCount).toBe(holding.plannedCount);
    expect(holding.detail.footer).toContain("Enemy cards are still presented through Intent UI");
  });

  it("uses planned monster ability effects for intent display metadata", () => {
    const controller = createCombatSandboxController("view-model-planned-ability-intent");
    const state = controller.getState();
    const plannedAbility = state.combat.plannedMonsterAbilities?.[0];

    expect(plannedAbility).toBeDefined();

    const viewModel = buildCombatViewModel({
      ...state,
      combat: {
        ...state.combat,
        intentVisibilityOverrides: [{
          monsterCombatantId: state.combat.monsters[0]!.id,
          level: "exact",
          source: "debug",
          expires: "never"
        }]
      }
    }, {
      ...starterRegistry,
      monsterAbilities: (starterRegistry.monsterAbilities ?? []).map((ability) =>
        ability.id === plannedAbility!.abilityId
          ? {
              ...ability,
              intentType: "block",
              description: "Planned ability display copy.",
              effects: [
                {
                  type: "block",
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
      amount: 99,
      plannedAction: {
        source: "plannedAbility",
        revealPolicy: "exact",
        title: expect.any(String),
        abilityId: plannedAbility!.abilityId,
        subtitle: `${viewModel.monsterIntents[0]?.type} intent debug`,
        effectLines: ["Block 99 to target."]
      },
      token: {
        visibility: "exact",
        kind: "defend",
        iconKey: CombatAssetKeys.icons.intentDefend,
        amountLabel: "99",
        targetHint: "keeper",
        debug: {
          source: "plannedAbility",
          abilityId: plannedAbility!.abilityId
        }
      }
    });
    expect(viewModel.monsterIntents[0]?.detail.lines).toEqual(expect.arrayContaining([
      "Planned ability display copy.",
      "Block: 99",
      "Target: Keeper"
    ]));
    expect(viewModel.monsterIntents[0]?.detail.lines.join("\n")).not.toMatch(/Reveal policy|Metadata source|Intent ID/);
    expect(viewModel.monsterIntents[0]?.detail.footer).toBe("Intent detail.");
  });

  it("uses fallback monster ability metadata when planned storage is unavailable for display only", () => {
    const controller = createCombatSandboxController("view-model-fallback-planned-card");
    const state = controller.getState();
    const plannedAbility = state.combat.plannedMonsterAbilities?.[0];

    expect(plannedAbility).toBeDefined();

    const viewModel = buildCombatViewModel({
      ...state,
      combat: {
        ...state.combat,
        intentVisibilityOverrides: [{
          monsterCombatantId: state.combat.monsters[0]!.id,
          level: "exact",
          source: "debug",
          expires: "never"
        }],
        plannedMonsterAbilities: []
      }
    });

    expect(viewModel.monsterIntents[0]).toMatchObject({
      abilityId: plannedAbility!.abilityId,
      plannedAction: {
        source: "fallbackMetadata",
        revealPolicy: "exact",
        abilityId: plannedAbility!.abilityId
      }
    });
  });

  it("redacts hidden monster intent metadata until the intent is revealed", () => {
    const controller = createCombatSandboxController("view-model-hidden-intent");
    const state = controller.getState();
    const monsterCombatantId = combatantId("monster:soot_crow:0");
    const hiddenCombat = {
      ...state.combat,
      monsters: [{
        ...state.combat.monsters[0]!,
        id: monsterCombatantId,
        definitionId: monsterId("soot_crow"),
        name: "Soot Crow"
      }],
      monsterIntents: [{
        monsterCombatantId,
        intentId: monsterIntentId("soot_crow_flutter")
      }],
      plannedMonsterAbilities: [{
        monsterCombatantId,
        intentId: monsterIntentId("soot_crow_flutter"),
        abilityId: monsterAbilityId("soot_crow_flutter")
      }]
    };
    const hidden = buildCombatViewModel({ ...state, combat: hiddenCombat }).monsterIntents[0]!;
    const revealed = buildCombatViewModel({
      ...state,
      combat: {
        ...hiddenCombat,
        intentVisibilityOverrides: [{
          monsterCombatantId,
          level: "exact",
          source: "debug",
          expires: "never"
        }]
      }
    }).monsterIntents[0]!;

    expect(hidden).toMatchObject({
      abilityId: undefined,
      visibilityLevel: "unknown",
      label: "?",
      description: "Intent hidden.",
      targetHint: "unknown",
      amount: undefined,
      plannedAction: {
        title: "?",
        effectLines: ["Intent hidden."]
      }
    });
    expect(hidden.detail.lines.join("\n")).not.toContain("Ash Flutter");
    expect(hidden.detail.lines.join("\n")).not.toContain("hide behind ash");
    expect(revealed).toMatchObject({
      abilityId: monsterAbilityId("soot_crow_flutter"),
      visibilityLevel: "exact",
      label: "special",
      description: expect.stringContaining("hide behind ash"),
      plannedAction: {
        title: "Ash Flutter"
      }
    });
  });

  it("shows rough intent category without exact action amount or details", () => {
    const controller = createCombatSandboxController("view-model-rough-intent");
    const state = controller.getState();
    const monsterCombatantId = state.combat.monsters[0]!.id;
    const viewModel = buildCombatViewModel({
      ...state,
      combat: {
        ...state.combat,
        intentVisibilityOverrides: [{
          monsterCombatantId,
          level: "rough",
          source: "debug",
          expires: "never"
        }]
      }
    });
    const intent = viewModel.monsterIntents[0]!;

    expect(intent.visibilityLevel).toBe("rough");
    expect(intent.abilityId).toBeUndefined();
    expect(intent.amount).toBeUndefined();
    expect(intent.plannedAction.effectLines).toEqual(expect.arrayContaining(["Specific action details are hidden."]));
    expect(intent.plannedAction.effectLines[0]).toMatch(/^Rough strength: /);
  });

  it("keeps scoped intent visibility from exposing exact action details", () => {
    const controller = createCombatSandboxController("view-model-scoped-intent");
    const state = controller.getState();
    const scribeId = combatantId("monster:cinder_scribe:0");
    const viewModel = buildCombatViewModel({
      ...state,
      combat: {
        ...state.combat,
        monsters: [{
          ...state.combat.monsters[0]!,
          id: scribeId,
          definitionId: monsterId("cinder_scribe"),
          name: "Cinder Scribe"
        }],
        monsterIntents: [{
          monsterCombatantId: scribeId,
          intentId: monsterIntentId("cinder_scribe_ink_spark")
        }],
        plannedMonsterAbilities: [{
          monsterCombatantId: scribeId,
          intentId: monsterIntentId("cinder_scribe_ink_spark"),
          abilityId: monsterAbilityId("cinder_scribe_ink_spark")
        }],
        intentVisibilityOverrides: [{
          monsterCombatantId: scribeId,
          level: "scoped",
          source: "debug",
          expires: "never"
        }]
      }
    });
    const intent = viewModel.monsterIntents[0]!;

    expect(intent).toMatchObject({
      visibilityLevel: "scoped",
      abilityId: undefined,
      label: "special scoped (1)",
      amount: undefined,
      scope: {
        depth: "candidateSet",
        candidateCount: 1,
        candidates: [expect.objectContaining({
          abilityId: monsterAbilityId("cinder_scribe_ink_spark"),
          title: "Ink Spark"
        })]
      },
      plannedAction: {
        title: "Scoped candidate set",
        effectLines: expect.arrayContaining([
          expect.stringContaining("Candidates: Ink Spark"),
          "Candidate scope exposes possible enemy cards, not guaranteed final order."
        ])
      }
    });
    expect(intent.description).not.toContain("Deal");
    expect(intent.plannedAction.title).not.toBe("Ink Spark");
    expect(intent.detail.lines.join("\n")).not.toContain("Deal 5");
  });

  it("renders none visibility as no useful intent instead of an unknown intent", () => {
    const controller = createCombatSandboxController("view-model-no-intent");
    const state = controller.getState();
    const monsterCombatantId = state.combat.monsters[0]!.id;
    const viewModel = buildCombatViewModel(state, {
      ...starterRegistry,
      monsterAbilities: (starterRegistry.monsterAbilities ?? []).map((ability) =>
        ability.id === state.combat.plannedMonsterAbilities?.[0]?.abilityId
          ? { ...ability, telegraph: { ...ability.telegraph, defaultVisibility: "none" as const } }
          : ability
      )
    });
    const intent = viewModel.monsterIntents.find((candidate) => candidate.monsterId === monsterCombatantId)!;

    expect(intent).toMatchObject({
      visibilityLevel: "none",
      label: "Idle",
      description: "No useful intent is available.",
      plannedAction: {
        title: "Idle",
        effectLines: ["No useful intent marker."]
      }
    });
  });

  it("uses player-facing intent wording instead of planned-card copy for partial visibility", () => {
    const controller = createCombatSandboxController("view-model-intent-copy-polish");
    const state = controller.getState();
    const monsterId = state.combat.monsters[0]!.id;
    const partialLevels: readonly IntentVisibilityLevel[] = ["none", "unknown", "category", "rough", "scoped"];

    for (const level of partialLevels) {
      const viewModel = buildCombatViewModel({
        ...state,
        combat: {
          ...state.combat,
          intentVisibilityOverrides: [{
            monsterCombatantId: monsterId,
            level,
            source: "debug",
            expires: "never"
          }]
        }
      });
      const intent = viewModel.monsterIntents[0]!;
      const copy = [
        intent.description,
        intent.detail.subtitle,
        ...intent.detail.lines,
        intent.plannedAction.title,
        intent.plannedAction.subtitle,
        ...intent.plannedAction.effectLines,
        intent.token.detail.subtitle,
        ...intent.token.detail.lines,
        intent.token.tooltip.title,
        intent.token.tooltip.body
      ].join("\n");

      expect(copy).not.toMatch(/planned card|card name|card text/i);
      expect(copy).toMatch(/intent|action|candidate|marker|hidden|useful/i);
    }
  });

  it("redacts hidden enemy planned cards until intent visibility is improved", () => {
    const controller = createCombatSandboxController("view-model-hidden-intent");
    const state = controller.getState();
    const scribeId = combatantId("monster:cinder_scribe:0");
    const hidden = buildCombatViewModel({
      ...state,
      combat: {
        ...state.combat,
        monsters: [{
          ...state.combat.monsters[0]!,
          id: scribeId,
          definitionId: monsterId("cinder_scribe"),
          name: "Cinder Scribe"
        }],
        monsterIntents: [{
          monsterCombatantId: scribeId,
          intentId: monsterIntentId("cinder_scribe_ink_spark")
        }],
        plannedMonsterAbilities: [{
          monsterCombatantId: scribeId,
          intentId: monsterIntentId("cinder_scribe_ink_spark"),
          abilityId: monsterAbilityId("cinder_scribe_ink_spark")
        }]
      }
    });
    const revealed = buildCombatViewModel({
      ...state,
      combat: {
        ...state.combat,
        monsters: [{
          ...state.combat.monsters[0]!,
          id: scribeId,
          definitionId: monsterId("cinder_scribe"),
          name: "Cinder Scribe"
        }],
        monsterIntents: [{
          monsterCombatantId: scribeId,
          intentId: monsterIntentId("cinder_scribe_ink_spark")
        }],
        plannedMonsterAbilities: [{
          monsterCombatantId: scribeId,
          intentId: monsterIntentId("cinder_scribe_ink_spark"),
          abilityId: monsterAbilityId("cinder_scribe_ink_spark")
        }],
        intentVisibilityOverrides: [{
          monsterCombatantId: scribeId,
          level: "exact",
          source: "debug",
          expires: "never"
        }]
      }
    });

    expect(hidden.monsterIntents[0]).toMatchObject({
      abilityId: undefined,
      label: "?",
      description: "Intent hidden.",
      targetHint: "unknown",
      amount: undefined,
      plannedAction: {
        title: "?",
        effectLines: ["Intent hidden."]
      }
    });
    expect(revealed.monsterIntents[0]).toMatchObject({
      abilityId: monsterAbilityId("cinder_scribe_ink_spark"),
      label: "special",
      description: expect.stringContaining("Deal"),
      targetHint: "keeper",
      plannedAction: {
        title: "Ink Spark",
        effectLines: expect.arrayContaining([
          expect.stringContaining("Damage")
        ])
      }
    });
  });

  it("honours ability-level hidden telegraphs on otherwise readable normal enemies", () => {
    const controller = createCombatSandboxController("view-model-ability-telegraph");
    const state = controller.getState();
    const crowId = combatantId("monster:soot_crow:0");
    const viewModel = buildCombatViewModel({
      ...state,
      combat: {
        ...state.combat,
        monsters: [{
          ...state.combat.monsters[0]!,
          id: crowId,
          definitionId: monsterId("soot_crow"),
          name: "Soot Crow"
        }],
        monsterIntents: [{
          monsterCombatantId: crowId,
          intentId: monsterIntentId("soot_crow_flutter")
        }],
        plannedMonsterAbilities: [{
          monsterCombatantId: crowId,
          intentId: monsterIntentId("soot_crow_flutter"),
          abilityId: monsterAbilityId("soot_crow_flutter")
        }]
      }
    });

    expect(viewModel.monsterIntents[0]).toMatchObject({
      visibilityLevel: "unknown",
      label: "?",
      plannedAction: { title: "?" }
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
