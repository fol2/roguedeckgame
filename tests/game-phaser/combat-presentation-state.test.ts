import { describe, expect, it } from "vitest";
import { cardInstanceId } from "../../src/game-core";
import { resolveCombatPresentationMode } from "../../src/game-phaser/interaction/combat-presentation-state";

describe("combat presentation state", () => {
  it("resolves presentation modes by explicit input ownership priority", () => {
    expect(resolveCombatPresentationMode({
      viewModelPhase: undefined,
      detailOpen: false,
      pauseOpen: false,
      submitting: false,
      playbackLocked: false,
      browserFocused: true
    })).toBe("loading");

    expect(resolveCombatPresentationMode({
      viewModelPhase: "player_turn",
      selectedCardId: cardInstanceId("card:1"),
      selectedCardRequiresManualTarget: true,
      detailOpen: true,
      pauseOpen: true,
      submitting: true,
      playbackLocked: true,
      browserFocused: true
    })).toBe("resolving_player_action");

    expect(resolveCombatPresentationMode({
      viewModelPhase: "player_turn",
      selectedCardId: cardInstanceId("card:1"),
      selectedCardRequiresManualTarget: true,
      detailOpen: false,
      pauseOpen: true,
      submitting: false,
      playbackLocked: true,
      browserFocused: true
    })).toBe("resolving_player_action");

    expect(resolveCombatPresentationMode({
      viewModelPhase: "player_turn",
      selectedCardId: cardInstanceId("card:1"),
      selectedCardRequiresManualTarget: true,
      detailOpen: true,
      pauseOpen: true,
      submitting: false,
      playbackLocked: false,
      browserFocused: true
    })).toBe("detail_open");

    expect(resolveCombatPresentationMode({
      viewModelPhase: "player_turn",
      selectedCardId: cardInstanceId("card:1"),
      selectedCardRequiresManualTarget: true,
      detailOpen: false,
      pauseOpen: false,
      submitting: false,
      playbackLocked: false,
      browserFocused: false
    })).toBe("browser_blur");

    expect(resolveCombatPresentationMode({
      viewModelPhase: "player_turn",
      selectedCardId: cardInstanceId("card:1"),
      selectedCardRequiresManualTarget: true,
      detailOpen: false,
      pauseOpen: false,
      submitting: true,
      playbackLocked: false,
      browserFocused: true
    })).toBe("resolving_player_action");
  });

  it("distinguishes targeting, selected, hover, enemy turn, and outcomes", () => {
    expect(resolveCombatPresentationMode({
      viewModelPhase: "player_turn",
      selectedCardId: cardInstanceId("card:1"),
      selectedCardRequiresManualTarget: true,
      detailOpen: false,
      pauseOpen: false,
      submitting: false,
      playbackLocked: false,
      browserFocused: true
    })).toBe("targeting");

    expect(resolveCombatPresentationMode({
      viewModelPhase: "player_turn",
      selectedCardId: cardInstanceId("card:1"),
      selectedCardRequiresManualTarget: false,
      detailOpen: false,
      pauseOpen: false,
      submitting: false,
      playbackLocked: false,
      browserFocused: true
    })).toBe("card_selected");

    expect(resolveCombatPresentationMode({
      viewModelPhase: "player_turn",
      hoveredCardId: cardInstanceId("card:2"),
      detailOpen: false,
      pauseOpen: false,
      submitting: false,
      playbackLocked: false,
      browserFocused: true
    })).toBe("card_hover");

    expect(resolveCombatPresentationMode({
      viewModelPhase: "enemy_turn",
      detailOpen: false,
      pauseOpen: false,
      submitting: false,
      playbackLocked: false,
      browserFocused: true
    })).toBe("enemy_turn");

    expect(resolveCombatPresentationMode({
      viewModelPhase: "won",
      detailOpen: false,
      pauseOpen: false,
      submitting: false,
      playbackLocked: false,
      browserFocused: true
    })).toBe("combat_victory");
  });
});
