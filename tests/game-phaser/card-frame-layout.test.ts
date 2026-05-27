import { describe, expect, it } from "vitest";
import { CARD_FRAME_ASSET_SPEC } from "../../src/game-phaser/layout/card-frame-layout";
import { CARD_FRAME_ZONES, CARD_SIZE } from "../../src/game-phaser/layout/hand-layout";

describe("card frame asset layout", () => {
  it("preserves the 5:7 replacement contract around the current 1x card display", () => {
    expect(CARD_FRAME_ASSET_SPEC.ratio).toEqual({ width: 5, height: 7 });
    expect(CARD_FRAME_ASSET_SPEC.display).toEqual(CARD_SIZE);
    expect(CARD_FRAME_ASSET_SPEC.exportSizes.twoX).toEqual({
      width: CARD_SIZE.width * 2,
      height: CARD_SIZE.height * 2
    });
    expect(CARD_FRAME_ASSET_SPEC.exportSizes.threeX).toEqual({
      width: CARD_SIZE.width * 3,
      height: CARD_SIZE.height * 3
    });
    expect(CARD_FRAME_ASSET_SPEC.display.width / CARD_FRAME_ASSET_SPEC.display.height)
      .toBeCloseTo(5 / 7, 1);
  });

  it("keeps dynamic text zones separated from asset-backed replacement zones", () => {
    expect(CARD_FRAME_ASSET_SPEC.zones).toBe(CARD_FRAME_ZONES);
    expect(CARD_FRAME_ASSET_SPEC.dynamicCodeRenderedZones).toEqual([
      "costSocket",
      "titleBand",
      "rulesTextBox",
      "tagRow"
    ]);
    expect(CARD_FRAME_ASSET_SPEC.assetBackedZones).toEqual([
      "familyBadge",
      "artWindow"
    ]);
  });
});
