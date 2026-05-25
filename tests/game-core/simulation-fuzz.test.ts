import { describe, expect, it } from "vitest";
import { createAgentRunDriver, createAgentStateHash, createRng, invalidActionInjector, runFuzzSimulation } from "../../src/game-core";

describe("agent simulation fuzz", () => {
  it("runs a small deterministic fuzz sample with invalid injection", () => {
    const result = runFuzzSimulation({ seed: "ci-fuzz", runs: 20, maxSteps: 300, invalidActionRate: 0.15 });

    expect(result.ok).toBe(true);
    expect(result.failures).toEqual([]);
    expect(result.traces.some((trace) => trace.steps.some((step) => step.source === "invalid-injected"))).toBe(true);
    expect(
      result.traces
        .flatMap((trace) => trace.steps)
        .filter((step) => step.source === "invalid-injected")
        .every((step) => !step.ok && step.events.every((event) => event.type === "ActionRejected"))
    ).toBe(true);
  });

  it("rejects invalid injected actions safely", () => {
    const driver = createAgentRunDriver({ seed: "invalid-injection" });
    const before = createAgentStateHash(driver.getSnapshot());
    const action = invalidActionInjector(driver.getSnapshot(), createRng("invalid-injection"));
    const result = driver.applyAction(action, "invalid-injected");

    expect(result.ok).toBe(false);
    expect(result.events.map((event) => event.type)).toEqual(["ActionRejected"]);
    expect(createAgentStateHash(driver.getSnapshot())).toBe(before);
  });
});
