# Engineering Contract v0.2 — Bootstrap TypeScript Game-Core Foundation

## Objective

Create the initial TypeScript game-core foundation for the pet-centered roguelite deckbuilder.

This task should establish the project’s TypeScript testable core, data models, first sample content, deterministic RNG helper, and validation tests.

This task is NOT to implement Phaser, Vite UI, combat resolution, card-playing logic, or a playable game yet.

Use these skills:

- $game-architecture-guard
- $pet-system-designer
- $content-author
- $combat-engine-test-writer
- $story-event-author

## Current Context

The repository already contains:

- `AGENTS.md`
- repo-scoped Codex skills under `.agents/skills`
- `docs/codex-skills.md`
- `docs/contracts/0-skills.md`
- docs plan from the previous bootstrap task

The previous commit was:

```txt
8a36f8f docs: bootstrap codex project skills
```

## Core Design Requirements

The game is a browser-first TypeScript + Vite + Phaser 4 pet-centered roguelite deckbuilder.

The game-core must remain independent from Phaser.

The first playable slice will use one player and one active pet, but the model must support multiple active pets later.

Do not model this:

```ts
activePetInstanceId: PetInstanceId
```

Model this instead:

```ts
activePetInstanceIds: PetInstanceId[]
```

or an equivalent slot-based structure.

Phase 1 may enforce:

```ts
maxActivePets: 1
```

through player/class data.

## Required Scope

Create only the TypeScript game-core foundation.

This ticket should include:

1. Minimal TypeScript project setup.
2. `src/game-core` folder structure.
3. Core model types.
4. Core event types.
5. Seeded RNG helper.
6. Initial data definitions.
7. Data registry and validation helpers.
8. Unit tests proving the foundation works.

## Package / Tooling Requirements

Because this repo currently has no package setup, create a minimal Node/TypeScript test setup.

Add:

```txt
package.json
tsconfig.json
vitest.config.ts
```

Use dev dependencies only:

```txt
typescript
vitest
```

Do not add Phaser yet.
Do not add Vite yet unless Vitest requires config compatibility.
Do not add React.
Do not add production dependencies.

Add package scripts:

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Use ESM if reasonable.

## Required File Structure

Create:

```txt
src/
  game-core/
    index.ts

    ids.ts

    model/
      card.ts
      effect.ts
      event.ts
      monster.ts
      pet.ts
      player.ts
      registry.ts
      reward.ts
      run.ts
      story.ts
      status.ts

    data/
      cards/
        ember-fox-cards.ts
        starter-cards.ts
      monsters/
        forest-monsters.ts
      pets/
        ember-fox.ts
      players/
        novice-tamer.ts
      story/
        ember-fox-story.ts
      upgrades/
        ember-fox-upgrades.ts
      registry.ts

    systems/
      rng.ts
      validation.ts

    testing/
      fixtures.ts

tests/
  game-core/
    registry.test.ts
    rng.test.ts
    model-shape.test.ts
```

If Codex thinks a slightly different structure is better, it may adjust, but it must keep the same boundaries and intent.

## Type Model Requirements

Create branded or alias ID types in `src/game-core/ids.ts`.

Include IDs such as:

```ts
CardId
PetDefinitionId
PetInstanceId
PlayerClassId
MonsterId
UpgradeId
StoryEventId
StoryFlagId
StatusId
RunId
CombatantId
```

Simple string aliases are acceptable for now if branded types are too noisy, but keep the ID names explicit.

## Card Model

Create `CardDefinition`.

It should support:

```ts
id
name
description
type
cost
tags
effects
requiresPetDefinitionId?
rarity?
```

Supported card types for now:

```ts
"attack"
"skill"
"power"
"pet-command"
```

Supported rarity values for now:

```ts
"starter"
"common"
"uncommon"
"rare"
"special"
```

Do not implement card resolution yet.

## Effect Model

Create `EffectDefinition` as a discriminated union.

For now include:

```ts
damage
block
draw
applyStatus
petAttack
petBlock
petReact
setStoryFlag
```

Important: effects should not assume only one pet.

For pet-related effects, include a pet target shape such as:

```ts
type PetTarget =
  | { type: "specific"; petInstanceId: PetInstanceId }
  | { type: "leading" }
  | { type: "allActive" }
  | { type: "randomActive" }
  | { type: "withTag"; tag: string };
```

Use this target model in pet effects where applicable.

## Event Model

Create `GameEvent` as a discriminated union.

Include event types such as:

```ts
CardPlayed
EnergySpent
CardDrawn
CardMoved
DamageDealt
BlockGained
StatusApplied
PetCommanded
PetReacted
RewardOffered
StoryFlagSet
ValidationWarning
```

No event playback implementation yet.

Events should be plain serializable objects.

## Pet Model

Create:

```ts
PetDefinition
PetInstance
RunPetState
PetSlot
PetUpgradeDefinition
EvolutionNode
PetModifierDefinition
PetCommandCardUnlock
```

Minimum Pet concepts:

```ts
PetDefinition:
  id
  name
  species
  tags
  baseCommandCardIds
  evolutionTree
  sideStoryId?

PetInstance:
  id
  definitionId
  nickname
  bondLevel
  bondXp
  unlockedUpgradeIds
  chosenEvolutionNodeIds
  unlockedMemoryIds
  storyFlags

RunPetState:
  petInstanceId
  mood
  temporaryModifierIds
  fatigue
```

Supported pet moods for now:

```ts
"calm"
"excited"
"tired"
"in danger"
"corrupted"
```

The naming can be adjusted to code-friendly enum values like `"in_danger"` if needed.

## Player Model

Create:

```ts
PlayerClassDefinition
```

It should include:

```ts
id
name
startingDeckCardIds
startingRelicIds
maxActivePets
petSlotCount
classTags
```

First player class:

```txt
Novice Tamer
maxActivePets: 1
petSlotCount: 1
```

Even though the first class only supports one pet, the run model must use arrays or slots.

## Run Model

Create:

```ts
RunState
RunConfig
```

RunState should include:

```ts
id
seed
playerClassId
activePetInstanceIds
deckCardIds
runFlags
storyFlags
```

No map generation yet.
No combat implementation yet.

## Monster Model

Create a basic `MonsterDefinition`.

Include:

```ts
id
name
maxHp
tags
intentPool
```

Intent model can be simple for now:

```ts
MonsterIntentDefinition:
  id
  type
  description
  effects
```

Supported intent types:

```ts
"attack"
"block"
"debuff"
"special"
```

## Story Model

Create data-driven story types:

```ts
StoryRequirement
StoryOutcome
StoryEventDefinition
PetSideStoryDefinition
```

Requirements should include:

```ts
petBondAtLeast
hasPetMemory
bossDefeated
chapterUnlocked
hasSeenEvent
activePetHasTag
playerClassIs
```

Outcomes should include:

```ts
setStoryFlag
unlockPetMemory
unlockPetUpgrade
unlockEvolutionNode
addBondXp
```

No narrative UI yet.

## Initial Content

Create the first player:

```txt
Novice Tamer
```

Create the first pet:

```txt
Ember Fox
```

Ember Fox identity:

```txt
Tags:
pet, fox, fire, burn, command

Combat identity:
Burn + pet-command combo
```

Create three Ember Fox pet-command cards:

```txt
Fox Bite
Type: pet-command
Cost: 1
Tags: pet, fox, attack, burn, command
Effects:
- petAttack leading pet for 5
- applyStatus burn 2 to target enemy

Fox Guard
Type: pet-command
Cost: 1
Tags: pet, fox, guard, block, command
Effects:
- block player for 5
- petReact leading pet with reaction "guard"

Fox Fetch
Type: pet-command
Cost: 0
Tags: pet, fox, draw, fetch, command
Effects:
- draw 1
- petReact leading pet with reaction "fetch"
```

Create simple starter non-pet cards:

```txt
Strike
Type: attack
Cost: 1
Effect: damage 6

Defend
Type: skill
Cost: 1
Effect: block 5

Focus
Type: skill
Cost: 0
Effect: draw 1
```

Create three Ember Fox upgrades:

```txt
Burning Fang
Tags: fox, burn, attack
Intent:
Pet attack commands with burn synergy become stronger later.
For now, represent as data only, no resolver.

Warm Bond
Tags: fox, energy, opener
Intent:
First pet command each combat may become cheaper later.
For now, represent as data only, no resolver.

Ash Instinct
Tags: fox, burn, draw, trigger
Intent:
When a burned enemy dies, draw later.
For now, represent as data only, no resolver.
```

Create two forest monsters:

```txt
Training Slime
maxHp: 22
intents:
- attack 5
- block 4

Ash Mite
maxHp: 18
intents:
- attack 4
- apply burn 1
```

Create one Ember Fox side-story stub:

```txt
Pet side story id:
ember_fox_side_story

First memory:
ember_fox_memory_burned_orchard

First story flag:
ember_fox_memory_01_unlocked
```

Keep prose minimal. This ticket is about engine readiness, not writing full story.

## Registry Requirements

Create a central registry in:

```txt
src/game-core/data/registry.ts
```

It should export all starter content:

```ts
cards
pets
players
monsters
petUpgrades
storyEvents
```

Create validation helpers in:

```txt
src/game-core/systems/validation.ts
```

Validation should check:

1. Duplicate IDs in each registry collection.
2. Player starting decks reference existing cards.
3. Pet base command cards reference existing cards.
4. Pet command cards requiring a pet reference an existing pet definition.
5. Run model supports multiple active pet IDs.
6. Story events reference existing pet/story IDs where applicable.
7. Monster intents use valid effects.
8. Card effects use known effect types.

Validation can return structured errors/warnings. Do not throw unless the caller chooses to.

## RNG Requirements

Create a deterministic seeded RNG helper in:

```txt
src/game-core/systems/rng.ts
```

It should provide:

```ts
createRng(seed: string | number)
nextFloat()
nextInt(maxExclusive: number)
choice<T>(items: readonly T[]): T
shuffle<T>(items: readonly T[]): T[]
```

Requirements:

- Same seed must produce same sequence.
- Do not use direct `Math.random()` for game-core randomness.
- Use a simple deterministic algorithm. It does not need to be cryptographically secure.

## Tests

Create tests using Vitest.

Tests must cover:

### `rng.test.ts`

- same seed produces same sequence
- different seeds produce different sequence
- shuffle is deterministic
- choice is deterministic

### `registry.test.ts`

- starter registry validates without errors
- no duplicate IDs
- Ember Fox exists
- Ember Fox base command cards exist
- Novice Tamer exists
- Novice Tamer has `maxActivePets: 1`
- registry includes all three Ember Fox command cards
- registry includes all three Ember Fox upgrades

### `model-shape.test.ts`

- a sample `RunState` uses `activePetInstanceIds` array
- `activePetInstanceIds` can hold multiple pet instance IDs even though Novice Tamer currently allows one
- `PetTarget` supports `leading`, `allActive`, `specific`, `randomActive`, and `withTag`
- `GameEvent` objects are serializable plain objects
- no game-core file imports Phaser

For the “no game-core file imports Phaser” check, a simple test scanning `src/game-core/**/*.ts` for `"phaser"` or `"Phaser"` is acceptable.

## Documentation

Create:

```txt
docs/contracts/1-game-core-foundation.md
```

Copy this contract into that file.

Create:

```txt
docs/plans/YYYY-MM-DD-002-game-core-foundation-plan.md
```

Use today’s date in the filename.

The plan should briefly list:

- files to create
- non-goals
- validation commands
- architecture risks

Keep it short.

## Commands to Run

After implementation, run:

```bash
npm install
npm run typecheck
npm test
```

If the repo uses a different package manager after inspection, use the appropriate equivalent, but do not introduce unnecessary tooling.

## Validation Output Required

When done, report:

1. Changed file tree.
2. Commands run and results.
3. Confirmation that no Phaser dependency was added.
4. Confirmation that `src/game-core` contains no Phaser imports.
5. Confirmation that `RunState` uses `activePetInstanceIds`.
6. Confirmation that the first player supports one active pet via data, not hardcoded engine assumptions.
7. Confirmation that tests pass.
8. Commit SHA.

## Non-Goals

Do not implement Phaser.
Do not implement Vite UI.
Do not implement combat resolution.
Do not implement card play.
Do not implement monster AI.
Do not implement save/load.
Do not implement map generation.
Do not implement reward selection.
Do not create art assets.
Do not add production dependencies.
Do not hardcode a single active pet.
```

