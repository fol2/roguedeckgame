import { describe, expect, it } from "vitest";
import {
  createAgentRunDriver,
  createAgentStateHash,
  runBoundedExhaustiveSimulation
} from "../../src/game-core/testing";

describe("agent bounded exhaustive simulation", () => {
  it("explores a capped deterministic state space", () => {
    const result = runBoundedExhaustiveSimulation({
      seed: "ci-exhaustive",
      maxDepth: 8,
      maxStates: 60
    });

    expect(result.ok).toBe(true);
    expect(result.failures).toEqual([]);
    expect(result.traces.length).toBeLessThanOrEqual(60);
    expect(result.traces.every((trace) => trace.steps.length <= 8)).toBe(true);
  });

  it("creates stable hashes for equivalent states", () => {
    const left = createAgentRunDriver({ seed: "hash-stable" });
    const right = createAgentRunDriver({ seed: "hash-stable" });

    expect(createAgentStateHash(left.getSnapshot())).toBe(createAgentStateHash(right.getSnapshot()));
  });
});
