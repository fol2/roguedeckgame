import { describe, expect, it } from "vitest";
import {
  upgradeId
} from "../../src/game-core";
import {
  createAgentRunDriver,
  getLegalAgentActions,
  deterministicSmokePolicy,
  type AgentRunDriverSnapshot
} from "../../src/game-core/testing";
import { createEmberFoxInstanceFixture } from "../../src/game-core/testing/fixtures";

const driveUntil = (
  predicate: (snapshot: AgentRunDriverSnapshot) => boolean,
  seed = "action-space"
): AgentRunDriverSnapshot => {
  const driver = createAgentRunDriver({ seed });
  for (let step = 0; step < 200; step += 1) {
    const snapshot = driver.getSnapshot();
    if (predicate(snapshot)) {
      return snapshot;
    }
    const action = deterministicSmokePolicy(snapshot);
    if (!action) {
      return snapshot;
    }
    driver.applyAction(action, "policy");
  }
  return driver.getSnapshot();
};

describe("agent action space", () => {
  it("exposes initial available map node actions and excludes locked nodes", () => {
    const driver = createAgentRunDriver({ seed: "action-space-initial" });
    const actions = driver.getLegalActions();

    expect(actions.map((action) => action.type)).toEqual(["selectMapNode", "selectMapNode"]);
    expect(actions).toEqual([
      { type: "selectMapNode", nodeId: "act1_forest_0_combat_a" },
      { type: "selectMapNode", nodeId: "act1_forest_0_combat_b" }
    ]);
    expect(actions).not.toContainEqual({ type: "selectMapNode", nodeId: "act1_forest_1_combat_a" });
  });

  it("selecting combat exposes playable combat actions with explicit targets", () => {
    const driver = createAgentRunDriver({ seed: "action-space-combat" });
    driver.applyAction(driver.getLegalActions()[0], "legal");
    const actions = driver.getLegalActions();

    expect(actions.some((action) => action.type === "endTurn")).toBe(true);
    expect(actions.some((action) => action.type === "playCard" && Boolean(action.targetId))).toBe(true);
  });

  it("treats pet-command cost modifiers as playable legal actions", () => {
    const driver = createAgentRunDriver({
      seed: "action-space-warm-bond",
      petInstances: [createEmberFoxInstanceFixture({ unlockedUpgradeIds: [upgradeId("warm_bond")] })]
    });
    driver.applyAction(driver.getLegalActions()[0], "legal");
    const snapshot = driver.getSnapshot();
    const foxBite = snapshot.combat!.cardInstances.find((cardInstance) => cardInstance.cardId === "fox_bite")!;
    const discountedSnapshot = {
      ...snapshot,
      combat: {
        ...snapshot.combat!,
        energy: 0,
        hand: [foxBite.id]
      }
    };

    expect(getLegalAgentActions(discountedSnapshot).some((action) => action.type === "playCard" && action.cardInstanceId === foxBite.id)).toBe(true);
  });

  it("won and lost combat expose completeCombatIfEnded", () => {
    const combatSnapshot = driveUntil((snapshot) => snapshot.combat?.phase === "player_turn", "action-space-ended");
    const wonSnapshot = {
      ...combatSnapshot,
      combat: {
        ...combatSnapshot.combat!,
        phase: "won" as const,
        monsters: combatSnapshot.combat!.monsters.map((monster) => ({ ...monster, hp: 0, alive: false }))
      }
    };
    const lostSnapshot = {
      ...combatSnapshot,
      combat: {
        ...combatSnapshot.combat!,
        phase: "lost" as const,
        player: { ...combatSnapshot.combat!.player, hp: 0, alive: false }
      }
    };

    expect(getLegalAgentActions(wonSnapshot)).toEqual([{ type: "completeCombatIfEnded" }]);
    expect(getLegalAgentActions(lostSnapshot)).toEqual([{ type: "completeCombatIfEnded" }]);
  });

  it("reward state exposes claim actions plus skip", () => {
    const rewardSnapshot = driveUntil((snapshot) => snapshot.run.status === "reward", "action-space-reward");
    const actions = getLegalAgentActions(rewardSnapshot);

    expect(actions.filter((action) => action.type === "claimReward")).toHaveLength(
      rewardSnapshot.run.pendingRewardOffer?.options.length ?? 0
    );
    expect(actions.at(-1)).toEqual({ type: "skipReward" });
  });

  it("completed and lost runs expose no legal gameplay actions", () => {
    const completed = driveUntil((snapshot) => snapshot.run.status === "completed", "agent-smoke");
    const lost = { ...completed, run: { ...completed.run, status: "lost" as const } };

    expect(getLegalAgentActions(completed)).toEqual([]);
    expect(getLegalAgentActions(lost)).toEqual([]);
  });
});
