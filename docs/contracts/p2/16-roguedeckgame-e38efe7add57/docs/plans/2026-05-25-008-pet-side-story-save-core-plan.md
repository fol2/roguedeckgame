# Pet Side-Story Save Core Plan

## Files to Add or Update

- Add pet story progression models and events in `src/game-core/model/story.ts`, `src/game-core/model/pet.ts`, and `src/game-core/model/event.ts`.
- Add save snapshot models in `src/game-core/model/save.ts`.
- Add pure core systems in `src/game-core/systems/story.ts` and `src/game-core/systems/save.ts`.
- Update Ember Fox story data in `src/game-core/data/story/ember-fox-story.ts`.
- Extend registry validation in `src/game-core/systems/validation.ts`.
- Add focused fixtures in `src/game-core/testing/story-fixtures.ts` and `src/game-core/testing/save-fixtures.ts`.
- Add required Vitest coverage under `tests/game-core`.
- Export the new public surface from `src/game-core/index.ts`.

## Test Plan

- Run `npm run typecheck`.
- Run `npm test`.
- Run `npm run smoke:localhost`.
- Run `npm audit --audit-level=moderate`.
- Run `git diff --check`.
- Compare copied contract files with `git diff --no-index`.
- Generate review ZIP after commit with `npm run zip:review`.

## Non-Goals

- No UI, Phaser, React, Vite presentation work, or browser storage adapter.
- No direct `localStorage`, filesystem, Electron, Tauri, cloud save, or production dependency.
- No combat resolver rewrite, map-generation rewrite, boss mechanics, relics, card upgrades, or meta-currency.

## Architecture Risks

- `src/game-core` must stay renderer-agnostic and deterministic.
- Story progression must emit plain serializable `GameEvent` objects.
- Save helpers must remain pure and platform-agnostic so browser, Electron, or Tauri shells can wrap them later.

## Story Repeatability Risks

- Non-repeatable events must be marked per `PetInstance`, not on global main-story state.
- Automatic side-story evaluation must target active pets only.
- Explicit application may target a specific inactive pet for future collection or management screens.
- Memory, flag, upgrade, and evolution unlock outcomes must be idempotent.

## Save Versioning Risks

- Snapshots need an explicit schema version and strict `ok: false` handling for invalid or unsupported data.
- Restored data should preserve active run state, pending rewards, pet story progress, and global story flags as plain JSON data.
- Corrupt slots must fail through `GameActionResult` rather than thrown exceptions.
