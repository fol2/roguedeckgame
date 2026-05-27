import { describe, expect, it, vi } from "vitest";
import { cardId, cardInstanceId, type CardInstanceId } from "../../src/game-core";
import { CardPresenter } from "../../src/game-phaser/presenters/CardPresenter";
import { DISCARD_PILE, DRAW_PILE } from "../../src/game-phaser/layout/combat-layout";
import { getHandCardPosition } from "../../src/game-phaser/layout/hand-layout";
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
  readonly destroy: () => void;
  readonly disableInteractive: () => void;
  readonly handlers: Record<string, Handler[]>;
  readonly on: (event: string, handler: Handler) => void;
  readonly removeAll: () => void;
  readonly removeAllListeners: () => void;
  readonly setDepth: (depth: number) => T;
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
    setDepth: (depth: number) => {
      object.depth = depth;
      return object;
    },
    setInteractive: () => undefined,
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
    depth: 0,
    draggable: false,
    scale: 1
  };

  return object;
};

const createSceneStub = (options: { readonly completeTweens?: boolean } = {}) => {
  const records = {
    containers: [] as Array<Record<string, unknown>>,
    tweens: [] as TweenConfig[]
  };
  const scene = {
    add: {
      container: (x: number, y: number) => {
        const container = createChainableObject({ kind: "container", x, y });
        records.containers.push(container);
        return container;
      },
      rectangle: (x: number, y: number) => createChainableObject({ kind: "rectangle", x, y }),
      text: (x: number, y: number, text: string) => createChainableObject({ kind: "text", x, y, text })
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
});
