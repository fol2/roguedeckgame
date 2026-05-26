import { AUTO, Game, Scale } from "phaser";
import { GAME_RENDER_HEIGHT, GAME_RENDER_WIDTH } from "../game-phaser/layout/game-size";
import { BootScene } from "../game-phaser/scenes/BootScene";
import { CombatScene } from "../game-phaser/scenes/CombatScene";
import { CoreSmokeScene } from "../game-phaser/scenes/CoreSmokeScene";
import { MapScene } from "../game-phaser/scenes/MapScene";
import { RewardScene } from "../game-phaser/scenes/RewardScene";

export const createGame = (parent: HTMLElement): Game => new Game({
  type: AUTO,
  parent,
  width: GAME_RENDER_WIDTH,
  height: GAME_RENDER_HEIGHT,
  backgroundColor: "#151923",
  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH
  },
  scene: [BootScene, CoreSmokeScene, MapScene, CombatScene, RewardScene]
});
