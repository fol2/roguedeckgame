# Phase 1.5 Agent Play Harness, CLI, Simulation Testing, and Replayable Regression Traces Completion Report

## Summary

Implemented a pure `src/game-core/testing` agent play harness for Phase 1.5. The harness can create deterministic runs, enumerate legal actions, apply actions through core run/combat/reward systems, check invariants after actions, hash gameplay state, run deterministic smoke playthroughs, fuzz legal and invalid actions, perform bounded exhaustive exploration, and replay regression traces.

The implementation keeps gameplay rules in `src/game-core`. The CLI and simulation scripts are wrappers over the pure-core harness and do not use Phaser, browser APIs, Playwright, or production dependencies.

## Changed Files

- `.gitignore`
- `package.json`
- `src/game-core/index.ts`
- `tsconfig.json`
- `vite.cli.config.ts`
- `src/game-core/testing/agent-actions.ts`
- `src/game-core/testing/action-space.ts`
- `src/game-core/testing/run-driver.ts`
- `src/game-core/testing/invariants.ts`
- `src/game-core/testing/policies.ts`
- `src/game-core/testing/simulation.ts`
- `src/game-core/testing/state-hash.ts`
- `src/game-core/testing/trace.ts`
- `src/game-cli/main.ts`
- `src/game-cli/format.ts`
- `src/game-cli/parse.ts`
- `src/game-cli/simulate-runs.ts`
- `tests/game-core/agent-action-space.test.ts`
- `tests/game-core/agent-run-driver.test.ts`
- `tests/game-core/agent-playthrough-smoke.test.ts`
- `tests/game-core/simulation-invariants.test.ts`
- `tests/game-core/simulation-fuzz.test.ts`
- `tests/game-core/simulation-exhaustive-small.test.ts`
- `tests/game-core/trace-replay.test.ts`
- `tests/game-core/traces/.gitkeep`
- `tests/game-core/traces/smoke-complete.json`
- `docs/contracts/12-agent-play-harness-simulation-testing-contract.md`
- `docs/contracts/12-agent-play-harness-simulation-testing.md`
- `docs/contracts/p1.5/12-agent-play-harness-simulation-testing-contract.md`
- `docs/contracts/p1.5/12-agent-play-harness-simulation-testing.md`
- `docs/contracts/p1.5/12-agent-play-harness-simulation-testing-completion-report.md`

## CLI Usage

```bash
npm run game:cli -- --help
npm run game:cli -- --seed cli-smoke --auto
npm run game:cli -- --seed cli-smoke --json --auto
```

On Windows PowerShell, npm's `npm.ps1` shim treats `--help` as an npm-level option before script execution. The exact contract command was verified through `npm.cmd` with `cmd /c "npm run game:cli -- --help"`, which runs the game CLI help without npm forwarding warnings. Other documented forwarding commands were also verified through `npm.cmd`/`cmd /c` for clean argument forwarding.

## Simulation Usage

```bash
npm run sim:smoke
npm run sim:fuzz -- --runs 20 --max-steps 300 --seed ci-fuzz
npm run sim:exhaustive-small -- --seed ci-exhaustive --max-depth 40 --max-states 1000
npm run sim:replay -- --trace tests/game-core/traces/smoke-complete.json
```

The simulation CLI also supports `--trace-output <path>` for manually writing a selected trace. Tests and default simulation commands do not write random trace artefacts into the repository.

## Dependency Notes

No new production dependency was added.

No new dev dependency was added.

No Playwright, browser automation, React, Redux, Zustand, GSAP, Pixi, Electron, Tauri, browser storage library, animation library, `tsx`, `ts-node`, or custom TypeScript runtime was added.

## Authentic Playthrough Evidence

- `cmd /c "npm run game:cli -- --help"`: passed, emitted Pet Roguelite CLI help.
- `npm run game:cli -- --seed cli-smoke --auto`: passed, final status `completed`, 52 steps, invariant checks passed.
- `npm run game:cli -- --seed cli-smoke --json --auto`: passed, JSON result `ok:true`, final status `completed`, 52 steps, 53 invariant checks.
- `npm run sim:smoke`: passed, 3 smoke traces, 0 failures.
- `tests/game-core/traces/smoke-complete.json`: committed replay trace for seed `agent-smoke`, final status `completed`.
- `npm run sim:replay -- --trace tests/game-core/traces/smoke-complete.json`: passed, 1 replay, 0 failures.

No test or simulation mutates combat phase to force `won` or `lost` for authentic playthrough success.

## Verification Results

Run from `D:\Coding\roguedeckgame` after `npm ci`:

```txt
npm ci
passed: 49 packages installed, 50 audited, 0 vulnerabilities

npm run typecheck
passed

npm test
passed: 56 test files, 426 tests

npm run build
passed: dist/index.html, dist/assets/index-CiFIGUGT.css, dist/assets/index-DtpsJkmP.js

npm run build:cli
passed: dist-cli/game-cli.mjs and dist-cli/simulate-runs.mjs

cmd /c "npm run game:cli -- --help"
passed: emitted Pet Roguelite CLI help

npm run game:cli -- --seed cli-smoke --auto
passed: completed in 52 steps

npm run game:cli -- --seed cli-smoke --json --auto
passed: JSON ok true, completed in 52 steps, 53 invariant checks

npm run sim:smoke
passed: 3 runs, 0 failures

npm run sim:fuzz -- --runs 20 --max-steps 300 --seed ci-fuzz
passed: 20 runs, 0 failures

npm run sim:exhaustive-small -- --seed ci-exhaustive --max-depth 40 --max-states 1000
passed: 1000 explored traces, 0 failures

npm run sim:replay -- --trace tests/game-core/traces/smoke-complete.json
passed: 1 replay, 0 failures

npm audit --audit-level=moderate
passed: 0 vulnerabilities

git diff --check
passed

npm run smoke:localhost
passed: http://127.0.0.1:63572/health
```

Additional checks:

```txt
rg "Math\.random|from ['\"]phaser|game-phaser|/app/|localStorage|sessionStorage|window|document" src/game-core -n
passed: no matches

npm ls phaser vite --depth=0
passed: phaser@4.1.0, vite@8.0.14

npm ls --depth=0 --omit=dev
passed: only phaser@4.1.0

docs/contracts/p1.5/12-agent-play-harness-simulation-testing-contract.md
docs/contracts/p1.5/12-agent-play-harness-simulation-testing.md
passed: exact match

docs/contracts/12-agent-play-harness-simulation-testing-contract.md
docs/contracts/12-agent-play-harness-simulation-testing.md
passed: exact match
```

## Runtime Evidence

- `npm run smoke:localhost`: passed, localhost smoke URL `http://127.0.0.1:63572/health`.
- `npx vite preview --host 127.0.0.1 --port 4178`: served the production build.
- `http://127.0.0.1:4178/`: HTTP 200, `text/html`, length 427.
- `http://127.0.0.1:4178/assets/index-CiFIGUGT.css`: HTTP 200, `text/css`, length 575.
- `http://127.0.0.1:4178/assets/index-DtpsJkmP.js`: HTTP 200, `text/javascript`, length 1476676.

## Review Fixes

Independent review found and the implementation fixed these blockers before final validation:

- Invalid-action injection is context-aware and fuzz simulations fail if an `invalid-injected` action is accepted.
- Trace replay now validates recorded source, events, errors, state hash, invariants, and final status.
- Driver creation and reset preserve `createRun` rejection status, events, and errors.
- Legal action generation accounts for pet-command cost modifiers such as Warm Bond.
- CLI build no longer clears `dist-cli`, avoiding parallel script races.
- `parseAgentTrace` accepts valid numeric seed `0`.

## Review ZIP Note

`npm run zip:review` intentionally requires a clean committed worktree. The final review ZIP and extracted-ZIP validation are produced after the completion report is committed, so the exact ZIP path, final SHA, and extracted-ZIP command results are recorded in the final hand-off. This avoids recording a self-referential SHA that changes when this report is committed.

## Later Ticket Note

Playwright/browser monkey testing remains a later optional ticket. This Phase 1.5 ticket is limited to pure-core agent play, CLI, simulation, fuzzing, invariants, bounded exhaustive exploration, and trace replay.
