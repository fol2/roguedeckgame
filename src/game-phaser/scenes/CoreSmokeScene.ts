import { Scene } from "phaser";
import {
  GAME_CENTER_X,
  LINE_GAP,
  PANEL_HEIGHT,
  PANEL_PADDING,
  PANEL_WIDTH,
  PANEL_X,
  PANEL_Y,
  TITLE_Y
} from "../layout/game-size";
import { configureFixedResolutionStage } from "../layout/fixed-resolution-stage";
import { buildCoreSmokeViewModel } from "../debug/core-smoke";
import { SceneKeys } from "./SceneKeys";

const TITLE_STYLE = {
  color: "#f6f1e8",
  fontFamily: "Inter, Arial, sans-serif",
  fontSize: "42px",
  fontStyle: "700"
};

const BODY_STYLE = {
  color: "#f6f1e8",
  fontFamily: "Inter, Arial, sans-serif",
  fontSize: "24px"
};

const MUTED_STYLE = {
  color: "#b9c2cc",
  fontFamily: "Inter, Arial, sans-serif",
  fontSize: "20px"
};

export class CoreSmokeScene extends Scene {
  public constructor() {
    super(SceneKeys.CoreSmoke);
  }

  public create(): void {
    configureFixedResolutionStage(this);
    const smoke = buildCoreSmokeViewModel();
    const statusColour = smoke.ok ? 0x2f8f5b : 0x9b3131;

    this.add.rectangle(GAME_CENTER_X, PANEL_Y + PANEL_HEIGHT / 2, PANEL_WIDTH, PANEL_HEIGHT, 0x1b2430, 0.96);
    this.add.rectangle(PANEL_X + 12, PANEL_Y + 12, 18, PANEL_HEIGHT - 24, statusColour, 1);

    this.add.text(GAME_CENTER_X, TITLE_Y, smoke.title, TITLE_STYLE).setOrigin(0.5, 0.5);

    const lines = [
      `Core registry: ${smoke.ok ? "OK" : "ERROR"}`,
      `Act 1 Forest nodes: ${smoke.mapNodeCount ?? "unknown"}`,
      `Run status: ${smoke.runStatus ?? "unknown"}`,
      `Active pet slots: ${smoke.activePetCount ?? "unknown"}`
    ];

    lines.forEach((line, index) => {
      this.add.text(
        PANEL_X + PANEL_PADDING,
        PANEL_Y + PANEL_PADDING + index * LINE_GAP,
        line,
        BODY_STYLE
      );
    });

    smoke.messages.forEach((message, index) => {
      this.add.text(
        PANEL_X + PANEL_PADDING,
        PANEL_Y + PANEL_PADDING + lines.length * LINE_GAP + 28 + index * 34,
        message,
        MUTED_STYLE
      );
    });
  }
}
