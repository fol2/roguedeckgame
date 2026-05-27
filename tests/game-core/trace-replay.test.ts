import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  AGENT_TRACE_LEGACY_SCHEMA_VERSION,
  parseAgentTrace,
  projectAgentTraceEventsForSchema,
  createAgentRunDriver,
  createAgentStateHash,
  deterministicSmokePolicy,
  replayAgentTrace,
  runSmokeSimulation,
  serializeAgentTrace,
  type AgentTrace
} from "../../src/game-core";

const completedSmokeTrace = (): AgentTrace => {
  const result = runSmokeSimulation({ seed: "agent-smoke", maxSteps: 500 });
  const trace = result.traces.find((candidate) => candidate.finalStatus === "completed");
  if (!trace) {
    throw new Error("Expected a completed smoke trace.");
  }
  return trace;
};

describe("agent trace replay", () => {
  it("serializes, parses, and replays a generated smoke trace", () => {
    const trace = completedSmokeTrace();
    const parsed = parseAgentTrace(serializeAgentTrace(trace));
    const replay = replayAgentTrace(parsed);

    expect(replay.ok).toBe(true);
    expect(replay.finalStatus).toBe("completed");
  });

  it("fails clearly if an action is changed", () => {
    const trace = completedSmokeTrace();
    const changed = {
      ...trace,
      steps: [
        { ...trace.steps[0], action: { type: "selectMapNode" as const, nodeId: "missing_node" as never } },
        ...trace.steps.slice(1)
      ]
    };

    expect(replayAgentTrace(changed).failure?.code).toBe("replay_ok_diverged");
  });

  it("fails clearly if a state hash diverges", () => {
    const trace = completedSmokeTrace();
    const changed = {
      ...trace,
      steps: [
        { ...trace.steps[0], stateHashAfter: "changed" },
        ...trace.steps.slice(1)
      ]
    };

    expect(replayAgentTrace(changed).failure?.code).toBe("replay_state_hash_diverged");
  });

  it("fails clearly if events, errors, source, or final status diverge", () => {
    const trace = completedSmokeTrace();
    const invalidTrace = {
      ...trace,
      steps: [
        {
          ...trace.steps[0],
          action: { type: "selectMapNode" as const, nodeId: "missing_node" as never },
          ok: false,
          events: [
            {
              type: "ActionRejected" as const,
              code: "missing_run_node",
              message: "Run node 'missing_node' does not exist.",
              path: "nodeId"
            }
          ],
          errors: [
            {
              code: "missing_run_node",
              message: "Run node 'missing_node' does not exist.",
              path: "nodeId"
            }
          ]
        },
        ...trace.steps.slice(1)
      ]
    };

    expect(replayAgentTrace({
      ...trace,
      steps: [{ ...trace.steps[0], events: [] }, ...trace.steps.slice(1)]
    }).failure?.code).toBe("replay_events_diverged");

    expect(replayAgentTrace({
      ...invalidTrace,
      steps: [{ ...invalidTrace.steps[0], errors: [] }, ...invalidTrace.steps.slice(1)]
    }).failure?.code).toBe("replay_errors_diverged");

    expect(replayAgentTrace({
      ...trace,
      steps: [{ ...trace.steps[0], source: "replay" }, ...trace.steps.slice(1)]
    }).failure?.code).toBe("replay_source_not_recordable");

    expect(replayAgentTrace({
      ...trace,
      finalStatus: "lost"
    }).failure?.code).toBe("replay_final_status_diverged");
  });

  it("parses numeric zero seeds", () => {
    const trace = parseAgentTrace('{"schemaVersion":2,"seed":0,"mode":"regression","steps":[]}');

    expect(trace.seed).toBe(0);
  });

  it("replays legacy v1 traces with projected events and hashes", () => {
    const seed = "legacy-v1";
    const driver = createAgentRunDriver({ seed });
    const action = deterministicSmokePolicy(driver.getSnapshot());
    if (!action) {
      throw new Error("Expected deterministic smoke action.");
    }
    const result = driver.applyAction(action, "policy");
    const trace: AgentTrace = {
      schemaVersion: AGENT_TRACE_LEGACY_SCHEMA_VERSION,
      seed,
      mode: "smoke",
      finalStatus: driver.getSnapshot().run.status,
      steps: [
        {
          step: 0,
          action,
          source: "policy",
          ok: result.ok,
          events: projectAgentTraceEventsForSchema(result.events, AGENT_TRACE_LEGACY_SCHEMA_VERSION),
          errors: result.errors,
          stateHashAfter: createAgentStateHash(driver.getSnapshot(), { schemaVersion: AGENT_TRACE_LEGACY_SCHEMA_VERSION })
        }
      ]
    };

    expect(trace.steps[0].events.some((event) => event.type === "MonsterAbilityPlanned")).toBe(false);
    expect(replayAgentTrace(parseAgentTrace(serializeAgentTrace(trace))).ok).toBe(true);
  });

  it("replays committed trace files", () => {
    const trace = parseAgentTrace(readFileSync("tests/game-core/traces/smoke-complete.json", "utf8"));

    expect(replayAgentTrace(trace).ok).toBe(true);
  });
});
