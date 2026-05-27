import {
  projectAgentTraceEventsForSchema,
  type AgentTrace,
  type AgentTraceFailure,
  type ReplayResult
} from "../debug/trace-format";
export {
  AGENT_TRACE_LEGACY_SCHEMA_VERSION,
  AGENT_TRACE_PREVIOUS_SCHEMA_VERSION,
  AGENT_TRACE_SCHEMA_VERSION,
  BROWSER_DEBUG_TRACE_SCHEMA_VERSION,
  createTraceStep,
  parseAgentTrace,
  projectAgentTraceEventsForSchema,
  serializeAgentTrace,
  type AgentTrace,
  type AgentTraceFailure,
  type AgentTraceSchemaVersion,
  type AgentTraceStep,
  type ReplayResult
} from "../debug/trace-format";
import { createAgentRunDriver } from "./run-driver";
import type { AgentRunDriverConfig } from "./agent-actions";
import { checkAgentRunInvariants } from "./invariants";
import { createAgentStateHash } from "./state-hash";

const stableJson = (value: unknown): string => JSON.stringify(value);

export const replayAgentTrace = (
  trace: AgentTrace,
  config: Partial<AgentRunDriverConfig> = {}
): ReplayResult => {
  const driver = createAgentRunDriver({
    ...config,
    seed: config.seed ?? trace.seed
  });

  for (const step of trace.steps) {
    const result = driver.applyAction(step.action, step.source);
    if (step.source === "replay") {
      return {
        ok: false,
        failure: {
          step: step.step,
          code: "replay_source_not_recordable",
          message: "Trace steps must record their original source, not replay."
        }
      };
    }
    if (result.ok !== step.ok) {
      return {
        ok: false,
        failure: {
          step: step.step,
          code: "replay_ok_diverged",
          message: `Replay ok result diverged at step ${step.step}.`
        }
      };
    }

    if (
      stableJson(projectAgentTraceEventsForSchema(result.events, trace.schemaVersion)) !==
      stableJson(projectAgentTraceEventsForSchema(step.events, trace.schemaVersion))
    ) {
      return {
        ok: false,
        failure: {
          step: step.step,
          code: "replay_events_diverged",
          message: `Replay events diverged at step ${step.step}.`
        }
      };
    }

    if (stableJson(result.errors) !== stableJson(step.errors)) {
      return {
        ok: false,
        failure: {
          step: step.step,
          code: "replay_errors_diverged",
          message: `Replay errors diverged at step ${step.step}.`
        }
      };
    }

    const stateHashAfter = createAgentStateHash(result.state, { schemaVersion: trace.schemaVersion });
    if (stateHashAfter !== step.stateHashAfter) {
      return {
        ok: false,
        failure: {
          step: step.step,
          code: "replay_state_hash_diverged",
          message: `Replay state hash diverged at step ${step.step}.`
        }
      };
    }

    const invariants = checkAgentRunInvariants(result.state, config.registry);
    if (!invariants.ok) {
      return {
        ok: false,
        failure: {
          step: step.step,
          code: "replay_invariant_failed",
          message: `Replay invariant failed at step ${step.step}.`,
          invariantIssues: invariants.issues
        }
      };
    }
  }

  const finalStatus = driver.getSnapshot().run.status;
  if (trace.finalStatus !== undefined && trace.finalStatus !== finalStatus) {
    return {
      ok: false,
      failure: {
        step: trace.steps.length,
        code: "replay_final_status_diverged",
        message: `Replay final status '${finalStatus}' does not match trace final status '${trace.finalStatus}'.`
      }
    };
  }

  return { ok: true, finalStatus };
};
