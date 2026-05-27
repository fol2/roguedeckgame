import { describe, expect, it } from "vitest";
import { createRunSandboxController } from "../../src/game-phaser/controllers/RunSandboxController";
import {
  beginCombatActionSubmission,
  type CombatActionSubmissionSnapshot
} from "../../src/game-phaser/interaction/combat-action-submission";
import { resolveCombatInputLockState } from "../../src/game-phaser/interaction/combat-interaction-state";

const startCombat = (controller: ReturnType<typeof createRunSandboxController>): void => {
  const node = controller.getRunViewModel().nodes.find((candidate) => candidate.status === "available" && candidate.type === "combat");

  expect(node).toBeDefined();
  controller.selectMapNode(node!.id);
};

describe("combat action submission", () => {
  it("accepts one gameplay request and blocks a double-submit while playback is locked", () => {
    const controller = createRunSandboxController("submission-double-click");
    startCombat(controller);
    let snapshot: CombatActionSubmissionSnapshot = { nextRequestId: 1 };
    let submitted = 0;
    const revision = controller.getCombatViewModel()!.revision;

    const first = beginCombatActionSubmission({
      snapshot,
      lock: resolveCombatInputLockState({
        playbackLocked: false,
        modalOpen: false,
        browserFocused: true
      }),
      expectedRevision: revision,
      getState: () => controller.getState(),
      action: (requestId) => {
        submitted += 1;
        return controller.endTurn(revision, requestId);
      }
    });

    expect(first.status).toBe("accepted");
    expect(first.result.ok).toBe(true);
    expect(submitted).toBe(1);
    snapshot = first.snapshot;

    const duplicateDuringPlayback = beginCombatActionSubmission({
      snapshot,
      lock: resolveCombatInputLockState({
        playbackLocked: true,
        modalOpen: false,
        browserFocused: true
      }),
      expectedRevision: revision,
      getState: () => controller.getState(),
      action: (requestId) => {
        submitted += 1;
        return controller.endTurn(revision, requestId);
      }
    });

    expect(duplicateDuringPlayback.status).toBe("blocked");
    expect(duplicateDuringPlayback.result.events).toEqual([{
      type: "ActionRejected",
      code: "input_locked",
      message: "Gameplay input is locked by playback.",
      path: "combat.input"
    }]);
    expect(duplicateDuringPlayback.snapshot.lastActionRejection).toMatchObject({
      code: "input_locked",
      path: "combat.input",
      requestId: "combat-ui-1",
      expectedRevision: revision
    });
    expect(submitted).toBe(1);
    expect(controller.getCombatViewModel()!.turnNumber).toBe(2);
  });

  it("records stale and duplicate request diagnostics from controller rejections", () => {
    const controller = createRunSandboxController("submission-rejections");
    startCombat(controller);
    let snapshot: CombatActionSubmissionSnapshot = { nextRequestId: 1 };
    const revision = controller.getCombatViewModel()!.revision;

    const first = beginCombatActionSubmission({
      snapshot,
      lock: resolveCombatInputLockState({
        playbackLocked: false,
        modalOpen: false,
        browserFocused: true
      }),
      expectedRevision: revision,
      getState: () => controller.getState(),
      action: (requestId) => controller.endTurn(revision, requestId)
    });
    expect(first.result.ok).toBe(true);
    snapshot = first.snapshot;

    const stale = beginCombatActionSubmission({
      snapshot,
      lock: resolveCombatInputLockState({
        playbackLocked: false,
        modalOpen: false,
        browserFocused: true
      }),
      expectedRevision: revision,
      getState: () => controller.getState(),
      action: (requestId) => controller.endTurn(revision, requestId)
    });

    expect(stale.status).toBe("accepted");
    expect(stale.result.ok).toBe(false);
    expect(stale.snapshot.lastActionRejection).toMatchObject({
      code: "stale_combat_revision",
      path: "combat.revision",
      requestId: "combat-ui-2",
      expectedRevision: revision
    });
    snapshot = { ...stale.snapshot, nextRequestId: 2 };

    const duplicate = beginCombatActionSubmission({
      snapshot,
      lock: resolveCombatInputLockState({
        playbackLocked: false,
        modalOpen: false,
        browserFocused: true
      }),
      expectedRevision: controller.getCombatViewModel()!.revision,
      getState: () => controller.getState(),
      action: (requestId) => controller.endTurn(controller.getCombatViewModel()!.revision, requestId)
    });

    expect(duplicate.result.ok).toBe(false);
    expect(duplicate.snapshot.lastActionRejection).toMatchObject({
      code: "duplicate_request",
      path: "requestId",
      requestId: "combat-ui-2"
    });
  });
});
