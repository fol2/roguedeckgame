export {
  clearCombatSelection,
  clearSelectedCombatCard,
  createCombatSelectionState as createCombatInteractionState,
  cycleFocusedCombatTarget,
  getInteractionCard,
  getSelectedCombatCard,
  isSelectedCombatCardRestorable,
  reconcileCombatSelectionState as reconcileCombatInteractionState,
  restoreCombatSelectionState,
  selectCombatCard,
  setHoveredCombatCard,
  setHoveredCombatTarget,
  type CombatSelectionState as CombatInteractionState
} from "./combat-selection-state";

export {
  resolveCombatInputLockState,
  type CombatInputLockReason,
  type CombatInputLockState,
  type ResolveCombatInputLockStateInput
} from "./combat-input-lock";
