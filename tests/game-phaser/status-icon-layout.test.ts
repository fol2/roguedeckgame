import { describe, expect, it } from "vitest";
import { CombatAssetKeys } from "../../src/game-phaser/assets/combat-asset-keys";
import { STATUS_ICON_LAYOUT } from "../../src/game-phaser/layout/status-icon-layout";
import { COMBAT_UI_CAPS } from "../../src/game-phaser/layout/combat-ui-caps";

describe("status and tag icon asset layout", () => {
  it("mirrors combat UI visibility caps", () => {
    expect(STATUS_ICON_LAYOUT.visibleCaps).toEqual({
      enemyStatuses: COMBAT_UI_CAPS.maxEnemyVisibleStatuses,
      playerStatuses: COMBAT_UI_CAPS.maxPlayerVisibleStatuses,
      petStatuses: COMBAT_UI_CAPS.maxPetVisibleStatuses,
      cardTags: COMBAT_UI_CAPS.maxCardVisibleTags
    });
  });

  it("defines required status and tag fallback keys", () => {
    expect(STATUS_ICON_LAYOUT.statusIconKeys).toMatchObject({
      burn: CombatAssetKeys.icons.statusBurn,
      block: CombatAssetKeys.icons.statusBlock,
      guard: CombatAssetKeys.icons.statusGuard,
      empowered: CombatAssetKeys.icons.statusEmpowered,
      fallback: CombatAssetKeys.icons.statusFallback
    });
    expect(STATUS_ICON_LAYOUT.tagIconKeys).toMatchObject({
      petCommand: CombatAssetKeys.icons.tagPetCommand,
      fox: CombatAssetKeys.icons.tagFox,
      burn: CombatAssetKeys.icons.tagBurn,
      guard: CombatAssetKeys.icons.tagGuard,
      block: CombatAssetKeys.icons.tagBlock,
      draw: CombatAssetKeys.icons.tagDraw,
      mark: CombatAssetKeys.icons.tagMark,
      attack: CombatAssetKeys.icons.tagAttack,
      setup: CombatAssetKeys.icons.tagSetup,
      combo: CombatAssetKeys.icons.tagCombo
    });
  });
});
