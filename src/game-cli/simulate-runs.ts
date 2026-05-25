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

const main = () => {
  const options = parseSimulationCliOptions(process.argv.slice(2));
  const result =
    options.mode === "smoke"
      ? runSmokeSimulation({ mode: "smoke", seed: options.seed, maxSteps: options.maxSteps })
      : options.mode === "fuzz"
        ? runFuzzSimulation({
            mode: "fuzz",
            seed: options.seed,
            runs: options.runs,
            maxSteps: options.maxSteps
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
  process.exitCode = result.ok ? 0 : 1;
};

main();
