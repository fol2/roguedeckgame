import { AUTO, Game, Scale } from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../game-phaser/layout/game-size";
import { BootScene } from "../game-phaser/scenes/BootScene";
import { CoreSmokeScene } from "../game-phaser/scenes/CoreSmokeScene";

export const createGame = (parent: HTMLElement): Game => new Game({
  type: AUTO,
  parent,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#151923",
  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH
  },
  scene: [BootScene, CoreSmokeScene]
});
