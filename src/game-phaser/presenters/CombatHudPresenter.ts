import type { GameObjects, Scene } from "phaser";
import {
  COMBAT_UI_CAPS,
  type CombatantStatusViewModel,
  type CombatViewModel
} from "../view-models/combat-view-model";
import type { CombatParityCombatantSnapshot } from "../debug/combat-parity";
import {
  COMBAT_PANEL_COLOUR,
  COMBAT_PANEL_STROKE,
  DISCARD_PILE,
  DRAW_PILE,
  END_TURN_BUTTON,
  ENERGY_ORB,
  PLAYER_HUD_AREA,
  PLAYER_HUD_TEXT
} from "../layout/combat-layout";
import { GAME_HEIGHT, GAME_WIDTH } from "../layout/game-size";
import { TOOLTIP_DELAYS_MS, type CombatDetailPanel, type CombatTooltip } from "./CombatOverlayPresenter";
import { CombatAssetKeys, type CombatAssetKey } from "../assets/combat-asset-keys";
import {
  CombatFallbackAssetKeys,
  resolveCombatTexture,
  type CombatAssetAvailability
} from "../assets/combat-fallback-assets";
import { STATUS_ICON_LAYOUT } from "../layout/status-icon-layout";

type CombatHudOptions = {
  readonly selectedCardActive?: boolean;
};

export type CombatHudParitySnapshot = {
  readonly piles: {
    readonly draw: number;
    readonly discard: number;
  };
  readonly player: CombatParityCombatantSnapshot;
};

type PointerLike = {
  readonly button?: number;
  readonly rightButtonDown?: () => boolean;
};

type InteractiveGameObject = GameObjects.GameObject & {
  readonly setInteractive: () => InteractiveGameObject;
  readonly on: (event: string, handler: (...args: never[]) => void) => InteractiveGameObject;
};

const getVisiblePlayerStatusText = (statuses: readonly CombatantStatusViewModel[]): string => {
  const visibleStatuses = statuses.slice(0, COMBAT_UI_CAPS.maxPlayerVisibleStatuses);
  const hiddenStatusCount = Math.max(0, statuses.length - visibleStatuses.length);
  const labels = [
    ...visibleStatuses.map((status) => status.label),
    ...(hiddenStatusCount > 0 ? [`+${hiddenStatusCount}`] : [])
  ];

  return labels.join("  ") || "No status";
};

const getVisiblePlayerStatusChips = (
  statuses: readonly CombatantStatusViewModel[],
  overflowTooltip: CombatViewModel["player"]["statusOverflowTooltip"]
) => {
  const visibleStatuses = statuses.slice(0, COMBAT_UI_CAPS.maxPlayerVisibleStatuses);
  const hiddenStatusCount = Math.max(0, statuses.length - visibleStatuses.length);

  return [
    ...visibleStatuses.map((status) => ({
      label: status.label,
      title: status.label,
      body: status.tooltip
    })),
    ...(hiddenStatusCount > 0 && overflowTooltip
      ? [{
          label: `+${hiddenStatusCount}`,
          title: overflowTooltip.title,
          body: overflowTooltip.body
        }]
    : [])
  ];
};

const parsePlayerHpLabel = (label: string): Pick<CombatParityCombatantSnapshot, "hp" | "maxHp"> => {
  const match = /^HP\s+(\d+)\/(\d+)$/.exec(label);

  return {
    hp: match ? Number(match[1]) : Number.NaN,
    maxHp: match ? Number(match[2]) : Number.NaN
  };
};

const parsePlayerBlockLabel = (label: string): Pick<CombatParityCombatantSnapshot, "block"> => {
  const match = /^Block\s+(\d+)$/.exec(label);

  return {
    block: match ? Number(match[1]) : Number.NaN
  };
};

const getStatusAssetKey = (label: string): CombatAssetKey => {
  const normalised = label.toLowerCase();
  if (normalised.startsWith("burn")) {
    return STATUS_ICON_LAYOUT.statusIconKeys.burn;
  }
  if (normalised.startsWith("block")) {
    return STATUS_ICON_LAYOUT.statusIconKeys.block;
  }
  if (normalised.startsWith("guard")) {
    return STATUS_ICON_LAYOUT.statusIconKeys.guard;
  }
  if (normalised.startsWith("empowered")) {
    return STATUS_ICON_LAYOUT.statusIconKeys.empowered;
  }
  if (normalised.startsWith("marked")) {
    return STATUS_ICON_LAYOUT.statusIconKeys.marked;
  }
  if (normalised.startsWith("ready")) {
    return STATUS_ICON_LAYOUT.statusIconKeys.ready;
  }

  return STATUS_ICON_LAYOUT.statusIconKeys.fallback;
};

export class CombatHudPresenter {
  private readonly container: GameObjects.Container;
  private readonly button: GameObjects.Container;
  private readonly scene: Scene;
  private readonly onEndTurn: () => void;
  private readonly onTooltipChanged: (tooltip?: CombatTooltip) => void;
  private readonly onInspect: (detail: CombatDetailPanel) => void;
  private readonly onBlockedEndTurn: () => void;
  private latestParitySnapshot?: CombatHudParitySnapshot;

  public constructor(
    scene: Scene,
    onEndTurn: () => void,
    onTooltipChanged: (tooltip?: CombatTooltip) => void = () => undefined,
    onInspect: (detail: CombatDetailPanel) => void = () => undefined,
    onBlockedEndTurn: () => void = () => undefined
  ) {
    this.scene = scene;
    this.onEndTurn = onEndTurn;
    this.onTooltipChanged = onTooltipChanged;
    this.onInspect = onInspect;
    this.onBlockedEndTurn = onBlockedEndTurn;
    this.container = scene.add.container(0, 0);
    this.button = scene.add.container(END_TURN_BUTTON.x, END_TURN_BUTTON.y);
    this.button.setSize(END_TURN_BUTTON.width, END_TURN_BUTTON.height);
  }

  public render(viewModel: CombatViewModel, locked: boolean, options: CombatHudOptions = {}): void {
    this.container.removeAll(true);
    this.addAssetBackedImage({
      group: this.container,
      assetKey: CombatAssetKeys.uiPanels.bottomHudPlate,
      fallbackKey: CombatFallbackAssetKeys.panel,
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT - 78,
      width: GAME_WIDTH,
      height: 156
    });
    const playerSnapshot = this.renderPlayerHud(viewModel);
    this.renderEnergy(viewModel);
    const drawCount = this.renderPile(DRAW_PILE.x, DRAW_PILE.y, DRAW_PILE.width, DRAW_PILE.height, viewModel.drawPile, true);
    const discardCount = this.renderPile(DISCARD_PILE.x, DISCARD_PILE.y, DISCARD_PILE.width, DISCARD_PILE.height, viewModel.discardPile, false);
    this.latestParitySnapshot = {
      piles: {
        draw: drawCount,
        discard: discardCount
      },
      player: playerSnapshot
    };

    const disabled = locked || options.selectedCardActive || viewModel.phase !== "player_turn";
    this.button.removeAll(true);
    this.button.disableInteractive();
    this.button.setInteractive();
    this.button.removeAllListeners("pointerup");
    this.button.on("pointerup", disabled ? this.onBlockedEndTurn : this.onEndTurn);
    this.button.add(this.scene.add.rectangle(0, 0, END_TURN_BUTTON.width, END_TURN_BUTTON.height, disabled ? 0x394150 : 0xd97a35, 1)
      .setStrokeStyle(2, disabled ? 0x647086 : 0xffc26b));
    this.addAssetBackedImage({
      group: this.button,
      assetKey: CombatAssetKeys.controls.endTurnButton,
      fallbackKey: CombatFallbackAssetKeys.panel,
      x: 0,
      y: 0,
      width: END_TURN_BUTTON.width,
      height: END_TURN_BUTTON.height
    });
    this.button.add(this.scene.add.text(0, 0, "End Turn", {
      color: disabled ? "#aab4c5" : "#17110b",
      fontFamily: "Inter, sans-serif",
      fontSize: END_TURN_BUTTON.fontSize
    }).setOrigin(0.5));
  }

  public getParitySnapshot(): CombatHudParitySnapshot | undefined {
    return this.latestParitySnapshot;
  }

  private renderPlayerHud(viewModel: CombatViewModel): CombatParityCombatantSnapshot {
    const player = viewModel.player;
    const hpFill = player.maxHp > 0 ? Math.max(0, Math.min(1, player.hp / player.maxHp)) : 0;
    const hud = this.scene.add.container(PLAYER_HUD_AREA.x, PLAYER_HUD_AREA.y);
    const hpLabel = `HP ${player.hp}/${player.maxHp}`;
    const blockLabel = `Block ${player.block}`;

    hud.setSize(PLAYER_HUD_AREA.width, PLAYER_HUD_AREA.height);
    hud.setInteractive();
    const showHudTooltip = (): void => this.onTooltipChanged({
      title: player.tooltip.title,
      body: player.tooltip.body,
      x: PLAYER_HUD_AREA.x + PLAYER_HUD_AREA.width,
      y: PLAYER_HUD_AREA.y,
      delayMs: TOOLTIP_DELAYS_MS.general
    });
    hud.on("pointerover", showHudTooltip);
    hud.on("pointermove", showHudTooltip);
    hud.on("pointerout", () => this.onTooltipChanged(undefined));
    hud.on("pointerup", (pointer: PointerLike) => {
      if (pointer.button === 2 || pointer.rightButtonDown?.() === true) {
        this.onInspect({
          title: player.detail.title,
          subtitle: player.detail.subtitle,
          lines: player.detail.lines,
          footer: player.detail.footer
        });
      }
    });
    this.addAssetBackedImage({
      group: hud,
      assetKey: CombatAssetKeys.uiPanels.playerHudFrame,
      fallbackKey: CombatFallbackAssetKeys.panel,
      x: PLAYER_HUD_AREA.width / 2,
      y: PLAYER_HUD_AREA.height / 2,
      width: PLAYER_HUD_AREA.width,
      height: PLAYER_HUD_AREA.height,
      fallback: () => this.scene.add.rectangle(0, 0, PLAYER_HUD_AREA.width, PLAYER_HUD_AREA.height, COMBAT_PANEL_COLOUR, 0.94)
        .setOrigin(0, 0)
        .setStrokeStyle(2, COMBAT_PANEL_STROKE)
    });
    this.addAssetBackedImage({
      group: hud,
      assetKey: CombatAssetKeys.uiPanels.playerHoverFrame,
      fallbackKey: CombatFallbackAssetKeys.panel,
      x: PLAYER_HUD_AREA.width / 2,
      y: PLAYER_HUD_AREA.height / 2,
      width: PLAYER_HUD_AREA.width,
      height: PLAYER_HUD_AREA.height
    });
    this.addAssetBackedImage({
      group: hud,
      assetKey: CombatAssetKeys.uiPanels.playerPortraitFrame,
      fallbackKey: CombatFallbackAssetKeys.panel,
      x: PLAYER_HUD_TEXT.portraitX,
      y: PLAYER_HUD_TEXT.portraitY,
      width: 54,
      height: 54,
      fallback: () => this.scene.add.circle(PLAYER_HUD_TEXT.portraitX, PLAYER_HUD_TEXT.portraitY, 24, 0x27415f, 1)
        .setStrokeStyle(2, 0x83b2e4)
    });
    hud.add(this.scene.add.text(PLAYER_HUD_TEXT.nameX, PLAYER_HUD_TEXT.nameY, "Keeper", {
      color: "#f6f1e8",
      fontFamily: "Inter, sans-serif",
      fontSize: PLAYER_HUD_TEXT.fontSize.name
    }));
    const hpText = this.scene.add.text(PLAYER_HUD_TEXT.hpLabelX, PLAYER_HUD_TEXT.hpLabelY, hpLabel, {
      color: "#d8e6f7",
      fontFamily: "Inter, sans-serif",
      fontSize: PLAYER_HUD_TEXT.fontSize.body
    });
    hud.add(hpText);
    this.addAssetBackedImage({
      group: hud,
      assetKey: CombatAssetKeys.uiPanels.playerHpBarTrack,
      fallbackKey: CombatFallbackAssetKeys.panel,
      x: PLAYER_HUD_TEXT.hpBarX,
      y: PLAYER_HUD_TEXT.hpBarY,
      width: PLAYER_HUD_TEXT.hpBarWidth,
      height: PLAYER_HUD_TEXT.hpBarHeight,
      originX: 0,
      originY: 0.5,
      fallback: () => this.scene.add.rectangle(PLAYER_HUD_TEXT.hpBarX, PLAYER_HUD_TEXT.hpBarY, PLAYER_HUD_TEXT.hpBarWidth, PLAYER_HUD_TEXT.hpBarHeight, 0x293241, 1)
        .setOrigin(0, 0.5)
    });
    this.addAssetBackedImage({
      group: hud,
      assetKey: CombatAssetKeys.uiPanels.playerHpBarFillMask,
      fallbackKey: CombatFallbackAssetKeys.panel,
      x: PLAYER_HUD_TEXT.hpBarX,
      y: PLAYER_HUD_TEXT.hpBarY,
      width: PLAYER_HUD_TEXT.hpBarWidth * hpFill,
      height: PLAYER_HUD_TEXT.hpBarHeight,
      originX: 0,
      originY: 0.5,
      fallback: () => this.scene.add.rectangle(PLAYER_HUD_TEXT.hpBarX, PLAYER_HUD_TEXT.hpBarY, PLAYER_HUD_TEXT.hpBarWidth * hpFill, PLAYER_HUD_TEXT.hpBarHeight, 0xdf6b6b, 1)
        .setOrigin(0, 0.5)
    });
    const blockText = this.scene.add.text(PLAYER_HUD_TEXT.blockX, PLAYER_HUD_TEXT.blockY, blockLabel, {
      color: "#bfe6ff",
      fontFamily: "Inter, sans-serif",
      fontSize: PLAYER_HUD_TEXT.fontSize.body
    });
    this.addAssetBackedImage({
      group: hud,
      assetKey: CombatAssetKeys.uiPanels.playerBlockBadge,
      fallbackKey: CombatFallbackAssetKeys.panel,
      x: PLAYER_HUD_TEXT.blockX + 20,
      y: PLAYER_HUD_TEXT.blockY + 7,
      width: 48,
      height: 34
    });
    hud.add(blockText);
    hud.add(this.scene.add.text(PLAYER_HUD_TEXT.statusX, PLAYER_HUD_TEXT.statusY, getVisiblePlayerStatusText(player.statuses), {
      color: "#b8c5d9",
      fontFamily: "Inter, sans-serif",
      fontSize: PLAYER_HUD_TEXT.fontSize.status
    }));
    this.addAssetBackedImage({
      group: hud,
      assetKey: CombatAssetKeys.uiPanels.playerStatusTray,
      fallbackKey: CombatFallbackAssetKeys.panel,
      x: PLAYER_HUD_TEXT.statusX + 62,
      y: PLAYER_HUD_TEXT.statusY + 20,
      width: 148,
      height: 30
    });
    getVisiblePlayerStatusChips(player.statuses, player.statusOverflowTooltip).forEach((status, index) => {
      const statusX = PLAYER_HUD_TEXT.statusX + index * 26;
      const statusY = PLAYER_HUD_TEXT.statusY + 20;
      const chip = this.createAssetBackedInteractive({
        assetKey: status.label.startsWith("+") ? STATUS_ICON_LAYOUT.statusIconKeys.overflow : getStatusAssetKey(status.label),
        fallbackKey: CombatFallbackAssetKeys.statusIcon,
        x: statusX,
        y: statusY,
        width: 22,
        height: 18,
        fallback: () => this.scene.add.rectangle(statusX, statusY, 22, 18, 0x223044, 1)
          .setStrokeStyle(1, 0x83b2e4)
      });
      const showStatusTooltip = (): void => this.onTooltipChanged({
        title: status.title,
        body: status.body,
        x: PLAYER_HUD_AREA.x + statusX,
        y: PLAYER_HUD_AREA.y + statusY,
        delayMs: TOOLTIP_DELAYS_MS.statusIntent
      });
      chip.setInteractive();
      chip.on("pointerover", showStatusTooltip);
      chip.on("pointermove", showStatusTooltip);
      chip.on("pointerout", () => this.onTooltipChanged(undefined));
      hud.add(chip);
      hud.add(this.scene.add.text(statusX, statusY, status.label.slice(0, 3), {
        color: "#d8e6f7",
        fontFamily: "Inter, sans-serif",
        fontSize: PLAYER_HUD_TEXT.fontSize.status
      }).setOrigin(0.5));
    });
    this.container.add(hud);

    return {
      id: player.id,
      ...parsePlayerHpLabel(hpText.text),
      ...parsePlayerBlockLabel(blockText.text)
    };
  }

  private renderEnergy(viewModel: CombatViewModel): void {
    this.addAssetBackedImage({
      group: this.container,
      assetKey: CombatAssetKeys.controls.energyOrb,
      fallbackKey: CombatFallbackAssetKeys.panel,
      x: ENERGY_ORB.x,
      y: ENERGY_ORB.y,
      width: ENERGY_ORB.radius * 2,
      height: ENERGY_ORB.radius * 2,
      fallback: () => this.scene.add.circle(ENERGY_ORB.x, ENERGY_ORB.y, ENERGY_ORB.radius, 0x4a2d16, 1)
        .setStrokeStyle(3, 0xffb35b)
    });
    this.container.add(this.scene.add.text(ENERGY_ORB.x, ENERGY_ORB.y, `${viewModel.energy}/${viewModel.maxEnergy}`, {
      color: "#ffe0a3",
      fontFamily: "Inter, sans-serif",
      fontSize: ENERGY_ORB.fontSize
    }).setOrigin(0.5));
  }

  private renderPile(
    x: number,
    y: number,
    width: number,
    height: number,
    pileModel: CombatViewModel["drawPile"],
    faceDown: boolean
  ): number {
    const pile = this.createAssetBackedInteractive({
      assetKey: faceDown ? CombatAssetKeys.controls.drawPile : CombatAssetKeys.controls.discardPile,
      fallbackKey: CombatFallbackAssetKeys.panel,
      x,
      y,
      width,
      height,
      fallback: () => this.scene.add.rectangle(x, y, width, height, faceDown ? 0x263f4e : 0x3d2f19, 1)
        .setStrokeStyle(2, faceDown ? 0x7dd3fc : 0xffbd66)
    });

    pile.setInteractive();
    const showPileTooltip = (): void => this.onTooltipChanged({
      title: pileModel.tooltip.title,
      body: pileModel.tooltip.body,
      x: x + width / 2,
      y: y - height / 2,
      delayMs: TOOLTIP_DELAYS_MS.general
    });
    pile.on("pointerover", showPileTooltip);
    pile.on("pointermove", showPileTooltip);
    pile.on("pointerout", () => this.onTooltipChanged(undefined));
    pile.on("pointerup", (pointer: PointerLike) => {
      if (pointer.button === 2 || pointer.rightButtonDown?.() === true) {
        this.onInspect(pileModel.detail);
      }
    });
    this.container.add(this.scene.add.rectangle(x + 6, y - 6, width, height, faceDown ? 0x1f3340 : 0x2f2618, 0.65)
      .setStrokeStyle(1, faceDown ? 0x5aaac9 : 0xc9904e));
    this.container.add(pile);
    const countText = this.scene.add.text(x, y + height / 2 + 14, String(pileModel.count), {
      color: "#f6f1e8",
      fontFamily: "Inter, sans-serif",
      fontSize: DRAW_PILE.fontSize
    }).setOrigin(0.5);
    this.container.add(countText);

    return Number(countText.text);
  }

  private combatAssetAvailability(): CombatAssetAvailability {
    return {
      hasTexture: (key: string) => this.scene.textures?.exists(key) ?? false
    };
  }

  private addAssetBackedImage({
    group,
    assetKey,
    fallbackKey,
    x,
    y,
    width,
    height,
    originX = 0.5,
    originY = 0.5,
    fallback
  }: {
    readonly group: GameObjects.Container;
    readonly assetKey: CombatAssetKey;
    readonly fallbackKey: CombatAssetKey;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly originX?: number;
    readonly originY?: number;
    readonly fallback?: () => GameObjects.GameObject;
  }): void {
    const resolution = resolveCombatTexture(assetKey, fallbackKey, this.combatAssetAvailability());
    if (resolution.kind === "texture") {
      group.add(this.scene.add.image(x, y, resolution.key).setOrigin(originX, originY).setDisplaySize(width, height));
      return;
    }

    if (fallback) {
      group.add(fallback());
    }
  }

  private createAssetBackedInteractive({
    assetKey,
    fallbackKey,
    x,
    y,
    width,
    height,
    fallback
  }: {
    readonly assetKey: CombatAssetKey;
    readonly fallbackKey: CombatAssetKey;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly fallback: () => GameObjects.Shape;
  }): InteractiveGameObject {
    const resolution = resolveCombatTexture(assetKey, fallbackKey, this.combatAssetAvailability());
    if (resolution.kind === "texture") {
      return this.scene.add.image(x, y, resolution.key).setDisplaySize(width, height) as InteractiveGameObject;
    }

    return fallback();
  }
}
