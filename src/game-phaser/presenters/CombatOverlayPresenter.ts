import type { GameObjects, Scene } from "phaser";
import {
  CARD_SIZE,
  CARD_TEXT
} from "../layout/hand-layout";
import { getCardFrameLayout } from "../layout/card-frame-layout";
import {
  CombatFallbackAssetKeys,
  resolveCombatTexture,
  type CombatAssetAvailability
} from "../assets/combat-fallback-assets";
import type { CombatAssetKey } from "../assets/combat-asset-keys";
import { CARD_VISUAL_DISABLED_PALETTE, buildCardVisualSpec } from "../card-visuals/card-visual-generator";
import type { CombatCardViewModel } from "../view-models/combat-view-model";
import {
  COMBAT_PANEL_COLOUR,
  COMBAT_PANEL_STROKE,
  DETAIL_OVERLAY,
  PAUSE_OVERLAY,
  QUICK_TOOLTIP,
  UI_WARNING_LABEL
} from "../layout/combat-layout";
import { GAME_HEIGHT, GAME_WIDTH } from "../layout/game-size";
import { CombatAssetKeys } from "../assets/combat-asset-keys";

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
  readonly card?: CombatCardViewModel;
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

    this.addAssetBackedRectangle({
      group: this.tooltipContainer,
      assetKey: CombatAssetKeys.uiPanels.tooltipPanel,
      fallbackKey: CombatFallbackAssetKeys.panel,
      x: clampedX + QUICK_TOOLTIP.width / 2,
      y: clampedY + tooltipHeight / 2,
      width: QUICK_TOOLTIP.width,
      height: tooltipHeight,
      fillColour: COMBAT_PANEL_COLOUR,
      fillAlpha: 0.98,
      strokeColour: COMBAT_PANEL_STROKE,
      strokeWidth: 2
    });
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
    this.addAssetBackedRectangle({
      group: this.modalContainer,
      assetKey: CombatAssetKeys.uiPanels.clickBlockerTint,
      fallbackKey: CombatAssetKeys.uiPanels.clickBlockerTint,
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT / 2,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      fillColour: 0x000000,
      fillAlpha: 0.45
    });

    const panel = this.scene.add.container(DETAIL_OVERLAY.x, DETAIL_OVERLAY.y);
    panel.setSize(DETAIL_OVERLAY.width, DETAIL_OVERLAY.height);
    panel.setInteractive();
    panel.on("pointerup", () => undefined);
    this.addAssetBackedRectangle({
      group: panel,
      assetKey: CombatAssetKeys.uiPanels.detailPanel,
      fallbackKey: CombatFallbackAssetKeys.panel,
      x: 0,
      y: 0,
      width: DETAIL_OVERLAY.width,
      height: DETAIL_OVERLAY.height,
      fillColour: COMBAT_PANEL_COLOUR,
      fillAlpha: 1,
      strokeColour: 0xffd166,
      strokeWidth: 2
    });
    const detailCard = detail.card;
    if (detailCard) {
      this.renderCardDetail(panel, { ...detail, card: detailCard });
    } else {
      this.renderTextDetail(panel, detail);
    }

    const closeButton = this.scene.add.container(DETAIL_OVERLAY.closeX, DETAIL_OVERLAY.closeY);
    closeButton.setSize(DETAIL_OVERLAY.closeSize, DETAIL_OVERLAY.closeSize);
    closeButton.setInteractive();
    closeButton.on("pointerup", this.onCloseDetail);
    this.addAssetBackedRectangle({
      group: closeButton,
      assetKey: CombatAssetKeys.uiPanels.detailCloseButton,
      fallbackKey: CombatFallbackAssetKeys.panel,
      x: 0,
      y: 0,
      width: DETAIL_OVERLAY.closeSize,
      height: DETAIL_OVERLAY.closeSize,
      fillColour: 0x31283f,
      fillAlpha: 1,
      strokeColour: 0xffd166,
      strokeWidth: 2
    });
    closeButton.add(this.scene.add.text(0, 0, "x", {
      color: "#f6f1e8",
      fontFamily: "Inter, sans-serif",
      fontSize: DETAIL_OVERLAY.fontSize.close
    }).setOrigin(0.5));
    panel.add(closeButton);

    this.modalContainer.add(panel);
  }

  private renderTextDetail(panel: GameObjects.Container, detail: CombatDetailPanel): void {
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

    detail.lines.slice(0, 14).forEach((line, index) => {
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
  }

  private renderCardDetail(panel: GameObjects.Container, detail: CombatDetailPanel & { readonly card: CombatCardViewModel }): void {
    const preview = this.scene.add.container(DETAIL_OVERLAY.cardPreviewX, DETAIL_OVERLAY.cardPreviewY);
    preview.setScale(DETAIL_OVERLAY.cardPreviewScale);
    this.renderStaticCardPreview(preview, detail.card);
    panel.add(preview);

    this.addAssetBackedRectangle({
      group: panel,
      assetKey: CombatAssetKeys.uiPanels.cardDetailSidebar,
      fallbackKey: CombatFallbackAssetKeys.panel,
      x: DETAIL_OVERLAY.sidebarX + DETAIL_OVERLAY.sidebarWidth / 2,
      y: DETAIL_OVERLAY.sidebarY + DETAIL_OVERLAY.sidebarHeight / 2,
      width: DETAIL_OVERLAY.sidebarWidth,
      height: DETAIL_OVERLAY.sidebarHeight,
      fillColour: 0x10151f,
      fillAlpha: 0.96,
      strokeColour: 0x5f6f89,
      strokeAlpha: 0.85,
      strokeWidth: 2
    });
    panel.add(this.scene.add.text(DETAIL_OVERLAY.sidebarX + DETAIL_OVERLAY.padding, DETAIL_OVERLAY.sidebarY + DETAIL_OVERLAY.sidebarTitleY, detail.title, {
      color: "#f6f1e8",
      fontFamily: "Inter, sans-serif",
      fontSize: DETAIL_OVERLAY.fontSize.title,
      wordWrap: { width: DETAIL_OVERLAY.sidebarWidth - DETAIL_OVERLAY.padding * 2 }
    }));
    panel.add(this.scene.add.text(DETAIL_OVERLAY.sidebarX + DETAIL_OVERLAY.padding, DETAIL_OVERLAY.sidebarY + DETAIL_OVERLAY.sidebarSubtitleY, detail.subtitle ?? "Card detail", {
      color: "#ffd166",
      fontFamily: "Inter, sans-serif",
      fontSize: DETAIL_OVERLAY.fontSize.subtitle,
      wordWrap: { width: DETAIL_OVERLAY.sidebarWidth - DETAIL_OVERLAY.padding * 2 }
    }));

    detail.lines.slice(0, 12).forEach((line, index) => {
      panel.add(this.scene.add.text(
        DETAIL_OVERLAY.sidebarX + DETAIL_OVERLAY.padding,
        DETAIL_OVERLAY.sidebarY + DETAIL_OVERLAY.sidebarLineStartY + index * DETAIL_OVERLAY.sidebarLineHeight,
        line,
        {
          color: "#d8e6f7",
          fontFamily: "Inter, sans-serif",
          fontSize: DETAIL_OVERLAY.fontSize.line,
          wordWrap: { width: DETAIL_OVERLAY.sidebarWidth - DETAIL_OVERLAY.padding * 2 }
        }
      ));
    });

    panel.add(this.scene.add.text(DETAIL_OVERLAY.sidebarX + DETAIL_OVERLAY.padding, DETAIL_OVERLAY.sidebarY + DETAIL_OVERLAY.sidebarFooterY, detail.footer ?? "Card detail.", {
      color: "#9fb0c7",
      fontFamily: "Inter, sans-serif",
      fontSize: DETAIL_OVERLAY.fontSize.footer,
      wordWrap: { width: DETAIL_OVERLAY.sidebarWidth - DETAIL_OVERLAY.padding * 2 }
    }));
  }

  private renderStaticCardPreview(group: GameObjects.Container, card: CombatCardViewModel): void {
    const cardVisual = buildCardVisualSpec(card);
    const disabled = !card.playable;
    const palette = disabled ? CARD_VISUAL_DISABLED_PALETTE : cardVisual.palette;
    const borderColour = palette.border;
    const layout = getCardFrameLayout(cardVisual.frameKey);
    const zones = layout.zones;

    this.addAssetBackedRectangle({
      group,
      assetKey: cardVisual.artKey,
      fallbackKey: CombatFallbackAssetKeys.cardArt,
      x: zones.artWindow.x,
      y: zones.artWindow.y,
      width: zones.artWindow.width,
      height: zones.artWindow.height,
      fillColour: 0x1a2432,
      fillAlpha: 1,
      strokeColour: 0x5f6f89
    });
    this.addAssetBackedRectangle({
      group,
      assetKey: cardVisual.frameKey,
      fallbackKey: CombatFallbackAssetKeys.cardFrame,
      x: 0,
      y: 0,
      width: CARD_SIZE.width,
      height: CARD_SIZE.height,
      fillColour: palette.fill,
      fillAlpha: 1,
      strokeColour: disabled ? 0x687386 : borderColour,
      strokeWidth: 2
    });
    group.add(this.scene.add.rectangle(zones.titleBand.x, zones.titleBand.y, zones.titleBand.width, zones.titleBand.height, palette.titleBand, 0.24)
      .setStrokeStyle(1, disabled ? 0x687386 : borderColour, 0.34));
    group.add(this.scene.add.rectangle(zones.costSocket.x, zones.costSocket.y, zones.costSocket.width * 0.72, zones.costSocket.height * 0.72, 0x151923, 0.34)
      .setStrokeStyle(1, disabled ? 0x687386 : 0xffd166, 0.5));
    group.add(this.scene.add.text(zones.costSocket.x, zones.costSocket.y, String(card.cost), {
      color: disabled ? "#aab4c5" : "#ffd166",
      fontFamily: "Inter, sans-serif",
      fontSize: CARD_TEXT.fontSize.cost
    }).setOrigin(0.5));
    group.add(this.scene.add.text(zones.titleBand.x - zones.titleBand.width / 2 + CARD_TEXT.leftPadding, zones.titleBand.y - zones.titleBand.height / 2, card.name, {
      color: palette.titleText,
      fontFamily: "Inter, sans-serif",
      fontSize: CARD_TEXT.fontSize.name,
      wordWrap: { width: zones.titleBand.width - CARD_TEXT.leftPadding * 2 }
    }));
    this.addAssetBackedRectangle({
      group,
      assetKey: cardVisual.rarity.assetKey,
      fallbackKey: CombatFallbackAssetKeys.cardRarityGem,
      x: zones.rarityGemSocket.x,
      y: zones.rarityGemSocket.y,
      width: zones.rarityGemSocket.width,
      height: zones.rarityGemSocket.height,
      fillColour: borderColour,
      fillAlpha: disabled ? 0.35 : 0.9,
      strokeColour: 0xfff0d4,
      strokeAlpha: disabled ? 0.25 : 0.75
    });
    group.add(this.scene.add.rectangle(zones.rulesTextBox.x, zones.rulesTextBox.y, zones.rulesTextBox.width, zones.rulesTextBox.height, palette.rulesBox, 0.44)
      .setStrokeStyle(1, disabled ? 0x3a4352 : 0x5f6f89, 0.6));
    group.add(this.scene.add.text(zones.rulesTextBox.x - zones.rulesTextBox.width / 2 + CARD_TEXT.leftPadding, zones.rulesTextBox.y - zones.rulesTextBox.height / 2 + CARD_TEXT.leftPadding, this.getCardPreviewDescription(card.description), {
      color: palette.bodyText,
      fontFamily: "Inter, sans-serif",
      fontSize: CARD_TEXT.fontSize.description,
      wordWrap: { width: zones.rulesTextBox.width - CARD_TEXT.leftPadding * 2 }
    }));

    cardVisual.tagVisuals.slice(0, zones.tagSlots.length).forEach((tagVisual, tagIndex) => {
      const tagSlot = zones.tagSlots[tagIndex];
      if (!tagSlot) {
        return;
      }
      this.addAssetBackedRectangle({
        group,
        assetKey: tagVisual.assetKey,
        fallbackKey: CombatFallbackAssetKeys.icon,
        x: tagSlot.x,
        y: tagSlot.y,
        width: tagSlot.width,
        height: tagSlot.height,
        fillColour: 0x151923,
        fillAlpha: disabled ? 0.45 : 0.78,
        strokeColour: disabled ? 0x687386 : borderColour,
        strokeAlpha: 0.42
      });
      group.add(this.scene.add.text(tagSlot.x, tagSlot.y, tagVisual.glyph, {
        color: palette.accentText,
        fontFamily: "Inter, sans-serif",
        fontSize: CARD_TEXT.fontSize.tags
      }).setOrigin(0.5));
    });

    if (disabled) {
      group.add(this.scene.add.rectangle(0, 0, CARD_SIZE.width, CARD_SIZE.height, 0x1f242d, 0.52)
        .setStrokeStyle(2, 0x687386, 0.72));
    }
  }

  private addAssetBackedRectangle({
    group,
    assetKey,
    fallbackKey,
    x,
    y,
    width,
    height,
    fillColour,
    fillAlpha,
    strokeColour,
    strokeAlpha = 1,
    strokeWidth = 1
  }: {
    readonly group: GameObjects.Container;
    readonly assetKey: CombatAssetKey;
    readonly fallbackKey: CombatAssetKey;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly fillColour: number;
    readonly fillAlpha: number;
    readonly strokeColour?: number;
    readonly strokeAlpha?: number;
    readonly strokeWidth?: number;
  }): void {
    const resolution = resolveCombatTexture(assetKey, fallbackKey, this.combatAssetAvailability());

    if (resolution.kind === "texture") {
      group.add(this.scene.add.image(x, y, resolution.key).setDisplaySize(width, height));
      return;
    }

    const rectangle = this.scene.add.rectangle(x, y, width, height, fillColour, fillAlpha);
    if (strokeColour !== undefined) {
      rectangle.setStrokeStyle(strokeWidth, strokeColour, strokeAlpha);
    }
    group.add(rectangle);
  }

  private combatAssetAvailability(): CombatAssetAvailability {
    return {
      hasTexture: (key: string) => this.scene.textures.exists(key)
    };
  }

  private getCardPreviewDescription(description: string): string {
    if (description.length <= CARD_TEXT.descriptionMaxLength) {
      return description;
    }

    return `${description.slice(0, CARD_TEXT.descriptionMaxLength - 3).trimEnd()}...`;
  }

  private renderPause(): void {
    const blocker = this.scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.58);
    blocker.setInteractive();
    this.modalContainer.add(blocker);
    this.addAssetBackedRectangle({
      group: this.modalContainer,
      assetKey: CombatAssetKeys.uiPanels.clickBlockerTint,
      fallbackKey: CombatAssetKeys.uiPanels.clickBlockerTint,
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT / 2,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      fillColour: 0x000000,
      fillAlpha: 0.58
    });

    const panel = this.scene.add.container(PAUSE_OVERLAY.x, PAUSE_OVERLAY.y);
    this.addAssetBackedRectangle({
      group: panel,
      assetKey: CombatAssetKeys.uiPanels.pausePanel,
      fallbackKey: CombatFallbackAssetKeys.panel,
      x: 0,
      y: 0,
      width: PAUSE_OVERLAY.width,
      height: PAUSE_OVERLAY.height,
      fillColour: COMBAT_PANEL_COLOUR,
      fillAlpha: 1,
      strokeColour: COMBAT_PANEL_STROKE,
      strokeWidth: 2
    });
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
