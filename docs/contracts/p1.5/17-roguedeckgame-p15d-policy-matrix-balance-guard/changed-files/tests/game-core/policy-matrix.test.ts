import { describe, expect, it } from "vitest";
import { runPolicyMatrixSimulation } from "../../src/game-core";

describe("policy matrix simulation", () => {
  it("summarizes multiple play profiles for balance review", () => {
    const matrix = runPolicyMatrixSimulation({ seed: "policy-matrix-test", runs: 4, maxSteps: 260 });

    expect(matrix.ok).toBe(true);
    expect(matrix.entries.map((entry) => entry.policyId)).toEqual([
      "randomLegal",
      "greedyDamage",
      "defensive",
      "deterministicSmoke"
    ]);
    for (const entry of matrix.entries) {
      expect(entry.result.ok).toBe(true);
      expect(entry.report.totalRuns).toBe(4);
      expect(entry.report.combatsStarted).toBeGreaterThan(0);
      expect(entry.report.totalDamageToMonsters).toBeGreaterThan(0);
    }
  });

  it("can promote profile completion bands into strict gates when desired", () => {
    const matrix = runPolicyMatrixSimulation({
      seed: "policy-matrix-strict-test",
      runs: 3,
      maxSteps: 220,
      strict: true,
      targets: [
        { policyId: "deterministicSmoke", minCompletionRate: 1, maxCompletionRate: 1 }
      ]
    });

    expect(matrix.ok).toBe(true);
    expect(matrix.entries).toHaveLength(1);
    expect(matrix.entries[0].policyId).toBe("deterministicSmoke");
    expect(matrix.entries[0].report.completionRate).toBe(1);
  });
});
