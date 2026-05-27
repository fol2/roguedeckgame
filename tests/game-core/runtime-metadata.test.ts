import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";
import {
  currentRuntimeMetadata,
  GAME_EVENT_SCHEMA_VERSION,
  SAVE_SCHEMA_VERSION,
  starterRegistry,
  TRACE_SCHEMA_VERSION,
  createRuntimeMetadata,
  AGENT_TRACE_SCHEMA_VERSION
} from "../../src/game-core";

describe("runtime metadata", () => {
  it("uses package, content, trace, save, and registry identity from shared runtime state", () => {
    expect(currentRuntimeMetadata).toEqual({
      schemaVersion: 1,
      packageName: packageJson.name,
      packageVersion: packageJson.version,
      contentVersion: starterRegistry.contentVersion,
      gameEventSchemaVersion: GAME_EVENT_SCHEMA_VERSION,
      traceSchemaVersion: AGENT_TRACE_SCHEMA_VERSION,
      saveSchemaVersion: SAVE_SCHEMA_VERSION,
      registryFingerprint: expect.stringMatching(/^fnv1a32:[0-9a-f]{8}$/)
    });
  });

  it("binds runtime trace provenance to the trace replay schema source of truth", () => {
    expect(TRACE_SCHEMA_VERSION).toBe(AGENT_TRACE_SCHEMA_VERSION);
    expect(currentRuntimeMetadata.traceSchemaVersion).toBe(AGENT_TRACE_SCHEMA_VERSION);
  });

  it("changes registry identity when content changes without mutating the registry", () => {
    const before = JSON.stringify(starterRegistry);
    const changed = createRuntimeMetadata({
      ...starterRegistry,
      contentVersion: "starter-act1-forest-v2"
    });

    expect(changed.registryFingerprint).not.toBe(currentRuntimeMetadata.registryFingerprint);
    expect(JSON.stringify(starterRegistry)).toBe(before);
  });
});
