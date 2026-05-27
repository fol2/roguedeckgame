import type { GameActionError, GameActionResult } from "../../game-core";

export type RunSandboxRequestGuard<TState> = {
  readonly rejectIfStaleCombatRevision: (
    expectedRevision: number | undefined,
    path: string
  ) => GameActionResult<TState> | undefined;
  readonly rejectIfStaleRunRevision: (
    expectedRevision: number | undefined,
    path: string
  ) => GameActionResult<TState> | undefined;
  readonly rejectIfInvalidRequest: (
    requestId: string,
    path: string
  ) => GameActionResult<TState> | undefined;
  readonly rejectIfProvidedRequestInvalid: (
    requestId: string | undefined,
    path: string
  ) => GameActionResult<TState> | undefined;
};

const createError = (code: string, message: string, path?: string): GameActionError => ({
  code,
  message,
  path
});

export const createRunSandboxRequestGuard = <TState>(
  getRevision: () => number,
  seenGameplayRequestIds: Set<string>,
  reject: (error: GameActionError) => GameActionResult<TState>
): RunSandboxRequestGuard<TState> => {
  const rejectIfStaleCombatRevision = (
    expectedRevision: number | undefined,
    path: string
  ): GameActionResult<TState> | undefined => {
    const revision = getRevision();
    if (expectedRevision === undefined || expectedRevision === revision) {
      return undefined;
    }

    return reject(createError(
      "stale_combat_revision",
      `Combat view revision ${expectedRevision} is stale; latest revision is ${revision}.`,
      path
    ));
  };

  const rejectIfStaleRunRevision = (
    expectedRevision: number | undefined,
    path: string
  ): GameActionResult<TState> | undefined => {
    const revision = getRevision();
    if (expectedRevision === undefined || expectedRevision === revision) {
      return undefined;
    }

    return reject(createError(
      "stale_run_revision",
      `Run view revision ${expectedRevision} is stale; latest revision is ${revision}.`,
      path
    ));
  };

  const rejectIfInvalidRequest = (
    requestId: string,
    path: string
  ): GameActionResult<TState> | undefined => {
    if (!requestId) {
      return reject(createError(
        "missing_request_id",
        "Gameplay requests must include a request id.",
        path
      ));
    }

    if (seenGameplayRequestIds.has(requestId)) {
      return reject(createError(
        "duplicate_request",
        `Gameplay request '${requestId}' was already submitted.`,
        path
      ));
    }

    seenGameplayRequestIds.add(requestId);

    return undefined;
  };

  return {
    rejectIfStaleCombatRevision,
    rejectIfStaleRunRevision,
    rejectIfInvalidRequest,
    rejectIfProvidedRequestInvalid: (requestId, path) =>
      requestId === undefined ? undefined : rejectIfInvalidRequest(requestId, path)
  };
};
