# Run Map Encounter Graph Plan

## Files to Add or Update

- Add encounter and run-map models in `src/game-core/model`.
- Add forest encounter data and the Act 1 Forest map template in `src/game-core/data`.
- Add deterministic map generation in `src/game-core/systems/run-map.ts`.
- Add run creation, node selection, combat start/completion, pending reward settlement, and non-combat placeholder completion in `src/game-core/systems/run-lifecycle.ts`.
- Extend registry validation, run fixtures, event shapes, public exports, localhost smoke evidence, and CI.
- Copy the contract into `docs/contracts/6-run-map-encounter-graph.md`.
- Add a completion report in `docs/contracts` after implementation and review.

## Data Model Approach

- Keep `RunState` as the single lifecycle owner via `status`, optional `map`, and optional `pendingRewardOffer`.
- Use `RunMapState` with layered `RunNodeState` records for future UI rendering and branching.
- Use `RunMapTemplateDefinition` as deterministic, data-driven map config.
- Keep event/rest nodes as structural placeholders only.
- Keep boss encounters structurally typed while reusing existing monster definitions.

## Test Plan

- Add required Vitest suites for map generation, node selection, combat flow, reward flow, validation, and integration.
- Update model shape coverage for run lifecycle events.
- Extend localhost smoke to prove create/select/start/win/reward/advance behaviour.
- Run `npm run typecheck`, `npm test`, `npm run smoke:localhost`, `npm audit --audit-level=moderate`, and `npm run zip:review`.
- Scan `src/game-core` for Phaser imports and direct `Math.random()`.

## Non-Goals

- No Phaser, Vite UI, React, art assets, save/load, story progression, rest effects, reward UI, card upgrades, relics, boss mechanics, weighted monster AI, or production dependencies.

## Architecture Risks

- Keep all run lifecycle logic in `src/game-core`.
- Do not let Phaser or UI assumptions leak into map and encounter models.
- Do not hardcode a single active pet; `createRun` must keep `activePetInstanceIds`.

## Event-Order Risks

- Emit `RunCreated` before map generation availability events.
- Emit `RunCombatStarted` before combat creation events in run-start wrappers.
- Emit reward settlement events before `RunNodeCompleted` and `RunAdvanced`.

## Run/Reward Transition Risks

- Keep `pendingRewardOffer` explicit.
- Do not advance a combat node until an open reward is claimed or skipped.
- On boss win, complete the run immediately for this ticket.

## Multi-Pet Risks

- Enforce max active pets through player-class data.
- Use test-only player data for two-pet creation.
- Preserve returned pet instance arrays through reward wrappers.
