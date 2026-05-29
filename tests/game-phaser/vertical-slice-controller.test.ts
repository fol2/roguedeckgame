import { describe, expect, it } from "vitest";
import { cardInstanceId, type CombatPhase } from "../../src/game-core";
import { createRunSandboxController } from "../../src/game-phaser/controllers/RunSandboxController";

let controllerRequestIndex = 0;

const nextControllerRequestId = (prefix: string): string => {
  controllerRequestIndex += 1;
  return `${prefix}-${controllerRequestIndex}`;
};

const firstAvailableNode = (
  controller: ReturnType<typeof createRunSandboxController>,
  type: string
) => controller.getRunViewModel().nodes.find((node) => node.status === "available" && node.type === type);

const forceCombatPhase = (
  controller: ReturnType<typeof createRunSandboxController>,
  phase: Extract<CombatPhase, "won" | "lost">
): void => {
  const combat = controller.getState().combat;

  expect(combat).toBeDefined();
  if (phase === "won") {
    Object.assign(combat!, {
      phase,
      monsters: combat!.monsters.map((monster) => ({ ...monster, hp: 0, alive: false })),
      monsterIntents: []
    });
    return;
  }

  Object.assign(combat!, {
    phase,
    player: { ...combat!.player, hp: 0, alive: false },
    monsterIntents: []
  });
};

const selectNode = (
  controller: ReturnType<typeof createRunSandboxController>,
  type: string
) => {
  const node = firstAvailableNode(controller, type);

  expect(node).toBeDefined();
  const result = controller.selectMapNode(node!.id, controller.getRevision(), nextControllerRequestId("map-select"));

  expect(result.ok).toBe(true);
  return result;
};

const winCurrentCombat = (
  controller: ReturnType<typeof createRunSandboxController>
) => {
  forceCombatPhase(controller, "won");
  const result = controller.completeCombatIfEnded(controller.getRevision(), nextControllerRequestId("complete-combat"));

  expect(result.ok).toBe(true);
  return result;
};

const skipCurrentReward = (
  controller: ReturnType<typeof createRunSandboxController>
) => {
  const result = controller.skipReward(controller.getRevision(), nextControllerRequestId("reward-skip"));

  expect(result.ok).toBe(true);
  return result;
};

describe("vertical slice controller flow", () => {
  it("starts on map selection and can enter combat", () => {
    const controller = createRunSandboxController("vertical-controller-start");

    expect(controller.getRunViewModel()).toMatchObject({
      status: "map_select",
      resetAvailable: false
    });

    const result = selectNode(controller, "combat");

    expect(result.state.run.status).toBe("combat");
    expect(controller.getCombatViewModel()?.encounterLabel).toEqual(expect.any(String));
  });

  it("completes won combat into reward and claims back to the map", () => {
    const controller = createRunSandboxController("vertical-controller-reward");

    selectNode(controller, "combat");
    const completed = winCurrentCombat(controller);

    expect(completed.state.run.status).toBe("reward");
    expect(completed.state.combat).toBeUndefined();
    expect(controller.getRewardViewModel()?.skipAvailable).toBe(true);

    const rewardOption = controller.getRewardViewModel()?.options[0];

    expect(rewardOption).toBeDefined();
    const claimed = controller.claimRewardOption(rewardOption!.id, controller.getRevision(), nextControllerRequestId("reward-claim"));

    expect(claimed.ok).toBe(true);
    expect(claimed.state.run.status).toBe("map_select");
    expect(controller.getRunViewModel().nodes.filter((node) => node.status === "available").map((node) => node.type)).toEqual([
      "combat",
      "event"
    ]);
  });

  it("can complete event and rest placeholders", () => {
    const controller = createRunSandboxController("vertical-controller-placeholders");

    selectNode(controller, "combat");
    winCurrentCombat(controller);
    skipCurrentReward(controller);

    selectNode(controller, "event");
    const eventCompleted = controller.completeNonCombatNode(controller.getRevision(), nextControllerRequestId("event-complete"));

    expect(eventCompleted.ok).toBe(true);
    expect(eventCompleted.state.run.status).toBe("map_select");

    selectNode(controller, "rest");
    const restCompleted = controller.completeNonCombatNode(controller.getRevision(), nextControllerRequestId("rest-complete"));

    expect(restCompleted.ok).toBe(true);
    expect(restCompleted.state.run.status).toBe("map_select");
  });

  it("can reach elite and boss completion through the controller", () => {
    const controller = createRunSandboxController("vertical-controller-boss");

    selectNode(controller, "combat");
    winCurrentCombat(controller);
    skipCurrentReward(controller);
    selectNode(controller, "event");
    controller.completeNonCombatNode(controller.getRevision(), nextControllerRequestId("non-combat-complete"));
    selectNode(controller, "rest");
    controller.completeNonCombatNode(controller.getRevision(), nextControllerRequestId("non-combat-complete"));

    selectNode(controller, "elite");
    expect(controller.getCombatViewModel()).toMatchObject({
      runNodeType: "elite",
      encounterLabel: "Charred Stag Warband"
    });
    winCurrentCombat(controller);
    skipCurrentReward(controller);

    selectNode(controller, "boss");
    expect(controller.getCombatViewModel()).toMatchObject({
      runNodeType: "boss",
      encounterLabel: "Emberroot Warden Guard"
    });
    const completed = winCurrentCombat(controller);

    expect(completed.state.run.status).toBe("completed");
    expect(completed.state.combat).toBeUndefined();
    expect(controller.getRunViewModel().resetAvailable).toBe(true);

    const reset = controller.reset();

    expect(reset.ok).toBe(true);
    expect(reset.state.run.status).toBe("map_select");
  });

  it("can reset after a lost run", () => {
    const controller = createRunSandboxController("vertical-controller-lost");

    selectNode(controller, "combat");
    forceCombatPhase(controller, "lost");
    const lost = controller.completeCombatIfEnded(controller.getRevision(), nextControllerRequestId("complete-combat"));

    expect(lost.ok).toBe(true);
    expect(lost.state.run.status).toBe("lost");
    expect(lost.state.combat).toBeUndefined();
    expect(controller.getRunViewModel().resetAvailable).toBe(true);

    const reset = controller.reset();

    expect(reset.state.run.status).toBe("map_select");
    expect(reset.state.combat).toBeUndefined();
  });

  it("returns serializable view models and preserves rejected event messages", () => {
    const controller = createRunSandboxController("vertical-controller-json");

    selectNode(controller, "combat");
    const rejected = controller.playHandCard(cardInstanceId("missing-card"), undefined, undefined, "vertical-json-reject");

    expect(rejected.ok).toBe(false);
    expect(controller.getCombatViewModel()?.eventMessages[0]).toContain("Rejected:");

    const payload = {
      state: controller.getState(),
      run: controller.getRunViewModel(),
      combat: controller.getCombatViewModel(),
      reward: controller.getRewardViewModel()
    };

    expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
  });
});
