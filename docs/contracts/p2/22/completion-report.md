# Contract 22 Completion Report

Date: 2026-05-28
Repository: `/Users/jamesto/Coding/roguedeckgame`
Branch: `main`
Contract source: `docs/contracts/p2/22`

## Outcome

Contract 22 is complete in the current checkout. The work is scoped to gate reliability, submit hardening, and localhost integration robustness. No new gameplay or content was added.

## Completed Changes

- Default `npm test` is bounded through Vitest threads, max worker limits, explicit timeout, and teardown timeout.
- Explicit test lanes exist for CLI, core, Phaser, and scripts.
- CLI smoke tests now fail on spawn errors, enforce timeouts, and assert child processes exit without signals.
- Localhost smoke server cleanup now closes idle and active connections.
- Vite preview integration now proves the built localhost app renders through a Chrome-compatible browser by default; it no longer treats browser DOM proof as optional.
- Preview and browser child process cleanup now escalates from `SIGTERM` to `SIGKILL` and fails if a child cannot be stopped.
- Run-level `RunSandboxController` mutations now require `expectedRevision` and `requestId` at the TypeScript API boundary and runtime guard boundary.
- Production scene, preview, and test call sites now submit explicit revision and request ids.
- Runtime tests cover missing run-level request ids and missing run revisions.

## Verification Evidence

- `npm ci`: PASS, 0 vulnerabilities.
- `npm run typecheck`: PASS.
- `npm test -- --reporter=dot`: PASS, 110 files, 862 tests.
- `npm run test:phaser -- tests/game-phaser/run-controller.test.ts`: PASS, 46 files, 271 tests.
- `npm run build`: PASS.
- `npm run build:cli`: PASS.
- `npm run test:integration`: PASS, 2 files, 4 tests, including hard browser DOM proof.
- `npm run test:scripts`: PASS, 1 file, 6 tests.
- `npm run smoke:localhost`: PASS.
- `npm run sim:smoke -- --analyze`: PASS, 3/3 completed, 0 failures, health no issues.
- `npm run sim:balance`: PASS, 200 fuzz runs, 45.0% completion within the 45.0%-60.0% target, 0 failures, health no issues.
- `npm audit --audit-level=moderate`: PASS, 0 vulnerabilities.
- `git diff --check`: PASS.

## Localhost Deployment Evidence

Production preview was launched on `http://127.0.0.1:4173/` with:

```sh
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Evidence captured:

- App route `/`: HTTP 200, includes `Pet Roguelite Deckbuilder`, module script, and `game-root`.
- Workbench route `/workbench/content`: HTTP 200, includes `Pet Roguelite Deckbuilder`, module script, and `game-root`.
- Current JS asset referenced by served HTML: HTTP 200.
- Process hygiene check: integration did not leave a preview or Chrome listener behind; existing listeners were separate long-running dev/preview sessions.

## Review Status

Initial independent code review and contract audit returned RED. Their blockers were treated as required fixes:

- Browser DOM smoke is hard by default.
- Spawned preview/browser cleanup now escalates and fails closed.
- Missing run-level `requestId` tests were added.
- Current checkout completion and localhost evidence are captured in this folder.
- Stale validation evidence has been replaced.

Final independent review is re-run after this report and the final verification gate.
