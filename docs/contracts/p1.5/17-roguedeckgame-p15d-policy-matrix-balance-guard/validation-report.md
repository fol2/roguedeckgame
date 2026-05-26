# Phase 1.5d Validation Report — Policy Matrix Balance Guard

## Base ZIP validation

Uploaded ZIP:

```txt
roguedeckgame-review-e38efe7add57.zip
```

Declared ZIP commit:

```txt
e38efe7add57b25cf23b2a9e7494f84f92db9597
```

GitHub validation:

```txt
repo: fol2/roguedeckgame
compare: e38efe7add57b25cf23b2a9e7494f84f92db9597...main
status: identical
ahead_by: 0
behind_by: 0
```

## Base validation evidence before patch

```txt
npm ci                                  passed, 0 vulnerabilities
npm run typecheck                       passed
npm test                                passed, 58 files / 443 tests
npm run build                           passed
npm run build:cli                       passed
npm run game:cli -- --seed cli-smoke --auto        passed, completed in 61 steps
npm run game:cli -- --seed cli-smoke --json --auto passed, completed in 61 steps
npm run sim:smoke                       passed
npm run sim:fuzz -- --runs 20 --max-steps 300 --seed ci-fuzz passed
npm run sim:analyze -- --runs 20 --max-steps 300 --seed ci-fuzz --strict-health passed
npm run sim:balance                     passed, completion 46.5%, target 45.0%-60.0%
npm run sim:exhaustive-small -- --seed ci-exhaustive --max-depth 40 --max-states 1000 passed
npm run sim:replay -- --trace tests/game-core/traces/smoke-complete.json passed
npm audit --audit-level=moderate        passed, 0 vulnerabilities
```

## Patch validation evidence

```txt
npm run typecheck                       passed
npm test                                passed, 60 files / 449 tests
npm run build                           passed
npm run build:cli                       passed
npm run game:cli -- --seed cli-smoke --auto        passed, completed in 61 steps
npm run game:cli -- --seed cli-smoke --json --auto passed, completed in 61 steps
npm run sim:smoke                       passed
npm run sim:fuzz -- --runs 20 --max-steps 300 --seed ci-fuzz passed
npm run sim:analyze -- --runs 20 --max-steps 300 --seed ci-fuzz --strict-health passed
npm run sim:balance                     passed, completion 46.5%, target 45.0%-60.0%
npm run sim:matrix                      passed
npm run sim:exhaustive-small -- --seed ci-exhaustive --max-depth 40 --max-states 1000 passed
npm run sim:replay -- --trace tests/game-core/traces/smoke-complete.json passed
npm audit --audit-level=moderate        passed, 0 vulnerabilities
```

Stress checks:

```txt
npm run sim:fuzz -- --runs 250 --max-steps 500 --seed stress-fuzz
=> passed, 250 runs, 0 failures, about 25s

npm run sim:exhaustive-small -- --seed stress-exhaustive --max-depth 80 --max-states 5000
=> passed, 5000 states, 0 failures, about 11s
```

Patch apply verification on fresh extracted ZIP:

```txt
patch -p1 < phase-1.5d-policy-matrix.patch  passed
npm ci                                      passed
npm run typecheck                           passed
npm test                                    passed, 60 files / 449 tests
npm run build:cli                           passed
npm run sim:matrix                          passed
```

## New matrix result

```txt
npm run sim:matrix

Policy matrix:
  Seed: policy-matrix-normal
  Runs per policy: 80
  Max steps: 700
  randomLegal: completion=48.8%, lost=51.2%, failures=0, target=45.0% - 60.0%
  greedyDamage: completion=100.0%, lost=0.0%, failures=0, target=35.0% - 85.0%
    WARNING high_completion_rate
  defensive: completion=100.0%, lost=0.0%, failures=0, target=35.0% - 85.0%
    WARNING high_completion_rate
  deterministicSmoke: completion=100.0%, lost=0.0%, failures=0, target=75.0% - 100.0%
  Result: passed
```

## Interpretation

The random/legal normal gate remains healthy at about 50% completion.

The new policy matrix shows that simple strong policies currently win every sampled run. This is not a crash/regression. It is a useful balance signal: the current prototype may have enough difficulty for random fresh play, but not much resistance against a coherent player that prioritizes pet upgrades and sensible combat choices.

This should not block Phase 2 UI/UX. It gives a better measurement tool for later tuning.
