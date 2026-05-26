# Independent Validation Report — roguedeckgame-review-c41b1c0ebcf2.zip

## Source ZIP

Validated uploaded archive:

```txt
roguedeckgame-review-c41b1c0ebcf2.zip
```

Commit reported in ZIP comment/listing:

```txt
c41b1c0ebcf2dda7ab33e4aa172fa248e3ff541a
```

## Baseline Result

The baseline Phase 1.5 delivery is mostly sound.

The following baseline commands passed from the extracted archive:

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run build:cli
npm run game:cli -- --help
npm run game:cli -- --seed cli-smoke --auto
npm run game:cli -- --seed cli-smoke --json --auto
npm run sim:smoke
npm run sim:fuzz -- --runs 20 --max-steps 300 --seed ci-fuzz
npm run sim:exhaustive-small -- --seed ci-exhaustive --max-depth 40 --max-states 1000
npm run sim:replay -- --trace tests/game-core/traces/smoke-complete.json
npm audit --audit-level=moderate
```

Baseline test count:

```txt
56 files / 426 tests passed
```

CLI authentic auto-play result:

```txt
Seed: cli-smoke
Final status: completed
Steps: 52
Invariant checks: passed
```

JSON CLI also returned:

```json
{"type":"result","ok":true,"seed":"cli-smoke","finalStatus":"completed","steps":52,"invariantChecks":53,"trace":"not saved"}
```

## Extra Stress Validation

I then ran a larger fuzz sample than the baseline CI command:

```bash
npm run sim:fuzz -- --runs 250 --max-steps 500 --seed stress-fuzz
```

This failed before the hotfix:

```txt
Simulation mode: fuzz
Seed prefix: stress-fuzz
Runs: 250
Failures: 3
Result: failed

Failure seed: stress-fuzz:2
Failure step: 34
Failure code: invalid_injected_action_accepted
Failure message: Invalid action injection produced an accepted action.

Failure seed: stress-fuzz:217
Failure step: 47
Failure code: invalid_injected_action_accepted
Failure message: Invalid action injection produced an accepted action.

Failure seed: stress-fuzz:218
Failure step: 60
Failure code: invalid_injected_action_accepted
Failure message: Invalid action injection produced an accepted action.
```

Representative root cause from the generated trace:

```json
{
  "type": "playCard",
  "cardInstanceId": "run:stress-fuzz:2:card:4:defend",
  "targetId": "monster:ash_mite:1"
}
```

`Defend` is targetless. The action included a dead monster target. The core accepted it, spent energy, gave block, and moved the card. That is too permissive for the agent/CLI protocol and fuzz simulation.

## Hotfix Applied Locally

The hotfix changes direct core validation in:

```txt
src/game-core/systems/combat.ts
```

It also adds tests in:

```txt
tests/game-core/combat-play-card.test.ts
tests/game-core/agent-run-driver.test.ts
```

Patch file included:

```txt
phase-1.5-hotfix.patch
```

## Post-Hotfix Result

After applying the hotfix, the focused tests passed:

```txt
3 files / 23 tests passed
```

Full validation passed:

```txt
56 files / 428 tests passed
```

Standard commands passed:

```bash
npm run typecheck
npm test
npm run build
npm run build:cli
npm run game:cli -- --help
npm run game:cli -- --seed cli-smoke --auto
npm run game:cli -- --seed cli-smoke --json --auto
npm run sim:smoke
npm run sim:fuzz -- --runs 20 --max-steps 300 --seed ci-fuzz
npm run sim:exhaustive-small -- --seed ci-exhaustive --max-depth 40 --max-states 1000
npm run sim:replay -- --trace tests/game-core/traces/smoke-complete.json
npm audit --audit-level=moderate
```

Stress validation also passed after the hotfix:

```bash
npm run sim:fuzz -- --runs 250 --max-steps 500 --seed stress-fuzz
npm run sim:fuzz -- --runs 400 --max-steps 350 --seed stress-fuzz-400
npm run sim:exhaustive-small -- --seed stress-exhaustive --max-depth 80 --max-states 5000
```

Results:

```txt
stress-fuzz: 250 runs, 0 failures
stress-fuzz-400: 400 runs, 0 failures
stress-exhaustive: 5000 states, 0 failures
```

## Notes

`npm run zip:review` could not be run from this extracted archive because the ZIP does not contain `.git` metadata. That is not a gameplay or test harness bug; it is a limitation of validating from an already exported review ZIP.

The Phase 1.5 harness is doing real work. The larger fuzz run found a concrete invalid-action acceptance bug that normal CI did not catch.
