import { describe, expect, it } from "vitest";
import { cardId, cardInstanceId, combatantId } from "../../src/game-core";
import {
  cycleFocusedCombatTarget,
  reconcileCombatSelectionState,
  selectCombatCard,
  setHoveredCombatTarget
} from "../../src/game-phaser/interaction/combat-selection-state";
import type { CombatCardViewModel, CombatViewModel } from "../../src/game-phaser/view-models/combat-view-model";

const firstEnemyId = combatantId("monster:0");
const secondEnemyId = combatantId("monster:1");
const staleEnemyId = combatantId("monster:stale");

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
  validTargetIds: [firstEnemyId, secondEnemyId],
  ...overrides
});

const viewModel = (hand: readonly CombatCardViewModel[]): CombatViewModel => ({
  phase: "player_turn",
  hand,
  player: { id: combatantId("player"), alive: true },
  monsters: [
    { id: firstEnemyId, alive: true },
    { id: secondEnemyId, alive: true },
    { id: staleEnemyId, alive: false }
  ]
} as unknown as CombatViewModel);

describe("combat selection state", () => {
  it("reconciles stale selected, focused, and hovered ids without submitting a target", () => {
    const selected = selectCombatCard({}, cardInstanceId("card:1"), 7, staleEnemyId);
    const hovered = setHoveredCombatTarget(selected, staleEnemyId);
    const reconciled = reconcileCombatSelectionState(hovered, viewModel([card()]));

    expect(reconciled).toMatchObject({
      selectedCardId: cardInstanceId("card:1"),
      selectedCardRevision: 7,
      focusedTargetId: firstEnemyId
    });
    expect(reconciled.hoveredTargetId).toBeUndefined();
    expect("submittedTargetId" in reconciled).toBe(false);

    const cycled = cycleFocusedCombatTarget(reconciled, [firstEnemyId, secondEnemyId]);
    expect(cycled.focusedTargetId).toBe(secondEnemyId);
    expect("submittedTargetId" in cycled).toBe(false);
  });

  it("clears selected state when the latest card is missing, unplayable, or no longer targetable", () => {
    const selected = selectCombatCard({}, cardInstanceId("card:1"), 7, firstEnemyId);

    expect(reconcileCombatSelectionState(selected, viewModel([])).selectedCardId).toBeUndefined();
    expect(reconcileCombatSelectionState(selected, viewModel([card({ playable: false })])).selectedCardId).toBeUndefined();
    expect(reconcileCombatSelectionState(selected, viewModel([card({
      playMode: "immediate",
      requiresManualTarget: false,
      validTargetIds: []
    })])).selectedCardId).toBeUndefined();
    expect(reconcileCombatSelectionState(selected, viewModel([card({ validTargetIds: [] })])).selectedCardId).toBeUndefined();
  });
});
