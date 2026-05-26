import { describe, expect, it } from "vitest";
import { cardInstanceId, drawCards, createRng } from "../../src/game-core";
import { createHandTunedCombatFixture } from "../../src/game-core/testing/combat-fixtures";

describe("drawCards", () => {
  it("moves cards from draw pile to hand and emits events in order", () => {
    const state = createHandTunedCombatFixture();
    const result = drawCards(state, 1, createRng("draw-one"));

    expect(result.ok).toBe(true);
    expect(result.state.drawPile).toEqual([]);
    expect(result.state.hand).toContain(cardInstanceId("strike:2"));
    expect(result.events.map((event) => event.type)).toEqual(["CardMoved", "CardDrawn"]);
  });

  it("reshuffles discard into draw pile when draw pile is empty", () => {
    const state = {
      ...createHandTunedCombatFixture(),
      drawPile: [],
      discardPile: [cardInstanceId("strike:2")]
    };
    const result = drawCards(state, 1, createRng("reshuffle"));

    expect(result.ok).toBe(true);
    expect(result.state.discardPile).toEqual([]);
    expect(result.state.hand).toContain(cardInstanceId("strike:2"));
    expect(result.events.map((event) => event.type)).toEqual(["DeckShuffled", "CardMoved", "CardDrawn"]);
  });

  it("does not crash when draw and discard are empty", () => {
    const state = {
      ...createHandTunedCombatFixture(),
      drawPile: [],
      discardPile: []
    };
    const result = drawCards(state, 3, createRng("empty"));

    expect(result.ok).toBe(true);
    expect(result.events).toEqual([]);
    expect(result.state.hand).toEqual(state.hand);
  });

  it("reshuffles discard deterministically", () => {
    const state = {
      ...createHandTunedCombatFixture(),
      drawPile: [],
      discardPile: [cardInstanceId("strike:1"), cardInstanceId("defend:1"), cardInstanceId("focus:1")],
      hand: []
    };
    const first = drawCards(state, 2, createRng("same-shuffle"));
    const second = drawCards(state, 2, createRng("same-shuffle"));

    expect(first.state.hand).toEqual(second.state.hand);
    expect(first.state.drawPile).toEqual(second.state.drawPile);
  });
});
