import { describe, expect, it } from "vitest";
import { cardId, petDefinitionId } from "../../src/game-core";
import { matchesPetModifierCardSelector } from "../../src/game-core/systems/pet-modifier-selectors";
import type { CardDefinition, PetModifierRule } from "../../src/game-core";

const card = (overrides: Partial<CardDefinition> = {}): CardDefinition => ({
  id: cardId("fox_bite"),
  name: "Fox Bite",
  description: "Command Ember Fox to attack.",
  type: "pet-command",
  cost: 1,
  tags: ["pet", "command", "attack", "fox"],
  effects: [],
  requiresPetDefinitionId: petDefinitionId("ember_fox"),
  rarity: "starter",
  ...overrides
});

const rule = (
  selector: Extract<PetModifierRule, { type: "modifyPetCommandCost" }>["selector"]
): Extract<PetModifierRule, { type: "modifyPetCommandCost" }> => ({
  type: "modifyPetCommandCost",
  selector,
  amount: -1,
  minCost: 0
});

describe("pet modifier card selectors", () => {
  it("matches card type, required pet definition, and tag selectors", () => {
    expect(matchesPetModifierCardSelector(card(), rule({
      cardType: "pet-command",
      requiresPetDefinitionId: petDefinitionId("ember_fox"),
      tagsAny: ["burn", "attack"],
      tagsAll: ["pet", "command"]
    }))).toBe(true);
  });

  it("rejects cards that miss selector constraints", () => {
    expect(matchesPetModifierCardSelector(card({ type: "attack" }), rule({ cardType: "pet-command" }))).toBe(false);
    expect(matchesPetModifierCardSelector(card({ requiresPetDefinitionId: undefined }), rule({
      requiresPetDefinitionId: petDefinitionId("ember_fox")
    }))).toBe(false);
    expect(matchesPetModifierCardSelector(card(), rule({ tagsAny: ["burn"] }))).toBe(false);
    expect(matchesPetModifierCardSelector(card(), rule({ tagsAll: ["pet", "burn"] }))).toBe(false);
  });
});
