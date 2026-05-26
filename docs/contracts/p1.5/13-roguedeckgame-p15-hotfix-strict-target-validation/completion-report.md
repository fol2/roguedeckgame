# Phase 1.5 Hotfix Strict Target Validation Completion Report

## Summary

Applied the Phase 1.5 hotfix for strict target validation in the core combat system. `playCard` now rejects target ids on cards that do not require an explicit action target, returning `unexpected_card_target` through the normal rejected combat result path.

The fix is intentionally narrow. It changes core validation in `src/game-core/systems/combat.ts`, adds direct combat regression coverage, and adds agent-driver coverage that verifies the invalid action is rejected without changing the run state hash.

## Changed Files

- `src/game-core/systems/combat.ts`
- `tests/game-core/combat-play-card.test.ts`
- `tests/game-core/agent-run-driver.test.ts`
- `docs/contracts/p1.5/13-roguedeckgame-p15-hotfix-strict-target-validation/completion-report.md`

## Contract Coverage

- Direct `playCard` rejects a targetless `Defend` action that includes `targetId`.
- Error code is `unexpected_card_target`.
- Error message is `Targetless cards must not include a target id.`
- Error path is `targetId`.
- Rejected action returns `ok: false`.
- Rejected action preserves the original combat state object.
- Serialized state remains unchanged after rejection.
- Rejected action emits exactly one `ActionRejected` event.
- The card is not moved, energy is not spent, and player block, monster HP, piles, and state events are not mutated.
- Agent-run driver rejects the same invalid action with an alive monster target.
- Agent-run driver state hash is identical before and after the rejected action.
- The invalid action injector and agent action schema were not changed.
- The fix was not moved into Phaser, browser, CLI-only, or presentation code.
- No dependency changes were made.

## Verification Results

Run from `D:\Coding\roguedeckgame` on 26 May 2026 after `npm ci`:

```txt
cmd /c "npm ci"
passed: 49 packages installed, 50 audited, 0 vulnerabilities

cmd /c "npx vitest run tests/game-core/combat-play-card.test.ts tests/game-core/agent-run-driver.test.ts tests/game-core/simulation-fuzz.test.ts --reporter=verbose"
passed: 3 test files, 23 tests

cmd /c "npm run typecheck"
passed

cmd /c "npm test"
passed: 56 test files, 428 tests

cmd /c "npm run build"
passed: dist/index.html, dist/assets/index-CiFIGUGT.css, dist/assets/index-TrO_L5KH.js

cmd /c "npm run build:cli"
passed: dist-cli/game-cli.mjs and dist-cli/simulate-runs.mjs

cmd /c "npm run game:cli -- --help"
passed: emitted Pet Roguelite CLI help

cmd /c "npm run game:cli -- --seed cli-smoke --auto"
passed: final status completed, 52 steps, invariant checks passed

cmd /c "npm run game:cli -- --seed cli-smoke --json --auto"
passed: JSON ok true, final status completed, 52 steps, 53 invariant checks

cmd /c "npm run sim:smoke"
passed: 3 runs, 0 failures

cmd /c "npm run sim:fuzz -- --runs 20 --max-steps 300 --seed ci-fuzz"
passed: 20 runs, 0 failures

cmd /c "npm run sim:exhaustive-small -- --seed ci-exhaustive --max-depth 40 --max-states 1000"
passed: 1000 states, 0 failures

cmd /c "npm run sim:replay -- --trace tests/game-core/traces/smoke-complete.json"
passed: 1 replay, 0 failures

cmd /c "npm audit --audit-level=moderate"
passed: 0 vulnerabilities

git diff --check
passed

cmd /c "npm run smoke:localhost"
passed: http://127.0.0.1:52272/health
```

Stress validation required by the hotfix contract:

```txt
cmd /c "npm run sim:fuzz -- --runs 250 --max-steps 500 --seed stress-fuzz"
passed: 250 runs, 0 failures

cmd /c "npm run sim:fuzz -- --runs 400 --max-steps 350 --seed stress-fuzz-400"
passed: 400 runs, 0 failures

cmd /c "npm run sim:exhaustive-small -- --seed stress-exhaustive --max-depth 80 --max-states 5000"
passed: 5000 states, 0 failures
```

Architecture checks:

```txt
rg "Math\.random|from ['\"]phaser|game-phaser|/app/|localStorage|sessionStorage|window|document" src/game-core
passed: no matches

git diff -- package.json package-lock.json
passed: no dependency changes
```

## Runtime Evidence

The hotfix affects pure `game-core` validation and the CLI/simulation harness. Runtime proof is covered by the production build, CLI/simulation commands, localhost smoke, and Vite production preview:

```txt
cmd /c "npx vite preview --host 127.0.0.1 --port 4183"
served production build

http://127.0.0.1:4183/
HTTP 200, text/html, length 427

http://127.0.0.1:4183/assets/index-CiFIGUGT.css
HTTP 200, text/css, length 575

http://127.0.0.1:4183/assets/index-TrO_L5KH.js
HTTP 200, text/javascript, length 1476841
```

The final review ZIP and extracted production preview are generated after the completion report is committed, so the exact final ZIP path, final commit SHA, and extracted-preview HTTP checks are recorded in the final hand-off.

This repository has no external deployment target in the hotfix contract. For this browser-first Vite slice, the deployed-runtime evidence is the committed production build validation, the review ZIP, and the extracted ZIP served through Vite production preview.

## Non-Goals Confirmed

- Card balance was not changed.
- Agent action schema was not changed.
- Invalid action injector was not changed to hide the issue.
- No Phaser or browser dependency was introduced into `src/game-core`.
- No Playwright or browser automation was added.
