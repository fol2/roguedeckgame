# Phase 1 Monster Ability Registry Evidence

Phase 1 adds monster ability definitions, planned monster ability state, event playback support, validation, invariants, and legacy event/trace compatibility.

Validation run on 2026-05-27:

- `npm run typecheck`
- `npm run build`
- `npm test` - 73 files, 578 tests passed.
- `npm run sim:smoke` - 3 runs, 0 failures.
- `npm run sim:replay -- --trace tests/game-core/traces/smoke-complete.json` - 1 replay run, 0 failures.
- `git diff --check`
- Browser smoke through map node selection, combat entry, card play, end turn, and enemy turn. Console evidence: `phase1-browser-smoke-console-post-fixes.log` reports 0 errors and 0 warnings.

Independent review gate:

- Correctness reviewer: GREEN, no findings.
- API contract reviewer: GREEN, no findings.

Browser artefacts:

- `phase1-browser-smoke-after-node-click.png`
- `phase1-browser-smoke-post-enemy-turn.png`
- `phase1-browser-smoke-console-post-fixes.log`
