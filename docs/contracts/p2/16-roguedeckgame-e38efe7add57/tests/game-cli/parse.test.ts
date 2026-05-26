import { afterEach, describe, expect, it } from "vitest";
import { parseSimulationCliOptions } from "../../src/game-cli/parse";

const envKeys = [
  "npm_config_invalid_action_rate",
  "npm_config_completion_rate_min",
  "npm_config_completion_rate_max"
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
