# Vite + Phaser 4 Scaffold Completion Report

## Source Contract

- `docs/contracts/8-vite-phaser4-scaffold-contract.md`

## Changed File Tree

- `.github/workflows/ci.yml`
- `index.html`
- `package-lock.json`
- `package.json`
- `tsconfig.json`
- `vite.config.ts`
- `src/app/create-game.ts`
- `src/app/main.ts`
- `src/app/styles.css`
- `src/game-phaser/debug/core-smoke.ts`
- `src/game-phaser/layout/game-size.ts`
- `src/game-phaser/scenes/BootScene.ts`
- `src/game-phaser/scenes/CoreSmokeScene.ts`
- `src/game-phaser/scenes/SceneKeys.ts`
- `tests/game-phaser/app-entry.test.ts`
- `tests/game-phaser/phaser-boundary.test.ts`
- `docs/contracts/8-vite-phaser4-scaffold-contract.md`
- `docs/contracts/8-vite-phaser4-scaffold.md`
- `docs/contracts/8-vite-phaser4-scaffold-completion-report.md`
- `docs/plans/2026-05-25-009-vite-phaser4-scaffold-plan.md`

## Delivered

- Added a Vite browser entry through `index.html` and `src/app/main.ts`.
- Added `createGame` to create a Phaser 4 game instance mounted into `#game-root`.
- Added a tiny `BootScene` that immediately starts `CoreSmokeScene`.
- Added `CoreSmokeScene` with placeholder rectangles/text only.
- Added `buildCoreSmokeViewModel`, a pure presentation smoke helper that validates `starterRegistry`, creates a small run using `game-core`, and returns serializable display data.
- Added central Phaser layout constants in `src/game-phaser/layout/game-size.ts`.
- Added raw-source Vitest boundary tests so `src/game-core` stays free of Phaser, presentation imports, and browser globals.
- Hardened architecture tests with TypeScript AST scanning for static imports, side-effect imports, re-exports, dynamic imports, `require`, Phaser subpaths, and forbidden gameplay resolver identifiers in scenes.
- Updated CI to run `npm run build`.
- Added the required plan and copied the contract to `docs/contracts/8-vite-phaser4-scaffold.md`.

## Dependency Evidence

- `npm view phaser versions --json` was run before install and showed Phaser 4 releases up to `4.1.0`.
- Installed production dependency: `phaser@4.1.0`.
- Installed dev dependency: `vite@8.0.14`.
- Added dev-only Node typings: `@types/node@22.19.19`, required for TypeScript raw-file tests using Node built-ins and aligned with CI Node 22.
- `npm ls phaser vite --depth=0`: `phaser@4.1.0`, `vite@8.0.14`.
- `npm ls --depth=0 --omit=dev`: only `phaser@4.1.0`.

## Verification

- `npm run typecheck`: pass.
- `npm test`: pass, 36 files / 320 tests.
- `npm run build`: pass; Vite emitted the normal `dist` bundle.
- `npm run smoke:localhost`: pass; observed `http://127.0.0.1:52002/health`.
- `npm install phaser@4.1.0` and `npm install -D vite`: pass, 0 vulnerabilities.
- `npm install -D @types/node@22`: pass, 0 vulnerabilities.
- `npm audit --audit-level=moderate`: pass, 0 vulnerabilities.
- `git diff --check`: pass.
- `git diff --no-index docs/contracts/8-vite-phaser4-scaffold-contract.md docs/contracts/8-vite-phaser4-scaffold.md`: pass, no diff.
- `npm run dev -- --host 127.0.0.1`: pass; Vite served `http://127.0.0.1:5173/`.
- `curl -i http://127.0.0.1:5173/`: pass, HTTP 200 with `#game-root` and `/src/app/main.ts`.
- `curl -i http://127.0.0.1:5173/src/app/main.ts`: pass, HTTP 200 with the compiled module.

## Contract Confirmations

- Phaser 4 was installed, not Phaser 3.
- No React dependency was added.
- No Redux, Zustand, Pixi, GSAP, Electron, Tauri, or deployment packaging was added.
- No direct Playwright dependency was added. `package-lock.json` contains Vitest's optional peer metadata for `@vitest/browser-playwright`, but it is not installed as a project dependency and no Playwright package is present in `package.json`.
- `src/game-core` contains no Phaser imports.
- `src/game-core` contains no imports from `src/game-phaser` or `src/app`.
- `src/game-core` contains no browser storage/global references.
- Existing `game-core` tests still run in Node without a browser.
- The browser app renders placeholder/core-smoke output only.
- No full combat UI, card dragging, map UI, reward UI, save UI, or story/dialogue UI was implemented.
- Phaser scenes do not call combat, reward, save, run, or story resolvers directly.
- CI includes `npm run build`.
- `dist` remains ignored and uncommitted.

## Independent Review Status

- Code reviewer: GREEN after AST boundary-test hardening.
- Contract auditor: initial RED was limited to closure/evidence gates: final pushed SHA, review ZIP, completed review status, and explicit command/documentation evidence. These closure items are resolved after commit, push, review ZIP generation, and final re-audit.

## Closure Notes

- Final pushed commit SHA will be reported in the final handoff because this report cannot self-reference its own containing commit.
- Review ZIP path will be generated after commit from a clean worktree.
