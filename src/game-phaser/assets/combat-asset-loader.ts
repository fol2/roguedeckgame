import type { Scene } from "phaser";
import { COMBAT_ASSET_DEFINITIONS } from "./combat-asset-registry";

export const preloadCombatAssets = (scene: Scene): void => {
  for (const asset of COMBAT_ASSET_DEFINITIONS) {
    if (!scene.textures.exists(asset.key)) {
      scene.load.image(asset.key, asset.path);
    }
  }
};
