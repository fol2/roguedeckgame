import { Scene } from "phaser";
import { SceneKeys } from "./SceneKeys";

export class BootScene extends Scene {
  public constructor() {
    super(SceneKeys.Boot);
  }

  public create(): void {
    this.scene.start(SceneKeys.CoreSmoke);
  }
}
