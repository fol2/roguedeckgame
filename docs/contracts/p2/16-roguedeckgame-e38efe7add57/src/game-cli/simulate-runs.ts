import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseSimulationCliOptions } from "./parse";
import {
  runBoundedExhaustiveSimulation,
  runFuzzSimulation,
  runReplaySimulation,
  runSmokeSimulation,
  type SimulationResult
} from "../game-core/testing/simulation";
import { parseAgentTrace, serializeAgentTrace } from "../game-core/testing/trace";
import {
  analyzeAgentTraces,
  checkSimulationHealth,
  sortedCountEntries,
  type SimulationAggregateReport,
  type SimulationHealthIssue
} from "../game-core/testing/analysis";
import { act1NormalBalance } from "../game-core/data/balance/act1-normal";

const modeLabel = (mode: SimulationResult["mode"]): string => mode === "exhaustive-small" ? "exhaustive-small" : mode;

const printResult = (result: SimulationResult): void => {
  console.log(`Simulation mode: ${modeLabel(result.mode)}`);
  console.log(`Seed prefix: ${result.seed}`);
  console.log(`Runs: ${result.traces.length}`);
  console.log(`Failures: ${result.failures.length}`);
  console.log(`Result: ${result.ok ? "passed" : "failed"}`);

  for (const failure of result.failures) {
    console.log(`Failure seed: ${failure.seed}`);
    console.log(`Failure step: ${failure.failure?.step ?? "unknown"}`);
    console.log(`Failure code: ${failure.failure?.code ?? "unknown"}`);
    console.log(`Failure message: ${failure.failure?.message ?? "unknown"}`);
    const outputPath = join(tmpdir(), `roguedeckgame-agent-trace-${String(failure.seed).replace(/[^a-z0-9_-]/gi, "_")}.json`);
    writeFileSync(outputPath, serializeAgentTrace(failure), "utf8");
    console.log(`Trace written: ${outputPath}`);
  }
};

const percent = (value: number): string => `${(value * 100).toFixed(1)}%`;
const decimal = (value: number): string => value.toFixed(1);

const countSummary = (label: string, counts: Record<string, number>, limit = 6): void => {
  const entries = sortedCountEntries(counts, limit);
  if (entries.length === 0) {
    console.log(`${label}: none`);
    return;
  }
  console.log(`${label}: ${entries.map(([key, value]) => `${key}=${value}`).join(", ")}`);
};

const printAnalysis = (
  report: SimulationAggregateReport,
  healthIssues: readonly SimulationHealthIssue[],
  balanceTarget?: { readonly min: number; readonly max: number }
): void => {
  console.log("Analysis:");
  console.log(`  Terminal: completed=${report.completedRuns}, lost=${report.lostRuns}, failed=${report.failedRuns}, other=${report.otherTerminalRuns}`);
  console.log(`  Rates: completion=${percent(report.completionRate)}, loss=${percent(report.lossRate)}, failure=${percent(report.failureRate)}`);
  console.log(`  Steps: avg=${decimal(report.averageSteps)}, min=${report.minSteps}, max=${report.maxSteps}`);
  console.log(`  Actions: accepted=${report.acceptedActions}, rejected=${report.rejectedActions}, invalidRejected=${report.invalidRejectedActions}, invalidAccepted=${report.invalidAcceptedActions}`);
  console.log(`  Combat: started=${report.combatsStarted}, won=${report.combatsWon}, lost=${report.combatsLost}`);
  console.log(`  Rewards: offered=${report.rewardsOffered}, selected=${report.rewardsSelected}, skipped=${report.rewardsSkipped}, cards=${report.cardRewardsAdded}, petUpgrades=${report.petUpgradesUnlocked}`);
  console.log(`  Damage: toPlayer=${report.totalDamageToPlayer}, toMonsters=${report.totalDamageToMonsters}, blocked=${report.totalDamageBlocked}, playerBlock=${report.totalBlockGainedByPlayer}`);
  console.log(`  HP: finalAvg=${decimal(report.averageFinalRunHp)}, completedAvg=${decimal(report.averageCompletedFinalRunHp)}, completedRange=${report.minCompletedFinalRunHp}-${report.maxCompletedFinalRunHp}`);
  if (balanceTarget) {
    console.log(`  Balance target: completion ${percent(balanceTarget.min)} - ${percent(balanceTarget.max)}`);
  }
  countSummary("  Top card plays", report.cardPlaysByCardId);
  countSummary("  Top card rewards", report.cardRewardsByCardId);
  countSummary("  Pet upgrades", report.petUpgradesByUpgradeId);
  countSummary("  Reward types", report.rewardSelectionsByType);
  countSummary("  Actions", report.actionCounts);

  if (healthIssues.length === 0) {
    console.log("  Health: no issues");
    return;
  }

  for (const issue of healthIssues) {
    console.log(`  Health ${issue.severity.toUpperCase()} ${issue.code}: ${issue.message}`);
  }
};

const main = () => {
  const options = parseSimulationCliOptions(process.argv.slice(2));
  const runs = options.strictBalance && options.mode === "fuzz"
    ? options.runs ?? act1NormalBalance.targets.normalSampleRuns
    : options.runs;
  const maxSteps = options.strictBalance && options.mode === "fuzz"
    ? options.maxSteps ?? act1NormalBalance.targets.normalMaxSteps
    : options.maxSteps;
  const result =
    options.mode === "smoke"
      ? runSmokeSimulation({ mode: "smoke", seed: options.seed, maxSteps })
      : options.mode === "fuzz"
        ? runFuzzSimulation({
            mode: "fuzz",
            seed: options.seed,
            runs,
            maxSteps,
            invalidActionRate: options.invalidActionRate
          })
        : options.mode === "exhaustive-small"
          ? runBoundedExhaustiveSimulation({
              mode: "exhaustive-small",
              seed: options.seed,
              maxDepth: options.maxDepth,
              maxStates: options.maxStates
            })
          : runReplaySimulation({
              mode: "replay",
              seed: options.seed,
              trace: options.trace ? parseAgentTrace(readFileSync(options.trace, "utf8")) : undefined
            });

  if (options.traceOutput) {
    const trace = result.traces.find((candidate) => candidate.finalStatus === "completed" && !candidate.failure) ?? result.traces[0];
    if (trace) {
      writeFileSync(options.traceOutput, serializeAgentTrace({ ...trace, mode: "regression", createdAt: undefined }), "utf8");
      console.log(`Trace output: ${options.traceOutput}`);
    }
  }

  printResult(result);

  const report = options.analyze ? analyzeAgentTraces(result.traces) : undefined;
  const balanceTarget = options.strictBalance
    ? {
        min: options.completionRateMin ?? act1NormalBalance.targets.normalCompletionRateMin,
        max: options.completionRateMax ?? act1NormalBalance.targets.normalCompletionRateMax
      }
    : undefined;
  const healthIssues = report ? checkSimulationHealth(report, {
    requireCompletedRun: options.mode !== "replay",
    requireInvalidRejections: options.mode === "fuzz" && (options.invalidActionRate ?? 0.1) > 0,
    warnIfNoLosses: options.mode === "fuzz" && (runs ?? 20) >= 20,
    warnIfNoRewards: options.mode !== "replay",
    warnIfNoPetUpgrades: options.mode !== "replay",
    warnIfNoPlayerDamage: options.mode !== "replay",
    warnIfNoMonsterDamage: options.mode !== "replay",
    minCompletionRateError: balanceTarget?.min,
    maxCompletionRateError: balanceTarget?.max
  }) : [];

  if (report) {
    printAnalysis(report, healthIssues, balanceTarget);
  }

  const hasStrictError = (options.strictHealth || options.strictBalance) && healthIssues.some((issue) => issue.severity === "error");
  process.exitCode = result.ok && !hasStrictError ? 0 : 1;
};

main();
