import type { GameActionResult } from "../../game-core";
import {
  beginCombatActionSubmission,
  type CombatActionRejectionDiagnostic,
  type CombatActionSubmissionSnapshot
} from "./combat-action-submission";
import type { CombatInputLockState } from "./combat-input-lock";

export class CombatUiRequestTracker {
  private nextRequestId = 1;
  private pendingRequestId?: string;
  private lastSubmittedRequestId?: string;
  private lastSubmittedExpectedRevision?: number;
  private lastActionRejection?: CombatActionRejectionDiagnostic;

  public reset(): void {
    this.nextRequestId = 1;
    this.pendingRequestId = undefined;
    this.lastSubmittedRequestId = undefined;
    this.lastSubmittedExpectedRevision = undefined;
    this.lastActionRejection = undefined;
  }

  public get pending(): string | undefined {
    return this.pendingRequestId;
  }

  public get lastRequestId(): string | undefined {
    return this.lastSubmittedRequestId;
  }

  public get expectedRevision(): number | undefined {
    return this.lastSubmittedExpectedRevision;
  }

  public get rejection(): CombatActionRejectionDiagnostic | undefined {
    return this.lastActionRejection;
  }

  public beginCombatAction<TState>({
    lock,
    expectedRevision,
    getState,
    action
  }: {
    readonly lock: CombatInputLockState;
    readonly expectedRevision: number | undefined;
    readonly getState: () => TState;
    readonly action: (requestId: string) => GameActionResult<TState>;
  }) {
    const submission = beginCombatActionSubmission({
      snapshot: this.getSnapshot(),
      lock,
      expectedRevision,
      getState,
      action
    });
    this.applySnapshot(submission.snapshot);

    return submission;
  }

  public beginCombatCompletion(expectedRevision: number): string {
    const requestId = `combat-complete-${this.nextRequestId}`;
    this.nextRequestId += 1;
    this.pendingRequestId = requestId;
    this.lastSubmittedRequestId = requestId;
    this.lastSubmittedExpectedRevision = expectedRevision;
    this.lastActionRejection = undefined;

    return requestId;
  }

  public clearPendingIf(requestId: string): void {
    if (this.pendingRequestId === requestId) {
      this.pendingRequestId = undefined;
    }
  }

  private getSnapshot(): CombatActionSubmissionSnapshot {
    return {
      nextRequestId: this.nextRequestId,
      pendingRequestId: this.pendingRequestId,
      lastSubmittedRequestId: this.lastSubmittedRequestId,
      lastSubmittedExpectedRevision: this.lastSubmittedExpectedRevision,
      lastActionRejection: this.lastActionRejection
    };
  }

  private applySnapshot(snapshot: CombatActionSubmissionSnapshot): void {
    this.nextRequestId = snapshot.nextRequestId;
    this.pendingRequestId = snapshot.pendingRequestId;
    this.lastSubmittedRequestId = snapshot.lastSubmittedRequestId;
    this.lastSubmittedExpectedRevision = snapshot.lastSubmittedExpectedRevision;
    this.lastActionRejection = snapshot.lastActionRejection;
  }
}
