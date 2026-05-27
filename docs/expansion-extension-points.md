# Expansion Extension Points

This note records the current extension surfaces for combat expansion work. Keep gameplay rules in `src/game-core`; Phaser may display state and play events, but must not decide card legality, status behaviour, pet ownership, or class mechanics.

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

## Save Migrations

Save restore goes through `src/game-core/systems/save-migrations.ts` before validation. Migrations must be pure, versioned, and followed by normal save validation. Future schema versions should reject with stable diagnostics rather than being partially restored.
