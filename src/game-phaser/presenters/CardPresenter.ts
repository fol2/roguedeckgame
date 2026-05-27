import type { GameObjects, Scene } from "phaser";
import type { CardInstanceId, CardPile, GameEvent } from "../../game-core";
import { COMBAT_UI_CAPS, type CombatCardViewModel } from "../view-models/combat-view-model";
import { DISCARD_PILE, DRAW_PILE } from "../layout/combat-layout";
import { CARD_SIZE, CARD_TEXT, HAND_LAYOUT, getHandCardPosition } from "../layout/hand-layout";
import { TOOLTIP_DELAYS_MS, type CombatTooltip } from "./CombatOverlayPresenter";
import type { CombatParityCardSnapshot } from "../debug/combat-parity";

const CARD_MOVE_DURATION_MS = 210;
const HAND_RELAYOUT_DURATION_MS = 120;
const CARD_ANIMATION_DEPTH = 780;
const CARD_DRAG_THRESHOLD_PX = 12;

type Point = {
  readonly x: number;
  readonly y: number;
};

type CardRenderOptions = {
  readonly selectedCardId?: CardInstanceId;
  readonly hoveredCardId?: CardInstanceId;
};

type CardVisual = {
  readonly cardInstanceId: CardInstanceId;
  readonly container: GameObjects.Container;
  card: CombatCardViewModel;
  moving: boolean;
  dragging: boolean;
  dragMoved: boolean;
  suppressClick: boolean;
  parityZone: CombatParityCardSnapshot["zone"];
  dragOrigin?: Point;
  dragStartPoint?: Point;
};

type PointerLike = {
  readonly button?: number;
  readonly worldX?: number;
  readonly worldY?: number;
  readonly x?: number;
  readonly y?: number;
  readonly rightButtonDown?: () => boolean;
};

type CardHitArea = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

type CardDropHandler = (
  cardInstanceId: CardInstanceId,
  point: Point
) => boolean | Promise<boolean>;

export type CardDragDebugState =
  | {
      readonly state: "idle";
    }
  | {
      readonly state: "dragging";
      readonly cardInstanceId: CardInstanceId;
      readonly point: Point;
    };

const getCardPreviewDescription = (description: string): string => {
  if (description.length <= CARD_TEXT.descriptionMaxLength) {
    return description;
  }

  return `${description.slice(0, CARD_TEXT.descriptionMaxLength - 3).trimEnd()}...`;
};

const getCardTagLabel = (tag: string): string =>
  tag.length > 4 ? tag.slice(0, 4) : tag;

const containsHitAreaPoint = (hitArea: CardHitArea, x: number, y: number): boolean =>
  (
    x >= hitArea.x &&
    x <= hitArea.x + hitArea.width &&
    y >= hitArea.y &&
    y <= hitArea.y + hitArea.height
  ) || (
    x >= 0 &&
    x <= hitArea.width &&
    y >= 0 &&
    y <= hitArea.height
  );

const getPointerPoint = (pointer: PointerLike, fallback: Point): Point => ({
  x: pointer.worldX ?? pointer.x ?? fallback.x,
  y: pointer.worldY ?? pointer.y ?? fallback.y
});

const hasPassedDragThreshold = (start: Point | undefined, point: Point): boolean => {
  if (!start) {
    return false;
  }

  return Math.hypot(point.x - start.x, point.y - start.y) >= CARD_DRAG_THRESHOLD_PX;
};

const getPilePoint = (pile: CardPile): Point => {
  if (pile === "draw") {
    return { x: DRAW_PILE.x, y: DRAW_PILE.y };
  }

  if (pile === "discard" || pile === "exhaust") {
    return { x: DISCARD_PILE.x, y: DISCARD_PILE.y };
  }

  return {
    x: (HAND_LAYOUT.leftX + HAND_LAYOUT.rightX) / 2,
    y: HAND_LAYOUT.y
  };
};

export class CardPresenter {
  private readonly container: GameObjects.Container;
  private readonly scene: Scene;
  private readonly onSelected: (cardInstanceId: CardInstanceId) => void;
  private readonly onHoverChanged: (cardInstanceId?: CardInstanceId) => void;
  private readonly onInspect: (cardInstanceId: CardInstanceId) => void;
  private readonly onTooltipChanged: (tooltip?: CombatTooltip) => void;
  private readonly onDropped: CardDropHandler;
  private readonly onDragDebugStateChanged: (state: CardDragDebugState) => void;
  private readonly visuals = new Map<CardInstanceId, CardVisual>();
  private visualHandOrder: CardInstanceId[] = [];
  private locked = false;
  private renderOptions: CardRenderOptions = {};
  private activeDragVisual?: CardVisual;
  private readonly handleScenePointerMove = (pointer: PointerLike): void => {
    const visual = this.activeDragVisual;
    if (!visual?.dragging) {
      return;
    }

    this.updateDragPosition(visual, getPointerPoint(pointer, { x: visual.container.x, y: visual.container.y }));
  };
  private readonly handleScenePointerUp = (pointer: PointerLike): void => {
    const visual = this.activeDragVisual;
    if (!visual?.dragging) {
      return;
    }

    if (!visual.dragMoved) {
      this.cancelDrag(visual);
      return;
    }

    void this.completeDrag(visual, getPointerPoint(pointer, { x: visual.container.x, y: visual.container.y }));
  };

  public constructor(
    scene: Scene,
    onSelected: (cardInstanceId: CardInstanceId) => void,
    onHoverChanged: (cardInstanceId?: CardInstanceId) => void = () => undefined,
    onInspect: (cardInstanceId: CardInstanceId) => void = () => undefined,
    onTooltipChanged: (tooltip?: CombatTooltip) => void = () => undefined,
    onDropped: CardDropHandler = () => false,
    onDragDebugStateChanged: (state: CardDragDebugState) => void = () => undefined
  ) {
    this.scene = scene;
    this.onSelected = onSelected;
    this.onHoverChanged = onHoverChanged;
    this.onInspect = onInspect;
    this.onTooltipChanged = onTooltipChanged;
    this.onDropped = onDropped;
    this.onDragDebugStateChanged = onDragDebugStateChanged;
    this.container = scene.add.container(0, 0);
    scene.input.on("pointermove", this.handleScenePointerMove);
    scene.input.on("pointerup", this.handleScenePointerUp);
    scene.events.once("shutdown", () => {
      scene.input.off("pointermove", this.handleScenePointerMove);
      scene.input.off("pointerup", this.handleScenePointerUp);
    });
  }

  public render(cards: readonly CombatCardViewModel[], locked: boolean, options: CardRenderOptions = {}): void {
    this.locked = locked;
    this.renderOptions = options;
    this.visualHandOrder = cards.map((card) => card.cardInstanceId);

    const renderedCardIds = new Set(this.visualHandOrder);
    for (const [cardInstanceId, visual] of this.visuals) {
      if (!renderedCardIds.has(cardInstanceId) && !visual.moving) {
        visual.container.destroy();
        this.visuals.delete(cardInstanceId);
      }
    }

    cards.forEach((card) => {
      const visual = this.ensureVisual(card, undefined);
      visual.card = card;
      visual.parityZone = "hand";
      this.renderCardVisual(visual);
    });
    this.layoutHand(false);
  }

  public getParitySnapshot(): readonly CombatParityCardSnapshot[] {
    return [...this.visuals.values()].map((visual) => ({
      cardInstanceId: visual.cardInstanceId,
      zone: visual.dragging ? "transient" : visual.parityZone,
      x: visual.container.x,
      y: visual.container.y,
      moving: visual.moving,
      dragging: visual.dragging,
      visible: true
    }));
  }

  public async playCardMoved(event: Extract<GameEvent, { readonly type: "CardMoved" }>, finalCards: readonly CombatCardViewModel[]): Promise<boolean> {
    if (event.from === "hand" && event.to !== "hand") {
      await this.moveHandCardToPile(event.cardInstanceId, event.to);
      return true;
    }

    if (event.to === "hand" && event.from !== "hand") {
      const card = finalCards.find((candidate) => candidate.cardInstanceId === event.cardInstanceId);
      if (!card) {
        return false;
      }

      await this.movePileCardToHand(card, event.from);
      return true;
    }

    return false;
  }

  private ensureVisual(card: CombatCardViewModel, point: Point | undefined): CardVisual {
    const existing = this.visuals.get(card.cardInstanceId);
    if (existing) {
      return existing;
    }

    const position = point ?? {
      x: (HAND_LAYOUT.leftX + HAND_LAYOUT.rightX) / 2,
      y: HAND_LAYOUT.y
    };
    const visual: CardVisual = {
      cardInstanceId: card.cardInstanceId,
      container: this.scene.add.container(position.x, position.y),
      card,
      moving: false,
      dragging: false,
      dragMoved: false,
      suppressClick: false,
      parityZone: "hand"
    };
    visual.container.setSize(CARD_SIZE.width, CARD_SIZE.height);
    this.container.add(visual.container);
    this.visuals.set(card.cardInstanceId, visual);

    return visual;
  }

  private renderCardVisual(visual: CardVisual): void {
    const card = visual.card;
    const visibleTags = card.tags.slice(0, COMBAT_UI_CAPS.maxCardVisibleTags);
    const visibleTagTooltips = card.tagTooltips.slice(0, COMBAT_UI_CAPS.maxCardVisibleTags);
    const hiddenTagCount = Math.max(0, card.tags.length - visibleTags.length);
    const isSelected = this.renderOptions.selectedCardId === card.cardInstanceId;
    const isHovered = this.renderOptions.hoveredCardId === card.cardInstanceId;
    const disabled = this.locked || !card.playable || visual.moving;
    const borderColour = card.isPetCommand ? 0xffb35b : card.type === "attack" ? 0x7dd3fc : 0xa7f3d0;
    const fillColour = disabled ? 0x2f3540 : card.isPetCommand ? 0x4a321f : 0x263f4e;
    const strokeWidth = isSelected ? 4 : isHovered ? 3 : 2;
    const group = visual.container;

    group.removeAll(true);
    group.removeAllListeners();
    group.disableInteractive();
    group.setScale(isHovered && !isSelected && !visual.moving && !visual.dragging ? HAND_LAYOUT.hoverScale : 1);

    if (!this.locked && !visual.moving) {
      const showUnplayableTooltip = (): void => {
        if (!card.playable) {
          this.onTooltipChanged({
            title: card.name,
            body: card.unplayableReason ?? "Card cannot be played.",
            x: group.x,
            y: group.y - CARD_SIZE.height,
            delayMs: TOOLTIP_DELAYS_MS.unplayable
          });
        }
      };

      group.setInteractive(
        { x: -CARD_SIZE.width / 2, y: -CARD_SIZE.height / 2, width: CARD_SIZE.width, height: CARD_SIZE.height },
        containsHitAreaPoint
      );
      if (card.playable) {
        this.scene.input.setDraggable(group);
      }
      group.on("pointerover", () => {
        if (visual.dragging) {
          return;
        }

        this.onHoverChanged(card.cardInstanceId);
        showUnplayableTooltip();
      });
      group.on("pointermove", (pointer: PointerLike) => {
        if (visual.dragging) {
          const point = getPointerPoint(pointer, { x: group.x, y: group.y });
          group.setPosition(point.x, point.y);
          return;
        }

        showUnplayableTooltip();
      });
      group.on("pointerout", () => {
        if (visual.dragging) {
          return;
        }

        this.onHoverChanged(undefined);
        this.onTooltipChanged(undefined);
      });
      group.on("pointerup", (pointer: PointerLike) => {
        if (visual.dragging) {
          if (visual.dragMoved) {
            visual.suppressClick = false;
            void this.completeDrag(visual, getPointerPoint(pointer, { x: group.x, y: group.y }));
            return;
          }

          this.cancelDrag(visual);
        }

        if (visual.suppressClick) {
          visual.suppressClick = false;
          return;
        }

        if (pointer.button === 2 || pointer.rightButtonDown?.() === true) {
          this.onInspect(card.cardInstanceId);
          return;
        }

        this.onSelected(card.cardInstanceId);
      });
      group.on("dragstart", () => {
        if (disabled) {
          return;
        }

        visual.dragging = true;
        visual.dragMoved = false;
        visual.suppressClick = true;
        visual.dragOrigin = { x: group.x, y: group.y };
        visual.dragStartPoint = { x: group.x, y: group.y };
        this.activeDragVisual = visual;
        this.onDragDebugStateChanged({
          state: "dragging",
          cardInstanceId: visual.cardInstanceId,
          point: { x: group.x, y: group.y }
        });
        group.setDepth(CARD_ANIMATION_DEPTH);
        group.setScale(1);
        this.onHoverChanged(undefined);
        this.onTooltipChanged(undefined);
      });
      group.on("drag", (_pointer: PointerLike, dragX: number, dragY: number) => {
        if (!visual.dragging) {
          return;
        }

        this.updateDragPosition(visual, { x: dragX, y: dragY });
      });
      group.on("dragend", () => {
        if (!visual.dragging) {
          return;
        }

        if (!visual.dragMoved) {
          this.cancelDrag(visual);
          return;
        }

        void this.completeDrag(visual, { x: group.x, y: group.y });
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
        x: group.x + tagX,
        y: group.y + tagY,
        delayMs: TOOLTIP_DELAYS_MS.statusIntent
      }));
      tagText.on("pointermove", () => this.onTooltipChanged({
        title: tagTooltip?.title ?? tagLabel,
        body: tagTooltip?.body ?? "No details available yet.",
        x: group.x + tagX,
        y: group.y + tagY,
        delayMs: TOOLTIP_DELAYS_MS.statusIntent
      }));
      tagText.on("pointerout", () => this.onTooltipChanged(undefined));
      group.add(tagText);
    });

    if (isSelected) {
      group.add(this.scene.add.rectangle(0, 0, CARD_SIZE.width + 8, CARD_SIZE.height + 8, 0xffb35b, 0)
        .setStrokeStyle(2, 0xffe0a3));
    }
  }

  private updateDragPosition(visual: CardVisual, point: Point): void {
    if (!visual.dragMoved && !hasPassedDragThreshold(visual.dragStartPoint, point)) {
      return;
    }

    visual.dragMoved = true;
    visual.container.setPosition(point.x, point.y);
    this.onDragDebugStateChanged({
      state: "dragging",
      cardInstanceId: visual.cardInstanceId,
      point
    });
  }

  private cancelDrag(visual: CardVisual): void {
    visual.dragging = false;
    visual.dragMoved = false;
    visual.suppressClick = false;
    visual.dragOrigin = undefined;
    visual.dragStartPoint = undefined;
    if (this.activeDragVisual === visual) {
      this.activeDragVisual = undefined;
    }
    this.onDragDebugStateChanged({ state: "idle" });
    visual.container.setDepth(0);
    this.layoutHand(true);
  }

  private async completeDrag(visual: CardVisual, point: Point): Promise<void> {
    if (!visual.dragging) {
      return;
    }

    if (!visual.dragMoved) {
      this.cancelDrag(visual);
      return;
    }

    visual.dragging = false;
    visual.dragMoved = false;
    if (this.activeDragVisual === visual) {
      this.activeDragVisual = undefined;
    }
    this.onDragDebugStateChanged({ state: "idle" });

    const accepted = await this.onDropped(visual.cardInstanceId, point);
    visual.dragOrigin = undefined;
    visual.dragStartPoint = undefined;

    if (accepted) {
      return;
    }

    visual.container.setDepth(0);
    this.layoutHand(true);
  }

  private async moveHandCardToPile(cardInstanceId: CardInstanceId, pile: CardPile): Promise<void> {
    const visual = this.visuals.get(cardInstanceId);
    if (!visual) {
      return;
    }

    visual.moving = true;
    visual.parityZone = pile === "discard" || pile === "exhaust" ? pile : "transient";
    visual.container.setDepth(CARD_ANIMATION_DEPTH);
    visual.container.disableInteractive();
    visual.container.removeAllListeners();
    this.visualHandOrder = this.visualHandOrder.filter((candidate) => candidate !== cardInstanceId);
    this.layoutHand(true);
    await this.tweenTo(visual.container, getPilePoint(pile), CARD_MOVE_DURATION_MS);
    visual.container.destroy();
    this.visuals.delete(cardInstanceId);
  }

  private async movePileCardToHand(
    card: CombatCardViewModel,
    pile: CardPile
  ): Promise<void> {
    const start = getPilePoint(pile);
    const visual = this.ensureVisual(card, start);
    visual.card = card;
    visual.moving = true;
    visual.parityZone = pile === "draw" || pile === "discard" ? pile : "transient";
    visual.container.setDepth(CARD_ANIMATION_DEPTH);
    this.renderCardVisual(visual);
    if (!this.visualHandOrder.includes(card.cardInstanceId)) {
      this.visualHandOrder = [...this.visualHandOrder, card.cardInstanceId];
    }

    const target = getHandCardPosition(
      this.visualHandOrder.indexOf(card.cardInstanceId),
      this.visualHandOrder.length
    );
    this.layoutHand(true, new Set([card.cardInstanceId]));
    visual.parityZone = "transient";
    await this.tweenTo(visual.container, target, CARD_MOVE_DURATION_MS);
    visual.moving = false;
    visual.parityZone = "hand";
    visual.container.setDepth(0);
    this.renderCardVisual(visual);
    this.layoutHand(false);
  }

  private layoutHand(animated: boolean, excludedCardIds: ReadonlySet<CardInstanceId> = new Set()): void {
    this.visualHandOrder.forEach((cardInstanceId, index) => {
      if (excludedCardIds.has(cardInstanceId)) {
        return;
      }

      const visual = this.visuals.get(cardInstanceId);
      if (!visual || visual.moving || visual.dragging) {
        return;
      }

      const isSelected = this.renderOptions.selectedCardId === cardInstanceId;
      const isHovered = this.renderOptions.hoveredCardId === cardInstanceId;
      const position = getHandCardPosition(index, this.visualHandOrder.length);
      const target = {
        x: position.x,
        y: position.y - (isSelected || isHovered ? HAND_LAYOUT.hoverLift : 0)
      };

      if (animated) {
        this.scene.tweens.add({
          targets: visual.container,
          x: target.x,
          y: target.y,
          duration: HAND_RELAYOUT_DURATION_MS
        });
      } else {
        visual.container.setPosition(target.x, target.y);
      }
    });
  }

  private tweenTo(target: GameObjects.Container, point: Point, duration: number): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: target,
        x: point.x,
        y: point.y,
        duration,
        ease: "Sine.easeInOut",
        onComplete: () => resolve()
      });
    });
  }
}
