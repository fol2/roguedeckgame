# Engineering Contract v1.0 — Phaser Combat Scene and Event Playback

## Objective

Build the first playable Phaser combat presentation slice for the pet-centered roguelite deckbuilder.

Previous tickets created the deterministic `src/game-core` engine and the Vite + Phaser 4 app shell. This ticket should connect the browser presentation layer to a small core combat sandbox and render a minimal playable combat scene.

After this ticket, the app should support:

1. Booting into a Phaser combat scene from the browser app.
2. Creating a deterministic combat sandbox using `src/game-core` data and systems.
3. Rendering player, active pet, monsters, intents, energy, turn phase, hand cards, draw/discard counts, and event log.
4. Clicking a hand card to play it against a default target when needed.
5. Clicking an End Turn button to resolve the enemy turn and return to the next player turn if combat continues.
6. Consuming `GameEvent[]` through a central event playback component.
7. Keeping gameplay rules inside `src/game-core` and presentation/controller code inside `src/game-phaser`.

This ticket is intentionally still placeholder visual work. It is not final UI, not card dragging, and not polished animation.

Use these skills:

- `$game-architecture-guard`
- `$phaser-presentation-builder`
- `$combat-engine-test-writer`
- `$content-author` only if a tiny test-only combat setup needs data wiring

## Current Baseline

Latest pushed HEAD before this ticket:

```txt
f27067e73850eb6dcaf095a451311c98ae6bed75
```

Current repo already includes:

- Vite + TypeScript app shell
- Phaser 4.1.0 production dependency
- `src/app/create-game.ts`
- `BootScene`
- `CoreSmokeScene`
- layout constants
- static architecture tests
- deterministic game-core combat, run, reward, pet upgrade, story, and save systems
- CI with typecheck, tests, build, and audit

## Core Design Rule

Phaser is presentation only.

`src/game-core` must not import Phaser, `src/game-phaser`, `src/app`, browser globals, browser storage, or Node filesystem APIs.

Phaser-facing code may import `src/game-core`, but the scene itself should stay thin. Prefer a controller/adapter that owns combat sandbox state and calls core actions, while the scene renders view models and delegates user input.

Do not implement card, pet, monster, reward, run, save, or story rules inside Phaser scenes.

## Non-Goals

Do not implement final combat UI.
Do not implement drag-and-drop cards.
Do not implement manual target selection.
Do not implement map UI.
Do not implement reward UI.
Do not implement save/load UI.
Do not implement story/dialogue UI.
Do not implement asset loading or final art.
Do not implement sounds.
Do not implement particles or shaders.
Do not add React.
Do not add Redux, Zustand, Pixi, GSAP, Playwright, Electron, Tauri, or deployment packaging.
Do not implement boss mechanics.
Do not add production dependencies.
Do not move gameplay logic from `src/game-core` into Phaser code.

## Required File Changes

Create or update these files as appropriate:

```txt
src/app/create-game.ts

src/game-phaser/scenes/SceneKeys.ts
src/game-phaser/scenes/BootScene.ts
src/game-phaser/scenes/CombatScene.ts

src/game-phaser/controllers/CombatSandboxController.ts

src/game-phaser/presenters/CardPresenter.ts
src/game-phaser/presenters/CombatHudPresenter.ts
src/game-phaser/presenters/EventLogPresenter.ts
src/game-phaser/presenters/MonsterPresenter.ts
src/game-phaser/presenters/PetPresenter.ts
src/game-phaser/presenters/PlayerPresenter.ts

src/game-phaser/animation/CombatEventPlayer.ts

src/game-phaser/layout/combat-layout.ts
src/game-phaser/layout/hand-layout.ts
src/game-phaser/layout/pet-layout.ts
src/game-phaser/layout/game-size.ts

src/game-phaser/view-models/combat-view-model.ts

src/game-phaser/debug/core-smoke.ts // update only if useful

src/game-phaser/styles or existing src/app/styles.css // update only if necessary

tests/game-phaser/combat-controller.test.ts
tests/game-phaser/combat-scene-boundary.test.ts
tests/game-phaser/combat-view-model.test.ts
tests/game-phaser/combat-presenter-source.test.ts
tests/game-phaser/app-entry.test.ts
tests/game-phaser/phaser-boundary.test.ts

docs/contracts/9-phaser-combat-scene-event-playback-contract.md
docs/contracts/9-phaser-combat-scene-event-playback.md
docs/contracts/9-phaser-combat-scene-event-playback-completion-report.md
docs/plans/YYYY-MM-DD-010-phaser-combat-scene-event-playback-plan.md
```

Exact filenames may vary slightly, but keep this structure and separation.

## Scene Flow Requirements

Update the app so the browser boots into the new combat scene.

Recommended flow:

```txt
BootScene -> CombatScene
```

Keep `CoreSmokeScene` in the project if useful, but it should no longer be the main visual slice unless the implementation intentionally exposes it for debugging.

Update `SceneKeys` to include:

```ts
Boot
CoreSmoke
Combat
```

`BootScene` should stay tiny. It should not create combat state itself. It should transition to `CombatScene`.

## Combat Sandbox Controller Requirements

Create a pure controller in `src/game-phaser/controllers/CombatSandboxController.ts`.

This controller may import `src/game-core` and should be testable in Node without Phaser.

It should own a minimal deterministic combat sandbox state:

```ts
export type CombatSandboxState = {
  readonly run: RunState;
  readonly petInstances: readonly PetInstance[];
  readonly combat: CombatState;
  readonly lastEvents: readonly GameEvent[];
};
```

Suggested controller API:

```ts
export type CombatSandboxController = {
  readonly getState: () => CombatSandboxState;
  readonly getViewModel: () => CombatViewModel;
  readonly playCard: (cardInstanceId: CardInstanceId) => GameActionResult<CombatSandboxState>;
  readonly endTurn: () => GameActionResult<CombatSandboxState>;
  readonly reset: () => GameActionResult<CombatSandboxState>;
};

export const createCombatSandboxController = (seed?: string | number): CombatSandboxController;
```

Behavior:

1. Create a run with Novice Tamer and Ember Fox.
2. Select or synthesize a deterministic combat encounter using existing game-core APIs.
3. Start combat with opening hand visible.
4. Include a deterministic default seed.
5. Use existing game-core functions such as `createRun`, `selectRunNode`, `startCombatForRunNode`, `playCard`, `endPlayerTurn`, and `resolveEnemyTurn`.
6. Do not duplicate combat rules.
7. Keep all state immutable-ish: replace state from game-core results, do not mutate core state in place.

### Default Target Rule

This ticket does not implement target selection.

For cards requiring a target, the controller should choose the first alive monster as the default target.

For cards that do not require a target, it should call the core action without a target.

The controller may detect target need by inspecting card effects. Keep it simple and test it.

### End Turn Rule

`endTurn()` should:

1. Call core `endPlayerTurn`.
2. If successful, call core `resolveEnemyTurn`.
3. Return combined events in deterministic order.
4. Keep the state at `won` or `lost` if combat ends.

No monster UI decisions should live here beyond calling the core resolver.

## Combat View Model Requirements

Create `src/game-phaser/view-models/combat-view-model.ts`.

The view model should be serializable and Phaser-friendly.

Suggested shape:

```ts
export type CombatCardViewModel = {
  readonly cardInstanceId: CardInstanceId;
  readonly cardId: CardId;
  readonly name: string;
  readonly description: string;
  readonly cost: number;
  readonly tags: readonly string[];
  readonly playable: boolean;
};

export type CombatantViewModel = {
  readonly id: CombatantId;
  readonly name: string;
  readonly type: "player" | "monster";
  readonly hp: number;
  readonly maxHp: number;
  readonly block: number;
  readonly statuses: readonly { readonly statusId: StatusId; readonly stacks: number }[];
  readonly alive: boolean;
};

export type MonsterIntentViewModel = {
  readonly monsterId: CombatantId;
  readonly intentId: MonsterIntentId;
  readonly label: string;
  readonly description: string;
};

export type PetViewModel = {
  readonly petInstanceId: PetInstanceId;
  readonly name: string;
  readonly nickname: string;
  readonly mood: string;
  readonly activeModifierCount: number;
};

export type CombatViewModel = {
  readonly phase: CombatPhase;
  readonly turnNumber: number;
  readonly energy: number;
  readonly maxEnergy: number;
  readonly player: CombatantViewModel;
  readonly pets: readonly PetViewModel[];
  readonly monsters: readonly CombatantViewModel[];
  readonly monsterIntents: readonly MonsterIntentViewModel[];
  readonly hand: readonly CombatCardViewModel[];
  readonly drawPileCount: number;
  readonly discardPileCount: number;
  readonly eventMessages: readonly string[];
};
```

Requirements:

1. Build the view model from `CombatSandboxState` and `starterRegistry`.
2. Do not import Phaser in view-model files.
3. Do not mutate combat state.
4. Include enough labels for placeholder rendering.
5. Keep it serializable.
6. Add tests proving the view model can be created and JSON roundtripped.

## Phaser Presenter Requirements

Create small presenter classes or modules. They may import Phaser.

Minimum presenters:

```txt
PlayerPresenter
PetPresenter
MonsterPresenter
CardPresenter
CombatHudPresenter
EventLogPresenter
```

Each presenter should:

1. Own Phaser GameObjects for one visual area.
2. Expose `render(viewModel)` or `update(viewModel)`.
3. Use layout helpers instead of scattered magic numbers.
4. Use placeholder rectangles/text only.
5. Avoid gameplay rule decisions.
6. Avoid importing core action functions directly.

It is fine if presenters are simple and rebuild text each render for now, as long as the scene remains maintainable.

## Combat Layout Requirements

Create layout helpers in:

```txt
src/game-phaser/layout/combat-layout.ts
src/game-phaser/layout/hand-layout.ts
src/game-phaser/layout/pet-layout.ts
```

Requirements:

1. Use existing `GAME_WIDTH`, `GAME_HEIGHT`, `GAME_CENTER_X`, `GAME_CENTER_Y`.
2. Centralize card dimensions, hand gap, player position, pet slots, monster positions, intent label positions, button positions, event log positions.
3. Support future multiple pet slots even if only one active pet is displayed now.
4. Avoid hardcoded coordinates inside `CombatScene` except through layout constants/helpers.

## Combat Scene Requirements

Create `CombatScene`.

Responsibilities:

1. Instantiate the combat sandbox controller.
2. Instantiate presenters.
3. Render initial view model.
4. Handle pointer input for card clicks.
5. Handle pointer input for End Turn.
6. Delegate gameplay actions to the controller.
7. Pass returned `GameEvent[]` to `CombatEventPlayer`.
8. Re-render after event playback.
9. Disable card/end-turn input when combat phase is `won` or `lost`.
10. Display a simple combat outcome label when won/lost.

Do not implement drag-and-drop.
Do not implement target selection.
Do not implement reward generation UI after win.
Do not implement run-map navigation UI.

## Input Requirements

For this ticket:

- Clicking a playable card plays it.
- Targeted cards target the first alive monster.
- Untargeted cards work without target.
- Clicking End Turn resolves the full enemy turn.
- If an action is rejected, show the `ActionRejected` event in the event log.
- Input should be ignored while event playback is in progress.

No keyboard shortcuts required.
No mobile-specific gesture support required.

## Event Playback Requirements

Create `CombatEventPlayer` in `src/game-phaser/animation/CombatEventPlayer.ts`.

It should consume the core event log returned by controller actions.

Suggested API:

```ts
export class CombatEventPlayer {
  public constructor(scene: Phaser.Scene, eventLog: EventLogPresenter);
  public play(events: readonly GameEvent[]): Promise<void>;
}
```

Minimum behavior:

1. Convert events into human-readable messages.
2. Append them to `EventLogPresenter` in order.
3. Use small delays or Phaser time callbacks if practical.
4. Return a promise so the scene can lock input during playback.
5. Keep it deterministic and testable by extracting pure event-message formatting.

Create a pure helper if useful:

```ts
export const formatCombatEventMessage = (event: GameEvent): string;
```

Tests should cover this pure formatter.

Animation can be simple. Even instant event log playback is acceptable if the structure supports future tween/animation expansion.

## App Entry Requirements

`createGame` should register `CombatScene` in addition to existing scenes.

`index.html` should still include `#game-root` and `/src/app/main.ts`.

`npm run dev` should still serve the Vite app.

`npm run build` must pass.

## Architecture Boundary Requirements

Update static tests to enforce:

1. `src/game-core` has no Phaser imports.
2. `src/game-core` has no imports from `src/game-phaser` or `src/app`.
3. `src/game-core` has no browser globals or storage references.
4. Phaser scenes do not import core gameplay resolver functions directly.
5. Phaser scenes may import the combat sandbox controller and presenters.
6. The combat sandbox controller may import game-core resolver functions.
7. Presenters should not import gameplay resolver functions.
8. View-model files should not import Phaser.
9. `CombatEventPlayer` may import Phaser and game-core event types, but should not call gameplay resolvers.

Suggested forbidden scene identifiers:

```txt
playCard
resolveEnemyTurn
claimReward
applyPetStoryEvent
createCombat
generateCombatRewardOffer
completeRunCombatNode
startCombatForRunNode
createRun
selectRunNode
skipRunPendingReward
saveToSlot
loadFromSlot
restoreSaveSnapshot
```

The scene should use controller methods instead.

## Tests Required

Use Vitest. Prefer Node-safe tests and raw source inspection. Do not add Playwright in this ticket.

### `tests/game-phaser/combat-controller.test.ts`

Test:

1. `createCombatSandboxController` creates a player-turn combat state.
2. View model includes player, at least one pet, at least one monster, hand cards, energy, and monster intents.
3. Playing Strike or Fox Bite through the controller changes combat state and returns events.
4. `endTurn` returns enemy-turn/player-turn events and updates state.
5. Rejected actions are returned as `ok: false` and do not mutate previous state.
6. Controller does not import Phaser.
7. View model is JSON serializable.

### `tests/game-phaser/combat-view-model.test.ts`

Test:

1. View model maps core combat state to serializable card/combatant/pet/intent display data.
2. Hand card labels include names/costs.
3. Draw/discard counts are correct.
4. Monster intent labels are present.
5. Won/lost phase is represented.
6. No Phaser import in view-model files.

### `tests/game-phaser/combat-event-player.test.ts`

Test pure event formatting:

1. `CardPlayed` formats a useful message.
2. `DamageDealt` formats amount and block.
3. `StatusApplied` formats status stacks.
4. `PetCommanded` and `PetModifierActivated` format useful pet messages.
5. `MonsterIntentResolved` formats intent messages.
6. `CombatEnded` formats win/loss messages.
7. Unknown or less common events still return a safe fallback string.

If `CombatEventPlayer` itself is hard to instantiate in Node, test the formatter and source-scan the class.

### `tests/game-phaser/combat-scene-boundary.test.ts`

Test:

1. `CombatScene.ts` exists.
2. `CombatScene.ts` imports the combat sandbox controller.
3. `CombatScene.ts` imports presenters and `CombatEventPlayer`.
4. `CombatScene.ts` does not import direct game-core resolver functions.
5. `CombatScene.ts` does not contain obvious gameplay resolver identifiers.
6. Presenters do not import direct game-core resolver functions.
7. Layout helpers exist and are imported by scene/presenters.
8. Scene files avoid large clusters of magic coordinates.

### Existing Tests

All existing tests must keep passing:

```txt
game-core tests
game-phaser app-entry / boundary tests
localhost-smoke
```

Update existing `phaser-boundary.test.ts` only as needed to allow the new controller pattern while keeping scenes thin.

## Manual Browser Check

Run:

```bash
npm run dev -- --host 127.0.0.1
```

Then verify by curl at minimum:

```bash
curl -i http://127.0.0.1:5173/
curl -i http://127.0.0.1:5173/src/app/main.ts
```

If a manual browser is available, visually confirm:

- Phaser canvas appears.
- Combat scene renders placeholder player/pet/monster/hand/HUD.
- Clicking a card updates event log/state.
- End Turn updates event log/state.

Do not block the ticket on human visual inspection if environment is headless. Automated `npm run build` remains required.

## CI Requirements

CI should continue to run:

```yaml
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
docs/contracts/9-phaser-combat-scene-event-playback-contract.md
docs/contracts/9-phaser-combat-scene-event-playback.md
docs/contracts/9-phaser-combat-scene-event-playback-completion-report.md
docs/plans/YYYY-MM-DD-010-phaser-combat-scene-event-playback-plan.md
```

Copy this contract into both contract files if that remains the established repo pattern.

The plan should briefly include:

- files to add/update
- scene/controller/presenter split
- test plan
- non-goals
- architecture risks
- event playback risks
- Phaser build risks

## Commands to Run

Run:

```bash
npm run typecheck
npm test
npm run build
npm run smoke:localhost
npm audit --audit-level=moderate
git diff --check
git diff --no-index docs/contracts/9-phaser-combat-scene-event-playback-contract.md docs/contracts/9-phaser-combat-scene-event-playback.md
npm ls phaser vite --depth=0
npm ls --depth=0 --omit=dev
npm run zip:review
```

If `zip:review` requires clean `HEAD`, run it after commit from a clean worktree and report the path.

Also run a local Vite smoke if practical:

```bash
npm run dev -- --host 127.0.0.1
curl -i http://127.0.0.1:5173/
curl -i http://127.0.0.1:5173/src/app/main.ts
```

## Validation Output Required

When complete, report:

1. Changed file tree.
2. Commands run and results.
3. Confirmation that no new production dependency was added beyond existing Phaser.
4. Confirmation that no React / Redux / Zustand / Pixi / GSAP / Playwright dependency was added.
5. Confirmation that `src/game-core` contains no Phaser imports.
6. Confirmation that `src/game-core` contains no imports from `src/game-phaser` or `src/app`.
7. Confirmation that Phaser scenes do not call direct game-core resolver functions.
8. Confirmation that the combat sandbox controller is the only presentation bridge that calls game-core combat/run resolver functions.
9. Confirmation that the app boots into `CombatScene` or otherwise exposes it as the default playable scene.
10. Confirmation that the scene renders placeholder player/pet/monster/hand/HUD/event-log content.
11. Confirmation that clicking cards works through the controller with default first-alive-monster targeting.
12. Confirmation that End Turn resolves through the controller.
13. Confirmation that returned `GameEvent[]` flows through `CombatEventPlayer`.
14. Confirmation that no map UI, reward UI, save UI, story UI, drag-and-drop, target selection, asset loading, or final art was implemented.
15. Confirmation that `npm run build` passes.
16. Confirmation that all tests pass.
17. Final pushed commit SHA.
18. Review ZIP path if generated.

## Final Reminder

This ticket should make combat visible and lightly interactive, not polished.

The architecture matters more than visuals:

```txt
game-core = rules
controller = bridge
view-models = serializable presentation data
presenters = Phaser objects
CombatEventPlayer = event playback
CombatScene = orchestration and input
```

Do not let the scene become a pile of game logic.
