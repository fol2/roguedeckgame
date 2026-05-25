import {
  GAME_CENTER_X,
  GAME_CENTER_Y,
  GAME_HEIGHT,
  GAME_MARGIN,
  GAME_WIDTH
} from "./game-size";

export const COMBAT_BACKGROUND_COLOUR = 0x151923;

export const COMBAT_TITLE = {
  x: GAME_CENTER_X,
  y: 34
} as const;

export const PLAYER_AREA = {
  x: GAME_CENTER_X,
  y: GAME_HEIGHT - 238,
  width: 260,
  height: 112
} as const;

export const MONSTER_AREA = {
  startX: GAME_CENTER_X + 178,
  y: GAME_CENTER_Y - 112,
  width: 208,
  height: 104,
  gap: 34
} as const;

export const HUD_AREA = {
  x: GAME_MARGIN,
  y: GAME_MARGIN,
  width: 284,
  height: 164
} as const;

export const EVENT_LOG_AREA = {
  x: GAME_WIDTH - GAME_MARGIN - 336,
  y: GAME_MARGIN,
  width: 336,
  height: 194,
  titleX: 14,
  titleY: 10,
  lineX: 14,
  firstLineY: 38,
  lineHeight: 22,
  maxLines: 7,
  textWrapPadding: 28,
  fontSize: {
    title: "16px",
    line: "13px"
  }
} as const;

export const END_TURN_BUTTON = {
  x: GAME_WIDTH - GAME_MARGIN - 152,
  y: GAME_HEIGHT - 238,
  width: 152,
  height: 48,
  fontSize: "18px"
} as const;

export const OUTCOME_LABEL = {
  x: GAME_CENTER_X,
  y: GAME_CENTER_Y + 20
} as const;

export const ENCOUNTER_LABEL = {
  x: GAME_CENTER_X,
  y: 70,
  fontSize: "16px"
} as const;

export const CONTINUE_BUTTON = {
  x: GAME_CENTER_X,
  y: GAME_CENTER_Y + 82,
  width: 168,
  height: 48,
  fontSize: "17px"
} as const;

export const RESET_RUN_BUTTON = {
  x: GAME_CENTER_X,
  y: GAME_CENTER_Y + 140,
  width: 168,
  height: 48,
  fontSize: "17px"
} as const;

export const HUD_TEXT = {
  x: 16,
  titleY: 14,
  phaseY: 48,
  turnY: 78,
  energyY: 108,
  pileX: 146,
  fontSize: {
    title: "18px",
    context: "13px",
    body: "15px",
    energy: "17px",
    pile: "14px"
  },
  contextWrapPadding: 12
} as const;

export const PLAYER_TEXT = {
  nameY: -34,
  statsY: -4,
  statusY: 26,
  fontSize: {
    name: "20px",
    stats: "16px",
    status: "13px"
  }
} as const;

export const MONSTER_TEXT = {
  nameY: -32,
  statsY: -4,
  intentY: 24,
  intentWrapPadding: 18,
  fontSize: {
    name: "18px",
    stats: "14px",
    intent: "12px"
  }
} as const;

export const COMBAT_TEXT = {
  titleFontSize: "24px",
  outcomeFontSize: "34px"
} as const;

export const getMonsterPosition = (index: number): { readonly x: number; readonly y: number } => ({
  x: MONSTER_AREA.startX + index * (MONSTER_AREA.width + MONSTER_AREA.gap),
  y: MONSTER_AREA.y
});
