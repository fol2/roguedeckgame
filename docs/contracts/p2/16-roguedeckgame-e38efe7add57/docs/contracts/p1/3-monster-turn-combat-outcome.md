# Engineering Contract v0.4 — Monster Turns, Intents, Status Ticks, and Combat Outcome

## Objective

Implement the next deterministic game-core combat slice: monster intents, enemy turns, minimal status ticking, combat win/loss outcome, and turn-loop progression.

This task must stay entirely inside `src/game-core`, tests, and docs.

Do NOT implement Phaser.
Do NOT implement Vite UI.
Do NOT implement React.
Do NOT create art assets.
Do NOT implement map generation.
Do NOT implement reward selection.
Do NOT implement save/load.
Do NOT implement pet upgrade modifier resolution yet.

Use these skills:

- $game-architecture-guard
- $combat-engine-test-writer
- $content-author
- $pet-system-designer

## Current Baseline

Latest pushed HEAD:

```txt
440899b70b719def029ab29f880fe980f6561850
```

The current game-core already includes:

- `CardInstanceId`
- `CombatState`
- `CombatCardInstance`
- draw/hand/discard/exhaust piles
- energy
- `createCombat`
- `drawCards`
- `playCard`
- `endPlayerTurn`
- `startPlayerTurn`
- `resolveCardEffects`
- `resolvePetTargets`
- Ember Fox command cards
- Training Slime and Ash Mite monster definitions
- 55 passing tests

## Design Goal

After this ticket, a core-only combat should be able to:

1. Start with visible monster intents.
2. Let the player play cards.
3. End the player turn.
4. Resolve monster actions.
5. Process simple status ticks.
6. Start the next player turn.
7. End as `won` when all monsters are defeated.
8. End as `lost` when the player is defeated.

No UI is needed. The event log is the interface for future Phaser playback.

## Required File Changes

Create or update:

```txt
src/game-core/model/combat.ts
src/game-core/model/event.ts
src/game-core/model/status.ts
src/game-core/systems/combat.ts
src/game-core/systems/effects.ts
src/game-core/systems/monster-intents.ts
src/game-core/systems/statuses.ts
src/game-core/testing/combat-fixtures.ts
src/game-core/index.ts

tests/game-core/combat-intents.test.ts
tests/game-core/combat-enemy-turn.test.ts
tests/game-core/combat-status.test.ts
tests/game-core/combat-outcome.test.ts
tests/game-core/combat-turn.test.ts
```

Keep all existing tests passing.

## Combat Model Requirements

Extend `CombatState` with monster intent state.

Suggested shape:

```ts
export type ActiveMonsterIntent = {
  readonly monsterCombatantId: CombatantId;
  readonly intentId: MonsterIntentId;
};

export type CombatState = {
  // existing fields...
  readonly monsterIntents: readonly ActiveMonsterIntent[];
};
```

If a better shape is chosen, it must still support:

- one current intent per alive monster
- deterministic intent selection
- future UI intent rendering
- event playback

## Event Model Requirements

Add event types needed for monster turns and outcomes.

Required events:

```ts
MonsterIntentSet
MonsterIntentResolved
StatusTicked
StatusExpired
CombatEnded
```

Suggested shapes:

```ts
MonsterIntentSet:
  type: "MonsterIntentSet"
  monsterId: CombatantId
  intentId: MonsterIntentId
  intentType: MonsterIntentType
  description: string

MonsterIntentResolved:
  type: "MonsterIntentResolved"
  monsterId: CombatantId
  intentId: MonsterIntentId

StatusTicked:
  type: "StatusTicked"
  targetId: CombatantId
  statusId: StatusId
  stacksBefore: number
  stacksAfter: number
  amount?: number

StatusExpired:
  type: "StatusExpired"
  targetId: CombatantId
  statusId: StatusId

CombatEnded:
  type: "CombatEnded"
  outcome: "won" | "lost"
```

Keep all events serializable plain objects.

Do not remove existing card/pet events unless there is a strong reason.

## Monster Intent Selection Requirements

Create:

```ts
chooseMonsterIntents(state, registry, rng): GameActionResult<CombatState>
```

or equivalent.

Behavior:

1. Select one intent for each alive monster.
2. Use `MonsterDefinition.intentPool`.
3. Use deterministic RNG.
4. Do not select intents for defeated monsters.
5. Emit `MonsterIntentSet` for every selected intent.
6. Store selected intents in `state.monsterIntents`.
7. Return `ok: false` with `ActionRejected` if a monster definition or intent pool is missing.

Intent selection can be random for now, as long as it is seeded and deterministic.

## Combat Creation Update

Update `createCombat` so that initial monster intents are selected before the first player turn becomes playable.

Expected high-level event order:

```txt
CombatStarted
DeckShuffled
MonsterIntentSet...
TurnStarted
CardMoved/CardDrawn...
```

If Codex believes the current order should remain `TurnStarted` before `MonsterIntentSet`, it must justify that in the completion report and tests must lock the chosen order.

The important thing is: after `createCombat`, `state.monsterIntents` must be populated for alive monsters.

## Enemy Turn Requirements

Create:

```ts
resolveEnemyTurn(state, registry, rng): GameActionResult<CombatState>
```

Behavior:

1. Validate `state.phase === "enemy_turn"`.
2. Resolve start-of-enemy-turn status ticks for monsters.
3. If all monsters die from status ticks, set combat to `won` and emit `CombatEnded`.
4. For each alive monster:
   - resolve its selected intent
   - emit `MonsterIntentResolved`
   - use existing effect resolution where possible
5. Monster intent effects should use:
   - source = the acting monster
   - `target: { type: "target" }` defaults to the player
   - `target: { type: "self" }` targets the acting monster
6. If the player dies, set combat to `lost` and emit `CombatEnded`.
7. If combat is not over:
   - clear expired/used monster intents
   - choose next monster intents
   - start the next player turn
   - reset player energy to max
   - clear player block
   - draw 5 cards
8. Return deterministic event order.

Do not implement complex monster AI.
Do not implement enemy intent weights yet.
Do not implement elite/boss mechanics yet.

## Turn Flow Requirements

The intended flow after this ticket:

```txt
createCombat
player plays cards
endPlayerTurn
resolveEnemyTurn
player plays cards
...
```

`endPlayerTurn` already exists. Update it only as needed.

`startPlayerTurn` already exists. Update it so that:

1. It validates the appropriate phase if needed.
2. It processes start-of-player-turn status ticks for the player.
3. It resets energy.
4. It clears player block.
5. It draws 5 cards.
6. It does not start a turn if combat is already won/lost.

## Status Requirements

Create a small status system in:

```txt
src/game-core/systems/statuses.ts
```

For this ticket, implement only `burn`.

Burn semantics for Phase 1:

```txt
At the start of the affected combatant's turn:
- Burn deals damage equal to its current stacks.
- Burn damage ignores block.
- Burn stacks decrease by 1.
- If stacks reach 0, remove Burn and emit StatusExpired.
```

Add a helper like:

```ts
processStartOfTurnStatuses(state, targetId, registry): GameActionResult<CombatState>
```

or equivalent.

Important:

- Burn should be deterministic.
- Burn should emit `StatusTicked`.
- Burn can defeat monsters or the player.
- If Burn defeats a combatant, emit `CombatantDefeated`.
- If Burn defeats the last monster, emit `CombatEnded` with outcome `won`.
- If Burn defeats the player, emit `CombatEnded` with outcome `lost`.

Do not implement poison, stun, vulnerable, strength, or other statuses yet.

## Combat Outcome Requirements

Create helper:

```ts
checkCombatOutcome(state): GameActionResult<CombatState>
```

or equivalent.

Rules:

```txt
If all monsters are defeated:
  phase = "won"
  emit CombatEnded outcome "won"

If player is defeated:
  phase = "lost"
  emit CombatEnded outcome "lost"
```

This should be called after:

- card damage/effects
- status ticks
- enemy intent resolution

Update `playCard` so lethal player actions can set phase to `won`.

Do not generate rewards in this ticket.

## Effect Resolution Refactor

Current `resolveCardEffects` is card-oriented.

For monster intents, either:

1. Refactor it into a more general effect resolver, or
2. Add a thin wrapper for monster intent effects.

The engine should not duplicate damage/block/status logic.

Suggested abstraction:

```ts
resolveEffects(state, effects, context, registry, rng)
```

where context can include:

```ts
sourceId
defaultTargetId?
cardInstanceId?
cardId?
intentId?
```

Keep card event ordering stable. Existing tests must pass.

## Tests Required

Use Vitest.

### `combat-intents.test.ts`

Test:

1. `createCombat` sets one intent per alive monster.
2. Intent selection is deterministic for the same seed.
3. Different seeds can produce different intents if the monster has multiple intents.
4. Defeated monsters do not receive intents.
5. Missing monster definition or empty intent pool returns `ok: false`.
6. `MonsterIntentSet` events are emitted.

### `combat-enemy-turn.test.ts`

Test:

1. `endPlayerTurn` sets phase to `enemy_turn`.
2. `resolveEnemyTurn` rejects if phase is not `enemy_turn`.
3. Training Slime attack intent damages the player.
4. Training Slime block intent adds block to itself.
5. Ash Mite burn intent applies burn to the player.
6. After enemy turn, if combat is not over, phase returns to `player_turn`.
7. After enemy turn, player energy resets to max.
8. After enemy turn, next hand draw happens.
9. Next monster intents are selected.

Use deterministic fixture helpers so tests can force a specific monster intent where needed.

### `combat-status.test.ts`

Test:

1. Burn ticks at the start of a monster’s turn.
2. Burn damage ignores block.
3. Burn stacks decrease by 1.
4. Burn expires at 0 stacks.
5. Burn can defeat a monster.
6. Burn can defeat the player.
7. Burn emits `StatusTicked`, `StatusExpired`, and `CombatantDefeated` when appropriate.
8. Burn ticking is deterministic and does not mutate the input state on rejected actions.

### `combat-outcome.test.ts`

Test:

1. Playing Strike/Fox Bite that defeats the final monster sets phase to `won`.
2. Winning emits `CombatEnded` with outcome `won`.
3. Enemy attack that defeats the player sets phase to `lost`.
4. Losing emits `CombatEnded` with outcome `lost`.
5. No further turn starts after `won` or `lost`.
6. `playCard` rejects if combat is already `won` or `lost`.

### Existing Tests

All existing tests must keep passing:

```txt
registry
rng
model-shape
combat-create
combat-draw
combat-play-card
combat-pet-command
combat-turn
localhost-smoke
```

Update expected event orders only where the new combat outcome or monster intent events legitimately change the sequence.

## Fixtures

Add focused fixture helpers:

```ts
createEnemyTurnFixture
createForcedIntentCombatFixture
createBurningMonsterFixture
createNearlyDeadPlayerFixture
createNearlyDeadMonsterFixture
```

Fixtures should stay small and readable.

## Mutation Safety

Core functions should avoid mutating input state.

Rejected normal gameplay actions must return:

```ts
ok: false
state: originalState
events: [{ type: "ActionRejected", ... }]
errors: [...]
```

Valid actions return a new state.

No Immer or other dependency.

## Error Handling

Do not throw for normal gameplay errors.

Return `ok: false` for:

- resolving enemy turn in wrong phase
- missing monster definition
- missing monster intent
- empty intent pool
- attempting to play a card after combat is won/lost
- trying to start a player turn after combat is won/lost

## Documentation

Create:

```txt
docs/contracts/3-monster-turn-combat-outcome.md
docs/plans/YYYY-MM-DD-004-monster-turn-combat-outcome-plan.md
```

Copy this contract into `docs/contracts/3-monster-turn-combat-outcome.md`.

The plan should briefly include:

- files to add/update
- test plan
- non-goals
- architecture risks
- event-order risks

## Commands to Run

Run:

```bash
npm run typecheck
npm test
npm run smoke:localhost
npm audit --audit-level=moderate
```

Do not add production dependencies.

## Validation Output Required

When complete, report:

1. Changed file tree.
2. Commands run and results.
3. Confirmation that no Phaser dependency was added.
4. Confirmation that `src/game-core` contains no Phaser imports.
5. Confirmation that monster intents are deterministic and stored in combat state.
6. Confirmation that enemy turn can resolve monster intents.
7. Confirmation that Burn ticks, decreases, expires, and can defeat combatants.
8. Confirmation that player win/loss phases are implemented.
9. Confirmation that `playCard` can set combat to `won`.
10. Confirmation that no reward selection was implemented.
11. Confirmation that all tests pass.
12. Commit SHA.

## Non-Goals

Do not implement Phaser.
Do not implement Vite UI.
Do not implement React.
Do not implement reward selection.
Do not implement map generation.
Do not implement save/load.
Do not implement story progression.
Do not implement pet upgrade modifier resolution.
Do not implement card upgrades.
Do not implement complex monster AI.
Do not implement weighted intent selection.
Do not implement bosses.
Do not create art assets.
Do not add production dependencies.