import { describe, expect, it } from "vitest";
import {
  cardId,
  cardInstanceId,
  combatantId,
  createCombat,
  createRng,
  monsterId,
  petInstanceId,
  playCard,
  starterRegistry,
  statusId,
  upgradeId,
  type CardDefinition,
  type CombatState,
  type PetModifierDefinition,
  type PetInstance
} from "../../src/game-core";
import {
  createHandTunedCombatFixture,
  createSecondEmberFoxInstanceFixture
} from "../../src/game-core/testing/combat-fixtures";
import { createEmberFoxInstanceFixture, createRunFixture } from "../../src/game-core/testing/fixtures";

const targetId = combatantId("monster:training_slime:0");

describe("pet modifier multi-pet ownership", () => {
  it("applies a leading command modifier only from the leading pet", () => {
    const result = playFoxBite(createMultiPetState([
      emberFox("ember_fox_001", ["burning_fang"]),
      emberFox("ember_fox_002", [])
    ]), "multi-leading-first");

    expect(result.ok).toBe(true);
    expect(result.state.monsters[0].hp).toBe(15);
  });

  it("does not apply a second pet's modifier to a leading command", () => {
    const result = playFoxBite(createMultiPetState([
      emberFox("ember_fox_001", []),
      emberFox("ember_fox_002", ["burning_fang"])
    ]), "multi-leading-second");

    expect(result.ok).toBe(true);
    expect(result.state.monsters[0].hp).toBe(17);
    expect(result.events.filter((event) => event.type === "PetModifierActivated")).toEqual([]);
  });

  it("uses the new leading pet when the second pet is first in active order", () => {
    const result = playFoxBite(createMultiPetState([
      emberFox("ember_fox_002", ["burning_fang"]),
      emberFox("ember_fox_001", [])
    ]), "multi-leading-swapped");

    expect(result.ok).toBe(true);
    expect(result.events.find((event) => event.type === "PetCommanded")).toMatchObject({
      petInstanceId: petInstanceId("ember_fox_002")
    });
    expect(result.state.monsters[0].hp).toBe(15);
  });

  it("allows an all-active command to receive modifiers from multiple active pets", () => {
    const registry = {
      ...starterRegistry,
      cards: [...starterRegistry.cards, allActiveBurnCommand]
    };
    const state = withCardInHand(
      createMultiPetState([
        emberFox("ember_fox_001", ["burning_fang"]),
        emberFox("ember_fox_002", ["burning_fang"])
      ]),
      allActiveBurnCommand.id
    );
    const result = playCard(
      state,
      { type: "playCard", cardInstanceId: cardInstanceId("all_active_burn:1"), targetId },
      registry,
      createRng("multi-all-active")
    );

    expect(result.ok).toBe(true);
    expect(result.events.filter((event) => event.type === "PetModifierActivated")).toHaveLength(2);
    expect(result.events.filter((event) => event.type === "DamageDealt")).toHaveLength(2);
    expect(result.state.monsters[0].hp).toBe(10);
  });

  it("uses the same seeded random pet for command ownership and pet effects", () => {
    const registry = {
      ...starterRegistry,
      cards: [...starterRegistry.cards, randomPetCommand]
    };
    const state = withCardInHand(
      createMultiPetState([
        emberFox("ember_fox_001", ["warm_bond"]),
        emberFox("ember_fox_002", ["warm_bond"])
      ]),
      randomPetCommand.id
    );
    const result = playCard(
      state,
      { type: "playCard", cardInstanceId: cardInstanceId("random_pet_command:1") },
      registry,
      createRng("multi-random-owner")
    );

    expect(result.ok).toBe(true);
    const commandedPet = result.events.find((event) => event.type === "PetCommanded")?.petInstanceId;
    const reactedPet = result.events.find((event) => event.type === "PetReacted")?.petInstanceId;
    expect(commandedPet).toBeDefined();
    expect(reactedPet).toBe(commandedPet);
  });


  it("tracks Warm Bond usage per pet instance", () => {
    const state = createMultiPetState([
      emberFox("ember_fox_001", ["warm_bond"]),
      emberFox("ember_fox_002", ["warm_bond"])
    ]);
    const first = playFoxBite(state, "multi-warm-first");
    if (!first.ok) {
      throw new Error("First command should pass.");
    }

    const registry = {
      ...starterRegistry,
      cards: [...starterRegistry.cards, secondPetCommand]
    };
    const second = playCard(
      withCardInHand(first.state, secondPetCommand.id),
      { type: "playCard", cardInstanceId: cardInstanceId("second_pet_command:1") },
      registry,
      createRng("multi-warm-second")
    );

    expect(second.ok).toBe(true);
    expect(second.events).toContainEqual({
      type: "CardCostModified",
      cardInstanceId: cardInstanceId("second_pet_command:1"),
      cardId: cardId("second_pet_command"),
      originalCost: 1,
      modifiedCost: 0,
      modifierId: "warm_bond_modifier",
      petInstanceId: petInstanceId("ember_fox_002")
    });
    expect(second.state.runPetStates.map((runPetState) => runPetState.usedModifierIdsThisCombat)).toEqual([
      ["warm_bond_modifier"],
      ["warm_bond_modifier"]
    ]);
  });

  it("tracks Ash Instinct usage per pet instance", () => {
    const state = {
      ...createMultiPetState([
        emberFox("ember_fox_001", ["ash_instinct"]),
        emberFox("ember_fox_002", ["ash_instinct"])
      ]),
      monsters: [
        {
          ...createHandTunedCombatFixture().monsters[0],
          hp: 6,
          statuses: [{ statusId: statusId("burn"), stacks: 1 }]
        },
        {
          ...createHandTunedCombatFixture().monsters[0],
          id: combatantId("monster:ash_mite:1"),
          definitionId: monsterId("ash_mite"),
          name: "Ash Mite",
          hp: 18,
          maxHp: 18
        }
      ],
      hand: [cardInstanceId("strike:1")],
      drawPile: [cardInstanceId("strike:2")]
    };
    const result = playCard(
      state,
      { type: "playCard", cardInstanceId: cardInstanceId("strike:1"), targetId },
      starterRegistry,
      createRng("multi-ash")
    );

    expect(result.ok).toBe(true);
    expect(result.events.filter((event) => event.type === "PetModifierActivated")).toHaveLength(2);
    expect(result.state.runPetStates.map((runPetState) => runPetState.usedModifierIdsThisTurn)).toEqual([
      ["ash_instinct_modifier"],
      ["ash_instinct_modifier"]
    ]);
  });

  it("resolves registered temporary modifiers from RunPetState", () => {
    const temporaryModifier: PetModifierDefinition = {
      id: "temporary_burn_boost" as PetModifierDefinition["id"],
      name: "Temporary Burn Boost",
      description: "Temporary test modifier.",
      tags: ["temporary", "burn"],
      rules: [
        {
          type: "modifyPetCommandEffectAmount",
          selector: {
            cardType: "pet-command",
            requiresPetDefinitionId: "ember_fox" as CardDefinition["requiresPetDefinitionId"],
            tagsAll: ["burn"]
          },
          effectType: "petAttack",
          amount: 1
        }
      ]
    };
    const state = createMultiPetState([emberFox("ember_fox_001", [])]);
    const result = playCard(
      {
        ...state,
        runPetStates: state.runPetStates.map((runPetState) => ({
          ...runPetState,
          temporaryModifierIds: [temporaryModifier.id]
        }))
      },
      { type: "playCard", cardInstanceId: cardInstanceId("fox_bite:1"), targetId },
      { ...starterRegistry, petModifiers: [...(starterRegistry.petModifiers ?? []), temporaryModifier] },
      createRng("temporary-modifier")
    );

    expect(result.ok).toBe(true);
    expect(result.state.monsters[0].hp).toBe(16);
  });

  it("rejects missing temporary modifier definitions", () => {
    const state = createMultiPetState([emberFox("ember_fox_001", [])]);
    const result = playCard(
      {
        ...state,
        runPetStates: state.runPetStates.map((runPetState) => ({
          ...runPetState,
          temporaryModifierIds: ["missing_temporary_modifier" as PetModifierDefinition["id"]]
        }))
      },
      { type: "playCard", cardInstanceId: cardInstanceId("fox_bite:1"), targetId },
      starterRegistry,
      createRng("temporary-modifier-missing")
    );

    expect(result.ok).toBe(false);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["missing_pet_modifier_definition"]);
  });

  it("rejects temporary modifiers with unknown selector pet definitions", () => {
    const temporaryModifier: PetModifierDefinition = {
      id: "temporary_missing_pet_selector" as PetModifierDefinition["id"],
      name: "Temporary Missing Pet Selector",
      description: "Temporary test modifier with a bad selector.",
      tags: ["temporary"],
      rules: [
        {
          type: "modifyPetCommandCost",
          selector: {
            cardType: "pet-command",
            requiresPetDefinitionId: "missing_pet" as CardDefinition["requiresPetDefinitionId"]
          },
          amount: -1,
          minCost: 0
        }
      ]
    };
    const state = createMultiPetState([emberFox("ember_fox_001", [])]);
    const result = playCard(
      {
        ...state,
        runPetStates: state.runPetStates.map((runPetState) => ({
          ...runPetState,
          temporaryModifierIds: [temporaryModifier.id]
        }))
      },
      { type: "playCard", cardInstanceId: cardInstanceId("fox_bite:1"), targetId },
      { ...starterRegistry, petModifiers: [...(starterRegistry.petModifiers ?? []), temporaryModifier] },
      createRng("temporary-modifier-missing-pet-selector")
    );

    expect(result.ok).toBe(false);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["invalid_pet_modifier_rule"]);
  });
});

const allActiveBurnCommand: CardDefinition = {
  id: cardId("all_active_burn"),
  name: "All Active Burn",
  description: "Test command for all active pets.",
  type: "pet-command",
  cost: 1,
  rarity: "special",
  requiresPetDefinitionId: "ember_fox" as CardDefinition["requiresPetDefinitionId"],
  tags: ["pet", "fox", "burn", "command"],
  effects: [
    {
      type: "petAttack",
      petTarget: { type: "allActive" },
      amount: 2,
      target: { type: "target" }
    }
  ]
};

const secondPetCommand: CardDefinition = {
  id: cardId("second_pet_command"),
  name: "Second Pet Command",
  description: "Test command for the second pet.",
  type: "pet-command",
  cost: 1,
  rarity: "special",
  requiresPetDefinitionId: "ember_fox" as CardDefinition["requiresPetDefinitionId"],
  tags: ["pet", "fox", "command"],
  effects: [
    {
      type: "petReact",
      petTarget: { type: "specific", petInstanceId: petInstanceId("ember_fox_002") },
      reaction: "test"
    }
  ]
};

const randomPetCommand: CardDefinition = {
  id: cardId("random_pet_command"),
  name: "Random Pet Command",
  description: "Test command for a seeded random active pet.",
  type: "pet-command",
  cost: 1,
  rarity: "special",
  requiresPetDefinitionId: "ember_fox" as CardDefinition["requiresPetDefinitionId"],
  tags: ["pet", "fox", "command"],
  effects: [
    {
      type: "petReact",
      petTarget: { type: "randomActive" },
      reaction: "test_random"
    }
  ]
};

const playFoxBite = (state: CombatState, seed: string) =>
  playCard(
    state,
    { type: "playCard", cardInstanceId: cardInstanceId("fox_bite:1"), targetId },
    starterRegistry,
    createRng(seed)
  );

const emberFox = (
  id: "ember_fox_001" | "ember_fox_002",
  upgrades: readonly string[]
): PetInstance => {
  const base = id === "ember_fox_001" ? createEmberFoxInstanceFixture : createSecondEmberFoxInstanceFixture;
  return base({
    id: petInstanceId(id),
    unlockedUpgradeIds: upgrades.map(upgradeId)
  });
};

const createMultiPetState = (pets: readonly PetInstance[]): CombatState => {
  const combat = createCombat({
    run: createRunFixture({
      activePetInstanceIds: pets.map((pet) => pet.id)
    }),
    registry: starterRegistry,
    petInstances: pets,
    monsterIds: [monsterId("training_slime")],
    seed: "multi-pet-modifier",
    openingHandSize: 0
  });

  if (!combat.ok) {
    throw new Error(combat.errors[0]?.message ?? "Could not create combat.");
  }

  return {
    ...createHandTunedCombatFixture(),
    activePetInstanceIds: combat.state.activePetInstanceIds,
    petInstances: combat.state.petInstances,
    runPetStates: combat.state.runPetStates
  };
};

const withCardInHand = (state: CombatState, id: CardDefinition["id"]): CombatState => ({
  ...state,
  cardInstances: [
    ...state.cardInstances,
    { id: cardInstanceId(`${id}:1`), cardId: id, ownerId: combatantId("player") }
  ],
  hand: [...state.hand, cardInstanceId(`${id}:1`)]
});
