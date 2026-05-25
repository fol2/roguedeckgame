# Engineering Contract v0.8 — Pet Side-Story Progression and Save Snapshot Core

## Objective

Implement the first core-only pet side-story progression system and lightweight save snapshot layer for the pet-centered roguelite deckbuilder.

Previous tickets built the deterministic combat loop, rewards, pet upgrade modifiers, and run map lifecycle. This ticket connects long-term pet progression and persistence without adding UI.

After this ticket, game-core should support:

1. Evaluating data-driven pet side-story events.
2. Applying pet story outcomes to the correct persistent `PetInstance`.
3. Recording pet memories, pet story flags, seen pet story events, bond XP, and unlockable evolution nodes.
4. Proving story progression remains separate from main story state.
5. Creating, serializing, validating, and restoring a versioned save snapshot.
6. Saving and loading through a small storage interface and test memory store.

This task must stay inside `src/game-core`, tests, docs, and CI-safe tooling.

Use these skills:

- `$game-architecture-guard`
- `$pet-system-designer`
- `$story-event-author`
- `$combat-engine-test-writer`
- `$content-author`

## Current Baseline

Latest pushed HEAD before this ticket:

```txt
f1be03bb0195f186c07e60ff0e175a057719f47c
```

The current game-core already includes:

- deterministic combat loop
- card instances
- pet-command cards
- monster intents
- Burn status
- win/loss combat outcome
- reward offer generation and claim/skip
- pet upgrade modifier resolution
- run map generation
- encounter graph and run lifecycle
- `RunState.activePetInstanceIds`
- `RunState.status`, `RunState.map`, and `RunState.pendingRewardOffer`
- existing story data stubs for Ember Fox
- existing pet fields: `unlockedMemoryIds`, `storyFlags`, `unlockedUpgradeIds`, `chosenEvolutionNodeIds`

## Core Design Goal

Pet side stories should be side-progress, not main-story coupling.

A new pet should usually add pet story data, not edit the main story engine.

The save snapshot should be simple, explicit, versioned, and robust enough for future browser localStorage, Electron, or Tauri wrappers. Do not implement actual browser `localStorage` in this ticket; keep game-core pure and testable in Node.

## Non-Goals

Do not implement Phaser.
Do not implement Vite UI.
Do not implement React.
Do not create art assets.
Do not implement browser `localStorage` directly.
Do not implement Electron/Tauri storage.
Do not implement main story chapters beyond existing structural flags.
Do not implement full narrative UI.
Do not implement dialogue rendering.
Do not implement event-node UI.
Do not implement rest-site effects.
Do not implement card upgrade resolution.
Do not implement relics.
Do not implement boss mechanics.
Do not implement meta-currency.
Do not add production dependencies.
Do not hardcode a single active pet.

## Required File Changes

Create or update these files as appropriate:

```txt
src/game-core/model/story.ts
src/game-core/model/pet.ts
src/game-core/model/event.ts
src/game-core/model/save.ts
src/game-core/model/registry.ts

src/game-core/data/story/ember-fox-story.ts
src/game-core/data/registry.ts

src/game-core/systems/story.ts
src/game-core/systems/save.ts
src/game-core/systems/validation.ts

src/game-core/testing/story-fixtures.ts
src/game-core/testing/save-fixtures.ts
src/game-core/testing/run-fixtures.ts
src/game-core/index.ts

tests/game-core/story-requirements.test.ts
tests/game-core/story-outcomes.test.ts
tests/game-core/story-integration.test.ts
tests/game-core/save-snapshot.test.ts
tests/game-core/save-store.test.ts
tests/game-core/save-integration.test.ts
```

Keep all existing tests passing.

## Pet Instance Model Requirements

Update `PetInstance` if needed to make persistent side-story state explicit.

Suggested shape:

```ts
export type PetInstance = {
  readonly id: PetInstanceId;
  readonly definitionId: PetDefinitionId;
  readonly nickname: string;
  readonly bondLevel: number;
  readonly bondXp: number;
  readonly unlockedUpgradeIds: readonly UpgradeId[];
  readonly chosenEvolutionNodeIds: readonly EvolutionNodeId[];
  readonly unlockedEvolutionNodeIds?: readonly EvolutionNodeId[];
  readonly unlockedMemoryIds: readonly PetMemoryId[];
  readonly storyFlags: readonly StoryFlagId[];
  readonly seenStoryEventIds?: readonly StoryEventId[];
};
```

If optional fields are added, fixture helpers should normalize them so code does not scatter `?? []` everywhere.

Requirements:

1. Existing pet fixtures must keep working.
2. Side-story events should not require modifying `RunState.storyFlags` unless the event is intentionally global.
3. Pet-specific story progress should live on the target `PetInstance`.
4. Do not remove existing fields.

## Story Model Requirements

Extend story models minimally so story events can be evaluated in context.

Suggested additions:

```ts
export type StoryTrigger =
  | "manual"
  | "runCreated"
  | "combatWon"
  | "nodeCompleted"
  | "runCompleted";

export type StoryEventDefinition = {
  readonly id: StoryEventId;
  readonly title: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly trigger?: StoryTrigger;
  readonly repeatable?: boolean;
  readonly requirements: readonly StoryRequirement[];
  readonly outcomes: readonly StoryOutcome[];
};
```

Existing requirements should continue to work:

```ts
petBondAtLeast
hasPetMemory
bossDefeated
chapterUnlocked
hasSeenEvent
activePetHasTag
playerClassIs
```

Add only the minimum extra requirements needed for this ticket. Suggested additions:

```ts
{ type: "hasPetStoryFlag"; flagId: StoryFlagId }
{ type: "lacksPetStoryFlag"; flagId: StoryFlagId }
{ type: "runStatusIs"; status: RunStatus }
{ type: "completedRunNodeType"; nodeType: RunNodeType }
```

If implementation chooses a different requirement shape, it must still support:

- checking pet flags
- checking missing pet flags
- checking current run status
- checking completed node type or recent story context

Outcomes should continue to support:

```ts
setStoryFlag
unlockPetMemory
unlockPetUpgrade
unlockEvolutionNode
addBondXp
```

Add outcome support only if needed:

```ts
markStoryEventSeen
```

But it is acceptable for the story system to always mark non-repeatable events as seen automatically after successful application.

## Story Context Requirements

Create a story evaluation context.

Suggested shape:

```ts
export type PetStoryContext = {
  readonly trigger: StoryTrigger;
  readonly run?: RunState;
  readonly completedNodeType?: RunNodeType;
  readonly combatOutcome?: "won" | "lost";
  readonly globalStoryFlags?: readonly StoryFlagId[];
};
```

The exact shape may differ, but it must support evaluating side-story events after meaningful run milestones.

## Story System Requirements

Create `src/game-core/systems/story.ts`.

It should provide helpers like:

```ts
canApplyStoryEvent(input): GameActionResult<boolean>
applyPetStoryEvent(input): GameActionResult<PetStoryProgressState>
evaluatePetSideStories(input): GameActionResult<PetStoryProgressState>
```

Suggested result state:

```ts
export type PetStoryProgressState = {
  readonly run?: RunState;
  readonly petInstances: readonly PetInstance[];
};
```

Requirements:

1. Evaluate story events from `registry.petSideStories` / `registry.storyEvents`.
2. Only apply pet side-story events to matching pet definitions.
3. Only apply to active pets unless explicitly called for a specific inactive pet.
4. Do not apply non-repeatable events twice to the same pet instance.
5. Requirements must be evaluated deterministically.
6. Outcomes must be applied immutably.
7. Outcomes must be idempotent: duplicate memory/flag/upgrade/evolution unlocks should not duplicate entries.
8. Rejected story application must return `ok: false`, `ActionRejected`, and the original state.
9. Story progression must not mutate registry, run, or pet instance inputs.
10. Story events must be serializable through `GameEvent[]`.

## Story Event Requirements

Add or update story events for Ember Fox.

Minimum story event:

```txt
ember_fox_side_story
```

Recommended updated behavior:

```txt
Trigger: nodeCompleted
Requirements:
- playerClassIs novice_tamer
- activePetHasTag fox
- lacksPetStoryFlag ember_fox_memory_01_unlocked
Outcomes:
- unlockPetMemory ember_fox_memory_burned_orchard
- setStoryFlag ember_fox_memory_01_unlocked
- unlockPetUpgrade warm_bond
- addBondXp 1
```

This event should not be treated as main story. It is an Ember Fox side-story unlock.

Add a second small event only if useful for testing non-repeatability or requirement chaining. Keep prose minimal.

## Story Event Requirements and Outcomes Tests

Tests should prove:

1. `playerClassIs` works.
2. `activePetHasTag` works.
3. `petBondAtLeast` works.
4. `hasPetMemory` works.
5. `hasSeenEvent` works.
6. `hasPetStoryFlag` and `lacksPetStoryFlag` work if added.
7. Wrong player class prevents the event.
8. Missing active pet tag prevents the event.
9. Already-seen non-repeatable event does not apply again.
10. Outcomes unlock memory, pet story flag, upgrade, evolution node if used, and bond XP.
11. Outcomes do not duplicate memory IDs, flags, upgrades, or seen event IDs.
12. Story events emit deterministic event order.

## Story Event Model / GameEvent Requirements

Add serializable events for story progression.

Required event types:

```ts
PetStoryEventCompleted
PetMemoryUnlocked
PetBondXpAdded
PetStoryFlagSet
```

Optional event types if implementing evolution unlocks explicitly:

```ts
PetEvolutionNodeUnlocked
PetUpgradeUnlocked // existing event may be reused
StoryEventSeen
```

Suggested shapes:

```ts
PetStoryEventCompleted:
  type: "PetStoryEventCompleted"
  petInstanceId: PetInstanceId
  storyEventId: StoryEventId

PetMemoryUnlocked:
  type: "PetMemoryUnlocked"
  petInstanceId: PetInstanceId
  memoryId: PetMemoryId

PetBondXpAdded:
  type: "PetBondXpAdded"
  petInstanceId: PetInstanceId
  amount: number
  total: number

PetStoryFlagSet:
  type: "PetStoryFlagSet"
  petInstanceId: PetInstanceId
  flagId: StoryFlagId
```

All events must be plain serializable objects.

## Save Snapshot Model Requirements

Create `src/game-core/model/save.ts`.

Suggested shape:

```ts
export const SAVE_SCHEMA_VERSION = 1 as const;

export type SaveSnapshot = {
  readonly schemaVersion: typeof SAVE_SCHEMA_VERSION;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly profileId: string;
  readonly activeRun?: RunState;
  readonly petInstances: readonly PetInstance[];
  readonly globalStoryFlags: readonly StoryFlagId[];
};

export type SaveSlotMetadata = {
  readonly slotId: string;
  readonly updatedAt: string;
  readonly schemaVersion: number;
  readonly hasActiveRun: boolean;
};
```

Keep this small. Do not include UI settings, graphics settings, user account data, cloud sync, or platform-specific fields.

## Save System Requirements

Create `src/game-core/systems/save.ts`.

It should provide pure helpers:

```ts
createSaveSnapshot(input): GameActionResult<SaveSnapshot>
serializeSaveSnapshot(snapshot): GameActionResult<string>
parseSaveSnapshot(json): GameActionResult<SaveSnapshot>
validateSaveSnapshot(snapshot): GameActionResult<SaveSnapshot>
restoreSaveSnapshot(snapshot): GameActionResult<SaveRestoredState>
```

Suggested restored state:

```ts
export type SaveRestoredState = {
  readonly activeRun?: RunState;
  readonly petInstances: readonly PetInstance[];
  readonly globalStoryFlags: readonly StoryFlagId[];
};
```

Requirements:

1. Save snapshot must be JSON serializable.
2. Same snapshot should serialize deterministically except timestamp fields.
3. Parsing invalid JSON returns `ok: false`, not throw.
4. Unsupported schema version returns `ok: false`.
5. Missing required fields return `ok: false`.
6. Invalid active run shape returns `ok: false`.
7. Invalid pet instance shape returns `ok: false`.
8. Save helpers must not mutate inputs.
9. Save helpers must not import Phaser, browser APIs, Node-only filesystem APIs, or localStorage.
10. No production dependencies.

## Save Store Interface Requirements

Add a tiny storage interface, but keep it platform-agnostic.

Suggested shape:

```ts
export type SaveStore = {
  readonly write: (slotId: string, serializedSnapshot: string) => Promise<void> | void;
  readonly read: (slotId: string) => Promise<string | undefined> | string | undefined;
  readonly delete: (slotId: string) => Promise<void> | void;
  readonly list: () => Promise<readonly SaveSlotMetadata[]> | readonly SaveSlotMetadata[];
};
```

Add an in-memory test implementation:

```ts
createMemorySaveStore(): SaveStore
```

Do not implement browser `localStorage` yet. That belongs with the later Vite/Phaser application shell.

Add convenience helpers:

```ts
saveToSlot(store, slotId, snapshot)
loadFromSlot(store, slotId)
deleteSaveSlot(store, slotId)
```

If this feels too large, implement the store interface and memory store only. Keep it clean.

## Save Events

Add serializable events if useful:

```ts
SaveSnapshotCreated
SaveSlotWritten
SaveSlotLoaded
SaveSlotDeleted
```

These are optional, but if implemented they must be plain objects.

Do not mix save events into combat/run event logs unless explicitly returned from save functions.

## Integration With Run Lifecycle

Add tests proving that a run after ticket 6 can be saved and restored.

Minimum integration path:

1. Create a run.
2. Select a combat node.
3. Start combat.
4. Force or play combat to `won`.
5. Complete combat node to create pending reward.
6. Save snapshot with active run and pet instances.
7. Parse/restore snapshot.
8. Confirm restored run still has `status: "reward"` and an open `pendingRewardOffer`.
9. Claim or skip reward after restore.
10. Confirm run can advance to next map nodes.

No UI required.

## Integration With Pet Side Story

Add an integration test:

1. Create a run with Novice Tamer and Ember Fox.
2. Complete or simulate a node completion context.
3. Evaluate pet side stories.
4. Confirm Ember Fox unlocks `ember_fox_memory_burned_orchard`.
5. Confirm Ember Fox gets `ember_fox_memory_01_unlocked` story flag.
6. Confirm Warm Bond is unlocked if the story event includes `unlockPetUpgrade`.
7. Save snapshot.
8. Parse/restore snapshot.
9. Confirm restored pet instance still has memory, story flag, and upgrade.
10. Start a future combat and confirm Warm Bond can affect combat if it was unlocked by story.

This proves story progression is not just data decoration.

## Registry Validation Requirements

Extend `validateRegistry` to catch obvious story/save-relevant data mistakes.

Recommended story validation checks:

1. Duplicate story event IDs.
2. Duplicate pet side story IDs.
3. Pet side story references known pet definition.
4. Pet side story `events` are present in story registry or are intentionally embedded.
5. Story event requirement types are known.
6. Story outcome types are known.
7. `unlockPetUpgrade` outcome references known upgrade.
8. `unlockEvolutionNode` outcome references known evolution node.
9. `unlockPetMemory` outcome references a memory declared in the pet side story when applicable.
10. `setStoryFlag` outcome references a flag declared in the pet side story when applicable.
11. `addBondXp` amount is positive integer.
12. `trigger` is known if present.

Do not overbuild full narrative validation. Keep it deterministic and non-throwing.

## Tests Required

Use Vitest.

### `story-requirements.test.ts`

Test:

1. Matching `playerClassIs` passes.
2. Non-matching `playerClassIs` fails.
3. Matching `activePetHasTag` passes.
4. Missing `activePetHasTag` fails.
5. `petBondAtLeast` passes/fails correctly.
6. `hasPetMemory` passes/fails correctly.
7. `hasSeenEvent` passes/fails correctly.
8. `hasPetStoryFlag` / `lacksPetStoryFlag` pass/fail if added.
9. Wrong trigger does not apply a triggered event.

### `story-outcomes.test.ts`

Test:

1. `unlockPetMemory` adds memory once.
2. `setStoryFlag` adds pet story flag once.
3. `unlockPetUpgrade` adds upgrade once.
4. `addBondXp` increments XP.
5. Non-repeatable events are marked seen and do not run twice.
6. Events are serializable.
7. Rejected story application does not mutate inputs.

### `story-integration.test.ts`

Test:

1. Ember Fox side story unlocks burned orchard memory after the chosen trigger/context.
2. Ember Fox side story sets `ember_fox_memory_01_unlocked`.
3. Ember Fox side story unlocks Warm Bond if configured.
4. The same side story does not apply twice to the same pet.
5. The side story does not apply to inactive pets.
6. Story progression plus save/restore preserves pet progress.
7. Warm Bond unlocked through story affects a later combat.

### `save-snapshot.test.ts`

Test:

1. Create save snapshot with active run and pet instances.
2. Serialize and parse roundtrip.
3. Restored state equals expected plain data.
4. Invalid JSON returns `ok: false`.
5. Unsupported schema version returns `ok: false`.
6. Missing required fields return `ok: false`.
7. Invalid active run shape returns `ok: false`.
8. Invalid pet instance shape returns `ok: false`.
9. Save helpers do not mutate inputs.
10. Save snapshot does not contain functions or non-serializable data.

### `save-store.test.ts`

Test:

1. Memory save store can write and read a slot.
2. `loadFromSlot` parses valid data.
3. Missing slot returns `ok: false` with useful error.
4. Delete removes a slot.
5. List returns metadata.
6. Corrupt slot data returns `ok: false`.
7. Store helpers do not require browser APIs.

### `save-integration.test.ts`

Test:

1. Create run → select combat → complete won combat → pending reward.
2. Save pending reward state.
3. Restore it.
4. Claim or skip reward after restore.
5. Confirm map advances correctly.
6. Confirm pet side-story progress survives save/restore.

## Existing Test Expectations

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
combat-intents
combat-enemy-turn
combat-status
combat-outcome
reward-generate
reward-claim
reward-integration
pet-modifier-*
run-map-generate
run-node-selection
run-combat-flow
run-reward-flow
run-validation
run-integration
localhost-smoke
```

If event types are extended, update model-shape and smoke tests accordingly.

## Mutation Safety

Rejected normal actions must return:

```ts
ok: false
state: originalState or wrapper containing original references
events: [{ type: "ActionRejected", ... }]
errors: [...]
```

Do not mutate:

- registry
- run
- pet instances
- story definitions
- save snapshots
- serialized input strings

No Immer or other dependency.

## Error Handling

Do not throw for normal invalid data.

Return `ok: false` for:

- unknown story event
- story event requirement not met when explicitly applying a story event
- unsupported story requirement type
- unsupported story outcome type
- malformed story data
- invalid save JSON
- unsupported save schema version
- missing save slot
- corrupt save slot
- invalid snapshot shape

## Documentation

Create:

```txt
docs/contracts/7-pet-side-story-save-core-contract.md
docs/contracts/7-pet-side-story-save-core.md
docs/plans/YYYY-MM-DD-008-pet-side-story-save-core-plan.md
```

Copy this contract into both contract files if that is the established repo pattern.

The plan should briefly include:

- files to add/update
- test plan
- non-goals
- architecture risks
- story-repeatability risks
- save-versioning risks

## Commands to Run

Run:

```bash
npm run typecheck
npm test
npm run smoke:localhost
npm audit --audit-level=moderate
git diff --check
git diff --no-index docs/contracts/7-pet-side-story-save-core-contract.md docs/contracts/7-pet-side-story-save-core.md
npm run zip:review
```

If `zip:review` requires clean `HEAD`, run it after commit from a clean worktree and report the path.

Do not add production dependencies.

## Validation Output Required

When complete, report:

1. Changed file tree.
2. Commands run and results.
3. Confirmation that no Phaser dependency was added.
4. Confirmation that `src/game-core` contains no Phaser imports.
5. Confirmation that no direct `Math.random()` was added to `src/game-core`.
6. Confirmation that pet side-story events apply to the correct pet instance.
7. Confirmation that pet side-story progress does not mutate main story state unless explicitly configured.
8. Confirmation that story events are non-repeatable by default.
9. Confirmation that memory/flag/upgrade outcomes are idempotent.
10. Confirmation that Ember Fox side-story unlocks its first memory/flag and any configured upgrade.
11. Confirmation that save snapshots serialize/parse/restore successfully.
12. Confirmation that invalid/corrupt save data returns `ok: false`, not thrown exceptions.
13. Confirmation that restored pending reward runs can still claim/skip and advance.
14. Confirmation that no UI, Phaser, localStorage adapter, map-generation rewrite, boss mechanics, or production dependencies were added.
15. Confirmation that all tests pass.
16. Final pushed commit SHA.
17. Review ZIP path if generated.

## Final Reminder

Keep this small and durable.

Do not build a full narrative engine. Do not build cloud save. Do not add browser storage yet.

The goal is a clean core foundation for:

- pet memories
- pet story flags
- story-event outcomes
- non-repeatable side-story progress
- versioned save snapshots
- future UI-driven save/load screens
