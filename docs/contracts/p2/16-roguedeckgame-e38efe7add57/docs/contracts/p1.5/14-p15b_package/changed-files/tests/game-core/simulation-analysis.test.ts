import { describe, expect, it } from "vitest";
import {
  analyzeAgentTrace,
  analyzeAgentTraces,
  checkSimulationHealth,
  runFuzzSimulation,
  runSmokeSimulation
} from "../../src/game-core";

describe("simulation analysis", () => {
  it("summarizes smoke traces into engine-flow and balance metrics", () => {
    const result = runSmokeSimulation({ seed: "analysis-smoke", maxSteps: 500 });
    const report = analyzeAgentTraces(result.traces);

    expect(result.ok).toBe(true);
    expect(report.totalRuns).toBe(result.traces.length);
    expect(report.completedRuns).toBeGreaterThan(0);
    expect(report.combatsStarted).toBeGreaterThan(0);
    expect(report.rewardsOffered).toBeGreaterThan(0);
    expect(report.totalDamageToMonsters).toBeGreaterThan(0);
    expect(Object.keys(report.cardPlaysByCardId).length).toBeGreaterThan(0);
  });

  it("tracks invalid-action rejection coverage in fuzz traces", () => {
    const result = runFuzzSimulation({ seed: "analysis-fuzz", runs: 6, maxSteps: 160, invalidActionRate: 0.3 });
    const report = analyzeAgentTraces(result.traces);
    const health = checkSimulationHealth(report, {
      requireCompletedRun: false,
      requireInvalidRejections: true,
      warnIfNoLosses: false,
      warnIfNoRewards: false,
      warnIfNoPetUpgrades: false,
      warnIfNoPlayerDamage: false,
      warnIfNoMonsterDamage: false
    });

    expect(result.ok).toBe(true);
    expect(report.invalidInjectedActions).toBeGreaterThan(0);
    expect(report.invalidRejectedActions).toBe(report.invalidInjectedActions);
    expect(health.filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("emits health issues for samples that never complete or exercise invalid validation", () => {
    const result = runFuzzSimulation({ seed: "analysis-underpowered", runs: 1, maxSteps: 1, invalidActionRate: 0 });
    const report = analyzeAgentTraces(result.traces);
    const issues = checkSimulationHealth(report, {
      requireCompletedRun: true,
      requireInvalidRejections: true,
      warnIfNoLosses: false,
      warnIfNoRewards: false,
      warnIfNoPetUpgrades: false,
      warnIfNoPlayerDamage: false,
      warnIfNoMonsterDamage: false
    });

    expect(issues.map((issue) => issue.code)).toContain("simulation_failures_present");
    expect(issues.map((issue) => issue.code)).toContain("no_completed_runs");
    expect(issues.map((issue) => issue.code)).toContain("invalid_injection_not_exercised");
  });

  it("can analyze an individual trace", () => {
    const result = runSmokeSimulation({ seed: "analysis-single", maxSteps: 500 });
    const metric = analyzeAgentTrace(result.traces[0]);

    expect(metric.steps).toBe(result.traces[0].steps.length);
    expect(metric.acceptedActions).toBeGreaterThan(0);
    expect(metric.rejectedActions).toBe(0);
  });
});
