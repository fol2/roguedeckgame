import { describe, expect, it } from "vitest";
import {
  combatantId,
  createRng,
  endPlayerTurn,
  monsterAbilityId,
  monsterId,
  monsterIntentId,
  resolveEnemyTurn,
  starterRegistry,
  statusId
} from "../../src/game-core";
import {
  createCombatFixture,
  createForcedIntentCombatFixture,
  createHandTunedCombatFixture
} from "../../src/game-core/testing/combat-fixtures";

describe("enemy turn resolution", () => {
  it("endPlayerTurn sets phase to enemy_turn", () => {
    const result = endPlayerTurn(createHandTunedCombatFixture());

    expect(result.ok).toBe(true);
    expect(result.state.phase).toBe("enemy_turn");
  });

  it("rejects when resolving outside enemy_turn", () => {
    const state = createHandTunedCombatFixture();
    const result = resolveEnemyTurn(state, starterRegistry, createRng("wrong-phase"));

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["invalid_phase"]);
  });

  it("rejects with the original state when an alive monster has no selected intent", () => {
    const state = { ...createForcedIntentCombatFixture(), monsterIntents: [] };
    const before = JSON.parse(JSON.stringify(state));
    const result = resolveEnemyTurn(state, starterRegistry, createRng("missing-intent"));

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(JSON.parse(JSON.stringify(state))).toEqual(before);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["missing_monster_intent"]);
    expect(result.events.map((event) => event.type)).toEqual(["ActionRejected"]);
  });

  it("rejects with the original state when a registered intent has no planned ability", () => {
    const state = { ...createForcedIntentCombatFixture(), plannedMonsterAbilities: [] };
    const before = JSON.parse(JSON.stringify(state));
    const result = resolveEnemyTurn(state, starterRegistry, createRng("missing-planned-ability"));

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(JSON.parse(JSON.stringify(state))).toEqual(before);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["missing_planned_monster_ability"]);
    expect(result.events.map((event) => event.type)).toEqual(["ActionRejected"]);
  });

  it("resolves legacy combat state without planned ability storage", () => {
    const { plannedMonsterAbilities: _plannedMonsterAbilities, ...legacyState } = createForcedIntentCombatFixture();
    const state = legacyState as unknown as ReturnType<typeof createForcedIntentCombatFixture>;
    const result = resolveEnemyTurn(state, starterRegistry, createRng("legacy-missing-planned-ability"));

    expect(result.ok).toBe(true);
    expect(result.state.player.hp).toBe(64);
    expect(result.events.map((event) => event.type)).toContain("MonsterAbilityPlayed");
    expect(result.events.map((event) => event.type)).toContain("MonsterIntentResolved");
  });

  it("rejects with the original state when an intent pool is missing during resolution", () => {
    const registry = {
      ...starterRegistry,
      monsters: starterRegistry.monsters.map((monster) => {
        if (monster.id !== monsterId("training_slime")) {
          return monster;
        }

        const { intentPool: _intentPool, ...monsterWithoutIntentPool } = monster;
        return monsterWithoutIntentPool;
      })
    };
    const state = createForcedIntentCombatFixture(monsterIntentId("training_slime_attack"));
    const before = JSON.parse(JSON.stringify(state));
    const result = resolveEnemyTurn(state, registry as typeof starterRegistry, createRng("missing-pool-resolution"));

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(JSON.parse(JSON.stringify(state))).toEqual(before);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["missing_monster_intent_pool"]);
    expect(result.events.map((event) => event.type)).toEqual(["ActionRejected"]);
  });

  it("Training Slime attack intent damages the player", () => {
    const state = createForcedIntentCombatFixture(monsterIntentId("training_slime_attack"));
    const result = resolveEnemyTurn(state, starterRegistry, createRng("slime-attack"));

    expect(result.ok).toBe(true);
    expect(result.state.player.hp).toBe(64);
    expect(result.events.map((event) => event.type)).toContain("MonsterAbilityPlayed");
    expect(result.events.map((event) => event.type)).toContain("MonsterIntentResolved");
    expect(result.events).toContainEqual({
      type: "DamageDealt",
      sourceId: combatantId("monster:training_slime:0"),
      targetId: combatantId("player"),
      amount: 6,
      blocked: 0
    });
  });

  it("Training Slime block intent adds block to itself", () => {
    const state = createForcedIntentCombatFixture(monsterIntentId("training_slime_block"));
    const result = resolveEnemyTurn(state, starterRegistry, createRng("slime-block"));

    expect(result.ok).toBe(true);
    expect(result.state.monsters[0].block).toBe(5);
    expect(result.events).toContainEqual({
      type: "BlockGained",
      targetId: combatantId("monster:training_slime:0"),
      amount: 5,
      total: 5
    });
  });

  it("Ash Mite burn intent applies burn to the player and the next player turn ticks it", () => {
    const baseState = createCombatFixture({ monsterIds: [monsterId("ash_mite")] });
    const state = {
      ...baseState,
      phase: "enemy_turn" as const,
      hand: [],
      discardPile: [...baseState.discardPile, ...baseState.hand],
      energy: 0,
      monsterIntents: [
        {
          monsterCombatantId: baseState.monsters[0].id,
          intentId: monsterIntentId("ash_mite_burn")
        }
      ],
      plannedMonsterAbilities: [
        {
          monsterCombatantId: baseState.monsters[0].id,
          intentId: monsterIntentId("ash_mite_burn"),
          abilityId: monsterAbilityId("ash_mite_burn")
        }
      ],
      events: []
    };

    const result = resolveEnemyTurn(state, starterRegistry, createRng("ash-burn"));

    expect(result.ok).toBe(true);
    expect(result.events.map((event) => event.type)).toEqual(expect.arrayContaining(["StatusApplied", "StatusTicked", "StatusExpired"]));
    expect(result.state.player.hp).toBe(69);
    expect(result.state.player.statuses).toEqual([]);
  });

  it("returns to player_turn, resets energy, draws, and selects next intents when combat continues", () => {
    const state = createForcedIntentCombatFixture(monsterIntentId("training_slime_attack"));
    const result = resolveEnemyTurn(state, starterRegistry, createRng("continue"));

    expect(result.ok).toBe(true);
    expect(result.state.phase).toBe("player_turn");
    expect(result.state.energy).toBe(result.state.maxEnergy);
    expect(result.state.hand.length).toBeGreaterThan(0);
    expect(result.state.monsterIntents).toHaveLength(1);
    expect(result.state.plannedMonsterAbilities).toHaveLength(1);
    expect(result.events.map((event) => event.type)).toEqual(expect.arrayContaining(["MonsterAbilityPlanned", "MonsterIntentSet", "TurnStarted", "CardDrawn"]));
  });

  it("does not select next monster intents when player start-turn Burn ends combat", () => {
    const baseState = createForcedIntentCombatFixture(monsterIntentId("training_slime_block"));
    const state = {
      ...baseState,
      player: {
        ...baseState.player,
        hp: 1,
        statuses: [{ statusId: statusId("burn"), stacks: 1 }]
      }
    };
    const result = resolveEnemyTurn(state, starterRegistry, createRng("player-burn-loss"));

    expect(result.ok).toBe(true);
    expect(result.state.phase).toBe("lost");
    expect(result.state.monsterIntents).toEqual([]);
    expect(result.state.plannedMonsterAbilities).toEqual([]);
    expect(result.events.map((event) => event.type)).toEqual([
      "EnemyPlanFinalized",
      "MonsterAbilityPlayed",
      "MonsterIntentResolved",
      "BlockGained",
      "StatusTicked",
      "DamageDealt",
      "CombatantDefeated",
      "StatusExpired",
      "CombatEnded"
    ]);
    expect(result.events.some((event) => event.type === "MonsterIntentSet")).toBe(false);
  });
});
