# Phase 1.5c Completion Report — Persistent Run HP and Normal Difficulty Balance Gate

## Summary

Implemented a first engine-side normal-difficulty balance baseline using the Phase 1.5 simulation engine.

The main fix is persistent run-level player HP. Before this ticket, combat creation reset the player to full HP each fight, which made full-run and final-boss win-rate analysis misleading. Runs now keep player HP across combats, rest nodes heal persistent HP, and combat completion writes HP back to the run.

## Balance Target

The normal-difficulty automated gate targets a broad random-legal simulation completion rate between 45% and 60%.

The deterministic smoke policy is still allowed to complete reliably because it is a flow smoke test, not the balance proxy.

## Main Changes

- Added `act1NormalBalance` as centralized Phase 1 / Act 1 tuning data.
- Added `playerHp` and `playerMaxHp` to `RunState`.
- Added `maxHp` to `PlayerClassDefinition`.
- Updated combat creation to use persistent run HP.
- Updated combat completion to write HP back to run state.
- Added rest-node healing through `RunPlayerHealed` events.
- Added run HP invariants, state hashing, save validation, and CLI summaries.
- Added simulation HP metrics and completion-rate health gates.
- Added `npm run sim:balance`.
- Regenerated the committed smoke trace.

## Final Validation

```txt
npm run typecheck                                           passed
npm test                                                    passed, 57 files / 438 tests
npm run build                                               passed
npm run build:cli                                           passed
npm run game:cli -- --seed cli-smoke --auto                 passed, completed in 61 steps
npm run game:cli -- --seed cli-smoke --json --auto          passed, completed in 61 steps
npm run sim:smoke                                           passed
npm run sim:fuzz -- --runs 20 --max-steps 300 --seed ci-fuzz passed
npm run sim:analyze -- --runs 20 --max-steps 300 --seed ci-fuzz --strict-health passed
npm run sim:balance                                         passed
npm run sim:exhaustive-small -- --seed ci-exhaustive --max-depth 40 --max-states 1000 passed
npm run sim:replay -- --trace tests/game-core/traces/smoke-complete.json passed
npm audit --audit-level=moderate                            passed, 0 vulnerabilities
```

Stress checks:

```txt
npm run sim:fuzz -- --runs 250 --max-steps 500 --seed stress-fuzz passed, 0 failures
npm run sim:exhaustive-small -- --seed stress-exhaustive --max-depth 80 --max-states 5000 passed, 0 failures
```

## Balance Evidence

```txt
npm run sim:balance
completed=93, lost=107, completion=46.5%, loss=53.5%
configured target: 45.0% - 60.0%
```

This is a first simulation-backed baseline, not final human balance. It is intentionally easy to revisit by editing `src/game-core/data/balance/act1-normal.ts` and rerunning `npm run sim:balance`.
