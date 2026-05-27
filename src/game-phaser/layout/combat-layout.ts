import {
  GAME_HEIGHT,
  GAME_MARGIN,
  GAME_WIDTH
} from "./game-size";

export const COMBAT_BACKGROUND_COLOUR = 0x151923;
export const COMBAT_PANEL_COLOUR = 0x10151f;
export const COMBAT_PANEL_STROKE = 0x5f6f89;

export const COMBAT_BOARD = {
  x: GAME_MARGIN,
  y: 28,
  width: GAME_WIDTH - GAME_MARGIN * 2,
  height: 468
} as const;

export const MENU_BUTTON = {
  x: GAME_WIDTH - GAME_MARGIN - 24,
  y: COMBAT_BOARD.y + 24,
  width: 48,
  height: 34,
  fontSize: "18px"
} as const;

export const ENCOUNTER_LABEL = {
  x: COMBAT_BOARD.x + 18,
  y: COMBAT_BOARD.y + 16,
  fontSize: "15px"
} as const;

export const KEEPER_AVATAR = {
  x: COMBAT_BOARD.x + 134,
  y: COMBAT_BOARD.y + 306,
  baseWidth: 92,
  baseHeight: 26,
  bodyWidth: 42,
  bodyHeight: 74,
  headRadius: 18,
  labelY: 58,
  fontSize: {
    label: "13px"
  }
} as const;

export const PLAYER_HUD_AREA = {
  x: GAME_MARGIN,
  y: GAME_HEIGHT - 156,
  width: 176,
  height: 120
} as const;

export const PLAYER_HUD_TEXT = {
  portraitX: 34,
  portraitY: 34,
  nameX: 66,
  nameY: 16,
  hpLabelX: 66,
  hpLabelY: 42,
  blockX: 18,
  blockY: 78,
  statusX: 66,
  statusY: 78,
  hpBarX: 66,
  hpBarY: 62,
  hpBarWidth: 92,
  hpBarHeight: 10,
  fontSize: {
    name: "13px",
    body: "12px",
    status: "11px"
  }
} as const;

export const ENERGY_ORB = {
  x: PLAYER_HUD_AREA.x + PLAYER_HUD_AREA.width + 46,
  y: GAME_HEIGHT - 92,
  radius: 38,
  fontSize: "18px"
} as const;

export const DRAW_PILE = {
  x: ENERGY_ORB.x + 74,
  y: GAME_HEIGHT - 92,
  width: 58,
  height: 82,
  fontSize: "13px"
} as const;

export const DISCARD_PILE = {
  x: GAME_WIDTH - GAME_MARGIN - 190,
  y: GAME_HEIGHT - 92,
  width: 58,
  height: 82,
  fontSize: "13px"
} as const;

export const END_TURN_BUTTON = {
  x: GAME_WIDTH - GAME_MARGIN - 62,
  y: GAME_HEIGHT - 92,
  width: 124,
  height: 56,
  fontSize: "17px"
} as const;

export const MONSTER_SLOT = {
  y: COMBAT_BOARD.y + 232,
  width: 148,
  height: 210,
  spriteWidth: 86,
  spriteHeight: 110,
  intentY: -112,
  intentRadius: 25,
  nameY: -70,
  hpBarY: 54,
  hpBarWidth: 118,
  hpBarHeight: 12,
  statusY: 82,
  statusGap: 28,
  statusSize: 22,
  targetRingY: 42,
  targetRingWidth: 126,
  targetRingHeight: 32,
  fontSize: {
    name: "14px",
    hp: "12px",
    intent: "12px",
    amount: "13px",
    status: "10px"
  }
} as const;

export const OUTCOME_LABEL = {
  x: GAME_WIDTH / 2,
  y: COMBAT_BOARD.y + COMBAT_BOARD.height / 2,
  fontSize: "34px"
} as const;

export const CONTINUE_BUTTON = {
  x: GAME_WIDTH / 2,
  y: OUTCOME_LABEL.y + 62,
  width: 168,
  height: 48,
  fontSize: "17px"
} as const;

export const RESET_RUN_BUTTON = {
  x: GAME_WIDTH / 2,
  y: OUTCOME_LABEL.y + 120,
  width: 168,
  height: 48,
  fontSize: "17px"
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

export const COMBAT_TEXT = {
  titleFontSize: "24px",
  outcomeFontSize: OUTCOME_LABEL.fontSize
} as const;

export const QUICK_TOOLTIP = {
  width: 282,
  minHeight: 54,
  padding: 12,
  offsetX: 18,
  offsetY: 18,
  titleY: 10,
  bodyY: 32,
  maxBodyLines: 5,
  fontSize: {
    title: "13px",
    body: "12px"
  }
} as const;

export const DETAIL_OVERLAY = {
  x: GAME_WIDTH / 2,
  y: GAME_HEIGHT / 2,
  width: 520,
  height: 430,
  padding: 24,
  titleY: 26,
  subtitleY: 58,
  lineStartY: 94,
  lineHeight: 26,
  footerY: 382,
  closeX: 230,
  closeY: -186,
  closeSize: 34,
  fontSize: {
    title: "22px",
    subtitle: "14px",
    line: "13px",
    footer: "12px",
    close: "18px"
  }
} as const;

export const PAUSE_OVERLAY = {
  x: GAME_WIDTH / 2,
  y: GAME_HEIGHT / 2,
  width: 360,
  height: 220,
  titleY: -58,
  bodyY: -18,
  resumeY: 56,
  resumeWidth: 156,
  resumeHeight: 46,
  fontSize: {
    title: "22px",
    body: "13px",
    button: "16px"
  }
} as const;

export const UI_WARNING_LABEL = {
  x: GAME_WIDTH / 2,
  y: COMBAT_BOARD.y + 46,
  maxWidth: 680,
  fontSize: "12px"
} as const;

export const DEBUG_OVERLAY = {
  x: COMBAT_BOARD.x + 12,
  y: COMBAT_BOARD.y + 48,
  width: 384,
  height: 486,
  padding: 12,
  titleY: 10,
  firstLineY: 34,
  lineHeight: 18,
  maxLines: 24,
  fontSize: {
    title: "13px",
    body: "11px"
  }
} as const;

const ENEMY_FORMATIONS = [
  [COMBAT_BOARD.x + COMBAT_BOARD.width - 230],
  [COMBAT_BOARD.x + COMBAT_BOARD.width - 330, COMBAT_BOARD.x + COMBAT_BOARD.width - 150],
  [COMBAT_BOARD.x + COMBAT_BOARD.width - 420, COMBAT_BOARD.x + COMBAT_BOARD.width - 260, COMBAT_BOARD.x + COMBAT_BOARD.width - 100]
] as const;

export const getMonsterPosition = (
  index: number,
  total = 3
): { readonly x: number; readonly y: number } => {
  const formation = ENEMY_FORMATIONS[Math.max(0, Math.min(total, 3) - 1)] ?? ENEMY_FORMATIONS[2];

  return {
    x: formation[Math.max(0, Math.min(index, formation.length - 1))],
    y: MONSTER_SLOT.y
  };
};
