import { AUTO, Game, Scale } from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, getFixedRenderSize } from "../game-phaser/layout/game-size";
import { BootScene } from "../game-phaser/scenes/BootScene";
import { CombatScene } from "../game-phaser/scenes/CombatScene";
import { CoreSmokeScene } from "../game-phaser/scenes/CoreSmokeScene";
import { MapScene } from "../game-phaser/scenes/MapScene";
import { RewardScene } from "../game-phaser/scenes/RewardScene";

export const createGame = (parent: HTMLElement): Game => {
  const bounds = parent.getBoundingClientRect();
  const renderSize = getFixedRenderSize(
    bounds.width || window.innerWidth || GAME_WIDTH,
    bounds.height || window.innerHeight || GAME_HEIGHT,
    window.devicePixelRatio || 1
  );

  return new Game({
    type: AUTO,
    parent,
    width: renderSize.width,
    height: renderSize.height,
    backgroundColor: "#151923",
    scale: {
      mode: Scale.FIT,
      autoCenter: Scale.CENTER_BOTH
    },
    scene: [BootScene, CoreSmokeScene, MapScene, CombatScene, RewardScene]
  });
};
