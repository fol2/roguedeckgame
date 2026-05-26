import { describe, expect, it } from "vitest";
import {
  claimRunPendingReward,
  completeRunCombatNode,
  runNodeId,
  selectRunNode,
  skipRunPendingReward,
  starterRegistry
} from "../../src/game-core";
import { createSecondEmberFoxInstanceFixture, createWonCombatFixture } from "../../src/game-core/testing/combat-fixtures";
import { createEmberFoxInstanceFixture } from "../../src/game-core/testing/fixtures";
import { createOpenRewardOfferFixture, createPetUpgradeRewardOptionFixture } from "../../src/game-core/testing/reward-fixtures";
import { createStartedRunFixture, createTwoPetRegistryFixture } from "../../src/game-core/testing/run-fixtures";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const createRewardPendingRun = (seed = "run-reward-flow") => {
  const petInstances = [createEmberFoxInstanceFixture()];
  const selected = selectRunNode(createStartedRunFixture(), runNodeId("act1_forest_0_combat_a"));
  const completed = completeRunCombatNode({
    run: selected.state,
    combat: createWonCombatFixture({ id: selected.state.id }),
    registry: starterRegistry,
    petInstances,
    rewardSeed: seed
  });

  return { run: completed.state, petInstances };
};

describe("run reward flow", () => {
  it("claims a pending card reward and advances the map", () => {
    const { run, petInstances } = createRewardPendingRun("card-claim-run");
    const cardOption = run.pendingRewardOffer!.options.find((option) => option.type === "card")!;
    const result = claimRunPendingReward({
      run,
      selectedOptionId: cardOption.id,
      registry: starterRegistry,
      petInstances
    });

    expect(result.ok).toBe(true);
    expect(result.state.run.deckCardIds).toContain(cardOption.cardId);
    expect(result.state.run.pendingRewardOffer).toBeUndefined();
    expect(result.state.run.status).toBe("map_select");
    expect(result.state.run.map!.nodes.find((node) => node.id === run.map!.currentNodeId)?.status).toBe("completed");
    expect(result.events.map((event) => event.type)).toEqual([
      "RewardSelected",
      "CardRewardAdded",
      "RunNodeCompleted",
      "RunAdvanced"
    ]);
  });

  it("claims a pending pet upgrade reward and preserves updated pet instances", () => {
    const { run, petInstances } = createRewardPendingRun("pet-upgrade-claim-run");
    const upgradeOption = run.pendingRewardOffer!.options.find((option) => option.type === "petUpgrade")!;
    const result = claimRunPendingReward({
      run,
      selectedOptionId: upgradeOption.id,
      registry: starterRegistry,
      petInstances
    });

    expect(result.ok).toBe(true);
    expect(result.state.petInstances[0].unlockedUpgradeIds).toContain(upgradeOption.upgradeId);
    expect(result.state.run.activePetInstanceIds).toEqual(run.activePetInstanceIds);
  });

  it("skips a pending reward without changing deck or pets", () => {
    const { run, petInstances } = createRewardPendingRun("skip-run");
    const before = { deckCardIds: run.deckCardIds, petInstances: clone(petInstances) };
    const result = skipRunPendingReward({ run, petInstances });

    expect(result.ok).toBe(true);
    expect(result.state.run.deckCardIds).toEqual(before.deckCardIds);
    expect(clone(result.state.petInstances)).toEqual(before.petInstances);
    expect(result.state.run.pendingRewardOffer).toBeUndefined();
    expect(result.events.map((event) => event.type)).toEqual(["RewardSkipped", "RunNodeCompleted", "RunAdvanced"]);
  });

  it("unlocks connected next nodes after claim or skip", () => {
    const claimed = createRewardPendingRun("advance-claim");
    const cardOption = claimed.run.pendingRewardOffer!.options.find((option) => option.type === "card")!;
    const claimResult = claimRunPendingReward({
      run: claimed.run,
      selectedOptionId: cardOption.id,
      registry: starterRegistry,
      petInstances: claimed.petInstances
    });
    const skipped = createRewardPendingRun("advance-skip");
    const skipResult = skipRunPendingReward({ run: skipped.run, petInstances: skipped.petInstances });

    expect(claimResult.state.run.map!.nodes.filter((node) => node.status === "available").map((node) => node.id)).toEqual(
      claimed.run.map!.nodes.find((node) => node.status === "active")!.nextNodeIds
    );
    expect(skipResult.state.run.map!.nodes.filter((node) => node.status === "available").map((node) => node.id)).toEqual(
      skipped.run.map!.nodes.find((node) => node.status === "active")!.nextNodeIds
    );
  });

  it("does not allow selecting the next node while a reward is pending", () => {
    const { run } = createRewardPendingRun("pending-blocks-select");
    const nextNodeId = run.map!.nodes.find((node) => node.status === "active")!.nextNodeIds[0];
    const selectableRun = {
      ...run,
      map: {
        ...run.map!,
        nodes: run.map!.nodes.map((node) =>
          node.id === nextNodeId ? { ...node, status: "available" as const } : node
        )
      }
    };
    const result = selectRunNode(selectableRun, nextNodeId);

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toEqual(["invalid_run_status"]);
  });

  it("rejected claim or skip does not mutate run or pet instances", () => {
    const { run, petInstances } = createRewardPendingRun("reject-mutation");
    const closedRun = { ...run, pendingRewardOffer: { ...run.pendingRewardOffer!, status: "skipped" as const } };
    const before = { run: clone(closedRun), petInstances: clone(petInstances) };

    const claimResult = claimRunPendingReward({
      run: closedRun,
      selectedOptionId: run.pendingRewardOffer!.options[0].id,
      registry: starterRegistry,
      petInstances
    });
    const skipResult = skipRunPendingReward({ run: closedRun, petInstances });

    expect(claimResult.ok).toBe(false);
    expect(skipResult.ok).toBe(false);
    expect(clone(closedRun)).toEqual(before.run);
    expect(clone(petInstances)).toEqual(before.petInstances);
  });

  it("claims a pending pet upgrade reward for one pet while preserving the full multi-pet array", () => {
    const registry = createTwoPetRegistryFixture();
    const petInstances = [createEmberFoxInstanceFixture(), createSecondEmberFoxInstanceFixture()];
    const selected = selectRunNode(
      createStartedRunFixture({
        activePetInstanceIds: petInstances.map((petInstance) => petInstance.id),
        playerClassId: registry.players.find((player) => player.id === "two_pet_tamer")!.id
      }),
      runNodeId("act1_forest_0_combat_a")
    );
    const option = createPetUpgradeRewardOptionFixture({
      petInstanceId: petInstances[1].id
    });
    const run = {
      ...selected.state,
      status: "reward" as const,
      pendingRewardOffer: createOpenRewardOfferFixture([option])
    };
    const result = claimRunPendingReward({
      run,
      selectedOptionId: option.id,
      registry,
      petInstances
    });

    expect(result.ok).toBe(true);
    expect(result.state.run.activePetInstanceIds).toEqual(petInstances.map((petInstance) => petInstance.id));
    expect(result.state.petInstances).toHaveLength(2);
    expect(result.state.petInstances[0].unlockedUpgradeIds).toEqual([]);
    expect(result.state.petInstances[1].unlockedUpgradeIds).toContain(option.upgradeId);
  });

  it("skips a pending reward while preserving multi-pet arrays unchanged", () => {
    const registry = createTwoPetRegistryFixture();
    const petInstances = [createEmberFoxInstanceFixture(), createSecondEmberFoxInstanceFixture()];
    const selected = selectRunNode(
      createStartedRunFixture({
        activePetInstanceIds: petInstances.map((petInstance) => petInstance.id),
        playerClassId: registry.players.find((player) => player.id === "two_pet_tamer")!.id
      }),
      runNodeId("act1_forest_0_combat_a")
    );
    const run = {
      ...selected.state,
      status: "reward" as const,
      pendingRewardOffer: createOpenRewardOfferFixture()
    };
    const before = { activePetInstanceIds: run.activePetInstanceIds, petInstances: clone(petInstances) };
    const result = skipRunPendingReward({ run, petInstances });

    expect(result.ok).toBe(true);
    expect(result.state.run.activePetInstanceIds).toEqual(before.activePetInstanceIds);
    expect(clone(result.state.petInstances)).toEqual(before.petInstances);
  });
});
