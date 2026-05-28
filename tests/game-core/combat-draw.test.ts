import { describe, expect, it } from "vitest";
import { cardInstanceId, drawCards, createRng } from "../../src/game-core";
import { createHandTunedCombatFixture, withPlayerCardActorState } from "../../src/game-core/testing/combat-fixtures";

describe("drawCards", () => {
  it("moves cards from draw pile to hand and emits events in order", () => {
    const state = createHandTunedCombatFixture();
    const result = drawCards(state, 1, createRng("draw-one"));

    expect(result.ok).toBe(true);
    expect(result.state.drawPile).toEqual([]);
    expect(result.state.hand).toContain(cardInstanceId("strike:2"));
    expect(result.events.map((event) => event.type)).toEqual(["CardMoved", "CardDrawn"]);
  });

  it("uses the player Card Actor as authority when projected piles are stale", () => {
    const baseState = createHandTunedCombatFixture();
    const state = {
      ...withPlayerCardActorState(baseState, (actor) => ({
        ...actor,
        hand: [],
        drawPile: [cardInstanceId("strike:1")]
      })),
      hand: [cardInstanceId("defend:1")],
      drawPile: [cardInstanceId("strike:2")]
    };
    const result = drawCards(state, 1, createRng("actor-authority-draw"));

    expect(result.ok).toBe(true);
    expect(result.state.hand).toEqual([cardInstanceId("strike:1")]);
    expect(result.state.drawPile).toEqual([]);
  });

  it("reshuffles discard into draw pile when draw pile is empty", () => {
    const state = withPlayerCardActorState(createHandTunedCombatFixture(), (actor) => ({
      ...actor,
      drawPile: [],
      discardPile: [cardInstanceId("strike:2")]
    }));
    const result = drawCards(state, 1, createRng("reshuffle"));

    expect(result.ok).toBe(true);
    expect(result.state.discardPile).toEqual([]);
    expect(result.state.hand).toContain(cardInstanceId("strike:2"));
    expect(result.events.map((event) => event.type)).toEqual(["DeckShuffled", "CardMoved", "CardDrawn"]);
  });

  it("draws one card at a time and keeps reshuffle events in sequence", () => {
    const state = withPlayerCardActorState(createHandTunedCombatFixture(), (actor) => ({
      ...actor,
      hand: [],
      drawPile: [cardInstanceId("strike:1")],
      discardPile: [cardInstanceId("defend:1"), cardInstanceId("focus:1"), cardInstanceId("fox_bite:1")]
    }));
    const result = drawCards(state, 4, createRng("draw-four-with-reshuffle"));

    expect(result.ok).toBe(true);
    expect(result.state.hand).toHaveLength(4);
    expect(result.state.discardPile).toEqual([]);
    expect(result.events.map((event) => event.type)).toEqual([
      "CardMoved",
      "CardDrawn",
      "DeckShuffled",
      "CardMoved",
      "CardDrawn",
      "CardMoved",
      "CardDrawn",
      "CardMoved",
      "CardDrawn"
    ]);
  });

  it("does not crash when draw and discard are empty", () => {
    const state = withPlayerCardActorState(createHandTunedCombatFixture(), (actor) => ({
      ...actor,
      drawPile: [],
      discardPile: []
    }));
    const result = drawCards(state, 3, createRng("empty"));

    expect(result.ok).toBe(true);
    expect(result.events).toEqual([]);
    expect(result.state.hand).toEqual(state.hand);
  });

  it("reshuffles discard deterministically", () => {
    const state = withPlayerCardActorState(createHandTunedCombatFixture(), (actor) => ({
      ...actor,
      drawPile: [],
      discardPile: [cardInstanceId("strike:1"), cardInstanceId("defend:1"), cardInstanceId("focus:1")],
      hand: []
    }));
    const first = drawCards(state, 2, createRng("same-shuffle"));
    const second = drawCards(state, 2, createRng("same-shuffle"));

    expect(first.state.hand).toEqual(second.state.hand);
    expect(first.state.drawPile).toEqual(second.state.drawPile);
  });
});
