# Phase 1.5b Patch Package — Simulation Analysis, Balance Guard, and Broader Invalid Action Fuzzing

Base ZIP validated: `roguedeckgame-p15-hotfix-strict-target-validation-review.zip`
Base commit declared by ZIP: `ec08726d06fd5957178a1721d4393fd2b4554287`
GitHub compare result: `ec08726d06fd5957178a1721d4393fd2b4554287` is identical to `main`.

This package contains a proposed engine-side improvement patch for the Phase 1.5 test engine.

## Files

- `codex-contract-p15b-simulation-analysis-balance-guard.md` — send this to Codex.
- `phase-1.5b-simulation-analysis-balance-guard.patch` — apply this patch from repo root with `patch -p1`.
- `validation-report.md` — local validation notes and command evidence.
- `changed-files/` — full copies of files changed by the patch.

## Apply

```bash
patch -p1 < phase-1.5b-simulation-analysis-balance-guard.patch
npm ci
npm run typecheck
npm test
npm run build
npm run build:cli
npm run sim:analyze -- --runs 20 --max-steps 300 --seed ci-fuzz --strict-health
```

## What this patch adds

- Engine-side simulation analytics for completion/loss/failure rates, step counts, damage, rewards, pet upgrades, card play counts, and invalid-action rejection coverage.
- `npm run sim:analyze` and CLI flags `--analyze` / `--strict-health`.
- A broader invalid-action enumerator used by fuzzing.
- A core combat validation fix: player card actions may not target the player when the card requires an action target.
- Tests for simulation analytics, broader invalid-action coverage, and the newly found target-validation bug.
