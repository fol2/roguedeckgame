import { describe, expect, it } from "vitest";
import { CARD_FRAME_ZONES, CARD_SIZE } from "../../src/game-phaser/layout/hand-layout";

describe("card frame grammar", () => {
  it("defines stable replacement zones inside the generated card frame", () => {
    expect(CARD_FRAME_ZONES).toMatchObject({
      rarityGemSocket: expect.objectContaining({ width: 22, height: 22 }),
      costSocket: expect.objectContaining({ width: 36, height: 36 }),
      titleBand: expect.objectContaining({ width: CARD_SIZE.width - 18 }),
      familyBadge: expect.objectContaining({ height: 20 }),
      sourceBadge: expect.objectContaining({ height: 20 }),
      artWindow: expect.objectContaining({ height: 92 }),
      rulesTextBox: expect.objectContaining({ height: 70 }),
      tagRow: expect.objectContaining({ height: 24 })
    });
    expect(CARD_FRAME_ZONES.rarityGemSocket.x + CARD_FRAME_ZONES.rarityGemSocket.width / 2)
      .toBeLessThan(-CARD_SIZE.width / 2 + 36);
    expect(CARD_FRAME_ZONES.costSocket.x - CARD_FRAME_ZONES.costSocket.width / 2)
      .toBeGreaterThan(42);
    expect(CARD_FRAME_ZONES.artWindow.height).toBeGreaterThan(CARD_FRAME_ZONES.titleBand.height * 2);
  });
});
