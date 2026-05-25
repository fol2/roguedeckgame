import type { GameObjects, Scene } from "phaser";
import type { CombatantViewModel } from "../view-models/combat-view-model";
import { PLAYER_AREA, PLAYER_TEXT } from "../layout/combat-layout";

export class PlayerPresenter {
  private readonly container: GameObjects.Container;
  private readonly scene: Scene;

  public constructor(scene: Scene) {
    this.scene = scene;
    this.container = scene.add.container(PLAYER_AREA.x, PLAYER_AREA.y);
  }

  public render(player: CombatantViewModel): void {
    this.container.removeAll(true);
    this.container.add(this.scene.add.rectangle(0, 0, PLAYER_AREA.width, PLAYER_AREA.height, 0x27415f, 1)
      .setStrokeStyle(2, 0x83b2e4));
    this.container.add(this.scene.add.text(0, PLAYER_TEXT.nameY, player.name, {
      color: "#f6f1e8",
      fontFamily: "Inter, sans-serif",
      fontSize: PLAYER_TEXT.fontSize.name
    }).setOrigin(0.5));
    this.container.add(this.scene.add.text(0, PLAYER_TEXT.statsY, `HP ${player.hp}/${player.maxHp}   Block ${player.block}`, {
      color: "#d8e6f7",
      fontFamily: "Inter, sans-serif",
      fontSize: PLAYER_TEXT.fontSize.stats
    }).setOrigin(0.5));
    this.container.add(this.scene.add.text(0, PLAYER_TEXT.statusY, player.statuses.map((status) => `${status.statusId} ${status.stacks}`).join("  ") || "No status", {
      color: "#b8c5d9",
      fontFamily: "Inter, sans-serif",
      fontSize: PLAYER_TEXT.fontSize.status
    }).setOrigin(0.5));
  }
}
