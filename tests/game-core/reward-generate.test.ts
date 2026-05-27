import { describe, expect, it } from "vitest";
import {
  cardId,
  encounterId,
  generateCombatRewardOffer,
  petDefinitionId,
  petInstanceId,
  starterRegistry,
  upgradeId
} from "../../src/game-core";
import type { PetInstance } from "../../src/game-core";
import {
  createLostCombatFixture,
  createRewardPetInstancesFixture,
  createRewardRunFixture,
  createWonCombatFixture
} from "../../src/game-core/testing/reward-fixtures";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const optionPayloads = (options: readonly { readonly type: string }[]) =>
  options.map((option) => {
    if (option.type === "card") {
      const cardOption = option as { readonly type: "card"; readonly cardId: string };
      return `${cardOption.type}:${cardOption.cardId}`;
    }

    const upgradeOption = option as {
      readonly type: "petUpgrade";
      readonly petInstanceId: string;
      readonly upgradeId: string;
    };
    return `${upgradeOption.type}:${upgradeOption.petInstanceId}:${upgradeOption.upgradeId}`;
  });

describe("generateCombatRewardOffer", () => {
  it("generates a reward offer after won combat", () => {
    const result = generateCombatRewardOffer({
      combat: createWonCombatFixture(),
      run: createRewardRunFixture(),
      registry: starterRegistry,
      petInstances: createRewardPetInstancesFixture(),
      seed: "won-reward"
    });

    expect(result.ok).toBe(true);
    expect(result.state.status).toBe("open");
    expect(result.state.source).toBe("combat");
    expect(result.state.options).toHaveLength(4);
    expect(result.events.map((event) => event.type)).toEqual(["RewardOffered"]);
  });

  it.each(["not_started", "player_turn", "enemy_turn"] as const)(
    "rejects reward generation when combat is %s",
    (phase) => {
      const combat = { ...createWonCombatFixture(), phase };
      const result = generateCombatRewardOffer({
        combat,
        run: createRewardRunFixture(),
        registry: starterRegistry,
        petInstances: createRewardPetInstancesFixture(),
        seed: "unfinished-reward"
      });

      expect(result.ok).toBe(false);
      expect(result.state.status).toBe("skipped");
      expect(result.errors.map((rewardError) => rewardError.code)).toEqual(["combat_not_won"]);
      expect(result.events.map((event) => event.type)).toEqual(["ActionRejected"]);
    }
  );

  it("rejects reward generation after lost combat", () => {
    const result = generateCombatRewardOffer({
      combat: createLostCombatFixture(),
      run: createRewardRunFixture(),
      registry: starterRegistry,
      petInstances: createRewardPetInstancesFixture(),
      seed: "lost-reward"
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((rewardError) => rewardError.code)).toEqual(["combat_not_won"]);
  });

  it("creates the same reward offer for the same seed", () => {
    const input = {
      combat: createWonCombatFixture(),
      run: createRewardRunFixture(),
      registry: starterRegistry,
      petInstances: createRewardPetInstancesFixture(),
      seed: "same-seed",
      cardOptionCount: 6,
      petUpgradeOptionCount: 3
    };

    const first = generateCombatRewardOffer(input);
    const second = generateCombatRewardOffer(input);

    expect(first.state).toEqual(second.state);
    expect(first.events).toEqual(second.events);
  });

  it("can create different reward options for different seeds", () => {
    const baseInput = {
      combat: createWonCombatFixture(),
      run: createRewardRunFixture(),
      registry: starterRegistry,
      petInstances: createRewardPetInstancesFixture(),
      cardOptionCount: 3,
      petUpgradeOptionCount: 1
    };

    const first = generateCombatRewardOffer({ ...baseInput, seed: "seed-a" });
    const second = generateCombatRewardOffer({ ...baseInput, seed: "seed-b" });

    expect(optionPayloads(first.state.options)).not.toEqual(optionPayloads(second.state.options));
  });

  it("emits RewardOffered with serializable options", () => {
    const result = generateCombatRewardOffer({
      combat: createWonCombatFixture(),
      run: createRewardRunFixture(),
      registry: starterRegistry,
      petInstances: createRewardPetInstancesFixture(),
      seed: "serializable-reward"
    });

    expect(JSON.parse(JSON.stringify(result.events))).toEqual(result.events);
    expect(result.events[0]).toMatchObject({
      type: "RewardOffered",
      rewardOfferId: result.state.id,
      options: result.state.options
    });
  });

  it("excludes starter cards from card rewards", () => {
    const result = generateCombatRewardOffer({
      combat: createWonCombatFixture(),
      run: createRewardRunFixture(),
      registry: starterRegistry,
      petInstances: createRewardPetInstancesFixture(),
      seed: "no-starters",
      cardOptionCount: 99,
      petUpgradeOptionCount: 0
    });
    const offeredCardIds = result.state.options
      .filter((option) => option.type === "card")
      .map((option) => option.cardId);

    expect(offeredCardIds).not.toContain(cardId("strike"));
    expect(offeredCardIds).not.toContain(cardId("defend"));
    expect(offeredCardIds).not.toContain(cardId("fox_bite"));
  });

  it("filters card rewards by the encounter reward pool metadata", () => {
    const normal = generateCombatRewardOffer({
      combat: createWonCombatFixture({ encounterId: encounterId("training_slime_encounter") }),
      run: createRewardRunFixture(),
      registry: starterRegistry,
      petInstances: createRewardPetInstancesFixture(),
      seed: "normal-pool",
      cardOptionCount: 99,
      petUpgradeOptionCount: 0
    });
    const elite = generateCombatRewardOffer({
      combat: createWonCombatFixture({ encounterId: encounterId("forest_elite_placeholder") }),
      run: createRewardRunFixture(),
      registry: starterRegistry,
      petInstances: createRewardPetInstancesFixture(),
      seed: "elite-pool",
      cardOptionCount: 99,
      petUpgradeOptionCount: 0
    });
    const boss = generateCombatRewardOffer({
      combat: createWonCombatFixture({ encounterId: encounterId("forest_boss_placeholder") }),
      run: createRewardRunFixture(),
      registry: starterRegistry,
      petInstances: createRewardPetInstancesFixture(),
      seed: "boss-pool",
      cardOptionCount: 99,
      petUpgradeOptionCount: 0
    });

    expect(normal.state.options).not.toContainEqual(
      expect.objectContaining({ type: "card", cardId: cardId("cinder_sweep") })
    );
    expect(elite.state.options).toContainEqual(
      expect.objectContaining({ type: "card", cardId: cardId("cinder_sweep") })
    );
    expect(boss.state.options).toContainEqual(
      expect.objectContaining({ type: "card", cardId: cardId("cinder_sweep") })
    );
    expect(boss.state.options).not.toContainEqual(
      expect.objectContaining({ type: "card", cardId: cardId("ember_spark") })
    );
  });

  it("excludes cards that have reached their run deck duplicate limit", () => {
    const result = generateCombatRewardOffer({
      combat: createWonCombatFixture(),
      run: createRewardRunFixture({
        deckCardIds: [cardId("ember_spark"), cardId("ember_spark"), cardId("ember_spark")]
      }),
      registry: starterRegistry,
      petInstances: createRewardPetInstancesFixture(),
      seed: "duplicate-policy",
      cardOptionCount: 99,
      petUpgradeOptionCount: 0
    });

    expect(result.state.options).not.toContainEqual(
      expect.objectContaining({ type: "card", cardId: cardId("ember_spark") })
    );
  });

  it("includes Ember Fox pet-command rewards when Ember Fox is active", () => {
    const result = generateCombatRewardOffer({
      combat: createWonCombatFixture(),
      run: createRewardRunFixture(),
      registry: starterRegistry,
      petInstances: createRewardPetInstancesFixture(),
      seed: "ember-fox-active",
      cardOptionCount: 99,
      petUpgradeOptionCount: 0
    });

    expect(result.state.options).toContainEqual(
      expect.objectContaining({ type: "card", cardId: cardId("fox_flare") })
    );
  });

  it("excludes Ember Fox pet-command rewards when Ember Fox is not active", () => {
    const otherPet: PetInstance = {
      id: petInstanceId("future_pet_001"),
      definitionId: petDefinitionId("future_pet"),
      nickname: "Future",
      bondLevel: 1,
      bondXp: 0,
      unlockedUpgradeIds: [],
      chosenEvolutionNodeIds: [],
      unlockedMemoryIds: [],
      storyFlags: []
    };
    const result = generateCombatRewardOffer({
      combat: createWonCombatFixture({
        activePetInstanceIds: [otherPet.id],
        petInstances: [otherPet]
      }),
      run: createRewardRunFixture({ activePetInstanceIds: [otherPet.id] }),
      registry: starterRegistry,
      petInstances: [otherPet],
      seed: "ember-fox-inactive",
      cardOptionCount: 99,
      petUpgradeOptionCount: 0
    });

    expect(result.state.options).not.toContainEqual(
      expect.objectContaining({ type: "card", cardId: cardId("fox_flare") })
    );
  });

  it("creates pet upgrade options for a specific pet instance", () => {
    const result = generateCombatRewardOffer({
      combat: createWonCombatFixture(),
      run: createRewardRunFixture(),
      registry: starterRegistry,
      petInstances: createRewardPetInstancesFixture(),
      seed: "pet-upgrade-target",
      cardOptionCount: 0,
      petUpgradeOptionCount: 3
    });

    expect(result.state.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "petUpgrade",
          petInstanceId: petInstanceId("ember_fox_001"),
          petDefinitionId: petDefinitionId("ember_fox")
        })
      ])
    );
  });

  it("offers a Cinder Scribe bearer card first time and fallback cards on repeat failed drops", () => {
    const registry = {
      ...starterRegistry,
      encounters: starterRegistry.encounters.map((encounter) =>
        encounter.id === encounterId("cinder_scribe_encounter") && encounter.rewardBearer
          ? {
              ...encounter,
              rewardBearer: {
                ...encounter.rewardBearer,
                dropRule: { ...encounter.rewardBearer.dropRule, chancePercent: 0 }
              }
            }
          : encounter
      )
    };
    const combat = createWonCombatFixture({ encounterId: encounterId("cinder_scribe_encounter") });
    const first = generateCombatRewardOffer({
      combat,
      run: createRewardRunFixture(),
      registry,
      petInstances: createRewardPetInstancesFixture(),
      seed: "cinder-scribe-first",
      cardOptionCount: 0,
      petUpgradeOptionCount: 0
    });
    const repeat = generateCombatRewardOffer({
      combat,
      run: createRewardRunFixture({ runFlags: ["ash_rewrite_first"] }),
      registry,
      petInstances: createRewardPetInstancesFixture(),
      seed: "cinder-scribe-repeat",
      cardOptionCount: 0,
      petUpgradeOptionCount: 0
    });

    expect(first.state.options).toContainEqual(
      expect.objectContaining({ type: "card", cardId: cardId("ash_rewrite") })
    );
    expect(repeat.state.options).not.toContainEqual(
      expect.objectContaining({ type: "card", cardId: cardId("ash_rewrite") })
    );
    expect(repeat.state.options).toHaveLength(1);
    expect(repeat.state.options[0]?.id).toContain(":bearer:cinder_scribe_encounter:fallback:");
  });

  it("excludes already unlocked pet upgrades", () => {
    const result = generateCombatRewardOffer({
      combat: createWonCombatFixture(),
      run: createRewardRunFixture(),
      registry: starterRegistry,
      petInstances: createRewardPetInstancesFixture({
        unlockedUpgradeIds: [upgradeId("burning_fang")]
      }),
      seed: "upgrade-excluded",
      cardOptionCount: 0,
      petUpgradeOptionCount: 99
    });

    expect(result.state.options).not.toContainEqual(
      expect.objectContaining({ type: "petUpgrade", upgradeId: upgradeId("burning_fang") })
    );
  });

  it("does not duplicate options within one offer", () => {
    const result = generateCombatRewardOffer({
      combat: createWonCombatFixture(),
      run: createRewardRunFixture(),
      registry: starterRegistry,
      petInstances: createRewardPetInstancesFixture(),
      seed: "unique-options",
      cardOptionCount: 99,
      petUpgradeOptionCount: 99
    });
    const optionIds = result.state.options.map((option) => option.id);

    expect(new Set(optionIds).size).toBe(optionIds.length);
  });

  it("rejects reward generation when the run references a missing active pet instance", () => {
    const result = generateCombatRewardOffer({
      combat: createWonCombatFixture(),
      run: createRewardRunFixture({ activePetInstanceIds: [petInstanceId("missing_pet_instance")] }),
      registry: starterRegistry,
      petInstances: createRewardPetInstancesFixture(),
      seed: "missing-active-pet"
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((rewardError) => rewardError.code)).toEqual(["missing_active_pet_instance"]);
  });

  it("does not mutate combat, run, registry, or pet instances", () => {
    const combat = createWonCombatFixture();
    const run = createRewardRunFixture();
    const registry = starterRegistry;
    const petInstances = createRewardPetInstancesFixture();
    const before = {
      combat: clone(combat),
      run: clone(run),
      registry: clone(registry),
      petInstances: clone(petInstances)
    };

    generateCombatRewardOffer({
      combat,
      run,
      registry,
      petInstances,
      seed: "mutation-safe"
    });

    expect(clone(combat)).toEqual(before.combat);
    expect(clone(run)).toEqual(before.run);
    expect(clone(registry)).toEqual(before.registry);
    expect(clone(petInstances)).toEqual(before.petInstances);
  });
});
