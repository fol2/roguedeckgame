import type { GameActionError, GameActionResult, GameEvent } from "../../game-core";
import type { CombatInputLockState } from "./combat-interaction-state";

export type CombatActionRejectionDiagnostic = {
  readonly code: string;
  readonly message: string;
  readonly path?: string;
  readonly requestId?: string;
  readonly expectedRevision?: number;
};

export type CombatActionSubmissionSnapshot = {
  readonly nextRequestId: number;
  readonly pendingRequestId?: string;
  readonly lastSubmittedRequestId?: string;
  readonly lastSubmittedExpectedRevision?: number;
  readonly lastActionRejection?: CombatActionRejectionDiagnostic;
};

export type CombatActionSubmissionOutcome<TState> =
  | {
      readonly status: "accepted";
      readonly requestId: string;
      readonly snapshot: CombatActionSubmissionSnapshot;
      readonly result: GameActionResult<TState>;
    }
  | {
      readonly status: "blocked";
      readonly snapshot: CombatActionSubmissionSnapshot;
      readonly result: GameActionResult<TState>;
    };

const createRejectedInputResult = <TState>(
  state: TState,
  error: GameActionError
): GameActionResult<TState> => {
  const event: GameEvent = {
    type: "ActionRejected",
    code: error.code,
    message: error.message,
    path: error.path
  };

  return {
    ok: false,
    state,
    events: [event],
    errors: [error]
  };
};

export const createActionRejectionDiagnostic = <TState>(
  result: GameActionResult<TState>,
  requestId: string | undefined,
  expectedRevision: number | undefined
): CombatActionRejectionDiagnostic => {
  const rejectedEvent = result.events.find((event) => event.type === "ActionRejected");
  const error = result.errors[0];

  return {
    code: rejectedEvent?.type === "ActionRejected" ? rejectedEvent.code : error?.code ?? "action_rejected",
    message: rejectedEvent?.type === "ActionRejected" ? rejectedEvent.message : error?.message ?? "Action was rejected.",
    path: rejectedEvent?.type === "ActionRejected" ? rejectedEvent.path : error?.path,
    requestId,
    expectedRevision
  };
};

export const beginCombatActionSubmission = <TState>({
  snapshot,
  lock,
  expectedRevision,
  getState,
  action
}: {
  readonly snapshot: CombatActionSubmissionSnapshot;
  readonly lock: CombatInputLockState;
  readonly expectedRevision: number | undefined;
  readonly getState: () => TState;
  readonly action: (requestId: string) => GameActionResult<TState>;
}): CombatActionSubmissionOutcome<TState> => {
  if (lock.inputLocked) {
    const result = createRejectedInputResult(getState(), {
      code: "input_locked",
      message: `Gameplay input is locked by ${lock.inputLockReason}.`,
      path: "combat.input"
    });

    return {
      status: "blocked",
      snapshot: {
        ...snapshot,
        lastActionRejection: createActionRejectionDiagnostic(result, snapshot.pendingRequestId, expectedRevision)
      },
      result
    };
  }

  const requestId = `combat-ui-${snapshot.nextRequestId}`;
  const result = action(requestId);

  return {
    status: "accepted",
    requestId,
    snapshot: {
      ...snapshot,
      nextRequestId: snapshot.nextRequestId + 1,
      pendingRequestId: requestId,
      lastSubmittedRequestId: requestId,
      lastSubmittedExpectedRevision: expectedRevision,
      lastActionRejection: result.ok ? undefined : createActionRejectionDiagnostic(result, requestId, expectedRevision)
    },
    result
  };
};
