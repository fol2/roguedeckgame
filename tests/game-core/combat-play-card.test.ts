import { describe, expect, it } from "vitest";
import {
  cardId,
  cardInstanceId,
  combatantId,
  createRng,
  playCard,
  starterRegistry,
  statusId
} from "../../src/game-core";
import { createHandTunedCombatFixture } from "../../src/game-core/testing/combat-fixtures";

const targetId = combatantId("monster:training_slime:0");

describe("playCard", () => {
  it("plays Strike, spends energy, damages target, and discards the card", () => {
    const result = playCard(
      createHandTunedCombatFixture(),
      { type: "playCard", cardInstanceId: cardInstanceId("strike:1"), targetId },
      starterRegistry,
      createRng("strike")
    );

    expect(result.ok).toBe(true);
    expect(result.state.energy).toBe(2);
    expect(result.state.monsters[0].hp).toBe(16);
    expect(result.state.discardPile).toContain(cardInstanceId("strike:1"));
    expect(result.events.map((event) => event.type)).toEqual([
      "CardPlayed",
      "EnergySpent",
      "DamageDealt",
      "CardMoved"
    ]);
  });

  it("plays Defend and adds block", () => {
    const result = playCard(
      createHandTunedCombatFixture(),
      { type: "playCard", cardInstanceId: cardInstanceId("defend:1") },
      starterRegistry,
      createRng("defend")
    );

    expect(result.ok).toBe(true);
    expect(result.state.energy).toBe(2);
    expect(result.state.player.block).toBe(5);
    expect(result.events.map((event) => event.type)).toEqual(["CardPlayed", "EnergySpent", "BlockGained", "CardMoved"]);
  });

  it("plays Focus for zero energy and draws one", () => {
    const result = playCard(
      createHandTunedCombatFixture(),
      { type: "playCard", cardInstanceId: cardInstanceId("focus:1") },
      starterRegistry,
      createRng("focus")
    );

    expect(result.ok).toBe(true);
    expect(result.state.energy).toBe(3);
    expect(result.state.hand).toContain(cardInstanceId("strike:2"));
    expect(result.state.discardPile).toContain(cardInstanceId("focus:1"));
    expect(result.events.map((event) => event.type)).toEqual([
      "CardPlayed",
      "EnergySpent",
      "CardMoved",
      "CardDrawn",
      "CardMoved"
    ]);
  });

  it("rejects target ids on targetless cards", () => {
    const state = createHandTunedCombatFixture();
    const before = JSON.parse(JSON.stringify(state));
    const result = playCard(
      state,
      { type: "playCard", cardInstanceId: cardInstanceId("defend:1"), targetId },
      starterRegistry,
      createRng("defend-extra-target")
    );

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(JSON.parse(JSON.stringify(state))).toEqual(before);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["unexpected_card_target"]);
    expect(result.events.map((event) => event.type)).toEqual(["ActionRejected"]);
  });

  it("returns ok false and does not mutate state when energy is insufficient", () => {
    const state = { ...createHandTunedCombatFixture(), energy: 0 };
    const before = JSON.parse(JSON.stringify(state));
    const result = playCard(
      state,
      { type: "playCard", cardInstanceId: cardInstanceId("strike:1"), targetId },
      starterRegistry,
      createRng("insufficient")
    );

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(JSON.parse(JSON.stringify(state))).toEqual(before);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["insufficient_energy"]);
    expect(result.events.map((event) => event.type)).toEqual(["ActionRejected"]);
  });

  it("returns ok false and does not mutate state when the card is not in hand", () => {
    const baseState = createHandTunedCombatFixture();
    const state = {
      ...baseState,
      hand: baseState.hand.filter((cardInstance) => cardInstance !== cardInstanceId("strike:1"))
    };
    const before = JSON.parse(JSON.stringify(state));
    const result = playCard(
      state,
      { type: "playCard", cardInstanceId: cardInstanceId("strike:1"), targetId },
      starterRegistry,
      createRng("not-in-hand")
    );

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(JSON.parse(JSON.stringify(state))).toEqual(before);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["card_not_in_hand"]);
    expect(result.events.map((event) => event.type)).toEqual(["ActionRejected"]);
  });

  it("returns ok false for an invalid target", () => {
    const state = createHandTunedCombatFixture();
    const before = JSON.parse(JSON.stringify(state));
    const result = playCard(
      state,
      { type: "playCard", cardInstanceId: cardInstanceId("strike:1"), targetId: combatantId("missing") },
      starterRegistry,
      createRng("invalid-target")
    );

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(JSON.parse(JSON.stringify(state))).toEqual(before);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["invalid_target"]);
  });

  it("returns ok false when a player card targets the player", () => {
    const state = createHandTunedCombatFixture();
    const before = JSON.parse(JSON.stringify(state));
    const result = playCard(
      state,
      { type: "playCard", cardInstanceId: cardInstanceId("strike:1"), targetId: combatantId("player") },
      starterRegistry,
      createRng("player-target")
    );

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(JSON.parse(JSON.stringify(state))).toEqual(before);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["invalid_target_type"]);
    expect(result.events.map((event) => event.type)).toEqual(["ActionRejected"]);
  });

  it("returns ok false for a dead target", () => {
    const baseState = createHandTunedCombatFixture();
    const state = { ...baseState, monsters: [{ ...baseState.monsters[0], hp: 0, alive: false }] };
    const before = JSON.parse(JSON.stringify(state));
    const result = playCard(
      state,
      { type: "playCard", cardInstanceId: cardInstanceId("strike:1"), targetId },
      starterRegistry,
      createRng("dead-target")
    );

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(JSON.parse(JSON.stringify(state))).toEqual(before);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["dead_target"]);
  });

  it("returns ok false with the original state when effect resolution fails after staging events", () => {
    const baseState = createHandTunedCombatFixture();
    const state = {
      ...baseState,
      cardInstances: baseState.cardInstances.filter((cardInstance) => cardInstance.id !== cardInstanceId("strike:2"))
    };
    const before = JSON.parse(JSON.stringify(state));
    const result = playCard(
      state,
      { type: "playCard", cardInstanceId: cardInstanceId("focus:1") },
      starterRegistry,
      createRng("missing-draw-instance")
    );

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(JSON.parse(JSON.stringify(state))).toEqual(before);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["missing_card_instance"]);
    expect(result.events.map((event) => event.type)).toEqual(["ActionRejected"]);
  });

  it("applies damage after block", () => {
    const baseState = createHandTunedCombatFixture();
    const state = {
      ...baseState,
      monsters: [{ ...baseState.monsters[0], block: 4 }]
    };
    const result = playCard(
      state,
      { type: "playCard", cardInstanceId: cardInstanceId("strike:1"), targetId },
      starterRegistry,
      createRng("blocked")
    );

    expect(result.ok).toBe(true);
    expect(result.state.monsters[0].hp).toBe(20);
    expect(result.state.monsters[0].block).toBe(0);
    expect(result.events.find((event) => event.type === "DamageDealt")).toMatchObject({
      amount: 2,
      blocked: 4
    });
  });

  it("emits CombatantDefeated when damage reduces a monster to zero hp", () => {
    const baseState = createHandTunedCombatFixture();
    const state = {
      ...baseState,
      monsters: [{ ...baseState.monsters[0], hp: 4 }]
    };
    const result = playCard(
      state,
      { type: "playCard", cardInstanceId: cardInstanceId("strike:1"), targetId },
      starterRegistry,
      createRng("defeat")
    );

    expect(result.ok).toBe(true);
    expect(result.state.monsters[0].alive).toBe(false);
    expect(result.events.map((event) => event.type)).toEqual([
      "CardPlayed",
      "EnergySpent",
      "DamageDealt",
      "CombatantDefeated",
      "CombatEnded",
      "CardMoved"
    ]);
  });

  it("does not reject later target effects when an earlier effect defeats the target", () => {
    const baseState = createHandTunedCombatFixture();
    const state = {
      ...baseState,
      monsters: [{ ...baseState.monsters[0], hp: 4 }]
    };
    const registry = {
      ...starterRegistry,
      cards: starterRegistry.cards.map((card) =>
        card.id === cardId("strike")
          ? {
              ...card,
              effects: [
                { type: "damage" as const, amount: 6, target: { type: "target" as const } },
                { type: "applyStatus" as const, statusId: statusId("burn"), stacks: 1, target: { type: "target" as const } }
              ]
            }
          : card
      )
    };
    const result = playCard(
      state,
      { type: "playCard", cardInstanceId: cardInstanceId("strike:1"), targetId },
      registry,
      createRng("lethal-follow-up")
    );

    expect(result.ok).toBe(true);
    expect(result.state.monsters[0].alive).toBe(false);
    expect(result.events.map((event) => event.type)).toEqual([
      "CardPlayed",
      "EnergySpent",
      "DamageDealt",
      "CombatantDefeated",
      "CombatEnded",
      "CardMoved"
    ]);
  });
});
