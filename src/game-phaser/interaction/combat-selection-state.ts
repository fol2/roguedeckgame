import type { CardInstanceId, CombatantId } from "../../game-core";
import type { CombatCardViewModel, CombatViewModel } from "../view-models/combat-view-model";

export type CombatSelectionState = {
  readonly selectedCardId?: CardInstanceId;
  readonly selectedCardRevision?: number;
  readonly hoveredCardId?: CardInstanceId;
  readonly focusedTargetId?: CombatantId;
  readonly hoveredTargetId?: CombatantId;
};

export const createCombatSelectionState = (): CombatSelectionState => ({});

export const clearCombatSelection = (
  _state: CombatSelectionState
): CombatSelectionState => ({});

export const clearSelectedCombatCard = (
  state: CombatSelectionState
): CombatSelectionState => ({
  ...(state.hoveredCardId ? { hoveredCardId: state.hoveredCardId } : {}),
  ...(state.hoveredTargetId ? { hoveredTargetId: state.hoveredTargetId } : {})
});

export const selectCombatCard = (
  state: CombatSelectionState,
  cardInstanceId: CardInstanceId,
  revision: number,
  focusedTargetId?: CombatantId
): CombatSelectionState => ({
  ...state,
  selectedCardId: cardInstanceId,
  selectedCardRevision: revision,
  focusedTargetId,
  hoveredCardId: undefined,
  hoveredTargetId: undefined
});

export const setHoveredCombatCard = (
  state: CombatSelectionState,
  hoveredCardId: CardInstanceId | undefined
): CombatSelectionState => ({
  ...state,
  hoveredCardId
});

export const setHoveredCombatTarget = (
  state: CombatSelectionState,
  hoveredTargetId: CombatantId | undefined
): CombatSelectionState => ({
  ...state,
  hoveredTargetId
});

export const getInteractionCard = (
  state: CombatSelectionState,
  viewModel: CombatViewModel
): CombatCardViewModel | undefined => {
  const cardId = state.selectedCardId ?? state.hoveredCardId;

  return cardId ? viewModel.hand.find((card) => card.cardInstanceId === cardId) : undefined;
};

export const getSelectedCombatCard = (
  state: CombatSelectionState,
  viewModel: CombatViewModel
): CombatCardViewModel | undefined =>
  state.selectedCardId
    ? viewModel.hand.find((card) => card.cardInstanceId === state.selectedCardId)
    : undefined;

const isAliveCombatant = (
  combatantId: CombatantId | undefined,
  viewModel: CombatViewModel
): combatantId is CombatantId => {
  if (!combatantId) {
    return false;
  }

  if (viewModel.player.id === combatantId) {
    return viewModel.player.alive;
  }

  return viewModel.monsters.some((combatant) => combatant.id === combatantId && combatant.alive);
};

export const isSelectedCombatCardRestorable = (
  state: CombatSelectionState,
  viewModel: CombatViewModel
): boolean => {
  const selectedCard = getSelectedCombatCard(state, viewModel);

  return Boolean(
    selectedCard?.playable &&
    selectedCard.playMode === "selectEnemy" &&
    selectedCard.requiresManualTarget &&
    selectedCard.validTargetIds.length > 0
  );
};

export const reconcileCombatSelectionState = (
  state: CombatSelectionState,
  viewModel: CombatViewModel
): CombatSelectionState => {
  const hoveredCardId = state.hoveredCardId && viewModel.hand.some((card) => card.cardInstanceId === state.hoveredCardId)
    ? state.hoveredCardId
    : undefined;
  const hoveredTargetId = isAliveCombatant(state.hoveredTargetId, viewModel)
    ? state.hoveredTargetId
    : undefined;

  if (!state.selectedCardId) {
    return {
      ...(hoveredCardId ? { hoveredCardId } : {}),
      ...(hoveredTargetId ? { hoveredTargetId } : {})
    };
  }

  const selectedCard = viewModel.hand.find((card) => card.cardInstanceId === state.selectedCardId);
  if (
    !selectedCard?.playable ||
    selectedCard.playMode !== "selectEnemy" ||
    !selectedCard.requiresManualTarget ||
    selectedCard.validTargetIds.length === 0
  ) {
    return {
      ...(hoveredCardId ? { hoveredCardId } : {}),
      ...(hoveredTargetId ? { hoveredTargetId } : {})
    };
  }

  const focusedTargetId = state.focusedTargetId && selectedCard.validTargetIds.includes(state.focusedTargetId)
    ? state.focusedTargetId
    : selectedCard.validTargetIds[0];

  return {
    ...state,
    hoveredCardId,
    hoveredTargetId,
    focusedTargetId
  };
};

export const restoreCombatSelectionState = (
  preservedSelection: CombatSelectionState | undefined,
  viewModel: CombatViewModel
): CombatSelectionState => {
  if (!preservedSelection) {
    return createCombatSelectionState();
  }

  const reconciled = reconcileCombatSelectionState(preservedSelection, viewModel);

  return isSelectedCombatCardRestorable(reconciled, viewModel)
    ? reconciled
    : createCombatSelectionState();
};

export const cycleFocusedCombatTarget = (
  state: CombatSelectionState,
  validTargetIds: readonly CombatantId[]
): CombatSelectionState => {
  if (validTargetIds.length === 0) {
    return {
      ...state,
      focusedTargetId: undefined
    };
  }

  const currentIndex = Math.max(0, validTargetIds.findIndex((targetId) => targetId === state.focusedTargetId));
  const nextIndex = (currentIndex + 1) % validTargetIds.length;

  return {
    ...state,
    focusedTargetId: validTargetIds[nextIndex]
  };
};
