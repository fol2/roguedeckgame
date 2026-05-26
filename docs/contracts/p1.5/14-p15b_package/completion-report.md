# Phase 1.5b Completion Report - Simulation Analysis, Balance Guard, and Broader Invalid Action Fuzzing

## Summary

Implemented the Phase 1.5b engine-side simulation analysis package on top of the Phase 1.5 strict target-validation base. The change keeps the work in Node-testable `game-core` and CLI code, adds broader invalid-action generation, fixes the player-targeted card validation hole, and exposes simulation health metrics through `sim:analyze`.

Implementation and validation evidence was captured from pushed implementation SHA `aeb4fe6db64c3545c34076207866c41d887f1d4e`. This report is the same-folder closure artefact for that implementation and its review-loop fix. A committed file cannot contain its own final commit SHA, so the final handoff and final auditor verification record `HEAD`, `origin/main`, and remote `main` equality after this report-only closure commit is pushed.

## Changed Scope

- `src/game-core/testing/policies.ts`
  - Added `enumerateInvalidAgentActions`.
  - Updated `invalidActionInjector` to choose from the broader illegal-action set.
  - Invalid candidates are filtered against `getLegalAgentActions`.
- `src/game-core/systems/combat.ts`
  - Rejects player-card action targets that resolve to non-monster combatants when a card requires an action target.
  - Uses `invalid_target_type`, emits `ActionRejected`, and preserves the original combat state.
- `src/game-core/testing/analysis.ts`
  - Added `analyzeAgentTrace`, `analyzeAgentTraces`, `checkSimulationHealth`, and `sortedCountEntries`.
- `src/game-cli/parse.ts`
  - Added `--analyze` and `--strict-health`.
- `src/game-cli/simulate-runs.ts`
  - Prints compact aggregate analysis and health output.
  - `--strict-health` fails only on health errors, not warnings.
- `src/game-core/index.ts`
  - Exports the analysis helpers from the public barrel.
- `package.json`
  - Added `sim:analyze`.
- Tests
  - Added simulation-analysis coverage.
  - Strengthened fuzz invalid-action tests.
  - Added direct combat regression coverage for player-targeted target-required cards.

## Contract Coverage

- Broader invalid-action generation: done.
- Invalid action list filtered against the legal action space: done.
- Invalid injector now samples the enumerated list: done.
- Player-targeted target-required cards rejected: done.
- Rejection is non-mutating and emits `ActionRejected`: done.
- Simulation analysis module added and exported: done.
- CLI analysis output and strict-health behaviour added: done.
- Core-only tests added without Phaser/browser requirements: done.
- No UI/UX, Phaser scene, Playwright, browser monkey test, content, balance, or production dependency changes: done.

## Git and Artefacts

Pushed implementation SHA:

```txt
aeb4fe6db64c3545c34076207866c41d887f1d4e
```

Review ZIP artefacts:

```txt
D:\Coding\roguedeckgame-review-aeb4fe6db64c.zip
D:\Coding\roguedeckgame-p15b-simulation-analysis-balance-guard-review.zip
```

Extracted validation copy:

```txt
C:\Users\fol2h\AppData\Local\Temp\roguedeckgame-p15b-simulation-analysis-balance-guard-final\roguedeckgame-aeb4fe6db64c
```

The stable review ZIP path is refreshed after final report closure so reviewers and handoff can use a stable artefact name even though the generated SHA-specific ZIP name changes with a report-only commit.

## Validation Evidence

Commands run from `D:\Coding\roguedeckgame`:

```txt
npm ci
added 49 packages, audited 50 packages, 0 vulnerabilities

npm run typecheck
passed

npm test
57 files passed, 434 tests passed

npm run build
passed
dist/index.html 0.42 kB, dist/assets/index-CiFIGUGT.css 0.57 kB, dist/assets/index-qoXW_d1N.js 1,476.95 kB

npm run build:cli
passed
dist-cli/game-cli.mjs, dist-cli/simulate-runs.mjs

cmd /c "npm run game:cli -- --seed cli-smoke --auto"
Final status: completed, steps: 52, invariant checks: passed

cmd /c "npm run game:cli -- --seed cli-smoke --json --auto"
{"type":"result","ok":true,"seed":"cli-smoke","finalStatus":"completed","steps":52,"invariantChecks":53,"trace":"not saved"}

cmd /c "npm run sim:smoke"
3 runs, 0 failures

cmd /c "npm run sim:fuzz -- --runs 20 --max-steps 300 --seed ci-fuzz"
20 runs, 0 failures

cmd /c "npm run sim:analyze -- --runs 20 --max-steps 300 --seed ci-fuzz --strict-health"
20 runs, 0 failures, Health: no issues

cmd /c "npm run sim:exhaustive-small -- --seed ci-exhaustive --max-depth 40 --max-states 1000"
1000 states, 0 failures

cmd /c "npm run sim:replay -- --trace tests/game-core/traces/smoke-complete.json"
1 replay, 0 failures

npm audit --audit-level=moderate
0 vulnerabilities

git diff --check
passed
```

Focused regression evidence:

```txt
npx vitest run tests/game-core/simulation-analysis.test.ts tests/game-core/simulation-fuzz.test.ts tests/game-core/combat-play-card.test.ts --reporter=verbose
3 files passed, 20 tests passed
```

Stress gates:

```txt
cmd /c "npm run sim:fuzz -- --runs 250 --max-steps 500 --seed stress-fuzz"
250 runs, 0 failures

cmd /c "npm run sim:fuzz -- --runs 400 --max-steps 350 --seed stress-fuzz-400"
400 runs, 0 failures

cmd /c "npm run sim:exhaustive-small -- --seed stress-exhaustive --max-depth 80 --max-states 5000"
5000 states, 0 failures
```

Architecture and dependency evidence:

```txt
rg "Math\.random|from ['\"]phaser|game-phaser|/app/|localStorage|sessionStorage|window|document" src/game-core
no matches

git diff -- package-lock.json package.json
only package.json script addition; no package-lock or dependency change
```

## Production Preview Evidence

Production build was served with:

```txt
npx vite preview --host 127.0.0.1 --port 4186
```

HTTP smoke results:

```txt
http://127.0.0.1:4186/ -> 200 text/html, length 427
http://127.0.0.1:4186/assets/index-CiFIGUGT.css -> 200 text/css, length 575
http://127.0.0.1:4186/assets/index-qoXW_d1N.js -> 200 text/javascript, length 1476955
```

Extracted review ZIP production preview was also served with:

```txt
npx vite preview --host 127.0.0.1 --port 4187
```

Extracted HTTP smoke results:

```txt
http://127.0.0.1:4187/ -> 200 text/html, length 415
http://127.0.0.1:4187/assets/index-CiFIGUGT.css -> 200 text/css, length 575
http://127.0.0.1:4187/assets/index-qoXW_d1N.js -> 200 text/javascript, length 1476955
```

Localhost health smoke:

```txt
npm run smoke:localhost
localhost smoke URL: http://127.0.0.1:50199/health
1 file passed, 1 test passed
```

## `sim:analyze` Sample

```txt
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

## Review Closure

- Independent code reviewer `019e63a8-901a-7b92-8c09-d43b535bf671` reported GREEN on pushed implementation SHA `aeb4fe6db64c3545c34076207866c41d887f1d4e`.
- Independent contract auditor `019e63a8-aad6-7653-8149-d58ae64e82e5` reported RED only because this report still contained stale pending-review wording and did not yet record final artefact/review closure evidence.
- This report update removes the stale pending wording and records the review ZIP, extracted validation copy, production-preview evidence, and reviewer outcomes.
- A final independent code review and contract audit must be GREEN on the pushed report-closure state before the goal is marked complete.

## Non-Goals Confirmed

- No Playwright added.
- No browser monkey test added.
- No Phaser scene change added.
- No UI/UX change added.
- No card, pet, monster, boss, story, or balance content change added.
- No claim that balance is solved; this adds early warning signals only.
