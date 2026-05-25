import { GAME_MARGIN } from "./game-size";

export const RUN_HUD_AREA = {
  x: GAME_MARGIN,
  y: GAME_MARGIN,
  width: 316,
  height: 156
} as const;

export const RUN_HUD_TEXT = {
  x: 16,
  titleY: 14,
  statusY: 46,
  seedY: 74,
  deckY: 102,
  petsY: 130,
  fontSize: {
    title: "18px",
    body: "14px"
  }
} as const;
