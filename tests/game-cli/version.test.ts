import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { currentRuntimeMetadata } from "../../src/game-core";

const runNode = (args: readonly string[]) => {
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: false
  });

  return {
    status: result.status,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim()
  };
};

const runNpm = (args: readonly string[]) => {
  const npmExecPath = process.env.npm_execpath;
  const result = npmExecPath
    ? spawnSync(process.execPath, [npmExecPath, ...args], {
        cwd: process.cwd(),
        encoding: "utf8",
        shell: false
      })
    : spawnSync("npm", args, {
        cwd: process.cwd(),
        encoding: "utf8",
        shell: true
      });

  return {
    status: result.status,
    stdout: (result.stdout ?? "").trim(),
    stderr: (result.stderr ?? "").trim()
  };
};

const parseRuntimeMetadata = (stdout: string): unknown => JSON.parse(stdout).runtimeMetadata;

describe("CLI runtime metadata", () => {
  it("runs CLI smoke commands without nested npm processes", () => {
    const human = runNode(["scripts/run-cli-entry.mjs", "game-cli", "--seed", "cli-dev", "--auto"]);
    const json = runNode(["scripts/run-cli-entry.mjs", "game-cli", "--seed", "cli-dev", "--json", "--auto"]);

    expect(human.status).toBe(0);
    expect(json.status).toBe(0);
    expect(human.stderr).toBe("");
    expect(json.stderr).toBe("");
    expect(human.stdout).toContain(`Package: ${currentRuntimeMetadata.packageName}@${currentRuntimeMetadata.packageVersion}`);
    expect(parseRuntimeMetadata(json.stdout)).toEqual(currentRuntimeMetadata);
  });

  it("prints CLI help through the npm-safe help command", () => {
    const result = runNpm(["run", "game:help", "--silent"]);

    expect(result.status).toBe(0);
    expect(result.stderr).not.toContain("npm warn");
    expect(result.stdout).toContain("Pet Roguelite CLI");
    expect(result.stdout).not.toContain("npm run game:cli -- --");
    expect(result.stdout).toContain("Runtime provenance:");
    expect(result.stdout).toContain(`Package: ${currentRuntimeMetadata.packageName}@${currentRuntimeMetadata.packageVersion}`);
  });

  it("reports shared runtime provenance through the npm-safe version command", () => {
    const result = runNpm(["run", "game:version", "--silent"]);

    expect(result.status).toBe(0);
    expect(result.stderr).not.toContain("npm warn");
    expect(parseRuntimeMetadata(result.stdout)).toEqual(currentRuntimeMetadata);
  });

  it("reports shared runtime provenance through the game CLI version command", () => {
    const result = runNode(["scripts/run-cli-entry.mjs", "game-cli", "--version"]);

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      type: "version",
      runtimeMetadata: currentRuntimeMetadata
    });
  });

  it("includes shared runtime provenance in JSON auto results", () => {
    const result = runNode(["scripts/run-cli-entry.mjs", "game-cli", "--seed", "cli-dev", "--json", "--auto"]);

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).runtimeMetadata).toEqual(currentRuntimeMetadata);
  });

  it("reports the same runtime provenance from simulation output", () => {
    const result = runNode(["scripts/run-cli-entry.mjs", "simulate-runs", "--mode", "smoke", "--analyze"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(`Package: ${currentRuntimeMetadata.packageName}@${currentRuntimeMetadata.packageVersion}`);
    expect(result.stdout).toContain(`Content version: ${currentRuntimeMetadata.contentVersion}`);
    expect(result.stdout).toContain(`Registry fingerprint: ${currentRuntimeMetadata.registryFingerprint}`);
    expect(result.stdout).toContain(`Trace schema: ${currentRuntimeMetadata.traceSchemaVersion}`);
    expect(result.stdout).toContain(`Save schema: ${currentRuntimeMetadata.saveSchemaVersion}`);
  });

  it("prints concise simulation parse errors without bundled stack traces", () => {
    const result = runNode(["scripts/run-cli-entry.mjs", "simulate-runs", "--mode"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toBe("Missing value for --mode.");
    expect(result.stderr).not.toContain("at ");
  });

  it("keeps transient and built CLI provenance aligned", () => {
    const build = runNpm(["run", "build:cli", "--silent"]);
    expect(build.status).toBe(0);

    const transientGame = runNode(["scripts/run-cli-entry.mjs", "game-cli", "--version"]);
    const builtGame = runNode(["dist-cli/game-cli.mjs", "--version"]);
    const transientSimulation = runNode(["scripts/run-cli-entry.mjs", "simulate-runs", "--version"]);
    const builtSimulation = runNode(["dist-cli/simulate-runs.mjs", "--version"]);

    expect(transientGame.status).toBe(0);
    expect(builtGame.status).toBe(0);
    expect(transientSimulation.status).toBe(0);
    expect(builtSimulation.status).toBe(0);
    expect(parseRuntimeMetadata(builtGame.stdout)).toEqual(parseRuntimeMetadata(transientGame.stdout));
    expect(parseRuntimeMetadata(builtSimulation.stdout)).toEqual(parseRuntimeMetadata(transientSimulation.stdout));
    expect(parseRuntimeMetadata(builtGame.stdout)).toEqual(currentRuntimeMetadata);
    expect(parseRuntimeMetadata(builtSimulation.stdout)).toEqual(currentRuntimeMetadata);
  });
});
