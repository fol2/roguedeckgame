import { describe, expect, it } from "vitest";
import { runSmokeSimulation } from "../../src/game-core";

describe("agent playthrough smoke", () => {
  it("completes at least one deterministic seed without forced combat outcome mutation", () => {
    const result = runSmokeSimulation({ seed: "agent-smoke", maxSteps: 500 });

    expect(result.ok).toBe(true);
    expect(result.traces.some((trace) => trace.finalStatus === "completed")).toBe(true);
    expect(result.traces.every((trace) => trace.finalStatus === "completed" || trace.finalStatus === "lost")).toBe(true);
    expect(result.traces.every((trace) => trace.steps.length <= 500)).toBe(true);
    expect(result.traces.flatMap((trace) => trace.steps).some((step) => step.events.some((event) => event.type === "CombatEnded"))).toBe(true);
    expect(result.traces.flatMap((trace) => trace.steps).every((step) => step.action.type !== "reset")).toBe(true);
  });
});
