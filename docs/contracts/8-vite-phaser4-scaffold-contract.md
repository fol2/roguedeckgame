# Engineering Contract v0.9 — Vite + Phaser 4 Scaffold

## Objective

Add the first browser application shell for the pet-centered roguelite deckbuilder using Vite + TypeScript + Phaser 4.

Previous tickets completed the deterministic `src/game-core` foundation: combat, rewards, pet upgrades, run map lifecycle, pet side stories, and save snapshots. This ticket must now add a minimal browser-facing Phaser scaffold without moving gameplay rules into the presentation layer.

After this ticket, the repo should support:

1. `npm run dev` to start a Vite dev server.
2. `npm run build` to compile a browser bundle.
3. A minimal Phaser 4 canvas app mounted from `index.html`.
4. A placeholder scene that proves Phaser can display output from `game-core` without owning game rules.
5. Architecture tests that keep Phaser out of `src/game-core`.
6. CI updated to include the browser build.

This task is the app shell only. Do not build the full combat UI yet.

Use these skills:

- `$game-architecture-guard`
- `$phaser-presentation-builder`
- `$combat-engine-test-writer`

## Current Baseline

Latest pushed HEAD before this ticket:

```txt
0992266dd4fddf7d666a0371a0d81028a75f5b7b
```

Current game-core already includes:

- deterministic combat loop
- rewards and reward claiming
- pet upgrade modifier resolution
- run map lifecycle
- pet side-story progression
- save snapshot core
- `RunState.activePetInstanceIds`
- CI workflow for typecheck, tests, and audit
- no Phaser dependency yet

## Core Design Goal

Phaser is presentation only.

`src/game-core` must remain deterministic, serializable, testable in Node, and free of Phaser/browser imports.

Phaser may import and call `src/game-core` APIs, but only to request core state/events and render them. Phaser scenes must not implement card, pet, monster, reward, run, save, or story resolution logic.

## Non-Goals

Do not implement full combat UI.
Do not implement card dragging.
Do not implement map UI.
Do not implement reward UI.
Do not implement save/load UI.
Do not implement story/dialogue UI.
Do not implement asset generation.
Do not add React.
Do not add Redux, Zustand, Pixi, GSAP, or other UI/state libraries.
Do not add Electron, Tauri, Raycast, or deployment packaging.
Do not import Phaser from `src/game-core`.
Do not move game-core code into Phaser scenes.
Do not use browser storage in this ticket.
Do not create production game art.

## Dependency Requirements

Add the minimum dependencies for a Vite + Phaser browser app.

Recommended dependency changes:

```txt
production dependencies:
  phaser

dev dependencies:
  vite
```

Important:

1. Use Phaser 4 if available from npm.
2. Before installing, inspect available Phaser versions with an npm command such as:

```bash
npm view phaser versions --json
```

3. Install the latest available Phaser 4 version or Phaser 4 release candidate.
4. Do not silently install Phaser 3. If a Phaser 4-compatible package cannot be resolved, stop and report the blocker.
5. Record the exact installed Phaser version in the completion report.
6. Do not add React.
7. Do not add Playwright in this ticket unless absolutely necessary. Browser automation belongs to a later UI ticket.

## Package Scripts

Update `package.json` scripts to include:

```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
}
```

Keep existing scripts:

```json
{
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "smoke:localhost": "...",
  "zip:review": "..."
}
```

If `zip:review` already exists, keep it working.

## Required File Changes

Create or update these files:

```txt
index.html
vite.config.ts
package.json
package-lock.json
.github/workflows/ci.yml

src/app/main.ts
src/app/create-game.ts
src/app/styles.css

src/game-phaser/scenes/SceneKeys.ts
src/game-phaser/scenes/BootScene.ts
src/game-phaser/scenes/CoreSmokeScene.ts
src/game-phaser/layout/game-size.ts
src/game-phaser/debug/core-smoke.ts

tests/game-phaser/phaser-boundary.test.ts
tests/game-phaser/app-entry.test.ts

docs/contracts/8-vite-phaser4-scaffold-contract.md
docs/contracts/8-vite-phaser4-scaffold.md
docs/contracts/8-vite-phaser4-scaffold-completion-report.md
docs/plans/YYYY-MM-DD-009-vite-phaser4-scaffold-plan.md
```

Exact filenames may vary slightly, but keep the same structure and intent.

## App Entry Requirements

Create `index.html` as the browser entry.

Minimum requirements:

1. Include a single app mount element:

```html
<div id="game-root"></div>
```

2. Load `src/app/main.ts` as a module.
3. Do not include external CDN scripts.
4. Do not include final art assets.

Create `src/app/main.ts`.

Minimum behavior:

1. Import app styles.
2. Find `#game-root`.
3. Create the Phaser game through `createGame`.
4. Fail gracefully with a visible error message if the mount element is missing.

Create `src/app/create-game.ts`.

Minimum behavior:

1. Import Phaser.
2. Create and return a Phaser game instance.
3. Configure parent as the provided mount element.
4. Use a stable logical canvas size from `src/game-phaser/layout/game-size.ts`.
5. Register only bootstrap/smoke scenes for now.
6. Do not import browser storage.

Example shape, adjust to Phaser 4 APIs as needed:

```ts
export const createGame = (parent: HTMLElement): Phaser.Game => {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#111111",
    scene: [BootScene, CoreSmokeScene]
  });
};
```

If Phaser 4 type names differ, use the correct API for the installed Phaser 4 version.

## Phaser Scene Requirements

Create `BootScene`.

Responsibilities:

1. Set up minimal scene flow.
2. Do not load art assets yet.
3. Immediately transition to `CoreSmokeScene`.
4. Keep it tiny.

Create `CoreSmokeScene`.

Responsibilities:

1. Render placeholder text/shapes only.
2. Call a helper in `src/game-phaser/debug/core-smoke.ts` that uses `src/game-core` to produce a small smoke result.
3. Display the smoke result on screen.
4. Demonstrate that Phaser can consume game-core output without implementing game rules.
5. Do not implement card play, combat UI, reward UI, run map UI, or save UI.

Suggested displayed text:

```txt
Pet Roguelite Deckbuilder
Core registry: OK
Act 1 Forest nodes: <count>
Active pet slots: 1
```

`CoreSmokeScene` may use Phaser text and rectangles. Placeholder visuals are enough.

## Core Smoke Helper Requirements

Create `src/game-phaser/debug/core-smoke.ts`.

This file may import from `src/game-core` and produce a serializable view model for Phaser.

Suggested return type:

```ts
export type CoreSmokeViewModel = {
  readonly ok: boolean;
  readonly title: string;
  readonly registryErrorCount: number;
  readonly runStatus?: string;
  readonly mapNodeCount?: number;
  readonly activePetCount?: number;
  readonly messages: readonly string[];
};
```

The helper may:

1. Validate `starterRegistry`.
2. Create a run using Novice Tamer + Ember Fox fixture-like data or a small local fixture.
3. Return counts and status only.

Important:

- This helper must not implement gameplay resolution.
- This helper must not mutate registry data.
- This helper should not depend on Phaser.
- This helper belongs in `src/game-phaser` because it exists for presentation smoke, but it should still be pure and testable.

## Layout Requirements

Create `src/game-phaser/layout/game-size.ts`.

Suggested constants:

```ts
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const GAME_CENTER_X = GAME_WIDTH / 2;
export const GAME_CENTER_Y = GAME_HEIGHT / 2;
```

Do not scatter magic coordinates across scenes. For this ticket, a few simple layout constants are enough.

## Architecture Boundary Requirements

Add/extend tests to enforce:

1. `src/game-core/**/*.ts` does not import Phaser.
2. `src/game-core/**/*.ts` does not import from `src/game-phaser` or `src/app`.
3. `src/game-core/**/*.ts` does not reference browser globals such as `window`, `document`, `localStorage`, or `sessionStorage`.
4. `src/game-phaser` may import from `src/game-core`.
5. Phaser scenes should not contain obvious gameplay resolver code such as `playCard(`, `resolveEnemyTurn(`, `claimReward(`, or `applyPetStoryEvent(` unless the call is explicitly delegated through a presentation smoke helper and tested. Prefer not to call these from scenes in this ticket.

Use raw-file scanning tests where possible so Vitest does not need to execute Phaser in Node.

## TypeScript / Vite Requirements

Update TypeScript config only as needed.

Requirements:

1. `npm run typecheck` must still pass.
2. `npm test` must still pass.
3. `npm run build` must pass.
4. Existing game-core tests must not require a browser.
5. Do not make Vitest load/execute Phaser scenes unless the test environment is correctly configured. Static architecture tests are preferred for this ticket.
6. Keep `src/game-core` compatible with Node test execution.

## CI Requirements

Update `.github/workflows/ci.yml` to include the browser build.

Minimum CI commands after this ticket:

```yaml
npm ci
npm run typecheck
npm test
npm run build
npm audit --audit-level=moderate
```

Do not add deployment.
Do not add secrets.
Do not add browser automation yet.

## Vite Build Requirements

`npm run build` should output a normal Vite `dist` directory.

Do not commit `dist`.

Ensure `.gitignore` ignores:

```txt
dist
```

if it does not already.

## Tests Required

Use Vitest.

### `tests/game-phaser/phaser-boundary.test.ts`

Test:

1. `src/game-core` has no Phaser imports.
2. `src/game-core` has no imports from `src/game-phaser` or `src/app`.
3. `src/game-core` has no browser storage/global references.
4. `src/game-phaser` files exist.
5. `src/game-phaser/scenes` files do not contain gameplay resolver implementation keywords beyond allowed imports/types.
6. `src/game-phaser/debug/core-smoke.ts` does not import Phaser.
7. Scene files use layout constants rather than many hardcoded coordinates. Keep this pragmatic: do not overbuild the static test.

### `tests/game-phaser/app-entry.test.ts`

Test:

1. `index.html` references `/src/app/main.ts` or the chosen Vite entry.
2. `src/app/create-game.ts` imports Phaser.
3. `src/app/create-game.ts` registers `BootScene` and `CoreSmokeScene`.
4. `src/app/main.ts` imports styles.
5. `vite.config.ts` exists.

Prefer raw source checks. Do not require a browser in Vitest.

### Existing Tests

All existing tests must keep passing:

```txt
registry
rng
model-shape
combat-*
reward-*
pet-modifier-*
run-*
story-*
save-*
localhost-smoke
```

## Manual / Local Browser Check

If possible, run a quick local browser/dev server check manually:

```bash
npm run dev -- --host 127.0.0.1
```

But do not block the ticket on visual/manual browser review if the environment is headless. The required automated build check is `npm run build`.

If a local dev server URL is observed, report it in the completion report.

## Documentation Requirements

Create:

```txt
docs/contracts/8-vite-phaser4-scaffold-contract.md
docs/contracts/8-vite-phaser4-scaffold.md
docs/contracts/8-vite-phaser4-scaffold-completion-report.md
docs/plans/YYYY-MM-DD-009-vite-phaser4-scaffold-plan.md
```

Copy this contract into both contract files if that remains the established repo pattern.

The plan should briefly include:

- files to add/update
- exact dependency/version investigation plan
- test plan
- non-goals
- architecture boundary risks
- Phaser/Vite build risks
- event-playback deferral risks

## Commands to Run

Run:

```bash
npm install
npm run typecheck
npm test
npm run build
npm run smoke:localhost
npm audit --audit-level=moderate
git diff --check
git diff --no-index docs/contracts/8-vite-phaser4-scaffold-contract.md docs/contracts/8-vite-phaser4-scaffold.md
npm run zip:review
```

If `zip:review` requires clean `HEAD`, run it after commit from a clean worktree and report the path.

Also report:

```bash
npm ls phaser vite --depth=0
npm ls --depth=0 --omit=dev
```

It is expected that `phaser` becomes a production dependency. No other production dependency should be added.

## Validation Output Required

When complete, report:

1. Changed file tree.
2. Commands run and results.
3. Exact installed Phaser version.
4. Exact installed Vite version.
5. Confirmation that Phaser 4, not Phaser 3, was installed.
6. Confirmation that no React dependency was added.
7. Confirmation that no UI/state library besides Phaser/Vite was added.
8. Confirmation that `src/game-core` contains no Phaser imports.
9. Confirmation that `src/game-core` contains no imports from `src/game-phaser` or `src/app`.
10. Confirmation that `src/game-core` remains free of browser storage/globals.
11. Confirmation that `npm run build` passes.
12. Confirmation that the browser app renders only placeholder/core-smoke output, not full gameplay UI.
13. Confirmation that no combat UI, card dragging, map UI, reward UI, save UI, or story UI was implemented.
14. Confirmation that CI includes `npm run build`.
15. Confirmation that all tests pass.
16. Final pushed commit SHA.
17. Review ZIP path if generated.

## Final Reminder

This ticket is the bridge from core engine to browser presentation, not the full game UI.

Keep it small:

- Vite app shell
- Phaser game creation
- Boot scene
- Core smoke scene
- boundary tests
- build check

The next ticket will build the actual Phaser combat scene and event playback.
