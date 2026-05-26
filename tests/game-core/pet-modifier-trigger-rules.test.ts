import { describe, expect, it } from "vitest";
import { combatantId, statusId } from "../../src/game-core";
import { burnedEnemiesDefeatedByEvents, createTriggerWindow, petModifierTriggerMatches } from "../../src/game-core";
import type { TriggerOnEnemyDefeatedWithStatusRule } from "../../src/game-core";
import { createBurningMonsterFixture } from "../../src/game-core/testing/combat-fixtures";

const createTriggerRule = (): TriggerOnEnemyDefeatedWithStatusRule => ({
  type: "triggerOnEnemyDefeatedWithStatus",
  requiredStatusId: statusId("burn"),
  effects: [{ type: "draw", amount: 1 }]
});

describe("pet modifier trigger rules", () => {
  it("matches burned enemies defeated inside the effect event window", () => {
    const state = createBurningMonsterFixture(2);
    const defeatedId = state.monsters[0].id;
    const events = [
      { type: "DamageDealt" as const, sourceId: combatantId("player"), targetId: defeatedId, amount: 3, blocked: 0 },
      { type: "CombatantDefeated" as const, combatantId: defeatedId }
    ];

    expect(burnedEnemiesDefeatedByEvents(state, events, statusId("burn"))).toEqual([defeatedId]);
    expect(petModifierTriggerMatches(createTriggerRule(), {
      stateBeforeEffects: state,
      effectEvents: events
    })).toBe(true);
  });

  it("does not match when the required status expires before defeat", () => {
    const state = createBurningMonsterFixture(1);
    const defeatedId = state.monsters[0].id;
    const events = [
      { type: "StatusExpired" as const, targetId: defeatedId, statusId: statusId("burn") },
      { type: "CombatantDefeated" as const, combatantId: defeatedId }
    ];

    expect(burnedEnemiesDefeatedByEvents(state, events, statusId("burn"))).toEqual([]);
    expect(petModifierTriggerMatches(createTriggerRule(), {
      stateBeforeEffects: state,
      effectEvents: events
    })).toBe(false);
  });

  it("matches enemies that gain the required status during the same event window", () => {
    const baseState = createBurningMonsterFixture(0);
    const targetId = baseState.monsters[0].id;
    const state = {
      ...baseState,
      monsters: baseState.monsters.map((monster) => ({ ...monster, statuses: [] }))
    };
    const events = [
      { type: "StatusApplied" as const, targetId, statusId: statusId("burn"), stacks: 1 },
      { type: "CombatantDefeated" as const, combatantId: targetId }
    ];

    expect(burnedEnemiesDefeatedByEvents(state, events, statusId("burn"))).toEqual([targetId]);
  });

  it("creates trigger windows with explicit phase, outcome, and cascade policy", () => {
    const state = { ...createBurningMonsterFixture(1), phase: "player_turn" as const };
    const window = createTriggerWindow({
      stateBeforeEffects: state,
      stateAfterEffects: { ...state, phase: "won" },
      effectEvents: []
    });

    expect(window.phase).toBe("player_turn");
    expect(window.outcome).toBe("won");
    expect(window.cascadePolicy).toBe("none");
  });
});
