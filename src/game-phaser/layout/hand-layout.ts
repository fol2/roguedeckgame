import { GAME_HEIGHT } from "./game-size";
import { DISCARD_PILE, DRAW_PILE } from "./combat-layout";

export const CARD_SIZE = {
  width: 192,
  height: 268
} as const;

export const CARD_TEXT = {
  leftPadding: 16,
  nameX: 18,
  topPadding: 14,
  costInsetX: 160,
  nameWrapPadding: 72,
  descriptionMaxLength: 68,
  typeY: -42,
  artY: -22,
  descriptionY: 44,
  tagBottomInset: 26,
  tagGap: 34,
  textWrapPadding: 32,
  fontSize: {
    name: "18px",
    cost: "26px",
    type: "13px",
    description: "14px",
    tags: "11px",
    rarity: "10px"
  }
} as const;

export const CARD_FRAME_ZONES = {
  rarityGemSocket: {
    x: -CARD_SIZE.width / 2 + 18,
    y: -CARD_SIZE.height / 2 + 18,
    width: 18,
    height: 18
  },
  costSocket: {
    x: CARD_SIZE.width / 2 - 34,
    y: -CARD_SIZE.height / 2 + 38,
    width: 46,
    height: 46
  },
  titleBand: {
    x: 0,
    y: -CARD_SIZE.height / 2 + 38,
    width: CARD_SIZE.width - 18,
    height: 50
  },
  familyBadge: {
    x: -CARD_SIZE.width / 2 + 50,
    y: -CARD_SIZE.height / 2 + 88,
    width: 72,
    height: 26
  },
  sourceBadge: {
    x: CARD_SIZE.width / 2 - 48,
    y: -CARD_SIZE.height / 2 + 88,
    width: 64,
    height: 26
  },
  artWindow: {
    x: 0,
    y: -20,
    width: CARD_SIZE.width - CARD_TEXT.textWrapPadding,
    height: 76
  },
  rulesTextBox: {
    x: 0,
    y: 70,
    width: CARD_SIZE.width - CARD_TEXT.textWrapPadding,
    height: 82
  },
  tagRow: {
    x: 0,
    y: CARD_SIZE.height / 2 - CARD_TEXT.tagBottomInset,
    width: CARD_SIZE.width - CARD_TEXT.textWrapPadding,
    height: 24
  }
} as const;

export const HAND_LAYOUT = {
  y: GAME_HEIGHT - CARD_SIZE.height / 2 - 6,
  leftX: DRAW_PILE.x + DRAW_PILE.width / 2 + 28,
  rightX: DISCARD_PILE.x - DISCARD_PILE.width / 2 - 28,
  preferredGap: -60,
  minOverlapStep: 42,
  hoverLift: 50,
  hoverScale: 1.06,
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
