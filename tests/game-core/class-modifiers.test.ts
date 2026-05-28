import { describe, expect, it } from "vitest";
import {
  cardInstanceId,
  createRng,
  playCard,
  playerClassModifierId,
  starterRegistry
} from "../../src/game-core";
import { createHandTunedCombatFixture, withPlayerCardActorState } from "../../src/game-core/testing/combat-fixtures";

describe("player class modifiers", () => {
  it("resolves class passive triggers through the trigger queue", () => {
    const registry = {
      ...starterRegistry,
      playerClassModifiers: [
        {
          id: playerClassModifierId("attack_focus"),
          name: "Attack Focus",
          description: "Regain energy after playing an attack.",
          tags: ["energy"],
          rules: [
            {
              type: "triggerOnCardPlayed" as const,
              selector: { tagsAny: ["attack"] },
              effects: [{ type: "gainEnergy" as const, amount: 1 }]
            }
          ]
        }
      ],
      players: starterRegistry.players.map((player) => ({
        ...player,
        classModifierIds: [playerClassModifierId("attack_focus")]
      }))
    };
    const result = playCard(
      createHandTunedCombatFixture(),
      {
        type: "playCard",
        cardInstanceId: cardInstanceId("strike:1"),
        targetId: createHandTunedCombatFixture().monsters[0].id
      },
      registry,
      createRng("class-trigger")
    );

    expect(result.ok).toBe(true);
    expect(result.state.energy).toBe(3);
    expect(result.events.map((event) => event.type)).toEqual([
      "CardPlayed",
      "EnergySpent",
      "DamageDealt",
      "PlayerClassModifierActivated",
      "EnergyGained",
      "CardMoved"
    ]);
  });

  it("respects class modifier trigger limits", () => {
    const registry = {
      ...starterRegistry,
      playerClassModifiers: [
        {
          id: playerClassModifierId("once_focus"),
          name: "Once Focus",
          description: "Regain energy once after playing an attack.",
          tags: ["energy"],
          rules: [
            {
              type: "triggerOnCardPlayed" as const,
              selector: { tagsAny: ["attack"] },
              effects: [{ type: "gainEnergy" as const, amount: 1 }],
              limit: { type: "oncePerCombat" as const }
            }
          ]
        }
      ],
      players: starterRegistry.players.map((player) => ({
        ...player,
        classModifierIds: [playerClassModifierId("once_focus")]
      }))
    };
    const initialState = createHandTunedCombatFixture();
    const first = playCard(
      initialState,
      { type: "playCard", cardInstanceId: cardInstanceId("strike:1"), targetId: initialState.monsters[0].id },
      registry,
      createRng("class-limit-1")
    );
    const secondState = withPlayerCardActorState(first.state, (actor) => ({
      ...actor,
      energy: 3,
      hand: [cardInstanceId("strike:2")],
      drawPile: []
    }));
    const second = playCard(
      secondState,
      { type: "playCard", cardInstanceId: cardInstanceId("strike:2"), targetId: secondState.monsters[0].id },
      registry,
      createRng("class-limit-2")
    );

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(second.state.energy).toBe(2);
    expect(second.events.map((event) => event.type)).not.toContain("PlayerClassModifierActivated");
  });
});
