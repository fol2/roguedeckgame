# Phase 1.5c Completion Report - Persistent Run HP and Normal Difficulty Balance Gate

## Summary

Implemented the Phase 1.5c engine-side normal-difficulty balance baseline.

The main rules fix is persistent run-level player HP. A run now owns `playerHp` and `playerMaxHp`, combat starts from the run HP, combat completion writes HP back to the run, lost runs normalise HP to zero, and rest nodes heal persistent HP without exceeding max HP.

Implementation commit:

```txt
c6f66dc8c4fe393d24f89392da56b211c16643f7
```

The final pushed `HEAD` is verified after the closure/report commit by `git rev-parse HEAD`, `git rev-parse origin/main`, and remote `git ls-remote`; this report does not embed its own containing commit SHA because changing the report changes that SHA.

## Scope Completed

- Added `src/game-core/data/balance/act1-normal.ts` for Phase 1 / Act 1 normal tuning.
- Moved player HP, rest healing, numeric starter/reward/pet-command card values, monster HP/intent values, and normal completion-rate targets into the central balance data.
- Added `PlayerClassDefinition.maxHp`, with `RunState.playerHp` and `RunState.playerMaxHp` initialised from the selected player class.
- Updated combat creation and run combat completion for persistent HP.
- Added `RunPlayerHealed`, run HP CLI summaries, state hashing, invariants, save validation, and Phaser event-message coverage for the new run events.
- Added legacy v1 save backfill for active runs that predate persistent run HP, while still rejecting invalid explicit HP values.
- Improved simulation analytics with final run HP, completed-run HP range, and explicit completion-rate health gates.
- Added `npm run sim:balance`; strict balance mode uses the central normal target and defaults, runs fuzz/analyse with invalid injection disabled, and fails outside the configured target band.
- Updated tests for persistent HP, rest healing, lost-run HP normalisation, save HP validation, simulation HP metrics, completion-rate health gates, and the committed replay trace.

## Validation Evidence

```txt
npm ci                                                       passed, 49 packages, 0 vulnerabilities
npm run typecheck                                           passed
npx vitest run tests/game-cli/parse.test.ts tests/game-core/save-snapshot.test.ts tests/game-core/simulation-analysis.test.ts --reporter=verbose
                                                             passed, 3 files / 27 tests
npm test                                                    passed, 58 files / 442 tests
npm run build                                               passed
npm run build:cli                                           passed
npm run game:cli -- --seed cli-smoke --auto                 passed, completed in 61 steps
npm run game:cli -- --seed cli-smoke --json --auto          passed, completed in 61 steps, 62 invariant checks
npm run sim:smoke                                           passed, 3 runs, 0 failures
npm run sim:fuzz -- --runs 20 --max-steps 300 --seed ci-fuzz
                                                             passed, 20 runs, 0 failures
npm run sim:analyze -- --runs 20 --max-steps 300 --seed ci-fuzz --strict-health
                                                             passed, 20 runs, 0 failures, health no issues
npm run sim:balance                                         passed, 200 runs, 0 failures, health no issues
npm run sim:balance -- --completion-rate-min 0.99           exited 1 as expected with completion_rate_below_balance_target
npm run sim:exhaustive-small -- --seed ci-exhaustive --max-depth 40 --max-states 1000
                                                             passed, 1000 states, 0 failures
npm run sim:replay -- --trace tests/game-core/traces/smoke-complete.json
                                                             passed, 1 replay, 0 failures
npm audit --audit-level=moderate                            passed, 0 vulnerabilities
git diff --check                                            passed
```

Stress gates:

```txt
npm run sim:fuzz -- --runs 250 --max-steps 500 --seed stress-fuzz
                                                             passed, 250 runs, 0 failures
npm run sim:exhaustive-small -- --seed stress-exhaustive --max-depth 80 --max-states 5000
                                                             passed, 5000 states, 0 failures
```

Architecture checks:

```txt
rg "Math\.random|from ['\"]phaser|game-phaser|/app/|localStorage|sessionStorage|window|document" src/game-core
                                                             passed, no matches
rg -n 'description: ".*[0-9]|cost: [0-9]|maxHp: [0-9]|amount: [0-9]|stacks: [0-9]' src/game-core/data/cards src/game-core/data/monsters src/game-core/data/players -g '*.ts'
                                                             passed, no matches
git diff -- package-lock.json package.json                   passed, package.json script-only change; no dependency or package-lock change
```

Production preview evidence:

```txt
npx vite preview --host 127.0.0.1 --port 4196
GET /                                200 text/html, length 427
GET /assets/index-oeksCn8P.js        200 text/javascript, length 1480541
GET /assets/index-CiFIGUGT.css       200 text/css, length 575
```

The preview server was stopped after verification.

## Balance Evidence

```txt
npm run sim:balance
completed=93
lost=107
completion=46.5%
loss=53.5%
configured target=45.0% - 60.0%
average final HP=9.3
completed-run average final HP=20.0
completed-run HP range=1-50
```

This is the first simulation-backed normal baseline, not a claim of final human balance.

## Scope Control

- No Phaser or browser API imports were added to `src/game-core`.
- No UI/UX, Playwright, browser monkey testing, new art, animation work, large content expansion, or new dependency was added.
- The unrelated local `docs/ui_ux_interaction.md` change was preserved outside the Phase 1.5c worktree before final staging.
- No duplicate live `docs/contracts/p1.5/15-p15c-normal-difficulty-balance/` deliverable folder remains outside the supplied package snapshot.
