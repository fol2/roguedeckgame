import { describe, expect, it } from "vitest";
import { cardId, cardInstanceId, combatantId, type GameEvent } from "../../src/game-core";
import { planCombatEventAnimation } from "../../src/game-phaser/animation/combat-animation-plan";
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
});
