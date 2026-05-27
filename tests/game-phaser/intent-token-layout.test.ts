import { describe, expect, it } from "vitest";
import { CombatAssetKeys } from "../../src/game-phaser/assets/combat-asset-keys";
import { INTENT_TOKEN_LAYOUT } from "../../src/game-phaser/layout/intent-token-layout";
import { MONSTER_SLOT } from "../../src/game-phaser/layout/combat-layout";

describe("intent token asset layout", () => {
  it("matches the current compact enemy intent token geometry", () => {
    expect(INTENT_TOKEN_LAYOUT).toMatchObject({
      width: MONSTER_SLOT.intentTokenWidth,
      height: MONSTER_SLOT.intentTokenHeight,
      tooltipHitboxPadding: 8
    });
    expect(INTENT_TOKEN_LAYOUT.amountAnchor.y).toBeGreaterThan(INTENT_TOKEN_LAYOUT.glyphAnchor.y);
  });

  it("defines token variants without battlefield card assets", () => {
    expect(INTENT_TOKEN_LAYOUT.variants).toMatchObject({
      unknown: CombatAssetKeys.icons.intentUnknown,
      attack: CombatAssetKeys.icons.intentAttack,
      defend: CombatAssetKeys.icons.intentDefend,
      buff: CombatAssetKeys.icons.intentBuff,
      debuff: CombatAssetKeys.icons.intentDebuff,
      special: CombatAssetKeys.icons.intentSpecial,
      charging: CombatAssetKeys.icons.intentCharging
    });
    expect(Object.values(INTENT_TOKEN_LAYOUT.variants).join("\n")).not.toMatch(/cardFrame|battlefield/i);
  });
});
