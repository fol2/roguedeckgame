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
import type { CombatCardViewModel, CombatViewModel } from "../../src/game-phaser/view-models/combat-view-model";

const enemyId = combatantId("monster:0");
const card = (overrides: Partial<CombatCardViewModel> = {}): CombatCardViewModel => ({
  cardInstanceId: cardInstanceId("card:1"),
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
  validTargetIds: [enemyId],
  ...overrides
});

const viewModel = (hand: readonly CombatCardViewModel[]): CombatViewModel => ({
  hand
} as CombatViewModel);

describe("combat interaction state", () => {
  it("selects, hovers, resolves, and clears interaction cards without scene state", () => {
    const selected = selectCombatCard(createCombatInteractionState(), cardInstanceId("card:1"), 7, enemyId);
    const hovered = setHoveredCombatCard(selected, cardInstanceId("card:2"));

    expect(selected).toMatchObject({
      selectedCardId: cardInstanceId("card:1"),
      selectedCardRevision: 7,
      keyboardTargetId: enemyId
    });
    expect(hovered.hoveredCardId).toBe(cardInstanceId("card:2"));
    expect(getInteractionCard(hovered, viewModel([card()]))?.cardInstanceId).toBe(cardInstanceId("card:1"));
    expect(clearCombatSelection(hovered)).toEqual({});
  });

  it("reconciles stale selections against the latest combat view model", () => {
    const selected = selectCombatCard(createCombatInteractionState(), cardInstanceId("card:1"), 7, combatantId("stale"));

    expect(reconcileCombatInteractionState(selected, viewModel([card()]))).toMatchObject({
      selectedCardId: cardInstanceId("card:1"),
      selectedCardRevision: 7,
      keyboardTargetId: enemyId
    });
    expect(reconcileCombatInteractionState(selected, viewModel([card({ playable: false })]))).toEqual({});
    expect(reconcileCombatInteractionState(selected, viewModel([]))).toEqual({});
  });

  it("resolves input lock priority without Phaser scene state", () => {
    expect(resolveCombatInputLockState({
      playbackLocked: true,
      modalOpen: true,
      browserFocused: false
    })).toEqual({ inputLocked: true, inputLockReason: "playback" });
    expect(resolveCombatInputLockState({
      playbackLocked: false,
      modalOpen: true,
      browserFocused: false
    })).toEqual({ inputLocked: true, inputLockReason: "modal" });
    expect(resolveCombatInputLockState({
      playbackLocked: false,
      modalOpen: false,
      browserFocused: false
    })).toEqual({ inputLocked: true, inputLockReason: "browser_blur" });
    expect(resolveCombatInputLockState({
      playbackLocked: false,
      modalOpen: false,
      browserFocused: true
    })).toEqual({ inputLocked: false });
  });
});
