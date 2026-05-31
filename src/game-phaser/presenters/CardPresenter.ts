import type { GameObjects, Scene } from "phaser";
import type { CardInstanceId, CardPile, GameEvent } from "../../game-core";
import { COMBAT_UI_CAPS, type CombatCardViewModel } from "../view-models/combat-view-model";
import { DISCARD_PILE, DRAW_PILE } from "../layout/combat-layout";
import { CARD_SIZE, CARD_TEXT, HAND_LAYOUT, getHandCardPosition } from "../layout/hand-layout";
import { getCardFrameLayout, getCardOverlayLayout } from "../layout/card-frame-layout";
import { TOOLTIP_DELAYS_MS, type CombatTooltip } from "./CombatOverlayPresenter";
import type { CombatParityCardSnapshot } from "../debug/combat-parity";
import { CARD_VISUAL_DISABLED_PALETTE, buildCardVisualSpec } from "../card-visuals/card-visual-generator";
import {
  CombatFallbackAssetKeys,
  resolveCombatTexture,
  type CombatAssetAvailability
} from "../assets/combat-fallback-assets";
import { CombatAssetKeys, type CombatAssetKey } from "../assets/combat-asset-keys";

const CARD_MOVE_DURATION_MS = 210;
const HAND_RELAYOUT_DURATION_MS = 120;
const HAND_CARD_BASE_DEPTH = 10;
const HAND_CARD_SELECTED_DEPTH = 120;
const HAND_CARD_HOVER_DEPTH = 140;
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

type ParentTransform = {
  readonly applyInverse?: (x: number, y: number) => Point;
};

type ParentContainerLike = {
  readonly getWorldTransformMatrix?: () => ParentTransform;
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

const toParentLocalPoint = (point: Point, gameObject: GameObjects.Container): Point => {
  const parent = gameObject.parentContainer as ParentContainerLike | undefined;
  const parentTransform = parent?.getWorldTransformMatrix?.();
  const localPoint = parentTransform?.applyInverse?.(point.x, point.y);

  return localPoint ?? point;
};

const getPointerPoint = (pointer: PointerLike, fallback: Point, gameObject?: GameObjects.Container): Point => {
  const point = {
    x: pointer.worldX ?? pointer.x ?? fallback.x,
    y: pointer.worldY ?? pointer.y ?? fallback.y
  };

  return gameObject ? toParentLocalPoint(point, gameObject) : point;
};

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
  private readonly lastKnownCardPoints = new Map<CardInstanceId, Point>();
  private visualHandOrder: CardInstanceId[] = [];
  private locked = false;
  private renderOptions: CardRenderOptions = {};
  private activeDragVisual?: CardVisual;
  private readonly handleScenePointerMove = (pointer: PointerLike): void => {
    const visual = this.activeDragVisual;
    if (!visual?.dragging) {
      return;
    }

    this.updateDragPosition(visual, getPointerPoint(pointer, { x: visual.container.x, y: visual.container.y }, visual.container));
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

    void this.completeDrag(visual, getPointerPoint(pointer, { x: visual.container.x, y: visual.container.y }, visual.container));
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
        this.rememberCardPoint(cardInstanceId, this.getVisualPoint(visual));
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

  public setLocked(locked: boolean): void {
    if (this.locked === locked) {
      return;
    }

    this.locked = locked;
    for (const visual of this.visuals.values()) {
      this.renderCardVisual(visual);
    }
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

  public getCardPoints(): ReadonlyMap<CardInstanceId, Point> {
    const points = new Map(this.lastKnownCardPoints);
    for (const visual of this.visuals.values()) {
      points.set(visual.cardInstanceId, this.getVisualPoint(visual));
    }

    return points;
  }

  public async playCardMoved(event: Extract<GameEvent, { readonly type: "CardMoved" }>, finalCards: readonly CombatCardViewModel[]): Promise<boolean> {
    if (event.from === "hand" && event.to !== "hand") {
      return this.moveHandCardToPile(event, event.to);
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
    this.rememberCardPoint(visual.cardInstanceId, position);

    return visual;
  }

  private combatAssetAvailability(): CombatAssetAvailability {
    return {
      hasTexture: (key: string) => this.scene.textures.exists(key)
    };
  }

  private addAssetBackedRectangle({
    group,
    assetKey,
    fallbackKey,
    x,
    y,
    width,
    height,
    fillColour,
    fillAlpha,
    strokeColour,
    strokeAlpha = 1,
    strokeWidth = 1,
    textureAlpha = 1
  }: {
    readonly group: GameObjects.Container;
    readonly assetKey: CombatAssetKey;
    readonly fallbackKey: CombatAssetKey;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly fillColour: number;
    readonly fillAlpha: number;
    readonly strokeColour?: number;
    readonly strokeAlpha?: number;
    readonly strokeWidth?: number;
    readonly textureAlpha?: number;
  }): void {
    const resolution = resolveCombatTexture(assetKey, fallbackKey, this.combatAssetAvailability());

    if (resolution.kind === "texture") {
      group.add(this.scene.add.image(x, y, resolution.key).setDisplaySize(width, height).setAlpha(textureAlpha));
      return;
    }

    const rectangle = this.scene.add.rectangle(x, y, width, height, fillColour, fillAlpha);
    if (strokeColour !== undefined) {
      rectangle.setStrokeStyle(strokeWidth, strokeColour, strokeAlpha);
    }
    group.add(rectangle);
  }

  private renderCardVisual(visual: CardVisual): void {
    const card = visual.card;
    const isSelected = this.renderOptions.selectedCardId === card.cardInstanceId;
    const isHovered = this.renderOptions.hoveredCardId === card.cardInstanceId;
    const disabled = this.locked || !card.playable || visual.moving;
    const cardVisual = buildCardVisualSpec(card);
    const layout = getCardFrameLayout(cardVisual.frameKey);
    const zones = layout.zones;
    const tagSlotCount = zones.tagSlots.length;
    const visibleTagCount = Math.min(card.tags.length, COMBAT_UI_CAPS.maxCardVisibleTags, tagSlotCount);
    const visibleTagSlots = card.tags.length > visibleTagCount && visibleTagCount > 0
      ? Math.max(0, visibleTagCount - 1)
      : visibleTagCount;
    const visibleTags = card.tags.slice(0, visibleTagSlots);
    const visibleTagTooltips = card.tagTooltips.slice(0, visibleTagSlots);
    const hiddenTagCount = Math.max(0, card.tags.length - visibleTags.length);
    const palette = disabled ? CARD_VISUAL_DISABLED_PALETTE : cardVisual.palette;
    const borderColour = palette.border;
    const fillColour = palette.fill;
    const titleBandColour = palette.titleBand;
    const rulesBoxColour = palette.rulesBox;
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

        this.applyHandLayering(card.cardInstanceId);
        this.onHoverChanged(card.cardInstanceId);
        showUnplayableTooltip();
      });
      group.on("pointermove", (pointer: PointerLike) => {
        if (visual.dragging) {
          const point = getPointerPoint(pointer, { x: group.x, y: group.y }, group);
          group.setPosition(point.x, point.y);
          return;
        }

        showUnplayableTooltip();
      });
      group.on("pointerout", () => {
        if (visual.dragging) {
          return;
        }

        this.applyHandLayering(undefined);
        this.onHoverChanged(undefined);
        this.onTooltipChanged(undefined);
      });
      group.on("pointerup", (pointer: PointerLike) => {
        if (visual.dragging) {
          if (visual.dragMoved) {
            visual.suppressClick = false;
            void this.completeDrag(visual, getPointerPoint(pointer, { x: group.x, y: group.y }, group));
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
      group.on("drag", (pointer: PointerLike, dragX: number, dragY: number) => {
        if (!visual.dragging) {
          return;
        }

        this.updateDragPosition(visual, getPointerPoint(pointer, { x: dragX, y: dragY }, group));
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

    this.addAssetBackedRectangle({
      group,
      assetKey: cardVisual.artKey,
      fallbackKey: CombatFallbackAssetKeys.cardArt,
      x: zones.artWindow.x,
      y: zones.artWindow.y,
      width: zones.artWindow.width,
      height: zones.artWindow.height,
      fillColour: 0x1a2432,
      fillAlpha: 1,
      strokeColour: 0x5f6f89
    });
    this.addAssetBackedRectangle({
      group,
      assetKey: cardVisual.frameKey,
      fallbackKey: CombatFallbackAssetKeys.cardFrame,
      x: 0,
      y: 0,
      width: CARD_SIZE.width,
      height: CARD_SIZE.height,
      fillColour,
      fillAlpha: 1,
      strokeColour: disabled ? 0x687386 : borderColour,
      strokeWidth
    });
    group.add(this.scene.add.rectangle(zones.titleBand.x, zones.titleBand.y, zones.titleBand.width, zones.titleBand.height, titleBandColour, 0.24)
      .setStrokeStyle(1, disabled ? 0x687386 : borderColour, 0.34));
    group.add(this.scene.add.rectangle(zones.costSocket.x, zones.costSocket.y, zones.costSocket.width * 0.72, zones.costSocket.height * 0.72, 0x151923, 0.34)
      .setStrokeStyle(1, disabled ? 0x687386 : 0xffd166, 0.5));
    group.add(this.scene.add.text(zones.costSocket.x, zones.costSocket.y, String(card.cost), {
      color: disabled ? "#aab4c5" : "#ffd166",
      fontFamily: "Inter, sans-serif",
      fontSize: CARD_TEXT.fontSize.cost
    }).setOrigin(0.5));
    group.add(this.scene.add.text(zones.titleBand.x - zones.titleBand.width / 2 + CARD_TEXT.leftPadding, zones.titleBand.y - zones.titleBand.height / 2, card.name, {
      color: palette.titleText,
      fontFamily: "Inter, sans-serif",
      fontSize: CARD_TEXT.fontSize.name,
      wordWrap: { width: zones.titleBand.width - CARD_TEXT.leftPadding * 2 }
    }));
    this.addAssetBackedRectangle({
      group,
      assetKey: cardVisual.rarity.assetKey,
      fallbackKey: CombatFallbackAssetKeys.cardRarityGem,
      x: zones.rarityGemSocket.x,
      y: zones.rarityGemSocket.y,
      width: zones.rarityGemSocket.width,
      height: zones.rarityGemSocket.height,
      fillColour: borderColour,
      fillAlpha: disabled ? 0.35 : 0.9,
      strokeColour: 0xfff0d4,
      strokeAlpha: disabled ? 0.25 : 0.75
    });
    group.add(this.scene.add.rectangle(zones.rulesTextBox.x, zones.rulesTextBox.y, zones.rulesTextBox.width, zones.rulesTextBox.height, rulesBoxColour, 0.44)
      .setStrokeStyle(1, disabled ? 0x3a4352 : 0x5f6f89, 0.6));
    group.add(this.scene.add.text(zones.rulesTextBox.x - zones.rulesTextBox.width / 2 + CARD_TEXT.leftPadding, zones.rulesTextBox.y - zones.rulesTextBox.height / 2 + CARD_TEXT.leftPadding, getCardPreviewDescription(card.description), {
      color: palette.bodyText,
      fontFamily: "Inter, sans-serif",
      fontSize: CARD_TEXT.fontSize.description,
      wordWrap: { width: zones.rulesTextBox.width - CARD_TEXT.leftPadding * 2 }
    }));

    const tagVisualEntries = [
      ...cardVisual.tagVisuals.slice(0, visibleTagSlots),
      ...(hiddenTagCount > 0
        ? [{
            tag: "overflow",
            assetKey: CombatFallbackAssetKeys.icon,
            glyph: `+${hiddenTagCount}`
          }]
        : [])
    ];
    tagVisualEntries.forEach((tagVisual, tagIndex) => {
      const tagSlot = zones.tagSlots[tagIndex];
      if (!tagSlot) {
        return;
      }
      const tagLabel = tagVisual.glyph;
      const tagTooltip = tagVisual.tag === "overflow"
        ? card.tagOverflowTooltip
        : visibleTagTooltips[tagIndex];
      this.addAssetBackedRectangle({
        group,
        assetKey: tagVisual.assetKey,
        fallbackKey: CombatFallbackAssetKeys.icon,
        x: tagSlot.x,
        y: tagSlot.y,
        width: tagSlot.width,
        height: tagSlot.height,
        fillColour: 0x151923,
        fillAlpha: disabled ? 0.45 : 0.78,
        strokeColour: disabled ? 0x687386 : borderColour,
        strokeAlpha: 0.42
      });
      const tagText = this.scene.add.text(tagSlot.x, tagSlot.y, tagLabel, {
        color: palette.accentText,
        fontFamily: "Inter, sans-serif",
        fontSize: CARD_TEXT.fontSize.tags
      }).setOrigin(0.5);
      if (!disabled) {
        tagText.setInteractive();
        tagText.on("pointerover", () => this.onTooltipChanged({
          title: tagTooltip?.title ?? tagLabel,
          body: tagTooltip?.body ?? "No details available yet.",
          x: group.x + tagSlot.x,
          y: group.y + tagSlot.y,
          delayMs: TOOLTIP_DELAYS_MS.statusIntent
        }));
        tagText.on("pointermove", () => this.onTooltipChanged({
          title: tagTooltip?.title ?? tagLabel,
          body: tagTooltip?.body ?? "No details available yet.",
          x: group.x + tagSlot.x,
          y: group.y + tagSlot.y,
          delayMs: TOOLTIP_DELAYS_MS.statusIntent
        }));
        tagText.on("pointerout", () => this.onTooltipChanged(undefined));
      }
      group.add(tagText);
    });

    if (isSelected) {
      const overlay = getCardOverlayLayout(CombatAssetKeys.cardFrames.selectedOverlay, cardVisual.frameKey);
      this.addAssetBackedRectangle({
        group,
        assetKey: CombatAssetKeys.cardFrames.selectedOverlay,
        fallbackKey: CombatAssetKeys.cardFrames.selectedOverlay,
        x: overlay.x,
        y: overlay.y,
        width: overlay.width,
        height: overlay.height,
        fillColour: 0xffb35b,
        fillAlpha: 0,
        strokeColour: 0xffe0a3,
        strokeWidth: 2,
        textureAlpha: overlay.opacity
      });
    } else if (isHovered) {
      const overlay = getCardOverlayLayout(CombatAssetKeys.cardFrames.hoverOverlay, cardVisual.frameKey);
      this.addAssetBackedRectangle({
        group,
        assetKey: CombatAssetKeys.cardFrames.hoverOverlay,
        fallbackKey: CombatAssetKeys.cardFrames.hoverOverlay,
        x: overlay.x,
        y: overlay.y,
        width: overlay.width,
        height: overlay.height,
        fillColour: 0xfff0d4,
        fillAlpha: 0,
        strokeColour: borderColour,
        strokeAlpha: 0.72,
        strokeWidth: 2,
        textureAlpha: overlay.opacity
      });
    }
    if (!card.playable) {
      group.add(this.scene.add.rectangle(0, 0, CARD_SIZE.width, CARD_SIZE.height, 0x1f242d, 0.52)
        .setStrokeStyle(2, 0x687386, 0.72));
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

  private async moveHandCardToPile(event: Extract<GameEvent, { readonly type: "CardMoved" }>, pile: CardPile): Promise<boolean> {
    const cardInstanceId = event.cardInstanceId;
    const visual = this.visuals.get(cardInstanceId);
    if (!visual) {
      return this.moveRememberedHandCardToPile(event, pile);
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
    this.lastKnownCardPoints.delete(cardInstanceId);
    return true;
  }

  private async moveRememberedHandCardToPile(
    event: Extract<GameEvent, { readonly type: "CardMoved" }>,
    pile: CardPile
  ): Promise<boolean> {
    const start = this.lastKnownCardPoints.get(event.cardInstanceId);
    if (!start) {
      return false;
    }

    const placeholder = this.scene.add.container(start.x, start.y);
    placeholder.setSize(CARD_SIZE.width, CARD_SIZE.height);
    placeholder.add(this.scene.add.rectangle(0, 0, CARD_SIZE.width, CARD_SIZE.height, 0x2f3540, 0.78)
      .setStrokeStyle(2, 0x687386));
    placeholder.add(this.scene.add.text(0, 0, String(event.cardId), {
      color: "#c4d0df",
      fontFamily: "Inter, sans-serif",
      fontSize: CARD_TEXT.fontSize.type
    }).setOrigin(0.5));
    placeholder.setDepth(CARD_ANIMATION_DEPTH);
    this.container.add(placeholder);

    await this.tweenTo(placeholder, getPilePoint(pile), CARD_MOVE_DURATION_MS);
    placeholder.destroy();
    this.lastKnownCardPoints.delete(event.cardInstanceId);
    return true;
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

  private applyHandLayering(hoveredCardId: CardInstanceId | undefined = this.renderOptions.hoveredCardId): void {
    this.visualHandOrder.forEach((cardInstanceId, index) => {
      const visual = this.visuals.get(cardInstanceId);
      if (!visual || visual.moving || visual.dragging) {
        return;
      }

      visual.container.setDepth(HAND_CARD_BASE_DEPTH + index);
      this.container.bringToTop(visual.container);
    });

    const selectedVisual = this.renderOptions.selectedCardId
      ? this.visuals.get(this.renderOptions.selectedCardId)
      : undefined;
    if (selectedVisual && !selectedVisual.moving && !selectedVisual.dragging) {
      selectedVisual.container.setDepth(HAND_CARD_SELECTED_DEPTH);
      this.container.bringToTop(selectedVisual.container);
    }

    const hoveredVisual = hoveredCardId ? this.visuals.get(hoveredCardId) : undefined;
    if (hoveredVisual && !hoveredVisual.moving && !hoveredVisual.dragging) {
      hoveredVisual.container.setDepth(HAND_CARD_HOVER_DEPTH);
      this.container.bringToTop(hoveredVisual.container);
    }

    for (const visual of this.visuals.values()) {
      if (!visual.moving && !visual.dragging) {
        continue;
      }

      visual.container.setDepth(CARD_ANIMATION_DEPTH);
      this.container.bringToTop(visual.container);
    }
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
        y: position.y - (
          isSelected
            ? HAND_LAYOUT.selectedLift
            : isHovered
              ? HAND_LAYOUT.hoverLift
              : 0
        )
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
      this.rememberCardPoint(cardInstanceId, target);
    });
    this.applyHandLayering();
  }

  private getVisualPoint(visual: CardVisual): Point {
    return {
      x: visual.container.x,
      y: visual.container.y
    };
  }

  private rememberCardPoint(cardInstanceId: CardInstanceId, point: Point): void {
    this.lastKnownCardPoints.set(cardInstanceId, point);
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
