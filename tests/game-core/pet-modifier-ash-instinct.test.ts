import { describe, expect, it } from "vitest";
import {
  cardInstanceId,
  combatantId,
  createCombat,
  createRng,
  endPlayerTurn,
  monsterId,
  playCard,
  processStartOfTurnStatuses,
  resolveEnemyTurn,
  resolvePetModifierTriggersAfterEvents,
  startPlayerTurn,
  starterRegistry,
  statusId,
  upgradeId,
  type CombatState,
  type EffectDefinition,
  type GameContentRegistry
} from "../../src/game-core";
import { createHandTunedCombatFixture } from "../../src/game-core/testing/combat-fixtures";
import { createEmberFoxInstanceFixture, createRunFixture } from "../../src/game-core/testing/fixtures";

const firstMonsterId = combatantId("monster:training_slime:0");
const secondMonsterId = combatantId("monster:ash_mite:1");

describe("Ash Instinct pet modifier", () => {
  it("draws 1 when a burned non-final enemy is defeated during the player turn", () => {
    const result = playStrike(createAshState(), firstMonsterId, "ash-trigger");

    expect(result.ok).toBe(true);
    expect(result.events.map((event) => event.type)).toEqual([
      "CardPlayed",
      "EnergySpent",
      "DamageDealt",
      "CombatantDefeated",
      "PetModifierActivated",
      "PetModifierConsumed",
      "CardMoved",
      "CardDrawn",
      "CardMoved"
    ]);
    expect(result.state.hand).toContain(cardInstanceId("strike:2"));
  });

  it("does not trigger when the defeated enemy was not burned", () => {
    const state = createAshState({
      burnedFirstMonster: false
    });
    const result = playStrike(state, firstMonsterId, "ash-no-burn");

    expect(result.ok).toBe(true);
    expect(result.events.some((event) => event.type === "PetModifierActivated")).toBe(false);
    expect(result.events.some((event) => event.type === "CardDrawn")).toBe(false);
  });

  it("triggers at most once per turn", () => {
    const first = playStrike(createAshState(), firstMonsterId, "ash-once-1");
    if (!first.ok) {
      throw new Error("First strike should pass.");
    }

    const secondState = {
      ...first.state,
      monsters: first.state.monsters.map((monster) =>
        monster.id === secondMonsterId
          ? { ...monster, hp: 6, statuses: [{ statusId: statusId("burn"), stacks: 1 }] }
          : monster
      )
    };
    const second = playCard(
      secondState,
      { type: "playCard", cardInstanceId: cardInstanceId("strike:2"), targetId: secondMonsterId },
      starterRegistry,
      createRng("ash-once-2")
    );

    expect(second.ok).toBe(true);
    expect(second.events.filter((event) => event.type === "PetModifierActivated")).toEqual([]);
  });

  it("resets usage on the next player turn", () => {
    const first = playStrike(createAshState(), firstMonsterId, "ash-reset-1");
    if (!first.ok) {
      throw new Error("First strike should pass.");
    }

    const ended = endPlayerTurn({ ...first.state, hand: [], discardPile: first.state.discardPile });
    const nextTurn = startPlayerTurn(
      { ...ended.state, phase: "enemy_turn", monsterIntents: [] },
      createRng("ash-reset-turn")
    );
    if (!nextTurn.ok) {
      throw new Error("Next turn should start.");
    }

    const resetState = {
      ...nextTurn.state,
      monsters: nextTurn.state.monsters.map((monster) =>
        monster.id === secondMonsterId
          ? { ...monster, hp: 6, alive: true, statuses: [{ statusId: statusId("burn"), stacks: 1 }] }
          : monster
      ).concat([
        {
          ...nextTurn.state.monsters[0],
          id: combatantId("monster:training_slime:2"),
          hp: 22,
          alive: true,
          statuses: []
        }
      ]),
      hand: [cardInstanceId("strike:2")],
      drawPile: []
    };
    const second = playCard(
      resetState,
      { type: "playCard", cardInstanceId: cardInstanceId("strike:2"), targetId: secondMonsterId },
      starterRegistry,
      createRng("ash-reset-2")
    );

    expect(second.ok).toBe(true);
    expect(second.events.filter((event) => event.type === "PetModifierActivated")).toHaveLength(1);
  });

  it("does not trigger during the enemy turn", () => {
    const state = {
      ...createAshState({ includeSecondMonster: false }),
      phase: "enemy_turn" as const,
      hand: [],
      discardPile: [],
      drawPile: [cardInstanceId("strike:1")],
      monsters: [
        {
          ...createAshState({ includeSecondMonster: false }).monsters[0],
          hp: 2,
          statuses: [{ statusId: statusId("burn"), stacks: 2 }]
        }
      ]
    };
    const result = resolveEnemyTurn(state, starterRegistry, createRng("ash-enemy-turn"));

    expect(result.ok).toBe(true);
    expect(result.events.some((event) => event.type === "PetModifierActivated")).toBe(false);
    expect(result.events.some((event) => event.type === "CardDrawn")).toBe(false);
  });

  it("triggers from Burn damage during the player turn while combat continues", () => {
    const state = createAshState({ includeSecondMonster: true });
    const result = processStartOfTurnStatuses(
      {
        ...state,
        monsters: [
          { ...state.monsters[0], hp: 1, statuses: [{ statusId: statusId("burn"), stacks: 1 }] },
          state.monsters[1]
        ]
      },
      firstMonsterId,
      { registry: starterRegistry, rng: createRng("ash-player-burn") }
    );

    expect(result.ok).toBe(true);
    expect(result.events.map((event) => event.type)).toEqual([
      "StatusTicked",
      "DamageDealt",
      "CombatantDefeated",
      "StatusExpired",
      "PetModifierActivated",
      "PetModifierConsumed",
      "CardMoved",
      "CardDrawn"
    ]);
  });

  it("does not draw after final enemy death when combat is won", () => {
    const result = playStrike(createAshState({ includeSecondMonster: false }), firstMonsterId, "ash-final");

    expect(result.ok).toBe(true);
    expect(result.state.phase).toBe("won");
    expect(result.events.some((event) => event.type === "CardDrawn")).toBe(false);
    expect(result.events.some((event) => event.type === "PetModifierActivated")).toBe(false);
  });

  it("does not consume Ash Instinct when the action is rejected", () => {
    const state = createAshState();
    const result = playCard(
      state,
      { type: "playCard", cardInstanceId: cardInstanceId("strike:1") },
      starterRegistry,
      createRng("ash-rejected")
    );

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(result.state.runPetStates[0].usedModifierIdsThisTurn).toEqual([]);
  });

  it("rejects direct trigger resolution outside the player turn", () => {
    const state = { ...createAshState(), phase: "enemy_turn" as const };
    const result = resolvePetModifierTriggersAfterEvents({
      stateBeforeEffects: state,
      stateAfterEffects: state,
      effectEvents: [],
      registry: starterRegistry,
      rng: createRng("ash-invalid-phase")
    });

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["invalid_phase"]);
  });

  it("rejects malformed active trigger modifier effects during combat creation", () => {
    const result = createCombat({
      run: createRunFixture(),
      registry: registryWithBrokenAshInstinct(),
      petInstances: [createEmberFoxInstanceFixture({ unlockedUpgradeIds: [upgradeId("ash_instinct")] })],
      monsterIds: [monsterId("training_slime")],
      seed: "ash-broken-trigger",
      openingHandSize: 0
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["invalid_pet_modifier_rule"]);
  });

  it("rejects malformed active trigger draw amounts during combat creation", () => {
    const result = createCombat({
      run: createRunFixture(),
      registry: registryWithBrokenAshInstinct([{ type: "draw", amount: 0 }]),
      petInstances: [createEmberFoxInstanceFixture({ unlockedUpgradeIds: [upgradeId("ash_instinct")] })],
      monsterIds: [monsterId("training_slime")],
      seed: "ash-broken-draw",
      openingHandSize: 0
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["invalid_pet_modifier_rule"]);
  });

  it("rejects unknown active trigger status ids during combat creation", () => {
    const result = createCombat({
      run: createRunFixture(),
      registry: registryWithBrokenAshRule({ requiredStatusId: statusId("frost") }),
      petInstances: [createEmberFoxInstanceFixture({ unlockedUpgradeIds: [upgradeId("ash_instinct")] })],
      monsterIds: [monsterId("training_slime")],
      seed: "ash-unknown-trigger-status",
      openingHandSize: 0
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((combatError) => combatError.code)).toEqual(["invalid_pet_modifier_rule"]);
  });
});

const playStrike = (state: CombatState, targetId: typeof firstMonsterId, seed: string) =>
  playCard(
    state,
    { type: "playCard", cardInstanceId: cardInstanceId("strike:1"), targetId },
    starterRegistry,
    createRng(seed)
  );

const createAshState = (
  options: {
    readonly burnedFirstMonster?: boolean;
    readonly includeSecondMonster?: boolean;
  } = {}
): CombatState => {
  const combat = createCombat({
    run: createRunFixture(),
    registry: starterRegistry,
    petInstances: [createEmberFoxInstanceFixture({ unlockedUpgradeIds: [upgradeId("ash_instinct")] })],
    monsterIds: [monsterId("training_slime")],
    seed: "ash-state",
    openingHandSize: 0
  });

  if (!combat.ok) {
    throw new Error(combat.errors[0]?.message ?? "Could not create combat.");
  }

  const base = createHandTunedCombatFixture();
  const firstMonster = {
    ...base.monsters[0],
    hp: 6,
    statuses: options.burnedFirstMonster === false ? [] : [{ statusId: statusId("burn"), stacks: 1 }]
  };
  const secondMonster = {
    ...base.monsters[0],
    id: secondMonsterId,
    definitionId: monsterId("ash_mite"),
    name: "Ash Mite",
    hp: 18,
    maxHp: 18,
    statuses: []
  };

  return {
    ...base,
    activePetInstanceIds: combat.state.activePetInstanceIds,
    petInstances: combat.state.petInstances,
    runPetStates: combat.state.runPetStates,
    monsters: options.includeSecondMonster === false ? [firstMonster] : [firstMonster, secondMonster],
    hand: [cardInstanceId("strike:1")],
    drawPile: [cardInstanceId("strike:2")],
    discardPile: [],
    energy: 3
  };
};

const registryWithBrokenAshInstinct = (
  effects: readonly EffectDefinition[] = [
    { type: "block", amount: 1, target: { type: "self" } }
  ]
): GameContentRegistry => ({
  ...starterRegistry,
  petUpgrades: starterRegistry.petUpgrades.map((upgrade) =>
    upgrade.id === upgradeId("ash_instinct")
      ? {
          ...upgrade,
          modifiers: [
            {
              ...upgrade.modifiers[0],
              rules: [
                {
                  ...upgrade.modifiers[0].rules[0],
                  effects
                }
              ]
            }
          ]
        }
      : upgrade
  )
});

const registryWithBrokenAshRule = (
  overrides: Record<string, unknown>
): GameContentRegistry => ({
  ...starterRegistry,
  petUpgrades: starterRegistry.petUpgrades.map((upgrade) =>
    upgrade.id === upgradeId("ash_instinct")
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
