import { describe, expect, it } from "vitest";
import {
  cardId,
  monsterId,
  petInstanceId,
  starterRegistry,
  createCombat
} from "../../src/game-core";
import { createEmberFoxInstanceFixture, createRunFixture } from "../../src/game-core/testing/fixtures";

const createInput = (seed: string | number = "combat-create") => {
  const run = createRunFixture({
    deckCardIds: [
      cardId("strike"),
      cardId("strike"),
      cardId("strike"),
      cardId("defend"),
      cardId("defend"),
      cardId("focus"),
      cardId("fox_bite"),
      cardId("fox_guard"),
      cardId("fox_fetch")
    ]
  });

  return {
    run,
    registry: starterRegistry,
    petInstances: [createEmberFoxInstanceFixture()],
    monsterIds: [monsterId("training_slime")],
    seed,
    openingHandSize: 5
  };
};

describe("createCombat", () => {
  it("creates a player-turn combat with deterministic opening state", () => {
    const result = createCombat(createInput("same-seed"));

    expect(result.ok).toBe(true);
    expect(result.state?.phase).toBe("player_turn");
    expect(result.state?.energy).toBe(3);
    expect(result.state?.maxEnergy).toBe(3);
    expect(result.state?.hand).toHaveLength(5);
    expect(result.state?.plannedMonsterAbilities).toHaveLength(1);
    expect(result.state?.cardActors.map((actor) => actor.actorKind)).toEqual(["player", "enemy"]);
    expect(result.state?.cardActors[0]).toMatchObject({
      actorKind: "player",
      drawPerTurn: 3,
      maxHandSize: 10,
      unplayedHandPolicy: "retain"
    });
    expect(result.state?.cardActors[1]).toMatchObject({
      actorKind: "enemy",
      openingHandSize: 2,
      drawPerTurn: 1,
      maxHandSize: 3,
      maxEnergy: 1,
      unplayedHandPolicy: "retain"
    });
    expect(result.state?.cardActors[0].hand).toEqual(result.state?.hand);
    expect(result.state?.cardActors[1].planned.lockedCardInstanceId).toEqual(expect.any(String));
    expect(result.events.map((event) => event.type).slice(0, 12)).toEqual([
      "CombatStarted",
      "DeckShuffled",
      "CardMoved",
      "CardDrawn",
      "CardMoved",
      "CardDrawn",
      "CardMoved",
      "CardDrawn",
      "CardMoved",
      "CardDrawn",
      "CardMoved",
      "CardDrawn"
    ]);
    expect(result.events.map((event) => event.type).slice(12, 17)).toEqual([
      "EnemyDeckShuffled",
      "EnemyCardMoved",
      "EnemyCardMoved",
      "EnemyCardMoved",
      "EnemyPlanCreated"
    ]);
  });

  it("creates the same draw and hand order for the same seed", () => {
    const first = createCombat(createInput("repeatable"));
    const second = createCombat(createInput("repeatable"));

    expect(first.state?.drawPile).toEqual(second.state?.drawPile);
    expect(first.state?.hand).toEqual(second.state?.hand);
  });

  it("creates a different draw or hand order for a different seed", () => {
    const first = createCombat(createInput("seed-a"));
    const second = createCombat(createInput("seed-b"));

    expect([first.state?.drawPile, first.state?.hand]).not.toEqual([second.state?.drawPile, second.state?.hand]);
  });

  it("does not mutate the input RunState", () => {
    const input = createInput("immutable");
    const before = JSON.parse(JSON.stringify(input.run));

    createCombat(input);

    expect(JSON.parse(JSON.stringify(input.run))).toEqual(before);
  });

  it("copies active pets into combat arrays and run pet states", () => {
    const result = createCombat(createInput("pets"));

    expect(result.state?.activePetInstanceIds).toEqual([petInstanceId("ember_fox_001")]);
    expect(result.state?.petInstances.map((pet) => pet.id)).toEqual([petInstanceId("ember_fox_001")]);
    expect(result.state?.runPetStates.map((pet) => pet.petInstanceId)).toEqual([petInstanceId("ember_fox_001")]);
  });

  it("returns ok false for an invalid monster id", () => {
    const result = createCombat({
      ...createInput("invalid-monster"),
      monsterIds: [monsterId("missing_monster")]
    });

    expect(result.ok).toBe(false);
    expect(result.state.phase).toBe("not_started");
    expect(result.state.monsters).toEqual([]);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["missing_monster_definition"]);
    expect(result.events.map((event) => event.type)).toEqual(["ActionRejected"]);
  });

  it("returns ok false when a monster has no v0.5 card actor data", () => {
    const result = createCombat({
      ...createInput("missing-card-actor"),
      registry: {
        ...starterRegistry,
        monsters: starterRegistry.monsters.map((monster) => {
          if (monster.id !== monsterId("training_slime")) {
            return monster;
          }

          const { cardGame: _cardGame, ...monsterWithoutCardActor } = monster;
          return monsterWithoutCardActor;
        })
      }
    });

    expect(result.ok).toBe(false);
    expect(result.state.phase).toBe("not_started");
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["missing_monster_card_actor"]);
  });

  it("returns ok false for a missing active pet instance", () => {
    const result = createCombat({
      ...createInput("missing-pet"),
      petInstances: []
    });

    expect(result.ok).toBe(false);
    expect(result.state.phase).toBe("not_started");
    expect(result.state.petInstances).toEqual([]);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["missing_active_pet_instance"]);
  });
});
