import { describe, expect, it } from "vitest";
import {
  cardInstanceId,
  combatantId,
  createCombat,
  createRng,
  buildCardActionContract,
  endPlayerTurn,
  monsterId,
  petInstanceId,
  playCard,
  startPlayerTurn,
  starterRegistry,
  upgradeId,
  type GameContentRegistry,
  type CombatState,
  type PetInstance
} from "../../src/game-core";
import { createHandTunedCombatFixture } from "../../src/game-core/testing/combat-fixtures";
import { createEmberFoxInstanceFixture, createRunFixture } from "../../src/game-core/testing/fixtures";

const targetId = combatantId("monster:training_slime:0");

describe("Warm Bond pet modifier", () => {
  it("discounts the first eligible Ember Fox command once per combat", () => {
    const result = playFoxBite(createWarmBondState(), "warm-bond-first");

    expect(result.ok).toBe(true);
    expect(result.events.map((event) => event.type)).toEqual([
      "CardPlayed",
      "PetModifierActivated",
      "CardCostModified",
      "PetModifierConsumed",
      "EnergySpent",
      "PetCommanded",
      "DamageDealt",
      "StatusApplied",
      "CardMoved"
    ]);
    expect(result.events).toContainEqual({
      type: "CardCostModified",
      cardInstanceId: cardInstanceId("fox_bite:1"),
      cardId: "fox_bite",
      originalCost: 1,
      modifiedCost: 0,
      modifierId: "warm_bond_modifier",
      petInstanceId: petInstanceId("ember_fox_001")
    });
    expect(result.events).toContainEqual({ type: "EnergySpent", amount: 0, remaining: 3 });
  });

  it("exposes the same discounted cost through the shared card action contract", () => {
    const state = { ...createWarmBondState(), energy: 0 };
    const contract = buildCardActionContract(
      state,
      { cardInstanceId: cardInstanceId("fox_bite:1") },
      starterRegistry
    );
    const result = playFoxBite(state, "warm-bond-contract");

    expect(contract).toMatchObject({
      baseCost: 1,
      effectiveCost: 0,
      playable: true,
      actorPetInstanceIds: [petInstanceId("ember_fox_001")],
      commandPetSlotIndex: 0
    });
    expect(result.ok).toBe(true);
    expect(result.events).toContainEqual({ type: "EnergySpent", amount: 0, remaining: 0 });
  });

  it("keeps the shared card action contract aligned after the discount is consumed", () => {
    const first = playFoxBite(createWarmBondState(), "warm-bond-contract-consumed-1");
    if (!first.ok) {
      throw new Error("First command should pass.");
    }

    const state = {
      ...first.state,
      energy: 0,
      hand: [cardInstanceId("fox_guard:1")]
    };
    const contract = buildCardActionContract(
      state,
      { cardInstanceId: cardInstanceId("fox_guard:1") },
      starterRegistry
    );
    const result = playCard(
      state,
      { type: "playCard", cardInstanceId: cardInstanceId("fox_guard:1") },
      starterRegistry,
      createRng("warm-bond-contract-consumed-2")
    );

    expect(contract).toMatchObject({
      baseCost: 1,
      effectiveCost: 1,
      playable: false,
      unplayableReason: "Not enough energy."
    });
    expect(result.ok).toBe(false);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["insufficient_energy"]);
  });

  it("does not reduce cost below 0 or consume on zero-cost Fox Fetch", () => {
    const result = playCard(
      createWarmBondState(),
      { type: "playCard", cardInstanceId: cardInstanceId("fox_fetch:1") },
      starterRegistry,
      createRng("warm-bond-fetch")
    );

    expect(result.ok).toBe(true);
    expect(result.events.some((event) => event.type === "CardCostModified")).toBe(false);
    expect(result.state.runPetStates[0].usedModifierIdsThisCombat).toEqual([]);
  });

  it("does not discount the second eligible command in the same combat", () => {
    const first = playFoxBite(createWarmBondState(), "warm-bond-second-1");
    if (!first.ok) {
      throw new Error("First command should pass.");
    }

    const second = playCard(
      first.state,
      { type: "playCard", cardInstanceId: cardInstanceId("fox_guard:1") },
      starterRegistry,
      createRng("warm-bond-second-2")
    );

    expect(second.ok).toBe(true);
    expect(second.events.filter((event) => event.type === "CardCostModified")).toEqual([]);
    expect(second.events).toContainEqual({ type: "EnergySpent", amount: 1, remaining: 2 });
  });

  it("persists usage across player turns in the same combat", () => {
    const first = playFoxBite(createWarmBondState(), "warm-bond-turn-1");
    if (!first.ok) {
      throw new Error("First command should pass.");
    }

    const ended = endPlayerTurn({ ...first.state, hand: [], discardPile: first.state.discardPile });
    if (!ended.ok) {
      throw new Error("End turn should pass.");
    }

    const nextTurn = startPlayerTurn(
      { ...ended.state, phase: "enemy_turn", monsterIntents: [] },
      createRng("warm-bond-next-turn")
    );
    if (!nextTurn.ok) {
      throw new Error("Start turn should pass.");
    }

    expect(nextTurn.state.runPetStates[0].usedModifierIdsThisCombat).toEqual(["warm_bond_modifier"]);
    expect(nextTurn.state.runPetStates[0].usedModifierIdsThisTurn).toEqual([]);
  });

  it("does not apply from inactive pets", () => {
    const result = playFoxBite(
      createWarmBondState([createEmberFoxInstanceFixture()], [
        createEmberFoxInstanceFixture({
          id: petInstanceId("ember_fox_002"),
          nickname: "Cinder",
          unlockedUpgradeIds: [upgradeId("warm_bond")]
        })
      ]),
      "warm-bond-inactive"
    );

    expect(result.ok).toBe(true);
    expect(result.events.filter((event) => event.type === "CardCostModified")).toEqual([]);
    expect(result.events).toContainEqual({ type: "EnergySpent", amount: 1, remaining: 2 });
  });

  it("does not consume Warm Bond when the action is rejected", () => {
    const state = createWarmBondState();
    const before = state.runPetStates;
    const result = playCard(
      state,
      { type: "playCard", cardInstanceId: cardInstanceId("fox_bite:1") },
      starterRegistry,
      createRng("warm-bond-rejected")
    );

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(result.state.runPetStates).toBe(before);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["missing_target"]);
  });

  it("rejects malformed active cost modifier data during combat creation", () => {
    const result = createCombat({
      run: createRunFixture(),
      registry: registryWithBrokenWarmBond({
        minCost: -1,
        limit: { type: "permanent" }
      }),
      petInstances: [createEmberFoxInstanceFixture({ unlockedUpgradeIds: [upgradeId("warm_bond")] })],
      monsterIds: [monsterId("training_slime")],
      seed: "warm-bond-broken",
      openingHandSize: 0
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["invalid_pet_modifier_rule"]);
  });

  it("rejects active selector arrays during combat creation", () => {
    const result = createCombat({
      run: createRunFixture(),
      registry: registryWithBrokenWarmBond({
        selector: []
      }),
      petInstances: [createEmberFoxInstanceFixture({ unlockedUpgradeIds: [upgradeId("warm_bond")] })],
      monsterIds: [monsterId("training_slime")],
      seed: "warm-bond-selector-array",
      openingHandSize: 0
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["invalid_pet_modifier_rule"]);
  });

  it("rejects explicit undefined active selector fields during combat creation", () => {
    const result = createCombat({
      run: createRunFixture(),
      registry: registryWithBrokenWarmBond({
        selector: {
          cardType: undefined,
          requiresPetDefinitionId: undefined,
          tagsAny: undefined,
          tagsAll: undefined
        }
      }),
      petInstances: [createEmberFoxInstanceFixture({ unlockedUpgradeIds: [upgradeId("warm_bond")] })],
      monsterIds: [monsterId("training_slime")],
      seed: "warm-bond-selector-undefined",
      openingHandSize: 0
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["invalid_pet_modifier_rule"]);
  });

  it("rejects unknown active selector pet definitions during combat creation", () => {
    const result = createCombat({
      run: createRunFixture(),
      registry: registryWithBrokenWarmBond({
        selector: {
          cardType: "pet-command",
          requiresPetDefinitionId: "missing_pet"
        }
      }),
      petInstances: [createEmberFoxInstanceFixture({ unlockedUpgradeIds: [upgradeId("warm_bond")] })],
      monsterIds: [monsterId("training_slime")],
      seed: "warm-bond-selector-missing-pet",
      openingHandSize: 0
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["invalid_pet_modifier_rule"]);
  });

  it("rejects explicit null and undefined active limits during combat creation", () => {
    const nullLimit = createCombat({
      run: createRunFixture(),
      registry: registryWithBrokenWarmBond({ limit: null }),
      petInstances: [createEmberFoxInstanceFixture({ unlockedUpgradeIds: [upgradeId("warm_bond")] })],
      monsterIds: [monsterId("training_slime")],
      seed: "warm-bond-null-limit",
      openingHandSize: 0
    });
    const undefinedLimit = createCombat({
      run: createRunFixture(),
      registry: registryWithBrokenWarmBond({ limit: undefined }),
      petInstances: [createEmberFoxInstanceFixture({ unlockedUpgradeIds: [upgradeId("warm_bond")] })],
      monsterIds: [monsterId("training_slime")],
      seed: "warm-bond-undefined-limit",
      openingHandSize: 0
    });

    expect(nullLimit.ok).toBe(false);
    expect(undefinedLimit.ok).toBe(false);
    expect(nullLimit.errors.map((combatError) => combatError.code)).toEqual(["invalid_pet_modifier_rule"]);
    expect(undefinedLimit.errors.map((combatError) => combatError.code)).toEqual(["invalid_pet_modifier_rule"]);
  });
});

const playFoxBite = (state: CombatState, seed: string) =>
  playCard(
    state,
    { type: "playCard", cardInstanceId: cardInstanceId("fox_bite:1"), targetId },
    starterRegistry,
    createRng(seed)
  );

const createWarmBondState = (
  activePets: readonly PetInstance[] = [
    createEmberFoxInstanceFixture({ unlockedUpgradeIds: [upgradeId("warm_bond")] })
  ],
  inactivePets: readonly PetInstance[] = []
): CombatState => {
  const combat = createCombat({
    run: createRunFixture({
      activePetInstanceIds: activePets.map((pet) => pet.id)
    }),
    registry: starterRegistry,
    petInstances: [...activePets, ...inactivePets],
    monsterIds: [monsterId("training_slime")],
    seed: "warm-bond-state",
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

const registryWithBrokenWarmBond = (
  overrides: Record<string, unknown>
): GameContentRegistry => ({
  ...starterRegistry,
  petUpgrades: starterRegistry.petUpgrades.map((upgrade) =>
    upgrade.id === upgradeId("warm_bond")
      ? {
          ...upgrade,
          modifiers: [
            {
              ...upgrade.modifiers[0],
              rules: [{ ...upgrade.modifiers[0].rules[0], ...overrides }]
            }
          ]
        }
      : upgrade
  )
});
