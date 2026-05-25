# Vite + Phaser 4 Scaffold Plan

## Scope

- Add the browser entry files for Vite.
- Add a minimal Phaser 4 game factory, boot scene, core smoke scene, and layout constants.
- Keep `src/game-core` deterministic and free of Phaser, browser APIs, and presentation imports.
- Add raw-source tests for the app entry and architecture boundary.
- Update CI so the browser bundle is built.
- Document completion evidence in the contract folder.

## Dependency Investigation

- Inspect `npm view phaser versions --json` before installing.
- Install the latest available Phaser 4 release.
- Add Vite as a dev dependency.
- Confirm exact installed versions with `npm ls phaser vite --depth=0`.
- Confirm no React or other UI/state libraries were added.

## Files To Add Or Update

- `index.html`
- `vite.config.ts`
- `package.json`
- `package-lock.json`
- `.github/workflows/ci.yml`
- `src/app/main.ts`
- `src/app/create-game.ts`
- `src/app/styles.css`
- `src/game-phaser/scenes/SceneKeys.ts`
- `src/game-phaser/scenes/BootScene.ts`
- `src/game-phaser/scenes/CoreSmokeScene.ts`
- `src/game-phaser/layout/game-size.ts`
- `src/game-phaser/debug/core-smoke.ts`
- `tests/game-phaser/phaser-boundary.test.ts`
- `tests/game-phaser/app-entry.test.ts`
- `docs/contracts/8-vite-phaser4-scaffold.md`
- `docs/contracts/8-vite-phaser4-scaffold-completion-report.md`

## Test Plan

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run smoke:localhost`
- `npm audit --audit-level=moderate`
- `git diff --check`
- `git diff --no-index docs/contracts/8-vite-phaser4-scaffold-contract.md docs/contracts/8-vite-phaser4-scaffold.md`
- `npm run zip:review` after committing from a clean worktree

## Non-Goals

- No full combat UI.
- No card dragging.
- No map, reward, save, or story UI.
- No asset generation or production art.
- No React, Redux, Zustand, Pixi, GSAP, Electron, Tauri, or deployment packaging.
- No browser storage.

## Risks

- Phaser 4 API names may differ from Phaser 3 examples; typecheck and Vite build are the guardrails.
- Vitest should not execute Phaser scenes in Node; tests use raw source scanning.
- The core smoke scene must remain presentation-only and avoid resolver logic in scene files.
- Event playback and actual combat presentation are deferred to the next ticket.
