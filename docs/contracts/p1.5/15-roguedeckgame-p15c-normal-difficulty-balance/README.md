# Phase 1.5c Patch Package — Normal Difficulty Balance

This package contains a Codex-ready patch for the pet roguelite deckbuilder.

## Contents

```txt
README.md
validation-report.md
codex-contract-p15c-normal-difficulty-balance.md
phase-1.5c-normal-difficulty-balance.patch
changed-files/
```

## Apply

From the repo root at commit `551543f84324a60295633b8cba8ca9b478a2852a` or current main derived from it:

```bash
patch -p1 < phase-1.5c-normal-difficulty-balance.patch
npm ci
npm run typecheck
npm test
npm run build
npm run build:cli
npm run sim:balance
```

## Purpose

The patch makes difficulty measurable before Phase 2 by fixing persistent run HP, centralizing Act 1 normal balance data, and adding an engine-side balance gate.

Target for the current automated normal proxy:

```txt
random legal fuzz sample completion rate: 45% - 60%
```

The deterministic smoke policy still completes; it is a flow smoke test, not the balance target.
