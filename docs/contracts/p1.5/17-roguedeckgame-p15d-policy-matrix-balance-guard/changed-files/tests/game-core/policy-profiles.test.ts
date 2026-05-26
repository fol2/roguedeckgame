import { describe, expect, it } from "vitest";
import {
  agentPolicyProfiles,
  chooseAgentPolicyAction,
  createAgentRunDriver,
  createRng,
  getLegalAgentActions,
  isAgentPolicyId,
  runFuzzSimulation
} from "../../src/game-core";

describe("agent policy profiles", () => {
  it("exposes stable policy ids for balance matrix simulations", () => {
    expect(agentPolicyProfiles.map((profile) => profile.id)).toEqual([
      "randomLegal",
      "greedyDamage",
      "defensive",
      "deterministicSmoke"
    ]);
    expect(isAgentPolicyId("greedyDamage")).toBe(true);
    expect(isAgentPolicyId("unknown-policy")).toBe(false);
  });

  it("chooses legal actions for each policy on the initial run state", () => {
    const driver = createAgentRunDriver({ seed: "policy-profiles" });
    const snapshot = driver.getSnapshot();
    const legalKeys = new Set(getLegalAgentActions(snapshot).map((action) => JSON.stringify(action)));

    for (const profile of agentPolicyProfiles) {
      const action = chooseAgentPolicyAction(profile.id, snapshot, createRng(`${profile.id}:test`));
      expect(action, profile.id).toBeDefined();
      expect(legalKeys.has(JSON.stringify(action))).toBe(true);
    }
  });

  it("can run non-random profile simulations without rejected legal actions", () => {
    for (const policy of ["greedyDamage", "defensive"] as const) {
      const result = runFuzzSimulation({
        seed: `policy-profile-${policy}`,
        runs: 4,
        maxSteps: 220,
        invalidActionRate: 0,
        policy
      });

      expect(result.ok).toBe(true);
      expect(result.failures).toHaveLength(0);
      expect(result.traces.every((trace) => trace.finalStatus === "completed" || trace.finalStatus === "lost")).toBe(true);
    }
  });
});
