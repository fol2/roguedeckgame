import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { CombatAssetKeys } from "../../src/game-phaser/assets/combat-asset-keys";
import {
  BATCH_01_COMBAT_ASSET_DEFINITIONS,
  COMBAT_ASSET_DEFINITIONS,
  getCombatAssetDefinition
} from "../../src/game-phaser/assets/combat-asset-registry";
import { preloadCombatAssets } from "../../src/game-phaser/assets/combat-asset-loader";

const expectedBatch01Keys = [
  ...Object.values(CombatAssetKeys.cardFrames),
  ...Object.values(CombatAssetKeys.cardRarityGems),
  ...Object.values(CombatAssetKeys.cardSourceBadges),
  ...Object.values(CombatAssetKeys.cardFamilyBadges),
  ...Object.values(CombatAssetKeys.intentTokens),
  CombatAssetKeys.icons.intentUnknown,
  CombatAssetKeys.icons.intentAttack,
  CombatAssetKeys.icons.intentDefend,
  CombatAssetKeys.icons.intentBuff,
  CombatAssetKeys.icons.intentDebuff,
  CombatAssetKeys.icons.intentSpecial,
  CombatAssetKeys.icons.intentCharging,
  CombatAssetKeys.icons.intentObscured,
  ...Object.values(CombatAssetKeys.intentMarkers),
  CombatAssetKeys.icons.statusBurn,
  CombatAssetKeys.icons.statusBlock,
  CombatAssetKeys.icons.statusGuard,
  CombatAssetKeys.icons.statusEmpowered,
  CombatAssetKeys.icons.statusMarked,
  CombatAssetKeys.icons.statusReady,
  CombatAssetKeys.icons.statusCommanded,
  CombatAssetKeys.icons.statusObscured,
  CombatAssetKeys.icons.statusScoped,
  CombatAssetKeys.icons.statusRevealed,
  CombatAssetKeys.icons.statusBound,
  CombatAssetKeys.icons.statusOverflow,
  CombatAssetKeys.icons.statusFallback,
  CombatAssetKeys.icons.tagPetCommand,
  CombatAssetKeys.icons.tagFox,
  CombatAssetKeys.icons.tagBurn,
  CombatAssetKeys.icons.tagGuard,
  CombatAssetKeys.icons.tagBlock,
  CombatAssetKeys.icons.tagDraw,
  CombatAssetKeys.icons.tagMark,
  CombatAssetKeys.icons.tagAttack,
  CombatAssetKeys.icons.tagSetup,
  CombatAssetKeys.icons.tagCombo,
  CombatAssetKeys.icons.tagKeeper,
  CombatAssetKeys.icons.tagSignal,
  CombatAssetKeys.icons.tagScout,
  CombatAssetKeys.icons.tagFetch,
  CombatAssetKeys.icons.tagReveal,
  CombatAssetKeys.icons.tagScope,
  CombatAssetKeys.icons.tagObscure,
  CombatAssetKeys.icons.tagRare,
  CombatAssetKeys.icons.tagFallback,
  ...Object.values(CombatAssetKeys.uiPanels),
  ...Object.values(CombatAssetKeys.controls),
  ...Object.values(CombatAssetKeys.slots)
] as const;

describe("combat asset registry", () => {
  it("maps every Batch 01 key exactly once", () => {
    const registeredKeys = BATCH_01_COMBAT_ASSET_DEFINITIONS.map((definition) => definition.key);

    expect([...registeredKeys].sort()).toEqual([...expectedBatch01Keys].sort());
    expect(new Set(registeredKeys).size).toBe(registeredKeys.length);
    expect(BATCH_01_COMBAT_ASSET_DEFINITIONS).toHaveLength(112);
  });

  it("uses web-root combat asset paths and points to committed runtime PNGs", () => {
    for (const definition of BATCH_01_COMBAT_ASSET_DEFINITIONS) {
      expect(definition.path).toMatch(/^assets\/combat\/.+\.png$/);
      expect(definition.path).not.toContain("public/");
      expect(definition.path).not.toMatch(/_(1x|2x|3x)\.png$/);
      expect(existsSync(join(process.cwd(), "public", definition.path))).toBe(true);
    }
  });

  it("keeps registry lookup aligned with the eager combat preload list", () => {
    expect(COMBAT_ASSET_DEFINITIONS).toEqual(BATCH_01_COMBAT_ASSET_DEFINITIONS);
    expect(getCombatAssetDefinition(CombatAssetKeys.cardFrames.petCommand)).toMatchObject({
      key: CombatAssetKeys.cardFrames.petCommand,
      path: "assets/combat/cards/frames/combat_card_frame_pet_command.png",
      batch: "batch-01-ui-readability",
      requiredForBatch: true
    });
  });

  it("preloads missing assets and skips textures already present", () => {
    const existingKey = CombatAssetKeys.cardFrames.normal;
    const loadImage = vi.fn();
    const scene = {
      textures: {
        exists: (key: string) => key === existingKey
      },
      load: {
        image: loadImage
      }
    };

    preloadCombatAssets(scene as never);

    expect(loadImage).not.toHaveBeenCalledWith(existingKey, expect.any(String));
    expect(loadImage).toHaveBeenCalledWith(
      CombatAssetKeys.cardFrames.petCommand,
      "assets/combat/cards/frames/combat_card_frame_pet_command.png"
    );
    expect(loadImage).toHaveBeenCalledTimes(BATCH_01_COMBAT_ASSET_DEFINITIONS.length - 1);
  });
});
