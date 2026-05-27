import { describe, expect, it } from "vitest";
import { cardId, cardInstanceId, combatantId } from "../../src/game-core";
import {
  closeCombatDetailOverlay,
  closeCombatPauseOverlay,
  createCombatOverlayState,
  openCombatDetailOverlay,
  openCombatPauseOverlay,
  setCombatOverlayTooltip,
  shouldCombatOverlayConsumePointer
} from "../../src/game-phaser/interaction/combat-overlay-state";
import { selectCombatCard } from "../../src/game-phaser/interaction/combat-selection-state";
import type { CombatCardViewModel, CombatViewModel } from "../../src/game-phaser/view-models/combat-view-model";

const enemyId = combatantId("monster:0");
const detail = { title: "Strike", lines: ["Deal damage."] };
const tooltip = { title: "Strike", body: "Deal damage.", x: 10, y: 10 };

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
  detail,
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

describe("combat overlay state", () => {
  it("opens detail by preserving selection, clearing tooltip, and consuming board input", () => {
    const selection = selectCombatCard({}, cardInstanceId("card:1"), 3, enemyId);
    const withTooltip = setCombatOverlayTooltip(createCombatOverlayState(), tooltip);
    const opened = openCombatDetailOverlay(withTooltip, detail, selection);

    expect(opened.detail).toBe(detail);
    expect(opened.pauseOpen).toBe(false);
    expect(opened.tooltip).toBeUndefined();
    expect(opened.preservedSelection).toEqual(selection);
    expect(shouldCombatOverlayConsumePointer(opened)).toBe(true);
  });

  it("restores preserved detail selection only when valid against the latest view model", () => {
    const selection = selectCombatCard({}, cardInstanceId("card:1"), 3, enemyId);
    const opened = openCombatDetailOverlay(createCombatOverlayState(), detail, selection);

    expect(closeCombatDetailOverlay(opened, viewModel([card()])).selection).toMatchObject({
      selectedCardId: cardInstanceId("card:1"),
      focusedTargetId: enemyId
    });
    expect(closeCombatDetailOverlay(opened, viewModel([])).selection.selectedCardId).toBeUndefined();
  });

  it("keeps pause separate from detail and closes pause without changing detail state", () => {
    const selection = selectCombatCard({}, cardInstanceId("card:1"), 3, enemyId);
    const openedDetail = openCombatDetailOverlay(createCombatOverlayState(), detail, {});
    expect(openCombatPauseOverlay(openedDetail, selection)).toEqual(openedDetail);

    const paused = openCombatPauseOverlay(createCombatOverlayState(), selection);
    expect(paused.pauseOpen).toBe(true);
    const closed = closeCombatPauseOverlay(paused, viewModel([card()]));
    expect(closed.overlay.pauseOpen).toBe(false);
    expect(closed.selection).toMatchObject({
      selectedCardId: cardInstanceId("card:1"),
      focusedTargetId: enemyId
    });
  });
});
