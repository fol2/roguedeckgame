import { describe, expect, it } from "vitest";
import {
  burnStatusDefinition,
  combatantId,
  createCombat,
  createRng,
  getStatusDescriptor,
  monsterId,
  nextAttackBoostStatusDefinition,
  processEndOfTurnStatuses,
  processStartOfTurnStatuses,
  resolveEffects,
  starterRegistry,
  statusId,
  type GameContentRegistry
} from "../../src/game-core";
import {
  createBurningMonsterFixture,
  createEnemyTurnFixture
} from "../../src/game-core/testing/combat-fixtures";
import { createEmberFoxInstanceFixture, createRunFixture } from "../../src/game-core/testing/fixtures";

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

describe("combat statuses", () => {
  it("Burn ticks at the start of a monster turn and decreases stacks", () => {
    const state = createBurningMonsterFixture(2);
    const result = processStartOfTurnStatuses(state, state.monsters[0].id);

    expect(result.ok).toBe(true);
    expect(result.state.monsters[0].hp).toBe(20);
    expect(result.state.monsters[0].statuses).toEqual([{ statusId: statusId("burn"), stacks: 1 }]);
    expect(result.events.map((event) => event.type)).toEqual(["StatusTicked", "DamageDealt"]);
    expect(result.events[0]).toEqual({
      type: "StatusTicked",
      targetId: state.monsters[0].id,
      statusId: statusId("burn"),
      stacksBefore: 2,
      stacksAfter: 1,
      amount: 2
    });
  });

  it("Burn damage ignores block", () => {
    const baseState = createBurningMonsterFixture(3);
    const state = {
      ...baseState,
      monsters: [{ ...baseState.monsters[0], block: 9 }]
    };
    const result = processStartOfTurnStatuses(state, state.monsters[0].id);

    expect(result.state.monsters[0].hp).toBe(19);
    expect(result.state.monsters[0].block).toBe(9);
    expect(result.events.find((event) => event.type === "DamageDealt")).toMatchObject({
      amount: 3,
      blocked: 0
    });
  });

  it("Burn expires at zero stacks", () => {
    const state = createBurningMonsterFixture(1);
    const result = processStartOfTurnStatuses(state, state.monsters[0].id);

    expect(result.state.monsters[0].statuses).toEqual([]);
    expect(result.events.map((event) => event.type)).toEqual(["StatusTicked", "DamageDealt", "StatusExpired"]);
  });

  it("Burn can defeat a monster and end combat won", () => {
    const baseState = createBurningMonsterFixture(2);
    const state = {
      ...baseState,
      monsters: [{ ...baseState.monsters[0], hp: 2 }]
    };
    const result = processStartOfTurnStatuses(state, state.monsters[0].id);

    expect(result.state.phase).toBe("won");
    expect(result.state.monsters[0].alive).toBe(false);
    expect(result.events.map((event) => event.type)).toEqual([
      "StatusTicked",
      "DamageDealt",
      "CombatantDefeated",
      "CombatEnded"
    ]);
  });

  it("Burn can defeat the player and end combat lost", () => {
    const baseState = createEnemyTurnFixture();
    const state = {
      ...baseState,
      player: {
        ...baseState.player,
        hp: 1,
        statuses: [{ statusId: statusId("burn"), stacks: 2 }]
      }
    };
    const result = processStartOfTurnStatuses(state, state.player.id);

    expect(result.state.phase).toBe("lost");
    expect(result.state.player.alive).toBe(false);
    expect(result.events.map((event) => event.type)).toEqual([
      "StatusTicked",
      "DamageDealt",
      "CombatantDefeated",
      "CombatEnded"
    ]);
  });

  it("emits StatusTicked, StatusExpired, and CombatantDefeated when appropriate", () => {
    const baseState = createBurningMonsterFixture(1);
    const state = {
      ...baseState,
      monsters: [{ ...baseState.monsters[0], hp: 1 }]
    };
    const result = processStartOfTurnStatuses(state, state.monsters[0].id);

    expect(result.events.map((event) => event.type)).toEqual([
      "StatusTicked",
      "DamageDealt",
      "CombatantDefeated",
      "StatusExpired",
      "CombatEnded"
    ]);
  });

  it("is deterministic for the same input", () => {
    const state = createBurningMonsterFixture(2);
    const first = processStartOfTurnStatuses(state, state.monsters[0].id);
    const second = processStartOfTurnStatuses(state, state.monsters[0].id);

    expect(first).toEqual(second);
  });

  it("does not mutate input state on rejected actions", () => {
    const state = createBurningMonsterFixture(2);
    const before = JSON.parse(JSON.stringify(state));
    const result = processStartOfTurnStatuses(state, combatantId("missing"));

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(JSON.parse(JSON.stringify(state))).toEqual(before);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["invalid_target"]);
  });

  it("expires duration statuses at their configured turn window", () => {
    const tiredStatus = {
      id: statusId("tired"),
      name: "Tired",
      tags: ["debuff"],
      description: "Expires after a duration.",
      behaviour: {
        type: "duration" as const,
        timing: "endOfTurn" as const,
        decrementDurationBy: 1,
        expiresAtZero: true
      }
    };
    const baseState = createBurningMonsterFixture(1);
    const state = {
      ...baseState,
      monsters: [{
        ...baseState.monsters[0],
        statuses: [{ statusId: statusId("tired"), stacks: 1, duration: 2 }]
      }]
    };
    const result = processEndOfTurnStatuses(state, state.monsters[0].id, {
      registry: createStatusRegistry([burnStatusDefinition, tiredStatus]),
      rng: createRng("duration")
    });

    expect(result.ok).toBe(true);
    expect(result.state.monsters[0].statuses).toEqual([{ statusId: statusId("tired"), stacks: 1, duration: 1 }]);
    expect(result.events.map((event) => event.type)).toEqual(["StatusDurationChanged"]);
  });

  it("blocks incoming statuses through immunity behaviour", () => {
    const wardStatus = {
      id: statusId("ember_ward"),
      name: "Ember Ward",
      tags: ["guard"],
      description: "Blocks fire statuses.",
      behaviour: {
        type: "statusImmunity" as const,
        blocksTagsAny: ["fire"]
      }
    };
    const baseState = createBurningMonsterFixture(1);
    const state = {
      ...baseState,
      player: {
        ...baseState.player,
        statuses: [{ statusId: statusId("ember_ward"), stacks: 1 }]
      }
    };
    const result = resolveEffects(
      state,
      [{ type: "applyStatus", statusId: statusId("burn"), stacks: 2, target: { type: "self" } }],
      { sourceId: state.player.id },
      createStatusRegistry([burnStatusDefinition, wardStatus]),
      createRng("immune")
    );

    expect(result.ok).toBe(true);
    expect(result.state.player.statuses).toEqual([{ statusId: statusId("ember_ward"), stacks: 1 }]);
    expect(result.events.map((event) => event.type)).toEqual(["StatusApplicationBlocked"]);
  });

  it("cleanses matching status stacks", () => {
    const state = createBurningMonsterFixture(3);
    const result = resolveEffects(
      state,
      [{ type: "cleanseStatus", statusId: statusId("burn"), stacks: 2, target: { type: "allEnemies" } }],
      { sourceId: state.player.id },
      createStatusRegistry([burnStatusDefinition]),
      createRng("cleanse")
    );

    expect(result.ok).toBe(true);
    expect(result.state.monsters[0].statuses).toEqual([{ statusId: statusId("burn"), stacks: 1 }]);
    expect(result.events).toContainEqual({
      type: "StatusCleansed",
      targetId: state.monsters[0].id,
      statusId: statusId("burn"),
      stacksRemoved: 2,
      remainingStacks: 1
    });
  });

  it("applies authored stacking caps and duration policy deterministically", () => {
    const focusStatus = {
      id: statusId("focus"),
      name: "Focus",
      tags: ["buff"],
      description: "A capped preparation buff.",
      stacking: {
        type: "additive" as const,
        maxStacks: 3,
        durationPolicy: "keep" as const
      },
      behaviour: {
        type: "duration" as const,
        timing: "endOfTurn" as const,
        decrementDurationBy: 1,
        expiresAtZero: true
      }
    };
    const baseState = createEnemyTurnFixture();
    const state = {
      ...baseState,
      player: {
        ...baseState.player,
        statuses: [{ statusId: statusId("focus"), stacks: 2, duration: 2 }]
      }
    };
    const result = resolveEffects(
      state,
      [{ type: "applyStatus", statusId: statusId("focus"), stacks: 5, duration: 1, target: { type: "self" } }],
      { sourceId: state.player.id },
      createStatusRegistry([burnStatusDefinition, focusStatus]),
      createRng("status-stacking")
    );

    expect(result.ok).toBe(true);
    expect(result.state.player.statuses).toEqual([{ statusId: statusId("focus"), stacks: 3, duration: 2 }]);
    expect(result.events.map((event) => event.type)).toEqual(["StatusApplied"]);
    expect(result.events[0]).toMatchObject({
      type: "StatusApplied",
      stacks: 1
    });
  });

  it("consumes status stacks with a distinct event before later effects", () => {
    const state = createBurningMonsterFixture(3);
    const result = resolveEffects(
      state,
      [
        { type: "consumeStatus", statusId: statusId("burn"), stacks: 2, target: { type: "allEnemies" } },
        { type: "damage", amount: 4, target: { type: "allEnemies" } }
      ],
      { sourceId: state.player.id },
      createStatusRegistry([burnStatusDefinition]),
      createRng("consume-status")
    );

    expect(result.ok).toBe(true);
    expect(result.state.monsters[0].statuses).toEqual([{ statusId: statusId("burn"), stacks: 1 }]);
    expect(result.events.map((event) => event.type)).toEqual(["StatusConsumed", "DamageDealt"]);
    expect(result.events[0]).toEqual({
      type: "StatusConsumed",
      targetId: state.monsters[0].id,
      statusId: statusId("burn"),
      stacksConsumed: 2,
      remainingStacks: 1
    });
  });

  it("adds and consumes Next Attack Boost on the next direct attack", () => {
    const baseState = createBurningMonsterFixture(1);
    const monster = baseState.monsters[0];
    const state = {
      ...baseState,
      monsters: [{
        ...monster,
        statuses: [{ statusId: statusId("next_attack_boost"), stacks: 3 }]
      }],
      player: { ...baseState.player, block: 0 }
    };
    const result = resolveEffects(
      state,
      [{ type: "damage", amount: 4, target: { type: "target", combatantId: state.player.id } }],
      { sourceId: monster.id },
      createStatusRegistry([burnStatusDefinition, nextAttackBoostStatusDefinition]),
      createRng("next-attack-boost")
    );

    expect(result.ok).toBe(true);
    expect(result.state.monsters[0].statuses).toEqual([]);
    expect(result.events.map((event) => event.type)).toEqual(["StatusConsumed", "DamageDealt"]);
    expect(result.events[1]).toMatchObject({
      type: "DamageDealt",
      amount: 7
    });
  });

  it("draw effects use the source enemy Card Actor when an enemy card resolves", () => {
    const created = createCombat({
      run: createRunFixture(),
      registry: starterRegistry,
      petInstances: [createEmberFoxInstanceFixture()],
      monsterIds: [monsterId("cinder_scribe")],
      seed: "enemy-draw-effect"
    });
    expect(created.ok).toBe(true);
    if (!created.ok || !created.state) {
      throw new Error("Expected combat creation to succeed.");
    }

    const monster = created.state.monsters[0];
    const actor = created.state.cardActors.find((candidate) => candidate.actorId === monster.id);
    const drawnCardId = actor?.drawPile[0];
    expect(actor?.actorKind).toBe("enemy");
    expect(drawnCardId).toBeDefined();
    if (!actor || !drawnCardId) {
      throw new Error("Expected cinder scribe to have an enemy draw pile.");
    }

    const result = resolveEffects(
      {
        ...created.state,
        cardActors: created.state.cardActors.map((candidate) =>
          candidate.actorId === monster.id
            ? { ...actor, hand: [], drawPile: [drawnCardId], discardPile: [] }
            : candidate
        )
      },
      [{ type: "draw", amount: 1 }],
      { sourceId: monster.id },
      starterRegistry,
      createRng("enemy-draw-effect")
    );

    expect(result.ok).toBe(true);
    expect(result.events).toEqual([expect.objectContaining({
      type: "EnemyCardMoved",
      monsterId: monster.id,
      cardInstanceId: drawnCardId,
      from: "draw",
      to: "hand"
    })]);
    expect(result.state.monsterCardStates?.find((cardState) => cardState.monsterCombatantId === monster.id)?.hand).toEqual([drawnCardId]);
  });

  it("describes status stacking, timing, expiry, cleanse, and consume lifecycle copy", () => {
    const descriptor = getStatusDescriptor({ statusId: statusId("burn"), stacks: 2 }, burnStatusDefinition);

    expect(descriptor.summaryLines).toEqual(expect.arrayContaining([
      "Burn 2",
      "Stacks add together with no stack cap; duration keeps the longest value.",
      "At startOfTurn, deals damage equal to stacks ignoring Block, then removes 1 stack.",
      "Ticking emits StatusTicked before damage events.",
      "Expiry emits StatusExpired when stacks or duration reach zero.",
      "Cleanse emits StatusCleansed; consume emits StatusConsumed."
    ]));
  });
});
