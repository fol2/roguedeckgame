import type { CardInstanceId } from "../../game-core";
import type { CombatViewModel } from "../view-models/combat-view-model";

export type CombatPresentationMode =
  | "loading"
  | "player_turn_idle"
  | "card_hover"
  | "card_selected"
  | "targeting"
  | "detail_open"
  | "resolving_player_action"
  | "enemy_turn"
  | "combat_victory"
  | "combat_defeat"
  | "paused"
  | "browser_blur";

export type ResolveCombatPresentationModeInput = {
  readonly viewModelPhase?: CombatViewModel["phase"];
  readonly selectedCardId?: CardInstanceId;
  readonly hoveredCardId?: CardInstanceId;
  readonly selectedCardRequiresManualTarget?: boolean;
  readonly detailOpen: boolean;
  readonly pauseOpen: boolean;
  readonly submitting: boolean;
  readonly playbackLocked: boolean;
  readonly browserFocused: boolean;
};

export const resolveCombatPresentationMode = ({
  viewModelPhase,
  selectedCardId,
  hoveredCardId,
  selectedCardRequiresManualTarget,
  detailOpen,
  pauseOpen,
  submitting,
  playbackLocked,
  browserFocused
}: ResolveCombatPresentationModeInput): CombatPresentationMode => {
  if (!viewModelPhase || viewModelPhase === "not_started") {
    return "loading";
  }

  if (submitting || playbackLocked) {
    return "resolving_player_action";
  }

  if (detailOpen) {
    return "detail_open";
  }

  if (pauseOpen) {
    return "paused";
  }

  if (!browserFocused) {
    return "browser_blur";
  }

  if (viewModelPhase === "won") {
    return "combat_victory";
  }

  if (viewModelPhase === "lost") {
    return "combat_defeat";
  }

  if (viewModelPhase === "enemy_turn") {
    return "enemy_turn";
  }

  if (selectedCardId && selectedCardRequiresManualTarget) {
    return "targeting";
  }

  if (selectedCardId) {
    return "card_selected";
  }

  if (hoveredCardId) {
    return "card_hover";
  }

  return "player_turn_idle";
};
