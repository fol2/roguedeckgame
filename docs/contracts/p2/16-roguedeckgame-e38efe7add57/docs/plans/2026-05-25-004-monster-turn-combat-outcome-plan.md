# Monster Turn Combat Outcome Plan

Date: 2026-05-25

## Contract

Source: `docs/contracts/3-monster-turn-combat-outcome.md`

## Files To Add Or Update

- `src/game-core/model/combat.ts`
- `src/game-core/model/event.ts`
- `src/game-core/model/status.ts`
- `src/game-core/systems/combat.ts`
- `src/game-core/systems/effects.ts`
- `src/game-core/systems/monster-intents.ts`
- `src/game-core/systems/statuses.ts`
- `src/game-core/systems/outcome.ts`
- `src/game-core/testing/combat-fixtures.ts`
- `src/game-core/index.ts`
- `tests/game-core/combat-intents.test.ts`
- `tests/game-core/combat-enemy-turn.test.ts`
- `tests/game-core/combat-status.test.ts`
- `tests/game-core/combat-outcome.test.ts`
- Existing combat tests where event order legitimately changes.

## Implementation Plan

1. Extend combat state with one active monster intent per alive monster.
2. Add serializable events for monster intent selection/resolution, status ticks/expiry, and combat end.
3. Add deterministic monster intent selection from `MonsterDefinition.intentPool`.
4. Select initial monster intents during `createCombat` before the first player turn starts.
5. Resolve enemy turns by ticking monster statuses, resolving selected intents, choosing next intents, and starting the next player turn.
6. Implement burn as the only Phase 1 status tick, with block-ignoring damage and stack decay.
7. Add outcome checks after damage, status ticks, and enemy intent resolution.
8. Keep reward selection, map generation, save/load, UI, Phaser, React, and pet upgrade modifier resolution out of scope.

## Test Plan

- Add intent tests for creation, deterministic selection, defeated monsters, missing definitions, empty pools, and event emission.
- Add enemy-turn tests for phase validation, attack, block, burn, turn progression, energy reset, draw, and next intents.
- Add burn tests for ticking, block bypass, stack decay, expiry, defeat events, win/loss outcomes, determinism, and rejected-action immutability.
- Add outcome tests for player win, player loss, no further turns after combat end, and card rejection after combat end.
- Keep existing registry, RNG, model-shape, draw, card, pet-command, turn, and localhost-smoke tests passing.

## Non-Goals

- No Phaser, Vite UI, React, or art assets.
- No reward selection, map generation, save/load, story progression, card upgrades, or pet upgrade modifier resolution.
- No complex monster AI, weighted intent selection, elite mechanics, bosses, or mini-bosses.
- No production dependencies.

## Architecture Risks

- `src/game-core` must remain deterministic and must not import Phaser.
- Monster intents must be data-driven through monster definitions rather than card-name or monster-name branches.
- Effect resolution should be shared by card effects and monster intent effects to avoid divergent damage, block, and status semantics.
- Future multi-pet support must remain array-based through `activePetInstanceIds`.

## Event-Order Risks

- `createCombat` intentionally emits `MonsterIntentSet` before the first `TurnStarted`.
- Enemy turns emit `MonsterIntentResolved` before the effects of that intent.
- Burn emits `StatusTicked` before its damage event; `StatusExpired` is emitted when stacks reach zero.
- `CombatEnded` is emitted as soon as outcome is known, before any final card movement caused by the already-played card.
