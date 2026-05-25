import type { GameObjects, Scene } from "phaser";
import type { CombatViewModel } from "../view-models/combat-view-model";
import { END_TURN_BUTTON, HUD_AREA, HUD_TEXT } from "../layout/combat-layout";

export class CombatHudPresenter {
  private readonly container: GameObjects.Container;
  private readonly button: GameObjects.Container;
  private readonly scene: Scene;

  public constructor(scene: Scene, onEndTurn: () => void) {
    this.scene = scene;
    this.container = scene.add.container(HUD_AREA.x, HUD_AREA.y);
    this.button = scene.add.container(END_TURN_BUTTON.x, END_TURN_BUTTON.y);
    this.button.setSize(END_TURN_BUTTON.width, END_TURN_BUTTON.height);
    this.button.setInteractive();
    this.button.on("pointerup", onEndTurn);
  }

  public render(viewModel: CombatViewModel, locked: boolean): void {
    this.container.removeAll(true);
    this.container.add(this.scene.add.rectangle(0, 0, HUD_AREA.width, HUD_AREA.height, 0x10151f, 0.92)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x5f6f89));
    this.container.add(this.scene.add.text(HUD_TEXT.x, HUD_TEXT.titleY, "Combat", {
      color: "#f6f1e8",
      fontFamily: "Inter, sans-serif",
      fontSize: HUD_TEXT.fontSize.title
    }));
    this.container.add(this.scene.add.text(HUD_TEXT.x, HUD_TEXT.phaseY, `Phase: ${viewModel.phase}`, {
      color: "#b8c5d9",
      fontFamily: "Inter, sans-serif",
      fontSize: HUD_TEXT.fontSize.body
    }));
    this.container.add(this.scene.add.text(HUD_TEXT.x, HUD_TEXT.turnY, `Turn: ${viewModel.turnNumber}`, {
      color: "#b8c5d9",
      fontFamily: "Inter, sans-serif",
      fontSize: HUD_TEXT.fontSize.body
    }));
    this.container.add(this.scene.add.text(HUD_TEXT.x, HUD_TEXT.energyY, `Energy: ${viewModel.energy}/${viewModel.maxEnergy}`, {
      color: "#ffd166",
      fontFamily: "Inter, sans-serif",
      fontSize: HUD_TEXT.fontSize.energy
    }));
    this.container.add(this.scene.add.text(HUD_TEXT.pileX, HUD_TEXT.energyY, `Draw ${viewModel.drawPileCount} / Discard ${viewModel.discardPileCount}`, {
      color: "#b8c5d9",
      fontFamily: "Inter, sans-serif",
      fontSize: HUD_TEXT.fontSize.pile
    }));

    const disabled = locked || viewModel.phase !== "player_turn";
    this.button.removeAll(true);
    this.button.disableInteractive();
    if (!disabled) {
      this.button.setInteractive();
    }
    this.button.add(this.scene.add.rectangle(0, 0, END_TURN_BUTTON.width, END_TURN_BUTTON.height, disabled ? 0x394150 : 0xd97a35, 1)
      .setStrokeStyle(2, disabled ? 0x647086 : 0xffc26b));
    this.button.add(this.scene.add.text(0, 0, "End Turn", {
      color: disabled ? "#aab4c5" : "#17110b",
      fontFamily: "Inter, sans-serif",
      fontSize: END_TURN_BUTTON.fontSize
    }).setOrigin(0.5));
  }
}
