import { describe, expect, it } from "vitest";
import { cardId, cardInstanceId, combatantId } from "../../src/game-core";
import {
  clearCombatSelection,
  createCombatInteractionState,
  getInteractionCard,
  reconcileCombatInteractionState,
  resolveCombatInputLockState,
  selectCombatCard,
  setHoveredCombatCard
} from "../../src/game-phaser/interaction/combat-interaction-state";
import type { ResolveCombatInputLockStateInput } from "../../src/game-phaser/interaction/combat-input-lock";
import type { CombatCardViewModel, CombatViewModel } from "../../src/game-phaser/view-models/combat-view-model";

const enemyId = combatantId("monster:0");
const card = (overrides: Partial<CombatCardViewModel> = {}): CombatCardViewModel => ({
  cardInstanceId: cardInstanceId("card:1"),
  cardId: cardId("strike"),
  name: "Strike",
  description: "Deal damage.",
  type: "attack",
  rarity: "starter",
  source: "classBound",
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
  validTargetIds: [enemyId],
  ...overrides
});

const viewModel = (hand: readonly CombatCardViewModel[]): CombatViewModel => ({
  phase: "player_turn",
  hand,
  player: { id: combatantId("player"), alive: true },
  monsters: [{ id: enemyId, alive: true }]
} as unknown as CombatViewModel);

const inputLock = (
  overrides: Partial<ResolveCombatInputLockStateInput> = {}
) => resolveCombatInputLockState({
  submitting: false,
  playbackLocked: false,
  detailOpen: false,
  pauseOpen: false,
  browserFocused: true,
  viewModelPhase: "player_turn",
  ...overrides
});

describe("combat interaction state", () => {
  it("selects, hovers, resolves, and clears interaction cards without scene state", () => {
    const selected = selectCombatCard(createCombatInteractionState(), cardInstanceId("card:1"), 7, enemyId);
    const hovered = setHoveredCombatCard(selected, cardInstanceId("card:2"));

    expect(selected).toMatchObject({
      selectedCardId: cardInstanceId("card:1"),
      selectedCardRevision: 7,
      focusedTargetId: enemyId
    });
    expect(hovered.hoveredCardId).toBe(cardInstanceId("card:2"));
    expect(getInteractionCard(hovered, viewModel([card()]))?.cardInstanceId).toBe(cardInstanceId("card:1"));
    expect(clearCombatSelection(hovered).selectedCardId).toBeUndefined();
    expect(clearCombatSelection(hovered).focusedTargetId).toBeUndefined();
  });

  it("reconciles stale selections against the latest combat view model", () => {
    const selected = selectCombatCard(createCombatInteractionState(), cardInstanceId("card:1"), 7, combatantId("stale"));

    expect(reconcileCombatInteractionState(selected, viewModel([card()]))).toMatchObject({
      selectedCardId: cardInstanceId("card:1"),
      selectedCardRevision: 7,
      focusedTargetId: enemyId
    });
    expect(reconcileCombatInteractionState(selected, viewModel([card({ playable: false })])).selectedCardId).toBeUndefined();
    expect(reconcileCombatInteractionState(selected, viewModel([])).selectedCardId).toBeUndefined();
  });

  it("resolves input lock priority without Phaser scene state", () => {
    expect(inputLock({
      submitting: true,
      playbackLocked: true,
      detailOpen: true,
      pauseOpen: true,
      browserFocused: false
    })).toEqual({ inputLocked: true, inputLockReason: "submitting" });
    expect(inputLock({
      playbackLocked: true,
      detailOpen: true,
      pauseOpen: true,
      browserFocused: false
    })).toEqual({ inputLocked: true, inputLockReason: "playback" });
    expect(inputLock({
      detailOpen: true,
      pauseOpen: true,
      browserFocused: false
    })).toEqual({ inputLocked: true, inputLockReason: "detail_open" });
    expect(inputLock({ pauseOpen: true, browserFocused: false })).toEqual({ inputLocked: true, inputLockReason: "paused" });
    expect(inputLock({ browserFocused: false })).toEqual({ inputLocked: true, inputLockReason: "browser_blur" });
    expect(inputLock({ viewModelPhase: "won" })).toEqual({ inputLocked: true, inputLockReason: "combat_ended" });
    expect(inputLock({ viewModelPhase: "enemy_turn" })).toEqual({ inputLocked: true, inputLockReason: "enemy_turn" });
    expect(inputLock()).toEqual({ inputLocked: false });
  });
});
