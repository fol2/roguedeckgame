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

    expect(formatCombatEventMessage(planned)).toContain("Attack the Keeper");
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
    expect(eventLog.append).toHaveBeenCalledWith(expect.stringContaining("Attack the Keeper"));
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
    warning.mockRestore();
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
      "fx:CardMoved",
      "after:CardMoved",
      "fx:CardDrawn",
      "after:CardDrawn"
    ]);
  });

  it("refreshes the playback timeout for each event instead of timing out a long queue", async () => {
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
    expect(delayedCalls.filter((entry) => entry.delay === 70)).toHaveLength(events.length - 1);
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
    warning.mockRestore();
  });
});
