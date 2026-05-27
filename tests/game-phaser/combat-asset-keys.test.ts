import { describe, expect, it } from "vitest";
import {
  CombatAssetKeys,
  getCombatAssetKeys,
  getCombatAssetKeysForGroup
} from "../../src/game-phaser/assets/combat-asset-keys";

describe("combat asset keys", () => {
  it("groups stable combat replacement points", () => {
    expect(CombatAssetKeys).toMatchObject({
      backgrounds: expect.any(Object),
      uiPanels: expect.any(Object),
      cardFrames: expect.any(Object),
      icons: expect.any(Object),
      combatants: expect.any(Object),
      slots: expect.any(Object),
      vfx: expect.any(Object)
    });
    expect(getCombatAssetKeysForGroup("cardFrames")).toContain(CombatAssetKeys.cardFrames.petCommand);
    expect(getCombatAssetKeysForGroup("vfx")).toContain(CombatAssetKeys.vfx.commandThread);
  });

  it("defines manifest-required HUD, pet, enemy, and overlay replacement points", () => {
    expect(getCombatAssetKeys()).toEqual(expect.arrayContaining([
      CombatAssetKeys.uiPanels.playerPortraitFrame,
      CombatAssetKeys.uiPanels.playerHpBarTrack,
      CombatAssetKeys.uiPanels.playerHpBarFillMask,
      CombatAssetKeys.uiPanels.playerBlockBadge,
      CombatAssetKeys.uiPanels.playerStatusTray,
      CombatAssetKeys.uiPanels.playerHoverFrame,
      CombatAssetKeys.uiPanels.detailCloseButton,
      CombatAssetKeys.uiPanels.clickBlockerTint,
      CombatAssetKeys.slots.petRing,
      CombatAssetKeys.slots.petCommandGlow,
      CombatAssetKeys.slots.petStatusTray,
      CombatAssetKeys.slots.inactivePetSlot,
      CombatAssetKeys.slots.enemySpriteSafeBox,
      CombatAssetKeys.slots.enemyIntentTokenAnchor,
      CombatAssetKeys.slots.enemyTargetRing,
      CombatAssetKeys.slots.enemyHpBarTrack,
      CombatAssetKeys.slots.enemyHpBarFillMask,
      CombatAssetKeys.slots.enemyBlockBadge,
      CombatAssetKeys.slots.enemyStatusTray,
      CombatAssetKeys.controls.energyOrb,
      CombatAssetKeys.controls.drawPile,
      CombatAssetKeys.controls.discardPile,
      CombatAssetKeys.controls.endTurnButton
    ]));
  });

  it("keeps Phase 1 exclusions out of the runtime key contract", () => {
    const keys = getCombatAssetKeys().join("\n");

    expect(keys).not.toMatch(/pet.*hp|hp.*pet/i);
    expect(keys).not.toMatch(/charge.*pip|pip.*charge/i);
    expect(keys).not.toMatch(/enemy.*battlefield.*card|battlefield.*enemy.*card/i);
    expect(keys).not.toMatch(/hitbox/i);
    expect(keys).not.toMatch(/pet.*target/i);
  });
});
