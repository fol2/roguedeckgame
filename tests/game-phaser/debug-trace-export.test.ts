import { spawnSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { currentRuntimeMetadata } from "../../src/game-core";
import {
  parseAgentTrace,
  replayAgentTrace
} from "../../src/game-core/testing";
import { createRunSandboxController } from "../../src/game-phaser/controllers/RunSandboxController";
import {
  buildBrowserDebugEventBatchCopyPayload,
  buildBrowserDebugTrace,
  parseBrowserDebugTrace,
  serializeBrowserDebugTrace
} from "../../src/game-phaser/debug/debug-trace-export";

const startCombat = (controller: ReturnType<typeof createRunSandboxController>): void => {
  const node = controller.getRunViewModel().nodes.find((candidate) => candidate.status === "available" && candidate.type === "combat");

  expect(node).toBeDefined();
  controller.selectMapNode(node!.id);
};

describe("browser debug trace export", () => {
  it("exports replay-compatible browser trace JSON with runtime metadata and diagnostics", () => {
    const controller = createRunSandboxController("debug-trace-export");
    startCombat(controller);
    const before = controller.getCombatViewModel()!;
    const playable = before.hand.find((card) => card.playable);

    expect(playable).toBeDefined();
    controller.playHandCard(
      playable!.cardInstanceId,
      playable!.requiresManualTarget ? playable!.validTargetIds[0] : undefined,
      before.revision,
      "debug-trace-card"
    );

    const trace = buildBrowserDebugTrace({
      trace: controller.getAgentTrace(),
      state: controller.getState(),
      playbackObservations: [{
        eventType: "CardMoved",
        policy: "stateSyncOnly",
        visualRoute: "cardMovement",
        startedAt: 1,
        endedAt: 2,
        durationMs: 1,
        outcome: "recovered",
        fallbackUsed: true,
        warningCode: "card_movement_fallback",
        errorSummary: "Card movement fallback was used."
      }]
    });
    const serialized = serializeBrowserDebugTrace(trace);
    const parsedAsAgentTrace = parseAgentTrace(serialized);

    expect(trace.traceKind).toBe("browser-debug");
    expect(trace.runtimeMetadata).toEqual(currentRuntimeMetadata);
    expect(trace.eventBatches.map((batch) => batch.actionType)).toEqual(["selectMapNode", "playCard"]);
    expect(trace.diagnostics).toContainEqual(expect.objectContaining({
      source: "playback",
      code: "card_movement_fallback"
    }));
    expect(trace.conversion.simulationReplayCommand).toBe("npm run sim:replay -- -- --trace <exported-trace>");
    expect(replayAgentTrace(parsedAsAgentTrace).ok).toBe(true);
  });

  it("exports traces accepted by the simulation replay CLI", () => {
    const controller = createRunSandboxController("debug-trace-cli-replay");
    startCombat(controller);
    const before = controller.getCombatViewModel()!;
    const playable = before.hand.find((card) => card.playable);
    expect(playable).toBeDefined();
    controller.playHandCard(
      playable!.cardInstanceId,
      playable!.requiresManualTarget ? playable!.validTargetIds[0] : undefined,
      before.revision,
      "debug-trace-cli-card"
    );
    const tracePath = join(tmpdir(), "roguedeckgame-debug-trace-cli-replay.json");

    writeFileSync(tracePath, serializeBrowserDebugTrace(buildBrowserDebugTrace({
      trace: controller.getAgentTrace(),
      state: controller.getState()
    })), "utf8");

    try {
      const result = spawnSync(process.execPath, [
        "scripts/run-cli-entry.mjs",
        "simulate-runs",
        "--mode",
        "replay",
        "--trace",
        tracePath
      ], {
        cwd: process.cwd(),
        encoding: "utf8",
        shell: false
      });

      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
      expect(result.stdout).toContain("Simulation mode: replay");
      expect(result.stdout).toContain("Result: passed");
    } finally {
      rmSync(tracePath, { force: true });
    }
  });

  it("rejects unsupported browser debug trace versions through the simulation replay CLI", () => {
    const controller = createRunSandboxController("debug-trace-cli-bad-version");
    startCombat(controller);
    const tracePath = join(tmpdir(), "roguedeckgame-debug-trace-bad-version.json");
    const serialized = serializeBrowserDebugTrace(buildBrowserDebugTrace({
      trace: controller.getAgentTrace(),
      state: controller.getState()
    })).replace('"debugTraceVersion": 1', '"debugTraceVersion": 999');

    writeFileSync(tracePath, serialized, "utf8");

    try {
      const result = spawnSync(process.execPath, [
        "scripts/run-cli-entry.mjs",
        "simulate-runs",
        "--mode",
        "replay",
        "--trace",
        tracePath
      ], {
        cwd: process.cwd(),
        encoding: "utf8",
        shell: false
      });

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("Unsupported browser debug trace version '999'.");
    } finally {
      rmSync(tracePath, { force: true });
    }
  });

  it("rejects unsupported debug trace versions without a trace kind through the simulation replay CLI", () => {
    const controller = createRunSandboxController("debug-trace-cli-bad-version-without-kind");
    startCombat(controller);
    const tracePath = join(tmpdir(), "roguedeckgame-debug-trace-bad-version-without-kind.json");
    const withoutTraceKind = JSON.parse(serializeBrowserDebugTrace(buildBrowserDebugTrace({
      trace: controller.getAgentTrace(),
      state: controller.getState()
    }))) as Record<string, unknown>;
    delete withoutTraceKind.traceKind;
    withoutTraceKind.debugTraceVersion = 999;

    writeFileSync(tracePath, `${JSON.stringify(withoutTraceKind, null, 2)}\n`, "utf8");

    try {
      const result = spawnSync(process.execPath, [
        "scripts/run-cli-entry.mjs",
        "simulate-runs",
        "--mode",
        "replay",
        "--trace",
        tracePath
      ], {
        cwd: process.cwd(),
        encoding: "utf8",
        shell: false
      });

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("Unsupported browser debug trace version '999'.");
    } finally {
      rmSync(tracePath, { force: true });
    }
  });

  it("exports current rejected event batches even when agent trace steps are unchanged", () => {
    const controller = createRunSandboxController("debug-trace-current-rejection");
    startCombat(controller);
    const revision = controller.getCombatViewModel()!.revision;

    controller.endTurn(revision, "debug-trace-turn");
    const traceLengthAfterAcceptedAction = controller.getAgentTrace().steps.length;
    controller.endTurn(revision, "debug-trace-stale");

    const batch = buildBrowserDebugEventBatchCopyPayload(controller.getAgentTrace(), controller.getState());
    const trace = buildBrowserDebugTrace({
      trace: controller.getAgentTrace(),
      state: controller.getState()
    });

    expect(controller.getAgentTrace().steps).toHaveLength(traceLengthAfterAcceptedAction);
    expect(batch.events).toEqual([{
      type: "ActionRejected",
      code: "stale_combat_revision",
      message: "Combat view revision 1 is stale; latest revision is 2.",
      path: "combat.revision"
    }]);
    expect(batch.step).toBe("current");
    expect(batch.action).toBeUndefined();
    expect(trace.eventBatches.at(-1)).toMatchObject({
      step: traceLengthAfterAcceptedAction,
      actionType: "current_state",
      events: batch.events
    });
    expect(trace.diagnostics).toContainEqual(expect.objectContaining({
      source: "action",
      code: "stale_combat_revision",
      path: "combat.revision"
    }));
  });

  it("parses browser debug traces and rejects unsupported debug trace versions clearly", () => {
    const controller = createRunSandboxController("debug-trace-parse");
    startCombat(controller);
    const serialized = serializeBrowserDebugTrace(buildBrowserDebugTrace({
      trace: controller.getAgentTrace(),
      state: controller.getState()
    }));

    expect(parseBrowserDebugTrace(serialized).debugTraceVersion).toBe(1);
    expect(() => parseAgentTrace(serialized.replace('"debugTraceVersion": 1', '"debugTraceVersion": 999')))
      .toThrow("Unsupported browser debug trace version '999'.");
    expect(() => parseBrowserDebugTrace(serialized.replace('"debugTraceVersion": 1', '"debugTraceVersion": 999')))
      .toThrow("Unsupported browser debug trace version '999'.");
  });
});
