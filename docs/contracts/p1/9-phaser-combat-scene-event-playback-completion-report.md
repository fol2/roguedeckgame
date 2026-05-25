# Phaser Combat Scene Event Playback Completion Report

Source contract: `docs/contracts/9-phaser-combat-scene-event-playback-contract.md`

## Changed File Tree

```txt
src/app/create-game.ts
src/game-phaser/animation/CombatEventPlayer.ts
src/game-phaser/animation/combat-event-messages.ts
src/game-phaser/controllers/CombatSandboxController.ts
src/game-phaser/debug/core-smoke.ts
src/game-phaser/layout/combat-layout.ts
src/game-phaser/layout/game-size.ts
src/game-phaser/layout/hand-layout.ts
src/game-phaser/layout/pet-layout.ts
src/game-phaser/presenters/CardPresenter.ts
src/game-phaser/presenters/CombatHudPresenter.ts
src/game-phaser/presenters/EventLogPresenter.ts
src/game-phaser/presenters/MonsterPresenter.ts
src/game-phaser/presenters/PetPresenter.ts
src/game-phaser/presenters/PlayerPresenter.ts
src/game-phaser/scenes/BootScene.ts
src/game-phaser/scenes/CombatScene.ts
src/game-phaser/scenes/SceneKeys.ts
src/game-phaser/view-models/combat-view-model.ts
tests/game-phaser/app-entry.test.ts
tests/game-phaser/combat-controller.test.ts
tests/game-phaser/combat-event-player.test.ts
tests/game-phaser/combat-scene-boundary.test.ts
tests/game-phaser/combat-view-model.test.ts
tests/game-phaser/phaser-boundary.test.ts
docs/contracts/9-phaser-combat-scene-event-playback-contract.md
docs/contracts/9-phaser-combat-scene-event-playback.md
docs/contracts/9-phaser-combat-scene-event-playback-completion-report.md
docs/plans/2026-05-25-010-phaser-combat-scene-event-playback-plan.md
```

## Delivered

- The browser app now boots through `BootScene -> CombatScene`.
- `CombatScene` renders placeholder combat content for player, active pet, monsters, intents, HUD, hand cards, draw/discard counts, outcome text, and event log.
- `CombatSandboxController` creates a deterministic Novice Tamer + Ember Fox run combat sandbox using `src/game-core` run/combat APIs.
- Hand-card clicks call the controller, which plays targeted cards against the first alive monster and plays untargeted cards without a target.
- End Turn calls the controller, which resolves player end turn plus enemy turn and returns to the next player turn if combat continues.
- `CombatEventPlayer` consumes returned `GameEvent[]` and appends formatted messages in order.
- View-models are serializable and Phaser-free.
- Presenters own Phaser GameObjects and avoid gameplay resolver imports.
- Layout calibration is centralised in combat, hand, pet, and game-size layout helpers.
- Existing `CoreSmokeScene` remains available but is no longer the default playable slice; its debug helper no longer calls gameplay resolvers.

## Contract Confirmations

- No new production dependency was added beyond existing `phaser`.
- No React, Redux, Zustand, Pixi, GSAP, Playwright, Electron, Tauri, or deployment packaging was added.
- `src/game-core` contains no Phaser imports.
- `src/game-core` contains no imports from `src/game-phaser` or `src/app`.
- Phaser scenes do not call direct game-core resolver functions.
- `CombatSandboxController` is the only presentation bridge that calls game-core run/combat resolver functions.
- The app defaults to `CombatScene`.
- The scene renders placeholder player, pet, monster, hand, HUD, and event-log content.
- Card clicking works through the controller with first-alive-monster targeting for targeted cards.
- Untargeted cards work through the controller without a target.
- End Turn resolves through the controller.
- Returned `GameEvent[]` flows through `CombatEventPlayer`; the scene avoids pre-populating the event log with newly returned action events before playback.
- No map UI, reward UI, save UI, story UI, drag-and-drop, target selection, asset loading, or final art was implemented.

## Verification

```txt
npm run typecheck
PASS

npm test
PASS - 40 files / 345 tests

npm run build
PASS - Vite production build completed

npm run smoke:localhost
PASS - localhost smoke served registry validation evidence

npm audit --audit-level=moderate
PASS - 0 vulnerabilities

git diff --check
PASS

git diff --no-index docs/contracts/9-phaser-combat-scene-event-playback-contract.md docs/contracts/9-phaser-combat-scene-event-playback.md
PASS - no diff

npm ls phaser vite --depth=0
PASS - phaser@4.1.0, vite@8.0.14

npm ls --depth=0 --omit=dev
PASS - only phaser@4.1.0

curl -i http://127.0.0.1:5173/
PASS - HTTP 200 with #game-root and /src/app/main.ts

curl -i http://127.0.0.1:5173/src/app/main.ts
PASS - HTTP 200 Vite-compiled app entry
```

Additional source scans:

```txt
rg game-core presentation/browser boundary scan
PASS - no Phaser, game-phaser, app, browser global, or storage references in src/game-core

rg game-phaser resolver scan
PASS - run/combat resolver identifiers appear only in CombatSandboxController

presenter calibration scan
PASS - no inline presenter font-size calibration, wrap-padding arithmetic, or large text-coordinate literals
```

`npm run zip:review` must be run after the final commit from a clean worktree. The immutable final pushed commit SHA and review ZIP path are reported in the final handoff because a committed report cannot self-reference its own final commit hash without changing that hash.

## Independent Review Status

- Independent code review round 1: RED. Findings covered missing report, rejected event persistence, string-indirection controller call, presenter layout calibration, and missing rejected-event test coverage.
- Fixes applied: controller API renamed to `playHandCard`, rejected actions persist into controller view-model event messages, Scene event-log playback no longer duplicates returned events, presenter calibration constants moved to layout helpers, and tests added for rejected-event persistence plus targeted/untargeted card handling.
- Independent contract audit round 1: RED. Findings covered missing report/commit/ZIP finalisation, event-log playback duplication, and weak first-alive/untargeted targeting evidence.
- Fixes applied for code/test blockers. Final review, commit, push, clean ZIP, and final SHA evidence are completed after this report is committed.

## Residual Risk

- Manual visual inspection through an interactive browser was not required by the contract and was not used as a blocking gate. Localhost curl and production build evidence prove the Vite app entry serves correctly; automated tests cover the combat presentation boundary and controller behaviour.
