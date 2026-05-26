import { describe, expect, it, vi } from "vitest";
import {
  cardId,
  cardInstanceId,
  combatantId,
  monsterIntentId,
  petInstanceId,
  runId,
  runNodeId,
  statusId,
  type GameEvent
} from "../../src/game-core";
import { CombatEventFxPresenter } from "../../src/game-phaser/animation/CombatEventFxPresenter";
import {
  ENERGY_ORB,
  KEEPER_AVATAR,
  MONSTER_SLOT,
  PLAYER_HUD_AREA,
  getMonsterPosition
} from "../../src/game-phaser/layout/combat-layout";
import { HAND_LAYOUT, getHandCardPosition } from "../../src/game-phaser/layout/hand-layout";
import { getPetSlotPosition } from "../../src/game-phaser/layout/pet-layout";
import type { CombatViewModel } from "../../src/game-phaser/view-models/combat-view-model";

type RecordedText = {
  readonly x: number;
  readonly y: number;
  readonly text: string;
};

type RecordedCircle = {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
};

type RecordedLine = {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
};

type TweenConfig = {
  readonly targets: unknown;
  readonly x?: number;
  readonly y?: number;
  readonly alpha?: number;
  readonly scale?: number;
  readonly delay?: number;
  readonly duration?: number;
  readonly onComplete?: () => void;
};

const playerId = combatantId("player");
const monsterId = combatantId("monster:training_slime:0");
const playedCardInstanceId = cardInstanceId("strike:1");
const petCommandCardInstanceId = cardInstanceId("fox_bite:1");
const emberFoxId = petInstanceId("ember_fox_001");

const playerHudPoint = {
  x: PLAYER_HUD_AREA.x + PLAYER_HUD_AREA.width / 2,
  y: PLAYER_HUD_AREA.y + PLAYER_HUD_AREA.height / 2
};

const playerPoint = {
  x: KEEPER_AVATAR.x,
  y: KEEPER_AVATAR.y - 26
};

const handFallbackPoint = {
  x: (HAND_LAYOUT.leftX + HAND_LAYOUT.rightX) / 2,
  y: HAND_LAYOUT.y
};

const monsterPosition = getMonsterPosition(0, 1);
const monsterPoint = {
  x: monsterPosition.x,
  y: monsterPosition.y - 10
};

const createChainableObject = <T extends object>(shape: T): T & {
  readonly setOrigin: () => T;
  readonly setStrokeStyle: () => T;
  readonly setLineWidth: () => T;
  readonly setDepth: () => T;
  readonly add: () => void;
  readonly destroy: () => void;
} => {
  const object = {
    ...shape,
    setOrigin: () => object,
    setStrokeStyle: () => object,
    setLineWidth: () => object,
    setDepth: () => object,
    add: () => undefined,
    destroy: () => undefined
  };

  return object;
};

const createSceneStub = () => {
  const records = {
    texts: [] as RecordedText[],
    circles: [] as RecordedCircle[],
    lines: [] as RecordedLine[],
    tweens: [] as TweenConfig[]
  };

  const scene = {
    add: {
      container: (x: number, y: number) => createChainableObject({ x, y }),
      text: (x: number, y: number, text: string) => {
        records.texts.push({ x, y, text });
        return createChainableObject({ x, y, text });
      },
      circle: (x: number, y: number, radius: number) => {
        records.circles.push({ x, y, radius });
        return createChainableObject({ x, y, radius });
      },
      line: (_x: number, _y: number, x1: number, y1: number, x2: number, y2: number) => {
        records.lines.push({ x1, y1, x2, y2 });
        return createChainableObject({ x1, y1, x2, y2 });
      }
    },
    tweens: {
      add: (config: TweenConfig) => {
        records.tweens.push(config);
        config.onComplete?.();
      }
    },
    time: {
      delayedCall: (_duration: number, callback: () => void) => {
        callback();

        return { remove: () => undefined };
      }
    }
  };

  return { scene: scene as never, records };
};

const createViewModel = (handIds: readonly string[] = ["strike:1", "fox_bite:1"]): CombatViewModel => ({
  revision: 1,
  phase: "player_turn",
  encounterLabel: "Training",
  turnNumber: 1,
  energy: 3,
  maxEnergy: 3,
  player: { id: playerId },
  pets: [{ petInstanceId: emberFoxId, slotIndex: 0 }],
  monsters: [{ id: monsterId }],
  monsterIntents: [],
  hand: handIds.map((id) => ({ cardInstanceId: cardInstanceId(id) })),
  drawPile: { label: "Draw", count: 0, tooltip: { title: "", body: "" }, detail: { title: "", lines: [] } },
  drawPileCount: 0,
  discardPile: { label: "Discard", count: 0, tooltip: { title: "", body: "" }, detail: { title: "", lines: [] } },
  discardPileCount: 0,
  continueAvailable: false,
  resetAvailable: false,
  eventMessages: [],
  uiWarnings: [],
  uiCaps: {
    maxHandCards: 10,
    maxEnemies: 3,
    maxPetSlots: 3,
    maxEnemyVisibleStatuses: 4,
    maxPlayerVisibleStatuses: 5,
    maxPetVisibleStatuses: 3,
    maxCardVisibleTags: 4
  }
} as unknown as CombatViewModel);

const combatEvents: readonly GameEvent[] = [
  { type: "RunCombatStarted", nodeId: runNodeId("node-a"), encounterId: "training" as never, combatId: runId("combat-a") },
  { type: "RunCombatCompleted", nodeId: runNodeId("node-a"), outcome: "won", playerHp: 20, playerMaxHp: 20 },
  { type: "RunEnded", outcome: "completed" },
  { type: "CombatStarted", combatId: "combat-a", seed: "seed-a" },
  { type: "TurnStarted", turnNumber: 1, actorId: playerId },
  { type: "TurnEnded", turnNumber: 1, actorId: playerId },
  { type: "MonsterIntentSet", monsterId, intentId: monsterIntentId("training_slime_attack"), intentType: "attack", description: "Attack." },
  { type: "MonsterIntentResolved", monsterId, intentId: monsterIntentId("training_slime_attack") },
  { type: "CardPlayed", cardInstanceId: playedCardInstanceId, cardId: cardId("strike"), sourceId: playerId },
  { type: "EnergySpent", amount: 1, remaining: 2 },
  {
    type: "CardCostModified",
    cardInstanceId: petCommandCardInstanceId,
    cardId: cardId("fox_bite"),
    originalCost: 1,
    modifiedCost: 0,
    modifierId: "warm_bond_discount" as never,
    petInstanceId: emberFoxId
  },
  { type: "CardDrawn", cardInstanceId: playedCardInstanceId, cardId: cardId("strike") },
  { type: "CardMoved", cardInstanceId: playedCardInstanceId, cardId: cardId("strike"), from: "hand", to: "discard" },
  { type: "DamageDealt", sourceId: playerId, targetId: monsterId, amount: 6, blocked: 0 },
  { type: "BlockGained", targetId: playerId, amount: 5, total: 5 },
  { type: "StatusApplied", targetId: monsterId, statusId: statusId("burn"), stacks: 2 },
  { type: "StatusTicked", targetId: monsterId, statusId: statusId("burn"), stacksBefore: 2, stacksAfter: 1, amount: 2 },
  { type: "StatusExpired", targetId: monsterId, statusId: statusId("burn") },
  { type: "PetCommanded", petInstanceId: emberFoxId, cardInstanceId: petCommandCardInstanceId, cardId: cardId("fox_bite") },
  {
    type: "PetModifierActivated",
    petInstanceId: emberFoxId,
    upgradeId: "warm_bond" as never,
    modifierId: "warm_bond_discount" as never,
    reason: "cardCost"
  },
  {
    type: "PetModifierConsumed",
    petInstanceId: emberFoxId,
    modifierId: "warm_bond_discount" as never,
    scope: "turn"
  },
  { type: "PetReacted", petInstanceId: emberFoxId, reaction: "guard" },
  { type: "DeckShuffled", from: "discard", to: "draw", count: 3 },
  { type: "ActionRejected", code: "bad_action", message: "Bad action." },
  { type: "CombatantDefeated", combatantId: monsterId },
  { type: "CombatEnded", outcome: "won" }
];

const playSingleEvent = async (event: GameEvent) => {
  const { scene, records } = createSceneStub();
  const presenter = new CombatEventFxPresenter(scene);
  presenter.setViewModel(createViewModel());

  await presenter.play(event);

  return records;
};

describe("CombatEventFxPresenter", () => {
  it("plays every combat event without fallback warnings when view model points are available", async () => {
    const { scene } = createSceneStub();
    const presenter = new CombatEventFxPresenter(scene);
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    presenter.setViewModel(createViewModel());

    for (const event of combatEvents) {
      await expect(presenter.play(event), event.type).resolves.toBeUndefined();
    }

    expect(warning).not.toHaveBeenCalled();
    warning.mockRestore();
  });

  it("uses the real hand card point for CardPlayed effects", async () => {
    const expectedCardPoint = getHandCardPosition(0, 2);
    const playedScene = createSceneStub();
    const playedPresenter = new CombatEventFxPresenter(playedScene.scene);
    playedPresenter.setViewModel(createViewModel());

    await playedPresenter.play({ type: "CardPlayed", cardInstanceId: playedCardInstanceId, cardId: cardId("strike"), sourceId: playerId });

    expect(playedScene.records.texts.find((text) => text.text === "Played")).toMatchObject(expectedCardPoint);
  });

  it("leaves card draw and movement events to the card presenter", async () => {
    const movedScene = createSceneStub();
    const movedPresenter = new CombatEventFxPresenter(movedScene.scene);
    movedPresenter.setViewModel(createViewModel());

    await movedPresenter.play({ type: "CardMoved", cardInstanceId: playedCardInstanceId, cardId: cardId("strike"), from: "hand", to: "discard" });
    await movedPresenter.play({ type: "CardDrawn", cardInstanceId: playedCardInstanceId, cardId: cardId("strike") });

    expect(movedScene.records.lines).toEqual([]);
    expect(movedScene.records.texts).toEqual([]);
  });

  it("logs missing CardPlayed points and falls back to the hand lane rather than the player HUD", async () => {
    const { scene, records } = createSceneStub();
    const presenter = new CombatEventFxPresenter(scene);
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    presenter.setViewModel(createViewModel([]));

    await presenter.play({ type: "CardPlayed", cardInstanceId: playedCardInstanceId, cardId: cardId("strike"), sourceId: playerId });

    expect(warning).toHaveBeenCalledWith("CombatEventFxPresenter used a hand fallback point.", {
      eventType: "CardPlayed",
      cardInstanceId: playedCardInstanceId
    });
    expect(records.texts.find((text) => text.text === "Played")).toMatchObject(handFallbackPoint);
    expect(records.texts.find((text) => text.text === "Played")).not.toMatchObject(playerHudPoint);
    warning.mockRestore();
  });

  it("anchors every non-card-movement visual action to the intended presentation point", async () => {
    const firstCardPoint = getHandCardPosition(0, 2);
    const secondCardPoint = getHandCardPosition(1, 2);
    const petPoint = getPetSlotPosition(0);

    await expect(playSingleEvent({
      type: "CardPlayed",
      cardInstanceId: playedCardInstanceId,
      cardId: cardId("strike"),
      sourceId: playerId
    })).resolves.toMatchObject({
      texts: [expect.objectContaining({ text: "Played", x: firstCardPoint.x, y: firstCardPoint.y })]
    });

    await expect(playSingleEvent({ type: "EnergySpent", amount: 1, remaining: 2 })).resolves.toMatchObject({
      circles: [expect.objectContaining({ x: ENERGY_ORB.x, y: ENERGY_ORB.y })],
      texts: [expect.objectContaining({ text: "-1", x: ENERGY_ORB.x, y: ENERGY_ORB.y - 20 })]
    });

    await expect(playSingleEvent({
      type: "PetCommanded",
      petInstanceId: emberFoxId,
      cardInstanceId: petCommandCardInstanceId,
      cardId: cardId("fox_bite")
    })).resolves.toMatchObject({
      lines: [expect.objectContaining({ x1: secondCardPoint.x, y1: secondCardPoint.y, x2: petPoint.x, y2: petPoint.y })],
      texts: [expect.objectContaining({ text: "Command", x: petPoint.x, y: petPoint.y })]
    });

    await expect(playSingleEvent({ type: "PetReacted", petInstanceId: emberFoxId, reaction: "guard" })).resolves.toMatchObject({
      circles: [expect.objectContaining({ x: petPoint.x, y: petPoint.y })],
      texts: [expect.objectContaining({ text: "guard", x: petPoint.x, y: petPoint.y - 20 })]
    });

    await expect(playSingleEvent({ type: "DamageDealt", sourceId: playerId, targetId: monsterId, amount: 6, blocked: 0 })).resolves.toMatchObject({
      lines: [expect.objectContaining({ x1: playerPoint.x, y1: playerPoint.y, x2: monsterPoint.x, y2: monsterPoint.y })],
      circles: [expect.objectContaining({ x: monsterPoint.x, y: monsterPoint.y, radius: MONSTER_SLOT.intentRadius / 2 })],
      texts: [expect.objectContaining({ text: "-6", x: monsterPoint.x, y: monsterPoint.y })]
    });

    await expect(playSingleEvent({ type: "BlockGained", targetId: playerId, amount: 5, total: 5 })).resolves.toMatchObject({
      circles: [expect.objectContaining({ x: playerPoint.x, y: playerPoint.y })],
      texts: [expect.objectContaining({ text: "+5 block", x: playerPoint.x, y: playerPoint.y - 20 })]
    });

    await expect(playSingleEvent({ type: "StatusApplied", targetId: monsterId, statusId: statusId("burn"), stacks: 2 })).resolves.toMatchObject({
      texts: [expect.objectContaining({ text: "burn +2", x: monsterPoint.x, y: monsterPoint.y })]
    });

    await expect(playSingleEvent({
      type: "StatusTicked",
      targetId: monsterId,
      statusId: statusId("burn"),
      stacksBefore: 2,
      stacksAfter: 1,
      amount: 2
    })).resolves.toMatchObject({
      texts: [expect.objectContaining({ text: "burn tick", x: monsterPoint.x, y: monsterPoint.y })]
    });

    await expect(playSingleEvent({ type: "StatusExpired", targetId: monsterId, statusId: statusId("burn") })).resolves.toMatchObject({
      texts: [expect.objectContaining({ text: "burn expired", x: monsterPoint.x, y: monsterPoint.y })]
    });

    await expect(playSingleEvent({
      type: "MonsterIntentResolved",
      monsterId,
      intentId: monsterIntentId("training_slime_attack")
    })).resolves.toMatchObject({
      lines: [expect.objectContaining({ x1: monsterPoint.x, y1: monsterPoint.y, x2: playerPoint.x, y2: playerPoint.y })],
      circles: [expect.objectContaining({ x: playerPoint.x, y: playerPoint.y, radius: MONSTER_SLOT.intentRadius / 2 })],
      texts: [expect.objectContaining({ text: "Attack", x: playerPoint.x, y: playerPoint.y })]
    });

    await expect(playSingleEvent({
      type: "MonsterIntentSet",
      monsterId,
      intentId: monsterIntentId("training_slime_attack"),
      intentType: "attack",
      description: "Attack."
    })).resolves.toMatchObject({
      circles: [expect.objectContaining({ x: monsterPoint.x, y: monsterPoint.y })],
      texts: [expect.objectContaining({ text: "attack", x: monsterPoint.x, y: monsterPoint.y - 20 })]
    });

    await expect(playSingleEvent({ type: "CombatantDefeated", combatantId: monsterId })).resolves.toMatchObject({
      circles: [expect.objectContaining({ x: monsterPoint.x, y: monsterPoint.y })],
      texts: [expect.objectContaining({ text: "Defeated", x: monsterPoint.x, y: monsterPoint.y - 20 })]
    });

    await expect(playSingleEvent({ type: "CombatEnded", outcome: "won" })).resolves.toMatchObject({
      texts: [expect.objectContaining({ text: "Victory", x: playerHudPoint.x, y: playerHudPoint.y })]
    });

    await expect(playSingleEvent({ type: "ActionRejected", code: "bad_action", message: "Bad action." })).resolves.toMatchObject({
      texts: [expect.objectContaining({ text: "Rejected", x: playerHudPoint.x, y: playerHudPoint.y })]
    });
  });
});
