# Engineering Contract v1.1 — Reward / Map UI and Basic Phaser Run Flow

## Objective

Build the first browser-playable run flow in the Phaser presentation layer.

Previous tickets added:

- deterministic `src/game-core` combat
- monster turns and combat outcome
- reward generation and reward claiming/skipping
- pet upgrade modifier resolution
- run map / encounter graph / run lifecycle
- pet side-story progression and save snapshot core
- Vite + Phaser 4 shell
- placeholder Phaser combat scene with event playback

This ticket connects the existing Phaser combat sandbox to the core run lifecycle so the browser app can move through:

```txt
BootScene
→ MapScene
→ CombatScene
→ RewardScene
→ MapScene
```

This ticket is still placeholder UI. It is not final art, not final UX, and not a full game loop polish pass.

The goal is to prove that Phaser can drive the existing core run/reward/map systems without putting gameplay rules into Phaser scenes.

Use these skills:

- `$game-architecture-guard`
- `$phaser-presentation-builder`
- `$combat-engine-test-writer`
- `$content-author`

## Current Baseline

Latest pushed HEAD before this ticket:

```txt
cc9cb0635d9fe3ac07efcd208fb3f097eb1f7fa6
```

Current browser layer already includes:

- Vite + Phaser 4 scaffold
- `BootScene`
- `CombatScene`
- `CombatSandboxController`
- placeholder presenters for player / pet / monster / cards / HUD / event log
- `CombatEventPlayer`
- serializable combat view models
- boundary tests keeping `src/game-core` clean

Current game-core already includes:

- `createRun`
- `selectRunNode`
- `startCombatForRunNode`
- `completeRunCombatNode`
- `claimRunPendingReward`
- `skipRunPendingReward`
- `completeRunNonCombatNode`
- reward offer generation and claim/skip
- run map state and node status
- save snapshot core

## Core Design Goal

Phaser owns presentation and input. `src/game-core` owns rules.

This ticket should introduce a presentation-level run controller that owns a playable in-memory sandbox session and delegates all gameplay decisions to `src/game-core` functions.

Phaser scenes must not implement card, reward, map, pet, monster, story, save, or run rules directly.

## Non-Goals

Do not implement final art.
Do not implement drag-and-drop targeting.
Do not implement detailed card animations.
Do not implement final map visuals.
Do not implement full save/load UI.
Do not implement story/dialogue UI.
Do not implement rest-site effects.
Do not implement card upgrade UI.
Do not implement relics.
Do not implement boss-specific mechanics.
Do not implement audio.
Do not add React.
Do not add Redux, Zustand, Pixi, GSAP, Playwright, Electron, Tauri, or deployment packaging.
Do not add production dependencies.
Do not import Phaser from `src/game-core`.
Do not move game-core logic into Phaser scenes.
Do not use browser storage in this ticket.

## Required File Changes

Create or update these files as appropriate:

```txt
src/app/create-game.ts

src/game-phaser/controllers/RunSandboxController.ts
src/game-phaser/controllers/CombatSandboxController.ts

src/game-phaser/scenes/BootScene.ts
src/game-phaser/scenes/MapScene.ts
src/game-phaser/scenes/CombatScene.ts
src/game-phaser/scenes/RewardScene.ts
src/game-phaser/scenes/SceneKeys.ts

src/game-phaser/view-models/run-view-model.ts
src/game-phaser/view-models/reward-view-model.ts
src/game-phaser/view-models/combat-view-model.ts

src/game-phaser/presenters/MapNodePresenter.ts
src/game-phaser/presenters/RewardOptionPresenter.ts
src/game-phaser/presenters/RunHudPresenter.ts

src/game-phaser/layout/map-layout.ts
src/game-phaser/layout/reward-layout.ts
src/game-phaser/layout/run-layout.ts

src/game-phaser/animation/run-event-messages.ts

src/game-phaser/debug/core-smoke.ts

tests/game-phaser/run-controller.test.ts
tests/game-phaser/run-view-model.test.ts
tests/game-phaser/reward-view-model.test.ts
tests/game-phaser/map-scene-boundary.test.ts
tests/game-phaser/reward-scene-boundary.test.ts
tests/game-phaser/combat-scene-boundary.test.ts
tests/game-phaser/phaser-boundary.test.ts
tests/game-phaser/app-entry.test.ts

docs/contracts/10-reward-map-ui-basic-run-flow-contract.md
docs/contracts/10-reward-map-ui-basic-run-flow.md
docs/contracts/10-reward-map-ui-basic-run-flow-completion-report.md
docs/plans/YYYY-MM-DD-011-reward-map-ui-basic-run-flow-plan.md
```

Exact names may vary slightly, but preserve the architecture and intent.

Keep all existing tests passing.

## App Flow Requirements

Update the Phaser app flow so the default browser route is:

```txt
BootScene -> MapScene
```

`CoreSmokeScene` may remain available for debugging, but it should not be the default app scene.

Required scene keys:

```ts
Boot
Map
Combat
Reward
CoreSmoke // optional debug scene, existing
```

`createGame` must register `BootScene`, `MapScene`, `CombatScene`, `RewardScene`, and any retained debug scene.

## RunSandboxController Requirements

Create `src/game-phaser/controllers/RunSandboxController.ts`.

This should be the single presentation-facing controller for run flow.

Suggested interface:

```ts
export type RunSandboxController = {
  readonly getState: () => RunSandboxState;
  readonly getRunViewModel: () => RunViewModel;
  readonly getCombatViewModel: () => CombatViewModel | undefined;
  readonly getRewardViewModel: () => RewardViewModel | undefined;

  readonly selectMapNode: (nodeId: RunNodeId) => GameActionResult<RunSandboxState>;
  readonly playHandCard: (cardInstanceId: CardInstanceId) => GameActionResult<RunSandboxState>;
  readonly endTurn: () => GameActionResult<RunSandboxState>;
  readonly completeCombatIfEnded: () => GameActionResult<RunSandboxState>;
  readonly claimRewardOption: (rewardOptionId: RewardOptionId) => GameActionResult<RunSandboxState>;
  readonly skipReward: () => GameActionResult<RunSandboxState>;
  readonly completeNonCombatNode: () => GameActionResult<RunSandboxState>;
  readonly reset: () => GameActionResult<RunSandboxState>;
};
```

Suggested state:

```ts
export type RunSandboxState = {
  readonly run: RunState;
  readonly petInstances: readonly PetInstance[];
  readonly combat?: CombatState;
  readonly lastEvents: readonly GameEvent[];
};
```

The exact shape can differ, but it must support:

- map rendering
- combat rendering
- reward rendering
- state transitions
- event log/debug output
- future save/load wiring

Requirements:

1. Controller creates a deterministic Novice Tamer + Ember Fox run.
2. Controller delegates node selection to `selectRunNode`.
3. Controller delegates combat start to `startCombatForRunNode`.
4. Controller delegates combat actions to `playCard`, `endPlayerTurn`, and `resolveEnemyTurn` through existing combat helpers or the existing combat controller logic.
5. Controller delegates combat completion to `completeRunCombatNode`.
6. Controller delegates reward claim/skip to `claimRunPendingReward` / `skipRunPendingReward`.
7. Controller delegates event/rest placeholder completion to `completeRunNonCombatNode`.
8. Controller stores and returns `GameEvent[]` from core actions.
9. Controller does not mutate input state directly.
10. Controller is the only Phaser-facing place that calls game-core run/combat/reward lifecycle resolver functions.

`CombatSandboxController` can either be:

- refactored to use `RunSandboxController`, or
- retained for old tests while `CombatScene` moves to `RunSandboxController`.

Prefer avoiding two competing controllers for active app flow.

## Scene-to-Scene Flow Requirements

### MapScene

Create `MapScene`.

Responsibilities:

1. Render the run map from `RunViewModel`.
2. Show available / locked / active / completed nodes.
3. Allow clicking available nodes.
4. On combat / elite / boss node selection:
   - call controller `selectMapNode`
   - call controller/start-combat flow
   - transition to `CombatScene`
5. On event/rest placeholder node selection:
   - select node
   - complete it structurally through controller
   - re-render map
6. Display minimal run HUD: run status, seed, deck count, active pet count.
7. Use placeholder circles/rectangles/text only.
8. Use layout helpers, not scattered coordinates.

### CombatScene

Update `CombatScene` to operate inside run flow.

Responsibilities:

1. Render current combat from shared `RunSandboxController` state.
2. Play cards through controller.
3. End turn through controller.
4. Use `CombatEventPlayer` to display returned events.
5. When combat reaches `won` or `lost`:
   - call controller `completeCombatIfEnded`
   - if run status becomes `reward`, transition to `RewardScene`
   - if run status becomes `lost` or `completed`, show outcome and allow reset or return to map as appropriate
6. Do not generate rewards directly in the scene.
7. Do not call `completeRunCombatNode` directly from the scene.

For this ticket, an explicit button such as `Continue` after combat ended is acceptable if automatic transition is too jumpy. The behavior must be deterministic and tested at controller level.

### RewardScene

Create `RewardScene`.

Responsibilities:

1. Render `RewardViewModel` for `run.pendingRewardOffer`.
2. Show card reward options and pet upgrade reward options as placeholder panels.
3. Allow clicking one reward option.
4. Allow skipping reward.
5. Claim/skip through controller only.
6. After claim/skip, transition back to `MapScene` unless the run is completed/lost.
7. Do not implement final reward art.
8. Do not implement card preview popups.
9. Do not resolve pet upgrade modifiers here. That already belongs to game-core and later combat creation.

## Shared Controller / Scene State Requirement

Scenes need access to the same run sandbox state.

Use one of these patterns:

1. A small app-level singleton sandbox controller in `src/game-phaser/controllers/run-sandbox-singleton.ts`, or
2. Phaser registry storage, or
3. Scene data injection.

Preferred for this ticket:

```txt
A tiny singleton factory that owns one RunSandboxController instance for the browser sandbox.
```

Rules:

- Keep it in `src/game-phaser`, not `src/game-core`.
- It may be reset for tests or scene reset button.
- It must not use browser storage.
- It must not be used by `src/game-core`.

## View Model Requirements

Create pure, Phaser-free view model builders.

### RunViewModel

Suggested shape:

```ts
export type RunNodeViewModel = {
  readonly id: RunNodeId;
  readonly type: RunNodeType;
  readonly layer: number;
  readonly status: RunNodeStatus;
  readonly label: string;
  readonly nextNodeIds: readonly RunNodeId[];
};

export type RunViewModel = {
  readonly runId: RunId;
  readonly status: RunStatus;
  readonly seed: string | number;
  readonly deckCount: number;
  readonly activePetCount: number;
  readonly nodes: readonly RunNodeViewModel[];
  readonly currentNodeId?: RunNodeId;
  readonly eventMessages: readonly string[];
};
```

### RewardViewModel

Suggested shape:

```ts
export type RewardOptionViewModel = {
  readonly id: RewardOptionId;
  readonly type: "card" | "petUpgrade";
  readonly title: string;
  readonly description: string;
  readonly subtitle: string;
};

export type RewardViewModel = {
  readonly rewardOfferId: RewardOfferId;
  readonly status: RewardOfferStatus;
  readonly options: readonly RewardOptionViewModel[];
  readonly eventMessages: readonly string[];
};
```

Requirements:

1. View models must be serializable.
2. View model builders must not import Phaser.
3. View model builders may import game-core types/data.
4. Missing definitions should produce fallback labels, not throw.
5. Tests must verify serializability.

## Presenter Requirements

Create simple placeholder presenters:

```txt
MapNodePresenter
RewardOptionPresenter
RunHudPresenter
```

Rules:

1. Presenters own Phaser GameObjects.
2. Presenters receive view models and callbacks.
3. Presenters should not call game-core resolver functions.
4. Presenters should not import `src/game-core` except for type-only imports if absolutely needed. Prefer view-model types from `src/game-phaser/view-models`.
5. Presenters should use layout constants.
6. Presenters should clear/update their own objects between renders.

## Layout Requirements

Create:

```txt
src/game-phaser/layout/map-layout.ts
src/game-phaser/layout/reward-layout.ts
src/game-phaser/layout/run-layout.ts
```

Requirements:

1. Centralize map node positions by layer.
2. Centralize reward option panel positions.
3. Centralize run HUD locations.
4. Avoid hardcoded large coordinate literals in scene/presenter files.
5. Keep the math simple.

## Event Playback Requirements

`CombatEventPlayer` may remain combat-focused for now.

Add simple run/reward event message formatting in:

```txt
src/game-phaser/animation/run-event-messages.ts
```

It should format run/reward events such as:

```txt
RunNodeSelected
RunCombatStarted
RunCombatCompleted
RunRewardPending
RewardOffered
RewardSelected
RewardSkipped
CardRewardAdded
PetUpgradeUnlocked
RunNodeCompleted
RunAdvanced
RunEnded
ActionRejected
```

For this ticket, displaying them in an event log is enough.

Do not build complex timeline animation yet.

## Architecture Boundary Requirements

Update static boundary tests to enforce:

1. `src/game-core` imports no Phaser.
2. `src/game-core` imports nothing from `src/game-phaser` or `src/app`.
3. Phaser scenes do not call direct game-core resolver functions.
4. `RunSandboxController` is the only `src/game-phaser` file allowed to call run/combat/reward lifecycle resolver functions directly.
5. View-model files do not import Phaser.
6. Presenters do not import game-core resolver functions.
7. Scenes do not contain gameplay resolver keywords such as `playCard`, `resolveEnemyTurn`, `claimRunPendingReward`, `selectRunNode`, `completeRunCombatNode`, etc.
8. MapScene / RewardScene use layout constants.

It is acceptable for controllers to import game-core functions. That is their job.

## Tests Required

Use Vitest. Prefer raw source / controller / view-model tests. Do not require an actual browser.

### `tests/game-phaser/run-controller.test.ts`

Test:

1. Controller initial state starts at map selection.
2. Selecting an available combat node starts combat and returns events.
3. Selecting locked/missing nodes rejects and preserves useful event messages.
4. Playing a card delegates through controller and updates combat state.
5. End turn delegates through controller and updates combat state.
6. Completing a won non-boss combat creates pending reward and run status `reward`.
7. Claiming a reward clears pending reward and returns to map selection.
8. Skipping a reward clears pending reward and returns to map selection.
9. Event/rest placeholder completion advances the map.
10. Reset returns to deterministic initial map selection.
11. State/view models remain serializable.

### `tests/game-phaser/run-view-model.test.ts`

Test:

1. Builds serializable run view model.
2. Shows node status correctly.
3. Shows deck count and active pet count.
4. Includes current node when active.
5. Handles missing map gracefully.
6. Formats run event messages deterministically.

### `tests/game-phaser/reward-view-model.test.ts`

Test:

1. Builds serializable reward view model for card options.
2. Builds serializable reward view model for pet upgrade options.
3. Uses card names/descriptions for card rewards.
4. Uses pet upgrade names/descriptions for upgrade rewards.
5. Handles missing card/upgrade definitions with fallback labels.
6. Formats reward events deterministically.

### `tests/game-phaser/map-scene-boundary.test.ts`

Test:

1. MapScene exists.
2. MapScene imports controller/view-model/presenter/layout only.
3. MapScene does not import direct game-core resolver functions.
4. MapScene does not contain direct resolver identifiers.
5. MapScene uses map/run layout helpers.

### `tests/game-phaser/reward-scene-boundary.test.ts`

Test:

1. RewardScene exists.
2. RewardScene imports controller/view-model/presenter/layout only.
3. RewardScene does not import direct game-core resolver functions.
4. RewardScene does not contain direct resolver identifiers.
5. RewardScene uses reward/run layout helpers.

### Existing Tests

All existing tests must keep passing:

```txt
game-core tests
existing game-phaser app-entry / boundary tests
combat controller / event player / view model tests
localhost-smoke
```

If existing tests assume `BootScene -> CombatScene`, update them to `BootScene -> MapScene`.

## Manual / Local Browser Check

Run if possible:

```bash
npm run dev -- --host 127.0.0.1
```

Confirm via curl or simple local browser check:

1. Vite serves `/` with `#game-root`.
2. `/src/app/main.ts` is served.
3. Build still passes.

A visual browser check is useful but not required as a blocking gate unless the environment supports it easily.

## CI Requirements

Keep `.github/workflows/ci.yml` running:

```txt
npm ci
npm run typecheck
npm test
npm run build
npm audit --audit-level=moderate
```

Do not add deployment.
Do not add secrets.
Do not add browser automation yet.

## Documentation Requirements

Create:

```txt
docs/contracts/10-reward-map-ui-basic-run-flow-contract.md
docs/contracts/10-reward-map-ui-basic-run-flow.md
docs/contracts/10-reward-map-ui-basic-run-flow-completion-report.md
docs/plans/YYYY-MM-DD-011-reward-map-ui-basic-run-flow-plan.md
```

Copy this contract into both contract files if that remains the established repo pattern.

The plan should briefly include:

- files to add/update
- test plan
- non-goals
- architecture risks
- scene-state sharing risks
- run/reward transition risks
- event-log duplication risks

## Commands to Run

Run:

```bash
npm run typecheck
npm test
npm run build
npm run smoke:localhost
npm audit --audit-level=moderate
git diff --check
git diff --no-index docs/contracts/10-reward-map-ui-basic-run-flow-contract.md docs/contracts/10-reward-map-ui-basic-run-flow.md
npm run zip:review
```

If `zip:review` requires clean `HEAD`, run it after commit from a clean worktree and report the path.

Also report:

```bash
npm ls phaser vite --depth=0
npm ls --depth=0 --omit=dev
```

Expected production dependency remains only:

```txt
phaser
```

## Validation Output Required

When complete, report:

1. Changed file tree.
2. Commands run and results.
3. Confirmation that no new production dependency was added.
4. Confirmation that Phaser remains version 4.
5. Confirmation that no React / Redux / Zustand / Pixi / GSAP / Playwright / Electron / Tauri dependency was added.
6. Confirmation that `src/game-core` contains no Phaser imports.
7. Confirmation that `src/game-core` contains no imports from `src/game-phaser` or `src/app`.
8. Confirmation that app default flow is `BootScene -> MapScene`.
9. Confirmation that MapScene can select an available combat node through controller flow.
10. Confirmation that CombatScene still plays cards/end turn through controller flow.
11. Confirmation that won non-boss combat leads to RewardScene or reward-ready state.
12. Confirmation that RewardScene can claim and skip through controller flow.
13. Confirmation that claim/skip returns run to map selection and unlocks next nodes.
14. Confirmation that event/rest placeholder nodes can be completed structurally.
15. Confirmation that no final art, map UI polish, drag-and-drop, save UI, story UI, boss mechanics, or deployment packaging was implemented.
16. Confirmation that all tests pass.
17. Final pushed commit SHA.
18. Review ZIP path if generated.

## Final Reminder

This ticket should make the browser app feel like a tiny playable loop, but still with placeholder visuals.

Do not polish. Do not add systems. Connect the existing systems.

The next ticket will focus on first mini-boss / first boss / vertical-slice polish.
