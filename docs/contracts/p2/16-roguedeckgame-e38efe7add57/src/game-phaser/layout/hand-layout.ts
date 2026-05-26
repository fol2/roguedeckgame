import { GAME_HEIGHT } from "./game-size";
import { DISCARD_PILE, DRAW_PILE } from "./combat-layout";

export const CARD_SIZE = {
  width: 96,
  height: 134
} as const;

export const CARD_TEXT = {
  leftPadding: 9,
  nameX: 9,
  topPadding: 8,
  costInsetX: 78,
  nameWrapPadding: 38,
  descriptionMaxLength: 30,
  typeY: -42,
  artY: -22,
  descriptionY: 12,
  tagBottomInset: 14,
  tagGap: 6,
  textWrapPadding: 18,
  fontSize: {
    name: "12px",
    cost: "17px",
    type: "10px",
    description: "10px",
    tags: "9px"
  }
} as const;

export const HAND_LAYOUT = {
  y: GAME_HEIGHT - 92,
  leftX: DRAW_PILE.x + DRAW_PILE.width / 2 + 28,
  rightX: DISCARD_PILE.x - DISCARD_PILE.width / 2 - 28,
  preferredGap: 14,
  minOverlapStep: 56,
  hoverLift: 30,
  hoverScale: 1.08,
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
