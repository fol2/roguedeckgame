import type {
  CombatDetailPanel,
  CombatTooltip
} from "../presenters/CombatOverlayPresenter";
import type { CombatViewModel } from "../view-models/combat-view-model";
import {
  createCombatSelectionState,
  restoreCombatSelectionState,
  type CombatSelectionState
} from "./combat-selection-state";

export type CombatOverlayState = {
  readonly detail?: CombatDetailPanel;
  readonly pauseOpen: boolean;
  readonly tooltip?: CombatTooltip;
  readonly pendingTooltip?: CombatTooltip;
  readonly preservedSelection?: CombatSelectionState;
};

export type CloseCombatOverlayResult = {
  readonly overlay: CombatOverlayState;
  readonly selection: CombatSelectionState;
};

export const createCombatOverlayState = (): CombatOverlayState => ({
  pauseOpen: false
});

export const isCombatOverlayOpen = (overlay: CombatOverlayState): boolean =>
  overlay.detail !== undefined || overlay.pauseOpen;

export const clearCombatOverlayTooltip = (
  overlay: CombatOverlayState
): CombatOverlayState => ({
  ...overlay,
  tooltip: undefined,
  pendingTooltip: undefined
});

export const setCombatOverlayTooltip = (
  overlay: CombatOverlayState,
  tooltip: CombatTooltip | undefined
): CombatOverlayState => {
  if (!tooltip || isCombatOverlayOpen(overlay)) {
    return clearCombatOverlayTooltip(overlay);
  }

  return {
    ...overlay,
    tooltip,
    pendingTooltip: undefined
  };
};

export const setCombatOverlayPendingTooltip = (
  overlay: CombatOverlayState,
  tooltip: CombatTooltip
): CombatOverlayState => isCombatOverlayOpen(overlay)
  ? clearCombatOverlayTooltip(overlay)
  : {
      ...overlay,
      tooltip: undefined,
      pendingTooltip: tooltip
    };

export const revealCombatOverlayPendingTooltip = (
  overlay: CombatOverlayState
): CombatOverlayState => ({
  ...overlay,
  tooltip: overlay.pendingTooltip,
  pendingTooltip: undefined
});

export const openCombatDetailOverlay = (
  overlay: CombatOverlayState,
  detail: CombatDetailPanel,
  selection: CombatSelectionState
): CombatOverlayState => ({
  ...clearCombatOverlayTooltip(overlay),
  detail,
  pauseOpen: false,
  preservedSelection: selection.selectedCardId ? selection : undefined
});

export const closeCombatDetailOverlay = (
  overlay: CombatOverlayState,
  viewModel: CombatViewModel | undefined
): CloseCombatOverlayResult => {
  const baseOverlay: CombatOverlayState = {
    ...overlay,
    detail: undefined,
    preservedSelection: undefined
  };

  if (!viewModel) {
    return {
      overlay: baseOverlay,
      selection: createCombatSelectionState()
    };
  }

  return {
    overlay: baseOverlay,
    selection: restoreCombatSelectionState(overlay.preservedSelection, viewModel)
  };
};

export const openCombatPauseOverlay = (
  overlay: CombatOverlayState,
  selection: CombatSelectionState
): CombatOverlayState =>
  overlay.detail
    ? overlay
    : {
        ...clearCombatOverlayTooltip(overlay),
        pauseOpen: true,
        preservedSelection: selection.selectedCardId ? selection : overlay.preservedSelection
      };

export const closeCombatPauseOverlay = (
  overlay: CombatOverlayState,
  viewModel: CombatViewModel | undefined
): CloseCombatOverlayResult => {
  const baseOverlay = {
    ...overlay,
    pauseOpen: false,
    preservedSelection: undefined
  };

  if (!viewModel) {
    return {
      overlay: baseOverlay,
      selection: createCombatSelectionState()
    };
  }

  return {
    overlay: baseOverlay,
    selection: restoreCombatSelectionState(overlay.preservedSelection, viewModel)
  };
};

export const shouldCombatOverlayConsumePointer = (
  overlay: CombatOverlayState
): boolean => isCombatOverlayOpen(overlay);
