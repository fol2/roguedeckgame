export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const MIN_RENDER_SCALE = 1;
export const MAX_RENDER_SCALE = 4;
export const GAME_CENTER_X = GAME_WIDTH / 2;
export const GAME_CENTER_Y = GAME_HEIGHT / 2;

export const GAME_MARGIN = 48;

export const TITLE_Y = 96;
export const PANEL_X = GAME_MARGIN;
export const PANEL_Y = 164;
export const PANEL_WIDTH = GAME_WIDTH - GAME_MARGIN * 2;
export const PANEL_HEIGHT = 408;
export const PANEL_PADDING = 36;
export const LINE_GAP = 42;

export type FixedRenderSize = {
  readonly width: number;
  readonly height: number;
  readonly renderScale: number;
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export const getFixedRenderSize = (
  availableWidth: number,
  availableHeight: number,
  pixelRatio: number
): FixedRenderSize => {
  const safeWidth = Math.max(1, availableWidth);
  const safeHeight = Math.max(1, availableHeight);
  const safePixelRatio = Math.max(1, pixelRatio);
  const displayScale = Math.min(safeWidth / GAME_WIDTH, safeHeight / GAME_HEIGHT);
  const renderScale = clamp(displayScale * safePixelRatio, MIN_RENDER_SCALE, MAX_RENDER_SCALE);

  return {
    width: Math.round(GAME_WIDTH * renderScale),
    height: Math.round(GAME_HEIGHT * renderScale),
    renderScale
  };
};
