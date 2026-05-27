import { describe, expect, it } from "vitest";
import { CARD_FRAME_ZONES, CARD_SIZE } from "../../src/game-phaser/layout/hand-layout";

describe("card frame grammar", () => {
  it("defines stable replacement zones inside the placeholder card frame", () => {
    expect(CARD_FRAME_ZONES).toMatchObject({
      costSocket: expect.objectContaining({ width: 26, height: 26 }),
      titleBand: expect.objectContaining({ width: CARD_SIZE.width - 10 }),
      familyBadge: expect.objectContaining({ height: 17 }),
      artWindow: expect.objectContaining({ height: 30 }),
      rulesTextBox: expect.objectContaining({ height: 42 }),
      tagRow: expect.objectContaining({ height: 14 })
    });
  });
});
