import { act1NormalBalance } from "../data/balance/act1-normal";
import { analyzeAgentTraces, checkSimulationHealth, type SimulationAggregateReport, type SimulationHealthIssue } from "./analysis";
import { agentPolicyProfiles, type AgentPolicyId } from "./policy-profiles";
import { runFuzzSimulation, type SimulationResult } from "./simulation";

export type PolicyMatrixTarget = {
  readonly policyId: AgentPolicyId;
  readonly minCompletionRate?: number;
  readonly maxCompletionRate?: number;
};

export type PolicyMatrixEntry = {
  readonly policyId: AgentPolicyId;
  readonly label: string;
  readonly description: string;
  readonly result: SimulationResult;
  readonly report: SimulationAggregateReport;
  readonly healthIssues: readonly SimulationHealthIssue[];
  readonly target?: PolicyMatrixTarget;
};

export type PolicyMatrixConfig = {
  readonly seed?: string | number;
  readonly runs?: number;
  readonly maxSteps?: number;
  readonly strict?: boolean;
  readonly targets?: readonly PolicyMatrixTarget[];
};

export type PolicyMatrixResult = {
  readonly ok: boolean;
  readonly seed: string | number;
  readonly runs: number;
  readonly maxSteps: number;
  readonly entries: readonly PolicyMatrixEntry[];
};

export const defaultPolicyMatrixTargets: readonly PolicyMatrixTarget[] = [
  {
    policyId: "randomLegal",
    minCompletionRate: act1NormalBalance.targets.normalCompletionRateMin,
    maxCompletionRate: act1NormalBalance.targets.normalCompletionRateMax
  },
  {
    policyId: "greedyDamage",
    minCompletionRate: act1NormalBalance.targets.greedyDamageCompletionRateMin,
    maxCompletionRate: act1NormalBalance.targets.greedyDamageCompletionRateMax
  },
  {
    policyId: "defensive",
    minCompletionRate: act1NormalBalance.targets.defensiveCompletionRateMin,
    maxCompletionRate: act1NormalBalance.targets.defensiveCompletionRateMax
  },
  {
    policyId: "deterministicSmoke",
    minCompletionRate: act1NormalBalance.targets.deterministicSmokeCompletionRateMin,
    maxCompletionRate: act1NormalBalance.targets.deterministicSmokeCompletionRateMax
  }
] as const;

const profileById = new Map(agentPolicyProfiles.map((profile) => [profile.id, profile]));

export const runPolicyMatrixSimulation = (
  config: PolicyMatrixConfig = {}
): PolicyMatrixResult => {
  const seed = config.seed ?? act1NormalBalance.targets.policyMatrixSeed;
  const runs = config.runs ?? act1NormalBalance.targets.policyMatrixSampleRuns;
  const maxSteps = config.maxSteps ?? act1NormalBalance.targets.policyMatrixMaxSteps;
  const targets = config.targets ?? defaultPolicyMatrixTargets;
  const entries = targets.map((target) => {
    const profile = profileById.get(target.policyId) ?? {
      id: target.policyId,
      label: target.policyId,
      description: "Custom policy."
    };
    const result = runFuzzSimulation({
      mode: "fuzz",
      seed: `${String(seed)}:${target.policyId}`,
      runs,
      maxSteps,
      invalidActionRate: 0,
      policy: target.policyId
    });
    const report = analyzeAgentTraces(result.traces);
    const warnCompletionBand = target.policyId !== "deterministicSmoke";
    const healthIssues = checkSimulationHealth(report, {
      requireCompletedRun: true,
      requireInvalidRejections: false,
      warnIfNoLosses: target.policyId === "randomLegal",
      warnIfNoRewards: true,
      warnIfNoPetUpgrades: true,
      warnIfNoPlayerDamage: true,
      warnIfNoMonsterDamage: true,
      minCompletionRateError: config.strict ? target.minCompletionRate : undefined,
      maxCompletionRateError: config.strict ? target.maxCompletionRate : undefined,
      lowCompletionRateWarning: !config.strict && warnCompletionBand ? target.minCompletionRate : -1,
      highCompletionRateWarning: !config.strict && warnCompletionBand ? target.maxCompletionRate : 2
    });

    return {
      policyId: target.policyId,
      label: profile.label,
      description: profile.description,
      result,
      report,
      healthIssues,
      target
    };
  });

  const ok = entries.every((entry) =>
    entry.result.ok && (!config.strict || entry.healthIssues.every((issue) => issue.severity !== "error"))
  );

  return { ok, seed, runs, maxSteps, entries };
};
