import { describe, expect, it } from "vitest";
import { CARD_FRAME_ZONES, CARD_SIZE } from "../../src/game-phaser/layout/hand-layout";

describe("card frame grammar", () => {
  it("defines stable replacement zones inside the generated card frame", () => {
    expect(CARD_FRAME_ZONES).toMatchObject({
      rarityGemSocket: expect.objectContaining({ width: 18, height: 18 }),
      costSocket: expect.objectContaining({ width: 46, height: 46 }),
      titleBand: expect.objectContaining({ width: CARD_SIZE.width - 18 }),
      familyBadge: expect.objectContaining({ height: 26 }),
      sourceBadge: expect.objectContaining({ height: 26 }),
      artWindow: expect.objectContaining({ height: 76 }),
      rulesTextBox: expect.objectContaining({ height: 82 }),
      tagRow: expect.objectContaining({ height: 24 })
    });
  });
});
