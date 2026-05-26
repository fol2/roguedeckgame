import type { GameObjects, Scene } from "phaser";
import type { CombatantViewModel } from "../view-models/combat-view-model";
import { KEEPER_AVATAR } from "../layout/combat-layout";

export class PlayerPresenter {
  private readonly container: GameObjects.Container;
  private readonly scene: Scene;

  public constructor(scene: Scene) {
    this.scene = scene;
    this.container = scene.add.container(KEEPER_AVATAR.x, KEEPER_AVATAR.y);
  }

  public render(player: CombatantViewModel, options: { readonly highlighted?: boolean } = {}): void {
    this.container.removeAll(true);
    const aliveColour = player.alive ? 0x83b2e4 : 0x647086;
    const strokeColour = options.highlighted ? 0xffd166 : aliveColour;
    const strokeWidth = options.highlighted ? 4 : 2;

    this.container.add(this.scene.add.ellipse(0, KEEPER_AVATAR.bodyHeight / 2, KEEPER_AVATAR.baseWidth, KEEPER_AVATAR.baseHeight, 0x172132, 0.85)
      .setStrokeStyle(strokeWidth, strokeColour));
    this.container.add(this.scene.add.rectangle(0, 0, KEEPER_AVATAR.bodyWidth, KEEPER_AVATAR.bodyHeight, player.alive ? 0x27415f : 0x2c3038, 1)
      .setStrokeStyle(2, strokeColour));
    this.container.add(this.scene.add.circle(0, -KEEPER_AVATAR.bodyHeight / 2, KEEPER_AVATAR.headRadius, player.alive ? 0x3f5d7c : 0x394150, 1)
      .setStrokeStyle(2, aliveColour));
    this.container.add(this.scene.add.line(0, 0, KEEPER_AVATAR.bodyWidth / 2, -KEEPER_AVATAR.bodyHeight / 4, KEEPER_AVATAR.bodyWidth, -KEEPER_AVATAR.bodyHeight / 8, 0xffd166)
      .setLineWidth(3));
    this.container.add(this.scene.add.text(0, KEEPER_AVATAR.labelY, player.name, {
      color: "#d8e6f7",
      fontFamily: "Inter, sans-serif",
      fontSize: KEEPER_AVATAR.fontSize.label
    }).setOrigin(0.5));
  }
}
