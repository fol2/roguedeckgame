import type { GameObjects, Scene } from "phaser";
import type { RunViewModel } from "../view-models/run-view-model";
import { RUN_HUD_AREA, RUN_HUD_TEXT } from "../layout/run-layout";

export class RunHudPresenter {
  private readonly container: GameObjects.Container;
  private readonly scene: Scene;

  public constructor(scene: Scene) {
    this.scene = scene;
    this.container = scene.add.container(RUN_HUD_AREA.x, RUN_HUD_AREA.y);
  }

  public render(run: RunViewModel): void {
    this.container.removeAll(true);
    this.container.add(this.scene.add.rectangle(0, 0, RUN_HUD_AREA.width, RUN_HUD_AREA.height, 0x10151f, 0.92)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x6c7b92));
    this.container.add(this.scene.add.text(RUN_HUD_TEXT.x, RUN_HUD_TEXT.titleY, "Run", {
      color: "#f6f1e8",
      fontFamily: "Inter, sans-serif",
      fontSize: RUN_HUD_TEXT.fontSize.title
    }));
    this.container.add(this.scene.add.text(RUN_HUD_TEXT.x, RUN_HUD_TEXT.statusY, `Status: ${run.status}`, {
      color: "#c4d0df",
      fontFamily: "Inter, sans-serif",
      fontSize: RUN_HUD_TEXT.fontSize.body
    }));
    this.container.add(this.scene.add.text(RUN_HUD_TEXT.x, RUN_HUD_TEXT.seedY, `Seed: ${run.seed}`, {
      color: "#c4d0df",
      fontFamily: "Inter, sans-serif",
      fontSize: RUN_HUD_TEXT.fontSize.body
    }));
    this.container.add(this.scene.add.text(RUN_HUD_TEXT.x, RUN_HUD_TEXT.deckY, `Deck: ${run.deckCount}`, {
      color: "#c4d0df",
      fontFamily: "Inter, sans-serif",
      fontSize: RUN_HUD_TEXT.fontSize.body
    }));
    this.container.add(this.scene.add.text(RUN_HUD_TEXT.x, RUN_HUD_TEXT.petsY, `Active pets: ${run.activePetCount}`, {
      color: "#c4d0df",
      fontFamily: "Inter, sans-serif",
      fontSize: RUN_HUD_TEXT.fontSize.body
    }));
  }
}
