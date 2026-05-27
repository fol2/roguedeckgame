import { describe, expect, it } from "vitest";
import {
  cardInstanceId,
  runNodeId
} from "../../src/game-core";
import { createRunSandboxController } from "../../src/game-phaser/controllers/RunSandboxController";

const firstAvailableNode = (
  controller: ReturnType<typeof createRunSandboxController>,
  predicate: (type: string) => boolean
) => controller.getRunViewModel().nodes.find((node) =>
  node.status === "available" && predicate(node.type)
);

const startFirstCombat = (controller: ReturnType<typeof createRunSandboxController>) => {
  const node = firstAvailableNode(controller, (type) => type === "combat" || type === "elite" || type === "boss");

  expect(node).toBeDefined();
  return controller.selectMapNode(node!.id);
};

const finishCombat = (controller: ReturnType<typeof createRunSandboxController>): void => {
  let requestIndex = 0;

  for (let turn = 0; turn < 20; turn += 1) {
    const combat = controller.getCombatViewModel();

    if (!combat || combat.phase === "won" || combat.phase === "lost") {
      return;
    }

    const attack = combat.hand.find((card) => card.playable && (
      card.cardId === "strike" ||
      card.cardId === "fox_bite" ||
      card.tags.includes("attack") ||
      card.tags.includes("burn")
    ));

    if (attack) {
      requestIndex += 1;
      controller.playHandCard(attack.cardInstanceId, undefined, undefined, `finish-card-${requestIndex}`);
      continue;
    }

    const playable = combat.hand.find((card) => card.playable);
    if (playable) {
      requestIndex += 1;
      controller.playHandCard(playable.cardInstanceId, undefined, undefined, `finish-card-${requestIndex}`);
      continue;
    }

    requestIndex += 1;
    controller.endTurn(undefined, `finish-turn-${requestIndex}`);
  }
};

describe("Run sandbox controller", () => {
  it("starts with deterministic map selection state", () => {
    const controller = createRunSandboxController("run-controller-create");
    const state = controller.getState();

    expect(state.run.status).toBe("map_select");
    expect(state.run.activePetInstanceIds).toHaveLength(1);
    expect(state.petInstances).toHaveLength(1);
    expect(state.petInstances[0]?.definitionId).toBe("ember_fox");
    expect(state.combat).toBeUndefined();
    expect(state.lastEvents.map((event) => event.type)).toContain("RunCreated");
  });

  it("selects an available combat node and starts combat with returned events", () => {
    const controller = createRunSandboxController("run-controller-combat");
    const result = startFirstCombat(controller);

    expect(result.ok).toBe(true);
    expect(result.state.run.status).toBe("combat");
    expect(result.state.combat?.phase).toBe("player_turn");
    expect(result.events.map((event) => event.type)).toEqual(expect.arrayContaining([
      "RunNodeSelected",
      "RunCombatStarted",
      "CombatStarted"
    ]));
  });

  it("rejects missing nodes and preserves useful event messages", () => {
    const controller = createRunSandboxController("run-controller-reject");
    const before = controller.getState().run;
    const result = controller.selectMapNode(runNodeId("missing-node"));

    expect(result.ok).toBe(false);
    expect(result.state.run).toBe(before);
    expect(result.events[0]?.type).toBe("ActionRejected");
    expect(controller.getRunViewModel().eventMessages[0]).toContain("Rejected:");
  });

  it("rejects locked nodes and preserves useful event messages", () => {
    const controller = createRunSandboxController("run-controller-locked-node");
    const lockedNode = controller.getRunViewModel().nodes.find((node) => node.status === "locked");

    expect(lockedNode).toBeDefined();
    const result = controller.selectMapNode(lockedNode!.id);

    expect(result.ok).toBe(false);
    expect(result.events[0]).toMatchObject({
      type: "ActionRejected",
      code: "run_node_not_available"
    });
    expect(controller.getRunViewModel().eventMessages[0]).toContain("Rejected:");
  });

  it("delegates card play and end turn while keeping combat state current", () => {
    const controller = createRunSandboxController("run-controller-actions");

    startFirstCombat(controller);
    const card = controller.getCombatViewModel()?.hand.find((candidate) => candidate.playable);

    expect(card).toBeDefined();
    const cardResult = controller.playHandCard(card!.cardInstanceId, undefined, undefined, "run-actions-card");

    expect(cardResult.ok).toBe(true);
    expect(cardResult.events.map((event) => event.type)).toContain("CardPlayed");

    const turnResult = controller.endTurn(undefined, "run-actions-turn");

    expect(turnResult.ok).toBe(true);
    expect(turnResult.events.map((event) => event.type)).toEqual(expect.arrayContaining([
      "TurnEnded",
      "TurnStarted"
    ]));
  });

  it("keeps rejected combat actions in the controller event stream", () => {
    const controller = createRunSandboxController("run-controller-bad-card");

    startFirstCombat(controller);
    const result = controller.playHandCard(cardInstanceId("missing-card-instance"), undefined, undefined, "run-bad-card");

    expect(result.ok).toBe(false);
    expect(result.events[0]?.type).toBe("ActionRejected");
    expect(controller.getCombatViewModel()?.eventMessages[0]).toContain("Rejected:");
  });

  it("rejects stale combat revisions before mutating run combat state", () => {
    const controller = createRunSandboxController("run-controller-stale-revision");

    startFirstCombat(controller);
    const staleRevision = controller.getCombatViewModel()!.revision;
    const firstEndTurn = controller.endTurn(staleRevision, "run-stale-first");

    expect(firstEndTurn.ok).toBe(true);
    expect(controller.getCombatViewModel()!.revision).toBeGreaterThan(staleRevision);

    const beforeCombat = controller.getState().combat;
    const stale = controller.endTurn(staleRevision, "run-stale-second");

    expect(stale.ok).toBe(false);
    expect(stale.state.combat).toBe(beforeCombat);
    expect(stale.events[0]).toMatchObject({
      type: "ActionRejected",
      code: "stale_combat_revision",
      path: "combat.revision"
    });
  });

  it("rejects duplicate gameplay request ids before applying a second action", () => {
    const controller = createRunSandboxController("run-controller-duplicate-request");

    startFirstCombat(controller);
    const viewModel = controller.getCombatViewModel()!;
    const first = controller.endTurn(viewModel.revision, "run-duplicate-request");

    expect(first.ok).toBe(true);
    const beforeCombat = controller.getState().combat;
    const duplicate = controller.endTurn(controller.getCombatViewModel()!.revision, "run-duplicate-request");

    expect(duplicate.ok).toBe(false);
    expect(duplicate.state.combat).toBe(beforeCombat);
    expect(duplicate.events[0]).toMatchObject({
      type: "ActionRejected",
      code: "duplicate_request",
      path: "requestId"
    });
  });

  it("rejects missing gameplay request ids before applying combat actions", () => {
    const controller = createRunSandboxController("run-controller-missing-request");

    startFirstCombat(controller);
    const viewModel = controller.getCombatViewModel()!;
    const card = viewModel.hand.find((candidate) => candidate.playable);

    expect(card).toBeDefined();
    const beforeCombat = controller.getState().combat;
    const missing = controller.playHandCard(card!.cardInstanceId, undefined, viewModel.revision, "");

    expect(missing.ok).toBe(false);
    expect(missing.state.combat).toBe(beforeCombat);
    expect(missing.events[0]).toMatchObject({
      type: "ActionRejected",
      code: "missing_request_id",
      path: "requestId"
    });
  });

  it("completes won combat into a pending reward, then claims the reward back to map selection", () => {
    const controller = createRunSandboxController("run-controller-claim");

    startFirstCombat(controller);
    finishCombat(controller);
    expect(controller.getCombatViewModel()?.phase).toBe("won");

    const completeResult = controller.completeCombatIfEnded();

    expect(completeResult.ok).toBe(true);
    expect(completeResult.state.run.status).toBe("reward");
    expect(completeResult.state.run.pendingRewardOffer?.status).toBe("open");

    const rewardOption = controller.getRewardViewModel()?.options[0];

    expect(rewardOption).toBeDefined();
    const claimResult = controller.claimRewardOption(rewardOption!.id);

    expect(claimResult.ok).toBe(true);
    expect(claimResult.state.run.status).toBe("map_select");
    expect(claimResult.state.run.pendingRewardOffer).toBeUndefined();
    expect(claimResult.events.map((event) => event.type)).toEqual(expect.arrayContaining([
      "RewardSelected",
      "RunNodeCompleted",
      "RunAdvanced"
    ]));
  });

  it("skips a pending reward back to map selection", () => {
    const controller = createRunSandboxController("run-controller-skip");

    startFirstCombat(controller);
    finishCombat(controller);
    expect(controller.getCombatViewModel()?.phase).toBe("won");
    controller.completeCombatIfEnded();

    const skipResult = controller.skipReward();

    expect(skipResult.ok).toBe(true);
    expect(skipResult.state.run.status).toBe("map_select");
    expect(skipResult.state.run.pendingRewardOffer).toBeUndefined();
    expect(skipResult.events.map((event) => event.type)).toContain("RewardSkipped");
  });

  it("preserves active combat when reward or non-combat actions reject", () => {
    const controller = createRunSandboxController("run-controller-reject-preserve");

    startFirstCombat(controller);
    const beforeCombat = controller.getState().combat;

    expect(beforeCombat).toBeDefined();
    const rewardResult = controller.skipReward();

    expect(rewardResult.ok).toBe(false);
    expect(rewardResult.state.combat).toBe(beforeCombat);
    expect(controller.getState().combat).toBe(beforeCombat);
    expect(controller.getCombatViewModel()?.eventMessages[0]).toContain("Rejected:");

    const nonCombatResult = controller.completeNonCombatNode();

    expect(nonCombatResult.ok).toBe(false);
    expect(nonCombatResult.state.combat).toBe(beforeCombat);
    expect(controller.getState().combat).toBe(beforeCombat);
  });

  it("completes event and rest placeholders structurally", () => {
    const controller = createRunSandboxController("run-controller-non-combat");

    startFirstCombat(controller);
    finishCombat(controller);
    controller.completeCombatIfEnded();
    controller.skipReward();

    const eventNode = firstAvailableNode(controller, (type) => type === "event");

    expect(eventNode).toBeDefined();
    const selected = controller.selectMapNode(eventNode!.id);
    const completed = controller.completeNonCombatNode();

    expect(selected.ok).toBe(true);
    expect(completed.ok).toBe(true);
    expect(completed.state.run.status).toBe("map_select");
    expect(completed.events.map((event) => event.type)).toEqual(expect.arrayContaining([
      "RunNodeCompleted",
      "RunAdvanced"
    ]));

    const restNode = firstAvailableNode(controller, (type) => type === "rest");

    expect(restNode).toBeDefined();
    const selectedRest = controller.selectMapNode(restNode!.id);
    const completedRest = controller.completeNonCombatNode();

    expect(selectedRest.ok).toBe(true);
    expect(completedRest.ok).toBe(true);
    expect(completedRest.state.run.status).toBe("map_select");
    expect(completedRest.events.map((event) => event.type)).toEqual(expect.arrayContaining([
      "RunNodeCompleted",
      "RunAdvanced"
    ]));
  });

  it("reset returns to the deterministic initial map selection", () => {
    const controller = createRunSandboxController("run-controller-reset");

    startFirstCombat(controller);
    expect(controller.getState().run.status).toBe("combat");

    const result = controller.reset();

    expect(result.ok).toBe(true);
    expect(result.state.run.status).toBe("map_select");
    expect(result.state.combat).toBeUndefined();
    expect(result.state.run.map?.nodes.filter((node) => node.status === "available")).toHaveLength(2);
  });

  it("reset restores deterministic action RNG for future combat actions", () => {
    const controller = createRunSandboxController("run-controller-reset-rng");

    startFirstCombat(controller);
    const preResetCard = controller.getCombatViewModel()?.hand.find((card) => card.playable);

    expect(preResetCard).toBeDefined();
    controller.playHandCard(preResetCard!.cardInstanceId, undefined, undefined, "run-reset-pre-card");
    controller.reset();
    startFirstCombat(controller);

    const fresh = createRunSandboxController("run-controller-reset-rng");

    startFirstCombat(fresh);
    const resetCard = controller.getCombatViewModel()?.hand.find((card) => card.playable);
    const freshCard = fresh.getCombatViewModel()?.hand.find((card) => card.playable);

    expect(resetCard?.cardId).toBe(freshCard?.cardId);
    expect(controller.playHandCard(resetCard!.cardInstanceId, undefined, undefined, "run-reset-card").events).toEqual(
      fresh.playHandCard(freshCard!.cardInstanceId, undefined, undefined, "run-reset-card").events
    );
  });

  it("returns serializable state and view models", () => {
    const controller = createRunSandboxController("run-controller-json");

    startFirstCombat(controller);
    finishCombat(controller);
    controller.completeCombatIfEnded();
    const payload = {
      state: controller.getState(),
      run: controller.getRunViewModel(),
      combat: controller.getCombatViewModel(),
      reward: controller.getRewardViewModel()
    };

    expect(payload.reward).toBeDefined();
    expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
  });
});
