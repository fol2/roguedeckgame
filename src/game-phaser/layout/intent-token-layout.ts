import { CombatAssetKeys } from "../assets/combat-asset-keys";
import { MONSTER_SLOT } from "./combat-layout";

export const INTENT_TOKEN_LAYOUT = {
  frame: CombatAssetKeys.intentTokens.frame,
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
    charging: CombatAssetKeys.icons.intentCharging,
    obscured: CombatAssetKeys.icons.intentObscured
  },
  markers: {
    scoped: CombatAssetKeys.intentMarkers.scoped,
    locked: CombatAssetKeys.intentMarkers.locked,
    adaptive: CombatAssetKeys.intentMarkers.adaptive,
    changed: CombatAssetKeys.intentMarkers.changedPulse,
    roughLow: CombatAssetKeys.intentMarkers.roughLow,
    roughMedium: CombatAssetKeys.intentMarkers.roughMedium,
    roughHigh: CombatAssetKeys.intentMarkers.roughHigh,
    multiHit: CombatAssetKeys.intentMarkers.multiHit
  },
  codeRenderedFields: [
    "summaryLabel",
    "amountLabel",
    "exactSequenceLabels",
    "scopedCandidatePlans",
    "reasonTags"
  ]
} as const;

export type IntentTokenVariant = keyof typeof INTENT_TOKEN_LAYOUT.variants;
export type IntentTokenMarker = keyof typeof INTENT_TOKEN_LAYOUT.markers;
