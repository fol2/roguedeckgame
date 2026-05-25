import { Scene, type GameObjects } from "phaser";
import type { CardInstanceId } from "../../game-core";
import {
  getRunSandboxController
} from "../controllers/run-sandbox-singleton";
import type { RunSandboxController } from "../controllers/RunSandboxController";
import { CombatEventPlayer } from "../animation/CombatEventPlayer";
import { CardPresenter } from "../presenters/CardPresenter";
import { CombatHudPresenter } from "../presenters/CombatHudPresenter";
import { EventLogPresenter } from "../presenters/EventLogPresenter";
import { MonsterPresenter } from "../presenters/MonsterPresenter";
import { PetPresenter } from "../presenters/PetPresenter";
import { PlayerPresenter } from "../presenters/PlayerPresenter";
import {
  COMBAT_BACKGROUND_COLOUR,
  COMBAT_TEXT,
  COMBAT_TITLE,
  OUTCOME_LABEL,
  RESET_RUN_BUTTON
} from "../layout/combat-layout";
import { SceneKeys } from "./SceneKeys";

export class CombatScene extends Scene {
  private sandbox?: RunSandboxController;
  private cardPresenter?: CardPresenter;
  private hudPresenter?: CombatHudPresenter;
  private eventLog?: EventLogPresenter;
  private eventPlayer?: CombatEventPlayer;
  private monsterPresenter?: MonsterPresenter;
  private petPresenter?: PetPresenter;
  private playerPresenter?: PlayerPresenter;
  private outcomeText?: GameObjects.Text;
  private resetButton?: GameObjects.Container;
  private inputLocked = false;

  public constructor() {
    super(SceneKeys.Combat);
  }

  public create(): void {
    this.cameras.main.setBackgroundColor(COMBAT_BACKGROUND_COLOUR);
    this.add.text(COMBAT_TITLE.x, COMBAT_TITLE.y, "Pet Roguelite Combat", {
      color: "#f6f1e8",
      fontFamily: "Inter, sans-serif",
      fontSize: COMBAT_TEXT.titleFontSize
    }).setOrigin(0.5);

    this.sandbox = getRunSandboxController();
    this.eventLog = new EventLogPresenter(this);
    this.eventPlayer = new CombatEventPlayer(this, this.eventLog);
    this.playerPresenter = new PlayerPresenter(this);
    this.petPresenter = new PetPresenter(this);
    this.monsterPresenter = new MonsterPresenter(this);
    this.cardPresenter = new CardPresenter(this, (cardInstanceId) => {
      void this.handleCardSelection(cardInstanceId);
    });
    this.hudPresenter = new CombatHudPresenter(this, () => {
      void this.handleTurnEnd();
    });
    this.outcomeText = this.add.text(OUTCOME_LABEL.x, OUTCOME_LABEL.y, "", {
      color: "#ffd166",
      fontFamily: "Inter, sans-serif",
      fontSize: COMBAT_TEXT.outcomeFontSize
    }).setOrigin(0.5);
    this.resetButton = this.add.container(RESET_RUN_BUTTON.x, RESET_RUN_BUTTON.y);
    this.resetButton.add(this.add.rectangle(0, 0, RESET_RUN_BUTTON.width, RESET_RUN_BUTTON.height, 0x31283f, 1)
      .setStrokeStyle(2, 0xd8b4fe));
    this.resetButton.add(this.add.text(0, 0, "New Run", {
      color: "#f6f1e8",
      fontFamily: "Inter, sans-serif",
      fontSize: RESET_RUN_BUTTON.fontSize
    }).setOrigin(0.5));
    this.resetButton.setSize(RESET_RUN_BUTTON.width, RESET_RUN_BUTTON.height);
    this.resetButton.setInteractive();
    this.resetButton.on("pointerup", () => {
      this.sandbox?.reset();
      this.scene.start(SceneKeys.Map);
    });

    this.renderCurrentState();
  }

  private async handleCardSelection(cardInstanceId: CardInstanceId): Promise<void> {
    if (this.inputLocked || !this.sandbox) {
      return;
    }

    await this.applyAction(this.sandbox.playHandCard(cardInstanceId));
  }

  private async handleTurnEnd(): Promise<void> {
    if (this.inputLocked || !this.sandbox) {
      return;
    }

    await this.applyAction(this.sandbox.endTurn());
  }

  private async applyAction(
    result: ReturnType<RunSandboxController["endTurn"]>
  ): Promise<void> {
    this.inputLocked = true;
    this.renderCurrentState(false);
    await this.eventPlayer?.play(result.events);
    this.renderCurrentState();
    await this.routeIfCombatEnded();
    this.inputLocked = false;
    this.renderCurrentState();
  }

  private async routeIfCombatEnded(): Promise<void> {
    if (!this.sandbox) {
      return;
    }

    const viewModel = this.sandbox.getCombatViewModel();
    if (!viewModel || (viewModel.phase !== "won" && viewModel.phase !== "lost")) {
      return;
    }

    const result = this.sandbox.completeCombatIfEnded();
    this.renderCurrentState(false);
    await this.eventPlayer?.play(result.events);

    const runStatus = this.sandbox.getState().run.status;
    if (runStatus === "reward") {
      this.scene.start(SceneKeys.Reward);
    } else if (runStatus === "map_select") {
      this.scene.start(SceneKeys.Map);
    }
  }

  private renderCurrentState(syncEventLog = true): void {
    if (
      !this.sandbox ||
      !this.cardPresenter ||
      !this.hudPresenter ||
      !this.eventLog ||
      !this.monsterPresenter ||
      !this.petPresenter ||
      !this.playerPresenter ||
      !this.outcomeText ||
      !this.resetButton
    ) {
      return;
    }

    const viewModel = this.sandbox.getCombatViewModel();
    const runStatus = this.sandbox.getState().run.status;
    if (!viewModel) {
      this.scene.start(SceneKeys.Map);
      return;
    }

    const combatEnded = viewModel.phase === "won" || viewModel.phase === "lost";
    const controlsLocked = this.inputLocked || combatEnded;

    this.playerPresenter.render(viewModel.player);
    this.petPresenter.render(viewModel.pets);
    this.monsterPresenter.render(viewModel.monsters, viewModel.monsterIntents);
    this.cardPresenter.render(viewModel.hand, controlsLocked);
    this.hudPresenter.render(viewModel, controlsLocked);
    if (syncEventLog) {
      this.eventLog.setMessages(viewModel.eventMessages);
    }
    this.outcomeText.setText(combatEnded ? `Combat ${viewModel.phase}` : "");
    this.resetButton.setVisible(runStatus === "lost" || runStatus === "completed");
  }
}
