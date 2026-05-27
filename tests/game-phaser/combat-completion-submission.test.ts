import { describe, expect, it } from "vitest";
import { beginCombatCompletionSubmission } from "../../src/game-phaser/interaction/combat-completion-submission";
import type { CombatViewModel } from "../../src/game-phaser/view-models/combat-view-model";

describe("combat completion submission", () => {
  it("creates explicit revision and request id data for combat continue", () => {
    const submission = beginCombatCompletionSubmission({ revision: 42 } as CombatViewModel, 7);

    expect(submission).toEqual({
      expectedRevision: 42,
      requestId: "combat-complete-7",
      nextRequestId: 8
    });
  });
});
