import type { GameObjects, Scene } from "phaser";
import {
  COMBAT_PANEL_COLOUR,
  COMBAT_PANEL_STROKE,
  DETAIL_OVERLAY,
  PAUSE_OVERLAY,
  QUICK_TOOLTIP,
  UI_WARNING_LABEL
} from "../layout/combat-layout";
import { GAME_HEIGHT, GAME_WIDTH } from "../layout/game-size";

export type CombatTooltip = {
  readonly title: string;
  readonly body: string;
  readonly x: number;
  readonly y: number;
  readonly delayMs?: number;
};

export type CombatDetailPanel = {
  readonly title: string;
  readonly subtitle?: string;
  readonly lines: readonly string[];
  readonly footer?: string;
};

type OverlayRenderOptions = {
  readonly tooltip?: CombatTooltip;
  readonly detail?: CombatDetailPanel;
  readonly pauseOpen?: boolean;
  readonly warnings?: readonly string[];
};

export const TOOLTIP_DELAYS_MS = {
  statusIntent: 250,
  unplayable: 300,
  general: 350
} as const;

export class CombatOverlayPresenter {
  private readonly tooltipContainer: GameObjects.Container;
  private readonly modalContainer: GameObjects.Container;
  private readonly warningContainer: GameObjects.Container;

  public constructor(
    private readonly scene: Scene,
    private readonly onCloseDetail: () => void,
    private readonly onResumePause: () => void
  ) {
    this.warningContainer = scene.add.container(0, 0).setDepth(880);
    this.tooltipContainer = scene.add.container(0, 0).setDepth(900);
    this.modalContainer = scene.add.container(0, 0).setDepth(1000);
  }

  public render(options: OverlayRenderOptions): void {
    this.renderWarnings(options.warnings ?? []);
    this.renderTooltip(options.tooltip);
    this.renderModal(options);
  }

  private renderWarnings(warnings: readonly string[]): void {
    this.warningContainer.removeAll(true);

    if (warnings.length === 0) {
      return;
    }

    const text = this.scene.add.text(UI_WARNING_LABEL.x, UI_WARNING_LABEL.y, warnings.join("  "), {
      color: "#ffd166",
      fontFamily: "Inter, sans-serif",
      fontSize: UI_WARNING_LABEL.fontSize,
      wordWrap: { width: UI_WARNING_LABEL.maxWidth }
    }).setOrigin(0.5, 0);

    this.warningContainer.add(text);
  }

  private renderTooltip(tooltip: CombatTooltip | undefined): void {
    this.tooltipContainer.removeAll(true);

    if (!tooltip) {
      return;
    }

    const bodyLines = tooltip.body.split("\n").slice(0, QUICK_TOOLTIP.maxBodyLines);
    const body = bodyLines.join("\n");
    const tooltipHeight = QUICK_TOOLTIP.minHeight + bodyLines.length * QUICK_TOOLTIP.padding;
    const clampedX = Math.max(
      QUICK_TOOLTIP.padding,
      Math.min(tooltip.x + QUICK_TOOLTIP.offsetX, GAME_WIDTH - QUICK_TOOLTIP.width - QUICK_TOOLTIP.padding)
    );
    const clampedY = Math.max(
      QUICK_TOOLTIP.padding,
      Math.min(tooltip.y + QUICK_TOOLTIP.offsetY, GAME_HEIGHT - tooltipHeight - QUICK_TOOLTIP.padding)
    );

    this.tooltipContainer.add(this.scene.add.rectangle(
      clampedX,
      clampedY,
      QUICK_TOOLTIP.width,
      tooltipHeight,
      COMBAT_PANEL_COLOUR,
      0.98
    ).setOrigin(0, 0).setStrokeStyle(2, COMBAT_PANEL_STROKE));
    this.tooltipContainer.add(this.scene.add.text(clampedX + QUICK_TOOLTIP.padding, clampedY + QUICK_TOOLTIP.titleY, tooltip.title, {
      color: "#f6f1e8",
      fontFamily: "Inter, sans-serif",
      fontSize: QUICK_TOOLTIP.fontSize.title,
      wordWrap: { width: QUICK_TOOLTIP.width - QUICK_TOOLTIP.padding * 2 }
    }));
    this.tooltipContainer.add(this.scene.add.text(clampedX + QUICK_TOOLTIP.padding, clampedY + QUICK_TOOLTIP.bodyY, body || "No details available yet.", {
      color: "#c4d0df",
      fontFamily: "Inter, sans-serif",
      fontSize: QUICK_TOOLTIP.fontSize.body,
      wordWrap: { width: QUICK_TOOLTIP.width - QUICK_TOOLTIP.padding * 2 }
    }));
  }

  private renderModal(options: OverlayRenderOptions): void {
    this.modalContainer.removeAll(true);

    if (options.pauseOpen) {
      this.renderPause();
      return;
    }

    if (options.detail) {
      this.renderDetail(options.detail);
    }
  }

  private renderDetail(detail: CombatDetailPanel): void {
    const blocker = this.scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.45);
    blocker.setInteractive();
    blocker.on("pointerup", this.onCloseDetail);
    this.modalContainer.add(blocker);

    const panel = this.scene.add.container(DETAIL_OVERLAY.x, DETAIL_OVERLAY.y);
    panel.setSize(DETAIL_OVERLAY.width, DETAIL_OVERLAY.height);
    panel.setInteractive();
    panel.on("pointerup", () => undefined);
    panel.add(this.scene.add.rectangle(0, 0, DETAIL_OVERLAY.width, DETAIL_OVERLAY.height, COMBAT_PANEL_COLOUR, 1)
      .setStrokeStyle(2, 0xffd166));
    panel.add(this.scene.add.text(-DETAIL_OVERLAY.width / 2 + DETAIL_OVERLAY.padding, -DETAIL_OVERLAY.height / 2 + DETAIL_OVERLAY.titleY, detail.title, {
      color: "#f6f1e8",
      fontFamily: "Inter, sans-serif",
      fontSize: DETAIL_OVERLAY.fontSize.title,
      wordWrap: { width: DETAIL_OVERLAY.width - DETAIL_OVERLAY.padding * 2 }
    }));
    panel.add(this.scene.add.text(-DETAIL_OVERLAY.width / 2 + DETAIL_OVERLAY.padding, -DETAIL_OVERLAY.height / 2 + DETAIL_OVERLAY.subtitleY, detail.subtitle ?? "Combat detail", {
      color: "#ffd166",
      fontFamily: "Inter, sans-serif",
      fontSize: DETAIL_OVERLAY.fontSize.subtitle,
      wordWrap: { width: DETAIL_OVERLAY.width - DETAIL_OVERLAY.padding * 2 }
    }));

    detail.lines.slice(0, 10).forEach((line, index) => {
      panel.add(this.scene.add.text(
        -DETAIL_OVERLAY.width / 2 + DETAIL_OVERLAY.padding,
        -DETAIL_OVERLAY.height / 2 + DETAIL_OVERLAY.lineStartY + index * DETAIL_OVERLAY.lineHeight,
        line,
        {
          color: "#d8e6f7",
          fontFamily: "Inter, sans-serif",
          fontSize: DETAIL_OVERLAY.fontSize.line,
          wordWrap: { width: DETAIL_OVERLAY.width - DETAIL_OVERLAY.padding * 2 }
        }
      ));
    });

    panel.add(this.scene.add.text(-DETAIL_OVERLAY.width / 2 + DETAIL_OVERLAY.padding, -DETAIL_OVERLAY.height / 2 + DETAIL_OVERLAY.footerY, detail.footer ?? "Combat detail.", {
      color: "#9fb0c7",
      fontFamily: "Inter, sans-serif",
      fontSize: DETAIL_OVERLAY.fontSize.footer,
      wordWrap: { width: DETAIL_OVERLAY.width - DETAIL_OVERLAY.padding * 2 }
    }));

    const closeButton = this.scene.add.container(DETAIL_OVERLAY.closeX, DETAIL_OVERLAY.closeY);
    closeButton.setSize(DETAIL_OVERLAY.closeSize, DETAIL_OVERLAY.closeSize);
    closeButton.setInteractive();
    closeButton.on("pointerup", this.onCloseDetail);
    closeButton.add(this.scene.add.rectangle(0, 0, DETAIL_OVERLAY.closeSize, DETAIL_OVERLAY.closeSize, 0x31283f, 1)
      .setStrokeStyle(2, 0xffd166));
    closeButton.add(this.scene.add.text(0, 0, "x", {
      color: "#f6f1e8",
      fontFamily: "Inter, sans-serif",
      fontSize: DETAIL_OVERLAY.fontSize.close
    }).setOrigin(0.5));
    panel.add(closeButton);

    this.modalContainer.add(panel);
  }

  private renderPause(): void {
    const blocker = this.scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.58);
    blocker.setInteractive();
    this.modalContainer.add(blocker);

    const panel = this.scene.add.container(PAUSE_OVERLAY.x, PAUSE_OVERLAY.y);
    panel.add(this.scene.add.rectangle(0, 0, PAUSE_OVERLAY.width, PAUSE_OVERLAY.height, COMBAT_PANEL_COLOUR, 1)
      .setStrokeStyle(2, COMBAT_PANEL_STROKE));
    panel.add(this.scene.add.text(0, PAUSE_OVERLAY.titleY, "Paused", {
      color: "#f6f1e8",
      fontFamily: "Inter, sans-serif",
      fontSize: PAUSE_OVERLAY.fontSize.title
    }).setOrigin(0.5));
    panel.add(this.scene.add.text(0, PAUSE_OVERLAY.bodyY, "Combat paused.", {
      color: "#c4d0df",
      fontFamily: "Inter, sans-serif",
      fontSize: PAUSE_OVERLAY.fontSize.body,
      wordWrap: { width: PAUSE_OVERLAY.width - DETAIL_OVERLAY.padding * 2 },
      align: "center"
    }).setOrigin(0.5));

    const resumeButton = this.scene.add.container(0, PAUSE_OVERLAY.resumeY);
    resumeButton.setSize(PAUSE_OVERLAY.resumeWidth, PAUSE_OVERLAY.resumeHeight);
    resumeButton.setInteractive();
    resumeButton.on("pointerup", this.onResumePause);
    resumeButton.add(this.scene.add.rectangle(0, 0, PAUSE_OVERLAY.resumeWidth, PAUSE_OVERLAY.resumeHeight, 0xd97a35, 1)
      .setStrokeStyle(2, 0xffc26b));
    resumeButton.add(this.scene.add.text(0, 0, "Resume", {
      color: "#17110b",
      fontFamily: "Inter, sans-serif",
      fontSize: PAUSE_OVERLAY.fontSize.button
    }).setOrigin(0.5));
    panel.add(resumeButton);

    this.modalContainer.add(panel);
  }
}
