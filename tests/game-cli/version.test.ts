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

  it("prints CLI help through the transient entrypoint", () => {
    const result = runNode(["scripts/run-cli-entry.mjs", "game-cli", "--help"]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Pet Roguelite CLI");
    expect(result.stdout).not.toContain("npm run game:cli -- --");
    expect(result.stdout).toContain("Runtime provenance:");
    expect(result.stdout).toContain(`Package: ${currentRuntimeMetadata.packageName}@${currentRuntimeMetadata.packageVersion}`);
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

});
