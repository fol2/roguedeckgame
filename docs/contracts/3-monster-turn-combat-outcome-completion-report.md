# Monster Turn Combat Outcome Completion Report

Date: 2026-05-25

## Source Contract

- `docs/contracts/3-monster-turn-combat-outcome.md`

## Implementation Commit

- `c3c24ef7d39ff4d34f1cde16da4c956a40306536`

## Changed File Tree

```txt
docs/contracts/3-monster-turn-combat-outcome.md
docs/plans/2026-05-25-004-monster-turn-combat-outcome-plan.md
src/game-core/index.ts
src/game-core/model/combat.ts
src/game-core/model/event.ts
src/game-core/model/status.ts
src/game-core/systems/combat.ts
src/game-core/systems/effects.ts
src/game-core/systems/monster-intents.ts
src/game-core/systems/outcome.ts
src/game-core/systems/statuses.ts
src/game-core/testing/combat-fixtures.ts
tests/game-core/combat-create.test.ts
tests/game-core/combat-enemy-turn.test.ts
tests/game-core/combat-intents.test.ts
tests/game-core/combat-outcome.test.ts
tests/game-core/combat-pet-command.test.ts
tests/game-core/combat-play-card.test.ts
tests/game-core/combat-status.test.ts
tests/game-core/combat-turn.test.ts
```

## Delivered

- Added `CombatState.monsterIntents` with one current intent per alive monster.
- Added serialisable `MonsterIntentSet`, `MonsterIntentResolved`, `StatusTicked`, `StatusExpired`, and `CombatEnded` events.
- Added deterministic `chooseMonsterIntents`, with full validation before RNG consumption on rejected actions.
- Updated `createCombat` to select initial monster intents before the first `TurnStarted` event.
- Added `resolveEnemyTurn` for enemy phase validation, monster status ticks, selected intent resolution, next intent selection, and next player-turn start.
- Added Phase 1 Burn start-of-turn behaviour: block-ignoring damage, stack decay, expiry, defeat events, and outcome checks.
- Added `checkCombatOutcome` and wired it after card damage, status ticks, and monster intent effects.
- Refactored effect resolution so card effects and monster intent effects share damage, block, and status logic.
- Added focused fixtures and Vitest coverage for intents, enemy turns, Burn, outcomes, and regression cases found by review.

## Event Order

- `createCombat`: `CombatStarted`, `DeckShuffled`, `MonsterIntentSet...`, `TurnStarted`, draw events.
- Enemy intent resolution: `MonsterIntentResolved` before that intent's effect events.
- Burn: `StatusTicked`, `DamageDealt`, optional `CombatantDefeated`, optional `StatusExpired`, optional `CombatEnded`.
- Card lethal outcome: `CombatEnded` is emitted as soon as outcome is known, before the already-played card is moved to discard.

## Non-Goals Confirmed

- No Phaser implementation.
- No Vite UI or React implementation.
- No art assets.
- No map generation.
- No reward selection.
- No save/load.
- No story progression.
- No pet upgrade modifier resolution.
- No card upgrades.
- No complex monster AI, weighted intents, elites, or bosses.
- No production dependencies added.

## Verification

```txt
npm run typecheck
pass

npm test
pass: 13 test files, 89 tests

npm run smoke:localhost
pass: http://127.0.0.1:53628/health

npm audit --audit-level=moderate
pass: 0 vulnerabilities

npm ls --depth=0
typescript@5.9.3
vitest@4.1.7
```

## Architecture Checks

- `src/game-core` contains no Phaser imports.
- Gameplay rules remain in `src/game-core`.
- Monster intent selection uses seeded RNG only; no direct `Math.random`.
- Pet model remains collection-based through `activePetInstanceIds`.
- No card-name-specific combat logic was added.

## Independent Reviews

- Code reviewer: GREEN after fixes for player Burn loss ordering, missing intent-pool rejection, duplicate contract removal, and RNG mutation safety on rejected intent selection.
- Contract auditor: GREEN for pre-commit code review after duplicate contract removal and outcome payload test coverage.

## Remaining Risk

- This is still a core-only combat slice. Phaser playback, rewards, map flow, save/load, and pet upgrade modifier resolution remain intentionally unimplemented for later contracts.
