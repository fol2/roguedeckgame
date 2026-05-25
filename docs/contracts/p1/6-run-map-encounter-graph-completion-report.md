# Run Map Encounter Graph Completion Report

## Summary

Implemented the deterministic core-only run-map and encounter lifecycle for the pet roguelite deckbuilder.

The run flow now supports:

- create a seeded run from player class and active pet instances
- generate a deterministic layered Act 1 Forest map
- select available map nodes
- start encounter-backed combat from active combat, elite, or boss nodes
- complete won/lost combat nodes
- create explicit pending rewards for won non-boss combat
- claim or skip pending rewards through run lifecycle wrappers
- complete active nodes and advance connected nodes
- structurally complete event/rest placeholder nodes
- complete the run immediately on boss win for this ticket

## Changed File Tree

```txt
.github/workflows/ci.yml
docs/contracts/6-run-map-encounter-graph-contract.md
docs/contracts/6-run-map-encounter-graph.md
docs/contracts/6-run-map-encounter-graph-completion-report.md
docs/plans/2026-05-25-007-run-map-encounter-graph-plan.md
src/game-core/data/encounters/forest-encounters.ts
src/game-core/data/registry.ts
src/game-core/data/run-maps/act1-forest.ts
src/game-core/ids.ts
src/game-core/index.ts
src/game-core/model/encounter.ts
src/game-core/model/event.ts
src/game-core/model/registry.ts
src/game-core/model/run-map.ts
src/game-core/model/run.ts
src/game-core/systems/combat.ts
src/game-core/systems/run-lifecycle.ts
src/game-core/systems/run-map.ts
src/game-core/systems/validation.ts
src/game-core/testing/fixtures.ts
src/game-core/testing/run-fixtures.ts
tests/game-core/localhost-smoke.test.js
tests/game-core/model-shape.test.ts
tests/game-core/run-combat-flow.test.ts
tests/game-core/run-integration.test.ts
tests/game-core/run-map-generate.test.ts
tests/game-core/run-node-selection.test.ts
tests/game-core/run-reward-flow.test.ts
tests/game-core/run-validation.test.ts
```

## Verification

Commands run during final implementation review:

```txt
npm run typecheck
npm test
npm run smoke:localhost
npm audit --audit-level=moderate
git diff --check
git diff --no-index docs/contracts/6-run-map-encounter-graph-contract.md docs/contracts/6-run-map-encounter-graph.md
npm ls --depth=0 --omit=dev
rg Phaser import scan over src/game-core
rg Math.random scan over src/game-core
```

Results:

- `npm run typecheck`: passed.
- `npm test`: passed, 27 files / 252 tests.
- `npm run smoke:localhost`: passed.
- Latest implementation smoke URL observed during review: `http://127.0.0.1:58871/health`.
- `npm audit --audit-level=moderate`: passed, 0 vulnerabilities.
- `git diff --check`: passed.
- Contract copy compare passed.
- Production dependency check returned empty.
- `src/game-core` contains no Phaser imports.
- `src/game-core` contains no direct `Math.random()` usage.

`npm run zip:review` is expected to run after commit from a clean `HEAD`, because the script intentionally rejects dirty worktrees.

## Behaviour Confirmations

- `RunState` still uses `activePetInstanceIds: PetInstanceId[]`.
- `RunState` now owns lifecycle state through `status`, optional `map`, and optional `pendingRewardOffer`.
- Same seed plus same map template generates the same map.
- Different seeds can change encounter assignment.
- Initial available nodes are first-layer nodes.
- The Act 1 Forest graph is layered, acyclic, branching before boss, and boss-reachable.
- Selected combat nodes become active and move the run to `combat`.
- Selected combat nodes start combat from encounter data.
- Won non-boss combat creates an explicit open pending reward and moves the run to `reward`.
- Reward claim/skip clears the pending reward, completes the active node, and unlocks connected next nodes.
- Lost combat marks the run `lost`.
- Boss win completes the run immediately for this ticket.
- Event/rest nodes are structural placeholders and can be completed without story or rest effects.
- Multi-pet run creation remains model-supported and is limited through player-class data.
- A test-only two-pet player class proves two active pets and reward wrapper pet-array preservation.
- Normal gameplay errors return `ok: false` with `ActionRejected` and do not mutate input state.

## Registry and Validation

Validation now covers:

- duplicate encounter IDs
- malformed encounter registry surfaces and malformed encounter entries
- empty or missing encounter monster IDs
- missing encounter monster definitions
- unknown encounter types
- duplicate run map template IDs
- malformed run map template registry surfaces and malformed template/node entries
- duplicate map node IDs
- missing node connections
- backward or same-layer connections
- combat/elite/boss nodes without valid encounters
- encounter type mismatch for combat/elite/boss nodes
- non-combat nodes with encounter IDs as warnings
- missing previous connections for non-first-layer nodes
- missing or unreachable boss nodes

Validation remains deterministic and non-throwing for the malformed run-map and encounter cases added in this ticket.

## CI Status

Created `.github/workflows/ci.yml`.

The workflow runs:

- `npm ci`
- `npm run typecheck`
- `npm test`
- `npm audit --audit-level=moderate`

It has no deployment, secrets, or browser UI tests.

## Non-Goals Confirmed

No Phaser, Vite UI, React, art assets, save/load, story progression, full event narrative, rest-site effects, card upgrade resolution, relics, boss mechanics, weighted monster AI, reward UI, production dependencies, or single-global-pet model were added.

## Independent Review

Code reviewer status: GREEN after fixes.

Contract auditor status: GREEN for implementation after fixes. Closeout-only items were completion report, commit/push, and review ZIP generation from clean `HEAD`.

All reviewer advisories were treated as blockers and fixed before closeout.

## Final Handoff Note

The final pushed commit SHA and review ZIP path are reported in the final user handoff after this report is committed and the clean-HEAD review ZIP is generated. A committed report cannot self-reference its own final commit SHA without changing that SHA.
