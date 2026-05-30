import type { GameObjects, Scene } from "phaser";
import { CombatAssetKeys } from "../assets/combat-asset-keys";
import { EVENT_LOG_AREA } from "../layout/combat-layout";

export class EventLogPresenter {
  private readonly container: GameObjects.Container;
  private readonly lines: string[] = [];

  public constructor(scene: Scene) {
    this.container = scene.add.container(EVENT_LOG_AREA.x, EVENT_LOG_AREA.y);
    this.container.add(scene.add.rectangle(0, 0, EVENT_LOG_AREA.width, EVENT_LOG_AREA.height, 0x10151f, 0.92)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x5f6f89));
    this.renderLines(scene);
  }

  public setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  public setMessages(messages: readonly string[]): void {
    this.lines.splice(0, this.lines.length, ...messages.slice(-EVENT_LOG_AREA.maxLines));
    this.renderLines();
  }

  public append(message: string): void {
    this.lines.push(message);
    this.lines.splice(0, Math.max(0, this.lines.length - EVENT_LOG_AREA.maxLines));
    this.renderLines();
  }

  private renderLines(scene = this.container.scene): void {
    this.container.removeAll(true);
    this.container.add(scene.add.rectangle(0, 0, EVENT_LOG_AREA.width, EVENT_LOG_AREA.height, 0x10151f, 0.92)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x5f6f89));
    if (scene.textures.exists(CombatAssetKeys.uiPanels.eventLogPanel)) {
      this.container.add(scene.add.image(EVENT_LOG_AREA.width / 2, EVENT_LOG_AREA.height / 2, CombatAssetKeys.uiPanels.eventLogPanel)
        .setDisplaySize(EVENT_LOG_AREA.width, EVENT_LOG_AREA.height));
    }
    this.container.add(scene.add.text(EVENT_LOG_AREA.titleX, EVENT_LOG_AREA.titleY, "Event Log", {
      color: "#f6f1e8",
      fontFamily: "Inter, sans-serif",
      fontSize: EVENT_LOG_AREA.fontSize.title
    }));

    this.lines.forEach((line, index) => {
      this.container.add(scene.add.text(
        EVENT_LOG_AREA.lineX,
        EVENT_LOG_AREA.firstLineY + index * EVENT_LOG_AREA.lineHeight,
        line,
        {
        color: "#b8c5d9",
        fontFamily: "Inter, sans-serif",
        fontSize: EVENT_LOG_AREA.fontSize.line,
        wordWrap: { width: EVENT_LOG_AREA.width - EVENT_LOG_AREA.textWrapPadding }
        }
      ));
    });
  }
}
