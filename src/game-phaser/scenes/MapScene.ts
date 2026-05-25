import { Scene, type GameObjects } from "phaser";
import type { RunNodeViewModel } from "../view-models/run-view-model";
import { getRunSandboxController } from "../controllers/run-sandbox-singleton";
import { EventLogPresenter } from "../presenters/EventLogPresenter";
import { MapNodePresenter } from "../presenters/MapNodePresenter";
import { RunHudPresenter } from "../presenters/RunHudPresenter";
import {
  MAP_BACKGROUND_COLOUR,
  MAP_RESET_BUTTON,
  MAP_TITLE
} from "../layout/map-layout";
import { SceneKeys } from "./SceneKeys";

export class MapScene extends Scene {
  private readonly sandbox = getRunSandboxController();
  private eventLog?: EventLogPresenter;
  private mapNodePresenter?: MapNodePresenter;
  private runHudPresenter?: RunHudPresenter;
  private resetButton?: GameObjects.Container;
  private inputLocked = false;

  public constructor() {
    super(SceneKeys.Map);
  }

  public create(): void {
    this.inputLocked = false;
    this.cameras.main.setBackgroundColor(MAP_BACKGROUND_COLOUR);
    this.add.text(MAP_TITLE.x, MAP_TITLE.y, "Run Map", {
      color: "#f6f1e8",
      fontFamily: "Inter, sans-serif",
      fontSize: MAP_TITLE.fontSize
    }).setOrigin(0.5);
    this.eventLog = new EventLogPresenter(this);
    this.runHudPresenter = new RunHudPresenter(this);
    this.mapNodePresenter = new MapNodePresenter(this, (nodeId) => {
      void this.handleNodeSelection(nodeId);
    });
    this.resetButton = this.add.container(MAP_RESET_BUTTON.x, MAP_RESET_BUTTON.y);
    this.resetButton.add(this.add.rectangle(0, 0, MAP_RESET_BUTTON.width, MAP_RESET_BUTTON.height, 0x31283f, 1)
      .setStrokeStyle(2, 0xd8b4fe));
    this.resetButton.add(this.add.text(0, 0, "New Run", {
      color: "#f6f1e8",
      fontFamily: "Inter, sans-serif",
      fontSize: MAP_RESET_BUTTON.fontSize
    }).setOrigin(0.5));
    this.resetButton.setSize(MAP_RESET_BUTTON.width, MAP_RESET_BUTTON.height);
    this.resetButton.setInteractive();
    this.resetButton.on("pointerup", () => {
      this.sandbox.reset();
      this.renderCurrentState();
    });

    this.renderCurrentState();
  }

  private async handleNodeSelection(nodeId: RunNodeViewModel["id"]): Promise<void> {
    if (this.inputLocked) {
      return;
    }

    this.inputLocked = true;
    const result = this.sandbox.selectMapNode(nodeId);
    if (!result.ok) {
      this.inputLocked = false;
      this.renderCurrentState();
      return;
    }

    const run = this.sandbox.getRunViewModel();
    const selectedNode = run.nodes.find((node) => node.id === nodeId);

    if (this.sandbox.getCombatViewModel()) {
      this.inputLocked = false;
      this.scene.start(SceneKeys.Combat);
      return;
    }

    if (selectedNode?.type === "event" || selectedNode?.type === "rest") {
      const completion = this.sandbox.completeNonCombatNode();
      if (!completion.ok) {
        this.inputLocked = false;
        this.renderCurrentState();
        return;
      }
    }

    this.inputLocked = false;
    this.renderCurrentState();
  }

  private renderCurrentState(): void {
    const run = this.sandbox.getRunViewModel();

    this.runHudPresenter?.render(run);
    this.mapNodePresenter?.render(run.nodes);
    this.eventLog?.setMessages(run.eventMessages);
    this.resetButton?.setVisible(run.resetAvailable);
    this.resetButton?.disableInteractive();
    if (run.resetAvailable) {
      this.resetButton?.setInteractive();
    }
  }
}
