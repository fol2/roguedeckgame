import { describe, expect, it } from "vitest";
import { cardId, cardInstanceId, combatantId } from "../../src/game-core";
import {
  handleCombatKeyboardInput,
  type CombatKeyboardInputContext
} from "../../src/game-phaser/interaction/combat-keyboard-input";
import { selectCombatCard, type CombatSelectionState } from "../../src/game-phaser/interaction/combat-selection-state";
import type { CombatCardViewModel, CombatViewModel } from "../../src/game-phaser/view-models/combat-view-model";

const firstEnemyId = combatantId("monster:0");
const secondEnemyId = combatantId("monster:1");
const selectedCardId = cardInstanceId("card:1");

const targetCard = (): CombatCardViewModel => ({
  cardInstanceId: selectedCardId,
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
  validTargetIds: [firstEnemyId, secondEnemyId]
});

const viewModel = (): CombatViewModel => ({
  hand: [targetCard()]
} as unknown as CombatViewModel);

const keyEvent = (key: string): KeyboardEvent => ({
  key,
  preventDefault: () => undefined
} as KeyboardEvent);

const context = (overrides: Partial<CombatKeyboardInputContext> = {}) => {
  const calls: string[] = [];
  let selection: CombatSelectionState = selectCombatCard({}, selectedCardId, 1, firstEnemyId);
  const base: CombatKeyboardInputContext = {
    detailOpen: false,
    pauseOpen: false,
    selectedCardId,
    hoveredCardId: undefined,
    focusedTargetId: firstEnemyId,
    debugOverlayAvailable: false,
    debugOverlayEnabled: false,
    inputLocked: false,
    getViewModel: () => viewModel(),
    getSelectionState: () => selection,
    applySelectionState: (state) => {
      selection = state;
      calls.push("applySelectionState");
    },
    closeDetail: () => calls.push("closeDetail"),
    closePauseOverlay: () => calls.push("closePauseOverlay"),
    clearSelectedCard: () => calls.push("clearSelectedCard"),
    renderCurrentState: () => calls.push("renderCurrentState"),
    handleTurnEnd: async () => {
      calls.push("handleTurnEnd");
    },
    openCardDetail: () => calls.push("openCardDetail"),
    setDebugOverlayEnabled: () => calls.push("setDebugOverlayEnabled"),
    writeDebugOverlayPreference: () => calls.push("writeDebugOverlayPreference"),
    copyDebugEventBatchJson: async () => {
      calls.push("copyDebugEventBatchJson");
    },
    copyDebugTraceJson: async () => {
      calls.push("copyDebugTraceJson");
    },
    handleCardSelection: async () => {
      calls.push("handleCardSelection");
    },
    handleMonsterSelection: async (monsterId) => {
      calls.push(`handleMonsterSelection:${monsterId}`);
    },
    ...overrides
  };

  return {
    calls,
    context: base,
    get selection() {
      return selection;
    }
  };
};

describe("combat keyboard input", () => {
  it("uses Esc priority: detail, pause, then selection", async () => {
    const withDetail = context({ detailOpen: true, pauseOpen: true });
    await handleCombatKeyboardInput(keyEvent("Escape"), withDetail.context);
    expect(withDetail.calls).toEqual(["closeDetail"]);

    const withPause = context({ pauseOpen: true });
    await handleCombatKeyboardInput(keyEvent("Escape"), withPause.context);
    expect(withPause.calls).toEqual(["closePauseOverlay"]);

    const withSelection = context();
    await handleCombatKeyboardInput(keyEvent("Escape"), withSelection.context);
    expect(withSelection.calls).toEqual(["clearSelectedCard", "renderCurrentState"]);
  });

  it("routes Space through the guarded turn-end path and blocks action keys while locked", async () => {
    const targeting = context();
    await handleCombatKeyboardInput(keyEvent(" "), targeting.context);
    expect(targeting.calls).toEqual(["handleTurnEnd"]);

    const lockedDetail = context({ detailOpen: true, inputLocked: true });
    await handleCombatKeyboardInput(keyEvent(" "), lockedDetail.context);
    expect(lockedDetail.calls).toEqual([]);

    const lockedPause = context({ inputLocked: true, pauseOpen: true });
    await handleCombatKeyboardInput(keyEvent("Spacebar"), lockedPause.context);
    expect(lockedPause.calls).toEqual([]);

    const lockedInspect = context({ inputLocked: true });
    await handleCombatKeyboardInput(keyEvent("i"), lockedInspect.context);
    expect(lockedInspect.calls).toEqual([]);
  });

  it("cycles focus with Tab and submits the focused target with Enter", async () => {
    const tab = context();
    await handleCombatKeyboardInput(keyEvent("Tab"), tab.context);
    expect(tab.selection.focusedTargetId).toBe(secondEnemyId);
    expect(tab.calls).toEqual(["applySelectionState", "renderCurrentState"]);

    const enter = context({ focusedTargetId: secondEnemyId });
    await handleCombatKeyboardInput(keyEvent("Enter"), enter.context);
    expect(enter.calls).toEqual([`handleMonsterSelection:${secondEnemyId}`]);
  });
});
