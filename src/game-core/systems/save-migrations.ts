import type { GameActionError, GameActionResult } from "../model/action";
import type { GameEvent } from "../model/event";
import { SAVE_SCHEMA_VERSION, UNKNOWN_SAVE_CONTENT_VERSION } from "../model/save";
import { act1NormalBalance } from "../data/balance/act1-normal";

const error = (code: string, message: string, path?: string): GameActionError => ({
  code,
  message,
  path
});

const rejectedEvent = (actionError: GameActionError): GameEvent => ({
  type: "ActionRejected",
  code: actionError.code,
  message: actionError.message,
  path: actionError.path
});

const reject = (state: unknown, actionError: GameActionError): GameActionResult<unknown> => ({
  ok: false,
  state,
  events: [rejectedEvent(actionError)],
  errors: [actionError]
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normaliseLegacyActiveRun = (run: unknown): unknown => {
  if (!isRecord(run)) {
    return run;
  }

  const defaultMaxHp = act1NormalBalance.player.maxHp;
  const explicitMaxHp = typeof run.playerMaxHp === "number" && Number.isFinite(run.playerMaxHp)
    ? run.playerMaxHp
    : undefined;
  const explicitHp = typeof run.playerHp === "number" && Number.isFinite(run.playerHp)
    ? run.playerHp
    : undefined;
  const playerMaxHp = "playerMaxHp" in run && run.playerMaxHp !== undefined
    ? run.playerMaxHp
    : Math.max(defaultMaxHp, explicitHp ?? defaultMaxHp);
  const playerHp = "playerHp" in run && run.playerHp !== undefined
    ? run.playerHp
    : run.status === "lost"
      ? 0
      : explicitMaxHp ?? defaultMaxHp;

  return {
    ...run,
    playerHp,
    playerMaxHp,
    ...("upgradedDeckCardIds" in run && Array.isArray(run.upgradedDeckCardIds)
      ? { upgradedDeckCardIds: run.upgradedDeckCardIds }
      : {})
  };
};

export const migrateSaveSnapshot = (
  snapshot: unknown
): GameActionResult<unknown> => {
  if (!isRecord(snapshot)) {
    return reject(snapshot, error("invalid_save_snapshot", "Save snapshot must be an object.", "snapshot"));
  }

  if (
    "schemaVersion" in snapshot &&
    (
      typeof snapshot.schemaVersion !== "number" ||
      !Number.isInteger(snapshot.schemaVersion) ||
      snapshot.schemaVersion < 0
    )
  ) {
    return reject(
      snapshot,
      error("invalid_save_schema_version", "Save schemaVersion must be a non-negative integer when present.", "schemaVersion")
    );
  }

  const rawVersion = typeof snapshot.schemaVersion === "number" ? snapshot.schemaVersion : 0;
  if (rawVersion > SAVE_SCHEMA_VERSION) {
    return reject(
      snapshot,
      error("unsupported_save_schema_version", `Save schema version '${String(snapshot.schemaVersion)}' is not supported.`, "schemaVersion")
    );
  }

  const state = {
    ...snapshot,
    schemaVersion: SAVE_SCHEMA_VERSION,
    contentVersion: typeof snapshot.contentVersion === "string" && snapshot.contentVersion.length > 0
      ? snapshot.contentVersion
      : UNKNOWN_SAVE_CONTENT_VERSION,
    activeRun: "activeRun" in snapshot && snapshot.activeRun !== undefined
      ? normaliseLegacyActiveRun(snapshot.activeRun)
      : snapshot.activeRun
  };
  const events: GameEvent[] = rawVersion === SAVE_SCHEMA_VERSION
    ? []
    : [{ type: "SaveSnapshotMigrated", fromSchemaVersion: rawVersion, toSchemaVersion: SAVE_SCHEMA_VERSION }];

  return { ok: true, state, events, errors: [] };
};
