import type { GameActionError } from "../model/action";
import {
  GAME_EVENT_LEGACY_SCHEMA_VERSION,
  projectGameEventsForSchema,
  type GameEvent,
  type GameEventSchemaVersion
} from "../model/event";
import { TRACE_SCHEMA_VERSION } from "../model/runtime-metadata";
import type { RunStatus } from "../model/run";
import { createAgentRunDriver } from "./run-driver";
import type { AgentAction, AgentActionSource, AgentRunDriverConfig, AgentTraceMode } from "./agent-actions";
import { checkAgentRunInvariants, type InvariantIssue } from "./invariants";
import { createAgentStateHash } from "./state-hash";

export const AGENT_TRACE_SCHEMA_VERSION = TRACE_SCHEMA_VERSION;
export const AGENT_TRACE_LEGACY_SCHEMA_VERSION = GAME_EVENT_LEGACY_SCHEMA_VERSION;

export type AgentTraceSchemaVersion = GameEventSchemaVersion;

export type AgentTrace = {
  readonly schemaVersion: AgentTraceSchemaVersion;
  readonly seed: string | number;
  readonly mode: AgentTraceMode;
  readonly createdAt?: string;
  readonly finalStatus?: RunStatus;
  readonly steps: readonly AgentTraceStep[];
  readonly failure?: AgentTraceFailure;
};

export type AgentTraceStep = {
  readonly step: number;
  readonly action: AgentAction;
  readonly source: AgentActionSource;
  readonly ok: boolean;
  readonly events: readonly GameEvent[];
  readonly errors: readonly GameActionError[];
  readonly stateHashAfter: string;
};

export type AgentTraceFailure = {
  readonly step: number;
  readonly code: string;
  readonly message: string;
  readonly invariantIssues?: readonly InvariantIssue[];
};

export type ReplayResult = {
  readonly ok: boolean;
  readonly finalStatus?: RunStatus;
  readonly failure?: AgentTraceFailure;
};

export const serializeAgentTrace = (trace: AgentTrace): string => `${JSON.stringify(trace, null, 2)}\n`;

const isSupportedTraceSchemaVersion = (schemaVersion: unknown): schemaVersion is AgentTraceSchemaVersion =>
  schemaVersion === AGENT_TRACE_LEGACY_SCHEMA_VERSION || schemaVersion === AGENT_TRACE_SCHEMA_VERSION;

export const parseAgentTrace = (text: string): AgentTrace => {
  const parsed = JSON.parse(text) as Partial<AgentTrace>;
  if (
    !isSupportedTraceSchemaVersion(parsed.schemaVersion) ||
    parsed.seed === undefined ||
    parsed.seed === null ||
    !parsed.mode ||
    !Array.isArray(parsed.steps)
  ) {
    if (!isSupportedTraceSchemaVersion(parsed.schemaVersion)) {
      throw new Error(`Unsupported agent trace schema version '${String(parsed.schemaVersion)}'.`);
    }

    throw new Error("Invalid agent trace.");
  }
  return parsed as AgentTrace;
};

const stableJson = (value: unknown): string => JSON.stringify(value);

export const projectAgentTraceEventsForSchema = (
  events: readonly GameEvent[],
  schemaVersion: AgentTraceSchemaVersion
): readonly GameEvent[] => projectGameEventsForSchema(events, schemaVersion);

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

    const invariants = checkAgentRunInvariants(result.state);
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

export const createTraceStep = (
  step: number,
  action: AgentAction,
  source: AgentActionSource,
  ok: boolean,
  events: readonly GameEvent[],
  errors: readonly GameActionError[],
  stateHashAfter: string
): AgentTraceStep => ({
  step,
  action,
  source,
  ok,
  events,
  errors,
  stateHashAfter
});
