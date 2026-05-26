import type { AgentAction } from "../game-core/testing/agent-actions";

export type CliOptions = {
  readonly help: boolean;
  readonly seed: string | number;
  readonly json: boolean;
  readonly auto: boolean;
  readonly maxSteps: number;
};

export type SimulationCliOptions = {
  readonly mode: "smoke" | "fuzz" | "exhaustive-small" | "replay";
  readonly seed: string | number;
  readonly runs?: number;
  readonly maxSteps?: number;
  readonly maxDepth?: number;
  readonly maxStates?: number;
  readonly trace?: string;
  readonly traceOutput?: string;
  readonly analyze: boolean;
  readonly strictHealth: boolean;
  readonly strictBalance: boolean;
  readonly invalidActionRate?: number;
  readonly completionRateMin?: number;
  readonly completionRateMax?: number;
};

const readValue = (args: readonly string[], index: number, fallback: string): string => args[index + 1] ?? fallback;

const readFlagValue = (args: readonly string[], flag: string): string | undefined => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

const lastNumericPositionalValue = (args: readonly string[]): string | undefined =>
  [...args].reverse().find((arg) => !arg.startsWith("-") && Number.isFinite(Number(arg)));

export const parseCliOptions = (args: readonly string[]): CliOptions => {
  const positionalValues = args.filter((arg) => !arg.startsWith("-"));
  let seed: string | number = process.env.npm_config_seed && process.env.npm_config_seed !== "true"
    ? process.env.npm_config_seed
    : positionalValues[0] ?? "cli-dev";
  const npmMaxSteps = process.env.npm_config_max_steps;
  const positionalMaxSteps = positionalValues.find((value, index) => index > 0 && Number.isFinite(Number(value)));
  let maxSteps = Number.parseInt(npmMaxSteps && npmMaxSteps !== "true" ? npmMaxSteps : positionalMaxSteps ?? "500", 10);

  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--seed") {
      seed = readValue(args, index, String(seed));
      index += 1;
    } else if (args[index] === "--max-steps") {
      maxSteps = Number.parseInt(readValue(args, index, String(maxSteps)), 10);
      index += 1;
    }
  }

  return {
    help: args.includes("--help") || args.includes("-h") || process.env.npm_config_help === "true",
    seed,
    json: args.includes("--json") || process.env.npm_config_json === "true",
    auto: args.includes("--auto") || process.env.npm_config_auto === "true",
    maxSteps: Number.isFinite(maxSteps) ? maxSteps : 500
  };
};

export const parseSimulationCliOptions = (args: readonly string[]): SimulationCliOptions => {
  let mode: SimulationCliOptions["mode"] = "smoke";
  const positionalValues = args.filter((arg) => !arg.startsWith("-") && arg !== "smoke" && arg !== "fuzz" && arg !== "exhaustive-small" && arg !== "replay");
  const textQueue = positionalValues.filter((value) => !Number.isFinite(Number(value)));
  const readNpmRaw = (name: string): string | undefined => process.env[`npm_config_${name}`];
  const readNumericNpmValue = (name: string, flag: string): string | undefined => {
    const value = readNpmRaw(name);
    if (!value) {
      return undefined;
    }
    if (value !== "true") {
      return value;
    }
    return readFlagValue(args, flag) ?? lastNumericPositionalValue(args);
  };
  const readTextNpmValue = (name: string): string | undefined => {
    const value = readNpmRaw(name);
    if (!value) {
      return undefined;
    }
    return value === "true" ? textQueue.shift() : value;
  };
  const npmRuns = readNumericNpmValue("runs", "--runs");
  const npmMaxSteps = readNumericNpmValue("max_steps", "--max-steps");
  const npmMaxDepth = readNumericNpmValue("max_depth", "--max-depth");
  const npmMaxStates = readNumericNpmValue("max_states", "--max-states");
  const npmInvalidActionRate = readNumericNpmValue("invalid_action_rate", "--invalid-action-rate");
  const npmCompletionRateMin = readNumericNpmValue("completion_rate_min", "--completion-rate-min");
  const npmCompletionRateMax = readNumericNpmValue("completion_rate_max", "--completion-rate-max");
  const npmSeed = readTextNpmValue("seed");
  const npmTrace = readTextNpmValue("trace");
  let runs: number | undefined = npmRuns ? Number.parseInt(npmRuns, 10) : undefined;
  let maxSteps: number | undefined = npmMaxSteps ? Number.parseInt(npmMaxSteps, 10) : undefined;
  let maxDepth: number | undefined = npmMaxDepth ? Number.parseInt(npmMaxDepth, 10) : undefined;
  let maxStates: number | undefined = npmMaxStates ? Number.parseInt(npmMaxStates, 10) : undefined;
  let invalidActionRate: number | undefined = npmInvalidActionRate ? Number.parseFloat(npmInvalidActionRate) : undefined;
  let completionRateMin: number | undefined = npmCompletionRateMin ? Number.parseFloat(npmCompletionRateMin) : undefined;
  let completionRateMax: number | undefined = npmCompletionRateMax ? Number.parseFloat(npmCompletionRateMax) : undefined;
  let seed: string | number = npmSeed ?? "sim";
  let trace: string | undefined = npmTrace;
  let traceOutput: string | undefined = process.env.npm_config_trace_output;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--mode") {
      mode = readValue(args, index, mode) as SimulationCliOptions["mode"];
      index += 1;
    } else if (arg === "--seed") {
      seed = readValue(args, index, String(seed));
      index += 1;
    } else if (arg === "--runs") {
      runs = Number.parseInt(readValue(args, index, "0"), 10);
      index += 1;
    } else if (arg === "--max-steps") {
      maxSteps = Number.parseInt(readValue(args, index, "0"), 10);
      index += 1;
    } else if (arg === "--max-depth") {
      maxDepth = Number.parseInt(readValue(args, index, "0"), 10);
      index += 1;
    } else if (arg === "--max-states") {
      maxStates = Number.parseInt(readValue(args, index, "0"), 10);
      index += 1;
    } else if (arg === "--invalid-action-rate") {
      invalidActionRate = Number.parseFloat(readValue(args, index, "0"));
      index += 1;
    } else if (arg === "--completion-rate-min") {
      completionRateMin = Number.parseFloat(readValue(args, index, "0"));
      index += 1;
    } else if (arg === "--completion-rate-max") {
      completionRateMax = Number.parseFloat(readValue(args, index, "0"));
      index += 1;
    } else if (arg === "--trace") {
      trace = readValue(args, index, "");
      index += 1;
    } else if (arg === "--trace-output") {
      traceOutput = readValue(args, index, "");
      index += 1;
    }
  }

  return {
    mode,
    seed,
    runs: Number.isFinite(runs) ? runs : undefined,
    maxSteps: Number.isFinite(maxSteps) ? maxSteps : undefined,
    maxDepth: Number.isFinite(maxDepth) ? maxDepth : undefined,
    maxStates: Number.isFinite(maxStates) ? maxStates : undefined,
    trace,
    traceOutput,
    analyze: args.includes("--analyze") || process.env.npm_config_analyze === "true",
    strictHealth: args.includes("--strict-health") || process.env.npm_config_strict_health === "true",
    strictBalance: args.includes("--strict-balance") || process.env.npm_config_strict_balance === "true",
    invalidActionRate: Number.isFinite(invalidActionRate) ? invalidActionRate : undefined,
    completionRateMin: Number.isFinite(completionRateMin) ? completionRateMin : undefined,
    completionRateMax: Number.isFinite(completionRateMax) ? completionRateMax : undefined
  };
};

export const parseJsonLineAction = (line: string): AgentAction => {
  const parsed = JSON.parse(line) as { readonly action?: AgentAction };
  if (!parsed.action || typeof parsed.action.type !== "string") {
    throw new Error("JSON line must include an action object.");
  }
  return parsed.action;
};
