import { describe, expect, it } from "vitest";
import {
  claimRunPendingReward,
  completeRunCombatNode,
  createRun,
  playerClassId,
  selectRunNode,
  skipRunPendingReward,
  startCombatForRunNode,
  starterRegistry
} from "../../src/game-core";
import { createEmberFoxInstanceFixture } from "../../src/game-core/testing/fixtures";

describe("run integration", () => {
  it("creates, selects, starts, wins, settles reward, advances, and selects the next node", () => {
    const petInstances = [createEmberFoxInstanceFixture()];
    const created = createRun({
      seed: "full-run-path",
      playerClassId: playerClassId("novice_tamer"),
      activePetInstanceIds: [petInstances[0].id],
      petInstances,
      registry: starterRegistry
    });
    const firstNode = created.state.map!.nodes.find((node) => node.status === "available" && node.type === "combat")!;
    const selected = selectRunNode(created.state, firstNode.id);
    const combat = startCombatForRunNode({
      run: selected.state,
      registry: starterRegistry,
      petInstances,
      seed: "full-run-combat"
    });
    const wonCombat = {
      ...combat.state,
      phase: "won" as const,
      monsters: combat.state.monsters.map((monster) => ({ ...monster, hp: 0, alive: false })),
      monsterIntents: []
    };
    const completed = completeRunCombatNode({
      run: selected.state,
      combat: wonCombat,
      registry: starterRegistry,
      petInstances,
      rewardSeed: "full-run-reward"
    });
    const option = completed.state.pendingRewardOffer!.options[0];
    const settled = option
      ? claimRunPendingReward({
          run: completed.state,
          selectedOptionId: option.id,
          registry: starterRegistry,
          petInstances
        })
      : skipRunPendingReward({ run: completed.state, petInstances });
    const nextNode = settled.state.run.map!.nodes.find((node) => node.status === "available")!;
    const nextSelected = selectRunNode(settled.state.run, nextNode.id);

    expect(created.ok).toBe(true);
    expect(selected.ok).toBe(true);
    expect(combat.ok).toBe(true);
    expect(completed.state.status).toBe("reward");
    expect(settled.ok).toBe(true);
    expect(settled.state.run.map!.nodes.filter((node) => node.status === "available").length).toBeGreaterThan(0);
    expect(nextSelected.ok).toBe(true);
  });
});
