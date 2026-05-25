# Engineering Contract v1.2 — First Mini-Boss / First Boss / Vertical-Slice Polish

## Objective

Complete the first browser-playable vertical slice for the pet-centered roguelite deckbuilder.

Previous tickets connected the core engine and the Phaser placeholder app flow:

```txt
BootScene -> MapScene -> CombatScene -> RewardScene -> MapScene
```

This ticket should turn that placeholder loop into a small but coherent first slice:

1. Add real Act 1 Forest elite and boss encounter content.
2. Ensure the run can progress from map start to boss completion/loss in browser flow.
3. Add lightweight Phaser polish and clearer feedback without adding final art.
4. Add reset/new-run flow for completed/lost runs.
5. Lock the vertical-slice behavior in tests.

This is the last ticket of the first vertical slice. Keep it focused. Do not start building a large content system, final art pipeline, advanced boss framework, or deployment package.

Use these skills:

- `$game-architecture-guard`
- `$phaser-presentation-builder`
- `$combat-engine-test-writer`
- `$content-author`

## Current Baseline

Latest pushed HEAD before this ticket:

```txt
46013f1d3cb90d490b11b608bb4a01d6ce0e2cfa
```

Current browser layer already includes:

- Vite + Phaser 4 shell
- `BootScene -> MapScene -> CombatScene -> RewardScene -> MapScene`
- `RunSandboxController` as the single Phaser-facing run/combat/reward lifecycle bridge
- `MapScene`, `CombatScene`, and `RewardScene`
- placeholder presenters for map, reward, player, pet, monster, hand, HUD, and event log
- controller and boundary tests

Current game-core already includes:

- deterministic combat loop
- monster intents
- Burn status
- win/loss combat outcome
- reward offer generation and claim/skip
- pet upgrade modifier resolution
- run map / encounter lifecycle
- pet side-story progression
- save snapshot core
- Act 1 Forest map and encounter placeholders

## Core Design Goal

The browser app should now feel like a tiny playable vertical slice:

```txt
Start run
Select map node
Fight normal monsters
Receive reward
Advance map
Resolve event/rest placeholders
Fight elite / mini-boss
Advance to boss
Win or lose run
Reset into a new deterministic run
```

The visuals can remain placeholder rectangles and text, but the flow should be understandable and testable.

## Non-Goals

Do not implement final art.
Do not implement asset generation.
Do not implement audio.
Do not implement drag-and-drop targeting.
Do not implement advanced animation timelines.
Do not implement save/load UI.
Do not implement story/dialogue UI.
Do not implement full rest-site effects.
Do not implement card upgrade UI.
Do not implement relics.
Do not implement meta-currency.
Do not implement multiple playable player classes.
Do not implement a generic boss scripting engine.
Do not implement deployment packaging.
Do not add React.
Do not add Redux, Zustand, Pixi, GSAP, Playwright, Electron, Tauri, or other UI/state/deployment libraries.
Do not add production dependencies.
Do not import Phaser from `src/game-core`.
Do not move game-core logic into Phaser scenes.
Do not use browser storage in this ticket.

## Required File Changes

Create or update files as appropriate:

```txt
src/game-core/data/monsters/forest-monsters.ts
src/game-core/data/encounters/forest-encounters.ts
src/game-core/data/run-maps/act1-forest.ts
src/game-core/data/cards/reward-cards.ts              # only if one or two small cards are needed
src/game-core/systems/validation.ts                   # only if content validation needs extension
src/game-core/testing/run-fixtures.ts                 # only if helpful

src/game-phaser/controllers/RunSandboxController.ts
src/game-phaser/scenes/MapScene.ts
src/game-phaser/scenes/CombatScene.ts
src/game-phaser/scenes/RewardScene.ts
src/game-phaser/view-models/run-view-model.ts
src/game-phaser/view-models/combat-view-model.ts
src/game-phaser/view-models/reward-view-model.ts
src/game-phaser/presenters/MapNodePresenter.ts
src/game-phaser/presenters/MonsterPresenter.ts
src/game-phaser/presenters/CombatHudPresenter.ts
src/game-phaser/presenters/RunHudPresenter.ts
src/game-phaser/presenters/RewardOptionPresenter.ts
src/game-phaser/animation/combat-event-messages.ts
src/game-phaser/animation/run-event-messages.ts
src/game-phaser/layout/combat-layout.ts
src/game-phaser/layout/map-layout.ts
src/game-phaser/layout/reward-layout.ts
src/game-phaser/layout/run-layout.ts

src/app/create-game.ts                                # only if scene registration changes

tests/game-core/vertical-slice-content.test.ts
tests/game-core/vertical-slice-run-flow.test.ts

tests/game-phaser/vertical-slice-controller.test.ts
tests/game-phaser/vertical-slice-view-model.test.ts
tests/game-phaser/map-scene-boundary.test.ts
tests/game-phaser/combat-scene-boundary.test.ts
tests/game-phaser/reward-scene-boundary.test.ts
tests/game-phaser/phaser-boundary.test.ts

docs/contracts/11-first-boss-vertical-slice-polish-contract.md
docs/contracts/11-first-boss-vertical-slice-polish.md
docs/contracts/11-first-boss-vertical-slice-polish-completion-report.md
docs/plans/YYYY-MM-DD-012-first-boss-vertical-slice-polish-plan.md
```

Exact names may vary slightly, but preserve the architecture and intent.

Keep all existing tests passing.

## Content Requirements

Replace placeholder-feeling Act 1 elite and boss content with small real data-driven content.

### New Elite / Mini-Boss

Add one Act 1 Forest elite / mini-boss monster.

Suggested identity:

```txt
Charred Stag
```

Suggested tags:

```txt
forest, elite, beast, burn
```

Suggested behavior using existing effect types only:

```txt
Intent 1: Antler Strike
- attack for 9

Intent 2: Ember Hooves
- attack for 5
- apply 1 Burn

Intent 3: Guarded Snort
- gain 6 block
```

Use current `MonsterDefinition` and `MonsterIntentDefinition` shapes. Do not add a new boss scripting engine.

### New Boss

Add one Act 1 Forest boss monster.

Suggested identity:

```txt
Forest Warden
```

Suggested tags:

```txt
forest, boss, guardian, burn
```

Suggested behavior using existing effect types only:

```txt
Intent 1: Root Slam
- attack for 10

Intent 2: Cinder Bark
- gain 8 block
- apply 1 Burn to player

Intent 3: Old Flame
- apply 2 Burn to player
```

For this ticket, boss mechanics can be data-only through existing intents. Do not add phases, summons, scripted thresholds, relic rewards, or boss-specific UI.

### Encounter Updates

Update forest encounters so:

```txt
forest_elite_placeholder -> uses Charred Stag and is clearly an elite encounter
forest_boss_placeholder -> uses Forest Warden and is clearly a boss encounter
```

You may rename encounter IDs only if all references and tests are updated. Prefer preserving existing IDs to avoid churn.

### Map / Reward Content

Act 1 Forest should still be short. Do not expand the map into a full game act.

If needed, add at most one or two small reward cards that help the vertical slice feel less repetitive. This is optional. Prefer using existing reward cards unless tests or playability show a clear need.

## Core Run Flow Requirements

Add core tests proving the first slice can be completed deterministically without Phaser.

Minimum flow:

1. Create a run.
2. Select a first combat node.
3. Start combat.
4. Force or play combat to `won`.
5. Complete combat into reward.
6. Claim or skip reward.
7. Advance through event/rest placeholders where needed.
8. Select elite node.
9. Start elite combat and verify it uses the elite encounter.
10. Complete elite combat.
11. Advance to boss node.
12. Start boss combat and verify it uses the boss encounter.
13. Complete boss combat as `won` and verify run status `completed`.
14. Also test a boss or normal combat loss path marks run `lost`.

Tests may force combat outcomes by constructing won/lost `CombatState` objects, as long as the lifecycle path itself is real.

## Phaser Run Controller Requirements

`RunSandboxController` should support a full placeholder run flow cleanly.

Add or improve controller helpers only if needed:

```ts
getRunViewModel()
getCombatViewModel()
getRewardViewModel()
selectMapNode(...)
playHandCard(...)
endTurn()
completeCombatIfEnded()
claimRewardOption(...)
skipReward()
completeNonCombatNode()
reset()
```

Additional optional helpers are acceptable if they remain presentation-facing and do not leak into `game-core`.

Requirements:

1. Controller remains the only Phaser-facing file with direct lifecycle resolver calls.
2. Controller can reset after run `completed` or `lost`.
3. Controller preserves event messages after rejected actions.
4. Controller can move from Map -> Combat -> Reward -> Map.
5. Controller can reach boss completion in tests.
6. Controller state and view models remain serializable.
7. No browser storage.

## MapScene Polish Requirements

Improve the placeholder map enough that a user can understand progression.

Requirements:

1. Show node type labels: combat, elite, rest, event, boss.
2. Show node status clearly: available, locked, active, completed.
3. Show at least simple connection lines or textual path hints.
4. Available nodes should be clickable.
5. Locked/completed nodes should not be clickable.
6. Event/rest placeholder nodes should complete structurally and re-render.
7. Boss node should be visually distinct through placeholder styling, not final art.
8. Add a visible reset/new-run control if run is completed or lost.
9. Use layout helpers; do not scatter large magic coordinates.

## CombatScene Polish Requirements

Improve the placeholder combat scene enough that the run flow is clear.

Requirements:

1. Show encounter context if available: normal / elite / boss label, or current node type.
2. Show monster intent descriptions clearly.
3. Show player HP/block/status.
4. Show active pet name/nickname and active modifier count.
5. Show card cost/name/short description.
6. Show draw/discard counts.
7. Show event log.
8. On combat `won`, provide a clear continue action that completes combat and routes to reward/map/completed state.
9. On combat `lost`, provide a clear reset/new-run action or route to map outcome state.
10. Continue action must call controller flow, not core resolver directly.
11. Do not implement drag targeting.
12. Do not add final animations or art.

## RewardScene Polish Requirements

Improve the placeholder reward scene enough that card/pet upgrade choices are understandable.

Requirements:

1. Show reward option type: card or pet upgrade.
2. Show card name, cost, and description for card rewards.
3. Show upgrade name and description for pet upgrades.
4. Show which pet instance an upgrade targets.
5. Show skip option.
6. After claim/skip, route back to map or completed/lost state.
7. Claim/skip must go through controller.
8. Do not implement card preview popups.
9. Do not implement final art.

## View Model Requirements

Keep view models pure and Phaser-free.

Update view models as needed so they include enough data for the vertical slice:

### RunViewModel

Should include:

- run ID
- run status
- seed
- deck count
- active pet count
- node ID/type/status/layer
- current node ID
- current node type, if active
- whether reset is available
- event messages

### CombatViewModel

Should include:

- combat phase
- current run node type or encounter label, if available
- player state
- pet state
- monster states
- monster intent labels/descriptions
- hand cards
- draw/discard count
- whether continue/reset controls are available
- event messages

### RewardViewModel

Should include:

- offer status
- option type
- card cost/name/description/tags for card rewards
- pet upgrade name/description/tags/target pet label for upgrade rewards
- whether skip is available
- event messages

Requirements:

1. View models must be serializable.
2. View models must not import Phaser.
3. Missing definitions should produce fallback labels, not throw.
4. Tests should lock key fields.

## Event Message Requirements

Improve event formatting just enough for the vertical slice.

Must format useful messages for:

```txt
RunCreated
RunNodeSelected
RunCombatStarted
RunCombatCompleted
RunRewardPending
RunNodeCompleted
RunAdvanced
RunEnded
RewardOffered
RewardSelected
RewardSkipped
CardRewardAdded
PetUpgradeUnlocked
CombatEnded
ActionRejected
MonsterIntentSet
MonsterIntentResolved
DamageDealt
BlockGained
StatusApplied
StatusTicked
PetModifierActivated
CardCostModified
```

No complex animation timeline yet. A readable event log is enough.

## Architecture Boundary Requirements

Update / preserve static tests enforcing:

1. `src/game-core` imports no Phaser.
2. `src/game-core` imports nothing from `src/game-phaser` or `src/app`.
3. `src/game-core` has no browser storage/global references.
4. Phaser scenes do not call direct game-core resolver functions.
5. `RunSandboxController` remains the only `src/game-phaser` file allowed to call run/combat/reward lifecycle resolvers directly.
6. View-model files do not import Phaser.
7. Presenters do not import game-core resolver functions.
8. Scenes use layout helpers.
9. New content remains data-driven; no card-name-specific combat logic is introduced.

## Tests Required

Use Vitest. Prefer controller, view-model, source-boundary, and core lifecycle tests. Do not require a real browser in Vitest.

### `tests/game-core/vertical-slice-content.test.ts`

Test:

1. Starter registry validates.
2. Charred Stag exists as an elite-tagged monster.
3. Forest Warden exists as a boss-tagged monster.
4. Elite encounter uses the elite monster.
5. Boss encounter uses the boss monster.
6. Boss encounter is structurally `type: "boss"`.
7. Act 1 Forest map includes a reachable boss node.
8. New monster intent effects use existing effect types only.

### `tests/game-core/vertical-slice-run-flow.test.ts`

Test:

1. A deterministic core run can reach a normal combat.
2. Won normal combat creates pending reward.
3. Claim/skip reward advances map.
4. Event/rest placeholders complete structurally.
5. Elite node can be selected and starts elite encounter.
6. Boss node can be selected and starts boss encounter.
7. Boss win completes the run.
8. Combat loss marks the run lost.
9. Same seed produces same vertical-slice path setup.

### `tests/game-phaser/vertical-slice-controller.test.ts`

Test:

1. Controller starts on map selection.
2. Controller can select a combat node and start combat.
3. Controller can complete won combat into reward.
4. Controller can claim reward and return to map.
5. Controller can complete event/rest nodes.
6. Controller can reach elite/boss-ready state through deterministic flow or helper-driven state.
7. Controller can reset after completed/lost run.
8. Controller view models remain serializable.
9. Rejected actions preserve event messages.

### `tests/game-phaser/vertical-slice-view-model.test.ts`

Test:

1. RunViewModel labels elite and boss nodes.
2. CombatViewModel exposes encounter/node context.
3. RewardViewModel exposes card cost/name/description.
4. RewardViewModel exposes upgrade target pet label.
5. Event message formatting covers key run/reward/combat events.
6. View models serialize to JSON cleanly.

### Boundary Tests

Update existing boundary tests if needed:

```txt
map-scene-boundary.test.ts
combat-scene-boundary.test.ts
reward-scene-boundary.test.ts
phaser-boundary.test.ts
```

They should continue to prove scenes do not import or call direct core resolvers.

### Existing Tests

All existing tests must keep passing:

```txt
game-core tests
game-phaser tests
localhost-smoke
```

## Local Browser / Vite Check

Run if possible:

```bash
npm run dev -- --host 127.0.0.1
```

Confirm by curl:

1. `/` serves `#game-root` and `/src/app/main.ts`.
2. `/src/app/main.ts` is served.
3. `/src/game-phaser/scenes/MapScene.ts` is served.
4. `/src/game-phaser/scenes/CombatScene.ts` is served.
5. `/src/game-phaser/scenes/RewardScene.ts` is served.

If an interactive browser is available, a quick visual/manual check is useful but not required as a blocking gate.

## CI Requirements

Keep `.github/workflows/ci.yml` running:

```txt
npm ci
npm run typecheck
npm test
npm run build
npm audit --audit-level=moderate
```

No deployment. No secrets. No browser automation yet.

## Documentation Requirements

Create:

```txt
docs/contracts/11-first-boss-vertical-slice-polish-contract.md
docs/contracts/11-first-boss-vertical-slice-polish.md
docs/contracts/11-first-boss-vertical-slice-polish-completion-report.md
docs/plans/YYYY-MM-DD-012-first-boss-vertical-slice-polish-plan.md
```

Copy this contract into both contract files if that remains the established repo pattern.

The plan should briefly include:

- files to add/update
- content plan
- test plan
- non-goals
- architecture risks
- controller-flow risks
- boss-content overbuild risks
- UI polish scope limits

## Commands to Run

Run:

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run smoke:localhost
npm audit --audit-level=moderate
git diff --check
git diff --no-index docs/contracts/11-first-boss-vertical-slice-polish-contract.md docs/contracts/11-first-boss-vertical-slice-polish.md
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
8. Confirmation that elite and boss content is data-driven.
9. Confirmation that the run can progress to boss completion in tests.
10. Confirmation that the browser flow still uses controller-mediated Map -> Combat -> Reward -> Map transitions.
11. Confirmation that reset/new-run is available after completed/lost run.
12. Confirmation that no final art, asset generation, audio, save UI, story UI, relics, meta-currency, deployment packaging, or generic boss scripting engine was implemented.
13. Confirmation that all tests pass.
14. Final pushed commit SHA.
15. Review ZIP path if generated.

## Final Reminder

This is a vertical-slice polish ticket, not a scope explosion ticket.

The correct output is a small, coherent, browser-playable slice with placeholder visuals and real data-backed elite/boss encounters.

Do not build a full game. Do not build final UI. Do not build a boss scripting engine.
