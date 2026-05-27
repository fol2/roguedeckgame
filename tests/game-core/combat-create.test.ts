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
    expect(result.events.map((event) => event.type).slice(0, 6)).toEqual([
      "CombatStarted",
      "DeckShuffled",
      "MonsterAbilityPlanned",
      "MonsterIntentSet",
      "TurnStarted",
      "CardMoved"
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
