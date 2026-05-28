import { describe, expect, it } from "vitest";
import {
  chooseMonsterIntents,
  combatantId,
  createCombat,
  createRng,
  discardPlannedMonsterCard,
  enemyCardInstanceId,
  monsterAbilityId,
  monsterId,
  monsterIntentId,
  resolveEffectiveIntentVisibilityLevel,
  resolveEnemyTurn,
  starterRegistry
} from "../../src/game-core";
import { createCombatFixture, createEnemyTurnFixture } from "../../src/game-core/testing/combat-fixtures";
import { createEmberFoxInstanceFixture, createRunFixture } from "../../src/game-core/testing/fixtures";

describe("monster intents", () => {
  it("createCombat sets one intent per alive monster", () => {
    const state = createCombatFixture({ monsterIds: [monsterId("training_slime"), monsterId("ash_mite")] });

    expect(state.monsterIntents).toHaveLength(2);
    expect(state.plannedMonsterAbilities).toHaveLength(2);
    expect(state.monsterCardStates).toHaveLength(2);
    expect(state.monsterIntents.map((intent) => intent.monsterCombatantId)).toEqual(
      state.monsters.map((monster) => monster.id)
    );
    expect((state.plannedMonsterAbilities ?? []).map((planned) => planned.monsterCombatantId)).toEqual(
      state.monsters.map((monster) => monster.id)
    );
  });

  it("initialises enemy card-game zones from authored deck copies", () => {
    const state = createCombatFixture({ monsterIds: [monsterId("training_slime")] });
    const cardState = state.monsterCardStates?.[0];
    const plannedCardInstanceId = cardState?.planned.lockedCardInstanceId;
    const plannedAbilityId = cardState?.cardInstances.find((cardInstance) =>
      cardInstance.id === plannedCardInstanceId
    )?.abilityId;

    expect(cardState).toMatchObject({
      monsterCombatantId: combatantId("monster:training_slime:0"),
      planned: expect.objectContaining({
        planMode: "locked",
        lockedCardInstanceId: expect.any(String)
      })
    });
    expect(plannedAbilityId).toBe(state.plannedMonsterAbilities?.[0]?.abilityId);
    expect(cardState?.cardInstances.filter((cardInstance) => cardInstance.abilityId === monsterAbilityId("training_slime_attack"))).toHaveLength(2);
    expect(cardState?.cardInstances.filter((cardInstance) => cardInstance.abilityId === monsterAbilityId("training_slime_block"))).toHaveLength(1);
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

  it("plans from the enemy card-game hand rather than uniformly from the intent pool", () => {
    const state = {
      ...createEnemyTurnFixture(),
      monsterIntents: [],
      plannedMonsterAbilities: [],
      monsterCardStates: [{
        monsterCombatantId: combatantId("monster:training_slime:0"),
        handSize: 1,
        planSlots: 1,
        cardInstances: [{
          id: enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_block:0"),
          abilityId: monsterAbilityId("training_slime_block")
        }],
        drawPile: [enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_block:0")],
        hand: [],
        planned: { planMode: "locked" as const, candidateCardInstanceIds: [] },
        discardPile: [],
        exhaustPile: []
      }]
    };
    const result = chooseMonsterIntents(state, starterRegistry, createRng("enemy-card-hand"));

    expect(result.ok).toBe(true);
    expect(result.state.plannedMonsterAbilities?.[0]).toMatchObject({
      abilityId: monsterAbilityId("training_slime_block")
    });
    expect(result.state.monsterCardStates?.[0]).toMatchObject({
      drawPile: [],
      hand: [],
      planned: {
        lockedCardInstanceId: enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_block:0"),
        candidateCardInstanceIds: []
      }
    });
  });

  it("moves played enemy planned cards to the monster discard pile", () => {
    const state = {
      ...createEnemyTurnFixture(),
      monsterCardStates: [{
        monsterCombatantId: combatantId("monster:training_slime:0"),
        handSize: 1,
        planSlots: 1,
        cardInstances: [
          {
            id: enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_attack:0"),
            abilityId: monsterAbilityId("training_slime_attack")
          },
          {
            id: enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_block:0"),
            abilityId: monsterAbilityId("training_slime_block")
          }
        ],
        drawPile: [],
        hand: [],
        planned: {
          planMode: "locked" as const,
          lockedCardInstanceId: enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_attack:0"),
          candidateCardInstanceIds: []
        },
        discardPile: [enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_block:0")],
        exhaustPile: []
      }]
    };

    expect(discardPlannedMonsterCard(state, combatantId("monster:training_slime:0")).monsterCardStates?.[0]).toMatchObject({
      planned: { candidateCardInstanceIds: [] },
      discardPile: [
        enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_block:0"),
        enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_attack:0")
      ]
    });
    expect(discardPlannedMonsterCard(state, combatantId("monster:training_slime:0")).monsterCardStates?.[0]?.planned.lockedCardInstanceId).toBeUndefined();
  });

  it("removes scheduled enemy card plans from their current card zone", () => {
    const attackInstanceId = enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_attack:0");
    const blockInstanceId = enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_block:0");
    const state = {
      ...createEnemyTurnFixture(),
      monsterIntents: [],
      plannedMonsterAbilities: [],
      monsterCardStates: [{
        monsterCombatantId: combatantId("monster:training_slime:0"),
        handSize: 2,
        planSlots: 1,
        cardInstances: [
          { id: attackInstanceId, abilityId: monsterAbilityId("training_slime_attack") },
          { id: blockInstanceId, abilityId: monsterAbilityId("training_slime_block") }
        ],
        drawPile: [blockInstanceId],
        hand: [attackInstanceId],
        planned: { planMode: "locked" as const, candidateCardInstanceIds: [] },
        discardPile: [],
        exhaustPile: []
      }]
    };
    const registry = {
      ...starterRegistry,
      monsters: starterRegistry.monsters.map((monster) =>
        monster.id === monsterId("training_slime")
          ? {
              ...monster,
              intentSchedule: [{ intentId: monsterIntentId("training_slime_block") }]
            }
          : monster
      )
    };
    const result = chooseMonsterIntents(state, registry, createRng("scheduled-card-zone"));

    expect(result.ok).toBe(true);
    expect(result.state.monsterCardStates?.[0]).toMatchObject({
      drawPile: [],
      hand: [attackInstanceId],
      planned: {
        lockedCardInstanceId: blockInstanceId,
        candidateCardInstanceIds: []
      }
    });
  });

  it("uses adaptive plan slots as planned card candidates without duplicating zones", () => {
    const attackInstanceId = enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_attack:0");
    const blockInstanceId = enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_block:0");
    const state = {
      ...createEnemyTurnFixture(),
      monsterIntents: [],
      plannedMonsterAbilities: [],
      monsterCardStates: [{
        monsterCombatantId: combatantId("monster:training_slime:0"),
        handSize: 2,
        planSlots: 2,
        cardInstances: [
          { id: attackInstanceId, abilityId: monsterAbilityId("training_slime_attack") },
          { id: blockInstanceId, abilityId: monsterAbilityId("training_slime_block") }
        ],
        drawPile: [],
        hand: [attackInstanceId, blockInstanceId],
        planned: { planMode: "adaptive" as const, candidateCardInstanceIds: [] },
        discardPile: [],
        exhaustPile: []
      }]
    };
    const registry = {
      ...starterRegistry,
      monsterAbilities: (starterRegistry.monsterAbilities ?? []).map((ability) =>
        ability.id === monsterAbilityId("training_slime_attack") ||
        ability.id === monsterAbilityId("training_slime_block")
          ? { ...ability, planMode: "adaptive" as const }
          : ability
      ),
      monsters: starterRegistry.monsters.map((monster) =>
        monster.id === monsterId("training_slime")
          ? {
              ...monster,
              cardGame: monster.cardGame
                ? {
                    ...monster.cardGame,
                    handSize: 2,
                    planSlots: 2,
                    defaultPlanMode: "adaptive" as const
                  }
                : monster.cardGame
            }
          : monster
      )
    };
    const result = chooseMonsterIntents(state, registry, createRng("adaptive-card-zone"));
    const cardState = result.state.monsterCardStates?.[0];
    const plannedCardInstanceIds = [
      cardState?.planned.lockedCardInstanceId,
      ...(cardState?.planned.candidateCardInstanceIds ?? [])
    ];

    expect(result.ok).toBe(true);
    expect(cardState?.planned).toMatchObject({
      planMode: "adaptive",
      lockedCardInstanceId: expect.any(String),
      candidateCardInstanceIds: [expect.any(String)]
    });
    expect(new Set(plannedCardInstanceIds)).toEqual(new Set([attackInstanceId, blockInstanceId]));
    expect(cardState?.hand).toEqual([]);
    expect(cardState?.drawPile).toEqual([]);
    expect(cardState?.discardPile).toEqual([]);
  });

  it("uses ability-level charging plan mode in the planned enemy card state", () => {
    const attackInstanceId = enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_attack:0");
    const blockInstanceId = enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_block:0");
    const state = {
      ...createEnemyTurnFixture(),
      monsterIntents: [],
      plannedMonsterAbilities: [],
      monsterCardStates: [{
        monsterCombatantId: combatantId("monster:training_slime:0"),
        handSize: 2,
        planSlots: 2,
        cardInstances: [
          { id: attackInstanceId, abilityId: monsterAbilityId("training_slime_attack") },
          { id: blockInstanceId, abilityId: monsterAbilityId("training_slime_block") }
        ],
        drawPile: [],
        hand: [attackInstanceId, blockInstanceId],
        planned: { planMode: "adaptive" as const, candidateCardInstanceIds: [] },
        discardPile: [],
        exhaustPile: []
      }]
    };
    const registry = {
      ...starterRegistry,
      monsterAbilities: (starterRegistry.monsterAbilities ?? []).map((ability) =>
        ability.id === monsterAbilityId("training_slime_block")
          ? { ...ability, planMode: "charging" as const }
          : ability
      ),
      monsters: starterRegistry.monsters.map((monster) =>
        monster.id === monsterId("training_slime")
          ? {
              ...monster,
              intentSchedule: [{ intentId: monsterIntentId("training_slime_block") }],
              cardGame: monster.cardGame
                ? {
                    ...monster.cardGame,
                    handSize: 2,
                    planSlots: 2,
                    defaultPlanMode: "adaptive" as const
                  }
                : monster.cardGame
            }
          : monster
      )
    };
    const result = chooseMonsterIntents(state, registry, createRng("charging-card-zone"));

    expect(result.ok).toBe(true);
    expect(result.state.monsterCardStates?.[0]).toMatchObject({
      hand: [],
      planned: {
        planMode: "charging",
        lockedCardInstanceId: blockInstanceId,
        candidateCardInstanceIds: [attackInstanceId]
      }
    });
  });

  it("authored adaptive enemies respect one-slot contract plans", () => {
    const state = createCombatFixture({ monsterIds: [monsterId("charred_stag")] });
    const cardState = state.monsterCardStates?.[0];

    expect(["adaptive", "charging"]).toContain(cardState?.planned.planMode);
    expect(cardState?.planned.lockedCardInstanceId).toEqual(expect.any(String));
    expect(cardState?.planned.candidateCardInstanceIds).toHaveLength(0);
    expect(cardState?.hand).toHaveLength(1);
  });

  it("authored charging enemy abilities enter charging plan state", () => {
    const baseState = createCombatFixture({ monsterIds: [monsterId("charred_stag")] });
    const state = {
      ...baseState,
      monsterIntents: [],
      plannedMonsterAbilities: []
    };
    const registry = {
      ...starterRegistry,
      monsters: starterRegistry.monsters.map((monster) =>
        monster.id === monsterId("charred_stag")
          ? {
              ...monster,
              intentSchedule: [{ intentId: monsterIntentId("charred_stag_paw_the_ash") }]
            }
          : monster
      )
    };
    const result = chooseMonsterIntents(state, registry, createRng("authored-charging-plan"));

    expect(result.ok).toBe(true);
    expect(result.state.monsterCardStates?.[0]?.planned).toMatchObject({
      planMode: "charging",
      lockedCardInstanceId: expect.any(String),
      candidateCardInstanceIds: []
    });
  });

  it("finalises adaptive enemy plans only inside authored candidate cards", () => {
    const attackInstanceId = enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_attack:0");
    const blockInstanceId = enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_block:0");
    const baseState = createEnemyTurnFixture();
    const state = {
      ...baseState,
      player: { ...baseState.player, block: 8 },
      monsterIntents: [{
        monsterCombatantId: combatantId("monster:training_slime:0"),
        intentId: monsterIntentId("training_slime_attack")
      }],
      plannedMonsterAbilities: [{
        monsterCombatantId: combatantId("monster:training_slime:0"),
        intentId: monsterIntentId("training_slime_attack"),
        abilityId: monsterAbilityId("training_slime_attack"),
        cardInstanceId: attackInstanceId,
        planMode: "adaptive" as const
      }],
      monsterCardStates: [{
        monsterCombatantId: combatantId("monster:training_slime:0"),
        handSize: 2,
        planSlots: 2,
        cardInstances: [
          { id: attackInstanceId, abilityId: monsterAbilityId("training_slime_attack") },
          { id: blockInstanceId, abilityId: monsterAbilityId("training_slime_block") }
        ],
        drawPile: [],
        hand: [],
        planned: {
          planMode: "adaptive" as const,
          lockedCardInstanceId: attackInstanceId,
          candidateCardInstanceIds: [blockInstanceId]
        },
        discardPile: [],
        exhaustPile: []
      }]
    };
    const registry = {
      ...starterRegistry,
      monsterAbilities: (starterRegistry.monsterAbilities ?? []).map((ability) =>
        ability.id === monsterAbilityId("training_slime_attack") ||
        ability.id === monsterAbilityId("training_slime_block")
          ? { ...ability, planMode: "adaptive" as const }
          : ability
      ),
      monsters: starterRegistry.monsters.map((monster) =>
        monster.id === monsterId("training_slime")
          ? {
              ...monster,
              cardGame: monster.cardGame
                ? {
                    ...monster.cardGame,
                    defaultPlanMode: "adaptive" as const,
                    adaptiveRuleIds: ["prefer_guard_if_player_overblocks"]
                  }
                : monster.cardGame
            }
          : monster
      )
    };

    const result = resolveEnemyTurn(state, registry, createRng("adaptive-finalise"));

    expect(result.ok).toBe(true);
    expect(result.events).toContainEqual(expect.objectContaining({
      type: "EnemyPlanChanged",
      fromAbilityId: monsterAbilityId("training_slime_attack"),
      toAbilityId: monsterAbilityId("training_slime_block"),
      reason: "prefer_guard_if_player_overblocks"
    }));
    expect(result.events).toContainEqual(expect.objectContaining({
      type: "MonsterAbilityPlayed",
      abilityId: monsterAbilityId("training_slime_block")
    }));
    expect([monsterAbilityId("training_slime_attack"), monsterAbilityId("training_slime_block")]).toContain(
      (result.events.find((event) => event.type === "MonsterAbilityPlayed") as { abilityId?: unknown } | undefined)?.abilityId
    );
  });

  it("rejects adaptive enemy plans whose stored action is outside the candidate set", () => {
    const attackInstanceId = enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_attack:0");
    const blockInstanceId = enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_block:0");
    const baseState = createEnemyTurnFixture();
    const state = {
      ...baseState,
      player: { ...baseState.player, block: 8 },
      monsterIntents: [{
        monsterCombatantId: combatantId("monster:training_slime:0"),
        intentId: monsterIntentId("training_slime_attack")
      }],
      plannedMonsterAbilities: [{
        monsterCombatantId: combatantId("monster:training_slime:0"),
        intentId: monsterIntentId("training_slime_attack"),
        abilityId: monsterAbilityId("training_slime_attack"),
        cardInstanceId: attackInstanceId,
        planMode: "adaptive" as const
      }],
      monsterCardStates: [{
        monsterCombatantId: combatantId("monster:training_slime:0"),
        handSize: 2,
        planSlots: 1,
        cardInstances: [
          { id: attackInstanceId, abilityId: monsterAbilityId("training_slime_attack") },
          { id: blockInstanceId, abilityId: monsterAbilityId("training_slime_block") }
        ],
        drawPile: [],
        hand: [],
        planned: {
          planMode: "adaptive" as const,
          lockedCardInstanceId: undefined,
          candidateCardInstanceIds: [blockInstanceId]
        },
        discardPile: [],
        exhaustPile: []
      }]
    };
    const registry = {
      ...starterRegistry,
      monsterAbilities: (starterRegistry.monsterAbilities ?? []).map((ability) =>
        ability.id === monsterAbilityId("training_slime_attack") ||
        ability.id === monsterAbilityId("training_slime_block")
          ? { ...ability, planMode: "adaptive" as const }
          : ability
      ),
      monsters: starterRegistry.monsters.map((monster) =>
        monster.id === monsterId("training_slime")
          ? {
              ...monster,
              cardGame: monster.cardGame
                ? {
                    ...monster.cardGame,
                    defaultPlanMode: "adaptive" as const,
                    adaptiveRuleIds: ["prefer_guard_if_player_overblocks"]
                  }
                : monster.cardGame
            }
          : monster
      )
    };

    const result = resolveEnemyTurn(state, registry, createRng("adaptive-outside-candidates"));

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toEqual(["adaptive_plan_outside_candidate_set"]);
    expect(result.events).toEqual([expect.objectContaining({
      type: "ActionRejected",
      code: "adaptive_plan_outside_candidate_set"
    })]);
  });

  it("runs authored enemy obscure effects and caps current intent visibility", () => {
    const combat = createCombatFixture({ monsterIds: [monsterId("cinder_scribe")], seed: "cinder-obscure-runtime" });
    const scribeId = combatantId("monster:cinder_scribe:0");
    const smudgeCardId = combat.monsterCardStates?.[0]?.cardInstances.find((cardInstance) =>
      cardInstance.abilityId === monsterAbilityId("cinder_scribe_smudge")
    )?.id;

    expect(smudgeCardId).toBeDefined();

    const state = {
      ...combat,
      phase: "enemy_turn" as const,
      activeActorId: scribeId,
      intentVisibilityOverrides: [{
        monsterCombatantId: scribeId,
        level: "exact" as const,
        source: "debug" as const,
        expires: "never" as const,
        mode: "floor" as const
      }],
      monsterIntents: [{
        monsterCombatantId: scribeId,
        intentId: monsterIntentId("cinder_scribe_smudge")
      }],
      plannedMonsterAbilities: [{
        monsterCombatantId: scribeId,
        intentId: monsterIntentId("cinder_scribe_smudge"),
        abilityId: monsterAbilityId("cinder_scribe_smudge"),
        cardInstanceId: smudgeCardId,
        planMode: "locked" as const
      }],
      monsterCardStates: combat.monsterCardStates?.map((cardState) =>
        cardState.monsterCombatantId === scribeId
          ? {
              ...cardState,
              planned: {
                planMode: "locked" as const,
                lockedCardInstanceId: smudgeCardId,
                candidateCardInstanceIds: []
              }
            }
          : cardState
      )
    };

    const result = resolveEnemyTurn(state, starterRegistry, createRng("cinder-obscure-runtime"));
    const monsterDefinition = starterRegistry.monsters.find((monster) => monster.id === monsterId("cinder_scribe"));

    expect(result.ok).toBe(true);
    expect(result.events).toContainEqual(expect.objectContaining({
      type: "EnemyIntentVisibilityChanged",
      monsterId: scribeId,
      level: "scoped",
      source: "enemyObscure",
      mode: "ceiling"
    }));
    expect(resolveEffectiveIntentVisibilityLevel({
      state: result.state,
      registry: starterRegistry,
      monsterCombatantId: scribeId,
      monsterDefinition
    })).toBe("scoped");
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

  it("emits enemy card lifecycle events before MonsterIntentSet during combat creation", () => {
    const result = createCombat({
      run: createRunFixture(),
      registry: starterRegistry,
      petInstances: [createEmberFoxInstanceFixture()],
      monsterIds: [monsterId("training_slime")],
      seed: "creation-intents"
    });

    expect(result.ok).toBe(true);
    expect(result.events.some((event) => event.type === "EnemyCardMoved")).toBe(true);
    expect(result.events.some((event) => event.type === "EnemyPlanCreated")).toBe(true);
    expect(result.events.some((event) => event.type === "MonsterAbilityPlanned")).toBe(true);
    expect(result.events.some((event) => event.type === "MonsterIntentSet")).toBe(true);
    expect(result.events.map((event) => event.type).indexOf("EnemyPlanCreated")).toBeLessThan(
      result.events.map((event) => event.type).indexOf("MonsterAbilityPlanned")
    );
    expect(result.events.map((event) => event.type).indexOf("MonsterAbilityPlanned")).toBeLessThan(
      result.events.map((event) => event.type).indexOf("MonsterIntentSet")
    );
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
      expect.objectContaining({
        monsterCombatantId: combatantId("monster:training_slime:0"),
        intentId: result.state.monsterIntents[0].intentId,
        abilityId: expect.any(String),
        cardInstanceId: expect.any(String),
        planMode: expect.any(String)
      })
    ]);
    expect(result.events).toContainEqual(expect.objectContaining({
      type: "MonsterAbilityPlanned",
      monsterId: combatantId("monster:training_slime:0"),
      abilityId: expect.any(String),
      intentId: expect.any(String),
      intentType: expect.any(String),
      description: expect.any(String)
    }));
    expect(result.events).toContainEqual(expect.objectContaining({
      type: "MonsterIntentSet",
      monsterId: combatantId("monster:training_slime:0"),
      intentId: expect.any(String),
      intentType: expect.any(String),
      description: expect.any(String)
    }));
    expect(result.state.monsterIntents[0].intentId).not.toBe(monsterIntentId("missing"));
  });

  it("keeps planned enemy card lifecycle order stable for planned-card UI playback", () => {
    const state = createEnemyTurnFixture();
    const result = chooseMonsterIntents({ ...state, monsterIntents: [] }, starterRegistry, createRng("planned-card-order"));

    expect(result.ok).toBe(true);
    expect(result.events.map((event) => event.type)).toEqual([
      "EnemyDeckShuffled",
      "EnemyCardMoved",
      "EnemyCardMoved",
      "EnemyPlanCreated",
      "MonsterAbilityPlanned",
      "MonsterIntentSet"
    ]);
    expect(result.events[3]).toMatchObject({
      type: "EnemyPlanCreated",
      monsterId: result.state.monsterIntents[0].monsterCombatantId,
      abilityId: result.state.plannedMonsterAbilities![0].abilityId,
      intentId: result.state.monsterIntents[0].intentId
    });
    expect(result.events[4]).toMatchObject({
      type: "MonsterAbilityPlanned",
      monsterId: result.state.monsterIntents[0].monsterCombatantId,
      abilityId: result.state.plannedMonsterAbilities![0].abilityId,
      intentId: result.state.monsterIntents[0].intentId
    });
    expect(result.events[5]).toMatchObject({
      type: "MonsterIntentSet",
      monsterId: result.state.monsterIntents[0].monsterCombatantId,
      intentId: result.state.monsterIntents[0].intentId
    });
  });
});
