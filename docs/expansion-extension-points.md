# Expansion Extension Points

This note records the current extension surfaces for combat expansion work. Keep gameplay rules in `src/game-core`; Phaser may display state and play events, but must not decide card legality, status behaviour, pet ownership, or class mechanics.

## Monster Ability Planning

Monsters author card-like actions as `MonsterAbilityDefinition` data in `GameContentRegistry.monsterAbilities`. A monster intent remains the presentation and scheduling handle, but registered intents should reference an `abilityId`; combat stores the selected ability in `CombatState.plannedMonsterAbilities` and emits `MonsterAbilityPlanned`, `MonsterIntentSet`, `MonsterAbilityPlayed`, and `MonsterIntentResolved` events.

Future reveal mechanics should read the planned ability id from combat state or a view model. Phaser may reveal, hide, or animate that planned ability, but it must not choose the monster's next ability or resolve the effects locally.

Legacy direct-intent effects still have a compatibility path for old snapshots. New content should prefer registered monster abilities so validation, dependency reports, simulation summaries, and editor previews all see the same action source.

## Content Schema and Workbench

Runtime content is still authored as TypeScript in `src/game-core/data`, but the editor-facing contract is JSON-safe schema data. `src/game-core/systems/content-schema.ts` converts between serialisable schema objects and runtime registry definitions with structured diagnostics. Use these adapters for import/export workflows rather than string manipulation.

`src/game-core/systems/content-workbench.ts` builds the read-only editor foundation. It exposes stable sections for every registry collection, ability previews, validation diagnostics, dependency endpoints, level authoring summaries, and content report metrics. A future visual editor should consume this view model first, then write through schema adapters once editing controls exist.

## Runtime Provenance and Debug Traces

Browser, CLI, simulation, tests, and debug traces share one runtime metadata contract: package version, content version, registry fingerprint, event schema, trace schema, and save schema. New developer tools should read that metadata from the shared game-core surface instead of maintaining their own version strings.

Browser debug traces are development-only reproduction artefacts. They may include extra diagnostics, event batches, final run summaries, selected UI state, and replay conversion instructions, but their replayable action steps must remain compatible with the core trace parser for supported schema versions. Unsupported debug trace versions should fail clearly rather than replaying with partial assumptions.

Future workbench, monster-plan, status, multi-pet, and balance UI work should preserve this path: observe via view models and typed events, export structured diagnostics when needed, then verify through CLI simulation replay. Phaser should render the debug surface and capture presentation observations, but it must not become the source of truth for runtime provenance or gameplay trace semantics.

## Status Behaviours

Status metadata lives in `GameContentRegistry.statuses`. Runtime-supported statuses also need a supported behaviour descriptor. A metadata-only status may be displayed by view models, but content that applies it in combat should fail registry validation until a deterministic runtime behaviour exists.

Burn currently uses the `startOfTurnDamage` behaviour. The registry also supports duration-only statuses and status-immunity behaviours. Status processors emit typed events such as `StatusTicked`, `StatusDurationChanged`, `StatusExpired`, `StatusApplicationBlocked`, and `StatusCleansed`, so animation and logs should consume `GameEvent` rather than inspecting status ids directly.

## Trigger Windows

Pet modifier and player class triggers resolve against a trigger frame containing state before effects, state after effects, the event window, phase, outcome, and the current cascade policy. The trigger queue supports bounded cascades; triggered effects may create a second event window, but the queue emits `TriggerQueueLimitReached` instead of allowing unbounded loops.

New trigger predicates should be small, deterministic functions over that frame. They should preserve owner ordering and modifier limit consumption before triggered effects resolve.

## Player Class Mechanics

Player classes can declare class modifier ids and starting resources as typed data. Class modifiers may now carry trigger rules such as `triggerOnCardPlayed` and `triggerOnStatusApplied`, with deterministic effects resolved through `src/game-core/systems/class-modifiers.ts`.

Do not add class-specific branches to Phaser scenes. New passives should be authored as class modifier rules and validated by the registry.

## Multi-Pet Ownership

Pet target and pet-command owner resolution is centralised in `src/game-core/systems/pet-targets.ts`. Multi-pet effects resolve in `activePetInstanceIds` order unless they explicitly request seeded random targeting.

Supported pet target shapes are `leading`, `allActive`, `specific`, `randomActive`, and `withTag`. Missing active pets or missing tagged pets should reject with stable action errors rather than silently falling back to the first pet.

## Deck Economy

Combat effects now include primitive deck operations for discard, exhaust, retain, create-card, and gain-energy behaviours. Run-level deck operations live in `src/game-core/systems/deck-economy.ts` and cover upgrade, remove, and transform. Reward options may reference a deck operation, but generation should opt into those options explicitly so existing card and pet-upgrade reward cadence stays stable.

## Encounter Schedules

Monsters may use `intentSchedule` for deterministic authored intent selection. Schedules can run as a sequence or use conditions such as HP-ratio and turn-number modulo. Existing `intentPool` random selection remains the fallback for monsters without schedules.

The selected intent should resolve to a planned monster ability before the player turn view is built. This lets simulation, UI intent display, and future "view next monster card" powers agree on the same planned action.

## Authoring Workflow

When adding content, update the smallest relevant data collection first, then run registry validation and focused tests before touching Phaser. The usual path is:

1. Add or update data in `src/game-core/data`.
2. Ensure ids are present in `GameContentRegistry` and indexed by `content-index`.
3. Run schema, validation, dependency, and workbench tests for the affected collection.
4. Run simulation smoke when combat, rewards, encounters, statuses, or monster abilities change.
5. Only add presentation work after core events and view models expose the data.

Useful checks are `validateRegistry`, `validateLevelAuthoringRegistry`, `buildContentDependencyReport`, `buildContentReport`, `buildLevelAuthoringReport`, `buildContentWorkbenchViewModel`, and the CLI simulation analysis output.

## Save Migrations

Save restore goes through `src/game-core/systems/save-migrations.ts` before validation. Migrations must be pure, versioned, and followed by normal save validation. Future schema versions should reject with stable diagnostics rather than being partially restored.
