# Phase 3 Content Schema Evidence

Date: 2026-05-27

Branch: `refactor/serialisable-content-schema`

## Scope

- Added serialisable content schema types for cards, statuses, pets, players, monster abilities, monsters, encounters, run map templates, pet upgrades, pet modifiers, player class modifiers, story events, and pet side stories.
- Added a schema compiler that converts JSON-safe content into the existing runtime registry shape.
- Preserved existing registry validation as the source of truth for content diagnostics.
- Added editor/import-facing diagnostics for malformed top-level collections and duplicate IDs, including nested run-map node IDs and embedded pet-side-story event IDs.

## Review

- Correctness reviewer: GREEN.
- API contract reviewer: GREEN after fixes for nested payload diagnostics, optional status semantics, warning gates, top-level duplicate paths, nested duplicate paths, and cross-side-story embedded event duplicates.

## Validation

- `npm run typecheck`: passed.
- `npm run build`: passed.
- `npm test`: passed, 75 files and 600 tests.
- `npm run sim:smoke`: passed, 3 runs and 0 failures.
- `npm run sim:replay -- --trace tests/game-core/traces/smoke-complete.json`: passed, 1 run and 0 failures.
- `git diff --check`: passed.
