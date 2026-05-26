import { describe, expect, it } from "vitest";
import { cardId, cardInstanceId, combatantId, type GameEvent } from "../../src/game-core";
import {
  planCombatEventAnimation,
  planCombatEventAnimationFromInput,
  planCombatEventAnimations
} from "../../src/game-phaser/animation/combat-animation-plan";
import type { CombatViewModel } from "../../src/game-phaser/view-models/combat-view-model";

const finalHand = [
  {
    cardInstanceId: cardInstanceId("card:1"),
    cardId: cardId("strike"),
    name: "Strike",
    description: "Deal damage.",
    type: "attack",
    cost: 1,
    tags: [],
    playable: true,
    isPetCommand: false,
    tagTooltips: [],
    keywordExplanations: [],
    detail: { title: "Strike", lines: [] },
    targetKind: "enemy",
    playMode: "selectEnemy",
    requiresManualTarget: true,
    validTargetIds: [combatantId("monster:0")]
  }
] satisfies CombatViewModel["hand"];

describe("combat animation plan", () => {
  it("plans card movement commands from CardMoved events and the final hand snapshot", () => {
    const event: GameEvent = {
      type: "CardMoved",
      cardInstanceId: cardInstanceId("card:1"),
      cardId: cardId("strike"),
      from: "draw",
      to: "hand"
    };
    const command = planCombatEventAnimation(event, { hand: finalHand } as unknown as CombatViewModel);

    expect(command).toEqual({
      type: "cardMovement",
      event,
      finalHand
    });
  });

  it("falls back to event FX commands for non-movement events or missing snapshots", () => {
    const moved: GameEvent = {
      type: "CardMoved",
      cardInstanceId: cardInstanceId("card:1"),
      cardId: cardId("strike"),
      from: "draw",
      to: "hand"
    };
    const damage: GameEvent = {
      type: "DamageDealt",
      sourceId: combatantId("player"),
      targetId: combatantId("monster:0"),
      amount: 6,
      blocked: 0
    };

    expect(planCombatEventAnimation(moved, undefined)).toEqual({ type: "eventFx", event: moved });
    expect(planCombatEventAnimation(damage, { hand: finalHand } as unknown as CombatViewModel)).toEqual({ type: "eventFx", event: damage });
  });

  it("falls back when draw-to-hand card movement lacks the moved card snapshot", () => {
    const moved: GameEvent = {
      type: "CardMoved",
      cardInstanceId: cardInstanceId("missing-card"),
      cardId: cardId("strike"),
      from: "draw",
      to: "hand"
    };

    expect(planCombatEventAnimation(moved, { hand: finalHand } as unknown as CombatViewModel)).toEqual({
      type: "eventFx",
      event: moved
    });
  });

  it("preserves command order for multiple events", () => {
    const first: GameEvent = {
      type: "CardMoved",
      cardInstanceId: cardInstanceId("card:1"),
      cardId: cardId("strike"),
      from: "draw",
      to: "hand"
    };
    const second: GameEvent = {
      type: "CardMoved",
      cardInstanceId: cardInstanceId("card:2"),
      cardId: cardId("defend"),
      from: "hand",
      to: "discard"
    };
    const third: GameEvent = {
      type: "BlockGained",
      targetId: combatantId("player"),
      amount: 5,
      total: 5
    };

    expect(planCombatEventAnimations([first, second, third], {
      finalViewModel: { hand: finalHand } as unknown as CombatViewModel
    })).toEqual([
      { type: "cardMovement", event: first, finalHand },
      { type: "cardMovement", event: second, finalHand },
      { type: "eventFx", event: third }
    ]);
  });

  it("uses event FX for unknown event shapes", () => {
    const event = { type: "UnknownEvent" } as unknown as GameEvent;

    expect(planCombatEventAnimationFromInput({ event })).toEqual({ type: "eventFx", event });
  });
});
