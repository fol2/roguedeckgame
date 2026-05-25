import { GAME_CENTER_X, GAME_HEIGHT } from "./game-size";

export const CARD_SIZE = {
  width: 144,
  height: 104
} as const;

export const CARD_TEXT = {
  leftPadding: 10,
  topPadding: 8,
  costInsetX: 24,
  descriptionY: -12,
  tagBottomInset: 22,
  textWrapPadding: 20,
  fontSize: {
    name: "15px",
    cost: "18px",
    description: "11px",
    tags: "10px"
  }
} as const;

export const HAND_LAYOUT = {
  y: GAME_HEIGHT - 82,
  gap: 16,
  maxVisibleCards: 7
} as const;

export const getHandCardPosition = (
  index: number,
  total: number
): { readonly x: number; readonly y: number } => {
  const visibleTotal = Math.max(1, Math.min(total, HAND_LAYOUT.maxVisibleCards));
  const totalWidth = visibleTotal * CARD_SIZE.width + (visibleTotal - 1) * HAND_LAYOUT.gap;
  const startX = GAME_CENTER_X - totalWidth / 2 + CARD_SIZE.width / 2;

  return {
    x: startX + index * (CARD_SIZE.width + HAND_LAYOUT.gap),
    y: HAND_LAYOUT.y
  };
};
