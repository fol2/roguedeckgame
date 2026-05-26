import type { Scene } from "phaser";
import { GAME_CENTER_X, GAME_CENTER_Y, GAME_RENDER_SCALE } from "./game-size";

export const configureFixedResolutionCamera = (scene: Scene): void => {
  scene.cameras.main.setZoom(GAME_RENDER_SCALE);
  scene.cameras.main.centerOn(GAME_CENTER_X, GAME_CENTER_Y);
};
