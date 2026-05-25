# Engineering Contract v0.3 — Game-Core Combat MVP

## Objective

Implement the first deterministic combat engine slice for the pet-centered roguelite deckbuilder.

This task should add combat state, card instances, draw/hand/discard piles, energy, combatants, basic card play, effect resolution, pet-command resolution, and deterministic event logs.

This task must stay entirely inside `src/game-core` plus tests and docs.

Do NOT implement Phaser.
Do NOT implement Vite UI.
Do NOT implement React.
Do NOT create art assets.
Do NOT implement full monster AI yet.
Do NOT implement map generation.
Do NOT implement reward selection.
Do NOT implement save/load.

Use these skills:

- $game-architecture-guard
- $pet-system-designer
- $combat-engine-test-writer
- $content-author

## Current Baseline

The repo already has a TypeScript game-core foundation.

Latest pushed SHA:

```txt
bdd987571803efdbeb397ef2089be74454dc6f3c
```

Current foundation includes:

- `src/game-core/model`
- `src/game-core/data`
- `src/game-core/systems/rng.ts`
- `src/game-core/systems/validation.ts`
- `starterRegistry`
- Ember Fox
- Novice Tamer
- starter cards
- pet-command cards
- forest monsters
- registry validation tests
- seeded RNG tests
- no Phaser dependency

## Core Design Requirement

The combat engine must remain deterministic and testable without rendering.

`src/game-core` must not import Phaser.

The engine must remain future-ready for multiple active pets, even though Novice Tamer currently supports one active pet through data.

## Important Design Fix: Card Instances

The current card model uses `CardId`, but combat piles must distinguish duplicate copies of the same card.

Add a new ID type:

```ts
CardInstanceId
```

in:

```txt
src/game-core/ids.ts
```

Add helper:

```ts
cardInstanceId(value: string): CardInstanceId
```

Combat piles should store `CardInstanceId[]`, not `CardId[]`.

Each card instance should point back to a card definition:

```ts
export type CombatCardInstance = {
  readonly id: CardInstanceId;
  readonly cardId: CardId;
  readonly ownerId: CombatantId;
};
```

Events involving cards should include both the instance and the definition where useful:

```ts
cardInstanceId: CardInstanceId
cardId: CardId
```

Update existing event types carefully. Existing tests may need to be updated.

## Required File Changes

Create or update:

```txt
src/game-core/model/combat.ts
src/game-core/model/action.ts
src/game-core/model/event.ts
src/game-core/model/status.ts
src/game-core/systems/combat.ts
src/game-core/systems/effects.ts
src/game-core/systems/draw.ts
src/game-core/testing/combat-fixtures.ts
src/game-core/index.ts

tests/game-core/combat-create.test.ts
tests/game-core/combat-play-card.test.ts
tests/game-core/combat-draw.test.ts
tests/game-core/combat-pet-command.test.ts
```

Keep existing tests passing.

## Combat Model Requirements

Create `CombatState`.

It should include at minimum:

```ts
id
seed
turnNumber
phase
activeActorId
player
monsters
activePetInstanceIds
runPetStates
cardInstances
drawPile
hand
discardPile
exhaustPile
energy
maxEnergy
events
```

Use these phase values for now:

```ts
"not_started"
"player_turn"
"enemy_turn"
"won"
"lost"
```

Create player/monster combatant state types:

```ts
CombatantState:
  id
  definitionId?
  name
  type: "player" | "monster"
  hp
  maxHp
  block
  statuses
  alive
```

Status state:

```ts
CombatStatusState:
  statusId
  stacks
```

For now, statuses only need to store stacks. Do not implement full status ticking unless required by effect tests.

## Action Model Requirements

Create action types:

```ts
StartCombatAction
PlayCardAction
DrawCardsAction
EndPlayerTurnAction
```

Minimum shape:

```ts
PlayCardAction:
  type: "playCard"
  cardInstanceId: CardInstanceId
  targetId?: CombatantId
```

Create action result:

```ts
GameActionResult<TState>:
  ok: boolean
  state: TState
  events: readonly GameEvent[]
  errors: readonly GameActionError[]
```

Create errors as plain serializable objects:

```ts
GameActionError:
  code
  message
  path?
```

Do not throw for normal gameplay validation errors such as insufficient energy or invalid target. Return `ok: false`.

Throw only for programmer errors if absolutely necessary.

## Event Model Requirements

Update `GameEvent` to support combat playback.

Keep existing event names where possible, but add fields needed for card instances.

Required event types:

```ts
CombatStarted
TurnStarted
TurnEnded
CardDrawn
CardMoved
CardPlayed
EnergySpent
DamageDealt
BlockGained
StatusApplied
PetCommanded
PetReacted
DeckShuffled
ActionRejected
CombatantDefeated
```

Suggested shapes:

```ts
CardDrawn:
  type: "CardDrawn"
  cardInstanceId: CardInstanceId
  cardId: CardId

CardMoved:
  type: "CardMoved"
  cardInstanceId: CardInstanceId
  cardId: CardId
  from: CardPile
  to: CardPile

CardPlayed:
  type: "CardPlayed"
  cardInstanceId: CardInstanceId
  cardId: CardId
  sourceId: CombatantId

PetCommanded:
  type: "PetCommanded"
  petInstanceId: PetInstanceId
  cardInstanceId: CardInstanceId
  cardId: CardId
```

`ActionRejected` should contain:

```ts
code
message
```

All events must be serializable plain objects.

## Combat Creation Requirements

Implement a function like:

```ts
createCombat(input: CreateCombatInput): GameActionResult<CombatState>
```

Suggested input:

```ts
CreateCombatInput:
  run: RunState
  registry: GameContentRegistry
  petInstances: readonly PetInstance[]
  monsterIds: readonly MonsterId[]
  seed: string | number
  openingHandSize?: number
```

Behavior:

1. Create card instances from `run.deckCardIds`.
2. Shuffle draw pile deterministically using `createRng(seed)`.
3. Draw opening hand, default 5 cards.
4. Create player combatant.
5. Create monster combatants from monster definitions.
6. Initialize energy to 3 and maxEnergy to 3.
7. Set phase to `"player_turn"`.
8. Create `RunPetState` for each active pet instance id.
9. Emit events in deterministic order:

```txt
CombatStarted
DeckShuffled
TurnStarted
CardMoved / CardDrawn events for opening hand
```

If a monster ID does not exist, return `ok: false`.

If an active pet instance does not exist in the provided pet instances, return `ok: false`.

Do not mutate the input `RunState`.

## Draw System Requirements

Implement:

```ts
drawCards(state, count, rng): GameActionResult<CombatState>
```

Behavior:

1. Move cards from draw pile to hand.
2. Emit `CardMoved` and `CardDrawn`.
3. If draw pile is empty and discard pile has cards, shuffle discard into draw pile.
4. Emit `DeckShuffled`.
5. If both draw and discard are empty, draw only what is possible.
6. Preserve deterministic behavior through the provided RNG.

## Play Card Requirements

Implement:

```ts
playCard(state, action, registry, rng): GameActionResult<CombatState>
```

Behavior:

1. Validate phase is `"player_turn"`.
2. Validate card instance is in hand.
3. Resolve the card definition from the card instance.
4. Validate sufficient energy.
5. Validate required pet definition exists among active pets for pet-command cards.
6. Validate target if the effect needs one.
7. Emit `CardPlayed`.
8. Spend energy and emit `EnergySpent`.
9. If card type is `"pet-command"`, emit `PetCommanded` for the resolved pet target.
10. Resolve effects in order.
11. Move played card from hand to discard and emit `CardMoved`.

For now, all played cards go to discard. Do not implement exhaust/powers yet.

On failure:

1. Return `ok: false`.
2. Do not mutate state.
3. Emit `ActionRejected`.
4. Include a useful `GameActionError`.

## Effect Resolution Requirements

Implement basic effects:

### damage

- Damage target after block.
- Reduce block first.
- Reduce HP by remaining damage.
- Emit `DamageDealt`.
- If HP reaches 0, mark alive false and emit `CombatantDefeated`.

### block

- Add block to target.
- Emit `BlockGained`.

### draw

- Call draw system.
- Include draw events in order.

### applyStatus

- Add stacks to target status.
- Emit `StatusApplied`.

### petAttack

- Resolve pet target.
- For Phase 1, `leading` should resolve to the first active pet instance.
- Deal damage to target using same block/HP rules.
- Emit `PetCommanded` once per pet-command card before effects, not once per petAttack effect.
- Emit `DamageDealt`.

### petBlock

- Resolve pet target.
- Apply block to target.
- Emit `BlockGained`.

### petReact

- Resolve pet target.
- Emit `PetReacted`.

### setStoryFlag

- Do not implement story mutation in combat yet.
- It may emit `StoryFlagSet` if already supported.
- If this is awkward, return a validation warning event, but do not block the combat MVP.

## Pet Target Rules

Support these `PetTarget` variants during effect resolution:

```ts
leading
allActive
specific
randomActive
withTag
```

Phase 1 content mainly uses `leading`.

Rules:

- `leading`: first active pet instance id.
- `allActive`: all active pet instance ids.
- `specific`: the given pet instance id if active.
- `randomActive`: deterministic choice via RNG.
- `withTag`: active pet instances whose PetDefinition has the tag.

If no pet is resolved for a required pet effect, reject the action or emit `ActionRejected`.

## End Turn Requirements

Implement a minimal:

```ts
endPlayerTurn(state): GameActionResult<CombatState>
```

Behavior:

1. Validate phase is `"player_turn"`.
2. Move all hand cards to discard with `CardMoved` events.
3. Emit `TurnEnded`.
4. Set phase to `"enemy_turn"`.

Do not implement monster AI in this ticket.

Optionally add:

```ts
startPlayerTurn(state, rng): GameActionResult<CombatState>
```

Behavior:

1. Set phase to `"player_turn"`.
2. Increment turn number.
3. Reset energy to maxEnergy.
4. Clear player block.
5. Draw 5 cards.
6. Emit `TurnStarted`.

If this becomes too large, implement `endPlayerTurn` only and leave enemy turn / next turn for the next ticket.

## Tests Required

Use Vitest.

### `combat-create.test.ts`

Test:

1. `createCombat` returns `ok: true`.
2. Combat phase is `"player_turn"`.
3. Energy starts at 3.
4. Opening hand size is deterministic.
5. Same seed creates same draw/hand order.
6. Different seed creates different draw/hand order.
7. The input `RunState` is not mutated.
8. Active pets are copied into combat as arrays/states.
9. Invalid monster ID returns `ok: false`.
10. Missing active pet instance returns `ok: false`.

### `combat-draw.test.ts`

Test:

1. Drawing moves cards from draw pile to hand.
2. `CardMoved` and `CardDrawn` events are emitted in order.
3. Empty draw pile reshuffles discard pile.
4. Drawing from empty draw and empty discard does not crash.
5. Shuffle is deterministic.

### `combat-play-card.test.ts`

Test:

1. Playing Strike spends 1 energy and damages target.
2. Playing Defend spends 1 energy and adds block.
3. Playing Focus costs 0 and draws 1.
4. Played cards move from hand to discard.
5. Insufficient energy returns `ok: false` and does not mutate state.
6. Invalid target returns `ok: false`.
7. Dead target returns `ok: false`.
8. Damage respects block.
9. Defeating a monster emits `CombatantDefeated`.
10. Event order is deterministic and tested explicitly.

### `combat-pet-command.test.ts`

Test:

1. Playing Fox Bite emits `CardPlayed`, `EnergySpent`, `PetCommanded`, `DamageDealt`, `StatusApplied`, and `CardMoved` in the expected order.
2. Fox Bite applies burn stacks to target.
3. Fox Guard adds block and emits `PetReacted`.
4. Fox Fetch draws a card and emits `PetReacted`.
5. Pet-command card requiring Ember Fox fails if no active Ember Fox is present.
6. `leading` pet target resolves to the first active pet.
7. `allActive`, `specific`, `randomActive`, and `withTag` pet targets are covered by unit tests, even if starter content does not use all of them.
8. Multi-pet test fixture works with at least two active pet instance IDs.

## Mutation Safety

Core functions should avoid mutating input state.

Use immutable-ish updates:

- copy arrays before editing
- copy nested combatants before changing HP/block/status
- return new state object

The code does not need a full immutable library.

Do not add Immer or other dependencies.

## Error Handling

Normal invalid gameplay should return:

```ts
ok: false
events: [{ type: "ActionRejected", code, message }]
errors: [{ code, message }]
state: originalState
```

Do not throw for:

- insufficient energy
- card not in hand
- invalid target
- dead target
- missing required active pet

## Documentation

Create:

```txt
docs/contracts/2-combat-mvp.md
docs/plans/YYYY-MM-DD-003-combat-mvp-plan.md
```

Copy this contract into `docs/contracts/2-combat-mvp.md`.

The plan should be short and include:

- files to add/update
- test plan
- non-goals
- architecture risks

## Commands to Run

Run:

```bash
npm run typecheck
npm test
npm audit --audit-level=moderate
```

Do not add production dependencies.

## Validation Output Required

When complete, report:

1. Changed file tree.
2. Commands run and results.
3. Confirmation that no Phaser dependency was added.
4. Confirmation that `src/game-core` contains no Phaser imports.
5. Confirmation that combat piles use `CardInstanceId[]`, not only `CardId[]`.
6. Confirmation that card events include card instance IDs where relevant.
7. Confirmation that `RunState` still uses `activePetInstanceIds`.
8. Confirmation that Novice Tamer remains data-limited to one active pet.
9. Confirmation that multi-pet fixtures/tests exist.
10. Confirmation that all tests pass.
11. Commit SHA.

## Non-Goals

Do not implement Phaser.
Do not implement Vite UI.
Do not implement React.
Do not implement monster AI.
Do not implement full enemy turns.
Do not implement map generation.
Do not implement rewards.
Do not implement save/load.
Do not implement story progression.
Do not implement card upgrades.
Do not implement pet upgrade modifier resolution yet.
Do not create art assets.
Do not add production dependencies.
```

The most important part of this ticket is **CardInstanceId**. If we skip that now, UI animation and duplicate cards will become messy later. This is the right time to lock it in.
