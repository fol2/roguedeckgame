# Validation Report — Phase 1.5b Simulation Analysis / Balance Guard Patch

## Base ZIP validation

Uploaded ZIP validated:

```txt
roguedeckgame-p15-hotfix-strict-target-validation-review.zip
```

ZIP top-level archive comment / declared commit:

```txt
ec08726d06fd5957178a1721d4393fd2b4554287
```

GitHub connector check:

```txt
fol2/roguedeckgame main is identical to ec08726d06fd5957178a1721d4393fd2b4554287
compare status: identical
ahead_by: 0
behind_by: 0
```

Baseline validation commands passed on the extracted ZIP:

```txt
npm ci
npm run typecheck
npm test                         # 56 files / 428 tests passed
npm run build
npm run build:cli
npm run game:cli -- --seed cli-smoke --auto
npm run game:cli -- --seed cli-smoke --json --auto
npm run sim:smoke
npm run sim:fuzz -- --runs 20 --max-steps 300 --seed ci-fuzz
npm run sim:exhaustive-small -- --seed ci-exhaustive --max-depth 40 --max-states 1000
npm run sim:replay -- --trace tests/game-core/traces/smoke-complete.json
npm audit --audit-level=moderate
```

Baseline CLI authentic auto-play evidence:

```txt
Seed: cli-smoke
Final status: completed
Steps: 52
Invariant checks: passed
```

## Improvement finding

When the invalid-action generator was broadened locally, fuzzing found another real validation hole:

```json
{"type":"playCard","cardInstanceId":"...:strike","targetId":"player"}
```

Before this patch, a target-required player card could target the player and resolve damage against the player. This is not intended for the current Phase 1 target model. The patch fixes it in core combat validation with `invalid_target_type` and adds regression tests.

## Patch validation

Validated after applying the patch:

```txt
npm run typecheck                         passed
npm test                                  passed, 57 files / 434 tests
npm run build                             passed
npm run build:cli                         passed
npm run game:cli -- --seed cli-smoke --auto        passed
npm run game:cli -- --seed cli-smoke --json --auto passed
npm run sim:smoke                         passed
npm run sim:fuzz -- --runs 20 --max-steps 300 --seed ci-fuzz passed
npm run sim:analyze -- --runs 20 --max-steps 300 --seed ci-fuzz --strict-health passed
npm run sim:exhaustive-small -- --seed ci-exhaustive --max-depth 40 --max-states 1000 passed
npm run sim:replay -- --trace tests/game-core/traces/smoke-complete.json passed
npm audit --audit-level=moderate          passed
```

`sim:analyze` sample output:

```txt
Simulation mode: fuzz
Seed prefix: ci-fuzz
Runs: 20
Failures: 0
Result: passed
Analysis:
  Terminal: completed=18, lost=2, failed=0, other=0
  Rates: completion=90.0%, loss=10.0%, failure=0.0%
  Steps: avg=94.2, min=59, max=124
  Actions: accepted=1708, rejected=175, invalidRejected=175, invalidAccepted=0
  Combat: started=69, won=67, lost=2
  Rewards: offered=49, selected=42, skipped=7, cards=28, petUpgrades=14
  Damage: toPlayer=1542, toMonsters=2741, blocked=1469, playerBlock=1627
  Top card plays: strike=311, defend=203, fox_fetch=117, fox_guard=108, fox_bite=107, focus=103
  Top card rewards: ember_spark=10, kindle=7, quick_guard=4, coordinated_strike=3, fox_flare=3, study_command=1
  Pet upgrades: burning_fang=6, warm_bond=6, ash_instinct=2
  Reward types: card=28, petUpgrade=14
  Actions: playCard:targetless=592, playCard:targeted=535, endTurn=423, selectMapNode=130, completeCombatIfEnded=82, claimReward=56
  Health: no issues
```

Stress gates after patch:

```txt
npm run sim:fuzz -- --runs 250 --max-steps 500 --seed stress-fuzz
# passed, 250 runs, 0 failures, elapsed about 19s

npm run sim:fuzz -- --runs 400 --max-steps 350 --seed stress-fuzz-400
# passed, 400 runs, 0 failures, elapsed about 30s

npm run sim:exhaustive-small -- --seed stress-exhaustive --max-depth 80 --max-states 5000
# passed, 5000 states, 0 failures, elapsed about 10s
```

Patch application was also checked against a fresh extracted copy:

```txt
patch -p1 < phase-1.5b-simulation-analysis-balance-guard.patch
npm ci
npm run typecheck
npm test
npm run build
npm run build:cli
npm run sim:analyze -- --runs 20 --max-steps 300 --seed ci-fuzz --strict-health
```

All passed in the clean apply check.

## Notes

This patch does not attempt UI/UX monkey testing. That should remain a later ticket after UI/UX direction is settled.

This patch does not claim balance is solved. It creates early engine-side warning signals for overpowered/underpowered loops and flow coverage gaps.
