# Reward / Map UI Basic Run Flow Plan

## Files to Add or Update

- Add `RunSandboxController` and a small browser singleton for shared run state.
- Keep `CombatSandboxController` as a compatibility wrapper around the run controller.
- Add `MapScene`, `RewardScene`, run/reward view models, run/reward event formatting, presenters, and layout helpers.
- Update `BootScene`, `CombatScene`, `SceneKeys`, and `create-game.ts` so the app starts at the run map and flows through combat and rewards.
- Add controller, view-model, scene-boundary, and architecture tests.
- Copy the contract to `docs/contracts/10-reward-map-ui-basic-run-flow.md` and add a completion report.

## Test Plan

- Run `npm run typecheck`.
- Run `npm test`.
- Run `npm run build`.
- Run `npm run smoke:localhost`.
- Run `npm audit --audit-level=moderate`.
- Run `git diff --check`.
- Run the contract-copy diff.
- Run `npm run zip:review` after committing from clean `HEAD`.
- Confirm Vite serves `/`, `/src/app/main.ts`, and the new Phaser scenes from localhost.

## Non-Goals

- No final art, drag-and-drop targeting, detailed card animation, save/load UI, story UI, audio, React, extra state library, browser storage, or new production dependency.

## Architecture Risks

- Phaser scenes must stay as presentation/input only.
- `RunSandboxController` must remain the only Phaser-facing file that calls run, combat, and reward lifecycle resolver functions.
- `src/game-core` must remain free of Phaser, browser, app, and presentation imports.

## Scene-State Sharing Risks

- All scenes must use the same in-memory sandbox controller instance.
- Reset behaviour must be explicit and testable without browser storage.

## Run / Reward Transition Risks

- Combat completion must delegate to core and create pending rewards only through `completeRunCombatNode`.
- Reward claim and skip must clear `pendingRewardOffer` and advance the run only through core lifecycle helpers.
- Event/rest placeholder nodes must complete structurally without adding non-goal effects.

## Event-Log Duplication Risks

- Scenes should render current state before playback and then append returned events.
- View models expose the controller's latest event batch, not a scene-maintained duplicate gameplay history.
