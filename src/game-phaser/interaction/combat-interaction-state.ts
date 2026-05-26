import type { CardInstanceId, CombatantId } from "../../game-core";
import type { CombatCardViewModel, CombatViewModel } from "../view-models/combat-view-model";

export type CombatInteractionState = {
  readonly selectedCardId?: CardInstanceId;
  readonly selectedCardRevision?: number;
  readonly keyboardTargetId?: CombatantId;
  readonly hoveredCardId?: CardInstanceId;
};

export const createCombatInteractionState = (): CombatInteractionState => ({});

export const clearCombatSelection = (
  state: CombatInteractionState
): CombatInteractionState => ({
  ...state,
  selectedCardId: undefined,
  selectedCardRevision: undefined,
  keyboardTargetId: undefined,
  hoveredCardId: undefined
});

export const selectCombatCard = (
  state: CombatInteractionState,
  cardInstanceId: CardInstanceId,
  revision: number,
  keyboardTargetId?: CombatantId
): CombatInteractionState => ({
  ...state,
  selectedCardId: cardInstanceId,
  selectedCardRevision: revision,
  keyboardTargetId,
  hoveredCardId: undefined
});

export const setHoveredCombatCard = (
  state: CombatInteractionState,
  hoveredCardId: CardInstanceId | undefined
): CombatInteractionState => ({
  ...state,
  hoveredCardId
});

export const getInteractionCard = (
  state: CombatInteractionState,
  viewModel: CombatViewModel
): CombatCardViewModel | undefined => {
  const cardId = state.selectedCardId ?? state.hoveredCardId;

  return cardId ? viewModel.hand.find((card) => card.cardInstanceId === cardId) : undefined;
};

export const reconcileCombatInteractionState = (
  state: CombatInteractionState,
  viewModel: CombatViewModel
): CombatInteractionState => {
  if (!state.selectedCardId) {
    return state;
  }

  const selectedCard = viewModel.hand.find((card) => card.cardInstanceId === state.selectedCardId);
  if (!selectedCard?.playable || selectedCard.playMode !== "selectEnemy") {
    return clearCombatSelection(state);
  }

  const keyboardTargetId = state.keyboardTargetId && selectedCard.validTargetIds.includes(state.keyboardTargetId)
    ? state.keyboardTargetId
    : selectedCard.validTargetIds[0];

  return {
    ...state,
    keyboardTargetId
  };
};
