import type { GameObjects, Scene } from "phaser";
import {
  COMBAT_UI_CAPS,
  type CombatantStatusViewModel,
  type CombatViewModel
} from "../view-models/combat-view-model";
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

type CombatHudOptions = {
  readonly selectedCardActive?: boolean;
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

export class CombatHudPresenter {
  private readonly container: GameObjects.Container;
  private readonly button: GameObjects.Container;
  private readonly scene: Scene;

  public constructor(scene: Scene, onEndTurn: () => void) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.button = scene.add.container(END_TURN_BUTTON.x, END_TURN_BUTTON.y);
    this.button.setSize(END_TURN_BUTTON.width, END_TURN_BUTTON.height);
    this.button.setInteractive();
    this.button.on("pointerup", onEndTurn);
  }

  public render(viewModel: CombatViewModel, locked: boolean, options: CombatHudOptions = {}): void {
    this.container.removeAll(true);
    this.renderPlayerHud(viewModel);
    this.renderEnergy(viewModel);
    this.renderPile(DRAW_PILE.x, DRAW_PILE.y, DRAW_PILE.width, DRAW_PILE.height, viewModel.drawPileCount, true);
    this.renderPile(DISCARD_PILE.x, DISCARD_PILE.y, DISCARD_PILE.width, DISCARD_PILE.height, viewModel.discardPileCount, false);

    const disabled = locked || options.selectedCardActive || viewModel.phase !== "player_turn";
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

  private renderPlayerHud(viewModel: CombatViewModel): void {
    const player = viewModel.player;
    const hpFill = player.maxHp > 0 ? Math.max(0, Math.min(1, player.hp / player.maxHp)) : 0;
    const hud = this.scene.add.container(PLAYER_HUD_AREA.x, PLAYER_HUD_AREA.y);

    hud.add(this.scene.add.rectangle(0, 0, PLAYER_HUD_AREA.width, PLAYER_HUD_AREA.height, COMBAT_PANEL_COLOUR, 0.94)
      .setOrigin(0, 0)
      .setStrokeStyle(2, COMBAT_PANEL_STROKE));
    hud.add(this.scene.add.circle(PLAYER_HUD_TEXT.portraitX, PLAYER_HUD_TEXT.portraitY, 24, 0x27415f, 1)
      .setStrokeStyle(2, 0x83b2e4));
    hud.add(this.scene.add.text(PLAYER_HUD_TEXT.nameX, PLAYER_HUD_TEXT.nameY, "Keeper", {
      color: "#f6f1e8",
      fontFamily: "Inter, sans-serif",
      fontSize: PLAYER_HUD_TEXT.fontSize.name
    }));
    hud.add(this.scene.add.text(PLAYER_HUD_TEXT.hpLabelX, PLAYER_HUD_TEXT.hpLabelY, `HP ${player.hp}/${player.maxHp}`, {
      color: "#d8e6f7",
      fontFamily: "Inter, sans-serif",
      fontSize: PLAYER_HUD_TEXT.fontSize.body
    }));
    hud.add(this.scene.add.rectangle(PLAYER_HUD_TEXT.hpBarX, PLAYER_HUD_TEXT.hpBarY, PLAYER_HUD_TEXT.hpBarWidth, PLAYER_HUD_TEXT.hpBarHeight, 0x293241, 1)
      .setOrigin(0, 0.5));
    hud.add(this.scene.add.rectangle(PLAYER_HUD_TEXT.hpBarX, PLAYER_HUD_TEXT.hpBarY, PLAYER_HUD_TEXT.hpBarWidth * hpFill, PLAYER_HUD_TEXT.hpBarHeight, 0xdf6b6b, 1)
      .setOrigin(0, 0.5));
    hud.add(this.scene.add.text(PLAYER_HUD_TEXT.blockX, PLAYER_HUD_TEXT.blockY, `Block ${player.block}`, {
      color: "#bfe6ff",
      fontFamily: "Inter, sans-serif",
      fontSize: PLAYER_HUD_TEXT.fontSize.body
    }));
    hud.add(this.scene.add.text(PLAYER_HUD_TEXT.statusX, PLAYER_HUD_TEXT.statusY, getVisiblePlayerStatusText(player.statuses), {
      color: "#b8c5d9",
      fontFamily: "Inter, sans-serif",
      fontSize: PLAYER_HUD_TEXT.fontSize.status
    }));
    this.container.add(hud);
  }

  private renderEnergy(viewModel: CombatViewModel): void {
    this.container.add(this.scene.add.circle(ENERGY_ORB.x, ENERGY_ORB.y, ENERGY_ORB.radius, 0x4a2d16, 1)
      .setStrokeStyle(3, 0xffb35b));
    this.container.add(this.scene.add.text(ENERGY_ORB.x, ENERGY_ORB.y, `${viewModel.energy}/${viewModel.maxEnergy}`, {
      color: "#ffe0a3",
      fontFamily: "Inter, sans-serif",
      fontSize: ENERGY_ORB.fontSize
    }).setOrigin(0.5));
  }

  private renderPile(x: number, y: number, width: number, height: number, count: number, faceDown: boolean): void {
    this.container.add(this.scene.add.rectangle(x, y, width, height, faceDown ? 0x263f4e : 0x3d2f19, 1)
      .setStrokeStyle(2, faceDown ? 0x7dd3fc : 0xffbd66));
    this.container.add(this.scene.add.rectangle(x + 6, y - 6, width, height, faceDown ? 0x1f3340 : 0x2f2618, 0.65)
      .setStrokeStyle(1, faceDown ? 0x5aaac9 : 0xc9904e));
    this.container.add(this.scene.add.text(x, y + height / 2 + 14, String(count), {
      color: "#f6f1e8",
      fontFamily: "Inter, sans-serif",
      fontSize: DRAW_PILE.fontSize
    }).setOrigin(0.5));
  }
}
