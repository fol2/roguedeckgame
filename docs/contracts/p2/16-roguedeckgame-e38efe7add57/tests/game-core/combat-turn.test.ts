import { describe, expect, it } from "vitest";
import { cardInstanceId, createRng, endPlayerTurn, startPlayerTurn } from "../../src/game-core";
import { createHandTunedCombatFixture } from "../../src/game-core/testing/combat-fixtures";

describe("combat turn flow", () => {
  it("ends the player turn by discarding the hand and entering enemy turn", () => {
    const state = createHandTunedCombatFixture();
    const result = endPlayerTurn(state);

    expect(result.ok).toBe(true);
    expect(result.state.phase).toBe("enemy_turn");
    expect(result.state.hand).toEqual([]);
    expect(result.state.discardPile).toEqual(state.hand);
    expect(result.events.at(-1)?.type).toBe("TurnEnded");
    expect(result.events.filter((event) => event.type === "CardMoved")).toHaveLength(state.hand.length);
  });

  it("rejects ending the player turn outside the player turn", () => {
    const state = { ...createHandTunedCombatFixture(), phase: "enemy_turn" as const };
    const result = endPlayerTurn(state);

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["invalid_phase"]);
    expect(result.events.map((event) => event.type)).toEqual(["ActionRejected"]);
  });

  it("starts a new player turn by resetting energy, clearing player block, and drawing", () => {
    const baseState = createHandTunedCombatFixture();
    const state = {
      ...baseState,
      phase: "enemy_turn" as const,
      turnNumber: 1,
      energy: 0,
      player: { ...baseState.player, block: 7 },
      hand: [],
      drawPile: [cardInstanceId("strike:1")]
    };
    const result = startPlayerTurn(state, createRng("next-turn"));

    expect(result.ok).toBe(true);
    expect(result.state.phase).toBe("player_turn");
    expect(result.state.turnNumber).toBe(2);
    expect(result.state.energy).toBe(3);
    expect(result.state.player.block).toBe(0);
    expect(result.state.hand).toEqual([cardInstanceId("strike:1")]);
    expect(result.events.map((event) => event.type)).toEqual(["TurnStarted", "CardMoved", "CardDrawn"]);
  });

  it("rejects starting a player turn outside enemy_turn", () => {
    const state = createHandTunedCombatFixture();
    const result = startPlayerTurn(state, createRng("invalid-start"));

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["invalid_phase"]);
    expect(result.events.map((event) => event.type)).toEqual(["ActionRejected"]);
  });
});
