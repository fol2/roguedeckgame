import { GAME_CENTER_X, GAME_HEIGHT, GAME_MARGIN, GAME_WIDTH } from "./game-size";

export const MAP_BACKGROUND_COLOUR = 0x14211c;

export const MAP_TITLE = {
  x: GAME_CENTER_X,
  y: 34,
  fontSize: "24px"
} as const;

export const MAP_NODE = {
  radius: 34,
  strokeWidth: 3,
  labelYOffset: -8,
  statusYOffset: 12,
  fontSize: {
    label: "14px",
    status: "11px"
  }
} as const;

export const MAP_AREA = {
  left: GAME_MARGIN + 120,
  top: 214,
  width: GAME_WIDTH - (GAME_MARGIN + 120) * 2,
  height: GAME_HEIGHT - 290
} as const;

export const MAP_NODE_COLOURS = {
  locked: 0x2f3540,
  available: 0x2f7d5f,
  active: 0xd89d38,
  completed: 0x5b6f88,
  skipped: 0x3f4653
} as const;

export const getMapNodePosition = (
  layer: number,
  indexInLayer: number,
  layerCount: number,
  nodesInLayer: number
): { readonly x: number; readonly y: number } => {
  const xStep = layerCount <= 1 ? 0 : MAP_AREA.width / (layerCount - 1);
  const yStep = nodesInLayer <= 1 ? 0 : MAP_AREA.height / (nodesInLayer - 1);

  return {
    x: MAP_AREA.left + xStep * layer,
    y: MAP_AREA.top + (nodesInLayer <= 1 ? MAP_AREA.height / 2 : yStep * indexInLayer)
  };
};
