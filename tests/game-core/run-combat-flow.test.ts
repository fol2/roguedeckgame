import { describe, expect, it } from "vitest";
import {
  completeRunCombatNode,
  encounterId,
  runNodeId,
  selectRunNode,
  startCombatForRunNode,
  starterRegistry
} from "../../src/game-core";
import { createWonCombatFixture, createLostCombatFixture } from "../../src/game-core/testing/combat-fixtures";
import { createEmberFoxInstanceFixture } from "../../src/game-core/testing/fixtures";
import { createStartedRunFixture } from "../../src/game-core/testing/run-fixtures";

describe("run combat flow", () => {
  it("starts combat for the active encounter and emits the run event first", () => {
    const run = createStartedRunFixture();
    const node = run.map!.nodes.find((candidate) => candidate.status === "available" && candidate.type === "combat")!;
    const selected = selectRunNode(run, node.id);
    const result = startCombatForRunNode({
      run: selected.state,
      registry: starterRegistry,
      petInstances: [createEmberFoxInstanceFixture()],
      seed: "run-combat-start"
    });
    const encounter = starterRegistry.encounters.find((candidate) => candidate.id === node.encounterId)!;

    expect(result.ok).toBe(true);
    expect(result.events.map((event) => event.type).slice(0, 3)).toEqual([
      "RunCombatStarted",
      "CombatStarted",
      "DeckShuffled"
    ]);
    expect(result.state.monsters.map((monster) => monster.definitionId)).toEqual(encounter.monsterIds);
  });

  it("marks lost combat as a lost run and emits RunEnded", () => {
    const run = selectRunNode(
      createStartedRunFixture(),
      runNodeId("act1_forest_0_combat_a")
    ).state;
    const result = completeRunCombatNode({
      run,
      combat: createLostCombatFixture({ id: run.id }),
      registry: starterRegistry,
      petInstances: [createEmberFoxInstanceFixture()]
    });

    expect(result.ok).toBe(true);
    expect(result.state.status).toBe("lost");
    expect(result.events.map((event) => event.type)).toEqual(["RunCombatCompleted", "RunEnded"]);
  });

  it("creates a pending reward after won non-boss combat", () => {
    const run = selectRunNode(
      createStartedRunFixture(),
      runNodeId("act1_forest_0_combat_a")
    ).state;
    const result = completeRunCombatNode({
      run,
      combat: createWonCombatFixture({ id: run.id }),
      registry: starterRegistry,
      petInstances: [createEmberFoxInstanceFixture()],
      rewardSeed: "won-reward"
    });

    expect(result.ok).toBe(true);
    expect(result.state.status).toBe("reward");
    expect(result.state.pendingRewardOffer?.status).toBe("open");
    expect(result.events.map((event) => event.type)).toEqual([
      "RunCombatCompleted",
      "RewardOffered",
      "RunRewardPending"
    ]);
  });

  it("completes the run immediately after won boss combat", () => {
    const baseRun = createStartedRunFixture();
    const bossNode = baseRun.map!.nodes.find((node) => node.type === "boss")!;
    const run = {
      ...baseRun,
      status: "combat" as const,
      map: {
        ...baseRun.map!,
        currentNodeId: bossNode.id,
        nodes: baseRun.map!.nodes.map((node) =>
          node.id === bossNode.id ? { ...node, status: "active" as const } : node
        )
      }
    };
    const result = completeRunCombatNode({
      run,
      combat: createWonCombatFixture({ id: run.id }),
      registry: starterRegistry,
      petInstances: [createEmberFoxInstanceFixture()]
    });

    expect(result.ok).toBe(true);
    expect(result.state.status).toBe("completed");
    expect(result.state.pendingRewardOffer).toBeUndefined();
    expect(result.events.map((event) => event.type)).toEqual([
      "RunCombatCompleted",
      "RunNodeCompleted",
      "RunAdvanced",
      "RunEnded"
    ]);
  });

  it("rejects won boss completion when the boss encounter is missing", () => {
    const baseRun = createStartedRunFixture();
    const bossNode = baseRun.map!.nodes.find((node) => node.type === "boss")!;
    const run = {
      ...baseRun,
      status: "combat" as const,
      map: {
        ...baseRun.map!,
        currentNodeId: bossNode.id,
        nodes: baseRun.map!.nodes.map((node) =>
          node.id === bossNode.id
            ? { ...node, status: "active" as const, encounterId: encounterId("missing_boss_encounter") }
            : node
        )
      }
    };
    const result = completeRunCombatNode({
      run,
      combat: createWonCombatFixture({ id: run.id }),
      registry: starterRegistry,
      petInstances: [createEmberFoxInstanceFixture()]
    });

    expect(result.ok).toBe(false);
    expect(result.state).toBe(run);
    expect(result.errors.map((error) => error.code)).toEqual(["missing_encounter"]);
  });

  it("rejects won boss completion when the boss encounter has no monster ids", () => {
    const baseRun = createStartedRunFixture();
    const bossNode = baseRun.map!.nodes.find((node) => node.type === "boss")!;
    const run = {
      ...baseRun,
      status: "combat" as const,
      map: {
        ...baseRun.map!,
        currentNodeId: bossNode.id,
        nodes: baseRun.map!.nodes.map((node) =>
          node.id === bossNode.id ? { ...node, status: "active" as const } : node
        )
      }
    };
    const result = completeRunCombatNode({
      run,
      combat: createWonCombatFixture({ id: run.id }),
      registry: {
        ...starterRegistry,
        encounters: starterRegistry.encounters.map((encounter) =>
          encounter.id === bossNode.encounterId ? { ...encounter, monsterIds: [] } : encounter
        )
      },
      petInstances: [createEmberFoxInstanceFixture()]
    });

    expect(result.ok).toBe(false);
    expect(result.state).toBe(run);
    expect(result.errors.map((error) => error.code)).toEqual(["missing_encounter_monster_ids"]);
  });

  it("rejects combat completion before combat ends", () => {
    const run = selectRunNode(
      createStartedRunFixture(),
      runNodeId("act1_forest_0_combat_a")
    ).state;
    const result = completeRunCombatNode({
      run,
      combat: { ...createWonCombatFixture({ id: run.id }), phase: "player_turn" },
      registry: starterRegistry,
      petInstances: [createEmberFoxInstanceFixture()]
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toEqual(["combat_not_ended"]);
  });

  it("rejects combat start when no active combat node exists", () => {
    const result = startCombatForRunNode({
      run: createStartedRunFixture({ status: "combat" }),
      registry: starterRegistry,
      petInstances: [createEmberFoxInstanceFixture()]
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toEqual(["invalid_active_combat_node"]);
  });

  it("rejects combat start when the encounter has no monster ids", () => {
    const run = selectRunNode(
      createStartedRunFixture(),
      runNodeId("act1_forest_0_combat_a")
    ).state;
    const result = startCombatForRunNode({
      run,
      registry: {
        ...starterRegistry,
        encounters: starterRegistry.encounters.map((encounter) =>
          encounter.id === run.map!.nodes.find((node) => node.status === "active")!.encounterId
            ? { ...encounter, monsterIds: [] }
            : encounter
        )
      },
      petInstances: [createEmberFoxInstanceFixture()]
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toEqual(["missing_encounter_monster_ids"]);
  });

  it("rejects won combat completion when the active node encounter is missing", () => {
    const selected = selectRunNode(
      createStartedRunFixture(),
      runNodeId("act1_forest_0_combat_a")
    );
    const run = {
      ...selected.state,
      map: {
        ...selected.state.map!,
        nodes: selected.state.map!.nodes.map((node) =>
          node.status === "active" ? { ...node, encounterId: encounterId("missing_encounter") } : node
        )
      }
    };
    const result = completeRunCombatNode({
      run,
      combat: createWonCombatFixture({ id: run.id }),
      registry: starterRegistry,
      petInstances: [createEmberFoxInstanceFixture()]
    });

    expect(result.ok).toBe(false);
    expect(result.state).toBe(run);
    expect(result.errors.map((error) => error.code)).toEqual(["missing_encounter"]);
  });
});
