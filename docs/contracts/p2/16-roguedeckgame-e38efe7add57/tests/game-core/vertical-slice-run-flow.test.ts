import { describe, expect, it } from "vitest";
import {
  claimRunPendingReward,
  completeRunCombatNode,
  completeRunNonCombatNode,
  createRun,
  encounterId,
  monsterId,
  playerClassId,
  runNodeId,
  selectRunNode,
  skipRunPendingReward,
  startCombatForRunNode,
  starterRegistry,
  type CombatState,
  type PetInstance,
  type RunState,
  type RunNodeType
} from "../../src/game-core";
import { createEmberFoxInstanceFixture } from "../../src/game-core/testing/fixtures";

const createSliceRun = (seed = "vertical-slice-core") => {
  const petInstances = [createEmberFoxInstanceFixture()];
  const created = createRun({
    seed,
    playerClassId: playerClassId("novice_tamer"),
    activePetInstanceIds: [petInstances[0].id],
    petInstances,
    registry: starterRegistry
  });

  expect(created.ok).toBe(true);
  return { run: created.state, petInstances };
};

const forceWonCombat = (combat: CombatState): CombatState => ({
  ...combat,
  phase: "won",
  monsters: combat.monsters.map((monster) => ({ ...monster, hp: 0, alive: false })),
  monsterIntents: []
});

const forceLostCombat = (combat: CombatState): CombatState => ({
  ...combat,
  phase: "lost",
  player: { ...combat.player, hp: 0, alive: false },
  monsterIntents: []
});

const selectAndStart = (
  run: RunState,
  petInstances: readonly PetInstance[],
  nodeType: RunNodeType,
  seed: string
) => {
  const node = run.map!.nodes.find((candidate) => candidate.status === "available" && candidate.type === nodeType);

  expect(node).toBeDefined();
  const selected = selectRunNode(run, node!.id);
  expect(selected.ok).toBe(true);

  const combat = startCombatForRunNode({
    run: selected.state,
    registry: starterRegistry,
    petInstances,
    seed
  });
  expect(combat.ok).toBe(true);

  return { node: node!, selected: selected.state, combat: combat.state };
};

describe("vertical slice run flow", () => {
  it("can complete the deterministic first slice through elite and boss without Phaser", () => {
    const slice = createSliceRun();
    const { petInstances } = slice;
    let run = slice.run;

    const first = selectAndStart(run, petInstances, "combat", "slice-normal-combat");
    expect(first.combat.monsters.length).toBeGreaterThan(0);

    const normalCompleted = completeRunCombatNode({
      run: first.selected,
      combat: forceWonCombat(first.combat),
      registry: starterRegistry,
      petInstances,
      rewardSeed: "slice-normal-reward"
    });
    expect(normalCompleted.state.status).toBe("reward");
    expect(normalCompleted.state.pendingRewardOffer?.status).toBe("open");

    const normalReward = normalCompleted.state.pendingRewardOffer!.options[0]
      ? claimRunPendingReward({
          run: normalCompleted.state,
          selectedOptionId: normalCompleted.state.pendingRewardOffer!.options[0].id,
          registry: starterRegistry,
          petInstances
        })
      : skipRunPendingReward({ run: normalCompleted.state, petInstances });
    expect(normalReward.ok).toBe(true);
    run = normalReward.state.run;

    const eventNode = run.map!.nodes.find((node) => node.status === "available" && node.type === "event");
    expect(eventNode).toBeDefined();
    const selectedEvent = selectRunNode(run, eventNode!.id);
    expect(selectedEvent.ok).toBe(true);
    const completedEvent = completeRunNonCombatNode(selectedEvent.state);
    expect(completedEvent.ok).toBe(true);

    const restNode = completedEvent.state.map!.nodes.find((node) => node.status === "available" && node.type === "rest");
    expect(restNode).toBeDefined();
    const selectedRest = selectRunNode(completedEvent.state, restNode!.id);
    expect(selectedRest.ok).toBe(true);
    const completedRest = completeRunNonCombatNode(selectedRest.state);
    expect(completedRest.ok).toBe(true);
    run = completedRest.state;

    const elite = selectAndStart(run, petInstances, "elite", "slice-elite-combat");
    expect(elite.node.encounterId).toBe(encounterId("forest_elite_placeholder"));
    expect(elite.combat.monsters.map((monster) => monster.definitionId)).toEqual([monsterId("charred_stag")]);

    const eliteCompleted = completeRunCombatNode({
      run: elite.selected,
      combat: forceWonCombat(elite.combat),
      registry: starterRegistry,
      petInstances,
      rewardSeed: "slice-elite-reward"
    });
    expect(eliteCompleted.state.status).toBe("reward");
    const eliteSkipped = skipRunPendingReward({ run: eliteCompleted.state, petInstances });
    expect(eliteSkipped.ok).toBe(true);
    run = eliteSkipped.state.run;

    const boss = selectAndStart(run, petInstances, "boss", "slice-boss-combat");
    expect(boss.node.id).toBe(runNodeId("act1_forest_4_boss_a"));
    expect(boss.node.encounterId).toBe(encounterId("forest_boss_placeholder"));
    expect(boss.combat.monsters.map((monster) => monster.definitionId)).toEqual([monsterId("forest_warden")]);

    const bossCompleted = completeRunCombatNode({
      run: boss.selected,
      combat: forceWonCombat(boss.combat),
      registry: starterRegistry,
      petInstances
    });

    expect(bossCompleted.ok).toBe(true);
    expect(bossCompleted.state.status).toBe("completed");
    expect(bossCompleted.events.map((event) => event.type)).toEqual([
      "RunCombatCompleted",
      "RunNodeCompleted",
      "RunAdvanced",
      "RunEnded"
    ]);
  });

  it("marks combat loss as a lost run", () => {
    const { run, petInstances } = createSliceRun("vertical-slice-loss");
    const first = selectAndStart(run, petInstances, "combat", "slice-loss-combat");
    const lost = completeRunCombatNode({
      run: first.selected,
      combat: forceLostCombat(first.combat),
      registry: starterRegistry,
      petInstances
    });

    expect(lost.ok).toBe(true);
    expect(lost.state.status).toBe("lost");
    expect(lost.events.map((event) => event.type)).toEqual(["RunCombatCompleted", "RunEnded"]);
  });

  it("uses the same path setup for the same seed", () => {
    const left = createSliceRun("vertical-slice-determinism").run.map!.nodes;
    const right = createSliceRun("vertical-slice-determinism").run.map!.nodes;

    expect(left.map((node) => [node.id, node.type, node.status, node.encounterId])).toEqual(
      right.map((node) => [node.id, node.type, node.status, node.encounterId])
    );
  });
});
