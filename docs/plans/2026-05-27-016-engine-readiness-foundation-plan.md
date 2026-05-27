---
title: Engine Readiness Foundation
status: active
date: 2026-05-27
origin: user request via compound-engineering:lfg
---

# Engine Readiness Foundation

## Problem Frame

The first three refactor rounds have made combat, card actions, pet targeting, status behaviour metadata, trigger windows, and Phaser event playback easier to extend. The engine is still not ready for larger game production because several expansion-critical behaviours are only metadata surfaces or narrow Phase 1 implementations.

This plan turns the remaining "true game-ready engine" gaps into deterministic foundations that future cards, pets, player classes, statuses, encounters, rewards, saves, and authoring tools can build on without adding card-name-specific or Phaser-side rules.

## Scope Boundaries

In scope:

- Add deterministic engine primitives for status lifecycle, trigger cascades, class passives, deck economy, encounter intent scheduling, save migrations, and authoring reports.
- Keep all gameplay rules in `src/game-core`.
- Add focused data only when needed to prove the new surfaces.
- Add or update core tests for each behaviour-bearing unit.
- Preserve existing first playable behaviour unless a test demonstrates a needed compatibility adjustment.

Out of scope:

- Final game balance or a full card set.
- Final UI for shops, rest sites, class selection, pet evolution screens, or story screens.
- Production art assets.
- Networked persistence or backend services.
- Recursive trigger designs that allow unbounded loops.

## Assumptions

- The work lands as one feature branch and one PR because the user explicitly asked LFG to do all listed engine-readiness items.
- The initial implementation should be conservative foundations, not complete content packs.
- Existing authored content should continue to validate and play.
- Phaser should consume new typed events but should not decide new gameplay rules.

## Requirements Traceability

- R1: Status system can express more than Burn and can handle stacking, duration, expiry, cleanse, and immunity deterministically.
- R2: Triggered effects can use a bounded deterministic queue rather than a forever-disabled cascade policy.
- R3: Player class passives have runtime resolution through core systems rather than metadata-only validation.
- R4: Deckbuilder economy primitives exist for upgrade, remove, transform, create, exhaust, discard, retain, draw, and energy-style effects where appropriate.
- R5: Monster intents can be scheduled by deterministic patterns and conditions for elites and bosses.
- R6: Save restore has a versioned migration path and clear diagnostics for incompatible snapshots.
- R7: Authoring and balance tooling reports the new extension surfaces so content growth has guardrails.
- R8: UI-facing events stay typed and replayable so animation can follow state movements without fallback inference.

## Key Technical Decisions

- Use registries and small resolver modules rather than broad manager classes.
- Extend existing effect and status descriptors rather than introduce card-specific code paths.
- Resolve class passives through the same trigger-frame concept used by pet modifiers.
- Keep trigger cascades bounded by depth and per-window identity to avoid infinite combo loops.
- Treat save migrations as pure functions from unknown serialised snapshots to current `SaveSnapshot`.
- Add content reports and tests before relying on manual content review.

## Implementation Units

### U1: Status Lifecycle Foundation

Goal: Generalise statuses from Burn-only start-of-turn damage into a small lifecycle engine.

Modify:

- `src/game-core/model/status.ts`
- `src/game-core/model/effect.ts`
- `src/game-core/model/event.ts`
- `src/game-core/systems/status-behaviours.ts`
- `src/game-core/systems/statuses.ts`
- `src/game-core/systems/effect-validation.ts`
- `src/game-core/systems/effects.ts`
- `src/game-core/systems/validation.ts`
- `src/game-core/index.ts`

Tests:

- `tests/game-core/combat-status.test.ts`
- `tests/game-core/content-authoring.test.ts`
- `tests/game-core/registry.test.ts`

Approach:

- Add supported status behaviour descriptors for stack changes, duration expiry, immunity, cleanse, and turn-window processing.
- Add typed events for cleansed, blocked/immune, and expired statuses.
- Add effect types for cleansing and removing statuses, with deterministic target resolution.
- Preserve Burn as a `startOfTurnDamage` descriptor.

Test scenarios:

- Burn still ticks, deals damage, decrements, and expires in the same event order.
- A duration-based status expires without damage at its configured turn window.
- Cleanse removes a matching status and emits a typed event.
- Immunity blocks an incoming status and emits a typed event without mutating stacks.
- Registry validation rejects combat-applied statuses without runtime-supported behaviour.

Verification:

- Focused status tests pass.
- Existing vertical slice combat traces remain valid or are intentionally updated with clear event differences.

### U2: Trigger Queue and Class Passive Runtime

Goal: Provide a bounded deterministic reaction queue that can resolve pet modifiers and player class passives through the same trigger-window pipeline.

Modify:

- `src/game-core/model/player.ts`
- `src/game-core/model/pet.ts`
- `src/game-core/model/event.ts`
- `src/game-core/systems/trigger-rules.ts`
- `src/game-core/systems/pet-modifiers.ts`
- `src/game-core/systems/combat.ts`
- `src/game-core/systems/run-lifecycle.ts`
- `src/game-core/systems/validation.ts`
- `src/game-core/data/players/novice-tamer.ts`

Create:

- `src/game-core/systems/class-modifiers.ts`
- `src/game-core/systems/trigger-queue.ts`

Tests:

- `tests/game-core/pet-modifier-trigger-rules.test.ts`
- `tests/game-core/pet-modifier-integration.test.ts`
- `tests/game-core/class-modifiers.test.ts`
- `tests/game-core/combat-play-card.test.ts`

Approach:

- Introduce class modifier rules with trigger predicates and effects.
- Add a trigger queue that consumes event windows, resolves eligible pet and class triggers in deterministic owner order, and enforces max depth and once-per-window safeguards.
- Preserve old non-recursive trigger behaviour unless content explicitly opts into bounded cascade.
- Emit typed activation/consumption events for class modifiers.

Test scenarios:

- Existing pet modifier trigger still fires once when a burned enemy is defeated.
- A class passive can trigger from a card-played or status-applied event and resolve effects.
- Trigger cascades respect max depth and emit a warning/rejection event rather than looping forever.
- Pet triggers resolve before class triggers or vice versa according to the documented deterministic ordering.

Verification:

- Trigger tests cover event order, not only final HP.
- No Phaser imports are introduced into `src/game-core`.

### U3: Deck Economy Effects and Reward Operations

Goal: Add common deckbuilder primitives without building final shop/rest UI.

Modify:

- `src/game-core/model/effect.ts`
- `src/game-core/model/event.ts`
- `src/game-core/model/reward.ts`
- `src/game-core/systems/card-piles.ts`
- `src/game-core/systems/draw.ts`
- `src/game-core/systems/effects.ts`
- `src/game-core/systems/effect-validation.ts`
- `src/game-core/systems/rewards.ts`
- `src/game-core/systems/validation.ts`

Create:

- `src/game-core/systems/deck-economy.ts`

Tests:

- `tests/game-core/card-piles.test.ts`
- `tests/game-core/combat-draw.test.ts`
- `tests/game-core/reward-claim.test.ts`
- `tests/game-core/deck-economy.test.ts`

Approach:

- Add effects and run operations for discard, exhaust, create-card-to-pile, gain-energy, retain, upgrade-card, remove-card, and transform-card.
- Keep reward options data-driven and source-aware.
- Emit `CardMoved`, `CardCreated`, `CardUpgraded`, `CardRemoved`, `CardTransformed`, and energy events as needed.
- Make upgrade/remove/transform operate on run deck card ids first; combat instance mutation should be limited and explicit.

Test scenarios:

- Discard and exhaust effects move specific hand cards and preserve card instance ids.
- Created cards enter the requested pile and can later be drawn.
- Run deck card removal rejects missing cards and does not mutate the run.
- Transform uses seeded RNG and never selects the original card when alternatives exist.
- Reward claims can represent a deck operation without UI-specific logic.

Verification:

- Existing draw/discard animation-facing events remain typed and ordered.

### U4: Encounter Intent Scheduler

Goal: Move monster behaviour from simple random intent choice towards deterministic authored schedules.

Modify:

- `src/game-core/model/monster.ts`
- `src/game-core/model/encounter.ts`
- `src/game-core/systems/monster-intents.ts`
- `src/game-core/systems/combat.ts`
- `src/game-core/systems/validation.ts`
- `src/game-core/data/monsters/forest-monsters.ts`

Tests:

- `tests/game-core/combat-intents.test.ts`
- `tests/game-core/combat-enemy-turn.test.ts`
- `tests/game-core/registry.test.ts`

Approach:

- Add optional intent schedules with repeat, phase, and condition support.
- Keep existing intent pools as a fallback for current content.
- Track enough combat context to select phase-aware or turn-aware intents deterministically.
- Validate missing intent ids and invalid schedule conditions.

Test scenarios:

- A scheduled monster chooses intents in the authored sequence.
- A phase/HP condition chooses a special intent when the condition becomes true.
- Existing monsters using intent pools still work.
- Invalid schedules fail registry validation.

Verification:

- Existing enemy-turn tests continue to pass.

### U5: Save Migration and Restore Diagnostics

Goal: Make save handling robust enough for future schema and content changes.

Modify:

- `src/game-core/model/save.ts`
- `src/game-core/model/event.ts`
- `src/game-core/systems/save.ts`
- `src/game-core/systems/validation.ts`

Create:

- `src/game-core/systems/save-migrations.ts`

Tests:

- `tests/game-core/save-snapshot.test.ts`
- `tests/game-core/save-integration.test.ts`
- `tests/game-core/save-store.test.ts`

Approach:

- Introduce a migration registry keyed by schema version.
- Migrate older recognised snapshots to the current schema before validation.
- Return clear action errors for future schema versions and structurally invalid snapshots.
- Emit migration/restore diagnostic events.

Test scenarios:

- A v1 snapshot still restores unchanged.
- A recognised legacy snapshot migrates missing fields and records migration events.
- A future schema version is rejected with a stable error.
- Migration does not mutate the original parsed object.

Verification:

- Save tests prove both happy path and failure diagnostics.

### U6: Authoring Reports and Extension Docs

Goal: Expose the new expansion surfaces to content authors and future agents.

Modify:

- `src/game-core/testing/content-report.ts`
- `src/game-cli/format.ts`
- `src/game-cli/simulate-runs.ts`
- `docs/expansion-extension-points.md`

Tests:

- `tests/game-core/content-index.test.ts`
- `tests/game-core/content-authoring.test.ts`
- `tests/game-core/simulation-analysis.test.ts`
- `tests/game-cli/parse.test.ts`

Approach:

- Extend content report output for status behaviours, class modifiers, trigger queue policy, deck economy operation ids, and encounter schedules.
- Add CLI-visible summaries where existing simulation analysis already reports content/balance facts.
- Update docs with concise guidance for adding new statuses, class passives, pet modifiers, deck operations, and encounter schedules.

Test scenarios:

- Content report includes runtime-supported and metadata-only statuses.
- Report includes class modifier ids and trigger behaviour summaries.
- Report includes deck economy and encounter schedule capability summaries.
- Existing CLI parse behaviour remains stable.

Verification:

- `npm run typecheck`
- `npm test`
- `npm run sim:smoke`
- Browser smoke through `ce-test-browser mode:pipeline`

## Sequencing

1. U1 status lifecycle first because effects and triggers depend on status events.
2. U2 trigger queue and class passives next because pet/class reactions need stable event windows.
3. U3 deck economy once effect resolution is stable.
4. U4 encounter scheduler after combat event flow is still green.
5. U5 save migration after model shapes settle.
6. U6 reports and docs last so they reflect the implemented surfaces.

## Risks

- Trigger cascades can create infinite loops if limits are weak. Mitigation: bounded max depth, once-per-window identity, and explicit tests.
- New status events can break Phaser animation assumptions. Mitigation: typed events and existing event-player tests.
- Save migration can hide bad data if too permissive. Mitigation: migrate only known shapes, then validate.
- Broad effect expansion can overreach. Mitigation: implement minimal primitives and reject unsupported selectors explicitly.

## Review Checklist

- `src/game-core` has no Phaser imports.
- New rules are deterministic with seeded RNG.
- New content definitions are data-driven.
- Tests assert event order for behaviour-bearing changes.
- Docs use UK English and repo-relative paths.
