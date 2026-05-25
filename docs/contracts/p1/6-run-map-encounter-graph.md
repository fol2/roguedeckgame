# Engineering Contract v0.7 — Run Map, Encounter Graph, and Core Run Lifecycle

## Objective

Implement the first deterministic run-map and encounter-flow layer for the pet-centered roguelite deckbuilder.

Previous tickets built the core combat loop, reward generation, reward claiming, and pet upgrade modifier resolution. This ticket connects those pieces into a core-only roguelite run structure:

1. Create a seeded run map.
2. Select available map nodes.
3. Start combat from selected encounter nodes.
4. Complete won/lost combat nodes.
5. Generate pending rewards after won combat.
6. Claim or skip pending rewards.
7. Advance to the next available nodes.

This task must stay inside `src/game-core`, tests, docs, and optionally a lightweight CI workflow.

Use these skills:

- `$game-architecture-guard`
- `$combat-engine-test-writer`
- `$content-author`
- `$pet-system-designer`
- `$story-event-author` only if touching story-shaped event node placeholders

## Current Baseline

Latest pushed HEAD before this ticket:

```txt
8ef8b685084dba2ed81d5bb155ff2e3984a9ed9d
```

Current game-core already includes:

- deterministic combat loop
- card instances
- pet-command cards
- monster intents
- Burn status
- win/loss combat outcome
- reward offer generation
- card reward claiming
- pet upgrade reward claiming
- reward skipping
- pet upgrade modifier resolution
- Burning Fang / Warm Bond / Ash Instinct combat behavior
- multi-pet-ready `activePetInstanceIds`

## Core Design Goal

The engine should now support a small but real run flow without UI:

```txt
create run
generate seeded map
select available combat node
start combat from encounter
combat resolves to won/lost
won combat creates pending reward
claim/skip reward
node completes
next connected nodes become available
repeat until boss/end node or run lost
```

This ticket is not about making the run pretty. It is about getting the deterministic core lifecycle correct before Phaser UI starts.

## Non-Goals

Do not implement Phaser.
Do not implement Vite UI.
Do not implement React.
Do not create art assets.
Do not implement save/load.
Do not implement story progression.
Do not implement full event-node narrative.
Do not implement rest-site healing/upgrades beyond structural placeholders.
Do not implement card upgrade resolution.
Do not implement relics.
Do not implement boss-specific mechanics.
Do not implement weighted monster AI.
Do not implement reward UI.
Do not add production dependencies.
Do not hardcode a single active pet.

## Required File Changes

Create or update these files as appropriate:

```txt
src/game-core/ids.ts
src/game-core/index.ts

src/game-core/model/encounter.ts
src/game-core/model/event.ts
src/game-core/model/run.ts
src/game-core/model/run-map.ts
src/game-core/model/registry.ts

src/game-core/data/encounters/forest-encounters.ts
src/game-core/data/run-maps/act1-forest.ts
src/game-core/data/registry.ts

src/game-core/systems/run-map.ts
src/game-core/systems/run-lifecycle.ts
src/game-core/systems/validation.ts

src/game-core/testing/run-fixtures.ts

tests/game-core/run-map-generate.test.ts
tests/game-core/run-node-selection.test.ts
tests/game-core/run-combat-flow.test.ts
tests/game-core/run-reward-flow.test.ts
tests/game-core/run-validation.test.ts
tests/game-core/run-integration.test.ts
```

Optional but strongly recommended:

```txt
.github/workflows/ci.yml
```

Keep all existing tests passing.

## ID Requirements

Add explicit ID types in `src/game-core/ids.ts`:

```ts
RunMapId
RunNodeId
EncounterId
RunTemplateId
```

Add helpers:

```ts
runMapId(value: string): RunMapId
runNodeId(value: string): RunNodeId
encounterId(value: string): EncounterId
runTemplateId(value: string): RunTemplateId
```

Keep existing branded ID style.

## Encounter Model Requirements

Create `src/game-core/model/encounter.ts`.

Minimum shape:

```ts
export type EncounterType = "combat" | "elite" | "boss";

export type EncounterDefinition = {
  readonly id: EncounterId;
  readonly type: EncounterType;
  readonly name: string;
  readonly monsterIds: readonly MonsterId[];
  readonly tags: readonly string[];
  readonly rewardSeedSalt?: string;
};
```

Do not implement boss mechanics yet. A boss encounter can reuse current monster definitions as a placeholder, but it should be structurally typed as `"boss"` for future UI and run completion.

## Run Map Model Requirements

Create `src/game-core/model/run-map.ts`.

Suggested types:

```ts
export type RunNodeType = "combat" | "elite" | "rest" | "event" | "boss";
export type RunNodeStatus = "locked" | "available" | "active" | "completed" | "skipped";

export type RunNodeState = {
  readonly id: RunNodeId;
  readonly type: RunNodeType;
  readonly layer: number;
  readonly status: RunNodeStatus;
  readonly encounterId?: EncounterId;
  readonly nextNodeIds: readonly RunNodeId[];
  readonly previousNodeIds: readonly RunNodeId[];
};

export type RunMapState = {
  readonly id: RunMapId;
  readonly templateId: RunTemplateId;
  readonly seed: string | number;
  readonly nodes: readonly RunNodeState[];
  readonly currentNodeId?: RunNodeId;
};
```

If a different shape is chosen, it must support:

- deterministic map generation
- layered progression
- available / active / completed node state
- node connections
- future UI rendering
- future map-node icons by type
- future branching paths

## Run State Requirements

Update `RunState` carefully.

It currently includes core fields like:

```ts
id
seed
playerClassId
activePetInstanceIds
deckCardIds
runFlags
storyFlags
```

Extend it with run lifecycle fields. Suggested shape:

```ts
export type RunStatus =
  | "not_started"
  | "map_select"
  | "combat"
  | "reward"
  | "completed"
  | "lost";

export type RunState = {
  // existing fields...
  readonly status: RunStatus;
  readonly map?: RunMapState;
  readonly pendingRewardOffer?: RewardOfferState;
};
```

If the implementation prefers a separate `RunProgressState`, that is acceptable, but it must avoid scattering run lifecycle state across unrelated objects.

Important requirements:

1. `RunState` must still use `activePetInstanceIds`, not a single pet field.
2. Existing tests using run fixtures must still pass after fixture updates.
3. Reward-pending state must be explicit so UI can later show the reward screen.
4. A run should not advance to the next node until an open pending reward is claimed or skipped.

## Run Events

Add serializable run lifecycle events to `GameEvent`.

Required events:

```ts
RunCreated
RunMapGenerated
RunNodeAvailable
RunNodeSelected
RunCombatStarted
RunCombatCompleted
RunRewardPending
RunNodeCompleted
RunAdvanced
RunEnded
```

Suggested shapes:

```ts
RunCreated:
  type: "RunCreated"
  runId: RunId
  seed: string | number
  playerClassId: PlayerClassId
  activePetInstanceIds: readonly PetInstanceId[]

RunMapGenerated:
  type: "RunMapGenerated"
  runMapId: RunMapId
  nodeCount: number

RunNodeAvailable:
  type: "RunNodeAvailable"
  nodeId: RunNodeId

RunNodeSelected:
  type: "RunNodeSelected"
  nodeId: RunNodeId

RunCombatStarted:
  type: "RunCombatStarted"
  nodeId: RunNodeId
  encounterId: EncounterId
  combatId: RunId

RunCombatCompleted:
  type: "RunCombatCompleted"
  nodeId: RunNodeId
  outcome: "won" | "lost"

RunRewardPending:
  type: "RunRewardPending"
  nodeId: RunNodeId
  rewardOfferId: RewardOfferId

RunNodeCompleted:
  type: "RunNodeCompleted"
  nodeId: RunNodeId

RunAdvanced:
  type: "RunAdvanced"
  availableNodeIds: readonly RunNodeId[]

RunEnded:
  type: "RunEnded"
  outcome: "completed" | "lost"
```

The exact payload may vary, but events must remain plain serializable objects.

## Initial Data Requirements

Create forest encounter data:

```txt
training_slime_encounter
ash_mite_encounter
forest_duo_encounter
forest_elite_placeholder
forest_boss_placeholder
```

Use existing monster IDs for now:

```txt
training_slime
ash_mite
```

Boss-specific mechanics are a later ticket. For now, `forest_boss_placeholder` can use two current monsters or another simple combination, but it must be structurally an encounter with `type: "boss"`.

Create a small Act 1 / Forest map template or generator config:

```txt
act1_forest
```

Minimum map shape:

```txt
Layer 0: combat choices
Layer 1: combat / event choices
Layer 2: rest placeholder
Layer 3: elite placeholder
Layer 4: boss placeholder
```

Requirements:

1. At least one branch should exist before the boss.
2. The graph must be acyclic and layered.
3. Every non-final node should have at least one next node.
4. Every non-first-layer node should have at least one previous node.
5. Boss node should be reachable.
6. Initial available nodes should be first-layer nodes.

Event/rest nodes are structural placeholders in this ticket. Do not implement narrative events or healing/upgrades yet.

## Registry Requirements

Update `GameContentRegistry` and `starterRegistry` to include:

```ts
encounters
runMapTemplates // or equivalent map config collection
```

Update validation in `src/game-core/systems/validation.ts` to check:

1. Duplicate encounter IDs.
2. Encounter monster IDs exist.
3. Encounter type is known.
4. Run map template IDs are unique.
5. Map nodes have unique IDs.
6. Node connections point to existing nodes.
7. Node graph is acyclic by layer.
8. Combat/elite/boss nodes reference valid encounters.
9. Event/rest nodes do not require encounters unless intentionally configured.
10. Boss node exists in the starter map template.

Keep validation deterministic and non-throwing.

## Run Creation Requirements

Create a function like:

```ts
createRun(input: CreateRunInput): GameActionResult<RunState>
```

Suggested input:

```ts
export type CreateRunInput = {
  readonly seed: string | number;
  readonly playerClassId: PlayerClassId;
  readonly activePetInstanceIds: readonly PetInstanceId[];
  readonly petInstances: readonly PetInstance[];
  readonly registry: GameContentRegistry;
  readonly runTemplateId?: RunTemplateId;
};
```

Behavior:

1. Validate player class exists.
2. Validate all active pet instance IDs are provided.
3. Validate all active pet definitions exist.
4. Validate active pet count is `<= maxActivePets` for the selected player class.
5. Initialize deck from `PlayerClassDefinition.startingDeckCardIds`.
6. Generate a deterministic run map from seed and template.
7. Mark first-layer nodes as `available`; all others `locked`.
8. Set run status to `"map_select"`.
9. Emit `RunCreated`, `RunMapGenerated`, and `RunNodeAvailable` events.

Rejected normal creation should return `ok: false`, `ActionRejected`, and a placeholder/original state if needed. Do not throw for missing player/pet/template data.

## Map Generation Requirements

Create a deterministic generator in:

```txt
src/game-core/systems/run-map.ts
```

Suggested function:

```ts
generateRunMap(input): GameActionResult<RunMapState>
```

Requirements:

1. Same seed + same template = same map.
2. Different seed should be able to change encounter assignment and/or route connections.
3. Map node IDs should be deterministic.
4. Map generation should not mutate registry/template data.
5. Use `createRng`; do not use `Math.random()`.
6. Generated map should validate with registry validation.

Keep it simple. A deterministic template with seeded encounter assignment is fine.

## Node Selection Requirements

Create:

```ts
selectRunNode(run, nodeId): GameActionResult<RunState>
```

Behavior:

1. Requires run status `"map_select"`.
2. Node must exist.
3. Node must be `available`.
4. Selected node becomes `active`.
5. All other available nodes in the same selection layer may remain available or become locked; choose one behavior and test it.
6. Set `run.status` based on node type:
   - combat / elite / boss => `"combat"`
   - rest / event => may remain `"map_select"` after structural completion, or use a helper to complete the node immediately
7. Emit `RunNodeSelected`.

Recommended behavior for this ticket:

```txt
Selecting a combat/elite/boss node sets status to "combat".
Selecting event/rest placeholders can be completed with completeRunNonCombatNode.
```

## Combat Start Requirements

Create:

```ts
startCombatForRunNode(input): GameActionResult<CombatState>
```

Suggested input:

```ts
export type StartCombatForRunNodeInput = {
  readonly run: RunState;
  readonly registry: GameContentRegistry;
  readonly petInstances: readonly PetInstance[];
  readonly seed?: string | number;
};
```

Behavior:

1. Requires run status `"combat"`.
2. Requires exactly one active combat/elite/boss node.
3. Resolves the node's encounter.
4. Uses encounter monster IDs to call existing `createCombat`.
5. Emits or includes `RunCombatStarted` in the returned events along with combat creation events.
6. Does not mutate run.

Do not implement UI playback.

## Combat Completion Requirements

Create:

```ts
completeRunCombatNode(input): GameActionResult<RunState>
```

Suggested input:

```ts
export type CompleteRunCombatNodeInput = {
  readonly run: RunState;
  readonly combat: CombatState;
  readonly registry: GameContentRegistry;
  readonly petInstances: readonly PetInstance[];
  readonly rewardSeed?: string | number;
};
```

Behavior:

1. Requires run status `"combat"`.
2. Requires an active combat/elite/boss node.
3. Requires combat phase `"won"` or `"lost"`.
4. If combat is `"lost"`:
   - set run status `"lost"`
   - emit `RunCombatCompleted` and `RunEnded` with outcome `"lost"`
   - do not generate reward
5. If combat is `"won"` on a non-boss combat/elite node:
   - call existing `generateCombatRewardOffer`
   - store it as `run.pendingRewardOffer`
   - set run status `"reward"`
   - emit `RunCombatCompleted` and `RunRewardPending`
6. If combat is `"won"` on a boss/final node:
   - either generate a reward and require claim/skip before run completion, or complete the run immediately
   - choose one behavior and test it

Recommended behavior:

```txt
Boss win completes the run immediately for this ticket. Boss reward is a later feature.
```

No reward selection UI.

## Reward Settlement Requirements

Create wrappers that connect reward claiming/skipping to map advancement:

```ts
claimRunPendingReward(input): GameActionResult<RunRewardClaimState>
skipRunPendingReward(input): GameActionResult<RunRewardClaimState>
```

Suggested result shape:

```ts
export type RunRewardClaimState = {
  readonly run: RunState;
  readonly petInstances: readonly PetInstance[];
};
```

Behavior for claiming:

1. Requires run status `"reward"`.
2. Requires `run.pendingRewardOffer` exists and is `open`.
3. Calls existing `claimReward`.
4. Updates `run.deckCardIds` or returned `petInstances` via existing reward claim result.
5. Clears `run.pendingRewardOffer`.
6. Marks active node `completed`.
7. Unlocks connected next nodes as `available`.
8. Sets run status to `"map_select"`, unless no next node exists, then `"completed"`.
9. Emits existing reward events plus `RunNodeCompleted`, `RunAdvanced`, and maybe `RunEnded`.

Behavior for skipping:

1. Requires run status `"reward"`.
2. Requires `run.pendingRewardOffer` exists and is `open`.
3. Calls existing `skipReward`.
4. Clears `run.pendingRewardOffer`.
5. Marks active node `completed`.
6. Unlocks connected next nodes as `available`.
7. Emits existing skip event plus run advancement events.

Rejected actions must not mutate input state.

## Non-Combat Node Completion

Create a minimal helper:

```ts
completeRunNonCombatNode(run): GameActionResult<RunState>
```

Behavior:

1. Requires active node type `"event"` or `"rest"`.
2. Marks node completed.
3. Unlocks connected next nodes.
4. Emits `RunNodeCompleted` and `RunAdvanced`.
5. Does not heal, upgrade, show story, or modify deck yet.

This is purely structural so the map can progress through placeholder nodes.

## Mutation Safety

All run lifecycle functions should avoid mutating inputs.

Rejected normal actions must return:

```ts
ok: false
state: originalState
 events: [{ type: "ActionRejected", ... }]
errors: [...]
```

Where the result needs to return both run and pet instances, use a wrapper state object and keep original references on rejection.

Do not mutate:

- registry
- map templates
- input run
- input pet instances
- input reward offer
- input combat state

No Immer or other dependency.

## Multi-Pet Requirements

Tests must prove:

1. `createRun` accepts `activePetInstanceIds` arrays.
2. Novice Tamer rejects too many active pets through data (`maxActivePets`), not hardcoded engine assumptions.
3. A test-only player class with `maxActivePets: 2` can create a run with two active pets.
4. The run lifecycle keeps both active pet IDs.
5. Reward wrappers preserve updated `petInstances` arrays.

Do not add a real second production player class yet unless needed. Test-only registry extension is fine.

## CI Requirement

Add a lightweight GitHub Actions workflow if the repo does not already have one:

```txt
.github/workflows/ci.yml
```

Minimum jobs:

```yaml
npm ci
npm run typecheck
npm test
npm audit --audit-level=moderate
```

Rules:

- No deployment.
- No secrets.
- No browser UI tests yet.
- Use current Node LTS if reasonable.
- Keep it simple.

If adding CI becomes blocked by repository constraints, document why in the completion report. Do not let CI work distract from the run-map core.

## Tests Required

Use Vitest.

### `run-map-generate.test.ts`

Test:

1. Same seed produces same map.
2. Different seed can change encounter assignment and/or connections.
3. Node IDs are unique.
4. Initial available nodes are first-layer nodes.
5. Graph is acyclic by layer.
6. Boss node exists and is reachable.
7. All non-final nodes have next nodes.
8. All non-first-layer nodes have previous nodes.
9. Generated map events are serializable.
10. Map generation does not mutate template data.

### `run-node-selection.test.ts`

Test:

1. Selecting an available combat node succeeds.
2. Selected combat node becomes active.
3. Run status becomes `"combat"`.
4. Selecting a locked node rejects and does not mutate run.
5. Selecting a missing node rejects.
6. Selecting a node when run is not in `"map_select"` rejects.
7. `RunNodeSelected` is emitted.
8. Event/rest placeholder node can be structurally completed.

### `run-combat-flow.test.ts`

Test:

1. `startCombatForRunNode` starts combat for the active encounter.
2. The combat uses the selected encounter monster IDs.
3. `RunCombatStarted` is emitted before or alongside combat events; chosen order is tested.
4. Completing lost combat marks run `"lost"` and emits `RunEnded`.
5. Completing won non-boss combat creates `pendingRewardOffer` and status `"reward"`.
6. Completing won boss combat completes the run if boss-immediate-complete behavior is chosen.
7. Cannot complete combat unless combat phase is `"won"` or `"lost"`.
8. Cannot start combat when no active combat node exists.

### `run-reward-flow.test.ts`

Test:

1. Claiming pending card reward updates `RunState.deckCardIds`.
2. Claiming pending pet upgrade updates the matching `PetInstance.unlockedUpgradeIds`.
3. Skipping pending reward leaves deck/pets unchanged.
4. Claiming or skipping reward clears `run.pendingRewardOffer`.
5. Claiming or skipping completes active node.
6. Claiming or skipping unlocks next connected nodes.
7. Cannot select next node while reward is pending.
8. Rejected claim/skip does not mutate run or pet instances.

### `run-validation.test.ts`

Test:

1. Starter registry validates with encounters and map templates.
2. Duplicate encounter IDs are reported.
3. Encounter with missing monster ID is reported.
4. Combat node with missing encounter ID is reported.
5. Connection to missing node is reported.
6. Backward/same-layer connection is reported.
7. Missing boss node is reported.
8. `createRun` rejects missing player class.
9. `createRun` rejects missing active pet instance.
10. `createRun` rejects too many active pets for Novice Tamer.
11. Test-only two-pet player class can create a two-pet run.

### `run-integration.test.ts`

Test a full core-only path:

1. Create run.
2. Select a combat node.
3. Start combat.
4. Use a fixture or adjusted combat state to mark combat won.
5. Complete combat to pending reward.
6. Claim or skip reward.
7. Confirm next nodes become available.
8. Select next node.

Keep this deterministic and small.

## Existing Tests

All existing tests must keep passing, including:

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
pet-modifier-burning-fang
pet-modifier-warm-bond
pet-modifier-ash-instinct
pet-modifier-multi-pet
pet-modifier-integration
localhost-smoke
```

Update fixture expectations only where RunState gained required new fields.

## Error Handling

Do not throw for normal gameplay errors.

Return `ok: false` for:

- missing player class
- missing active pet instance
- missing pet definition
- too many active pets for player class
- missing map template
- invalid node selection
- attempting to select while reward is pending
- missing encounter
- missing encounter monster IDs
- starting combat outside a combat node
- completing combat with non-ended combat phase
- claiming reward when no pending reward exists
- skipping reward when no pending reward exists

## Documentation

Create:

```txt
docs/contracts/6-run-map-encounter-graph.md
docs/contracts/6-run-map-encounter-graph-contract.md
docs/plans/YYYY-MM-DD-007-run-map-encounter-graph-plan.md
```

Copy this contract into both contract files if that is the current repo convention.

The plan should briefly include:

- files to add/update
- data model approach
- test plan
- non-goals
- architecture risks
- event-order risks
- run/reward transition risks
- multi-pet risks

## Commands to Run

Run:

```bash
npm run typecheck
npm test
npm run smoke:localhost
npm audit --audit-level=moderate
npm run zip:review
```

If CI is added, also ensure the workflow YAML is syntactically reasonable. It does not need to run remotely before push if GitHub Actions is not yet available in the local environment.

Do not add production dependencies.

## Validation Output Required

When complete, report:

1. Changed file tree.
2. Commands run and results.
3. Confirmation that no Phaser dependency was added.
4. Confirmation that `src/game-core` contains no Phaser imports.
5. Confirmation that no direct `Math.random()` was added in `src/game-core`.
6. Confirmation that deterministic run map generation works for same seed.
7. Confirmation that initial available nodes are first-layer nodes.
8. Confirmation that selected combat nodes can start combat from encounter data.
9. Confirmation that won combat creates pending reward.
10. Confirmation that reward claim/skip completes the node and advances the map.
11. Confirmation that lost combat marks the run lost.
12. Confirmation that multi-pet run creation remains model-supported and player-class-limited through data.
13. Confirmation that no UI, save/load, story progression, rest effects, or boss mechanics were implemented.
14. Confirmation that all tests pass.
15. Final pushed commit SHA.
16. Review zip path if generated.
17. CI workflow status: created / already existed / intentionally skipped with reason.

## Final Reminder

Do not let this ticket become a full roguelike campaign system.

Implement the smallest robust run lifecycle that supports:

- deterministic map generation
- node selection
- encounter-backed combat start
- combat won/lost completion
- pending reward settlement
- map advancement
- future Phaser map UI playback through events
