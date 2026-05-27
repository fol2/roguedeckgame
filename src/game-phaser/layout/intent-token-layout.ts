import { CombatAssetKeys } from "../assets/combat-asset-keys";
import { MONSTER_SLOT } from "./combat-layout";

export const INTENT_TOKEN_LAYOUT = {
  width: MONSTER_SLOT.intentTokenWidth,
  height: MONSTER_SLOT.intentTokenHeight,
  glyphAnchor: {
    x: 0,
    y: MONSTER_SLOT.intentGlyphY - MONSTER_SLOT.intentTokenY
  },
  amountAnchor: {
    x: 0,
    y: MONSTER_SLOT.intentAmountY - MONSTER_SLOT.intentTokenY
  },
  tooltipHitboxPadding: 8,
  variants: {
    unknown: CombatAssetKeys.icons.intentUnknown,
    attack: CombatAssetKeys.icons.intentAttack,
    defend: CombatAssetKeys.icons.intentDefend,
    buff: CombatAssetKeys.icons.intentBuff,
    debuff: CombatAssetKeys.icons.intentDebuff,
    special: CombatAssetKeys.icons.intentSpecial,
    charging: CombatAssetKeys.icons.intentCharging
  },
  markers: {
    scoped: "code-rendered scoped corner mark",
    roughLow: "code-rendered low strength dot",
    roughMedium: "code-rendered medium strength dot",
    roughHigh: "code-rendered high strength dot",
    multiHit: "code-rendered multi-hit tick stack"
  }
} as const;

export type IntentTokenVariant = keyof typeof INTENT_TOKEN_LAYOUT.variants;
