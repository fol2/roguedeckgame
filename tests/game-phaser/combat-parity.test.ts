import { describe, expect, it } from "vitest";
import { cardId, cardInstanceId, combatantId } from "../../src/game-core";
import {
  checkCombatParity,
  type CombatParityPresenterSnapshot
} from "../../src/game-phaser/debug/combat-parity";
import type { CombatViewModel } from "../../src/game-phaser/view-models/combat-view-model";

const createViewModel = (): CombatViewModel => ({
  revision: 1,
  phase: "player_turn",
  encounterLabel: "Training",
  turnNumber: 1,
  energy: 3,
  maxEnergy: 3,
  player: {
    id: combatantId("player"),
    name: "Keeper",
    type: "player",
    hp: 70,
    maxHp: 70,
    block: 0,
    statuses: [],
    alive: true,
    tooltip: { title: "Keeper", body: "Player." },
    detail: { title: "Keeper", lines: [] }
  },
  pets: [],
  monsters: [{
    id: combatantId("monster"),
    name: "Slime",
    type: "monster",
    hp: 12,
    maxHp: 12,
    block: 0,
    statuses: [],
    alive: true,
    tooltip: { title: "Slime", body: "Enemy." },
    detail: { title: "Slime", lines: [] }
  }],
  monsterIntents: [],
  hand: [{
    cardInstanceId: cardInstanceId("strike:1"),
    cardId: cardId("strike"),
    name: "Strike",
    description: "Deal damage.",
    type: "attack",
    cost: 1,
    tags: [],
    playable: true,
    isPetCommand: false,
    tagTooltips: [],
    keywordExplanations: [],
    detail: { title: "Strike", lines: [] },
    targetKind: "enemy",
    playMode: "selectEnemy",
    requiresManualTarget: true,
    validTargetIds: [combatantId("monster")]
  }],
  drawPile: { label: "Draw", count: 4, tooltip: { title: "Draw", body: "" }, detail: { title: "Draw", lines: [] } },
  discardPile: { label: "Discard", count: 1, tooltip: { title: "Discard", body: "" }, detail: { title: "Discard", lines: [] } },
  continueAvailable: false,
  resetAvailable: false,
  eventMessages: [],
  uiWarnings: [],
  uiCaps: {
    maxHandCards: 10,
    maxEnemies: 3,
    maxPetSlots: 3,
    maxEnemyVisibleStatuses: 4,
    maxPlayerVisibleStatuses: 5,
    maxPetVisibleStatuses: 3,
    maxCardVisibleTags: 4
  }
});

const createPresenterSnapshot = (): CombatParityPresenterSnapshot => ({
  cards: [{
    cardInstanceId: cardInstanceId("strike:1"),
    zone: "hand",
    x: 640,
    y: 600,
    moving: false,
    dragging: false,
    visible: true
  }],
  piles: { draw: 4, discard: 1 },
  player: { id: combatantId("player"), hp: 70, maxHp: 70, block: 0 },
  monsters: [{ id: combatantId("monster"), hp: 12, maxHp: 12, block: 0 }]
});

describe("combat visual-state parity diagnostics", () => {
  it("passes when presenter snapshots match the combat view model", () => {
    const diagnostics = checkCombatParity({
      stage: "scene_refresh",
      viewModel: createViewModel(),
      input: { dragState: "idle", inputLocked: false },
      presenters: createPresenterSnapshot()
    });

    expect(diagnostics).toEqual([]);
  });

  it("reports a card visually left in hand after the core moved it away", () => {
    const viewModel = { ...createViewModel(), hand: [] };

    const diagnostics = checkCombatParity({
      stage: "after_playback_batch",
      viewModel,
      input: { dragState: "idle", inputLocked: false },
      presenters: createPresenterSnapshot()
    });

    expect(diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        severity: "error",
        code: "stale_hand_card_visual",
        entityId: "strike:1"
      })
    ]));
  });

  it("reports stale non-hand visible card snapshots after the core moved them away", () => {
    const viewModel = { ...createViewModel(), hand: [] };

    for (const zone of ["transient", "discard", "exhaust"] as const) {
      const diagnostics = checkCombatParity({
        stage: "after_playback_batch",
        viewModel,
        input: { dragState: "idle", inputLocked: false },
        presenters: {
          ...createPresenterSnapshot(),
          cards: [{
            ...createPresenterSnapshot().cards[0]!,
            zone,
            moving: false,
            dragging: false
          }]
        }
      });

      expect(diagnostics, zone).toEqual(expect.arrayContaining([
        expect.objectContaining({
          severity: "error",
          code: "stale_hand_card_visual",
          entityId: "strike:1"
        })
      ]));
    }
  });

  it("accepts transient expected hand cards without hand-count drift", () => {
    const diagnostics = checkCombatParity({
      stage: "after_action_result",
      viewModel: createViewModel(),
      input: { dragState: "idle", inputLocked: true },
      presenters: {
        ...createPresenterSnapshot(),
        cards: [{
          ...createPresenterSnapshot().cards[0]!,
          zone: "transient",
          moving: true
        }]
      }
    });

    expect(diagnostics).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "hand_count_mismatch" })
    ]));
  });

  it("reports draw and discard pile count drift", () => {
    const diagnostics = checkCombatParity({
      stage: "scene_refresh",
      viewModel: createViewModel(),
      input: { dragState: "idle", inputLocked: false },
      presenters: {
        ...createPresenterSnapshot(),
        piles: { draw: 3, discard: 2 }
      }
    });

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual(expect.arrayContaining([
      "draw_count_mismatch",
      "discard_count_mismatch"
    ]));
  });

  it("reports stale selected and dragged cards", () => {
    const viewModel = { ...createViewModel(), hand: [] };

    const diagnostics = checkCombatParity({
      stage: "scene_refresh",
      viewModel,
      input: {
        selectedCardId: cardInstanceId("strike:1"),
        dragState: "dragging",
        inputLocked: false
      },
      presenters: {
        ...createPresenterSnapshot(),
        cards: [{
          ...createPresenterSnapshot().cards[0]!,
          zone: "transient",
          dragging: true
        }]
      }
    });

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual(expect.arrayContaining([
      "stale_selected_card",
      "stale_dragged_card"
    ]));
  });

  it("reports player and monster HP or block label drift", () => {
    const diagnostics = checkCombatParity({
      stage: "scene_refresh",
      viewModel: createViewModel(),
      input: { dragState: "idle", inputLocked: false },
      presenters: {
        ...createPresenterSnapshot(),
        player: { id: combatantId("player"), hp: 68, maxHp: 70, block: 0 },
        monsters: [{ id: combatantId("monster"), hp: 12, maxHp: 12, block: 2 }]
      }
    });

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual(expect.arrayContaining([
      "player_label_mismatch",
      "monster_label_mismatch"
    ]));
  });
});
