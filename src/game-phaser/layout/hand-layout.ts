import { GAME_HEIGHT } from "./game-size";
import { DISCARD_PILE, DRAW_PILE } from "./combat-layout";

export const CARD_SIZE = {
  width: 192,
  height: 268
} as const;

export const CARD_TEXT = {
  leftPadding: 8,
  nameX: 36,
  topPadding: 14,
  nameWrapPadding: 86,
  descriptionMaxLength: 88,
  descriptionY: 48,
  tagBottomInset: 24,
  tagGap: 37,
  textWrapPadding: 32,
  fontSize: {
    name: "14px",
    cost: "21px",
    type: "10px",
    description: "13px",
    tags: "11px",
    rarity: "9px"
  }
} as const;

export const CARD_FRAME_ZONES = {
  costSocket: {
    x: -57,
    y: -106.5,
    width: 38,
    height: 38
  },
  rarityGemSocket: {
    x: 0,
    y: 12,
    width: 30,
    height: 30
  },
  artWindow: {
    x: -1.25,
    y: -53.25,
    width: 143.5,
    height: 132.5
  },
  titleBand: {
    x: -1.5,
    y: 24.5,
    width: 126,
    height: 14
  },
  rulesTextBox: {
    x: -0.75,
    y: 71,
    width: 130.5,
    height: 66
  },
  tagRow: {
    x: 0,
    y: 116.25,
    width: 73,
    height: 20.5
  },
  tag1: {
    x: -27.25,
    y: 116.25,
    width: 20.5,
    height: 20.5
  },
  tag2: {
    x: -0.25,
    y: 116.25,
    width: 20.5,
    height: 20.5
  },
  tag3: {
    x: 25.25,
    y: 116.25,
    width: 20.5,
    height: 20.5
  }
} as const;

export const HAND_LAYOUT = {
  y: GAME_HEIGHT - CARD_SIZE.height / 2 - 6,
  leftX: DRAW_PILE.x + DRAW_PILE.width / 2 + 28,
  rightX: DISCARD_PILE.x - DISCARD_PILE.width / 2 - 28,
  preferredGap: -60,
  minOverlapStep: 42,
  hoverLift: 36,
  selectedLift: 50,
  hoverScale: 1.04,
  maxSupportedCards: 10
} as const;

export const getHandCardPosition = (
  index: number,
  total: number
): { readonly x: number; readonly y: number } => {
  const clampedTotal = Math.max(1, Math.min(total, HAND_LAYOUT.maxSupportedCards));
  const availableWidth = HAND_LAYOUT.rightX - HAND_LAYOUT.leftX;
  const preferredStep = CARD_SIZE.width + HAND_LAYOUT.preferredGap;
  const compressedStep = clampedTotal <= 1
    ? preferredStep
    : Math.max(HAND_LAYOUT.minOverlapStep, (availableWidth - CARD_SIZE.width) / (clampedTotal - 1));
  const step = Math.min(preferredStep, compressedStep);
  const totalWidth = CARD_SIZE.width + (clampedTotal - 1) * step;
  const startX = HAND_LAYOUT.leftX + (availableWidth - totalWidth) / 2 + CARD_SIZE.width / 2;

  return {
    x: startX + Math.min(index, clampedTotal - 1) * step,
    y: HAND_LAYOUT.y
  };
};
