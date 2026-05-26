import { describe, expect, it } from "vitest";
import { cardInstanceId, moveCardBetweenPiles } from "../../src/game-core";
import { createHandTunedCombatFixture } from "../../src/game-core/testing/combat-fixtures";

describe("card pile movement", () => {
  it("moves a concrete card between piles and emits one CardMoved event", () => {
    const state = createHandTunedCombatFixture();
    const result = moveCardBetweenPiles(state, {
      cardInstanceId: cardInstanceId("strike:1"),
      from: "hand",
      to: "discard"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.state.hand).not.toContain(cardInstanceId("strike:1"));
    expect(result.state.discardPile).toEqual([cardInstanceId("strike:1")]);
    expect(result.event).toMatchObject({
      type: "CardMoved",
      cardInstanceId: cardInstanceId("strike:1"),
      from: "hand",
      to: "discard"
    });
    expect(result.state.events.at(-1)).toEqual(result.event);
  });

  it("rejects movement for missing card instances without mutating state", () => {
    const state = createHandTunedCombatFixture();
    const result = moveCardBetweenPiles(state, {
      cardInstanceId: cardInstanceId("missing"),
      from: "hand",
      to: "discard"
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "missing_card_instance",
        message: "Card instance 'missing' does not exist.",
        path: "hand"
      }
    });
    expect(state.hand).toContain(cardInstanceId("strike:1"));
  });

  it("rejects movement when the card is not in the source pile", () => {
    const state = createHandTunedCombatFixture();
    const result = moveCardBetweenPiles(state, {
      cardInstanceId: cardInstanceId("strike:1"),
      from: "draw",
      to: "discard"
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "card_not_in_pile",
        message: "Card instance 'strike:1' is not in draw.",
        path: "draw"
      }
    });
  });
});
