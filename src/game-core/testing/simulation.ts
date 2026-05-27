import { createRng } from "../systems/rng";
import type { RunStatus } from "../model/run";
import { createAgentRunDriver } from "./run-driver";
import type { AgentAction, AgentActionSource, AgentTraceMode } from "./agent-actions";
import { checkAgentRunInvariants } from "./invariants";
import { deterministicSmokePolicy, invalidActionInjector, randomLegalPolicy } from "./policies";
import { createAgentStateHash } from "./state-hash";
import {
  AGENT_TRACE_SCHEMA_VERSION,
  createTraceStep,
  replayAgentTrace,
  type AgentTrace,
  type AgentTraceFailure,
  type AgentTraceStep
} from "./trace";
import { getLegalAgentActions } from "./action-space";

export type SimulationMode = "smoke" | "fuzz" | "exhaustive-small" | "replay";

export type SimulationConfig = {
  readonly mode: SimulationMode;
  readonly seed: string | number;
  readonly runs?: number;
  readonly maxSteps?: number;
  readonly maxDepth?: number;
  readonly maxStates?: number;
  readonly invalidActionRate?: number;
  readonly trace?: AgentTrace;
};

export type SimulationResult = {
  readonly ok: boolean;
  readonly mode: SimulationMode;
  readonly seed: string | number;
  readonly runsCompleted: number;
  readonly traces: readonly AgentTrace[];
  readonly failures: readonly AgentTrace[];
};

const isTerminal = (status: RunStatus): boolean => status === "completed" || status === "lost";

const makeTrace = (
  seed: string | number,
  mode: AgentTraceMode,
  steps: AgentTrace["steps"],
  finalStatus?: RunStatus,
  failure?: AgentTraceFailure
): AgentTrace => ({
  schemaVersion: AGENT_TRACE_SCHEMA_VERSION,
  seed,
  mode,
  finalStatus,
  steps,
  failure
});

const runPolicyTrace = (
  seed: string | number,
  mode: Extract<AgentTraceMode, "smoke" | "fuzz" | "cli">,
  maxSteps: number,
  chooseAction: (step: number, driver: ReturnType<typeof createAgentRunDriver>) => { readonly action?: AgentAction; readonly source: AgentActionSource }
): AgentTrace => {
  const driver = createAgentRunDriver({ seed });
  const steps: AgentTraceStep[] = [];

  for (let step = 0; step < maxSteps; step += 1) {
    const snapshot = driver.getSnapshot();
    if (isTerminal(snapshot.run.status)) {
      return makeTrace(seed, mode, steps, snapshot.run.status);
    }

    const selected = chooseAction(step, driver);
    if (!selected.action) {
      return makeTrace(seed, mode, steps, snapshot.run.status, {
        step,
        code: "no_action_available",
        message: "Policy could not choose an action before the run reached a terminal state."
      });
    }

    const result = driver.applyAction(selected.action, selected.source);
    const nextSnapshot = driver.getSnapshot();
    const stateHashAfter = createAgentStateHash(nextSnapshot, { schemaVersion: AGENT_TRACE_SCHEMA_VERSION });
    steps.push(createTraceStep(step, selected.action, selected.source, result.ok, result.events, result.errors, stateHashAfter));

    if (!result.ok && selected.source !== "invalid-injected") {
      return makeTrace(seed, mode, steps, nextSnapshot.run.status, {
        step,
        code: "legal_action_rejected",
        message: result.errors[0]?.message ?? "A non-injected action was rejected."
      });
    }

    if (result.ok && selected.source === "invalid-injected") {
      return makeTrace(seed, mode, steps, nextSnapshot.run.status, {
        step,
        code: "invalid_injected_action_accepted",
        message: "Invalid action injection produced an accepted action."
      });
    }

    const invariants = checkAgentRunInvariants(nextSnapshot);
    if (!invariants.ok) {
      return makeTrace(seed, mode, steps, nextSnapshot.run.status, {
        step,
        code: "invariant_failed",
        message: "Agent run invariant failed.",
        invariantIssues: invariants.issues
      });
    }
  }

  return makeTrace(seed, mode, steps, driver.getSnapshot().run.status, {
    step: maxSteps,
    code: "max_steps_exceeded",
    message: `Simulation exceeded ${maxSteps} steps.`
  });
};

export const runSmokeSimulation = (
  config: Partial<SimulationConfig> = {}
): SimulationResult => {
  const seeds = [config.seed ?? "agent-smoke", "agent-smoke-alt", "agent-smoke-boss"];
  const traces = seeds.map((seed) => runSmokeTrace(seed, config.maxSteps ?? 500));

  return normaliseSmokeResult(config.seed ?? "agent-smoke", traces);
};

const runSmokeTrace = (seed: string | number, maxSteps: number): AgentTrace => {
  const driver = createAgentRunDriver({ seed });
  const steps: AgentTraceStep[] = [];

  for (let step = 0; step < maxSteps; step += 1) {
    const snapshot = driver.getSnapshot();
    if (isTerminal(snapshot.run.status)) {
      return makeTrace(seed, "smoke", steps, snapshot.run.status);
    }
    const action = deterministicSmokePolicy(snapshot);
    if (!action) {
      return makeTrace(seed, "smoke", steps, snapshot.run.status, {
        step,
        code: "no_action_available",
        message: "Deterministic smoke policy could not choose an action."
      });
    }
    const result = driver.applyAction(action, "policy");
    const nextSnapshot = driver.getSnapshot();
    const stateHashAfter = createAgentStateHash(nextSnapshot, { schemaVersion: AGENT_TRACE_SCHEMA_VERSION });
    steps.push(createTraceStep(step, action, "policy", result.ok, result.events, result.errors, stateHashAfter));
    if (!result.ok) {
      return makeTrace(seed, "smoke", steps, nextSnapshot.run.status, {
        step,
        code: "policy_action_rejected",
        message: result.errors[0]?.message ?? "Deterministic smoke policy action was rejected."
      });
    }
    const invariants = checkAgentRunInvariants(nextSnapshot);
    if (!invariants.ok) {
      return makeTrace(seed, "smoke", steps, nextSnapshot.run.status, {
        step,
        code: "invariant_failed",
        message: "Agent run invariant failed.",
        invariantIssues: invariants.issues
      });
    }
  }

  return makeTrace(seed, "smoke", steps, driver.getSnapshot().run.status, {
    step: maxSteps,
    code: "max_steps_exceeded",
    message: `Smoke simulation exceeded ${maxSteps} steps.`
  });
};

const normaliseSmokeResult = (seed: string | number, traces: readonly AgentTrace[]): SimulationResult => {
  const failures = traces.filter((trace) => trace.failure || (trace.finalStatus !== "completed" && trace.finalStatus !== "lost"));
  const hasCompleted = traces.some((trace) => trace.finalStatus === "completed" && !trace.failure);
  const syntheticFailure: AgentTrace[] = hasCompleted
    ? []
    : [
        {
          schemaVersion: AGENT_TRACE_SCHEMA_VERSION,
          seed,
          mode: "smoke",
          finalStatus: traces[0]?.finalStatus,
          steps: [],
          failure: {
            step: 0,
            code: "no_completed_smoke_seed",
            message: "Smoke simulation did not complete any seed."
          }
        }
      ];
  const allFailures = [...failures, ...syntheticFailure];
  return {
    ok: allFailures.length === 0,
    mode: "smoke",
    seed,
    runsCompleted: traces.filter((trace) => trace.finalStatus === "completed").length,
    traces,
    failures: allFailures
  };
};

export const runFuzzSimulation = (
  config: Partial<SimulationConfig> = {}
): SimulationResult => {
  const seedPrefix = config.seed ?? "fuzz";
  const runs = config.runs ?? 20;
  const maxSteps = config.maxSteps ?? 300;
  const invalidActionRate = config.invalidActionRate ?? 0.1;
  const traces: AgentTrace[] = [];

  for (let runIndex = 0; runIndex < runs; runIndex += 1) {
    const seed = `${String(seedPrefix)}:${runIndex}`;
    const rng = createRng(`${seed}:policy`);
    const trace = runPolicyTrace(seed, "fuzz", maxSteps, (_step, driver) => {
      const snapshot = driver.getSnapshot();
      if (rng.nextFloat() < invalidActionRate) {
        return { action: invalidActionInjector(snapshot, rng), source: "invalid-injected" };
      }
      return { action: randomLegalPolicy(snapshot, rng), source: "fuzz" };
    });
    const replay = replayAgentTrace(trace);
    traces.push(
      replay.ok
        ? trace
        : {
            ...trace,
            failure: replay.failure ?? {
              step: trace.steps.length,
              code: "replay_failed",
              message: "Fuzz trace replay failed."
            }
          }
    );
  }

  const failures = traces.filter((trace) => trace.failure);
  return {
    ok: failures.length === 0,
    mode: "fuzz",
    seed: seedPrefix,
    runsCompleted: traces.filter((trace) => trace.finalStatus === "completed").length,
    traces,
    failures
  };
};

export const runBoundedExhaustiveSimulation = (
  config: Partial<SimulationConfig> = {}
): SimulationResult => {
  const seed = config.seed ?? "exhaustive";
  const maxDepth = config.maxDepth ?? 40;
  const maxStates = config.maxStates ?? 1000;
  const visited = new Set<string>();
  const traces: AgentTrace[] = [];
  const failures: AgentTrace[] = [];
  const queue: AgentAction[][] = [[]];
  let explored = 0;

  while (queue.length > 0 && explored < maxStates) {
    const path = queue.shift() ?? [];
    const driver = createAgentRunDriver({ seed });
    const steps: AgentTraceStep[] = [];
    let failed = false;

    for (let index = 0; index < path.length; index += 1) {
      const result = driver.applyAction(path[index], "legal");
      const stateHashAfter = createAgentStateHash(driver.getSnapshot(), { schemaVersion: AGENT_TRACE_SCHEMA_VERSION });
      steps.push(createTraceStep(index, path[index], "legal", result.ok, result.events, result.errors, stateHashAfter));
      if (!result.ok) {
        failed = true;
        failures.push(makeTrace(seed, "exhaustive-small", steps, driver.getSnapshot().run.status, {
          step: index,
          code: "legal_action_rejected",
          message: result.errors[0]?.message ?? "Bounded exhaustive legal action was rejected."
        }));
        break;
      }
      const invariants = checkAgentRunInvariants(driver.getSnapshot());
      if (!invariants.ok) {
        failed = true;
        failures.push(makeTrace(seed, "exhaustive-small", steps, driver.getSnapshot().run.status, {
          step: index,
          code: "invariant_failed",
          message: "Invariant failed during bounded exhaustive exploration.",
          invariantIssues: invariants.issues
        }));
        break;
      }
    }

    if (failed) {
      continue;
    }

    const snapshot = driver.getSnapshot();
    const hash = createAgentStateHash(snapshot);
    if (visited.has(hash)) {
      continue;
    }
    visited.add(hash);
    explored += 1;
    traces.push(makeTrace(seed, "exhaustive-small", steps, snapshot.run.status));

    if (path.length >= maxDepth || isTerminal(snapshot.run.status)) {
      continue;
    }

    const actions = getLegalAgentActions(snapshot).slice(0, 8);
    for (const action of actions) {
      queue.push([...path, action]);
    }
  }

  return {
    ok: failures.length === 0,
    mode: "exhaustive-small",
    seed,
    runsCompleted: traces.filter((trace) => trace.finalStatus === "completed").length,
    traces,
    failures
  };
};

export const runReplaySimulation = (
  config: SimulationConfig
): SimulationResult => {
  if (!config.trace) {
    const failure = makeTrace(config.seed, "regression", [], undefined, {
      step: 0,
      code: "missing_trace",
      message: "Replay mode requires a trace."
    });
    return { ok: false, mode: "replay", seed: config.seed, runsCompleted: 0, traces: [failure], failures: [failure] };
  }

  const replay = replayAgentTrace(config.trace);
  const trace = replay.ok
    ? config.trace
    : { ...config.trace, failure: replay.failure ?? { step: 0, code: "replay_failed", message: "Replay failed." } };
  return {
    ok: replay.ok,
    mode: "replay",
    seed: config.seed,
    runsCompleted: replay.finalStatus === "completed" ? 1 : 0,
    traces: [trace],
    failures: replay.ok ? [] : [trace]
  };
};
