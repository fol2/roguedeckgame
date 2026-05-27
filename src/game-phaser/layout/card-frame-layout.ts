import { CARD_FRAME_ZONES, CARD_SIZE } from "./hand-layout";

export const CARD_FRAME_ASSET_SPEC = {
  ratio: {
    width: 5,
    height: 7
  },
  display: CARD_SIZE,
  exportSizes: {
    twoX: {
      width: CARD_SIZE.width * 2,
      height: CARD_SIZE.height * 2
    },
    threeX: {
      width: CARD_SIZE.width * 3,
      height: CARD_SIZE.height * 3
    }
  },
  zones: CARD_FRAME_ZONES,
  dynamicCodeRenderedZones: [
    "costSocket",
    "titleBand",
    "rulesTextBox",
    "tagRow"
  ],
  assetBackedZones: [
    "familyBadge",
    "artWindow"
  ]
} as const;

export type CardFrameZoneName = keyof typeof CARD_FRAME_ZONES;
