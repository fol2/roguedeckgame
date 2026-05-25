import type { GameObjects, Scene } from "phaser";
import type { RewardOptionViewModel } from "../view-models/reward-view-model";
import {
  REWARD_OPTION_PANEL,
  getRewardOptionPosition
} from "../layout/reward-layout";

export class RewardOptionPresenter {
  private readonly container: GameObjects.Container;
  private readonly scene: Scene;
  private readonly onSelected: (optionId: RewardOptionViewModel["id"]) => void;

  public constructor(scene: Scene, onSelected: (optionId: RewardOptionViewModel["id"]) => void) {
    this.scene = scene;
    this.onSelected = onSelected;
    this.container = scene.add.container(0, 0);
  }

  public render(options: readonly RewardOptionViewModel[], locked: boolean): void {
    this.container.removeAll(true);

    options.forEach((option, index) => {
      const position = getRewardOptionPosition(index);
      const group = this.scene.add.container(position.x, position.y);
      const fill = option.type === "petUpgrade" ? 0x3a2748 : 0x263f4e;

      group.setSize(REWARD_OPTION_PANEL.width, REWARD_OPTION_PANEL.height);
      if (!locked) {
        group.setInteractive();
        group.on("pointerup", () => this.onSelected(option.id));
      }
      group.add(this.scene.add.rectangle(0, 0, REWARD_OPTION_PANEL.width, REWARD_OPTION_PANEL.height, fill, 1)
        .setStrokeStyle(2, locked ? 0x687386 : 0xd8b4fe));
      group.add(this.scene.add.text(-REWARD_OPTION_PANEL.width / 2 + REWARD_OPTION_PANEL.textInset, REWARD_OPTION_PANEL.titleY, option.title, {
        color: "#f6f1e8",
        fontFamily: "Inter, sans-serif",
        fontSize: REWARD_OPTION_PANEL.fontSize.title,
        wordWrap: { width: REWARD_OPTION_PANEL.width - REWARD_OPTION_PANEL.textWrapPadding }
      }));
      group.add(this.scene.add.text(-REWARD_OPTION_PANEL.width / 2 + REWARD_OPTION_PANEL.textInset, REWARD_OPTION_PANEL.subtitleY, option.subtitle, {
        color: "#ffd166",
        fontFamily: "Inter, sans-serif",
        fontSize: REWARD_OPTION_PANEL.fontSize.subtitle,
        wordWrap: { width: REWARD_OPTION_PANEL.width - REWARD_OPTION_PANEL.textWrapPadding }
      }));
      group.add(this.scene.add.text(-REWARD_OPTION_PANEL.width / 2 + REWARD_OPTION_PANEL.textInset, REWARD_OPTION_PANEL.descriptionY, option.description, {
        color: "#c4d0df",
        fontFamily: "Inter, sans-serif",
        fontSize: REWARD_OPTION_PANEL.fontSize.description,
        wordWrap: { width: REWARD_OPTION_PANEL.width - REWARD_OPTION_PANEL.textWrapPadding }
      }));
      this.container.add(group);
    });
  }
}
