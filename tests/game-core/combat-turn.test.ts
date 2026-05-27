import { describe, expect, it } from "vitest";
import {
  burnStatusDefinition,
  cardInstanceId,
  createRng,
  endPlayerTurn,
  startPlayerTurn,
  statusId,
  type GameContentRegistry
} from "../../src/game-core";
import { createHandTunedCombatFixture } from "../../src/game-core/testing/combat-fixtures";

const createStatusRegistry = (
  statuses: GameContentRegistry["statuses"]
): GameContentRegistry => ({
  cards: [],
  statuses,
  pets: [],
  players: [],
  monsters: [],
  encounters: [],
  runMapTemplates: [],
  petUpgrades: [],
  storyEvents: [],
  petSideStories: []
});

describe("combat turn flow", () => {
  it("ends the player turn by discarding the hand and entering enemy turn", () => {
    const state = createHandTunedCombatFixture();
    const result = endPlayerTurn(state);
    const cardByInstanceId = new Map(state.cardInstances.map((cardInstance) => [cardInstance.id, cardInstance]));
    const expectedMoveEvents = state.hand.map((cardInstanceId) => ({
      type: "CardMoved" as const,
      cardInstanceId,
      cardId: cardByInstanceId.get(cardInstanceId)!.cardId,
      from: "hand" as const,
      to: "discard" as const
    }));
    const expectedEvents = [
      ...expectedMoveEvents,
      {
        type: "TurnEnded" as const,
        turnNumber: state.turnNumber,
        actorId: state.player.id
      }
    ];

    expect(result.ok).toBe(true);
    expect(result.state.phase).toBe("enemy_turn");
    expect(result.state.hand).toEqual([]);
    expect(result.state.discardPile).toEqual(state.hand);
    expect(result.events).toEqual(expectedEvents);
    expect(result.state.events.slice(-expectedEvents.length)).toEqual(expectedEvents);
  });

  it("rejects ending the player turn outside the player turn", () => {
    const state = { ...createHandTunedCombatFixture(), phase: "enemy_turn" as const };
    const result = endPlayerTurn(state);

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["invalid_phase"]);
    expect(result.events.map((event) => event.type)).toEqual(["ActionRejected"]);
  });

  it("processes player end-of-turn statuses before entering enemy turn", () => {
    const fadingStatus = {
      id: statusId("fading"),
      name: "Fading",
      tags: ["debuff"],
      description: "Expires at end of turn.",
      behaviour: {
        type: "duration" as const,
        timing: "endOfTurn" as const,
        decrementDurationBy: 1,
        expiresAtZero: true
      }
    };
    const baseState = createHandTunedCombatFixture();
    const state = {
      ...baseState,
      player: {
        ...baseState.player,
        statuses: [{ statusId: statusId("fading"), stacks: 1, duration: 1 }]
      }
    };
    const result = endPlayerTurn(state, {
      registry: createStatusRegistry([burnStatusDefinition, fadingStatus]),
      rng: createRng("end-status")
    });

    expect(result.ok).toBe(true);
    expect(result.state.player.statuses).toEqual([]);
    expect(result.state.phase).toBe("enemy_turn");
    expect(result.events.map((event) => event.type).slice(-3)).toEqual([
      "StatusDurationChanged",
      "StatusExpired",
      "TurnEnded"
    ]);
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

  it("processes registry-defined player start-of-turn statuses before drawing", () => {
    const fadingStatus = {
      id: statusId("fading_start"),
      name: "Fading Start",
      tags: ["debuff"],
      description: "Expires at start of turn.",
      behaviour: {
        type: "duration" as const,
        timing: "startOfTurn" as const,
        decrementDurationBy: 1,
        expiresAtZero: true
      }
    };
    const baseState = createHandTunedCombatFixture();
    const state = {
      ...baseState,
      phase: "enemy_turn" as const,
      hand: [],
      drawPile: [cardInstanceId("strike:1")],
      player: {
        ...baseState.player,
        statuses: [{ statusId: statusId("fading_start"), stacks: 1, duration: 1 }]
      }
    };
    const result = startPlayerTurn(
      state,
      createRng("start-status"),
      createStatusRegistry([burnStatusDefinition, fadingStatus])
    );

    expect(result.ok).toBe(true);
    expect(result.state.player.statuses).toEqual([]);
    expect(result.events.map((event) => event.type)).toEqual([
      "StatusDurationChanged",
      "StatusExpired",
      "TurnStarted",
      "CardMoved",
      "CardDrawn"
    ]);
  });
});
