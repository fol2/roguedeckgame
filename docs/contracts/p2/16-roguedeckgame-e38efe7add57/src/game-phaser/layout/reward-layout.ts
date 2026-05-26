import { GAME_CENTER_X, GAME_MARGIN } from "./game-size";

export const REWARD_BACKGROUND_COLOUR = 0x201b2d;

export const REWARD_TITLE = {
  x: GAME_CENTER_X,
  y: 34,
  fontSize: "24px"
} as const;

export const REWARD_OPTION_PANEL = {
  startX: GAME_MARGIN + 208,
  y: 286,
  width: 224,
  height: 194,
  gap: 32,
  typeX: 92,
  titleY: -72,
  subtitleY: -40,
  descriptionY: -8,
  textInset: 18,
  textWrapPadding: 36,
  fontSize: {
    title: "18px",
    type: "12px",
    subtitle: "13px",
    description: "13px"
  }
} as const;

export const REWARD_SKIP_BUTTON = {
  x: GAME_CENTER_X,
  y: 610,
  width: 166,
  height: 48,
  fontSize: "17px"
} as const;

export const getRewardOptionPosition = (
  index: number
): { readonly x: number; readonly y: number } => ({
  x: REWARD_OPTION_PANEL.startX + index * (REWARD_OPTION_PANEL.width + REWARD_OPTION_PANEL.gap),
  y: REWARD_OPTION_PANEL.y
});
