import type { CardInstanceId, CombatantId } from "../../game-core";
import type { CombatViewModel } from "../view-models/combat-view-model";
import {
  cycleFocusedCombatTarget,
  type CombatSelectionState
} from "./combat-selection-state";

export type CombatKeyboardInputContext = {
  readonly detailOpen: boolean;
  readonly pauseOpen: boolean;
  readonly selectedCardId?: CardInstanceId;
  readonly hoveredCardId?: CardInstanceId;
  readonly focusedTargetId?: CombatantId;
  readonly debugOverlayAvailable: boolean;
  readonly debugOverlayEnabled: boolean;
  readonly inputLocked: boolean;
  readonly getViewModel: () => CombatViewModel | undefined;
  readonly getSelectionState: () => CombatSelectionState;
  readonly applySelectionState: (state: CombatSelectionState) => void;
  readonly closeDetail: () => void;
  readonly closePauseOverlay: () => void;
  readonly clearSelectedCard: () => void;
  readonly renderCurrentState: (syncEventLog?: boolean) => void;
  readonly handleTurnEnd: () => Promise<void>;
  readonly openCardDetail: (cardInstanceId: CardInstanceId) => void;
  readonly setDebugOverlayEnabled: (enabled: boolean) => void;
  readonly writeDebugOverlayPreference: () => void;
  readonly copyDebugEventBatchJson: () => Promise<void>;
  readonly copyDebugTraceJson: () => Promise<void>;
  readonly handleCardSelection: (cardInstanceId: CardInstanceId) => Promise<void>;
  readonly handleMonsterSelection: (monsterId: CombatantId) => Promise<void>;
};

export const handleCombatKeyboardInput = async (
  event: KeyboardEvent,
  context: CombatKeyboardInputContext
): Promise<void> => {
  if (event.key === "Escape") {
    if (context.detailOpen) {
      context.closeDetail();
      return;
    }

    if (context.pauseOpen) {
      context.closePauseOverlay();
      return;
    }

    if (context.selectedCardId) {
      context.clearSelectedCard();
      context.renderCurrentState();
    }
    return;
  }

  if (context.debugOverlayAvailable && (event.key === "`" || event.key === "F2")) {
    context.setDebugOverlayEnabled(!context.debugOverlayEnabled);
    if (typeof window !== "undefined") {
      context.writeDebugOverlayPreference();
    }
    context.renderCurrentState(false);
    return;
  }

  if (context.debugOverlayAvailable && context.debugOverlayEnabled && (event.ctrlKey || event.metaKey)) {
    const key = event.key.toLowerCase();
    if (key === "e") {
      event.preventDefault();
      await context.copyDebugEventBatchJson();
      return;
    }

    if (key === "t") {
      event.preventDefault();
      await context.copyDebugTraceJson();
      return;
    }
  }

  if (context.debugOverlayAvailable && context.debugOverlayEnabled && event.key === "F7") {
    event.preventDefault();
    await context.copyDebugEventBatchJson();
    return;
  }

  if (context.debugOverlayAvailable && context.debugOverlayEnabled && event.key === "F8") {
    event.preventDefault();
    await context.copyDebugTraceJson();
    return;
  }

  if (context.inputLocked) {
    return;
  }

  if (event.key === " " || event.key === "Spacebar") {
    await context.handleTurnEnd();
    return;
  }

  if (event.key.toLowerCase() === "i") {
    const cardId = context.hoveredCardId ?? context.selectedCardId;
    if (cardId) {
      context.openCardDetail(cardId);
    }
    return;
  }

  const viewModel = context.getViewModel();
  if (!viewModel) {
    return;
  }

  if (/^[1-9]$/.test(event.key)) {
    const index = Number(event.key) - 1;
    const card = viewModel.hand[index];
    if (card) {
      await context.handleCardSelection(card.cardInstanceId);
    }
    return;
  }

  const selectedCard = context.selectedCardId
    ? viewModel.hand.find((card) => card.cardInstanceId === context.selectedCardId)
    : undefined;
  if (!selectedCard?.requiresManualTarget || selectedCard.validTargetIds.length === 0) {
    return;
  }

  if (event.key === "Tab") {
    event.preventDefault();
    context.applySelectionState(cycleFocusedCombatTarget(context.getSelectionState(), selectedCard.validTargetIds));
    context.renderCurrentState(false);
    return;
  }

  if (event.key === "Enter") {
    await context.handleMonsterSelection(context.focusedTargetId ?? selectedCard.validTargetIds[0]!);
  }
};
