import { Scene } from "phaser";
import { getRunSandboxController } from "../controllers/run-sandbox-singleton";
import { SceneKeys } from "./SceneKeys";

const shouldOpenPreparedCombatPreview = (): boolean => {
  if (!import.meta.env.DEV) {
    return false;
  }

  if (typeof window === "undefined") {
    return false;
  }

  return new URLSearchParams(window.location.search).get("combatPreview") === "1";
};

export class BootScene extends Scene {
  public constructor() {
    super(SceneKeys.Boot);
  }

  public create(): void {
    if (shouldOpenPreparedCombatPreview()) {
      const sandbox = getRunSandboxController();

      if (sandbox.getCombatViewModel()) {
        this.scene.start(SceneKeys.Combat);
        return;
      }
    }

    this.scene.start(SceneKeys.Map);
  }
}
