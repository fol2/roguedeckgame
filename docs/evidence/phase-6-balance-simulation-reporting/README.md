# Phase 6 - Balance and Simulation Reporting Evidence

## Scope

- Added optional simulation `balance` metrics for monster ability plans/plays, status applications, reward type offers and pick rates, encounter starts/wins/losses, run paths, and damage by encounter.
- Kept the existing exported `AgentTraceMetrics` and `SimulationAggregateReport` shapes source-compatible by putting new metrics under an optional `balance` block.
- Added CLI report formatting for count summaries and percentage rate summaries.
- Extended simulation analysis tests with deterministic synthetic trace coverage and old-shape assignability coverage.

## Validation

- `npm run typecheck`
- `npx vitest run tests/game-core/simulation-analysis.test.ts tests/game-cli/report-format.test.ts tests/game-core/agent-playthrough-smoke.test.ts tests/game-core/trace-replay.test.ts`
- `node scripts/run-cli-entry.mjs simulate-runs --mode smoke --analyze`
- `npm run build`
- `npm test`
- `node scripts/run-cli-entry.mjs simulate-runs --mode replay --trace tests/game-core/traces/smoke-complete.json`
- `npm run sim:balance`
- `git diff --check`

## Final Local Results

- TypeScript typecheck passed.
- Focused tests passed: 4 files, 18 tests.
- Full tests passed: 78 files, 636 tests.
- Build passed.
- Smoke simulation with analysis passed and printed balance summaries.
- Replay simulation passed.
- Balance simulation passed: 200 runs, 46.5% completion, within the configured 45.0%-60.0% target.
- Diff check passed.
- Final correctness review: GREEN.
- Final API contract review: GREEN.
