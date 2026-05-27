import type { CombatViewModel } from "../view-models/combat-view-model";

export type CombatInputLockReason =
  | "submitting"
  | "playback"
  | "detail_open"
  | "paused"
  | "browser_blur"
  | "combat_ended"
  | "enemy_turn";

export type CombatInputLockState = {
  readonly inputLocked: boolean;
  readonly inputLockReason?: CombatInputLockReason;
};

export type ResolveCombatInputLockStateInput = {
  readonly submitting: boolean;
  readonly playbackLocked: boolean;
  readonly detailOpen: boolean;
  readonly pauseOpen: boolean;
  readonly browserFocused: boolean;
  readonly viewModelPhase?: CombatViewModel["phase"];
};

export const resolveCombatInputLockState = ({
  submitting,
  playbackLocked,
  detailOpen,
  pauseOpen,
  browserFocused,
  viewModelPhase
}: ResolveCombatInputLockStateInput): CombatInputLockState => {
  if (submitting) {
    return { inputLocked: true, inputLockReason: "submitting" };
  }

  if (playbackLocked) {
    return { inputLocked: true, inputLockReason: "playback" };
  }

  if (detailOpen) {
    return { inputLocked: true, inputLockReason: "detail_open" };
  }

  if (pauseOpen) {
    return { inputLocked: true, inputLockReason: "paused" };
  }

  if (!browserFocused) {
    return { inputLocked: true, inputLockReason: "browser_blur" };
  }

  if (viewModelPhase === "won" || viewModelPhase === "lost") {
    return { inputLocked: true, inputLockReason: "combat_ended" };
  }

  if (viewModelPhase === "enemy_turn") {
    return { inputLocked: true, inputLockReason: "enemy_turn" };
  }

  return { inputLocked: false };
};
