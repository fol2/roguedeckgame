import { Scene, type GameObjects } from "phaser";
import type { RewardOptionViewModel } from "../view-models/reward-view-model";
import { getRunSandboxController } from "../controllers/run-sandbox-singleton";
import { EventLogPresenter } from "../presenters/EventLogPresenter";
import { RewardOptionPresenter } from "../presenters/RewardOptionPresenter";
import { RunHudPresenter } from "../presenters/RunHudPresenter";
import {
  REWARD_BACKGROUND_COLOUR,
  REWARD_SKIP_BUTTON,
  REWARD_TITLE
} from "../layout/reward-layout";
import { configureFixedResolutionStage } from "../layout/fixed-resolution-stage";
import { SceneKeys } from "./SceneKeys";

export class RewardScene extends Scene {
  private readonly sandbox = getRunSandboxController();
  private eventLog?: EventLogPresenter;
  private optionPresenter?: RewardOptionPresenter;
  private runHudPresenter?: RunHudPresenter;
  private skipButton?: GameObjects.Container;
  private inputLocked = false;
  private requestIndex = 0;

  public constructor() {
    super(SceneKeys.Reward);
  }

  public create(): void {
    this.inputLocked = false;
    configureFixedResolutionStage(this);
    this.cameras.main.setBackgroundColor(REWARD_BACKGROUND_COLOUR);
    this.add.text(REWARD_TITLE.x, REWARD_TITLE.y, "Reward", {
      color: "#f6f1e8",
      fontFamily: "Inter, sans-serif",
      fontSize: REWARD_TITLE.fontSize
    }).setOrigin(0.5);
    this.eventLog = new EventLogPresenter(this);
    this.runHudPresenter = new RunHudPresenter(this);
    this.optionPresenter = new RewardOptionPresenter(this, (optionId) => {
      void this.handleRewardSelection(optionId);
    });
    this.skipButton = this.add.container(REWARD_SKIP_BUTTON.x, REWARD_SKIP_BUTTON.y);
    this.skipButton.add(this.add.rectangle(0, 0, REWARD_SKIP_BUTTON.width, REWARD_SKIP_BUTTON.height, 0x31283f, 1)
      .setStrokeStyle(2, 0xd8b4fe));
    this.skipButton.add(this.add.text(0, 0, "Skip", {
      color: "#f6f1e8",
      fontFamily: "Inter, sans-serif",
      fontSize: REWARD_SKIP_BUTTON.fontSize
    }).setOrigin(0.5));
    this.skipButton.setSize(REWARD_SKIP_BUTTON.width, REWARD_SKIP_BUTTON.height);
    this.skipButton.setInteractive();
    this.skipButton.on("pointerup", () => {
      void this.handleSkip();
    });

    this.renderCurrentState();
  }

  private async handleRewardSelection(optionId: RewardOptionViewModel["id"]): Promise<void> {
    if (this.inputLocked) {
      return;
    }

    this.inputLocked = true;
    const result = this.sandbox.claimRewardOption(
      optionId,
      this.sandbox.getRevision(),
      this.nextRequestId("reward-claim")
    );
    if (!result.ok) {
      this.inputLocked = false;
      this.renderCurrentState();
      return;
    }

    this.routeAfterReward();
  }

  private async handleSkip(): Promise<void> {
    if (this.inputLocked) {
      return;
    }

    this.inputLocked = true;
    const result = this.sandbox.skipReward(
      this.sandbox.getRevision(),
      this.nextRequestId("reward-skip")
    );
    if (!result.ok) {
      this.inputLocked = false;
      this.renderCurrentState();
      return;
    }

    this.routeAfterReward();
  }

  private routeAfterReward(): void {
    this.inputLocked = false;
    const runStatus = this.sandbox.getState().run.status;

    if (runStatus === "completed" || runStatus === "lost") {
      this.renderCurrentState();
      return;
    }

    this.scene.start(SceneKeys.Map);
  }

  private renderCurrentState(): void {
    const run = this.sandbox.getRunViewModel();
    const reward = this.sandbox.getRewardViewModel();
    const skipVisible = Boolean(reward?.skipAvailable);

    this.runHudPresenter?.render(run);
    this.optionPresenter?.render(reward?.options ?? [], this.inputLocked);
    this.skipButton?.setVisible(skipVisible);
    this.skipButton?.disableInteractive();
    if (skipVisible && !this.inputLocked) {
      this.skipButton?.setInteractive();
    }
    this.eventLog?.setMessages(reward?.eventMessages ?? run.eventMessages);
  }

  private nextRequestId(prefix: string): string {
    this.requestIndex += 1;
    return `${prefix}-${this.requestIndex}`;
  }
}
