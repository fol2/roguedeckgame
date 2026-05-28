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
import { createCombatFixture, createEnemyTurnFixture, withEnemyCardActorState } from "../../src/game-core/testing/combat-fixtures";
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

  it("selects the same held-card plan across seeds when card state is unchanged", () => {
    const state = createEnemyTurnFixture();
    const selectedIntentIds = new Set(
      ["intent-a", "intent-b", "intent-c", "intent-d", "intent-e"].map((seed) => {
        const result = chooseMonsterIntents({ ...state, monsterIntents: [] }, starterRegistry, createRng(seed));
        expect(result.ok).toBe(true);
        return result.state.monsterIntents[0].intentId;
      })
    );

    expect(selectedIntentIds).toEqual(new Set([monsterIntentId("training_slime_block")]));
  });

  it("plans from the enemy card-game hand rather than uniformly from the intent pool", () => {
    const state = withEnemyActorZones({
      ...createEnemyTurnFixture(),
      monsterIntents: [],
      plannedMonsterAbilities: []
    }, {
      drawPile: [enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_block:0")],
      hand: [],
      planned: { planMode: "locked" as const, candidateCardInstanceIds: [] },
      discardPile: []
    });
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
    const state = withEnemyActorZones(createEnemyTurnFixture(), {
      drawPile: [],
      hand: [],
      planned: {
        planMode: "locked" as const,
        lockedCardInstanceId: enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_attack:0"),
        candidateCardInstanceIds: []
      },
      discardPile: [enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_block:0")]
    });

    expect(discardPlannedMonsterCard(state, combatantId("monster:training_slime:0")).monsterCardStates?.[0]).toMatchObject({
      planned: { candidateCardInstanceIds: [] },
      discardPile: [
        enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_block:0"),
        enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_attack:0")
      ]
    });
    expect(discardPlannedMonsterCard(state, combatantId("monster:training_slime:0")).monsterCardStates?.[0]?.planned.lockedCardInstanceId).toBeUndefined();
  });

  it("plans only from already-held enemy cards and ignores scheduled hidden-zone cards", () => {
    const attackInstanceId = enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_attack:0");
    const blockInstanceId = enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_block:0");
    const state = withEnemyActorZones({
      ...createEnemyTurnFixture(),
      monsterIntents: [],
      plannedMonsterAbilities: []
    }, {
      drawPile: [blockInstanceId],
      hand: [attackInstanceId],
      planned: { planMode: "locked" as const, candidateCardInstanceIds: [] },
      discardPile: []
    });
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
      hand: [blockInstanceId],
      planned: {
        lockedCardInstanceId: attackInstanceId,
        candidateCardInstanceIds: []
      }
    });
  });

  it("uses enemy Card Actors as authority when projected monster card state is stale", () => {
    const attackInstanceId = enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_attack:0");
    const blockInstanceId = enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_block:0");
    const authoritativeState = withEnemyActorZones({
      ...createEnemyTurnFixture(),
      monsterIntents: [],
      plannedMonsterAbilities: []
    }, {
      drawPile: [],
      hand: [blockInstanceId],
      planned: { planMode: "locked" as const, candidateCardInstanceIds: [] },
      discardPile: [attackInstanceId]
    });
    const state = {
      ...authoritativeState,
      monsterCardStates: authoritativeState.monsterCardStates?.map((cardState) => ({
        ...cardState,
        drawPile: [],
        hand: [attackInstanceId],
        planned: { planMode: "locked" as const, candidateCardInstanceIds: [] },
        discardPile: [blockInstanceId]
      }))
    };

    const result = chooseMonsterIntents(state, starterRegistry, createRng("enemy-actor-authority"));

    expect(result.ok).toBe(true);
    expect(result.state.monsterIntents[0].intentId).toBe(monsterIntentId("training_slime_block"));
    expect(result.state.monsterCardStates?.[0]).toMatchObject({
      hand: [attackInstanceId],
      discardPile: [],
      planned: {
        lockedCardInstanceId: blockInstanceId,
        candidateCardInstanceIds: []
      }
    });
  });

  it("uses adaptive plan slots as planned card candidates without duplicating zones", () => {
    const attackInstanceId = enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_attack:0");
    const blockInstanceId = enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_block:0");
    const state = withEnemyActorZones({
      ...createEnemyTurnFixture(),
      monsterIntents: [],
      plannedMonsterAbilities: []
    }, {
      drawPile: [],
      hand: [attackInstanceId, blockInstanceId],
      planned: { planMode: "adaptive" as const, candidateCardInstanceIds: [] },
      discardPile: [],
      maxEnergy: 2,
      energy: 2,
      energyRefill: 2
    });
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
                    maxEnergy: 2,
                    energyRefill: 2,
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
    const state = withEnemyActorZones({
      ...createEnemyTurnFixture(),
      monsterIntents: [],
      plannedMonsterAbilities: []
    }, {
      drawPile: [],
      hand: [attackInstanceId, blockInstanceId],
      planned: { planMode: "adaptive" as const, candidateCardInstanceIds: [] },
      discardPile: [],
      maxEnergy: 2,
      energy: 2,
      energyRefill: 2
    });
    const registry = {
      ...starterRegistry,
      monsterAbilities: (starterRegistry.monsterAbilities ?? []).map((ability) =>
        ability.id === monsterAbilityId("training_slime_attack")
          ? { ...ability, planMode: "charging" as const }
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
                    maxEnergy: 2,
                    energyRefill: 2,
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
        lockedCardInstanceId: attackInstanceId,
        candidateCardInstanceIds: [blockInstanceId]
      }
    });
  });

  it("draws only drawPerTurn for existing enemy card actors with empty hands", () => {
    const attackInstanceId = enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_attack:0");
    const blockInstanceId = enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_block:0");
    const state = withEnemyActorZones({
      ...createEnemyTurnFixture(),
      monsterIntents: [],
      plannedMonsterAbilities: []
    }, {
      drawPile: [attackInstanceId, blockInstanceId],
      hand: [],
      planned: { planMode: "locked" as const, candidateCardInstanceIds: [] },
      discardPile: []
    });

    const result = chooseMonsterIntents(state, starterRegistry, createRng("existing-empty-hand-draw"));

    expect(result.ok).toBe(true);
    expect(result.state.monsterCardStates?.[0]).toMatchObject({
      drawPile: [blockInstanceId],
      hand: [],
      planned: {
        lockedCardInstanceId: attackInstanceId,
        candidateCardInstanceIds: []
      }
    });
  });

  it("authored adaptive enemies expose multi-card contract plans", () => {
    const state = createCombatFixture({ monsterIds: [monsterId("charred_stag")] });
    const cardState = state.monsterCardStates?.[0];

    expect(["adaptive", "charging"]).toContain(cardState?.planned.planMode);
    expect(cardState?.planned.lockedCardInstanceId).toEqual(expect.any(String));
    expect(cardState?.planned.candidateCardInstanceIds.length ?? 0).toBeGreaterThan(0);
    expect(cardState?.hand.length ?? 0).toBeLessThan(4);
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
    const state = withEnemyActorZones({
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
      }]
    }, {
      drawPile: [],
      hand: [],
      planned: {
        planMode: "adaptive" as const,
        lockedCardInstanceId: attackInstanceId,
        candidateCardInstanceIds: [blockInstanceId]
      },
      discardPile: [],
      maxEnergy: 2,
      energy: 0,
      energyRefill: 2
    });
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

  it("executes each planned enemy card in sequence and discards only resolved cards", () => {
    const attackInstanceId = enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_attack:0");
    const blockInstanceId = enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_block:0");
    const baseState = createEnemyTurnFixture();
    const state = withEnemyActorZones({
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
      }]
    }, {
      drawPile: [],
      hand: [],
      planned: {
        planMode: "adaptive" as const,
        lockedCardInstanceId: attackInstanceId,
        candidateCardInstanceIds: [blockInstanceId]
      },
      discardPile: [],
      maxEnergy: 2,
      energy: 0,
      energyRefill: 2
    });
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
                    maxEnergy: 2,
                    energyRefill: 2,
                    defaultPlanMode: "adaptive" as const,
                    adaptiveRuleIds: ["prefer_guard_if_player_overblocks"]
                  }
                : monster.cardGame
            }
          : monster
      )
    };

    const result = resolveEnemyTurn(state, registry, createRng("sequence-execution"));

    expect(result.ok).toBe(true);
    expect(result.events.filter((event) => event.type === "MonsterAbilityPlayed").map((event) => event.abilityId)).toEqual([
      monsterAbilityId("training_slime_block"),
      monsterAbilityId("training_slime_attack")
    ]);
    expect(result.events.filter((event) => event.type === "EnemyCardResolved").map((event) => event.cardInstanceId)).toEqual([
      blockInstanceId,
      attackInstanceId
    ]);
    expect(result.state.monsterCardStates?.[0]?.planned).toMatchObject({ candidateCardInstanceIds: [] });
    expect(result.state.monsterCardStates?.[0]?.planned.lockedCardInstanceId).toBeDefined();
    const discardedEnemyCardIds = result.events.flatMap((event) =>
      event.type === "EnemyCardMoved" && event.to === "discard" ? [event.cardInstanceId] : []
    );
    expect(discardedEnemyCardIds).toEqual([blockInstanceId, attackInstanceId]);
  });

  it("rejects enemy planned sequences that exceed actor energy refill", () => {
    const attackInstanceId = enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_attack:0");
    const blockInstanceId = enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_block:0");
    const baseState = createEnemyTurnFixture();
    const state = withEnemyActorZones({
      ...baseState,
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
      }]
    }, {
      drawPile: [],
      hand: [],
      planned: {
        planMode: "adaptive" as const,
        lockedCardInstanceId: attackInstanceId,
        candidateCardInstanceIds: [blockInstanceId]
      },
      discardPile: [],
      maxEnergy: 1,
      energy: 0,
      energyRefill: 1
    });

    const result = resolveEnemyTurn(state, starterRegistry, createRng("sequence-energy-reject"));

    expect(result.ok).toBe(false);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["insufficient_enemy_energy"]);
  });

  it("ignores stale legacy adaptive plans outside the Card Actor candidate set", () => {
    const attackInstanceId = enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_attack:0");
    const blockInstanceId = enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_block:0");
    const baseState = createEnemyTurnFixture();
    const state = withEnemyActorZones({
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
      }]
    }, {
      drawPile: [],
      hand: [],
      planned: {
        planMode: "adaptive" as const,
        candidateCardInstanceIds: [blockInstanceId]
      },
      discardPile: []
    });
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

    expect(result.ok).toBe(true);
    expect(result.events).toContainEqual(expect.objectContaining({
      type: "MonsterAbilityPlayed",
      abilityId: monsterAbilityId("training_slime_block")
    }));
    expect(result.events).not.toContainEqual(expect.objectContaining({
      type: "ActionRejected"
    }));
  });

  it("runs authored enemy obscure effects and caps current intent visibility", () => {
    const combat = createCombatFixture({ monsterIds: [monsterId("cinder_scribe")], seed: "cinder-obscure-runtime" });
    const scribeId = combatantId("monster:cinder_scribe:0");
    const smudgeCardId = combat.monsterCardStates?.[0]?.cardInstances.find((cardInstance) =>
      cardInstance.abilityId === monsterAbilityId("cinder_scribe_smudge")
    )?.id;

    expect(smudgeCardId).toBeDefined();

    const state = withEnemyCardActorState({
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
    }, scribeId, (actor) => ({
      ...actor,
      drawPile: actor.drawPile.filter((cardInstanceId) => cardInstanceId !== smudgeCardId),
      hand: actor.hand.filter((cardInstanceId) => cardInstanceId !== smudgeCardId),
      planned: {
        planMode: "locked" as const,
        lockedCardInstanceId: smudgeCardId,
        candidateCardInstanceIds: []
      },
      discardPile: actor.discardPile.filter((cardInstanceId) => cardInstanceId !== smudgeCardId)
    }));

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

  it("does not use scheduled intents as the action source", () => {
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
    expect(result.state.monsterIntents[0].intentId).toBe(monsterIntentId("training_slime_block"));
  });

  it("does not let conditional scheduled intents override held Card Actor plans", () => {
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
    expect(result.state.monsterIntents[0].intentId).toBe(monsterIntentId("training_slime_block"));
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

  it("returns ok false when a card-backed intent references a missing monster ability", () => {
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
      "EnemyCardMoved",
      "EnemyCardMoved",
      "EnemyPlanCreated",
      "MonsterAbilityPlanned",
      "MonsterIntentSet"
    ]);
    expect(result.events.find((event) => event.type === "EnemyPlanCreated")).toMatchObject({
      type: "EnemyPlanCreated",
      monsterId: result.state.monsterIntents[0].monsterCombatantId,
      abilityId: result.state.plannedMonsterAbilities![0].abilityId,
      intentId: result.state.monsterIntents[0].intentId
    });
    expect(result.events.find((event) => event.type === "MonsterAbilityPlanned")).toMatchObject({
      type: "MonsterAbilityPlanned",
      monsterId: result.state.monsterIntents[0].monsterCombatantId,
      abilityId: result.state.plannedMonsterAbilities![0].abilityId,
      intentId: result.state.monsterIntents[0].intentId
    });
    expect(result.events.find((event) => event.type === "MonsterIntentSet")).toMatchObject({
      type: "MonsterIntentSet",
      monsterId: result.state.monsterIntents[0].monsterCombatantId,
      intentId: result.state.monsterIntents[0].intentId
    });
  });
});

type EnemyCardFixtureId = ReturnType<typeof enemyCardInstanceId>;

const withEnemyActorZones = (
  state: ReturnType<typeof createEnemyTurnFixture>,
  zones: {
    readonly drawPile?: readonly EnemyCardFixtureId[];
    readonly hand?: readonly EnemyCardFixtureId[];
    readonly planned?: {
      readonly planMode?: "locked" | "adaptive" | "charging";
      readonly lockedCardInstanceId?: EnemyCardFixtureId;
      readonly candidateCardInstanceIds: readonly EnemyCardFixtureId[];
    };
    readonly discardPile?: readonly EnemyCardFixtureId[];
    readonly maxEnergy?: number;
    readonly energy?: number;
    readonly energyRefill?: number;
  }
) =>
  withEnemyCardActorState(state, state.monsters[0].id, (actor) => ({
    ...actor,
    drawPile: zones.drawPile ?? actor.drawPile,
    hand: zones.hand ?? actor.hand,
    planned: zones.planned ?? actor.planned,
    discardPile: zones.discardPile ?? actor.discardPile,
    maxEnergy: zones.maxEnergy ?? actor.maxEnergy,
    energy: zones.energy ?? actor.energy,
    energyRefill: zones.energyRefill ?? actor.energyRefill
  }));
