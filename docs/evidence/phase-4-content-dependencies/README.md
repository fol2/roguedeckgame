# Phase 4 Content Dependency Evidence

Date: 2026-05-27

Branch: `refactor/content-dependency-diagnostics`

## Scope

- Added deterministic content dependency graph reporting for authoring and reviewer workflows.
- Indexed references from cards, statuses, players, pets, monster abilities, monsters, encounters, run maps, pet upgrades, pet modifiers, player class modifiers, story events, and pet side stories.
- Added missing, unused, orphaned, and high-risk diagnostics with stable codes and paths.
- Added scoped dependency checks for monster intent schedules, run-map node links, embedded side-story events, linked top-level side-story events, story flags, and pet memories.
- Extended content reports and simulation analysis output with content dependency summaries and full issue detail lines.

## Review

- Correctness reviewer: GREEN.
- API contract reviewer: GREEN.

## Validation

- `npm run typecheck`: passed.
- `npm run build`: passed.
- `npm test`: passed, 76 files and 610 tests.
- `npm run sim:smoke`: passed, 3 runs and 0 failures.
- `npm run sim:replay -- --trace tests/game-core/traces/smoke-complete.json`: passed, 1 run and 0 failures.
- `npm run sim:smoke -- --analyze`: passed, dependency summary reported 96 references, 0 missing references, and 0 warnings for starter content.
- `git diff --check`: passed.
