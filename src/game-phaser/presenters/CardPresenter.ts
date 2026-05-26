import type { GameObjects, Scene } from "phaser";
import type { CardInstanceId } from "../../game-core";
import { COMBAT_UI_CAPS, type CombatCardViewModel } from "../view-models/combat-view-model";
import { CARD_SIZE, CARD_TEXT, HAND_LAYOUT, getHandCardPosition } from "../layout/hand-layout";
import { TOOLTIP_DELAYS_MS, type CombatTooltip } from "./CombatOverlayPresenter";

type CardRenderOptions = {
  readonly selectedCardId?: CardInstanceId;
  readonly hoveredCardId?: CardInstanceId;
};

type PointerLike = {
  readonly button?: number;
  readonly rightButtonDown?: () => boolean;
};

const getCardPreviewDescription = (description: string): string => {
  if (description.length <= CARD_TEXT.descriptionMaxLength) {
    return description;
  }

  return `${description.slice(0, CARD_TEXT.descriptionMaxLength - 3).trimEnd()}...`;
};

const getCardTagLabel = (tag: string): string =>
  tag.length > 4 ? tag.slice(0, 4) : tag;

export class CardPresenter {
  private readonly container: GameObjects.Container;
  private readonly scene: Scene;
  private readonly onSelected: (cardInstanceId: CardInstanceId) => void;
  private readonly onHoverChanged: (cardInstanceId?: CardInstanceId) => void;
  private readonly onInspect: (cardInstanceId: CardInstanceId) => void;
  private readonly onTooltipChanged: (tooltip?: CombatTooltip) => void;

  public constructor(
    scene: Scene,
    onSelected: (cardInstanceId: CardInstanceId) => void,
    onHoverChanged: (cardInstanceId?: CardInstanceId) => void = () => undefined,
    onInspect: (cardInstanceId: CardInstanceId) => void = () => undefined,
    onTooltipChanged: (tooltip?: CombatTooltip) => void = () => undefined
  ) {
    this.scene = scene;
    this.onSelected = onSelected;
    this.onHoverChanged = onHoverChanged;
    this.onInspect = onInspect;
    this.onTooltipChanged = onTooltipChanged;
    this.container = scene.add.container(0, 0);
  }

  public render(cards: readonly CombatCardViewModel[], locked: boolean, options: CardRenderOptions = {}): void {
    this.container.removeAll(true);

    cards.forEach((card, index) => {
      const visibleTags = card.tags.slice(0, COMBAT_UI_CAPS.maxCardVisibleTags);
      const visibleTagTooltips = card.tagTooltips.slice(0, COMBAT_UI_CAPS.maxCardVisibleTags);
      const hiddenTagCount = Math.max(0, card.tags.length - visibleTags.length);
      const isSelected = options.selectedCardId === card.cardInstanceId;
      const isHovered = options.hoveredCardId === card.cardInstanceId;
      const position = getHandCardPosition(index, cards.length);
      const group = this.scene.add.container(
        position.x,
        position.y - (isSelected || isHovered ? HAND_LAYOUT.hoverLift : 0)
      );
      const disabled = locked || !card.playable;
      const borderColour = card.isPetCommand ? 0xffb35b : card.type === "attack" ? 0x7dd3fc : 0xa7f3d0;
      const fillColour = disabled ? 0x2f3540 : card.isPetCommand ? 0x4a321f : 0x263f4e;
      const strokeWidth = isSelected ? 4 : isHovered ? 3 : 2;

      group.setSize(CARD_SIZE.width, CARD_SIZE.height);
      group.setScale(isHovered && !isSelected ? HAND_LAYOUT.hoverScale : 1);
      if (!locked) {
        const showUnplayableTooltip = (): void => {
          if (!card.playable) {
            this.onTooltipChanged({
              title: card.name,
              body: card.unplayableReason ?? "Card cannot be played.",
              x: position.x,
              y: position.y - CARD_SIZE.height,
              delayMs: TOOLTIP_DELAYS_MS.unplayable
            });
          }
        };

        group.setInteractive();
        group.on("pointerover", () => {
          this.onHoverChanged(card.cardInstanceId);
          showUnplayableTooltip();
        });
        group.on("pointermove", showUnplayableTooltip);
        group.on("pointerout", () => {
          this.onHoverChanged(undefined);
          this.onTooltipChanged(undefined);
        });
        group.on("pointerup", (pointer: PointerLike) => {
          if (pointer.button === 2 || pointer.rightButtonDown?.() === true) {
            this.onInspect(card.cardInstanceId);
            return;
          }

          this.onSelected(card.cardInstanceId);
        });
      }
      group.add(this.scene.add.rectangle(0, 0, CARD_SIZE.width, CARD_SIZE.height, fillColour, 1)
        .setStrokeStyle(strokeWidth, disabled ? 0x687386 : borderColour));
      group.add(this.scene.add.rectangle(-CARD_SIZE.width / 2 + CARD_TEXT.costInsetX, -CARD_SIZE.height / 2 + CARD_TEXT.topPadding + 6, 26, 26, 0x151923, 1)
        .setStrokeStyle(2, disabled ? 0x687386 : 0xffd166));
      group.add(this.scene.add.text(-CARD_SIZE.width / 2 + CARD_TEXT.costInsetX, -CARD_SIZE.height / 2 + CARD_TEXT.topPadding - 1, String(card.cost), {
        color: disabled ? "#aab4c5" : "#ffd166",
        fontFamily: "Inter, sans-serif",
        fontSize: CARD_TEXT.fontSize.cost
      }).setOrigin(0.5, 0));
      group.add(this.scene.add.text(-CARD_SIZE.width / 2 + CARD_TEXT.nameX, -CARD_SIZE.height / 2 + CARD_TEXT.topPadding, card.name, {
        color: disabled ? "#aab4c5" : "#f6f1e8",
        fontFamily: "Inter, sans-serif",
        fontSize: CARD_TEXT.fontSize.name,
        wordWrap: { width: CARD_SIZE.width - CARD_TEXT.nameWrapPadding }
      }));
      group.add(this.scene.add.text(-CARD_SIZE.width / 2 + CARD_TEXT.leftPadding, CARD_TEXT.typeY, card.isPetCommand ? "PET-CMD" : card.type.toUpperCase(), {
        color: card.isPetCommand ? "#ffcf8a" : "#8fd6b5",
        fontFamily: "Inter, sans-serif",
        fontSize: CARD_TEXT.fontSize.type
      }));
      group.add(this.scene.add.rectangle(0, CARD_TEXT.artY, CARD_SIZE.width - CARD_TEXT.textWrapPadding, 30, 0x1a2432, 1)
        .setStrokeStyle(1, 0x5f6f89));
      group.add(this.scene.add.text(-CARD_SIZE.width / 2 + CARD_TEXT.leftPadding, CARD_TEXT.descriptionY, getCardPreviewDescription(card.description), {
        color: disabled ? "#8d98aa" : "#c4d0df",
        fontFamily: "Inter, sans-serif",
        fontSize: CARD_TEXT.fontSize.description,
        wordWrap: { width: CARD_SIZE.width - CARD_TEXT.textWrapPadding }
      }));
      const tagLabels = [
        ...visibleTags.map(getCardTagLabel),
        ...(hiddenTagCount > 0 ? [`+${hiddenTagCount}`] : [])
      ];
      tagLabels.forEach((tagLabel, tagIndex) => {
        const tagTooltip = tagLabel.startsWith("+")
          ? card.tagOverflowTooltip
          : visibleTagTooltips[tagIndex];
        const tagX = -CARD_SIZE.width / 2 + CARD_TEXT.leftPadding + tagIndex * 24;
        const tagY = CARD_SIZE.height / 2 - CARD_TEXT.tagBottomInset;
        const tagText = this.scene.add.text(tagX, tagY, tagLabel, {
          color: card.isPetCommand ? "#ffc36b" : "#8fd6b5",
          fontFamily: "Inter, sans-serif",
          fontSize: CARD_TEXT.fontSize.tags
        });
        tagText.setInteractive();
        tagText.on("pointerover", () => this.onTooltipChanged({
          title: tagTooltip?.title ?? tagLabel,
          body: tagTooltip?.body ?? "No details available yet.",
          x: position.x + tagX,
          y: position.y + tagY,
          delayMs: TOOLTIP_DELAYS_MS.statusIntent
        }));
        tagText.on("pointermove", () => this.onTooltipChanged({
          title: tagTooltip?.title ?? tagLabel,
          body: tagTooltip?.body ?? "No details available yet.",
          x: position.x + tagX,
          y: position.y + tagY,
          delayMs: TOOLTIP_DELAYS_MS.statusIntent
        }));
        tagText.on("pointerout", () => this.onTooltipChanged(undefined));
        group.add(tagText);
      });

      if (isSelected) {
        group.add(this.scene.add.rectangle(0, 0, CARD_SIZE.width + 8, CARD_SIZE.height + 8, 0xffb35b, 0)
          .setStrokeStyle(2, 0xffe0a3));
      }

      this.container.add(group);
    });
  }
}
