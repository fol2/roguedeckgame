import { describe, expect, it } from "vitest";
import { CombatAssetKeys } from "../../src/game-phaser/assets/combat-asset-keys";
import {
  COMBAT_CODE_RENDERED_PLACEHOLDER_KEY,
  CombatFallbackAssetKeys,
  resolveCombatDetailCopy,
  resolveCombatIconDescriptor,
  resolveCombatTexture,
  resolveCombatTextureKey,
  resolveCombatTooltipCopy
} from "../../src/game-phaser/assets/combat-fallback-assets";

const availability = (availableKeys: readonly string[]) => ({
  hasTexture: (key: string) => availableKeys.includes(key)
});

describe("combat fallback assets", () => {
  it("uses the requested texture when it exists", () => {
    expect(resolveCombatTexture(
      CombatAssetKeys.icons.intentAttack,
      CombatFallbackAssetKeys.icon,
      availability([CombatAssetKeys.icons.intentAttack])
    )).toMatchObject({
      kind: "texture",
      key: CombatAssetKeys.icons.intentAttack,
      fallbackUsed: false
    });
  });

  it("uses the fallback texture when the requested texture is missing", () => {
    expect(resolveCombatTexture(
      CombatAssetKeys.icons.intentAttack,
      CombatFallbackAssetKeys.icon,
      availability([CombatFallbackAssetKeys.icon])
    )).toMatchObject({
      kind: "texture",
      key: CombatFallbackAssetKeys.icon,
      fallbackUsed: true
    });
  });

  it("returns a code-rendered placeholder instruction when requested and fallback textures are missing", () => {
    expect(resolveCombatTexture(
      CombatAssetKeys.cardFrames.petCommand,
      CombatFallbackAssetKeys.cardFrame,
      availability([])
    )).toMatchObject({
      kind: "code-rendered-placeholder",
      placeholderKey: COMBAT_CODE_RENDERED_PLACEHOLDER_KEY
    });
    expect(resolveCombatTextureKey(
      CombatAssetKeys.cardFrames.petCommand,
      CombatFallbackAssetKeys.cardFrame,
      availability([])
    )).toBe(COMBAT_CODE_RENDERED_PLACEHOLDER_KEY);
  });

  it("resolves missing icon and tooltip fallbacks centrally", () => {
    expect(resolveCombatIconDescriptor({
      requestedKey: CombatAssetKeys.icons.statusBurn,
      glyph: "B",
      assets: availability([])
    })).toMatchObject({
      kind: "code-rendered-glyph",
      glyph: "B"
    });
    expect(resolveCombatTooltipCopy({ title: "", body: "" })).toEqual({
      title: "Combat detail",
      body: "No details available yet."
    });
    expect(resolveCombatDetailCopy({ title: "", lines: [] })).toEqual({
      title: "Combat detail",
      subtitle: "Combat detail",
      lines: ["No details available yet."],
      footer: "Combat detail."
    });
  });
});
