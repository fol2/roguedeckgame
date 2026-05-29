import { describe, expect, it } from "vitest";
import { COMBAT_BOARD } from "../../src/game-phaser/layout/combat-layout";
import { GAME_HEIGHT } from "../../src/game-phaser/layout/game-size";
import { CARD_SIZE, HAND_LAYOUT, getHandCardPosition } from "../../src/game-phaser/layout/hand-layout";

describe("hand layout", () => {
  it("uses large readable cards that can overlap the battle zone", () => {
    expect(CARD_SIZE).toEqual({ width: 192, height: 268 });
    expect(HAND_LAYOUT.y - CARD_SIZE.height / 2).toBeLessThan(COMBAT_BOARD.y + COMBAT_BOARD.height);
    expect(HAND_LAYOUT.y + CARD_SIZE.height / 2).toBeLessThanOrEqual(GAME_HEIGHT);
  });

  it("stacks cards naturally when hand width is constrained", () => {
    const first = getHandCardPosition(0, 10);
    const second = getHandCardPosition(1, 10);
    const final = getHandCardPosition(9, 10);
    const step = second.x - first.x;

    expect(step).toBeLessThan(CARD_SIZE.width);
    expect(step).toBeGreaterThanOrEqual(HAND_LAYOUT.minOverlapStep);
    expect(final.x + CARD_SIZE.width / 2).toBeLessThanOrEqual(HAND_LAYOUT.rightX + 1);
  });
});
