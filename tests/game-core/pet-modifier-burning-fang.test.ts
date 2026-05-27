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
  type CombatState,
  type GameContentRegistry,
  type PetInstance
} from "../../src/game-core";
import {
  createHandTunedCombatFixture,
  createMultiPetRunFixture,
  createSecondEmberFoxInstanceFixture
} from "../../src/game-core/testing/combat-fixtures";
import { createEmberFoxInstanceFixture, createRunFixture } from "../../src/game-core/testing/fixtures";

const targetId = combatantId("monster:training_slime:0");

describe("Burning Fang pet modifier", () => {
  it("leaves Fox Bite unchanged without Burning Fang", () => {
    const result = playFoxBite(createHandTunedCombatFixture(), "burning-fang-none");

    expect(result.ok).toBe(true);
    expect(result.state.monsters[0].hp).toBe(18);
    expect(result.state.monsters[0].statuses).toEqual([{ statusId: "burn", stacks: 2 }]);
    expect(result.events.some((event) => event.type === "PetModifierActivated")).toBe(false);
  });

  it("modifies Fox Bite petAttack 4 to 6 and Burn 2 to 3", () => {
    const result = playFoxBite(createStateWithPets([
      emberFoxWithUpgrades("ember_fox_001", ["burning_fang"])
    ]), "burning-fang-bite");

    expect(result.ok).toBe(true);
    expect(result.state.monsters[0].hp).toBe(16);
    expect(result.state.monsters[0].statuses).toEqual([{ statusId: "burn", stacks: 3 }]);
    expect(result.events).toContainEqual({
      type: "PetModifierActivated",
      petInstanceId: petInstanceId("ember_fox_001"),
      upgradeId: upgradeId("burning_fang"),
      modifierId: "burning_fang_modifier",
      reason: "effectAmount"
    });
  });

  it("modifies Fox Flare petAttack 3 to 5 and Burn 3 to 4", () => {
    const state = withFoxFlareInHand(createStateWithPets([
      emberFoxWithUpgrades("ember_fox_001", ["burning_fang"])
    ]));
    const result = playCard(
      state,
      { type: "playCard", cardInstanceId: cardInstanceId("fox_flare:1"), targetId },
      starterRegistry,
      createRng("burning-fang-flare")
    );

    expect(result.ok).toBe(true);
    expect(result.state.monsters[0].hp).toBe(17);
    expect(result.state.monsters[0].statuses).toEqual([{ statusId: "burn", stacks: 4 }]);
  });

  it("does not mutate registry card definitions", () => {
    const foxBite = starterRegistry.cards.find((card) => card.id === cardId("fox_bite"));
    const before = JSON.parse(JSON.stringify(foxBite));

    playFoxBite(createStateWithPets([
      emberFoxWithUpgrades("ember_fox_001", ["burning_fang"])
    ]), "burning-fang-mutation");

    expect(JSON.parse(JSON.stringify(foxBite))).toEqual(before);
  });

  it("does not apply from an inactive pet", () => {
    const result = playFoxBite(createStateWithPets(
      [createEmberFoxInstanceFixture()],
      [emberFoxWithUpgrades("ember_fox_002", ["burning_fang"])]
    ), "burning-fang-inactive");

    expect(result.ok).toBe(true);
    expect(result.state.monsters[0].hp).toBe(18);
    expect(result.state.monsters[0].statuses).toEqual([{ statusId: "burn", stacks: 2 }]);
  });

  it("does not apply from a non-target second pet for leading commands", () => {
    const state = createStateWithPets([
      createEmberFoxInstanceFixture(),
      emberFoxWithUpgrades("ember_fox_002", ["burning_fang"])
    ]);
    const result = playFoxBite(state, "burning-fang-second");

    expect(result.ok).toBe(true);
    expect(result.state.monsters[0].hp).toBe(18);
    expect(result.state.monsters[0].statuses).toEqual([{ statusId: "burn", stacks: 2 }]);
  });

  it("rejects unknown active applyStatus modifier status ids during combat creation", () => {
    const result = createCombat({
      run: createRunFixture(),
      registry: registryWithBrokenBurningFangStatus(statusId("frost")),
      petInstances: [createEmberFoxInstanceFixture({ unlockedUpgradeIds: [upgradeId("burning_fang")] })],
      monsterIds: [monsterId("training_slime")],
      seed: "burning-fang-unknown-status",
      openingHandSize: 0
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["invalid_pet_modifier_rule"]);
  });

  it("rejects empty active applyStatus modifier status ids during combat creation", () => {
    const result = createCombat({
      run: createRunFixture(),
      registry: registryWithBrokenBurningFangStatus("" as ReturnType<typeof statusId>),
      petInstances: [createEmberFoxInstanceFixture({ unlockedUpgradeIds: [upgradeId("burning_fang")] })],
      monsterIds: [monsterId("training_slime")],
      seed: "burning-fang-empty-status",
      openingHandSize: 0
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["invalid_pet_modifier_rule"]);
  });

  it("rejects explicit undefined active applyStatus modifier status ids during combat creation", () => {
    const result = createCombat({
      run: createRunFixture(),
      registry: registryWithBrokenBurningFangStatus(undefined as unknown as ReturnType<typeof statusId>),
      petInstances: [createEmberFoxInstanceFixture({ unlockedUpgradeIds: [upgradeId("burning_fang")] })],
      monsterIds: [monsterId("training_slime")],
      seed: "burning-fang-undefined-status",
      openingHandSize: 0
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["invalid_pet_modifier_rule"]);
  });
});

const playFoxBite = (state: CombatState, seed: string) =>
  playCard(
    state,
    { type: "playCard", cardInstanceId: cardInstanceId("fox_bite:1"), targetId },
    starterRegistry,
    createRng(seed)
  );

const emberFoxWithUpgrades = (
  id: "ember_fox_001" | "ember_fox_002",
  upgrades: readonly string[]
): PetInstance => {
  const base = id === "ember_fox_001" ? createEmberFoxInstanceFixture : createSecondEmberFoxInstanceFixture;
  return base({
    id: petInstanceId(id),
    unlockedUpgradeIds: upgrades.map(upgradeId)
  });
};

const createStateWithPets = (
  activePets: readonly PetInstance[],
  inactivePets: readonly PetInstance[] = []
): CombatState => {
  const run = createRunFixture({
    activePetInstanceIds: activePets.map((pet) => pet.id)
  });
  const combat = createCombat({
    run: activePets.length > 1 ? createMultiPetRunFixture({ activePetInstanceIds: activePets.map((pet) => pet.id) }) : run,
    registry: starterRegistry,
    petInstances: [...activePets, ...inactivePets],
    monsterIds: [monsterId("training_slime")],
    seed: "burning-fang-state",
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

const withFoxFlareInHand = (state: CombatState): CombatState => ({
  ...state,
  cardInstances: [
    ...state.cardInstances,
    { id: cardInstanceId("fox_flare:1"), cardId: cardId("fox_flare"), ownerId: combatantId("player") }
  ],
  hand: [...state.hand, cardInstanceId("fox_flare:1")]
});

const registryWithBrokenBurningFangStatus = (
  brokenStatusId: ReturnType<typeof statusId>
): GameContentRegistry => ({
  ...starterRegistry,
  petUpgrades: starterRegistry.petUpgrades.map((upgrade) =>
    upgrade.id === upgradeId("burning_fang")
      ? {
          ...upgrade,
          modifiers: [
            {
              ...upgrade.modifiers[0],
              rules: upgrade.modifiers[0].rules.map((rule) =>
                rule.type === "modifyPetCommandEffectAmount" && rule.effectType === "applyStatus"
                  ? { ...rule, statusId: brokenStatusId }
                  : rule
              )
            }
          ]
        }
      : upgrade
  )
});
