# Game Architecture Bible — Pet Roguelite Deckbuilder

## 1. Project Identity

This project is a browser-first, TypeScript + Vite + Phaser 4, pet-centred roguelite deckbuilder.

The game is inspired by deckbuilder roguelikes, but its identity is not “a Slay the Spire clone.” Its core identity is:

- The player selects persistent pets before a run.
- Pets are always present in combat.
- Players interact with pets through pet-command cards and class abilities.
- Pet upgrades improve pet behaviour, pet modifiers, command-card patterns, evolution paths, and side-story progression.
- Roguelite progression should unlock choices, memories, side stories, evolution routes, and build variety rather than only increasing numbers.
- Pet side stories are separate from the main story and should not force every pet into the central plot.

The engine must support one active pet in the first playable version, but it must remain ready for multiple active pets through collection-based models such as `activePetInstanceIds`, pet slots, pet targets, and player-class active-pet limits.

## 2. Architectural Law

The most important rule:

```txt
src/game-core must never import Phaser, browser APIs, src/game-phaser, or src/app.
```

Game rules live in `src/game-core`.

Phaser renders, animates, and handles input in `src/game-phaser`.

The Vite app shell lives in `src/app`.

Phaser may call into game-core only through approved presentation controllers. Phaser scenes and presenters must not implement gameplay rules.

## 3. Top-Level Source Layout

```txt
src/
  app/
    main.ts
    create-game.ts
    styles.css

  game-core/
    data/
    model/
    systems/
    testing/
    ids.ts
    index.ts

  game-phaser/
    animation/
    controllers/
    debug/
    layout/
    presenters/
    scenes/
    view-models/
```

### `src/app`

Owns the browser entry only.

Responsibilities:

- Mount the Phaser game into `#game-root`.
- Import global app styles.
- Create the Phaser game using `createGame`.
- Avoid gameplay logic.
- Avoid save/load adapters until a later app-shell ticket.

### `src/game-core`

Owns deterministic game rules.

Responsibilities:

- Models and IDs.
- Data definitions.
- Combat, effects, statuses, monster intents.
- Pet definitions, pet instances, pet modifiers, pet side stories.
- Rewards and reward claiming/skipping.
- Run map generation and run lifecycle.
- Save snapshots and platform-agnostic save store interfaces.
- Validation helpers.
- Test fixtures.

Must not import:

- `phaser`
- `src/game-phaser`
- `src/app`
- `window`, `document`, `localStorage`, `sessionStorage`
- Node-only filesystem APIs inside gameplay code

Must not use direct `Math.random()` for gameplay. Randomness must flow through seeded RNG helpers.

### `src/game-phaser`

Owns browser presentation.

Responsibilities:

- Phaser scenes.
- Presenters that own Phaser GameObjects.
- Layout helpers and calibration constants.
- Event playback and formatting.
- View-model builders for display.
- Presentation controllers that bridge Phaser to game-core.

Must not own gameplay rules.

### `tests`

Tests are part of the architecture.

Core tests must run in Node without a browser or Phaser.

Phaser/presentation tests should prefer:

- raw source scanning
- view-model tests
- controller tests
- static architecture boundary tests

Browser automation is a later phase, not a Phase 1 assumption.

## 4. Dependency Rules

Allowed production dependency at the end of Phase 1:

```txt
phaser@4.x
```

Allowed dev dependencies at the end of Phase 1:

```txt
vite
vitest
typescript
@types/node
```

Do not add these without an explicit contract:

- React
- Redux
- Zustand
- Pixi
- GSAP
- Playwright
- Electron
- Tauri
- browser storage libraries
- animation libraries
- state-machine libraries
- scripting engines

## 5. Domain Model Principles

### IDs

IDs should be explicit branded string types where practical.

Examples:

```ts
CardId
CardInstanceId
PetDefinitionId
PetInstanceId
PlayerClassId
MonsterId
MonsterIntentId
RewardOfferId
RewardOptionId
RunId
RunNodeId
RunMapId
StoryEventId
StoryFlagId
PetMemoryId
UpgradeId
PetModifierId
```

Prefer explicit ID types over anonymous strings when data crosses system boundaries.

### Cards and Card Instances

`CardDefinition` is content data.

`CombatCardInstance` is a runtime copy in combat.

Combat piles must use `CardInstanceId[]`, not `CardId[]`, because the deck can contain duplicate cards.

Events involving cards should include `cardInstanceId` where relevant.

### Pets

Separate these concepts:

```txt
PetDefinition: species/design identity.
PetInstance: persistent player-owned pet.
RunPetState: combat/run temporary pet state.
PetCommandCard: a card that commands or interacts with a pet.
PetUpgradeDefinition: persistent upgrade data.
PetModifierDefinition: rules created by upgrades or temporary effects.
```

Pets are persistent companions, not disposable card effects.

Pet-related effects must remain multi-pet ready through target shapes such as:

```txt
leading
allActive
specific
randomActive
withTag
```

Do not design systems that assume only one pet forever.

### Players

Player class data decides:

- starting deck
- active-pet limit
- pet slot count
- class tags
- future pet interaction style

The first class may have `maxActivePets: 1`, but that is data, not an engine assumption.

### Combat

Combat is deterministic and event-driven.

Core combat functions should return:

```ts
GameActionResult<CombatState>
```

Typical result shape:

```ts
ok
state
events
errors
```

Normal gameplay errors return `ok: false`; they should not throw.

Examples:

- insufficient energy
- invalid target
- card not in hand
- missing active pet
- combat already ended

Combat events are the interface for Phaser playback.

Examples:

```txt
CombatStarted
TurnStarted
CardPlayed
EnergySpent
CardMoved
CardDrawn
PetCommanded
PetModifierActivated
DamageDealt
StatusApplied
CombatantDefeated
CombatEnded
```

### Effects

Effects should be data-driven and composable.

Current effect examples:

```txt
damage
block
draw
applyStatus
petAttack
petBlock
petReact
setStoryFlag
```

Avoid writing card-name-specific combat logic.

Bad:

```ts
if (card.name === "Fox Bite") { ... }
```

Good:

```txt
selector tags: pet, fox, burn, command
modifier rule: modifyPetCommandEffectAmount
```

### Statuses

Statuses should be deterministic and explicitly tested.

Burn currently means:

- start-of-turn tick
- block-ignoring damage
- stack decay
- expiry at zero
- can defeat combatants
- can trigger combat outcome

Future statuses should follow the same event-driven shape.

### Monster Intents

Monster definitions own an `intentPool`.

Combat state owns selected `monsterIntents`.

Intent selection must use seeded RNG.

Phaser reads selected intents from view models. Phaser must not decide monster actions.

### Rewards

Rewards are explicit `RewardOfferState` objects.

Reward options include:

```txt
card
petUpgrade
```

Reward generation only works after won combat.

Claiming a card appends to `RunState.deckCardIds`.

Claiming a pet upgrade appends to the target `PetInstance.unlockedUpgradeIds`.

Claiming or skipping a run pending reward must clear `pendingRewardOffer` and advance the map through run lifecycle helpers.

### Pet Modifiers

Pet upgrades create modifiers that affect combat.

Current modifier rule families:

```txt
modifyPetCommandCost
modifyPetCommandEffectAmount
triggerOnEnemyDefeatedWithStatus
```

Modifier ownership follows resolved pet targets.

Usage limits can be once per turn or once per combat.

Modifiers must emit serializable events for visibility and future animation.

### Run Map and Lifecycle

Run state owns lifecycle state:

```txt
not_started
map_select
combat
reward
completed
lost
```

Run maps are layered, deterministic, and seeded.

Map nodes have statuses:

```txt
locked
available
active
completed
skipped
```

Run lifecycle functions own transitions:

```txt
createRun
selectRunNode
startCombatForRunNode
completeRunCombatNode
claimRunPendingReward
skipRunPendingReward
completeRunNonCombatNode
```

Phaser must call these through `RunSandboxController`, not directly from scenes.

### Story

Pet side stories are separate from main story.

Pet story progress lives on the relevant `PetInstance`:

```txt
unlockedMemoryIds
storyFlags
seenStoryEventIds
unlockedUpgradeIds
unlockedEvolutionNodeIds
bondXp
```

Story events are data-driven:

```txt
requirements
outcomes
trigger
repeatable
```

Non-repeatable story events should not apply twice to the same pet.

Outcomes should be idempotent.

### Save Snapshots

Save snapshots are core-only and platform-agnostic.

Core may define:

```txt
SaveSnapshot
SaveStore
createSaveSnapshot
serializeSaveSnapshot
parseSaveSnapshot
restoreSaveSnapshot
createMemorySaveStore
```

Core must not implement browser `localStorage`, Electron storage, Tauri storage, or cloud save directly.

Platform adapters belong in app/presentation layer later.

## 6. Phaser Presentation Architecture

### Controllers

Controllers are the bridge from Phaser to game-core.

Current active browser flow should use `RunSandboxController`.

Rules:

- Scenes call controller methods.
- Controllers call game-core lifecycle functions.
- Controllers store `lastEvents` for view models and event logs.
- Controllers must not use browser storage.
- Controllers must not duplicate game-core rules.

### Scenes

Scenes own screen-level orchestration.

Current core scenes:

```txt
BootScene
MapScene
CombatScene
RewardScene
CoreSmokeScene
```

Rules:

- Scenes can route to other scenes.
- Scenes can render presenters.
- Scenes can call controller methods.
- Scenes must not call gameplay resolvers directly.
- Scenes must not contain combat, reward, map, save, or story rules.

### Presenters

Presenters own Phaser GameObjects.

Examples:

```txt
CardPresenter
MonsterPresenter
PetPresenter
PlayerPresenter
CombatHudPresenter
EventLogPresenter
MapNodePresenter
RewardOptionPresenter
RunHudPresenter
```

Rules:

- Presenters receive view models and callbacks.
- Presenters do not import game-core resolver functions.
- Presenters do not own game rules.
- Presenters use layout helpers.
- Presenters should clear/update their own objects on render.

### View Models

View models convert game-core state into serializable presentation data.

Examples:

```txt
CombatViewModel
RunViewModel
RewardViewModel
```

Rules:

- View-model builders may import game-core types/data.
- View-model builders must not import Phaser.
- Missing definitions should produce fallback labels, not throw.
- View models must be JSON-serializable.

### Event Playback

Game-core emits `GameEvent[]`.

Phaser presentation formats and displays those events.

Event playback should be additive and deterministic. Do not pre-populate duplicate event logs for events that will be played back.

## 7. Validation and Testing Architecture

The test suite must protect architecture boundaries.

Required permanent checks:

- `src/game-core` has no Phaser imports.
- `src/game-core` imports nothing from `src/game-phaser` or `src/app`.
- `src/game-core` has no browser storage/global references.
- `src/game-core` does not use direct `Math.random()`.
- Phaser scenes do not call game-core resolver functions directly.
- `RunSandboxController` is the only active Phaser-facing run/combat/reward lifecycle bridge.
- View-model files do not import Phaser.
- Presenters do not import gameplay resolvers.
- `npm run typecheck`, `npm test`, `npm run build`, and audit must pass in CI.

Raw-source tests that assert multiline source code must be line-ending agnostic.

## 8. Content Authoring Rules

New cards, pets, monsters, rewards, bosses, and story events should usually be data, not engine branches.

Use tags heavily.

Good combo surfaces:

```txt
burn
pet-command
fox
guard
draw
discard
mark
curse
retaliate
combo
finisher
setup
multi-pet
```

New content should answer:

1. What role does this support?
2. What tags does it expose?
3. What other systems can react to it?
4. Does it create a play-pattern choice rather than only bigger numbers?
5. Is it testable through deterministic core events?

## 9. Adding New Features

### Adding a Card

1. Add a `CardDefinition` in data.
2. Use existing effect types where possible.
3. Add validation/tests if using new effect shapes.
4. Avoid card-name-specific engine code.
5. Add reward eligibility tests if it can appear in rewards.

### Adding a Pet

1. Add `PetDefinition`.
2. Add command cards.
3. Add upgrades/modifiers.
4. Add side-story data.
5. Add tests for pet target behaviour and reward eligibility.
6. Verify multi-pet compatibility.

### Adding a Pet Upgrade

1. Add `PetUpgradeDefinition`.
2. Prefer modifier rules over custom engine branches.
3. Add tests for event order, usage limits, and ownership.
4. Add validation tests for malformed data.

### Adding a Monster or Boss

1. Add `MonsterDefinition` with intent pool.
2. Add encounter data.
3. Add run-map placement if needed.
4. Test deterministic intent selection and combat outcome.
5. Do not add bespoke boss scripting unless the contract explicitly introduces that system.

### Adding a Phaser Scene

1. Add scene key.
2. Add scene file.
3. Add presenter/view-model/layout helpers as needed.
4. Route through controllers.
5. Add boundary tests.
6. Do not call game-core resolver functions directly from the scene.

### Adding Save/Load UI

1. Keep core save helpers platform-agnostic.
2. Add browser storage adapter outside `src/game-core`.
3. Keep UI state separate from save snapshot data.
4. Validate corrupt save data without throwing.

## 10. Phase 1 Definition of Done

Phase 1 is complete when all of the following are true:

- One player class exists.
- One active pet, Ember Fox, exists.
- Combat has draw/hand/discard/energy.
- Normal cards and pet-command cards work.
- Monsters have intents and enemy turns.
- Burn, block, draw, damage, win/loss outcome work.
- Rewards can be generated, claimed, skipped.
- Pet upgrades affect combat through modifiers.
- Run map progression exists.
- Pet side-story progress exists.
- Save snapshot core exists.
- Browser app runs through map, combat, reward, and back to map.
- First elite and boss vertical-slice content exists.
- Architecture boundary tests pass.
- Clean review ZIP validates without manual repair.

## 11. Phase 2 Direction

Phase 2 should focus on making the game feel good before expanding too much content.

Recommended order:

1. Improve feel and readability.
2. Add limited content variety.
3. Add second pet only after Ember Fox loop is fun.
4. Add better boss mechanics after combat feedback is readable.
5. Add save/load UI after the core gameplay loop is stable.

Avoid adding a large content library before the first loop feels good.

## 12. Non-Negotiables

- No Phaser in `src/game-core`.
- No direct `Math.random()` in gameplay logic.
- No single-pet engine assumption.
- No card-name-specific rule branches.
- No browser storage in core.
- No scene-owned gameplay rules.
- Every gameplay feature must be deterministic and testable.
- Every important gameplay action should emit events.
- Content should be data-driven where practical.
- Architecture tests are part of the product, not optional cleanup.
