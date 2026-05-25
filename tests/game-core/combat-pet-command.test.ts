import { describe, expect, it } from "vitest";
import {
  cardInstanceId,
  combatantId,
  createCombat,
  createRng,
  monsterId,
  petInstanceId,
  playCard,
  resolvePetTargets,
  starterRegistry
} from "../../src/game-core";
import {
  createHandTunedCombatFixture,
  createMultiPetRunFixture,
  createSecondEmberFoxInstanceFixture
} from "../../src/game-core/testing/combat-fixtures";
import { createEmberFoxInstanceFixture } from "../../src/game-core/testing/fixtures";
import type { PetTarget } from "../../src/game-core";

const targetId = combatantId("monster:training_slime:0");

describe("pet-command combat cards", () => {
  it("plays Fox Bite with the expected event order and burn stacks", () => {
    const result = playCard(
      createHandTunedCombatFixture(),
      { type: "playCard", cardInstanceId: cardInstanceId("fox_bite:1"), targetId },
      starterRegistry,
      createRng("fox-bite")
    );

    expect(result.ok).toBe(true);
    expect(result.events.map((event) => event.type)).toEqual([
      "CardPlayed",
      "EnergySpent",
      "PetCommanded",
      "DamageDealt",
      "StatusApplied",
      "CardMoved"
    ]);
    expect(result.state.monsters[0].statuses).toEqual([{ statusId: "burn", stacks: 2 }]);
  });

  it("plays Fox Guard, adds block, and emits PetReacted", () => {
    const result = playCard(
      createHandTunedCombatFixture(),
      { type: "playCard", cardInstanceId: cardInstanceId("fox_guard:1") },
      starterRegistry,
      createRng("fox-guard")
    );

    expect(result.ok).toBe(true);
    expect(result.state.player.block).toBe(5);
    expect(result.events.map((event) => event.type)).toEqual([
      "CardPlayed",
      "EnergySpent",
      "PetCommanded",
      "BlockGained",
      "PetReacted",
      "CardMoved"
    ]);
  });

  it("plays Fox Fetch, draws a card, and emits PetReacted", () => {
    const result = playCard(
      createHandTunedCombatFixture(),
      { type: "playCard", cardInstanceId: cardInstanceId("fox_fetch:1") },
      starterRegistry,
      createRng("fox-fetch")
    );

    expect(result.ok).toBe(true);
    expect(result.state.hand).toContain(cardInstanceId("strike:2"));
    expect(result.events.map((event) => event.type)).toEqual([
      "CardPlayed",
      "EnergySpent",
      "PetCommanded",
      "CardMoved",
      "CardDrawn",
      "PetReacted",
      "CardMoved"
    ]);
  });

  it("rejects pet-command cards when the required Ember Fox is not active", () => {
    const state = {
      ...createHandTunedCombatFixture(),
      activePetInstanceIds: [],
      petInstances: [],
      runPetStates: []
    };
    const before = JSON.parse(JSON.stringify(state));
    const result = playCard(
      state,
      { type: "playCard", cardInstanceId: cardInstanceId("fox_bite:1"), targetId },
      starterRegistry,
      createRng("missing-fox")
    );

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(JSON.parse(JSON.stringify(state))).toEqual(before);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["missing_required_active_pet"]);
  });

  it("resolves leading pet target to the first active pet", () => {
    const state = createMultiPetCombatState();
    const result = playCard(
      state,
      { type: "playCard", cardInstanceId: cardInstanceId("fox_bite:1"), targetId },
      starterRegistry,
      createRng("leading")
    );

    expect(result.ok).toBe(true);
    expect(result.events.find((event) => event.type === "PetCommanded")).toMatchObject({
      petInstanceId: petInstanceId("ember_fox_001")
    });
  });

  it("allows lethal Fox Bite to finish without rejecting the follow-up burn effect", () => {
    const baseState = createHandTunedCombatFixture();
    const state = {
      ...baseState,
      monsters: [{ ...baseState.monsters[0], hp: 3 }]
    };
    const result = playCard(
      state,
      { type: "playCard", cardInstanceId: cardInstanceId("fox_bite:1"), targetId },
      starterRegistry,
      createRng("lethal-fox-bite")
    );

    expect(result.ok).toBe(true);
    expect(result.state.monsters[0].alive).toBe(false);
    expect(result.state.monsters[0].statuses).toEqual([]);
    expect(result.events.map((event) => event.type)).toEqual([
      "CardPlayed",
      "EnergySpent",
      "PetCommanded",
      "DamageDealt",
      "CombatantDefeated",
      "CardMoved"
    ]);
  });

  it("applies allActive pet attacks once per active pet", () => {
    const state = createMultiPetCombatState();
    const registry = {
      ...starterRegistry,
      cards: starterRegistry.cards.map((card) =>
        card.id === "fox_bite"
          ? {
              ...card,
              effects: [
                {
                  type: "petAttack" as const,
                  petTarget: { type: "allActive" as const },
                  amount: 2,
                  target: { type: "target" as const }
                }
              ]
            }
          : card
      )
    };
    const result = playCard(
      state,
      { type: "playCard", cardInstanceId: cardInstanceId("fox_bite:1"), targetId },
      registry,
      createRng("all-active-attack")
    );

    expect(result.ok).toBe(true);
    expect(result.state.monsters[0].hp).toBe(18);
    expect(result.events.filter((event) => event.type === "PetCommanded")).toHaveLength(2);
    expect(result.events.filter((event) => event.type === "DamageDealt")).toHaveLength(2);
  });

  it("covers allActive, specific, randomActive, and withTag pet target variants", () => {
    const state = createMultiPetCombatState();

    expect(resolvePets(state, { type: "allActive" }, "all")).toEqual([
      petInstanceId("ember_fox_001"),
      petInstanceId("ember_fox_002")
    ]);
    expect(
      resolvePets(
        state,
        { type: "specific", petInstanceId: petInstanceId("ember_fox_002") },
        "specific"
      )
    ).toEqual([petInstanceId("ember_fox_002")]);

    const firstRandom = resolvePetTargets(state, starterRegistry, { type: "randomActive" }, createRng("random"));
    const secondRandom = resolvePetTargets(state, starterRegistry, { type: "randomActive" }, createRng("random"));
    expect(firstRandom).toEqual(secondRandom);
    expect(firstRandom.ok ? firstRandom.petInstanceIds : []).toHaveLength(1);

    expect(resolvePets(state, { type: "withTag", tag: "fox" }, "tag")).toEqual([
      petInstanceId("ember_fox_001"),
      petInstanceId("ember_fox_002")
    ]);
  });
});

const resolvePets = (
  state: ReturnType<typeof createMultiPetCombatState>,
  petTarget: PetTarget,
  seed: string
) => {
  const result = resolvePetTargets(state, starterRegistry, petTarget, createRng(seed));

  if (!result.ok) {
    throw new Error(result.error.message);
  }

  return result.petInstanceIds;
};

const createMultiPetCombatState = () => {
  const combat = createCombat({
    run: createMultiPetRunFixture(),
    registry: starterRegistry,
    petInstances: [createEmberFoxInstanceFixture(), createSecondEmberFoxInstanceFixture()],
    monsterIds: [monsterId("training_slime")],
    seed: "multi-pet-combat",
    openingHandSize: 0
  });

  if (!combat.ok || !combat.state) {
    throw new Error("Could not create multi-pet combat fixture.");
  }

  return {
    ...createHandTunedCombatFixture(),
    activePetInstanceIds: combat.state.activePetInstanceIds,
    petInstances: combat.state.petInstances,
    runPetStates: combat.state.runPetStates
  };
};
