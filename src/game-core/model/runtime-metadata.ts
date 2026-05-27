import packageJson from "../../../package.json";
import type { GameContentRegistry } from "./registry";
import { GAME_EVENT_SCHEMA_VERSION } from "./event";
import { SAVE_SCHEMA_VERSION } from "./save";

export const RUNTIME_METADATA_SCHEMA_VERSION = 1 as const;
export const TRACE_SCHEMA_VERSION = GAME_EVENT_SCHEMA_VERSION;

export type RuntimeMetadata = {
  readonly schemaVersion: typeof RUNTIME_METADATA_SCHEMA_VERSION;
  readonly packageName: string;
  readonly packageVersion: string;
  readonly contentVersion: string;
  readonly gameEventSchemaVersion: typeof GAME_EVENT_SCHEMA_VERSION;
  readonly traceSchemaVersion: typeof TRACE_SCHEMA_VERSION;
  readonly saveSchemaVersion: typeof SAVE_SCHEMA_VERSION;
  readonly registryFingerprint: string;
};

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stableValue(nested)])
    );
  }
  return value;
};

const fingerprint = (value: unknown): string => {
  const text = JSON.stringify(stableValue(value));
  let hash = 0x811c9dc5;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
};

export const createRuntimeMetadata = (registry: GameContentRegistry): RuntimeMetadata => ({
  schemaVersion: RUNTIME_METADATA_SCHEMA_VERSION,
  packageName: packageJson.name,
  packageVersion: packageJson.version,
  contentVersion: registry.contentVersion ?? "unknown",
  gameEventSchemaVersion: GAME_EVENT_SCHEMA_VERSION,
  traceSchemaVersion: TRACE_SCHEMA_VERSION,
  saveSchemaVersion: SAVE_SCHEMA_VERSION,
  registryFingerprint: fingerprint(registry)
});
