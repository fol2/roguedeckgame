import { GAME_HEIGHT } from "./game-size";
import { DISCARD_PILE, DRAW_PILE } from "./combat-layout";

export const CARD_SIZE = {
  width: 192,
  height: 268
} as const;

export const CARD_TEXT = {
  leftPadding: 14,
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
  rarityGemSocket: {
    x: -CARD_SIZE.width / 2 + 22,
    y: -CARD_SIZE.height / 2 + 20,
    width: 22,
    height: 22
  },
  costSocket: {
    x: CARD_SIZE.width / 2 - 28,
    y: -CARD_SIZE.height / 2 + 25,
    width: 36,
    height: 36
  },
  titleBand: {
    x: 0,
    y: -CARD_SIZE.height / 2 + 25,
    width: CARD_SIZE.width - 18,
    height: 38
  },
  familyBadge: {
    x: -CARD_SIZE.width / 2 + 72,
    y: -CARD_SIZE.height / 2 + 58,
    width: 78,
    height: 20
  },
  sourceBadge: {
    x: CARD_SIZE.width / 2 - 42,
    y: -CARD_SIZE.height / 2 + 58,
    width: 58,
    height: 20
  },
  artWindow: {
    x: 0,
    y: -18,
    width: CARD_SIZE.width - CARD_TEXT.textWrapPadding,
    height: 92
  },
  rulesTextBox: {
    x: 0,
    y: 72,
    width: CARD_SIZE.width - CARD_TEXT.textWrapPadding,
    height: 70
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
