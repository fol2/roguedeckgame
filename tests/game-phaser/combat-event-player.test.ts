import { describe, expect, it, vi } from "vitest";
import {
  cardId,
  cardInstanceId,
  combatantId,
  monsterAbilityId,
  monsterIntentId,
  petInstanceId,
  petModifierId,
  statusId,
  upgradeId,
  type GameEvent
} from "../../src/game-core";
import { formatCombatEventMessage } from "../../src/game-phaser/animation/combat-event-messages";
import { CombatEventPlayer } from "../../src/game-phaser/animation/CombatEventPlayer";

describe("Combat event messages", () => {
  it("formats CardPlayed", () => {
    const event: GameEvent = {
      type: "CardPlayed",
      cardInstanceId: cardInstanceId("card:1"),
      cardId: cardId("strike"),
      sourceId: combatantId("player")
    };

    expect(formatCombatEventMessage(event)).toContain("strike");
  });

  it("formats DamageDealt with amount and blocked values", () => {
    const event: GameEvent = {
      type: "DamageDealt",
      sourceId: combatantId("player"),
      targetId: combatantId("monster:training_slime:0"),
      amount: 6,
      blocked: 2
    };

    expect(formatCombatEventMessage(event)).toContain("6 damage");
    expect(formatCombatEventMessage(event)).toContain("2 blocked");
  });

  it("formats StatusApplied stacks", () => {
    const event: GameEvent = {
      type: "StatusApplied",
      targetId: combatantId("monster:ash_mite:0"),
      statusId: statusId("burn"),
      stacks: 2
    };

    expect(formatCombatEventMessage(event)).toContain("2 burn");
  });

  it("formats pet command and modifier events", () => {
    const commanded: GameEvent = {
      type: "PetCommanded",
      petInstanceId: petInstanceId("sandbox:ember_fox"),
      cardInstanceId: cardInstanceId("card:fox_bite"),
      cardId: cardId("fox_bite")
    };
    const activated: GameEvent = {
      type: "PetModifierActivated",
      petInstanceId: petInstanceId("sandbox:ember_fox"),
      upgradeId: upgradeId("warm_bond"),
      modifierId: petModifierId("warm_bond_discount"),
      reason: "cardCost"
    };

    expect(formatCombatEventMessage(commanded)).toContain("fox_bite");
    expect(formatCombatEventMessage(activated)).toContain("warm_bond_discount");
  });

  it("formats monster intent and combat outcome events", () => {
    const planned: GameEvent = {
      type: "MonsterAbilityPlanned",
      monsterId: combatantId("monster:training_slime:0"),
      abilityId: monsterAbilityId("training_slime_attack"),
      intentId: monsterIntentId("training_slime_attack"),
      intentType: "attack",
      description: "Attack the Keeper."
    };
    const played: GameEvent = {
      type: "MonsterAbilityPlayed",
      monsterId: combatantId("monster:training_slime:0"),
      abilityId: monsterAbilityId("training_slime_attack"),
      intentId: monsterIntentId("training_slime_attack")
    };
    const intent: GameEvent = {
      type: "MonsterIntentResolved",
      monsterId: combatantId("monster:training_slime:0"),
      intentId: monsterIntentId("training_slime_attack")
    };
    const ended: GameEvent = { type: "CombatEnded", outcome: "won" };

    expect(formatCombatEventMessage(planned)).toBe("monster:training_slime:0 planned a monster card.");
    expect(formatCombatEventMessage(played)).toContain("training_slime_attack");
    expect(formatCombatEventMessage(intent)).toContain("training_slime_attack");
    expect(formatCombatEventMessage(ended)).toBe("Combat won.");
  });

  it("formats unknown events with a safe fallback", () => {
    expect(formatCombatEventMessage({ type: "FutureEvent" })).toBe("Event: FutureEvent");
  });
});

describe("CombatEventPlayer", () => {
  const createSceneStub = () => ({
    time: {
      delayedCall: (_delay: number, callback: () => void) => {
        if (_delay < 1000) {
          callback();
        }

        return {
          remove: () => undefined
        };
      }
    }
  });

  it("plays known events through the visible FX presenter as well as the log", async () => {
    const event: GameEvent = {
      type: "PetCommanded",
      petInstanceId: petInstanceId("sandbox:ember_fox"),
      cardInstanceId: cardInstanceId("card:fox_bite"),
      cardId: cardId("fox_bite")
    };
    const eventLog = { append: vi.fn() };
    const fxPresenter = { play: vi.fn().mockResolvedValue(undefined) };
    const player = new CombatEventPlayer(createSceneStub() as never, eventLog as never, fxPresenter as never);

    await player.play([event]);

    expect(eventLog.append).toHaveBeenCalledWith(expect.stringContaining("fox_bite"));
    expect(fxPresenter.play).toHaveBeenCalledWith(event);
    expect(player.getPlaybackObservations()).toMatchObject([{
      eventType: "PetCommanded",
      policy: "animated",
      visualRoute: "fx",
      outcome: "completed",
      fallbackUsed: false
    }]);
  });

  it("notifies the scene when an event visual starts before FX playback settles", async () => {
    const event: GameEvent = {
      type: "DamageDealt",
      sourceId: combatantId("player"),
      targetId: combatantId("monster:training_slime:0"),
      amount: 6,
      blocked: 0
    };
    const eventLog = { append: vi.fn() };
    let resolveFx: (() => void) | undefined;
    const fxPresenter = {
      play: vi.fn().mockReturnValue(new Promise<void>((resolve) => {
        resolveFx = resolve;
      }))
    };
    const onEventPlayed = vi.fn();
    const onEventVisualStarted = vi.fn();
    const player = new CombatEventPlayer(
      createSceneStub() as never,
      eventLog as never,
      fxPresenter as never,
      onEventPlayed,
      onEventVisualStarted
    );
    const playback = player.play([event]);

    await Promise.resolve();

    expect(onEventVisualStarted).toHaveBeenCalledWith(event);
    expect(onEventPlayed).not.toHaveBeenCalled();

    resolveFx?.();
    await playback;

    expect(onEventPlayed).toHaveBeenCalledWith(event);
  });

  it("waits for visible FX before finalizing event playback", async () => {
    const event: GameEvent = {
      type: "MonsterIntentSet",
      monsterId: combatantId("monster:training_slime:0"),
      intentId: monsterIntentId("training_slime_attack"),
      intentType: "attack",
      description: "Attack the Keeper."
    };
    const eventLog = { append: vi.fn() };
    let resolveFx: (() => void) | undefined;
    const fxPresenter = {
      play: vi.fn().mockReturnValue(new Promise<void>((resolve) => {
        resolveFx = resolve;
      }))
    };
    const player = new CombatEventPlayer(createSceneStub() as never, eventLog as never, fxPresenter as never);
    let finalized = false;
    const playback = player.play([event]).then(() => {
      finalized = true;
    });

    await Promise.resolve();
    expect(eventLog.append).toHaveBeenCalledWith("monster:training_slime:0 set an intent.");
    expect(finalized).toBe(false);

    resolveFx?.();
    await playback;

    expect(finalized).toBe(true);
  });

  it("continues playback when visible FX rejects", async () => {
    const event: GameEvent = {
      type: "StatusApplied",
      targetId: combatantId("monster:ash_mite:0"),
      statusId: statusId("burn"),
      stacks: 2
    };
    const eventLog = { append: vi.fn() };
    const fxPresenter = { play: vi.fn().mockRejectedValue(new Error("fx failed")) };
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const player = new CombatEventPlayer(createSceneStub() as never, eventLog as never, fxPresenter as never);

    await player.play([event]);

    expect(eventLog.append).toHaveBeenCalledWith(expect.stringContaining("burn"));
    expect(warning).toHaveBeenCalledWith("CombatEventPlayer recovered from FX playback failure.", expect.any(Error));
    expect(player.getPlaybackObservations()).toMatchObject([{
      eventType: "StatusApplied",
      outcome: "recovered",
      fallbackUsed: true,
      warningCode: "fx_failure",
      errorSummary: "fx failed"
    }]);
    warning.mockRestore();
  });

  it("continues playback when visible FX throws synchronously", async () => {
    const events: readonly GameEvent[] = [
      {
        type: "StatusApplied",
        targetId: combatantId("monster:ash_mite:0"),
        statusId: statusId("burn"),
        stacks: 2
      },
      { type: "TurnStarted", turnNumber: 2, actorId: combatantId("player") }
    ];
    const eventLog = { append: vi.fn() };
    const fxPresenter = {
      play: vi.fn((event: GameEvent) => {
        if (event.type === "StatusApplied") {
          throw new Error("sync fx failed");
        }

        return Promise.resolve();
      })
    };
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const player = new CombatEventPlayer(createSceneStub() as never, eventLog as never, fxPresenter as never);

    await player.play(events);

    expect(eventLog.append).toHaveBeenCalledTimes(2);
    expect(player.getPlaybackObservations()).toMatchObject([
      {
        eventType: "StatusApplied",
        outcome: "recovered",
        fallbackUsed: true,
        warningCode: "fx_failure",
        errorSummary: "sync fx failed"
      },
      {
        eventType: "TurnStarted",
        outcome: "completed",
        fallbackUsed: false
      }
    ]);
    warning.mockRestore();
  });

  it("records resolved FX fallback metadata in playback observations", async () => {
    const event: GameEvent = {
      type: "CardPlayed",
      cardInstanceId: cardInstanceId("missing-card"),
      cardId: cardId("strike"),
      sourceId: combatantId("player")
    };
    const eventLog = { append: vi.fn() };
    const fxPresenter = {
      play: vi.fn().mockResolvedValue(undefined),
      consumePlaybackFallback: vi.fn(() => ({
        warningCode: "missing_card_point",
        errorSummary: "CardPlayed used hand fallback for missing-card"
      }))
    };
    const player = new CombatEventPlayer(createSceneStub() as never, eventLog as never, fxPresenter as never);

    await player.play([event]);

    expect(player.getPlaybackObservations()).toMatchObject([{
      eventType: "CardPlayed",
      outcome: "recovered",
      fallbackUsed: true,
      warningCode: "missing_card_point",
      errorSummary: "CardPlayed used hand fallback for missing-card"
    }]);
  });

  it("notifies after each visible event has played", async () => {
    const events: readonly GameEvent[] = [
      {
        type: "CardMoved",
        cardInstanceId: cardInstanceId("card:1"),
        cardId: cardId("strike"),
        from: "draw",
        to: "hand"
      },
      {
        type: "CardDrawn",
        cardInstanceId: cardInstanceId("card:1"),
        cardId: cardId("strike")
      }
    ];
    const eventLog = { append: vi.fn() };
    const playedOrder: string[] = [];
    const fxPresenter = {
      play: vi.fn().mockImplementation((event: GameEvent) => {
        playedOrder.push(`fx:${event.type}`);
        return Promise.resolve();
      })
    };
    const afterEvent = vi.fn((event: GameEvent) => {
      playedOrder.push(`after:${event.type}`);
    });
    const player = new CombatEventPlayer(createSceneStub() as never, eventLog as never, fxPresenter as never, afterEvent);

    await player.play(events);

    expect(afterEvent).toHaveBeenCalledTimes(2);
    expect(afterEvent).toHaveBeenNthCalledWith(1, events[0]);
    expect(afterEvent).toHaveBeenNthCalledWith(2, events[1]);
    expect(playedOrder).toEqual([
      "after:CardMoved",
      "after:CardDrawn"
    ]);
    expect(fxPresenter.play).not.toHaveBeenCalled();
  });

  it("records card movement fallback metadata from the event callback", async () => {
    const event: GameEvent = {
      type: "CardMoved",
      cardInstanceId: cardInstanceId("missing-card"),
      cardId: cardId("strike"),
      from: "hand",
      to: "discard"
    };
    const eventLog = { append: vi.fn() };
    const player = new CombatEventPlayer(
      createSceneStub() as never,
      eventLog as never,
      undefined,
      vi.fn(() => ({
        warningCode: "card_movement_fallback",
        errorSummary: "Card movement fallback for missing-card from hand to discard"
      }))
    );

    await player.play([event]);

    expect(player.getPlaybackObservations()).toMatchObject([{
      eventType: "CardMoved",
      policy: "stateSyncOnly",
      visualRoute: "cardMovement",
      outcome: "recovered",
      fallbackUsed: true,
      warningCode: "card_movement_fallback",
      errorSummary: "Card movement fallback for missing-card from hand to discard"
    }]);
  });

  it("refreshes the playback timeout for each event without delaying log-only queues", async () => {
    const events: readonly GameEvent[] = [
      { type: "TurnStarted", turnNumber: 1, actorId: combatantId("player") },
      {
        type: "CardMoved",
        cardInstanceId: cardInstanceId("card:1"),
        cardId: cardId("strike"),
        from: "draw",
        to: "hand"
      },
      {
        type: "CardMoved",
        cardInstanceId: cardInstanceId("card:2"),
        cardId: cardId("defend"),
        from: "draw",
        to: "hand"
      }
    ];
    const eventLog = { append: vi.fn() };
    const delayedCalls: Array<{ readonly delay: number; readonly callback: () => void }> = [];
    const scene = {
      time: {
        delayedCall: (delay: number, callback: () => void) => {
          delayedCalls.push({ delay, callback });
          if (delay === 70) {
            callback();
          }

          return {
            remove: () => undefined
          };
        }
      }
    };
    const fxPresenter = { play: vi.fn().mockResolvedValue(undefined) };
    const player = new CombatEventPlayer(scene as never, eventLog as never, fxPresenter as never);

    await player.play(events);

    expect(eventLog.append).toHaveBeenCalledTimes(events.length);
    expect(delayedCalls.filter((entry) => entry.delay === 5000)).toHaveLength(events.length);
    expect(delayedCalls.filter((entry) => entry.delay !== 5000)).toHaveLength(0);
    expect(player.getPlaybackObservations().map((observation) => observation.eventType)).toEqual([
      "TurnStarted",
      "CardMoved",
      "CardMoved"
    ]);
  });

  it("keeps a short visible beat only between animated events", async () => {
    const events: readonly GameEvent[] = [
      {
        type: "CardPlayed",
        cardInstanceId: cardInstanceId("card:1"),
        cardId: cardId("strike"),
        sourceId: combatantId("player")
      },
      { type: "TurnStarted", turnNumber: 2, actorId: combatantId("player") },
      {
        type: "DamageDealt",
        sourceId: combatantId("player"),
        targetId: combatantId("monster:training_slime:0"),
        amount: 6,
        blocked: 0
      }
    ];
    const eventLog = { append: vi.fn() };
    const delayedCalls: Array<{ readonly delay: number; readonly callback: () => void }> = [];
    const scene = {
      time: {
        delayedCall: (delay: number, callback: () => void) => {
          delayedCalls.push({ delay, callback });
          if (delay !== 5000) {
            callback();
          }

          return {
            remove: () => undefined
          };
        }
      }
    };
    const fxPresenter = { play: vi.fn().mockResolvedValue(undefined) };
    const player = new CombatEventPlayer(scene as never, eventLog as never, fxPresenter as never);

    await player.play(events);

    expect(delayedCalls.filter((entry) => entry.delay === 35)).toHaveLength(1);
  });

  it("skips unknown event visuals and still finalizes playback", async () => {
    const eventLog = { append: vi.fn() };
    const fxPresenter = { play: vi.fn().mockResolvedValue(undefined) };
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const player = new CombatEventPlayer(createSceneStub() as never, eventLog as never, fxPresenter as never);

    await player.play([{ type: "FutureEvent" } as never]);

    expect(eventLog.append).toHaveBeenCalledWith("Event: FutureEvent");
    expect(fxPresenter.play).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledWith("CombatEventPlayer skipped unknown event visual: FutureEvent");
    expect(player.getPlaybackObservations()).toMatchObject([{
      eventType: "FutureEvent",
      policy: "unknown",
      visualRoute: "none",
      outcome: "skippedUnknown",
      fallbackUsed: true,
      warningCode: "unknown_event"
    }]);
    warning.mockRestore();
  });

  it("records a timeout observation when event playback does not settle", async () => {
    const event: GameEvent = { type: "TurnStarted", turnNumber: 1, actorId: combatantId("player") };
    const eventLog = { append: vi.fn() };
    const delayedCalls: Array<{ readonly delay: number; readonly callback: () => void }> = [];
    const scene = {
      time: {
        delayedCall: (delay: number, callback: () => void) => {
          delayedCalls.push({ delay, callback });

          return {
            remove: () => undefined
          };
        }
      }
    };
    const fxPresenter = { play: vi.fn().mockResolvedValue(undefined) };
    const afterEvent = vi.fn(() => new Promise<void>(() => undefined));
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const player = new CombatEventPlayer(scene as never, eventLog as never, fxPresenter as never, afterEvent);
    const playback = player.play([event]);

    await Promise.resolve();
    delayedCalls.find((entry) => entry.delay === 5000)?.callback();
    await playback;

    expect(warning).toHaveBeenCalledWith("CombatEventPlayer finalized after playback timeout.");
    expect(player.getPlaybackObservations()).toMatchObject([{
      eventType: "TurnStarted",
      outcome: "timeout",
      fallbackUsed: true,
      warningCode: "playback_timeout"
    }]);
    warning.mockRestore();
  });

  it("keeps timeout diagnostics when a late callback resolves after playback unlocked", async () => {
    const event: GameEvent = { type: "TurnStarted", turnNumber: 1, actorId: combatantId("player") };
    const eventLog = { append: vi.fn() };
    const delayedCalls: Array<{ readonly delay: number; readonly callback: () => void }> = [];
    const scene = {
      time: {
        delayedCall: (delay: number, callback: () => void) => {
          delayedCalls.push({ delay, callback });

          return {
            remove: () => undefined
          };
        }
      }
    };
    let resolveAfterEvent: (() => void) | undefined;
    const afterEvent = vi.fn(() => new Promise<void>((resolve) => {
      resolveAfterEvent = resolve;
    }));
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const player = new CombatEventPlayer(scene as never, eventLog as never, undefined, afterEvent);
    const playback = player.play([event]);

    await Promise.resolve();
    delayedCalls.find((entry) => entry.delay === 5000)?.callback();
    await playback;
    resolveAfterEvent?.();
    await Promise.resolve();

    expect(player.getPlaybackObservations()).toHaveLength(1);
    expect(player.getPlaybackObservations()).toMatchObject([{
      eventType: "TurnStarted",
      outcome: "timeout",
      warningCode: "playback_timeout"
    }]);
    warning.mockRestore();
  });
});
