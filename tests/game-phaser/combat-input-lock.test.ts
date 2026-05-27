import { describe, expect, it } from "vitest";
import {
  resolveCombatInputLockState,
  type ResolveCombatInputLockStateInput
} from "../../src/game-phaser/interaction/combat-input-lock";

const lock = (overrides: Partial<ResolveCombatInputLockStateInput> = {}) =>
  resolveCombatInputLockState({
    submitting: false,
    playbackLocked: false,
    detailOpen: false,
    pauseOpen: false,
    browserFocused: true,
    ...overrides
  });

describe("combat input lock", () => {
  it("uses the documented priority so gameplay submits cannot slip through", () => {
    expect(lock({
      submitting: true,
      playbackLocked: true,
      detailOpen: true,
      pauseOpen: true,
      browserFocused: false,
      viewModelPhase: "won"
    }).inputLockReason).toBe("submitting");
    expect(lock({ playbackLocked: true, detailOpen: true, pauseOpen: true, browserFocused: false }).inputLockReason).toBe("playback");
    expect(lock({ detailOpen: true, pauseOpen: true, browserFocused: false }).inputLockReason).toBe("detail_open");
    expect(lock({ pauseOpen: true, browserFocused: false }).inputLockReason).toBe("paused");
    expect(lock({ browserFocused: false, viewModelPhase: "won" }).inputLockReason).toBe("browser_blur");
    expect(lock({ viewModelPhase: "won" }).inputLockReason).toBe("combat_ended");
    expect(lock({ viewModelPhase: "enemy_turn" }).inputLockReason).toBe("enemy_turn");
    expect(lock({ viewModelPhase: "player_turn" })).toEqual({ inputLocked: false });
  });
});
