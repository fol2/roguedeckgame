import type { GameObjects, Scene } from "phaser";
import type { CardInstanceId } from "../../game-core";
import type { CombatCardViewModel } from "../view-models/combat-view-model";
import { CARD_SIZE, CARD_TEXT, getHandCardPosition } from "../layout/hand-layout";

export class CardPresenter {
  private readonly container: GameObjects.Container;
  private readonly scene: Scene;
  private readonly onSelected: (cardInstanceId: CardInstanceId) => void;

  public constructor(scene: Scene, onSelected: (cardInstanceId: CardInstanceId) => void) {
    this.scene = scene;
    this.onSelected = onSelected;
    this.container = scene.add.container(0, 0);
  }

  public render(cards: readonly CombatCardViewModel[], locked: boolean): void {
    this.container.removeAll(true);

    cards.forEach((card, index) => {
      const position = getHandCardPosition(index, cards.length);
      const group = this.scene.add.container(position.x, position.y);
      const disabled = locked || !card.playable;

      group.setSize(CARD_SIZE.width, CARD_SIZE.height);
      if (!disabled) {
        group.setInteractive();
        group.on("pointerup", () => this.onSelected(card.cardInstanceId));
      }
      group.add(this.scene.add.rectangle(0, 0, CARD_SIZE.width, CARD_SIZE.height, disabled ? 0x2f3540 : 0x263f4e, 1)
        .setStrokeStyle(2, disabled ? 0x687386 : 0x7dd3fc));
      group.add(this.scene.add.text(-CARD_SIZE.width / 2 + CARD_TEXT.leftPadding, -CARD_SIZE.height / 2 + CARD_TEXT.topPadding, card.name, {
        color: "#f6f1e8",
        fontFamily: "Inter, sans-serif",
        fontSize: CARD_TEXT.fontSize.name
      }));
      group.add(this.scene.add.text(CARD_SIZE.width / 2 - CARD_TEXT.costInsetX, -CARD_SIZE.height / 2 + CARD_TEXT.topPadding, String(card.cost), {
        color: "#ffd166",
        fontFamily: "Inter, sans-serif",
        fontSize: CARD_TEXT.fontSize.cost
      }).setOrigin(0.5, 0));
      group.add(this.scene.add.text(-CARD_SIZE.width / 2 + CARD_TEXT.leftPadding, CARD_TEXT.descriptionY, card.description, {
        color: "#c4d0df",
        fontFamily: "Inter, sans-serif",
        fontSize: CARD_TEXT.fontSize.description,
        wordWrap: { width: CARD_SIZE.width - CARD_TEXT.textWrapPadding }
      }));
      group.add(this.scene.add.text(-CARD_SIZE.width / 2 + CARD_TEXT.leftPadding, CARD_SIZE.height / 2 - CARD_TEXT.tagBottomInset, card.tags.join(" "), {
        color: "#8fd6b5",
        fontFamily: "Inter, sans-serif",
        fontSize: CARD_TEXT.fontSize.tags,
        wordWrap: { width: CARD_SIZE.width - CARD_TEXT.textWrapPadding }
      }));
      this.container.add(group);
    });
  }
}
