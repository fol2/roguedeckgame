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
      marked: CombatAssetKeys.icons.statusMarked,
      ready: CombatAssetKeys.icons.statusReady,
      commanded: CombatAssetKeys.icons.statusCommanded,
      obscured: CombatAssetKeys.icons.statusObscured,
      scoped: CombatAssetKeys.icons.statusScoped,
      revealed: CombatAssetKeys.icons.statusRevealed,
      bound: CombatAssetKeys.icons.statusBound,
      overflow: CombatAssetKeys.icons.statusOverflow,
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
      combo: CombatAssetKeys.icons.tagCombo,
      keeper: CombatAssetKeys.icons.tagKeeper,
      signal: CombatAssetKeys.icons.tagSignal,
      scout: CombatAssetKeys.icons.tagScout,
      fetch: CombatAssetKeys.icons.tagFetch,
      reveal: CombatAssetKeys.icons.tagReveal,
      scope: CombatAssetKeys.icons.tagScope,
      obscure: CombatAssetKeys.icons.tagObscure,
      rare: CombatAssetKeys.icons.tagRare,
      fallback: CombatAssetKeys.icons.tagFallback
    });
  });
});
