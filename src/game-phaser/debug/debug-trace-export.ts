import {
  currentRuntimeMetadata,
  BROWSER_DEBUG_TRACE_SCHEMA_VERSION,
  parseAgentTrace,
  serializeAgentTrace,
  type AgentTrace,
  type CardInstanceId,
  type GameEvent,
  type RuntimeMetadata,
  type RunNodeId,
  type RunStatus
} from "../../game-core";
import type { CombatPlaybackObservation } from "../animation/combat-playback-policy";
import type { RunSandboxState } from "../controllers/RunSandboxController";
import type { CombatParityDiagnostic } from "./combat-parity";

export const BROWSER_DEBUG_TRACE_VERSION = BROWSER_DEBUG_TRACE_SCHEMA_VERSION;

export type BrowserDebugTraceVersion = typeof BROWSER_DEBUG_TRACE_VERSION;

export type BrowserDebugTraceEventBatch = {
  readonly step: number;
  readonly actionType: string;
  readonly events: readonly GameEvent[];
};

export type BrowserDebugEventBatchCopyPayload = {
  readonly type: "combat-debug-event-batch";
  readonly step: number | "current";
  readonly action?: AgentTrace["steps"][number]["action"];
  readonly events: readonly GameEvent[];
};

export type BrowserDebugTraceRunSummary = {
  readonly status: RunStatus;
  readonly currentNodeId?: RunNodeId;
  readonly currentNodeType?: string;
  readonly combatPhase?: string;
  readonly combatTurnNumber?: number;
  readonly handCount?: number;
  readonly drawPileCount?: number;
  readonly discardPileCount?: number;
};

export type BrowserDebugTraceDiagnostic = {
  readonly code: string;
  readonly message: string;
  readonly path?: string;
  readonly source: "action" | "playback" | "parity";
};

export type BrowserDebugTrace = AgentTrace & {
  readonly traceKind: "browser-debug";
  readonly debugTraceVersion: BrowserDebugTraceVersion;
  readonly runtimeMetadata: RuntimeMetadata;
  readonly selectedNodeId?: RunNodeId;
  readonly selectedCardId?: CardInstanceId;
  readonly finalRunStateSummary: BrowserDebugTraceRunSummary;
  readonly eventBatches: readonly BrowserDebugTraceEventBatch[];
  readonly diagnostics: readonly BrowserDebugTraceDiagnostic[];
  readonly conversion: {
    readonly simulationReplayCommand: string;
    readonly replayTracePathPlaceholder: string;
  };
};

export const buildBrowserDebugTrace = ({
  trace,
  state,
  selectedCardId,
  playbackObservations = [],
  parityDiagnostics = [],
  runtimeMetadata = currentRuntimeMetadata
}: {
  readonly trace: AgentTrace;
  readonly state: RunSandboxState;
  readonly selectedCardId?: CardInstanceId;
  readonly playbackObservations?: readonly CombatPlaybackObservation[];
  readonly parityDiagnostics?: readonly CombatParityDiagnostic[];
  readonly runtimeMetadata?: RuntimeMetadata;
}): BrowserDebugTrace => {
  const selectedNode = state.run.map?.nodes.find((node) => node.id === state.run.map?.currentNodeId);
  const latestRejectedEvents = state.lastEvents
    .filter((event) => event.type === "ActionRejected")
    .map((event): BrowserDebugTraceDiagnostic => ({
      source: "action",
      code: event.code,
      message: event.message,
      path: event.path
    }));
  const playbackDiagnostics = playbackObservations
    .filter((observation) => observation.fallbackUsed || observation.warningCode || observation.errorSummary)
    .map((observation): BrowserDebugTraceDiagnostic => ({
      source: "playback",
      code: observation.warningCode ?? observation.outcome,
      message: observation.errorSummary ?? `${observation.eventType} ${observation.outcome}`
    }));
  const visualDiagnostics = parityDiagnostics.map((diagnostic): BrowserDebugTraceDiagnostic => ({
    source: "parity",
    code: diagnostic.code,
    message: diagnostic.message,
    path: diagnostic.entityId
  }));

  const eventBatches = buildBrowserDebugTraceEventBatches(trace, state);

  return {
    ...trace,
    traceKind: "browser-debug",
    debugTraceVersion: BROWSER_DEBUG_TRACE_VERSION,
    runtimeMetadata,
    selectedNodeId: state.run.map?.currentNodeId,
    selectedCardId,
    finalRunStateSummary: {
      status: state.run.status,
      currentNodeId: state.run.map?.currentNodeId,
      currentNodeType: selectedNode?.type,
      combatPhase: state.combat?.phase,
      combatTurnNumber: state.combat?.turnNumber,
      handCount: state.combat?.hand.length,
      drawPileCount: state.combat?.drawPile.length,
      discardPileCount: state.combat?.discardPile.length
    },
    eventBatches,
    diagnostics: [...latestRejectedEvents, ...playbackDiagnostics, ...visualDiagnostics],
    conversion: {
      simulationReplayCommand: "npm run sim:replay -- -- --trace <exported-trace>",
      replayTracePathPlaceholder: "<exported-trace>"
    }
  };
};

const stableJson = (value: unknown): string => JSON.stringify(value);

export const buildBrowserDebugTraceEventBatches = (
  trace: AgentTrace,
  state: RunSandboxState
): readonly BrowserDebugTraceEventBatch[] => {
  const traceBatches = trace.steps.map((step) => ({
    step: step.step,
    actionType: step.action.type,
    events: step.events
  }));
  const latestTraceBatch = traceBatches.at(-1);
  if (
    state.lastEvents.length === 0 ||
    (latestTraceBatch && stableJson(latestTraceBatch.events) === stableJson(state.lastEvents))
  ) {
    return traceBatches;
  }

  return [
    ...traceBatches,
    {
      step: trace.steps.length,
      actionType: "current_state",
      events: state.lastEvents
    }
  ];
};

export const buildBrowserDebugEventBatchCopyPayload = (
  trace: AgentTrace,
  state: RunSandboxState
): BrowserDebugEventBatchCopyPayload => {
  const latestStep = trace.steps.at(-1);
  if (!latestStep || stableJson(latestStep.events) !== stableJson(state.lastEvents)) {
    return {
      type: "combat-debug-event-batch",
      step: "current",
      events: state.lastEvents
    };
  }

  return {
    type: "combat-debug-event-batch",
    step: latestStep.step,
    action: latestStep.action,
    events: state.lastEvents
  };
};

export const serializeBrowserDebugTrace = (trace: BrowserDebugTrace): string => serializeAgentTrace(trace);

export const parseBrowserDebugTrace = (text: string): BrowserDebugTrace => {
  const parsed = JSON.parse(text) as Partial<BrowserDebugTrace>;
  if (parsed.debugTraceVersion !== BROWSER_DEBUG_TRACE_VERSION) {
    throw new Error(`Unsupported browser debug trace version '${String(parsed.debugTraceVersion)}'.`);
  }

  return parseAgentTrace(text) as BrowserDebugTrace;
};
