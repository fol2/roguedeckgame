import { describe, expect, it } from "vitest";
import { getFixedRenderSize } from "../../src/game-phaser/layout/game-size";

describe("fixed render size", () => {
  it("matches a 2560 by 1440 viewport without browser upscaling", () => {
    expect(getFixedRenderSize(2560, 1440, 1)).toEqual({
      width: 2560,
      height: 1440,
      renderScale: 2
    });
  });

  it("uses device pixel ratio for high-DPI displays", () => {
    expect(getFixedRenderSize(1280, 720, 2)).toEqual({
      width: 2560,
      height: 1440,
      renderScale: 2
    });
  });

  it("preserves fixed 16:9 inside taller browser windows", () => {
    expect(getFixedRenderSize(1000, 900, 1)).toEqual({
      width: 1280,
      height: 720,
      renderScale: 1
    });
  });

  it("caps very large render targets", () => {
    expect(getFixedRenderSize(7680, 4320, 2)).toEqual({
      width: 5120,
      height: 2880,
      renderScale: 4
    });
  });
});
