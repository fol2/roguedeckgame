import type { Scene } from "phaser";
import { GAME_RENDER_SCALE } from "./game-size";

export const configureFixedResolutionCamera = (scene: Scene): void => {
  scene.cameras.main.setScroll(0, 0);
  scene.cameras.main.setZoom(GAME_RENDER_SCALE);
};
