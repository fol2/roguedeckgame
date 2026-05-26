import { afterEach, describe, expect, it } from "vitest";
import { parseSimulationCliOptions } from "../../src/game-cli/parse";

const envKeys = [
  "npm_config_invalid_action_rate",
  "npm_config_completion_rate_min",
  "npm_config_completion_rate_max",
  "npm_config_policy_matrix",
  "npm_config_strict_policy_matrix"
] as const;

const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of envKeys) {
    const original = originalEnv[key];
    if (original === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = original;
    }
  }
});

describe("simulation CLI parsing", () => {
  it("keeps npm script numeric flags bound to their own option names", () => {
    process.env.npm_config_invalid_action_rate = "true";
    process.env.npm_config_completion_rate_min = "true";

    const options = parseSimulationCliOptions([
      "--mode",
      "fuzz",
      "--strict-balance",
      "--invalid-action-rate",
      "0",
      "--completion-rate-min",
      "0.99"
    ]);

    expect(options.invalidActionRate).toBe(0);
    expect(options.completionRateMin).toBe(0.99);
  });

  it("parses policy matrix and policy profile flags", () => {
    const options = parseSimulationCliOptions([
      "--mode",
      "fuzz",
      "--policy",
      "defensive",
      "--policy-matrix",
      "--strict-policy-matrix"
    ]);

    expect(options.policy).toBe("defensive");
    expect(options.policyMatrix).toBe(true);
    expect(options.strictPolicyMatrix).toBe(true);
  });

  it("reads npm stripped numeric override values left as positionals", () => {
    process.env.npm_config_invalid_action_rate = "true";
    process.env.npm_config_completion_rate_min = "true";

    const options = parseSimulationCliOptions([
      "--mode",
      "fuzz",
      "--strict-balance",
      "--invalid-action-rate",
      "0",
      "0.99"
    ]);

    expect(options.invalidActionRate).toBe(0);
    expect(options.completionRateMin).toBe(0.99);
  });
});
