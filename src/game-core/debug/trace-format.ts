import type { GameActionError } from "../model/action";
import {
  GAME_EVENT_LEGACY_SCHEMA_VERSION,
  GAME_EVENT_PREVIOUS_SCHEMA_VERSION,
  projectGameEventsForSchema,
  type GameEvent,
  type GameEventSchemaVersion
} from "../model/event";
import { TRACE_SCHEMA_VERSION } from "../model/runtime-metadata";
import type { RunStatus } from "../model/run";
import type { AgentAction, AgentActionSource, AgentTraceMode } from "./agent-actions";

export const AGENT_TRACE_SCHEMA_VERSION = TRACE_SCHEMA_VERSION;
export const AGENT_TRACE_LEGACY_SCHEMA_VERSION = GAME_EVENT_LEGACY_SCHEMA_VERSION;
export const AGENT_TRACE_PREVIOUS_SCHEMA_VERSION = GAME_EVENT_PREVIOUS_SCHEMA_VERSION;
export const BROWSER_DEBUG_TRACE_SCHEMA_VERSION = 1;

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

type BrowserDebugTraceEnvelope = {
  readonly traceKind?: string;
  readonly debugTraceVersion?: unknown;
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
  readonly invariantIssues?: readonly unknown[];
};

export type ReplayResult = {
  readonly ok: boolean;
  readonly finalStatus?: RunStatus;
  readonly failure?: AgentTraceFailure;
};

export const serializeAgentTrace = (trace: AgentTrace): string => `${JSON.stringify(trace, null, 2)}\n`;

const isSupportedTraceSchemaVersion = (schemaVersion: unknown): schemaVersion is AgentTraceSchemaVersion =>
  schemaVersion === AGENT_TRACE_LEGACY_SCHEMA_VERSION ||
  schemaVersion === AGENT_TRACE_PREVIOUS_SCHEMA_VERSION ||
  schemaVersion === AGENT_TRACE_SCHEMA_VERSION;

export const parseAgentTrace = (text: string): AgentTrace => {
  const parsed = JSON.parse(text) as Partial<AgentTrace> & BrowserDebugTraceEnvelope;
  if (parsed.debugTraceVersion !== undefined && parsed.debugTraceVersion !== BROWSER_DEBUG_TRACE_SCHEMA_VERSION) {
    throw new Error(`Unsupported browser debug trace version '${String(parsed.debugTraceVersion)}'.`);
  }

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

export const projectAgentTraceEventsForSchema = (
  events: readonly GameEvent[],
  schemaVersion: AgentTraceSchemaVersion
): readonly GameEvent[] => projectGameEventsForSchema(events, schemaVersion);

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
