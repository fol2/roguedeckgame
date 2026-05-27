---
title: Run multi-phase hardening programmes with evidence gates
date: 2026-05-27
category: workflow-issues
module: hardening-debug-screen-programme
problem_type: workflow_issue
component: development_workflow
severity: high
applies_when:
  - "A feature spans multiple hardening phases that must remain reviewable"
  - "Browser behaviour must be reproducible through CLI, simulation, or trace replay"
  - "Each phase needs evidence, reviewer follow-up, and clean main integration before the next phase"
  - "Runtime provenance must stay aligned across browser, CLI, tests, and simulation"
related_components:
  - testing_framework
  - documentation
  - tooling
  - assistant
tags:
  - hardening-programme
  - debug-screen
  - evidence-gates
  - runtime-provenance
  - simulation-replay
  - browser-proof
  - reviewer-follow-up
  - fast-forward
---

# Run multi-phase hardening programmes with evidence gates

## Context

The hardening debug screen programme was not one bug fix. It was a Phase 1-13 execution path that turned the roguelite slice into something observable, replayable, and reviewable across deterministic core rules, Phaser presentation, CLI, simulation, and browser proof.

The durable problem was cross-boundary drift. Core event order could be correct while Phaser playback, input locks, visual card positions, or CLI/browser metadata drifted. A phase therefore could not be accepted just because the screen looked right. It needed reproducible evidence.

Earlier related sessions also showed several traps: patch-style draw reveal did not preserve actual card movement, overlay-only FX was not enough for draw/discard, a global playback timeout truncated longer event batches, browser automation could produce false negatives for pointer and Phaser timing, PowerShell/npm argument forwarding was brittle, shared CLI build output could race, and reports often went stale around final SHA evidence (session history).

## Guidance

Run hardening work as gated phases. Each phase should have a narrow purpose, focused tests, full validation where appropriate, browser proof for user-visible runtime paths, reviewer closure, and a clean integration point before the next phase starts.

Keep the architecture boundary visible throughout:

```bash
rg -n "from ['\"](.*phaser|phaser)['\"]|from \"phaser\"|from 'phaser'" src/game-core
```

Expected result: no matches. `src/game-core` owns deterministic rules and events. Phaser may render state, animate `GameEvent` batches, capture observations, and show debug surfaces, but it must not decide card legality, pet routing, monster ability resolution, reward resolution, or encounter progression.

Use one shared runtime provenance surface across browser debug, CLI, simulation, trace export, and tests. The hardening programme used metadata such as package name, package version, content version, event schema, trace schema, save schema, and registry fingerprint. Useful probes were:

```bash
npm run game:cli -- --version
node scripts/run-cli-entry.mjs simulate-runs --version
node scripts/run-cli-entry.mjs simulate-runs --mode smoke --analyze
```

Treat evidence bundles as part of the acceptance contract. The pattern that scaled was to leave phase-specific artefacts under `docs/evidence/hardening-debug-screen/`, for example:

```text
docs/evidence/hardening-debug-screen/phase8-test-bundle.txt
docs/evidence/hardening-debug-screen/phase8-cli-bundle.txt
docs/evidence/hardening-debug-screen/phase8-simulation-bundle.txt
docs/evidence/hardening-debug-screen/phase8-browser-debug-trace.json
docs/evidence/hardening-debug-screen/phase8-browser-trace-replay.txt
docs/evidence/hardening-debug-screen/phase13-test-bundle.txt
docs/evidence/hardening-debug-screen/phase13-cli-simulation-bundle.txt
docs/evidence/hardening-debug-screen/phase13-repository-hygiene.txt
```

For UI/runtime phases, capture browser evidence as screenshots plus structured proof when possible. Browser screenshots are useful for layout and state, but JSON traces or app/controller runtime output are often stronger when canvas automation has limited DOM visibility or Phaser pointer timing is noisy (session history).

Use reviewer gates as real phase gates. During this programme, advisory findings were treated as blockers until fixed and re-reviewed. That caught stale evidence labels, misleading damage wording, missing provenance parity, single-pet assumptions, and UI copy that understated health errors.

After merge or push, prove branch alignment directly:

```bash
git status --short --branch
git rev-parse HEAD main origin/main
git rev-list --left-right --count origin/main...main
```

For this programme, the final verified state after the later playback visual fix was `HEAD`, `main`, and `origin/main` all at `2cb24a7ed771f761622968e9ddae3ad7929e154d`.

## Why This Matters

Hardening work loses value when it is only described as code changes. The important outcome is that future failures become inspectable: debug state shows what the engine believed, playback observations show what Phaser did, parity diagnostics show visual drift, trace export makes browser failures replayable, and simulation/CLI output proves that the same metadata and content are being exercised.

The phase gate also protects scope. Foundation phases added observability and safety before later work added a read-only workbench, monster planned-card UX, status lifecycle hardening, multi-pet proof, and balance dashboard UX. That separation made regressions easier to isolate.

## When to Apply

- Use this pattern when a feature crosses deterministic core rules, Phaser presentation, CLI simulation, and browser interaction.
- Use it for debug tooling, event playback, trace/replay support, input race hardening, runtime metadata, and expansion tracks where Phaser must observe state without becoming the rules engine.
- Use it when reviewer confidence depends on artefacts: command bundles, screenshots, exported JSON, replay proof, and repository hygiene.
- Do not use it as an excuse to make every small bug fix heavyweight. The value appears when the change has multiple runtime surfaces or would be hard to trust from final state alone.

## Examples

Phase 8 was the foundation closure gate:

```bash
npm run typecheck
npm run build
npm run build:cli
npm test
npm run smoke:localhost
npm run game:cli -- --version
node scripts/run-cli-entry.mjs simulate-runs --mode replay --trace docs/evidence/hardening-debug-screen/phase8-browser-debug-trace.json
npm run sim:balance
npm run sim:exhaustive-small
git diff --check
```

Phase 13 showed the mature pattern. The dashboard reused `SimulationAggregateReport` rather than inventing a second reporting source, browser proof lived at `docs/evidence/hardening-debug-screen/phase13-balance-dashboard.png`, CLI/simulation proof lived in `phase13-cli-simulation-bundle.txt`, and repository hygiene lived in `phase13-repository-hygiene.txt`.

The phase sequence that ended up on `main` was:

```text
1b7b94d feat(hardening): align runtime provenance
5a8728f feat(hardening): add combat debug overlay
11020d2 feat(hardening): inspect combat event playback
8ff6998 feat(hardening): add combat parity diagnostics
9d0623f feat(hardening): sequence draw discard playback
096cb2f feat(hardening): guard combat input races
35adc98 feat(hardening): export replayable debug traces
604190e docs(hardening): record final debug evidence
e2a578d feat(workbench): add read-only content workbench
3bf2a15 feat(combat): render monster planned action cards
1282126 feat(status): harden status lifecycle events
5452042 feat(pets): prove multi-pet readiness
d12fb2d feat(workbench): add balance dashboard report
```

## Related

- `docs/plans/2026-05-27-018-hardening-debug-screen-plan.md`
- `docs/evidence/hardening-debug-screen/README.md`
- No earlier `docs/solutions/` entry existed for this workflow, so this document is the first searchable solution note for the pattern.
