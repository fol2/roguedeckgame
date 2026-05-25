import { describe, expect, it } from "vitest";
import {
  cardInstanceId,
  combatantId,
  createRng,
  playCard,
  resolveEnemyTurn,
  startPlayerTurn,
  starterRegistry
} from "../../src/game-core";
import {
  createForcedIntentCombatFixture,
  createHandTunedCombatFixture,
  createNearlyDeadMonsterFixture,
  createNearlyDeadPlayerFixture
} from "../../src/game-core/testing/combat-fixtures";

describe("combat outcomes", () => {
  it("playing Strike that defeats the final monster sets phase to won", () => {
    const state = createNearlyDeadMonsterFixture();
    const result = playCard(
      state,
      { type: "playCard", cardInstanceId: cardInstanceId("strike:1"), targetId: combatantId("monster:training_slime:0") },
      starterRegistry,
      createRng("strike-win")
    );

    expect(result.ok).toBe(true);
    expect(result.state.phase).toBe("won");
    expect(result.events.map((event) => event.type)).toEqual([
      "CardPlayed",
      "EnergySpent",
      "DamageDealt",
      "CombatantDefeated",
      "CombatEnded",
      "CardMoved"
    ]);
  });

  it("playing Fox Bite that defeats the final monster sets phase to won", () => {
    const baseState = createHandTunedCombatFixture();
    const state = {
      ...baseState,
      monsters: [{ ...baseState.monsters[0], hp: 5 }]
    };
    const result = playCard(
      state,
      { type: "playCard", cardInstanceId: cardInstanceId("fox_bite:1"), targetId: combatantId("monster:training_slime:0") },
      starterRegistry,
      createRng("fox-win")
    );

    expect(result.ok).toBe(true);
    expect(result.state.phase).toBe("won");
    expect(result.events.some((event) => event.type === "CombatEnded" && event.outcome === "won")).toBe(true);
  });

  it("enemy attack that defeats the player sets phase to lost", () => {
    const state = createNearlyDeadPlayerFixture();
    const result = resolveEnemyTurn(state, starterRegistry, createRng("enemy-win"));

    expect(result.ok).toBe(true);
    expect(result.state.phase).toBe("lost");
    expect(result.state.player.alive).toBe(false);
    expect(result.events.map((event) => event.type)).toEqual([
      "MonsterIntentResolved",
      "DamageDealt",
      "CombatantDefeated",
      "CombatEnded"
    ]);
    expect(result.events.at(-1)).toEqual({ type: "CombatEnded", outcome: "lost" });
  });

  it("does not start a further turn after won or lost", () => {
    const wonState = { ...createForcedIntentCombatFixture(), phase: "won" as const };
    const lostState = { ...createForcedIntentCombatFixture(), phase: "lost" as const };

    const wonResult = startPlayerTurn(wonState, createRng("won"));
    const lostResult = startPlayerTurn(lostState, createRng("lost"));

    expect(wonResult.ok).toBe(false);
    expect(lostResult.ok).toBe(false);
    expect(wonResult.state).toBe(wonState);
    expect(lostResult.state).toBe(lostState);
    expect(wonResult.errors.map((combatError) => combatError.code)).toEqual(["combat_already_ended"]);
    expect(lostResult.errors.map((combatError) => combatError.code)).toEqual(["combat_already_ended"]);
  });

  it("playCard rejects if combat is already won or lost", () => {
    const wonState = { ...createHandTunedCombatFixture(), phase: "won" as const };
    const lostState = { ...createHandTunedCombatFixture(), phase: "lost" as const };

    const wonResult = playCard(
      wonState,
      { type: "playCard", cardInstanceId: cardInstanceId("strike:1"), targetId: combatantId("monster:training_slime:0") },
      starterRegistry,
      createRng("won-card")
    );
    const lostResult = playCard(
      lostState,
      { type: "playCard", cardInstanceId: cardInstanceId("strike:1"), targetId: combatantId("monster:training_slime:0") },
      starterRegistry,
      createRng("lost-card")
    );

    expect(wonResult.ok).toBe(false);
    expect(lostResult.ok).toBe(false);
    expect(wonResult.state).toBe(wonState);
    expect(lostResult.state).toBe(lostState);
    expect(wonResult.errors.map((combatError) => combatError.code)).toEqual(["combat_already_ended"]);
    expect(lostResult.errors.map((combatError) => combatError.code)).toEqual(["combat_already_ended"]);
  });
});
