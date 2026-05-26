# Phase 1.5c Contract — Persistent Run HP and Normal Difficulty Balance Gate

## Objective

Use the Phase 1.5 simulation engine to make the current engine-side difficulty measurable and tunable before Phase 2 UI/UX work.

This ticket keeps the work core/engine-side only. It does not add Playwright, browser monkey testing, new UI, art, animation, or large content expansion.

## Design Position

A fresh starter on normal difficulty should not be expected to win nearly every run. For the current prototype, use a broad random-legal simulation sample as the automated balance proxy and target roughly a 50% final completion rate.

For CI stability, the normal balance gate accepts a band instead of a single exact value:

```txt
normal completion target: 45% - 60%
```

A deterministic smoke policy may still complete reliably; that policy is for “can the game complete?” smoke coverage, not the normal-difficulty balance target.

## Required Work

1. Add persistent run-level player HP.
   - `RunState` must own `playerHp` and `playerMaxHp`.
   - Starting HP should come from `PlayerClassDefinition.maxHp`.
   - Combat should start from the run HP instead of resetting to full HP each fight.
   - Won/lost combat completion should write combat player HP back to the run.
   - Lost runs should have `playerHp === 0`.
   - Rest nodes should heal persistent run HP without exceeding max HP.

2. Centralize normal-difficulty tuning.
   - Add `src/game-core/data/balance/act1-normal.ts`.
   - Move Phase 1 / Act 1 numeric card, monster, player HP, rest-heal, and target completion-rate constants there.
   - Update content data to read from those constants.

3. Improve simulation analytics.
   - Track final run HP and completed-run HP ranges.
   - Avoid double-counting status tick damage when a `DamageDealt` event also exists.
   - Add explicit completion-rate health gates.

4. Add a balance command.

```bash
npm run sim:balance
```

The command should run fuzz/analyze with invalid injection disabled and fail if the sampled completion rate is outside the configured normal-difficulty target band.

5. Add tests.
   - Persistent HP across combat.
   - Rest healing and clamp behavior.
   - Simulation HP metrics.
   - Completion-rate balance-gate health issues.
   - Updated committed replay trace.

## Validation

Run:

```bash
npm run typecheck
npm test
npm run build
npm run build:cli
npm run game:cli -- --seed cli-smoke --auto
npm run game:cli -- --seed cli-smoke --json --auto
npm run sim:smoke
npm run sim:fuzz -- --runs 20 --max-steps 300 --seed ci-fuzz
npm run sim:analyze -- --runs 20 --max-steps 300 --seed ci-fuzz --strict-health
npm run sim:balance
npm run sim:exhaustive-small -- --seed ci-exhaustive --max-depth 40 --max-states 1000
npm run sim:replay -- --trace tests/game-core/traces/smoke-complete.json
npm audit --audit-level=moderate
```

Optional stress gates:

```bash
npm run sim:fuzz -- --runs 250 --max-steps 500 --seed stress-fuzz
npm run sim:exhaustive-small -- --seed stress-exhaustive --max-depth 80 --max-states 5000
```

## Non-goals

- No UI/UX work.
- No Playwright.
- No monkey testing.
- No new dependency.
- No large content expansion.
- No claim that the game is finally balanced for humans; this is a first simulation-backed balance baseline.
