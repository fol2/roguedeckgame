import { describe, expect, it } from "vitest";
import {
  chooseMonsterIntents,
  combatantId,
  createCombat,
  createRng,
  monsterAbilityId,
  monsterId,
  monsterIntentId,
  starterRegistry
} from "../../src/game-core";
import { createCombatFixture, createEnemyTurnFixture } from "../../src/game-core/testing/combat-fixtures";
import { createEmberFoxInstanceFixture, createRunFixture } from "../../src/game-core/testing/fixtures";

describe("monster intents", () => {
  it("createCombat sets one intent per alive monster", () => {
    const state = createCombatFixture({ monsterIds: [monsterId("training_slime"), monsterId("ash_mite")] });

    expect(state.monsterIntents).toHaveLength(2);
    expect(state.plannedMonsterAbilities).toHaveLength(2);
    expect(state.monsterIntents.map((intent) => intent.monsterCombatantId)).toEqual(
      state.monsters.map((monster) => monster.id)
    );
    expect((state.plannedMonsterAbilities ?? []).map((planned) => planned.monsterCombatantId)).toEqual(
      state.monsters.map((monster) => monster.id)
    );
  });

  it("selects intents deterministically for the same seed", () => {
    const state = createEnemyTurnFixture();
    const first = chooseMonsterIntents({ ...state, monsterIntents: [] }, starterRegistry, createRng("same-intent"));
    const second = chooseMonsterIntents({ ...state, monsterIntents: [] }, starterRegistry, createRng("same-intent"));

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(first.state.monsterIntents).toEqual(second.state.monsterIntents);
    expect(first.state.plannedMonsterAbilities).toEqual(second.state.plannedMonsterAbilities);
    expect(first.events).toEqual(second.events);
  });

  it("can select different intents for different seeds when the monster has multiple intents", () => {
    const state = createEnemyTurnFixture();
    const selectedIntentIds = new Set(
      ["intent-a", "intent-b", "intent-c", "intent-d", "intent-e"].map((seed) => {
        const result = chooseMonsterIntents({ ...state, monsterIntents: [] }, starterRegistry, createRng(seed));
        expect(result.ok).toBe(true);
        return result.state.monsterIntents[0].intentId;
      })
    );

    expect(selectedIntentIds.size).toBeGreaterThan(1);
  });

  it("does not select intents for defeated monsters", () => {
    const baseState = createEnemyTurnFixture();
    const state = {
      ...baseState,
      monsters: [{ ...baseState.monsters[0], hp: 0, alive: false }]
    };

    const result = chooseMonsterIntents(state, starterRegistry, createRng("defeated"));

    expect(result.ok).toBe(true);
    expect(result.state.monsterIntents).toEqual([]);
    expect(result.state.plannedMonsterAbilities).toEqual([]);
    expect(result.events).toEqual([]);
  });

  it("selects scheduled intents before falling back to random intent pools", () => {
    const state = { ...createEnemyTurnFixture(), monsterIntents: [], turnNumber: 1 };
    const registry = {
      ...starterRegistry,
      monsters: starterRegistry.monsters.map((monster) =>
        monster.id === monsterId("training_slime")
          ? {
              ...monster,
              intentSchedule: [
                { intentId: monster.intentPool[0].id },
                { intentId: monster.intentPool[1].id }
              ]
            }
          : monster
      )
    };
    const result = chooseMonsterIntents(state, registry, createRng("scheduled"));

    expect(result.ok).toBe(true);
    expect(result.state.monsterIntents[0].intentId).toBe(starterRegistry.monsters[0].intentPool[0].id);
  });

  it("uses conditional scheduled intents when their condition matches", () => {
    const baseState = createEnemyTurnFixture();
    const state = {
      ...baseState,
      monsterIntents: [],
      monsters: [{ ...baseState.monsters[0], hp: 5 }]
    };
    const registry = {
      ...starterRegistry,
      monsters: starterRegistry.monsters.map((monster) =>
        monster.id === monsterId("training_slime")
          ? {
              ...monster,
              intentSchedule: [
                {
                  intentId: monster.intentPool[1].id,
                  conditions: [{ type: "hpAtOrBelowRatio" as const, ratio: 0.25 }]
                },
                { intentId: monster.intentPool[0].id }
              ]
            }
          : monster
      )
    };
    const result = chooseMonsterIntents(state, registry, createRng("conditional-scheduled"));

    expect(result.ok).toBe(true);
    expect(result.state.monsterIntents[0].intentId).toBe(starterRegistry.monsters[0].intentPool[1].id);
  });

  it("returns ok false when a monster definition is missing", () => {
    const baseState = createEnemyTurnFixture();
    const state = {
      ...baseState,
      monsters: [{ ...baseState.monsters[0], definitionId: monsterId("missing_monster") }]
    };

    const result = chooseMonsterIntents(state, starterRegistry, createRng("missing-definition"));

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["missing_monster_definition"]);
    expect(result.events.map((event) => event.type)).toEqual(["ActionRejected"]);
  });

  it("returns ok false when an intent pool is empty", () => {
    const registry = {
      ...starterRegistry,
      monsters: starterRegistry.monsters.map((monster) =>
        monster.id === monsterId("training_slime") ? { ...monster, intentPool: [] } : monster
      )
    };
    const state = createEnemyTurnFixture();

    const result = chooseMonsterIntents(state, registry, createRng("empty-pool"));

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["empty_monster_intent_pool"]);
  });

  it("returns ok false when an intent pool is missing", () => {
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
    const state = createEnemyTurnFixture();

    const result = chooseMonsterIntents(state, registry as typeof starterRegistry, createRng("missing-pool"));

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["missing_monster_intent_pool"]);
    expect(result.events.map((event) => event.type)).toEqual(["ActionRejected"]);
  });

  it("returns ok false when a scheduled intent references a missing monster ability", () => {
    const registry = {
      ...starterRegistry,
      monsters: starterRegistry.monsters.map((monster) =>
        monster.id === monsterId("training_slime")
          ? {
              ...monster,
              intentPool: [
                {
                  ...monster.intentPool[0],
                  abilityId: monsterAbilityId("missing_training_slime_ability")
                }
              ]
            }
          : monster
      )
    };
    const state = { ...createEnemyTurnFixture(), monsterIntents: [], plannedMonsterAbilities: [] };
    const rng = createRng("missing-ability");
    const freshRng = createRng("missing-ability");

    const result = chooseMonsterIntents(state, registry, rng);

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["missing_monster_ability"]);
    expect(result.events.map((event) => event.type)).toEqual(["ActionRejected"]);
    expect(rng.nextInt(1_000_000)).toBe(freshRng.nextInt(1_000_000));
  });

  it("does not advance RNG when validation fails after an earlier alive monster", () => {
    const registry = {
      ...starterRegistry,
      monsters: starterRegistry.monsters.map((monster) => {
        if (monster.id !== monsterId("ash_mite")) {
          return monster;
        }

        return { ...monster, intentPool: [] };
      })
    };
    const state = {
      ...createEnemyTurnFixture(),
      monsters: [
        createEnemyTurnFixture().monsters[0],
        {
          id: combatantId("monster:ash_mite:1"),
          definitionId: monsterId("ash_mite"),
          name: "Ash Mite",
          type: "monster" as const,
          hp: 18,
          maxHp: 18,
          block: 0,
          statuses: [],
          alive: true
        }
      ],
      monsterIntents: []
    };
    const rng = createRng("failed-validation-does-not-advance");
    const freshRng = createRng("failed-validation-does-not-advance");

    const result = chooseMonsterIntents(state, registry, rng);

    expect(result.ok).toBe(false);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["empty_monster_intent_pool"]);
    expect(rng.nextInt(1_000_000)).toBe(freshRng.nextInt(1_000_000));
  });

  it("createCombat returns ok false when initial intent selection cannot choose an intent", () => {
    const registry = {
      ...starterRegistry,
      monsters: starterRegistry.monsters.map((monster) =>
        monster.id === monsterId("training_slime") ? { ...monster, intentPool: [] } : monster
      )
    };
    const result = createCombat({
      run: createRunFixture(),
      registry,
      petInstances: [createEmberFoxInstanceFixture()],
      monsterIds: [monsterId("training_slime")],
      seed: "creation-empty-pool"
    });

    expect(result.ok).toBe(false);
    expect(result.state.phase).toBe("not_started");
    expect(result.state.monsterIntents).toEqual([]);
    expect(result.state.plannedMonsterAbilities).toEqual([]);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["empty_monster_intent_pool"]);
  });

  it("emits planned ability events before MonsterIntentSet during combat creation", () => {
    const result = createCombat({
      run: createRunFixture(),
      registry: starterRegistry,
      petInstances: [createEmberFoxInstanceFixture()],
      monsterIds: [monsterId("training_slime")],
      seed: "creation-intents"
    });

    expect(result.ok).toBe(true);
    expect(result.events.some((event) => event.type === "MonsterAbilityPlanned")).toBe(true);
    expect(result.events.some((event) => event.type === "MonsterIntentSet")).toBe(true);
    expect(result.events.map((event) => event.type).slice(0, 5)).toEqual([
      "CombatStarted",
      "DeckShuffled",
      "MonsterAbilityPlanned",
      "MonsterIntentSet",
      "TurnStarted"
    ]);
  });

  it("keeps selected intents serializable and tied to combatant ids", () => {
    const state = createEnemyTurnFixture();
    const result = chooseMonsterIntents({ ...state, monsterIntents: [] }, starterRegistry, createRng("shape"));

    expect(result.state.monsterIntents).toEqual([
      {
        monsterCombatantId: combatantId("monster:training_slime:0"),
        intentId: expect.any(String)
      }
    ]);
    expect(result.state.plannedMonsterAbilities).toEqual([
      {
        monsterCombatantId: combatantId("monster:training_slime:0"),
        intentId: result.state.monsterIntents[0].intentId,
        abilityId: expect.any(String)
      }
    ]);
    expect(result.events[0]).toMatchObject({
      type: "MonsterAbilityPlanned",
      monsterId: combatantId("monster:training_slime:0"),
      abilityId: expect.any(String),
      intentId: expect.any(String),
      intentType: expect.any(String),
      description: expect.any(String)
    });
    expect(result.events[1]).toMatchObject({
      type: "MonsterIntentSet",
      monsterId: combatantId("monster:training_slime:0"),
      intentId: expect.any(String),
      intentType: expect.any(String),
      description: expect.any(String)
    });
    expect(result.state.monsterIntents[0].intentId).not.toBe(monsterIntentId("missing"));
  });

  it("keeps planned monster ability event order stable for planned-card UI playback", () => {
    const state = createEnemyTurnFixture();
    const result = chooseMonsterIntents({ ...state, monsterIntents: [] }, starterRegistry, createRng("planned-card-order"));

    expect(result.ok).toBe(true);
    expect(result.events.map((event) => event.type)).toEqual([
      "MonsterAbilityPlanned",
      "MonsterIntentSet"
    ]);
    expect(result.events[0]).toMatchObject({
      type: "MonsterAbilityPlanned",
      monsterId: result.state.monsterIntents[0].monsterCombatantId,
      abilityId: result.state.plannedMonsterAbilities![0].abilityId,
      intentId: result.state.monsterIntents[0].intentId
    });
    expect(result.events[1]).toMatchObject({
      type: "MonsterIntentSet",
      monsterId: result.state.monsterIntents[0].monsterCombatantId,
      intentId: result.state.monsterIntents[0].intentId
    });
  });
});
