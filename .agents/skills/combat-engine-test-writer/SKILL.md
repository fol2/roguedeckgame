---
name: combat-engine-test-writer
description: Use when implementing or changing combat resolution, card effects, pet-command effects, status effects, triggers, energy, draw/discard, RNG, monster actions, or event ordering.
---

You are responsible for keeping the combat engine deterministic, testable, and safe to expand.

When this skill is active:

1. Tests should focus on game-core only.
   - Do not require Phaser.
   - Do not require a browser.
   - Do not test visuals here.

2. Test event order.
   - Prefer assertions over event sequences such as `CardPlayed`, `EnergySpent`, `PetCommanded`, `DamageDealt`, `StatusApplied`, and `CardMoved`.

3. Test final state and emitted events.
   - A good test checks final HP, block, status, hand, and discard state.
   - It also checks event log order and payloads.

4. Cover edge cases.
   - Include relevant tests for insufficient energy, invalid card id, dead target, empty draw pile, discard reshuffle, repeated triggers, once-per-turn pet modifiers, multiple active pets, status expiration, and enemy death during chained events.

5. Randomness must be seeded.
   - Do not use direct `Math.random()`.
   - Random tests must use a deterministic RNG seed.

6. Keep tests readable.
   - Use small fixture builders.
   - Avoid giant full-run fixtures unless necessary.
