import { describe, expect, it } from "vitest";
import {
  cardId,
  createRng,
  removeRunDeckCard,
  resolveEffects,
  starterRegistry,
  transformRunDeckCard,
  upgradeRunDeckCard
} from "../../src/game-core";
import { createHandTunedCombatFixture } from "../../src/game-core/testing/combat-fixtures";
import { createRunFixture } from "../../src/game-core/testing/fixtures";

describe("deck economy", () => {
  it("moves hand cards through discard and exhaust effects", () => {
    const state = createHandTunedCombatFixture();
    const result = resolveEffects(
      state,
      [
        { type: "discard", amount: 1 },
        { type: "exhaust", amount: 1 }
      ],
      { sourceId: state.player.id },
      starterRegistry,
      createRng("pile-effects")
    );

    expect(result.ok).toBe(true);
    expect(result.state.discardPile).toEqual([state.hand[0]]);
    expect(result.state.exhaustPile).toEqual([state.hand[1]]);
    expect(result.events.map((event) => event.type)).toEqual(["CardMoved", "CardMoved"]);
  });

  it("creates cards into the requested pile and can retain cards", () => {
    const state = createHandTunedCombatFixture();
    const result = resolveEffects(
      state,
      [
        { type: "createCard", cardId: cardId("strike"), to: "draw" },
        { type: "retain", amount: 1 },
        { type: "gainEnergy", amount: 2 }
      ],
      { sourceId: state.player.id },
      starterRegistry,
      createRng("create-retain")
    );

    expect(result.ok).toBe(true);
    expect(result.state.drawPile).toContainEqual(expect.stringContaining("created"));
    expect(result.state.retainedCardInstanceIds).toEqual([state.hand[0]]);
    expect(result.state.energy).toBe(5);
    expect(result.events.map((event) => event.type)).toEqual(["CardCreated", "CardRetained", "EnergyGained"]);
  });

  it("upgrades, removes, and transforms run deck cards deterministically", () => {
    const run = createRunFixture({ deckCardIds: [cardId("strike"), cardId("defend")] });
    const upgradedRun = createRunFixture({
      deckCardIds: [cardId("strike"), cardId("defend")],
      upgradedDeckCardIds: [cardId("strike")]
    });
    const upgraded = upgradeRunDeckCard({ run, registry: starterRegistry, cardId: cardId("strike") });
    const removed = removeRunDeckCard({ run, registry: starterRegistry, cardId: cardId("defend") });
    const transformed = transformRunDeckCard({
      run: upgradedRun,
      registry: starterRegistry,
      cardId: cardId("strike"),
      rng: createRng("transform")
    });

    expect(upgraded.ok).toBe(true);
    expect(upgraded.state.upgradedDeckCardIds).toEqual([cardId("strike")]);
    expect(removed.ok).toBe(true);
    expect(removed.state.deckCardIds).toEqual([cardId("strike")]);
    expect(transformed.ok).toBe(true);
    expect(transformed.state.deckCardIds).not.toContain(cardId("strike"));
    expect(transformed.state.upgradedDeckCardIds).toEqual([]);
    expect(transformed.events.map((event) => event.type)).toEqual(["RunDeckCardTransformed"]);
  });
});
