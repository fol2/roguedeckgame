import { describe, expect, it } from "vitest";
import { CARD_FRAME_ZONES, CARD_SIZE } from "../../src/game-phaser/layout/hand-layout";

describe("card frame grammar", () => {
  it("defines stable replacement zones inside the accepted Option B generated card frame", () => {
    expect(CARD_FRAME_ZONES).toMatchObject({
      rarityGemSocket: expect.objectContaining({ width: 30, height: 30 }),
      costSocket: expect.objectContaining({ width: 38, height: 38 }),
      titleBand: expect.objectContaining({ width: 126, height: 14 }),
      artWindow: expect.objectContaining({ width: 143.5, height: 132.5 }),
      rulesTextBox: expect.objectContaining({ width: 130.5, height: 66 }),
      tagRow: expect.objectContaining({ height: 20.5 }),
      tag1: expect.objectContaining({ width: 20.5, height: 20.5 }),
      tag2: expect.objectContaining({ width: 20.5, height: 20.5 }),
      tag3: expect.objectContaining({ width: 20.5, height: 20.5 })
    });
    expect(CARD_FRAME_ZONES.rarityGemSocket.x + CARD_FRAME_ZONES.rarityGemSocket.width / 2)
      .toBeCloseTo(15);
    expect(CARD_FRAME_ZONES.costSocket.x - CARD_FRAME_ZONES.costSocket.width / 2)
      .toBeCloseTo(-76);
    expect(CARD_FRAME_ZONES.artWindow.height).toBeGreaterThan(CARD_FRAME_ZONES.titleBand.height * 8);
    expect(CARD_FRAME_ZONES.tag2.x).toBeCloseTo(0, 0);
    expect(CARD_FRAME_ZONES.tag1.x).toBeLessThan(CARD_FRAME_ZONES.tag2.x);
    expect(CARD_FRAME_ZONES.tag3.x).toBeGreaterThan(CARD_FRAME_ZONES.tag2.x);
  });
});
