import { describe, expect, it } from "vitest";
import {
  cardId,
  evolutionNodeId,
  petDefinitionId,
  playerClassId,
  starterRegistry,
  validateRegistry
} from "../../src/game-core";
import type { EffectDefinition, GameContentRegistry } from "../../src/game-core";

const cloneRegistry = (overrides: Partial<GameContentRegistry> = {}): GameContentRegistry => ({
  ...starterRegistry,
  ...overrides
});

describe("starterRegistry", () => {
  it("validates without errors", () => {
    const result = validateRegistry(starterRegistry);

    expect(result.errors).toEqual([]);
  });

  it("contains no duplicate ids in registry collections", () => {
    const result = validateRegistry(starterRegistry);

    expect(result.issues.filter((issue) => issue.code === "duplicate_id")).toEqual([]);
  });

  it("includes Ember Fox and its base command cards", () => {
    const emberFox = starterRegistry.pets.find((pet) => pet.id === petDefinitionId("ember_fox"));

    expect(emberFox).toBeDefined();
    expect(emberFox?.baseCommandCardIds).toEqual([
      cardId("fox_bite"),
      cardId("fox_guard"),
      cardId("fox_fetch")
    ]);

    const cardIds = new Set(starterRegistry.cards.map((card) => card.id));
    expect(emberFox?.baseCommandCardIds.every((id) => cardIds.has(id))).toBe(true);
  });

  it("includes Novice Tamer with one active pet via data", () => {
    const noviceTamer = starterRegistry.players.find((player) => player.id === playerClassId("novice_tamer"));

    expect(noviceTamer).toBeDefined();
    expect(noviceTamer?.name).toBe("Novice Tamer");
    expect(noviceTamer?.maxActivePets).toBe(1);
    expect(noviceTamer?.petSlotCount).toBe(1);
  });

  it("includes Ember Fox base and reward command cards", () => {
    const commandCards = starterRegistry.cards
      .filter((card) => card.requiresPetDefinitionId === petDefinitionId("ember_fox"))
      .map((card) => card.id);

    expect(commandCards).toEqual([
      cardId("fox_bite"),
      cardId("fox_guard"),
      cardId("fox_fetch"),
      cardId("fox_flare")
    ]);
  });

  it("includes all three Ember Fox upgrades", () => {
    const upgradeNames = starterRegistry.petUpgrades.map((upgrade) => upgrade.name).sort();

    expect(upgradeNames).toEqual(["Ash Instinct", "Burning Fang", "Warm Bond"]);
  });

  it("reports missing player starting deck cards", () => {
    const result = validateRegistry(
      cloneRegistry({
        players: [
          {
            ...starterRegistry.players[0],
            startingDeckCardIds: [cardId("missing_card")]
          }
        ]
      })
    );

    expect(result.errors.map((error) => error.code)).toContain("missing_starting_deck_card");
  });

  it("reports missing pet command cards", () => {
    const result = validateRegistry(
      cloneRegistry({
        pets: [
          {
            ...starterRegistry.pets[0],
            baseCommandCardIds: [cardId("missing_pet_command")]
          }
        ]
      })
    );

    expect(result.errors.map((error) => error.code)).toContain("missing_pet_command_card");
  });

  it("reports pet command cards with missing required pet definitions", () => {
    const result = validateRegistry(
      cloneRegistry({
        cards: [
          {
            ...starterRegistry.cards[0],
            requiresPetDefinitionId: petDefinitionId("missing_pet")
          }
        ]
      })
    );

    expect(result.errors.map((error) => error.code)).toContain("missing_required_pet_definition");
  });

  it("reports unknown card effect types", () => {
    const result = validateRegistry(
      cloneRegistry({
        cards: [
          {
            ...starterRegistry.cards[0],
            effects: [{ type: "unknownEffect" } as unknown as EffectDefinition]
          }
        ]
      })
    );

    expect(result.errors.map((error) => error.code)).toContain("unknown_effect_type");
  });

  it("reports invalid pet slot capacity", () => {
    const result = validateRegistry(
      cloneRegistry({
        players: [
          {
            ...starterRegistry.players[0],
            maxActivePets: 2,
            petSlotCount: 1
          }
        ]
      })
    );

    expect(result.errors.map((error) => error.code)).toContain("invalid_pet_slot_capacity");
  });

  it("reports invalid story references", () => {
    const result = validateRegistry(
      cloneRegistry({
        storyEvents: [
          {
            ...starterRegistry.storyEvents[0],
            outcomes: [
              {
                type: "unlockEvolutionNode",
                evolutionNodeId: evolutionNodeId("missing_evolution_node")
              }
            ]
          }
        ]
      })
    );

    expect(result.errors.map((error) => error.code)).toContain("missing_story_evolution_node");
  });
});
