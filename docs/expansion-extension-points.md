# Expansion Extension Points

This note records the current extension surfaces for combat expansion work. Keep gameplay rules in `src/game-core`; Phaser may display state and play events, but must not decide card legality, status behaviour, pet ownership, or class mechanics.

## Status Behaviours

Status metadata lives in `GameContentRegistry.statuses`. Runtime-supported statuses also need a supported behaviour descriptor. A metadata-only status may be displayed by view models, but content that applies it in combat should fail registry validation until a deterministic runtime behaviour exists.

Burn currently uses the `startOfTurnDamage` behaviour. The status processor emits the same typed events as card effects, so animation and logs should consume `GameEvent` rather than inspecting status ids directly.

## Trigger Windows

Pet modifier triggers resolve against a trigger frame containing state before effects, state after effects, the event window, phase, outcome, and the current cascade policy. The cascade policy is currently `none`: effects caused by a trigger do not recursively run more pet modifier triggers.

New trigger predicates should be small, deterministic functions over that frame. They should preserve owner ordering and modifier limit consumption before triggered effects resolve.

## Player Class Mechanics

Player classes can declare class modifier ids and starting resources as typed data. These are validation and content-report surfaces for future class passives; they do not currently add runtime behaviour by themselves.

When class passives become real gameplay, resolve them inside `src/game-core` through the trigger frame pipeline. Do not add class-specific branches to Phaser scenes.

## Multi-Pet Ownership

Pet target and pet-command owner resolution is centralised in `src/game-core/systems/pet-targets.ts`. Multi-pet effects resolve in `activePetInstanceIds` order unless they explicitly request seeded random targeting.

Supported pet target shapes are `leading`, `allActive`, `specific`, `randomActive`, and `withTag`. Missing active pets or missing tagged pets should reject with stable action errors rather than silently falling back to the first pet.
