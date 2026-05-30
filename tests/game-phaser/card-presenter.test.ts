import { describe, expect, it, vi } from "vitest";
import { cardId, cardInstanceId, type CardInstanceId } from "../../src/game-core";
import { CardPresenter } from "../../src/game-phaser/presenters/CardPresenter";
import { CombatAssetKeys } from "../../src/game-phaser/assets/combat-asset-keys";
import { DISCARD_PILE, DRAW_PILE } from "../../src/game-phaser/layout/combat-layout";
import { CARD_SIZE, getHandCardPosition } from "../../src/game-phaser/layout/hand-layout";
import type { CombatCardViewModel } from "../../src/game-phaser/view-models/combat-view-model";

type TweenConfig = {
  readonly targets: Record<string, unknown>;
  readonly x?: number;
  readonly y?: number;
  readonly duration?: number;
  readonly onComplete?: () => void;
};

type Handler = (...args: unknown[]) => void;

const createChainableObject = <T extends { readonly kind: string }>(shape: T): T & {
  readonly add: (child: unknown) => void;
  readonly bringToTop: (child: unknown) => T;
  readonly destroy: () => void;
  readonly disableInteractive: () => void;
  readonly handlers: Record<string, Handler[]>;
  parentContainer?: { readonly getWorldTransformMatrix?: () => { readonly applyInverse: (x: number, y: number) => { readonly x: number; readonly y: number } } };
  readonly on: (event: string, handler: Handler) => void;
  readonly removeAll: () => void;
  readonly removeAllListeners: () => void;
  readonly setAlpha: (alpha: number) => T;
  readonly setDepth: (depth: number) => T;
  readonly setDisplaySize: (width: number, height: number) => T;
  readonly setInteractive: () => void;
  readonly setLineWidth: () => T;
  readonly setOrigin: () => T;
  readonly setPosition: (x: number, y: number) => void;
  readonly setScale: (scale: number) => void;
  readonly setSize: () => void;
  readonly setStrokeStyle: () => T;
} => {
  const object = {
    ...shape,
    destroyed: false,
    children: [] as unknown[],
    add: (child: unknown) => {
      object.children.push(child);
      if (child && typeof child === "object" && "kind" in child) {
        (child as { parentContainer?: typeof object }).parentContainer = object;
      }
    },
    bringToTop: (child: unknown) => {
      object.children = object.children.filter((candidate) => candidate !== child);
      object.children.push(child);
      return object;
    },
    destroy: () => {
      object.destroyed = true;
    },
    disableInteractive: () => undefined,
    handlers: {} as Record<string, Handler[]>,
    on: (event: string, handler: Handler) => {
      object.handlers[event] = [...(object.handlers[event] ?? []), handler];
    },
    removeAll: () => {
      object.children = [];
    },
    removeAllListeners: () => {
      object.handlers = {};
    },
    setAlpha: (alpha: number) => {
      object.alpha = alpha;
      return object;
    },
    setDepth: (depth: number) => {
      object.depth = depth;
      return object;
    },
    setDisplaySize: (width: number, height: number) => {
      object.displayWidth = width;
      object.displayHeight = height;
      return object;
    },
    setInteractive: () => {
      object.interactive = true;
    },
    setLineWidth: () => object,
    setOrigin: () => object,
    setPosition: (x: number, y: number) => {
      object.x = x;
      object.y = y;
    },
    setScale: (scale: number) => {
      object.scale = scale;
    },
    setSize: () => undefined,
    setStrokeStyle: () => object,
    x: "x" in shape && typeof shape.x === "number" ? shape.x : 0,
    y: "y" in shape && typeof shape.y === "number" ? shape.y : 0,
    startX: "x" in shape && typeof shape.x === "number" ? shape.x : 0,
    startY: "y" in shape && typeof shape.y === "number" ? shape.y : 0,
    alpha: 1,
    depth: 0,
    displayHeight: 0,
    displayWidth: 0,
    interactive: false,
    draggable: false,
    scale: 1
  };

  return object;
};

const createSceneStub = (options: {
  readonly completeTweens?: boolean;
  readonly textures?: readonly string[];
} = {}) => {
  const records = {
    containers: [] as Array<Record<string, unknown>>,
    images: [] as Array<Record<string, unknown>>,
    rectangles: [] as Array<Record<string, unknown>>,
    tweens: [] as TweenConfig[]
  };
  const textures = new Set(options.textures ?? []);
  const scene = {
    add: {
      container: (x: number, y: number) => {
        const container = createChainableObject({ kind: "container", x, y });
        records.containers.push(container);
        return container;
      },
      rectangle: (x: number, y: number, width?: number, height?: number, fillColour?: number, fillAlpha?: number) => {
        const rectangle = createChainableObject({ kind: "rectangle", x, y, width, height, fillColour, fillAlpha });
        records.rectangles.push(rectangle);
        return rectangle;
      },
      image: (x: number, y: number, textureKey: string) => {
        const image = createChainableObject({ kind: "image", x, y, textureKey });
        records.images.push(image);
        return image;
      },
      text: (x: number, y: number, text: string) => createChainableObject({ kind: "text", x, y, text })
    },
    textures: {
      exists: (key: string) => textures.has(key)
    },
    input: {
      off: () => undefined,
      on: () => undefined,
      setDraggable: (target: Record<string, unknown>) => {
        target.draggable = true;
      }
    },
    events: {
      once: () => undefined
    },
    tweens: {
      add: (config: TweenConfig) => {
        records.tweens.push(config);
        if (config.x !== undefined) {
          config.targets.x = config.x;
        }
        if (config.y !== undefined) {
          config.targets.y = config.y;
        }
        if (options.completeTweens ?? true) {
          config.onComplete?.();
        }
      }
    }
  };

  return { scene: scene as never, records };
};

const createCard = (id: string, name = id): CombatCardViewModel => ({
  cardInstanceId: cardInstanceId(id),
  cardId: cardId(name),
  name,
  description: "Deal damage.",
  type: "attack",
  rarity: "starter",
  source: "classBound",
  cost: 1,
  tags: ["attack"],
  playable: true,
  isPetCommand: false,
  tagTooltips: [{ tag: "attack", title: "Attack", body: "Deals damage." }],
  keywordExplanations: [],
  detail: { title: name, lines: [] },
  targetKind: "enemy",
  playMode: "selectEnemy",
  requiresManualTarget: true,
  validTargetIds: []
});

const hasTweenTo = (
  tweens: readonly TweenConfig[],
  point: { readonly x: number; readonly y: number }
): boolean =>
  tweens.some((tween) => tween.x === point.x && tween.y === point.y);

describe("CardPresenter", () => {
  it("moves an existing hand card to the discard pile and relayouts remaining hand cards", async () => {
    const { scene, records } = createSceneStub();
    const presenter = new CardPresenter(scene, vi.fn());
    const firstCard = createCard("strike:1", "Strike");
    const secondCard = createCard("defend:1", "Defend");

    presenter.render([firstCard, secondCard], true);
    await presenter.playCardMoved({
      type: "CardMoved",
      cardInstanceId: firstCard.cardInstanceId,
      cardId: firstCard.cardId,
      from: "hand",
      to: "discard"
    }, [secondCard]);

    expect(hasTweenTo(records.tweens, { x: DISCARD_PILE.x, y: DISCARD_PILE.y })).toBe(true);
    expect(hasTweenTo(records.tweens, getHandCardPosition(0, 1))).toBe(true);
  });

  it("draws cards from the draw pile into the hand one at a time", async () => {
    const { scene, records } = createSceneStub();
    const presenter = new CardPresenter(scene, vi.fn());
    const firstCard = createCard("strike:1", "Strike");
    const secondCard = createCard("defend:1", "Defend");

    presenter.render([], true);
    await presenter.playCardMoved({
      type: "CardMoved",
      cardInstanceId: firstCard.cardInstanceId,
      cardId: firstCard.cardId,
      from: "draw",
      to: "hand"
    }, [firstCard, secondCard]);

    expect(records.containers.some((container) => container.startX === DRAW_PILE.x && container.startY === DRAW_PILE.y)).toBe(true);
    expect(hasTweenTo(records.tweens, getHandCardPosition(0, 1))).toBe(true);

    await presenter.playCardMoved({
      type: "CardMoved",
      cardInstanceId: secondCard.cardInstanceId,
      cardId: secondCard.cardId,
      from: "draw",
      to: "hand"
    }, [firstCard, secondCard]);

    expect(hasTweenTo(records.tweens, getHandCardPosition(0, 2))).toBe(true);
    expect(hasTweenTo(records.tweens, getHandCardPosition(1, 2))).toBe(true);
  });

  it("keeps card containers keyed across ordinary renders", () => {
    const { scene, records } = createSceneStub();
    const presenter = new CardPresenter(scene, vi.fn());
    const firstCard = createCard("strike:1", "Strike");

    presenter.render([firstCard], true);
    const createdContainersAfterFirstRender = records.containers.length;
    presenter.render([firstCard], true);

    expect(records.containers).toHaveLength(createdContainersAfterFirstRender);
  });

  it("exposes current card points for event FX anchors", () => {
    const { scene } = createSceneStub();
    const presenter = new CardPresenter(scene, vi.fn());
    const firstCard = createCard("strike:1", "Strike");

    presenter.render([firstCard], true);

    expect(presenter.getCardPoints().get(firstCard.cardInstanceId)).toEqual(getHandCardPosition(0, 1));
  });

  it("locks existing hand visuals without removing them before playback", async () => {
    const { scene, records } = createSceneStub();
    const presenter = new CardPresenter(scene, vi.fn());
    const firstCard = createCard("strike:1", "Strike");

    presenter.render([firstCard], false);
    const createdContainersAfterRender = records.containers.length;
    presenter.setLocked(true);

    expect(records.containers).toHaveLength(createdContainersAfterRender);
    await expect(presenter.playCardMoved({
      type: "CardMoved",
      cardInstanceId: firstCard.cardInstanceId,
      cardId: firstCard.cardId,
      from: "hand",
      to: "discard"
    }, [])).resolves.toBe(true);
    expect(hasTweenTo(records.tweens, { x: DISCARD_PILE.x, y: DISCARD_PILE.y })).toBe(true);
  });

  it("keeps locked cards visually disabled even when their card metadata is playable", () => {
    const { scene, records } = createSceneStub();
    const presenter = new CardPresenter(scene, vi.fn());
    const firstCard = createCard("strike:1", "Strike");

    presenter.render([firstCard], false);
    const rectangleCountBeforeLock = records.rectangles.length;
    presenter.setLocked(true);

    expect(records.rectangles[rectangleCountBeforeLock]).toMatchObject({
      kind: "rectangle",
      width: CARD_SIZE.width,
      height: CARD_SIZE.height,
      fillColour: 0x2f3540
    });
  });

  it("composes available generated frame and art assets into the live card", () => {
    const { scene, records } = createSceneStub({
      textures: [
        CombatAssetKeys.cardFrames.normal,
        CombatAssetKeys.cardArt.keepersTap,
        CombatAssetKeys.cardRarityGems.starter,
        CombatAssetKeys.cardSourceBadges.classBound,
        CombatAssetKeys.cardFamilyBadges.keeperAttack,
        CombatAssetKeys.cardFrames.selectedOverlay,
        CombatAssetKeys.icons.tagKeeper,
        CombatAssetKeys.icons.tagAttack,
        CombatAssetKeys.icons.tagSignal
      ]
    });
    const presenter = new CardPresenter(scene, vi.fn());
    const firstCard = {
      ...createCard("keepers_tap:1", "Keeper's Tap"),
      cardId: cardId("keepers_tap"),
      tags: ["keeper", "attack", "signal"]
    };

    presenter.render([firstCard], false, { selectedCardId: firstCard.cardInstanceId });

    expect(records.images.map((image) => image.textureKey)).toEqual(expect.arrayContaining([
      CombatAssetKeys.cardFrames.normal,
      CombatAssetKeys.cardArt.keepersTap,
      CombatAssetKeys.cardRarityGems.starter,
      CombatAssetKeys.cardSourceBadges.classBound,
      CombatAssetKeys.cardFamilyBadges.keeperAttack,
      CombatAssetKeys.cardFrames.selectedOverlay,
      CombatAssetKeys.icons.tagKeeper,
      CombatAssetKeys.icons.tagAttack,
      CombatAssetKeys.icons.tagSignal
    ]));
  });

  it("composes hover and unplayable overlay assets when those states are active", () => {
    const { scene, records } = createSceneStub({
      textures: [
        CombatAssetKeys.cardFrames.hoverOverlay,
        CombatAssetKeys.cardFrames.unplayableOverlay
      ]
    });
    const presenter = new CardPresenter(scene, vi.fn());
    const firstCard = {
      ...createCard("strike:1", "Strike"),
      playable: false,
      unplayableReason: "No energy."
    };

    presenter.render([firstCard], false, { hoveredCardId: firstCard.cardInstanceId });

    expect(records.images.map((image) => image.textureKey)).toEqual(expect.arrayContaining([
      CombatAssetKeys.cardFrames.hoverOverlay,
      CombatAssetKeys.cardFrames.unplayableOverlay
    ]));
  });

  it("brings a hovered stacked hand card to the front so it remains readable", () => {
    const { scene, records } = createSceneStub();
    const onHoverChanged = vi.fn();
    const presenter = new CardPresenter(scene, vi.fn(), onHoverChanged);
    const firstCard = createCard("strike:1", "Strike");
    const secondCard = createCard("defend:1", "Defend");

    presenter.render([firstCard, secondCard], false);

    const rootContainer = records.containers[0] as {
      readonly children: Array<{ readonly depth: number; readonly handlers: Record<string, Handler[]> }>;
    };
    const firstVisual = rootContainer.children[0];
    const secondVisual = rootContainer.children[1];

    expect(rootContainer.children.at(-1)).toBe(secondVisual);

    firstVisual.handlers.pointerover?.[0]?.();

    expect(onHoverChanged).toHaveBeenCalledWith(firstCard.cardInstanceId);
    expect(rootContainer.children.at(-1)).toBe(firstVisual);
    expect(firstVisual.depth).toBeGreaterThan(secondVisual.depth);

    presenter.render([firstCard, secondCard], false, { hoveredCardId: firstCard.cardInstanceId });

    expect(rootContainer.children.at(-1)).toBe(firstVisual);

    presenter.render([firstCard, secondCard], false);

    expect(rootContainer.children.at(-1)).toBe(secondVisual);
  });

  it("does not leave tag hit areas interactive while cards are locked", () => {
    const { scene, records } = createSceneStub();
    const presenter = new CardPresenter(scene, vi.fn());
    const firstCard = createCard("strike:1", "Strike");

    presenter.render([firstCard], true);

    const cardContainer = records.containers.find((container) => container.startX !== 0 || container.startY !== 0) as {
      readonly children?: readonly Record<string, unknown>[];
    } | undefined;
    const tagText = cardContainer?.children?.find((child) => child.kind === "text" && child.text === "ATK");

    expect(tagText).toMatchObject({ interactive: false });
  });

  it("exposes card parity snapshots for visible hand and transient drag state", () => {
    const { scene, records } = createSceneStub();
    const presenter = new CardPresenter(scene, vi.fn());
    const firstCard = createCard("strike:1", "Strike");

    presenter.render([firstCard], false);
    expect(presenter.getParitySnapshot()).toEqual([expect.objectContaining({
      cardInstanceId: firstCard.cardInstanceId,
      zone: "hand",
      moving: false,
      dragging: false,
      visible: true
    })]);

    const cardContainer = records.containers.find((container) => container.startX !== 0 || container.startY !== 0) as {
      readonly handlers: Record<string, Handler[]>;
    } | undefined;
    cardContainer?.handlers.dragstart?.[0]?.();

    expect(presenter.getParitySnapshot()).toEqual([expect.objectContaining({
      cardInstanceId: firstCard.cardInstanceId,
      zone: "transient",
      dragging: true
    })]);
  });

  it("exposes discard pile zones while a hand card moves away", async () => {
    const { scene, records } = createSceneStub({ completeTweens: false });
    const presenter = new CardPresenter(scene, vi.fn());
    const firstCard = createCard("strike:1", "Strike");

    presenter.render([firstCard], true);
    const movement = presenter.playCardMoved({
      type: "CardMoved",
      cardInstanceId: firstCard.cardInstanceId,
      cardId: firstCard.cardId,
      from: "hand",
      to: "discard"
    }, []);

    expect(presenter.getParitySnapshot()).toEqual([expect.objectContaining({
      cardInstanceId: firstCard.cardInstanceId,
      zone: "discard",
      moving: true
    })]);

    records.tweens.at(-1)?.onComplete?.();
    await movement;
  });

  it("returns false when asked to move a missing hand visual", async () => {
    const { scene } = createSceneStub();
    const presenter = new CardPresenter(scene, vi.fn());
    const firstCard = createCard("strike:1", "Strike");

    presenter.render([], true);

    await expect(presenter.playCardMoved({
      type: "CardMoved",
      cardInstanceId: firstCard.cardInstanceId,
      cardId: firstCard.cardId,
      from: "hand",
      to: "discard"
    }, [])).resolves.toBe(false);
  });

  it("moves a remembered hand card to the discard pile if playback refreshed before movement", async () => {
    const { scene, records } = createSceneStub();
    const presenter = new CardPresenter(scene, vi.fn());
    const firstCard = createCard("strike:1", "Strike");

    presenter.render([firstCard], true);
    presenter.render([], true);

    await expect(presenter.playCardMoved({
      type: "CardMoved",
      cardInstanceId: firstCard.cardInstanceId,
      cardId: firstCard.cardId,
      from: "hand",
      to: "discard"
    }, [])).resolves.toBe(true);

    expect(hasTweenTo(records.tweens, { x: DISCARD_PILE.x, y: DISCARD_PILE.y })).toBe(true);
  });

  it("drags playable cards to a drop point without also selecting them", async () => {
    const { scene, records } = createSceneStub();
    const onSelected = vi.fn();
    const onDropped = vi.fn().mockResolvedValue(false);
    const firstCard = createCard("strike:1", "Strike");
    let renderFromDragCallback = false;
    let presenter!: CardPresenter;
    const onDragDebugStateChanged = vi.fn((state) => {
      if (renderFromDragCallback && state.state === "dragging") {
        presenter.render([firstCard], false);
      }
    });
    presenter = new CardPresenter(
      scene,
      onSelected,
      undefined,
      undefined,
      undefined,
      onDropped,
      onDragDebugStateChanged
    );

    presenter.render([firstCard], false);
    const cardContainer = records.containers.find((container) => container.startX !== 0 || container.startY !== 0) as {
      readonly draggable?: boolean;
      readonly handlers: Record<string, Handler[]>;
      readonly x: number;
      readonly y: number;
    } | undefined;

    expect(cardContainer?.draggable).toBe(true);
    renderFromDragCallback = true;
    cardContainer?.handlers.dragstart?.[0]?.();
    cardContainer?.handlers.drag?.[0]?.({}, 940, 250);
    expect(cardContainer).toMatchObject({ x: 940, y: 250 });
    cardContainer?.handlers.pointerup?.[0]?.({});
    cardContainer?.handlers.dragend?.[0]?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(onSelected).not.toHaveBeenCalled();
    expect(onDropped).toHaveBeenCalledWith(firstCard.cardInstanceId, { x: 940, y: 250 });
    expect(onDragDebugStateChanged).toHaveBeenCalledWith({
      state: "dragging",
      cardInstanceId: firstCard.cardInstanceId,
      point: expect.any(Object)
    });
    expect(onDragDebugStateChanged).toHaveBeenCalledWith({
      state: "dragging",
      cardInstanceId: firstCard.cardInstanceId,
      point: { x: 940, y: 250 }
    });
    expect(onDragDebugStateChanged).toHaveBeenLastCalledWith({ state: "idle" });
    expect(hasTweenTo(records.tweens, getHandCardPosition(0, 1))).toBe(true);
  });

  it("converts drag pointer positions through the fixed-stage parent scale", async () => {
    const { scene, records } = createSceneStub();
    const onDropped = vi.fn().mockResolvedValue(false);
    const presenter = new CardPresenter(
      scene,
      vi.fn(),
      undefined,
      undefined,
      undefined,
      onDropped
    );
    const firstCard = createCard("strike:1", "Strike");

    presenter.render([firstCard], false);
    const cardContainer = records.containers.find((container) => container.startX !== 0 || container.startY !== 0) as {
      readonly handlers: Record<string, Handler[]>;
      readonly parentContainer?: {
        getWorldTransformMatrix?: () => {
          readonly applyInverse: (x: number, y: number) => { readonly x: number; readonly y: number };
        };
      };
      readonly x: number;
      readonly y: number;
    } | undefined;

    if (cardContainer?.parentContainer) {
      cardContainer.parentContainer.getWorldTransformMatrix = () => ({
        applyInverse: (x: number, y: number) => ({ x: x / 2, y: y / 2 })
      });
    }

    cardContainer?.handlers.dragstart?.[0]?.();
    cardContainer?.handlers.drag?.[0]?.({ worldX: 1880, worldY: 500 }, 1880, 500);
    cardContainer?.handlers.pointerup?.[0]?.({ worldX: 1880, worldY: 500 });
    await Promise.resolve();
    await Promise.resolve();

    expect(onDropped).toHaveBeenCalledWith(firstCard.cardInstanceId, { x: 940, y: 250 });
  });
});
