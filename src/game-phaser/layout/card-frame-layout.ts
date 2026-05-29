import { CARD_FRAME_ZONES, CARD_SIZE } from "./hand-layout";

export const CARD_FRAME_ASSET_SPEC = {
  ratio: {
    width: 5,
    height: 7
  },
  display: CARD_SIZE,
  highResolutionScale: 4,
  singleRuntimeExport: {
    width: CARD_SIZE.width * 4,
    height: CARD_SIZE.height * 4
  },
  zones: CARD_FRAME_ZONES,
  dynamicCodeRenderedZones: [
    "costSocket",
    "titleBand",
    "rulesTextBox",
    "tagRow"
  ],
  assetBackedZones: [
    "rarityGemSocket",
    "familyBadge",
    "sourceBadge",
    "artWindow"
  ],
  visualEngineSlots: [
    "frame",
    "rarityGem",
    "sourceBadge",
    "familyBadge",
    "artWindow",
    "tagIcons"
  ]
} as const;

export type CardFrameZoneName = keyof typeof CARD_FRAME_ZONES;
