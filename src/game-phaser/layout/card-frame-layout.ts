import { CombatAssetKeys, type CombatAssetKey } from "../assets/combat-asset-keys";
import { CARD_FRAME_ZONES, CARD_SIZE } from "./hand-layout";

type RuntimeZone = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
};

type RuntimeFrameLayout = {
  readonly costSocket: RuntimeZone;
  readonly rarityGemSocket: RuntimeZone;
  readonly artWindow: RuntimeZone;
  readonly titleBand: RuntimeZone;
  readonly rulesTextBox: RuntimeZone;
  readonly tag1: RuntimeZone;
  readonly tag2: RuntimeZone;
  readonly tag3: RuntimeZone;
};

export type CardFrameZone = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type CardFrameLayout = {
  readonly zones: {
    readonly costSocket: CardFrameZone;
    readonly rarityGemSocket: CardFrameZone;
    readonly artWindow: CardFrameZone;
    readonly titleBand: CardFrameZone;
    readonly rulesTextBox: CardFrameZone;
    readonly tagRow: CardFrameZone;
    readonly tagSlots: readonly CardFrameZone[];
  };
};

export type CardOverlayLayout = CardFrameZone & {
  readonly opacity: number;
};

const RUNTIME_SIZE = {
  width: 384,
  height: 536
} as const;

const toDisplayZone = ({ x, y, w, h }: RuntimeZone): CardFrameZone => ({
  x: ((x + w / 2) / RUNTIME_SIZE.width) * CARD_SIZE.width - CARD_SIZE.width / 2,
  y: ((y + h / 2) / RUNTIME_SIZE.height) * CARD_SIZE.height - CARD_SIZE.height / 2,
  width: (w / RUNTIME_SIZE.width) * CARD_SIZE.width,
  height: (h / RUNTIME_SIZE.height) * CARD_SIZE.height
});

const makeLayout = (runtime: RuntimeFrameLayout): CardFrameLayout => {
  const tagSlots = [runtime.tag1, runtime.tag2, runtime.tag3].map(toDisplayZone);
  const left = Math.min(...tagSlots.map((slot) => slot.x - slot.width / 2));
  const right = Math.max(...tagSlots.map((slot) => slot.x + slot.width / 2));
  const top = Math.min(...tagSlots.map((slot) => slot.y - slot.height / 2));
  const bottom = Math.max(...tagSlots.map((slot) => slot.y + slot.height / 2));

  return {
    zones: {
      costSocket: toDisplayZone(runtime.costSocket),
      rarityGemSocket: toDisplayZone(runtime.rarityGemSocket),
      artWindow: toDisplayZone(runtime.artWindow),
      titleBand: toDisplayZone(runtime.titleBand),
      rulesTextBox: toDisplayZone(runtime.rulesTextBox),
      tagRow: {
        x: (left + right) / 2,
        y: (top + bottom) / 2,
        width: right - left,
        height: bottom - top
      },
      tagSlots
    }
  };
};

const makeOverlay = ({ x, y, w, h }: RuntimeZone, opacity: number): CardOverlayLayout => ({
  ...toDisplayZone({ x, y, w, h }),
  opacity
});

const normalLayout = makeLayout({
  costSocket: { x: 40, y: 17, w: 76, h: 76 },
  rarityGemSocket: { x: 162, y: 262, w: 60, h: 60 },
  artWindow: { x: 46, y: 29, w: 287, h: 265 },
  titleBand: { x: 63, y: 303, w: 252, h: 28 },
  rulesTextBox: { x: 60, y: 344, w: 261, h: 132 },
  tag1: { x: 117, y: 480, w: 41, h: 41 },
  tag2: { x: 170, y: 480, w: 41, h: 41 },
  tag3: { x: 222, y: 480, w: 41, h: 41 }
});

const petCommandLayout = makeLayout({
  costSocket: { x: 42, y: 23, w: 76, h: 76 },
  rarityGemSocket: { x: 162, y: 262, w: 60, h: 60 },
  artWindow: { x: 53, y: 37, w: 272, h: 258 },
  titleBand: { x: 63, y: 303, w: 252, h: 28 },
  rulesTextBox: { x: 64, y: 345, w: 255, h: 127 },
  tag1: { x: 110, y: 477, w: 41, h: 41 },
  tag2: { x: 169, y: 477, w: 41, h: 41 },
  tag3: { x: 226, y: 477, w: 41, h: 41 }
});

const petSupportLayout = makeLayout({
  costSocket: { x: 11, y: 12, w: 74, h: 74 },
  rarityGemSocket: { x: 162, y: 237, w: 60, h: 60 },
  artWindow: { x: 44, y: 33, w: 293, h: 238 },
  titleBand: { x: 64, y: 273, w: 250, h: 33 },
  rulesTextBox: { x: 53, y: 316, w: 275, h: 143 },
  tag1: { x: 94, y: 473, w: 41, h: 41 },
  tag2: { x: 169, y: 473, w: 41, h: 41 },
  tag3: { x: 244, y: 473, w: 41, h: 41 }
});

const keeperSignalLayout = makeLayout({
  costSocket: { x: 9, y: 9, w: 72, h: 72 },
  rarityGemSocket: { x: 162, y: 245, w: 60, h: 60 },
  artWindow: { x: 45, y: 39, w: 293, h: 239 },
  titleBand: { x: 59, y: 284, w: 266, h: 28 },
  rulesTextBox: { x: 57, y: 327, w: 268, h: 137 },
  tag1: { x: 95, y: 475, w: 41, h: 41 },
  tag2: { x: 171, y: 475, w: 41, h: 41 },
  tag3: { x: 246, y: 475, w: 41, h: 41 }
});

const futurePowerLayout = makeLayout({
  costSocket: { x: 11, y: 9, w: 69, h: 69 },
  rarityGemSocket: { x: 162, y: 250, w: 60, h: 60 },
  artWindow: { x: 43, y: 31, w: 295, h: 252 },
  titleBand: { x: 63, y: 285, w: 252, h: 28 },
  rulesTextBox: { x: 60, y: 326, w: 264, h: 137 },
  tag1: { x: 94, y: 479, w: 41, h: 41 },
  tag2: { x: 170, y: 479, w: 41, h: 41 },
  tag3: { x: 245, y: 479, w: 41, h: 41 }
});

const temporaryLayout = makeLayout({
  costSocket: { x: 13, y: 13, w: 69, h: 70 },
  rarityGemSocket: { x: 162, y: 257, w: 60, h: 60 },
  artWindow: { x: 44, y: 33, w: 294, h: 256 },
  titleBand: { x: 54, y: 295, w: 273, h: 28 },
  rulesTextBox: { x: 52, y: 336, w: 276, h: 132 },
  tag1: { x: 90, y: 475, w: 41, h: 41 },
  tag2: { x: 171, y: 475, w: 41, h: 41 },
  tag3: { x: 249, y: 475, w: 41, h: 41 }
});

const cardFrameLayouts: Readonly<Record<string, CardFrameLayout>> = {
  [CombatAssetKeys.cardFrames.normal]: normalLayout,
  [CombatAssetKeys.cardFrames.petCommand]: petCommandLayout,
  [CombatAssetKeys.cardFrames.petSupport]: petSupportLayout,
  [CombatAssetKeys.cardFrames.keeperSignal]: keeperSignalLayout,
  [CombatAssetKeys.cardFrames.futurePower]: futurePowerLayout,
  [CombatAssetKeys.cardFrames.temporary]: temporaryLayout
};

const hoverOverlays: Readonly<Record<string, CardOverlayLayout>> = {
  [CombatAssetKeys.cardFrames.normal]: makeOverlay({ x: 12, y: -4, w: 360, h: 548 }, 0.82),
  [CombatAssetKeys.cardFrames.petCommand]: makeOverlay({ x: 12, y: -5, w: 354, h: 546 }, 0.82),
  [CombatAssetKeys.cardFrames.petSupport]: makeOverlay({ x: -2, y: -3, w: 384, h: 543 }, 0.82),
  [CombatAssetKeys.cardFrames.keeperSignal]: makeOverlay({ x: -4, y: -6, w: 389, h: 549 }, 0.82),
  [CombatAssetKeys.cardFrames.futurePower]: makeOverlay({ x: -2, y: -6, w: 388, h: 552 }, 0.82),
  [CombatAssetKeys.cardFrames.temporary]: makeOverlay({ x: -1, y: -1, w: 385, h: 543 }, 0.82)
};

const selectedOverlays: Readonly<Record<string, CardOverlayLayout>> = {
  [CombatAssetKeys.cardFrames.normal]: makeOverlay({ x: 10, y: -7, w: 362, h: 554 }, 0.82),
  [CombatAssetKeys.cardFrames.petCommand]: makeOverlay({ x: 10, y: -4, w: 355, h: 548 }, 0.82),
  [CombatAssetKeys.cardFrames.petSupport]: makeOverlay({ x: -3, y: -3, w: 385, h: 542 }, 0.82),
  [CombatAssetKeys.cardFrames.keeperSignal]: makeOverlay({ x: -4, y: -5, w: 388, h: 545 }, 0.82),
  [CombatAssetKeys.cardFrames.futurePower]: makeOverlay({ x: -1, y: -3, w: 382, h: 547 }, 0.82),
  [CombatAssetKeys.cardFrames.temporary]: makeOverlay({ x: 1, y: 1, w: 380, h: 541 }, 0.82)
};

export const DEFAULT_CARD_FRAME_LAYOUT = normalLayout;

export const CARD_FRAME_ASSET_SPEC = {
  ratio: {
    width: 5,
    height: 7
  },
  display: CARD_SIZE,
  highResolutionScale: 2,
  singleRuntimeExport: {
    width: CARD_SIZE.width * 2,
    height: CARD_SIZE.height * 2
  },
  zones: CARD_FRAME_ZONES,
  dynamicCodeRenderedZones: [
    "costSocket",
    "titleBand",
    "rulesTextBox",
    "tag1",
    "tag2",
    "tag3"
  ],
  assetBackedZones: [
    "rarityGemSocket",
    "artWindow"
  ],
  visualEngineSlots: [
    "frame",
    "rarityGem",
    "artWindow",
    "tagIcons"
  ]
} as const;

export type CardFrameZoneName = keyof typeof CARD_FRAME_ZONES;

export const getCardFrameLayout = (frameKey: CombatAssetKey): CardFrameLayout =>
  cardFrameLayouts[frameKey] ?? DEFAULT_CARD_FRAME_LAYOUT;

export const getCardOverlayLayout = (
  overlayKey: CombatAssetKey,
  frameKey: CombatAssetKey
): CardOverlayLayout => {
  const layouts = overlayKey === CombatAssetKeys.cardFrames.selectedOverlay
    ? selectedOverlays
    : hoverOverlays;

  return layouts[frameKey] ?? makeOverlay({ x: 0, y: 0, w: RUNTIME_SIZE.width, h: RUNTIME_SIZE.height }, 0.82);
};
