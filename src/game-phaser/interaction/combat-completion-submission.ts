import type { CombatViewModel } from "../view-models/combat-view-model";

export type CombatCompletionSubmission = {
  readonly expectedRevision: number;
  readonly requestId: string;
  readonly nextRequestId: number;
};

export const beginCombatCompletionSubmission = (
  viewModel: CombatViewModel,
  nextRequestId: number
): CombatCompletionSubmission => ({
  expectedRevision: viewModel.revision,
  requestId: `combat-complete-${nextRequestId}`,
  nextRequestId: nextRequestId + 1
});
