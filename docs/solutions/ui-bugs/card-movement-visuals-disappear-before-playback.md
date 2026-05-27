---
title: Card movement visuals disappear before playback
date: 2026-05-27
category: ui-bugs
module: game-phaser combat presentation
problem_type: ui_bug
component: frontend_stimulus
symptoms:
  - Played cards disappear instead of animating from the hand to a pile.
  - Card movement fallback paths can run because the hand visual is already missing.
  - Draw-to-hand animation still works, which makes the regression look isolated to cards leaving the hand.
root_cause: async_timing
resolution_type: code_fix
severity: high
tags:
  - phaser
  - combat-playback
  - card-animation
  - card-moved
  - async-timing
---

# Card movement visuals disappear before playback

## Problem

Successful combat actions were rendering the post-action hand before event playback consumed the `CardMoved` events. The user-visible result was that played cards vanished from the hand instead of animating from the hand to the discard or exhaust pile.

## Symptoms

- Cards that used to move from the hand to a pile appeared to disappear.
- The regression affected cards leaving the hand more clearly than cards entering the hand.
- The `CardPresenter` fallback path could report a missing hand visual because the scene had already reconciled the presenter against the final combat view model.

## What Didn't Work

- Looking at the large-viewport drag fix was not enough. That fix touched pointer coordinate conversion in `CardPresenter`, but did not change scene submission timing or event playback.
- Re-rendering the whole combat state after locking input looked harmless, but it reconciled the presenter against the final hand too early.
- Session-history search did not surface relevant prior notes for this specific `roguedeckgame` card movement playback regression, so the durable evidence came from PR #17, the merge commit, and the current code path.

## Solution

Keep successful action playback on the pre-action card visuals. Lock the existing card presenter visuals without reconciling against the final hand, then let `CombatEventPlayer` consume the event batch and move those visuals.

Before the fix, `submitAction` locked input and immediately rendered the current state. Because `beginCombatActionSubmission(...)` had already executed the action, that render used the post-action hand.

```ts
const requestId = submission.requestId;
this.inputLocked = true;
this.clearTooltip();
this.renderCurrentState(false);
const result = submission.result;
```

After the fix, successful submissions only lock the existing card visuals before reading and playing the result. Rejected submissions still render immediately so feedback remains visible.

```ts
const requestId = submission.requestId;
this.inputLocked = true;
this.clearTooltip();
this.cardPresenter?.setLocked(true);
const result = submission.result;
if (result.ok) {
  this.feedbackMessage = "";
  this.playbackFinalViewModel = this.sandbox?.getCombatViewModel();
} else {
  this.setFeedback(result.errors[0]?.message ?? "Action was rejected.");
  this.playbackFinalViewModel = undefined;
  this.renderCurrentState(false);
}
```

`CardPresenter.setLocked(...)` updates interactivity and rendering on existing visuals only. It does not replace `visualHandOrder`, remove cards absent from a final hand snapshot, or recreate the hand.

```ts
public setLocked(locked: boolean): void {
  if (this.locked === locked) {
    return;
  }

  this.locked = locked;
  for (const visual of this.visuals.values()) {
    this.renderCardVisual(visual);
  }
  this.layoutHand(false);
}
```

## Why This Works

`beginCombatActionSubmission(...)` executes the gameplay action synchronously before `submitAction` reaches the accepted-submission rendering path. Once the action has run, `sandbox.getCombatViewModel()` represents the final state after the card has left the hand.

`renderCurrentState(false)` calls `cardPresenter.render(viewModel.hand, ...)`. That render destroys non-moving visuals that are not in `viewModel.hand`. For a played card, the hand visual disappears before `CardPresenter.playCardMoved(...)` can handle the `CardMoved` event from `hand` to `discard` or `exhaust`.

The fixed sequence preserves the pre-action visual set until playback starts. The final view model is still captured in `playbackFinalViewModel` so draw and pile-to-hand events can resolve their final card metadata, but the successful path no longer uses it to reconcile away the outgoing hand visual early.

## Prevention

- When a Phaser scene submits a gameplay action and then plays emitted events, do not render the full final view model before the event player has consumed the event batch.
- Add presenter-level regression tests for visual lifetime, not only final state. PR #17 added a test that locks existing hand visuals and then asserts `CardMoved hand -> discard` still resolves successfully.
- Keep boundary tests around sequencing in `CombatScene`: the successful submission path should lock input and card visuals before reading `submission.result`, and it should not call `renderCurrentState(false)` before playback.
- Use event-order assertions for animation regressions. A final-state-only test would miss this bug because the final hand and discard piles are correct even when the visual transition is broken.

## Related Issues

- PR: https://github.com/fol2/roguedeckgame/pull/17
- Merge commit: `2cb24a7 fix(phaser): preserve card movement visuals during playback (#17)`
- Verification used for the fix: `npx vitest run tests/game-phaser/combat-scene-boundary.test.ts tests/game-phaser/card-presenter.test.ts tests/game-phaser/combat-event-player.test.ts`, `npm run typecheck`, `npm test`, and `npm run build`.
