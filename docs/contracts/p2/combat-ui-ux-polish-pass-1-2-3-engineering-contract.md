# Combat UI/UX Polish Engineering Contracts v0.1

Scope: Combat UI/UX only  
Project: Pet-centered roguelite deckbuilder  
Current implementation baseline: TypeScript + Vite + Phaser 4, game-core/game-phaser split  
Primary intent: Convert the current combat UI from a functional prototype into a clear, refactored, asset-ready combat presentation layer.

This document is written as an agent-ready engineering contract. It should be pasted into Codex/engineering-agent tasks one pass at a time. Do not ask the agent to do all three passes in one PR unless the agent is explicitly set up for a large multi-stage implementation.

---

## Global Contract for All Three Passes

### Product Scope

Work on combat UI/UX only.

In scope:

- `src/game-phaser/scenes/CombatScene.ts`
- `src/game-phaser/presenters/*` related to combat
- `src/game-phaser/interaction/*` related to combat
- `src/game-phaser/animation/*` related to combat event playback
- `src/game-phaser/layout/*` related to combat, hand, pet, HUD, tooltip, and fixed-size stage
- `src/game-phaser/view-models/combat-view-model.ts`
- combat presentation/debug tests under `tests/game-phaser/*`
- docs/contracts or docs asset specs for combat only

Out of scope:

- reward UI redesign
- map UI redesign
- pet journal UI
- save/load UI
- new gameplay mechanics
- balancing changes
- new card content unless required only for a test fixture
- enemy card system implementation
- final art production
- new production dependencies
- browser storage changes

### Architectural Rules

Preserve the core architecture boundary.

- `src/game-core` must not import Phaser, browser APIs, `src/game-phaser`, or `src/app`.
- Phaser renders, animates, and handles input. It must not decide combat rules.
- Valid targets, playable state, intent data, status values, energy, piles, and combat outcome must come from game-core or combat view models.
- Phaser may submit requests to the existing controller and consume returned `GameEvent[]`.
- Do not duplicate damage, block, intent, status, reward, or pet-command resolution logic in Phaser.
- Do not introduce `Math.random()` into gameplay or presentation decision paths that need determinism.

### UI/UX Non-Negotiables

These must remain true across all passes.

- Combat uses side-view party-versus-enemies composition.
- Keeper avatar is visible on the battlefield but is not the main stat display.
- Player HP/block/status remain in the Player HUD.
- Ember Fox is visible as the active pet co-hero.
- Ember Fox has no Phase 1 HP bar.
- Enemies are sprites/silhouettes, not cards.
- Enemy card logic may exist in core, but enemy cards must not be rendered as battlefield cards.
- Enemy overhead UI is intent, not a visible enemy hand card.
- Orange command line means card-to-pet command relationship only.
- Orange command line must not mean damage path, enemy targeting, or generic targeting.
- Enemy target rings show effect targetability, hover, focus, and impact.
- Buffs/debuffs/statuses are local to the affected combatant.
- No exact damage prediction in Phaser.
- Text and numbers are code-rendered, not baked into generated images.
- Missing art or unknown events must fail safely and not break combat.
- No duplicate gameplay submit while a request is pending or event playback is resolving.
- Overlay/detail/pause clicks must not click through to the board or HUD underneath.
- Phase 1 UI supports 0-10 hand cards, 1-3 enemies, and up to 3 visual pet slots.

### Resolution Decision for This Polish Program

The current implementation and captured previews are built around a 1280x720 logical canvas. Although earlier docs mention 1920x1080 as a primary logical resolution, these three passes should not migrate the game to 1920x1080. That would be a separate layout migration.

For these contracts:

- Keep current `GAME_WIDTH = 1280` and `GAME_HEIGHT = 720`.
- Treat 1280x720 as the Phase 1 implementation authoring canvas.
- Keep fixed 16:9 scale/letterbox behavior.
- Export future raster assets at 2x or 3x for sharpness.
- If docs are updated, clarify that Phase 1 implementation authoring is 1280x720 while minimum readability target is also 1280x720.

### Required Commands After Each Pass

Run these from repo root:

```bash
npm run typecheck
npm test
npm run build
npm run zip:review
```

If a command fails, fix the failure before considering the pass complete.

### Required PR / Completion Report Format

At the end of each pass, the agent must report:

```md
## Summary
- What changed.
- What stayed intentionally unchanged.

## Combat UX Result
- How this improves readability or polish.
- Which confusing behavior was removed.

## Architecture Boundary
- Confirm Phaser still does not own gameplay rules.
- Confirm game-core boundary tests still pass.

## Tests
- Commands run.
- Test files added/updated.

## Screenshots / Evidence
- List updated preview images if generated.
- If no screenshots were generated, explain why and provide manual preview steps.

## Follow-up Risks
- Anything still confusing.
- Anything deferred to later passes.
```

---

# Pass 1 Engineering Contract

## Title

Combat UI Polish Pass 1 — Interaction State Refactor and CombatScene Decomposition

## Goal

Refactor the current combat presentation architecture so UI state, input locking, targeting, overlays, and action submission are explicit, testable, and no longer concentrated inside `CombatScene.ts`.

This pass is not primarily visual. It is a foundation pass. The screen may look almost the same after this pass, but the code should become safer and easier to polish in Pass 2.

## Current Problems to Address

The current combat implementation has several useful helpers already, but `CombatScene.ts` still owns too many responsibilities:

- selected card state
- hovered card state
- keyboard target/focus state
- tooltip delay state
- detail panel state
- pause state
- browser focus state
- request id and revision submission state
- event playback lock state
- keyboard handling
- pointer handling glue
- card submit flow
- end-turn submit flow
- failed submit recovery
- debug overlay data plumbing
- parity diagnostics
- continue/reset routing
- direct presenter render orchestration

This makes later UI polish risky because every visual state change touches a large scene file.

## Non-Goals

Do not redesign final visuals in this pass.

Do not replace all presenters.

Do not implement new enemy card rules.

Do not implement hidden/scoped intent mechanics in core.

Do not add new packages.

Do not perform a 1920x1080 layout migration.

Do not rewrite the controller or game-core combat systems.

## Required High-Level Outcome

After Pass 1:

- Combat interaction state is represented by explicit pure types/functions.
- `CombatScene` delegates interaction, overlay, and submission logic instead of owning everything directly.
- `keyboardTargetId` is renamed or conceptually replaced with `focusedTargetId` because it is a focus/preview state, not a submitted/selected target.
- Detail/pause overlays suspend input and restore prior selected-card state safely.
- Input locking distinguishes submit, playback, modal/detail, pause, browser blur, and combat-ended situations.
- Duplicate submits and stale-revision requests remain guarded.
- Existing combat visuals still work.
- Existing tests pass, with new tests covering the extracted modules.

## Suggested Files to Create

Create or update these files. Names may be adjusted if the existing style suggests a better fit, but the separation of responsibilities must remain.

```txt
src/game-phaser/interaction/combat-presentation-state.ts
src/game-phaser/interaction/combat-selection-state.ts
src/game-phaser/interaction/combat-overlay-state.ts
src/game-phaser/interaction/combat-tooltip-state.ts
src/game-phaser/interaction/combat-input-lock.ts
src/game-phaser/interaction/combat-target-focus.ts
src/game-phaser/interaction/combat-ui-requests.ts
src/game-phaser/interaction/combat-scene-orchestrator.ts
```

Keep existing files where useful:

```txt
src/game-phaser/interaction/combat-interaction-state.ts
src/game-phaser/interaction/combat-action-submission.ts
src/game-phaser/interaction/card-interaction-policy.ts
src/game-phaser/interaction/combat-drop-target-resolver.ts
```

It is acceptable to evolve existing files instead of creating all suggested files, but the final architecture must be clear and tested.

## Required State Model

Introduce an explicit presentation state union or equivalent discriminated model.

Required states:

```ts
type CombatPresentationMode =
  | "loading"
  | "player_turn_idle"
  | "card_hover"
  | "card_selected"
  | "targeting"
  | "detail_open"
  | "resolving_player_action"
  | "enemy_turn"
  | "combat_victory"
  | "combat_defeat"
  | "paused";
```

This presentation mode does not replace game-core `CombatPhase`. It is a UI state derived from:

- latest `CombatViewModel.phase`
- selected card state
- hover state
- modal/detail state
- pause state
- playback/submission lock state
- browser focus

Add a pure function similar to:

```ts
type ResolveCombatPresentationModeInput = {
  readonly viewModelPhase?: CombatViewModel["phase"];
  readonly selectedCardId?: CardInstanceId;
  readonly hoveredCardId?: CardInstanceId;
  readonly detailOpen: boolean;
  readonly pauseOpen: boolean;
  readonly submitting: boolean;
  readonly playbackLocked: boolean;
  readonly browserFocused: boolean;
};

function resolveCombatPresentationMode(input: ResolveCombatPresentationModeInput): CombatPresentationMode;
```

Expected behavior:

- detail beats targeting for active input ownership.
- pause beats normal input ownership.
- resolving/submitting beats player interaction.
- won/lost beats normal card controls.
- selected targetable card yields `targeting`.
- hovered card yields `card_hover` only when no selection/modal/lock owns input.

## Required Interaction State Model

Replace the loose selected/hover/keyboard target state with clearer terms.

Use names with these meanings:

```ts
type CombatSelectionState = {
  readonly selectedCardId?: CardInstanceId;
  readonly selectedCardRevision?: number;
  readonly hoveredCardId?: CardInstanceId;
  readonly focusedTargetId?: CombatantId;
  readonly hoveredTargetId?: CombatantId;
};
```

Rules:

- `focusedTargetId` is for keyboard focus or default target preview only.
- `hoveredTargetId` is pointer hover only.
- Neither `focusedTargetId` nor `hoveredTargetId` should be treated as a submitted target.
- A true submitted/impact target should come from the action request or event playback.
- Selecting a targetable card may initialize `focusedTargetId` to the first valid target, but the visual style must be weaker than final submitted impact in Pass 2.
- Reconciliation must clear or update stale selected/hovered/focused IDs when the view model changes.

Update or replace `reconcileCombatInteractionState` so it handles:

- selected card missing from hand
- selected card no longer playable
- selected card no longer targetable
- focused target no longer valid
- hovered target no longer alive or no longer in view model
- detail restoration after a stale state update

## Required Overlay State Model

Create a small overlay state model.

```ts
type CombatOverlayState = {
  readonly detail?: CombatDetailPanel;
  readonly pauseOpen: boolean;
  readonly tooltip?: CombatTooltip;
  readonly pendingTooltip?: CombatTooltip;
  readonly preservedSelection?: CombatSelectionState;
};
```

Rules:

- Opening detail stores the current selection/targeting state when applicable.
- Opening detail clears quick tooltip.
- Detail suspends gameplay submit input.
- Closing detail restores selection only if it is still valid against the latest view model.
- If not valid, close to `player_turn_idle`.
- Pause overlay should not open on top of detail unless explicitly designed; current behavior may keep detail priority.
- A click that closes detail/pause must be consumed by overlay and not sent to board/HUD/presenters underneath.

## Required Input Lock Model

Expand `CombatInputLockReason` into a more expressive union.

```ts
type CombatInputLockReason =
  | "submitting"
  | "playback"
  | "detail_open"
  | "paused"
  | "browser_blur"
  | "enemy_turn"
  | "combat_ended";
```

Use a pure function:

```ts
type ResolveCombatInputLockStateInput = {
  readonly submitting: boolean;
  readonly playbackLocked: boolean;
  readonly detailOpen: boolean;
  readonly pauseOpen: boolean;
  readonly browserFocused: boolean;
  readonly viewModelPhase?: CombatViewModel["phase"];
};
```

Expected priority:

1. submitting
2. playback
3. detail_open
4. paused
5. browser_blur
6. combat_ended
7. enemy_turn
8. unlocked

The exact priority can differ if documented and tested, but gameplay submits must never slip through a locked state.

## Required Request Lifecycle

Keep and harden the existing request lifecycle.

Required behavior:

```txt
idle/selecting
-> submit requested
-> input locked immediately
-> controller/core validates request id and view-model revision
-> events returned
-> event playback
-> latest view model rendered
-> input unlocked only if combat state allows
```

Requirements:

- A card play or end-turn request must include request id and view-model revision.
- Input must lock before reading/playing returned events.
- Duplicate request ids must be recorded as diagnostics.
- Stale revisions must be recorded as diagnostics.
- Core rejection must refresh latest view model and show safe feedback.
- Failed submit may restore selected card only when still valid and recoverable.

Do not remove the existing duplicate-submit/stale-request behavior.

## Required CombatScene Decomposition

Refactor `CombatScene.ts` so it becomes orchestration only.

Recommended target responsibilities for `CombatScene` after this pass:

- instantiate presenters
- instantiate event player
- bind scene lifecycle events
- bind keyboard/pointer entrypoints
- route scene transitions after combat continue
- call a renderer/orchestrator to render current state

Move out of `CombatScene` where practical:

- tooltip delay logic
- detail/pause open/close logic
- interaction state transitions
- selection reconciliation
- input lock resolution
- action submission snapshot handling
- failed submission restoration
- target focus cycling
- debug input snapshot creation if possible

Target size:

- The exact line count is not the goal, but `CombatScene.ts` should be materially smaller.
- A good target is under 700 lines after Pass 1.
- If the agent cannot reach that safely, it must explain what remained and why.

## Required Keyboard Behavior

Preserve and test:

- `Esc` closes detail first.
- If no detail is open, `Esc` closes pause if pause is open.
- If no overlay is open, `Esc` cancels selected card/targeting.
- `Space` ends turn only when player is idle, no selected card, no detail, no pause, no lock.
- `Space` must not end turn during targeting.
- `1-9` may select hand cards if already implemented.
- `Tab` cycles valid target focus for selected targetable card.
- `Enter` submits focused target for selected targetable card.
- `I` opens detail for hovered or selected card if already supported.

## Required Tests

Add or update tests under `tests/game-phaser`.

Suggested tests:

```txt
tests/game-phaser/combat-presentation-state.test.ts
tests/game-phaser/combat-selection-state.test.ts
tests/game-phaser/combat-overlay-state.test.ts
tests/game-phaser/combat-input-lock.test.ts
tests/game-phaser/combat-scene-boundary.test.ts
tests/game-phaser/combat-action-submission.test.ts
```

Test cases must cover:

- presentation mode resolution
- target focus is not submitted target
- selected card stale reconciliation
- focused target stale reconciliation
- hover target stale reconciliation
- detail opens and preserves selection
- detail closes and restores only if valid
- detail close consumes input conceptually through overlay/presenter tests
- input lock reason priority
- duplicate submit remains blocked
- stale revision remains rejected
- `Space` blocked while targeting
- `Esc` order: detail, pause, selection
- no direct game-core resolver imports in presenters/scene

## Required Acceptance Criteria

Pass 1 is complete when all are true:

- `CombatScene.ts` delegates most interaction state logic to tested helper modules.
- UI state has explicit presentation mode or equivalent tested derivation.
- `keyboardTargetId` is removed or renamed conceptually to `focusedTargetId`.
- Selection, hover, focus, detail, pause, and lock state are separately represented.
- Detail state preserves and safely restores selected card state.
- Gameplay input is locked during submit/playback/modal/pause/browser blur/combat ended/enemy turn as appropriate.
- No duplicate submit regression.
- No stale revision regression.
- Existing card play, pet-command card play, enemy targeting, end-turn, continue, and reset flows still work.
- Existing debug overlay/parity diagnostics still work or are deliberately adapted with tests.
- No visual redesign is required, but no new confusion should be introduced.
- Required commands pass.

## Suggested Agent Prompt

```md
Use $game-architecture-guard and $phaser-presentation-builder.

Implement Combat UI Polish Pass 1: refactor combat interaction state and decompose CombatScene without changing combat gameplay rules or final visuals.

Follow docs/combat-ui-ux-polish-pass-1-2-3-engineering-contract.md, Pass 1 only.

Hard requirements:
- Combat UI only.
- Do not touch reward/map/pet journal UI.
- Do not implement new enemy card mechanics.
- Keep Phaser presentation-only.
- Keep 1280x720 Phase 1 implementation canvas.
- Preserve duplicate-submit and stale-revision safety.
- Replace keyboardTarget naming with focusedTarget semantics.
- Add tests for presentation mode, selection reconciliation, overlay restoration, and input lock priority.

Run:
- npm run typecheck
- npm test
- npm run build
- npm run zip:review

Report summary, tests, and remaining risks.
```

---

# Pass 2 Engineering Contract

## Title

Combat UI Polish Pass 2 — Visual Grammar, Intent Tokens, Target Rings, Command Line, and Readable Event Feedback

## Goal

Improve the actual combat readability using placeholder/code-built visuals. This pass should make combat understandable before final assets exist.

The key job is to remove confusing visual grammar:

- enemy intent must not look like an enemy hand card
- orange command line must not look like a giant wire or damage path
- focused target must not look like a submitted/impact target
- event playback must read as card -> actor -> target -> result
- player-facing detail copy must not expose raw debug metadata

## Dependency

Pass 1 should be complete first. If Pass 1 is not complete, do only the smallest safe extraction needed before visual polish. Do not pile more visual state directly into a bloated `CombatScene.ts`.

## Non-Goals

Do not create final art.

Do not add production dependencies.

Do not implement full enemy card system or hidden intent core rules.

Do not implement exact damage prediction.

Do not add pet HP, pet injury, pet death, pet morale, or enemy pet targeting.

Do not add player-facing combat log.

Do not redesign reward/map UI.

Do not migrate to 1920x1080.

## Required High-Level Outcome

After Pass 2:

- Enemy overhead UI is an intent token, not a rectangular planned-card panel.
- Enemy intent visual states are future-ready for none/unknown/category/rough/exact/scoped, even if current core mostly supplies revealed/exact data.
- Player-facing intent detail uses gameplay language, not raw metadata labels like `Metadata source` or `Reveal policy`.
- Pet-command orange line is a short, curved, ember-like command thread to Ember Fox.
- Pet-command line appears only for pet-command cards and pet-command events.
- Normal attack cards never show orange command line.
- Enemy rings distinguish valid, hovered, focused, and impact states.
- Keyboard focus is visually weaker than hover/impact/submitted action.
- Event playback is less generic and more semantically readable.
- Card frames are still placeholders but have stable zones and family grammar.

## Visual Grammar Rules

### Enemy Intent Token

Replace the current enemy planned-card rectangle with an intent token.

Required visual language:

```txt
unknown   -> ? token or misted token
category  -> icon/glyph token only, e.g. attack/guard/debuff/special
rough     -> icon/glyph token + Low/Med/High or intensity marker
exact     -> icon/glyph token + amount label, e.g. 7 or 3x2
scoped    -> icon/glyph token + scope mark, detail panel shows candidate/conditional info
```

For current implementation, if the view model only has exact planned ability data, map it to an exact or category token. Do not implement the full core visibility system in this pass.

Do not display a visible enemy card body on the battlefield.

Do not display enemy card title/type/amount in a rectangular card-looking block above the enemy.

A compact intent token may show:

- icon/glyph
- amount label
- tiny scope/unknown marker
- hover tooltip
- right-click/detail

### Player-Facing Intent Detail Copy

Remove player-facing raw debug labels.

Bad player-facing copy:

```txt
Metadata source: plannedAbility
Reveal policy: revealed
Intent ID: slime_tackle
```

Good player-facing copy:

```txt
Attack
This enemy is preparing to attack the Keeper.
Damage: 7
Target: Keeper
```

Debug metadata may still exist in debug overlay or dev detail if behind a debug flag.

### Target Ring States

Target rings must support these states:

```ts
type EnemyTargetVisualState =
  | "hidden"
  | "base"
  | "valid"
  | "hovered"
  | "focused"
  | "submitted"
  | "impact"
  | "invalid";
```

Required meanings:

- `base`: enemy exists but no active targeting.
- `valid`: selected card can target this enemy.
- `hovered`: pointer is over a valid target.
- `focused`: keyboard/default target focus. This must not look like final selection.
- `submitted`: action request has been submitted for this target, if tracked.
- `impact`: event playback is currently hitting this target.
- `invalid`: optional, only for feedback.

Visual strength order, weakest to strongest:

```txt
base < valid < focused < hovered < submitted < impact
```

Current default target/focused target must not use the strongest selected target visual.

### Pet Ring States

Pet ring must distinguish:

```ts
type PetCommandVisualState =
  | "active"
  | "command_hover"
  | "command_selected"
  | "resolving"
  | "empowered";
```

When a pet-command card is hovered:

- Ember Fox ring glows subtly.
- Command line appears softly.

When selected:

- ring glow is stronger.
- command line is clearer.

When resolving:

- marker pulse runs along command line to Ember Fox.
- pet reaction follows.

### Orange Command Line

Replace the current right-angle command wire with a curved command thread.

Rules:

- It points from active hand card to Ember Fox only.
- It must never point to an enemy.
- It must never be used for normal attack cards.
- It should be curved, shorter-feeling, warm, and subtle.
- It should not cross the entire screen as a thick rectangular wire.
- It should not obscure card text.
- On hover: low alpha.
- On selected: medium alpha.
- On resolution: ember marker travels toward pet, then line disappears.

Suggested implementation:

- Update `TargetingPresenter` to render a sampled quadratic/cubic curve using `Graphics.strokePoints` or segmented `lineBetween` over sampled points.
- Add a small marker/rune at the pet endpoint.
- Allow input parameter `commandLineState: "hidden" | "hover" | "selected" | "resolving"`.
- Drive hover/selected from interaction state.
- Drive resolving from `PetCommanded` event in `CombatEventFxPresenter`.

### Card Frame Placeholder Grammar

Cards remain code-built placeholders, but should have more asset-ready structure.

Every card should visually expose stable zones:

```txt
cost socket
title band
family/type badge
art window
rules text box
tag/icon row
frame accent
hover/selected/unplayable overlay
```

Required family differentiation:

- normal attack/skill: parchment frame, restrained accent
- pet-command: paw-rune badge + ember accent
- pet support: pet badge but softer support accent
- unplayable: dim overlay + reason tooltip
- selected: clear outline and lift
- hovered: lift/scale, but not excessive

Do not rely on fill color only.

Do not bake text or numbers into assets.

### Tooltip and Detail Copy Cleanup

Player-facing detail must prioritize gameplay.

Card detail should show:

- card name
- cost
- family/type
- target type
- tags
- rules text
- keyword explanations
- optional field note

Intent detail should show:

- intent name
- target hint
- amount if known
- short explanation
- unknown/partial/scoped explanation if relevant

Status detail should show:

- name
- stack/value
- timing
- expiration/decay
- short gameplay explanation

No normal player-facing detail panel should expose implementation source, registry id, schema id, reveal-policy enum, or raw metadata unless debug mode is enabled.

## Required View Model Changes

Do not implement full enemy-card/visibility mechanics, but make the combat view model ready for intent token rendering.

Add a presentation-oriented intent token shape, for example:

```ts
type IntentVisibilityDisplayLevel =
  | "none"
  | "unknown"
  | "category"
  | "rough"
  | "exact"
  | "scoped";

type CombatIntentTokenViewModel = {
  readonly monsterId: CombatantId;
  readonly visibility: IntentVisibilityDisplayLevel;
  readonly kind: "attack" | "defend" | "buff" | "debuff" | "special" | "unknown" | "charging";
  readonly iconKey: string;
  readonly amountLabel?: string;
  readonly strengthLabel?: "Low" | "Med" | "High";
  readonly targetHint?: "keeper" | "self" | "ally" | "allEnemies" | "pet" | "unknown";
  readonly tooltip: CombatTooltipCopyViewModel;
  readonly detail: CombatDetailCopyViewModel;
  readonly debug?: {
    readonly source?: string;
    readonly abilityId?: string;
    readonly intentId?: string;
    readonly tags?: readonly string[];
  };
};
```

Current `MonsterIntentViewModel` can either be adapted or wrapped. The important thing is that `MonsterPresenter` renders token data, not `plannedAction` as a card.

Current planned action metadata may remain in the view model for debug and future systems, but the presenter must not draw it as a card.

## Required Presenter Changes

### MonsterPresenter

Refactor `MonsterPresenter` so the enemy slot is visually composed as:

```txt
intent token above
name/sprite/silhouette body
base ring / target ring
HP bar
local status tray
```

Remove or stop using:

- `plannedCard` rectangle
- card-like planned title block
- card-like planned type block
- planned-card frame visual

Add or extract:

```txt
IntentTokenPresenter
EnemyTargetRingPresenter or target-ring rendering helper
```

If extracting a separate presenter is too much for this pass, keep it inside `MonsterPresenter` but structure the code so intent token and ring rendering are separate private methods.

### TargetingPresenter

Change `TargetingPresenter` from one hardcoded right-angle line into a small targeting grammar renderer.

Suggested input:

```ts
type TargetingRenderInput = {
  readonly commandLine?: {
    readonly state: "hidden" | "hover" | "selected" | "resolving";
    readonly source: Point;
    readonly target: Point;
  };
  readonly enemyRings?: readonly {
    readonly enemyId: CombatantId;
    readonly state: EnemyTargetVisualState;
    readonly position: Point;
  }[];
};
```

If enemy rings remain in `MonsterPresenter`, then `TargetingPresenter` may only own command line for now. But the target-state calculation must be explicit and tested somewhere.

### PetPresenter

Ensure pet visual states communicate:

- active
- command hover
- command selected
- resolving
- empowered/charge if active

Do not show pet HP.

Do not show empty unexplained charge pips unless the charge mechanic exists in the view model.

### CardPresenter

Make card zones stable enough for asset replacement:

- cost socket position stable
- title band stable
- type/family badge stable
- art window stable
- rules text region stable
- tag row stable
- selected/unplayable overlays separated

Improve pet-command grammar:

- pet-command card has paw-rune placeholder badge
- pet-command card has ember accent
- normal cards do not use the pet-command badge

Avoid showing raw truncated tag labels like `atta`, `bloc` as the final visual language if a better placeholder can be used. If text tags remain, make them secondary and consistent, not the main identity.

### CombatEventFxPresenter

Reduce generic/confusing FX.

Required semantic routes:

```txt
CardPlayed
-> selected card lift/play-area feedback

EnergySpent
-> energy orb pulse

PetCommanded
-> command marker/line pulse to Ember Fox

PetReacted
-> Ember Fox ring/pose/dash placeholder

DamageDealt
-> target impact ring/pulse + damage number at target

BlockGained
-> shield pulse at player HUD or target

StatusApplied
-> status pop near target, then settle implied by re-rendered tray

MonsterIntentResolved / MonsterAbilityPlayed
-> enemy intent pulse/wind-up, attack travels toward Keeper/avatar
```

Do not make `DamageDealt` always appear as a huge straight line from source to target if it conflicts with pet-command grammar. A normal player attack can show source-to-target impact, but pet-command attack should read through `PetCommanded -> PetReacted -> DamageDealt`.

If full event grouping is too large, at least tune individual event visuals so sequence order reads clearly.

## Required Interaction Behavior

Preserve these flows:

### Flow A — Normal Enemy Attack Card

1. Hover normal enemy-targeted card.
2. Card lifts.
3. Enemy rings show valid targets.
4. No orange command line appears.
5. Select enemy.
6. Action resolves.
7. Damage/status feedback appears on enemy.

### Flow B — Pet-Command Attack Card

1. Hover pet-command enemy-targeted card.
2. Card lifts.
3. Curved orange command thread points to Ember Fox.
4. Ember Fox ring glows.
5. Enemy rings show effect targets.
6. Focused target is readable but not final/impact state.
7. Click enemy.
8. Command marker reaches Ember Fox.
9. Ember Fox reacts.
10. Enemy receives impact.

### Flow C — Pet Support or Guard Card

1. Hover pet support/guard card.
2. Orange command thread points to Ember Fox.
3. If self/guard, Keeper/HUD preview glows.
4. Card plays on first click when no target choice is required.
5. Player HUD/pet state updates from events.

### Flow D — Intent Detail

1. Hover intent token.
2. Tooltip explains action at current visibility level.
3. Right-click/info opens detail.
4. Detail uses gameplay language.
5. No click-through occurs.

## Required Tests

Add or update tests under `tests/game-phaser`.

Suggested tests:

```txt
tests/game-phaser/intent-token-view-model.test.ts
tests/game-phaser/monster-presenter-intent-token.test.ts
tests/game-phaser/target-ring-state.test.ts
tests/game-phaser/targeting-presenter.test.ts
tests/game-phaser/card-frame-grammar.test.ts
tests/game-phaser/combat-event-fx-presenter.test.ts
tests/game-phaser/combat-view-model.test.ts
tests/game-phaser/combat-scene-boundary.test.ts
```

Test cases must cover:

- Monster presenter no longer contains `plannedCard` player-facing rendering.
- Intent token supports unknown/category/rough/exact/scoped shape at view-model or presenter level.
- Exact intent with amount displays amount label.
- Unknown intent displays `?` or unknown token without treating it as missing data.
- Player-facing intent detail has no `Metadata source` or `Reveal policy` copy.
- Debug metadata is still available somewhere if needed.
- Pet-command line renders only for pet-command active card.
- Normal attack card does not render command line.
- Command line source/target is card -> pet, not card -> enemy.
- Target ring visual state distinguishes valid/hovered/focused/impact.
- `focusedTargetId` does not produce the strongest selected/impact ring.
- Pet HP is not rendered.
- Card frame zones exist in `CardPresenter` or layout constants.
- Existing Pass 1 interaction tests still pass.

## Required Preview Evidence

If the repo has an existing way to generate preview screenshots, update or create equivalent 1280x720 evidence images for:

```txt
preview-combat-wireframe-selected-1280x720.png
preview-combat-pet-command-fx-1280x720.png
preview-combat-normal-attack-fx-1280x720.png
preview-combat-intent-detail-1280x720.png
preview-combat-card-detail-1280x720.png
```

Do not add Playwright or screenshot dependencies unless already available or explicitly approved.

If screenshots cannot be generated in the agent environment, provide manual browser steps:

```txt
npm run dev
open combat preview route
start combat
hover normal attack card
hover pet-command card
open intent detail
capture 1280x720 viewport manually
```

## Required Acceptance Criteria

Pass 2 is complete when all are true:

- Enemy overhead no longer looks like an enemy card.
- Enemy intent is displayed as token/icon grammar.
- Player-facing intent details are clean gameplay copy.
- Orange command line is curved/subtle and means pet-command only.
- Normal attack cards never show orange command line.
- Pet-command cards show command-to-pet plus enemy target rings.
- Target rings separate valid, hover, focus, submitted, and impact semantics.
- Keyboard/default focus no longer looks like final submitted target.
- Card placeholders have stable asset-ready zones.
- Event FX sequence reads better for pet-command attacks and normal attacks.
- No final art is required.
- No gameplay rules were moved into Phaser.
- No new production dependency was added.
- Required commands pass.

## Suggested Agent Prompt

```md
Use $game-architecture-guard and $phaser-presentation-builder.

Implement Combat UI Polish Pass 2: visual grammar polish for combat only.

Follow docs/combat-ui-ux-polish-pass-1-2-3-engineering-contract.md, Pass 2 only.

Hard requirements:
- Do not add final art.
- Do not implement new enemy-card core mechanics.
- Replace enemy planned-card visual with intent token grammar.
- Clean player-facing intent detail copy.
- Replace right-angle pet-command wire with curved card-to-Ember-Fox command thread.
- Normal attack cards must not show orange command line.
- Separate target visual states: valid, hovered, focused, submitted, impact.
- Keep Phaser presentation-only.
- Keep 1280x720 implementation canvas.
- Add/update Vitest coverage.

Run:
- npm run typecheck
- npm test
- npm run build
- npm run zip:review

Report visual behavior changes, tests, and remaining risks.
```

---

# Pass 3 Engineering Contract

## Title

Combat UI Polish Pass 3 — Asset-Ready Wire Spec, Asset Key Contract, Fallbacks, and Golden Flow Evidence

## Goal

Turn the cleaned combat UI into an asset-ready implementation contract. This pass does not need final art. It must define exactly what assets are needed, where they plug in, what sizes/zones they must respect, and how missing assets fall back safely.

After this pass, an artist, image-generation workflow, or future UI implementation agent should be able to create and replace assets without rethinking layout or breaking gameplay readability.

## Dependency

Pass 1 and Pass 2 should be complete first.

If Pass 2 is not complete, do not create final-looking asset manifest around confusing visuals. Enemy intent must be token-based, not card-like. Pet-command line must be command-to-pet only. Target ring states must be semantically separated.

## Non-Goals

Do not produce final art.

Do not bake text, numbers, HP, block, card rules, energy, status stacks, or intent amounts into images.

Do not implement reward/map/pet journal asset specs except for tiny references if needed.

Do not add a third-party asset loader library.

Do not add animation libraries.

Do not add pet HP art.

Do not add enemy pet-targeting markers.

Do not implement exact damage prediction.

## Required High-Level Outcome

After Pass 3:

- There is a combat-only asset manifest document.
- Asset replacement points are explicit in code or constants.
- Every dynamic UI element says whether it is asset-backed or code-rendered.
- Placeholder/fallback visuals are centralized.
- Card frame zones are specified in pixels for the 1280x720 authoring canvas.
- Intent icon/token set is specified.
- Status icon set is specified.
- Player HUD, pet area, enemy slot, piles, energy, end-turn, tooltip/detail, and target-ring assets are specified.
- Event/VFX asset hooks are specified.
- Keeper, Ember Fox, and enemy pose/sprite requirements are specified.
- Golden flow evidence checklist is updated so future art can be reviewed against gameplay clarity.

## Required Docs to Create or Update

Create:

```txt
docs/contracts/combat-ui-asset-manifest-v0.1.md
```

Optionally also create:

```txt
docs/contracts/combat-ui-golden-flow-evidence-v0.1.md
```

If project convention prefers date-numbered plan docs, add a short plan doc too, but the asset manifest must be the durable output.

## Required Code Files to Create or Update

Suggested files:

```txt
src/game-phaser/assets/combat-asset-keys.ts
src/game-phaser/assets/combat-fallback-assets.ts
src/game-phaser/layout/combat-ui-tokens.ts
src/game-phaser/layout/card-frame-layout.ts
src/game-phaser/layout/intent-token-layout.ts
src/game-phaser/layout/status-icon-layout.ts
src/game-phaser/animation/combat-vfx-keys.ts
```

These files should be lightweight. They should not load real art unless real art already exists.

The goal is to define keys, dimensions, safe zones, fallback names, and stable presenter contracts.

## Required Asset Key Contract

Define stable asset key categories.

Example:

```ts
export const CombatAssetKeys = {
  backgrounds: {
    ashwoodCombat: "combat.background.ashwood"
  },
  uiPanels: {
    playerHudFrame: "combat.ui.playerHudFrame",
    bottomHudPlate: "combat.ui.bottomHudPlate",
    tooltipPanel: "combat.ui.tooltipPanel",
    detailPanel: "combat.ui.detailPanel"
  },
  cardFrames: {
    normal: "combat.cardFrame.normal",
    petCommand: "combat.cardFrame.petCommand",
    petSupport: "combat.cardFrame.petSupport",
    unplayableOverlay: "combat.cardFrame.unplayableOverlay",
    selectedOverlay: "combat.cardFrame.selectedOverlay"
  },
  icons: {
    intentAttack: "combat.icon.intent.attack",
    intentDefend: "combat.icon.intent.defend",
    intentBuff: "combat.icon.intent.buff",
    intentDebuff: "combat.icon.intent.debuff",
    intentSpecial: "combat.icon.intent.special",
    intentUnknown: "combat.icon.intent.unknown",
    statusBurn: "combat.icon.status.burn",
    statusBlock: "combat.icon.status.block",
    statusGuard: "combat.icon.status.guard",
    statusEmpowered: "combat.icon.status.empowered",
    tagPetCommand: "combat.icon.tag.petCommand",
    tagBurn: "combat.icon.tag.burn",
    tagGuard: "combat.icon.tag.guard"
  },
  combatants: {
    keeperIdle: "combat.keeper.idle",
    keeperCommand: "combat.keeper.command",
    keeperHurt: "combat.keeper.hurt",
    emberFoxIdle: "combat.pet.emberFox.idle",
    emberFoxCommandReady: "combat.pet.emberFox.commandReady",
    emberFoxBite: "combat.pet.emberFox.bite",
    emberFoxTailguard: "combat.pet.emberFox.tailguard"
  },
  vfx: {
    commandThread: "combat.vfx.commandThread",
    commandMarker: "combat.vfx.commandMarker",
    targetRing: "combat.vfx.targetRing",
    impactBurst: "combat.vfx.impactBurst",
    burnPop: "combat.vfx.burnPop",
    shieldArc: "combat.vfx.shieldArc"
  }
} as const;
```

Names can differ, but they must be stable, documented, and grouped.

## Required Fallback Policy

Centralize missing-asset fallback behavior.

Required fallbacks:

```txt
missing combat background -> code-rendered neutral board
missing Keeper avatar -> simple humanoid silhouette
missing Ember Fox sprite -> fox/paw silhouette placeholder
missing enemy sprite -> monster silhouette placeholder
missing card art -> blank art window placeholder
missing icon -> generic icon circle with short glyph
missing card frame -> code-rendered rectangle frame
missing VFX -> skip VFX and still update/re-render state
missing tooltip text -> title + "No details available yet."
unknown event -> debug warning, skip visual, continue playback
```

Do not scatter fallback logic randomly across presenters.

Use helpers like:

```ts
type CombatAssetAvailability = {
  readonly hasTexture: (key: string) => boolean;
};

function resolveCombatTextureKey(
  requestedKey: string | undefined,
  fallbackKey: string,
  assets: CombatAssetAvailability
): string;
```

If Phaser texture checks are awkward in tests, keep the resolver pure and inject availability.

## Required Asset Manifest Content

`docs/contracts/combat-ui-asset-manifest-v0.1.md` must include these sections.

### 1. Scope

State that this is combat-only and Phase 1 authoring canvas is 1280x720.

### 2. Dynamic Text Rule

State clearly:

- card titles are code-rendered
- card cost is code-rendered
- card rules are code-rendered
- HP/block/status stacks are code-rendered
- energy is code-rendered
- intent amount is code-rendered
- pile counts are code-rendered
- End Turn text is code-rendered
- tooltip/detail text is code-rendered

Assets may contain decorative blanks, icons, panels, frames, sprites, and VFX, but not live values.

### 3. Layering

Define combat layers:

```txt
BackgroundLayer
BoardEntityLayer
BoardUiLayer
HudLayer
TargetingLayer
VfxLayer
TooltipLayer
DetailLayer
DebugLayer
```

For each layer, list what assets can appear there.

### 4. Card Frame Spec

Define canonical card ratio: 5:7.

For current implementation, specify 1x display size and future 2x/3x exports.

Example based on current implementation:

```txt
1x hand card display: 96 x 134 px
ratio approximation: 5:7
recommended 2x asset export: 192 x 268 px
recommended 3x asset export: 288 x 402 px
```

Define zones within the card:

```txt
cost socket
title band
family badge
art window
rules text box
tag row
rarity/frame accent
hover outline layer
selected overlay layer
unplayable overlay layer
```

Include a table like:

```txt
Zone | 1x position/size | Dynamic? | Asset-backed? | Notes
```

Do not bake text in card frames.

### 5. Card Frame Families

List required frame variants:

```txt
normal attack/skill frame
pet-command frame
pet-support frame
power/future frame placeholder
unplayable overlay
selected overlay
hover overlay
```

Pet-command frame must support a paw-rune badge or equivalent non-color cue.

### 6. Intent Token Spec

List required intent icons/tokens:

```txt
unknown
attack
defend
buff
debuff
special
charging
scoped marker
rough strength low/medium/high marker
multi-hit marker support
```

Specify:

- token size
- amount label anchor
- tooltip hitbox padding
- unknown `?` must feel intentional, not missing asset
- exact/scoped copy comes from view model

### 7. Status and Tag Icon Spec

List required status icons:

```txt
burn
block
guard
empowered
marked
pet-commanded/ready
status overflow +N container
fallback status icon
```

List tag icon needs:

```txt
pet-command
fox
burn
guard
block
draw
mark
attack
setup
combo
```

State visible caps:

```txt
enemy statuses: 4 + overflow
player statuses: 5 + overflow
pet statuses: 3 + overflow
card tags: 4 + detail panel
```

### 8. Player HUD Spec

Define:

- panel frame size
- portrait frame
- HP bar fill area
- block badge area
- status tray anchors
- hover/detail hitbox
- code-rendered text anchors

### 9. Pet Area Spec

Define Ember Fox sprite/pose needs:

```txt
idle
command-ready
bite/dash
tailguard
burn apply
calm/future optional
```

Define:

- pet ring asset or code-rendered ring
- command glow layer
- Ember Charge pip asset if mechanic active
- pet status tray
- inactive future pet slot rune circle

State again: no pet HP asset in Phase 1.

### 10. Enemy Slot Spec

Define:

- enemy sprite/silhouette safe box
- intent token anchor
- target ring anchor
- HP bar anchor
- block badge if any
- status tray anchor
- enemy slot hitbox

Support 1-3 enemies.

Do not include enemy card frame assets for battlefield.

### 11. Target Ring and Command Line VFX Spec

Define target ring state assets or code-rendered styles:

```txt
base
valid
focused
hovered
submitted
impact
invalid feedback
```

Define command line:

```txt
hover thread
selected thread
resolving pulse marker
endpoint rune flash
```

Command line is VFX/code-rendered, not a static baked screenshot.

### 12. Event VFX Spec

Map events to visual hooks:

```txt
CardPlayed
EnergySpent
PetCommanded
PetReacted
PetModifierActivated
DamageDealt
BlockGained
StatusApplied
StatusExpired
MonsterIntentSet
MonsterIntentResolved
CombatantDefeated
CombatEnded
ActionRejected
```

For each, list:

- event source
- target anchor
- asset key if any
- fallback behavior
- timing range
- should input be locked?

### 13. Tooltip and Detail Panel Spec

Define:

- tooltip panel skin
- detail panel skin
- close button area
- safe margin clamp
- title/body/footer text anchors
- click-blocker overlay

Text remains code-rendered.

### 14. Production Export Rules

Define:

- transparent PNG preferred for sprites/UI pieces
- no baked gameplay text
- export at 2x/3x when possible
- icons readable at small size
- use premultiplied alpha caution if needed
- file naming convention
- source naming convention

Example naming:

```txt
combat_card_frame_pet_command_2x.png
combat_icon_intent_attack_2x.png
combat_pet_ember_fox_idle_2x.png
combat_vfx_command_marker_2x.png
```

### 15. Asset Replacement Checklist

Include a checklist for future implementation:

```txt
- Replace frame asset only; card text still renders.
- Replace icon asset only; tooltip still works.
- Replace sprite pose only; hitbox stays stable.
- Replace VFX marker only; event order stays stable.
- Missing asset fallback still passes tests.
```

### 16. Golden Flow Review Matrix

Include the eight golden flows:

1. normal enemy attack card
2. Fox Bite pet-command attack
3. Tailguard/pet guard
4. Burn status application and tick
5. card detail during targeting
6. invalid target recovery
7. end turn and enemy attack
8. victory transition

For each flow, define what the reviewer must see.

## Required Code Integration

### Combat Asset Keys

Create a typed asset-key file. Presenters should not rely only on inline magic string keys.

This does not require assets to exist yet.

### UI Tokens

Move repeated style tokens into one file where practical:

```txt
line alpha values
ring stroke widths
ring alpha values
command line widths
command line alphas
hover/selected scale/lift timings
common placeholder colors
animation durations
```

Do not create a giant theme engine. Keep it small and practical.

### Layout Specs

Create card/intent/status layout spec files if useful.

These should make final asset replacement possible without editing every presenter.

### Fallback Tests

Add tests for pure fallback functions.

Required cases:

- requested texture exists -> use requested
- requested missing -> use fallback
- fallback missing -> use code-rendered placeholder instruction or generic key
- missing tooltip -> fallback copy
- missing icon -> generic icon descriptor

## Required Tests

Suggested tests:

```txt
tests/game-phaser/combat-asset-keys.test.ts
tests/game-phaser/combat-fallback-assets.test.ts
tests/game-phaser/card-frame-layout.test.ts
tests/game-phaser/intent-token-layout.test.ts
tests/game-phaser/status-icon-layout.test.ts
tests/game-phaser/combat-event-vfx-keys.test.ts
tests/game-phaser/combat-asset-manifest.test.ts
```

Test cases:

- asset key groups exist for backgrounds, panels, card frames, icons, combatants, VFX
- no dynamic text is listed as baked asset requirement
- card frame layout preserves 5:7 ratio
- intent token layout has amount anchor
- status icon visible caps match combat UI caps
- fallback behavior is centralized and pure-testable
- no pet HP asset key exists in Phase 1 manifest
- no enemy battlefield card asset key exists
- command line VFX key or token is pet-command-specific

## Required Acceptance Criteria

Pass 3 is complete when all are true:

- `docs/contracts/combat-ui-asset-manifest-v0.1.md` exists and is combat-only.
- The manifest states 1280x720 Phase 1 implementation canvas.
- The manifest states dynamic text/numbers are code-rendered.
- Card frame zones are specified.
- Card frame variants are specified.
- Intent token assets are specified and enemy battlefield cards are explicitly excluded.
- Status/tag icon assets and overflow caps are specified.
- Player HUD, pet area, enemy slot, piles, energy, End Turn, tooltip/detail assets are specified.
- Target ring and command-line VFX grammar is specified.
- Event-to-VFX mapping is specified.
- Keeper/Ember Fox/enemy pose requirements are specified.
- Missing asset fallback policy is centralized and tested.
- Typed asset keys or equivalent constants exist.
- No final art is required.
- No new dependency is added.
- No pet HP or enemy pet-targeting asset is introduced.
- Required commands pass.

## Suggested Agent Prompt

```md
Use $game-architecture-guard and $phaser-presentation-builder.

Implement Combat UI Polish Pass 3: asset-ready combat UI contract and asset key/fallback foundation.

Follow docs/combat-ui-ux-polish-pass-1-2-3-engineering-contract.md, Pass 3 only.

Hard requirements:
- Combat only.
- Do not produce final art.
- Do not bake gameplay text/numbers into assets.
- Create docs/contracts/combat-ui-asset-manifest-v0.1.md.
- Add typed combat asset keys and centralized fallback helpers.
- Keep 1280x720 Phase 1 implementation canvas.
- Include card frame zones, intent token spec, status icons, HUD assets, pet/enemy slots, target rings, command line VFX, event VFX, tooltip/detail panels.
- Exclude pet HP and enemy battlefield card assets.
- Add tests for asset keys, fallback behavior, and layout specs.

Run:
- npm run typecheck
- npm test
- npm run build
- npm run zip:review

Report asset manifest sections, tests, and remaining asset-production risks.
```

---

# Recommended Execution Order

Do not merge Pass 2 before Pass 1 is stable. Do not create Pass 3 asset specs around old confusing visuals.

Recommended order:

```txt
1. Pass 1 PR: architecture and interaction state cleanup.
2. Review manually in browser: normal card, pet-command card, detail overlay, end turn.
3. Pass 2 PR: visual grammar polish.
4. Review screenshots: intent token, command line, target rings, event playback.
5. Pass 3 PR: asset manifest, asset keys, fallback specs.
6. Then begin actual asset production.
```

# Final Review Checklist Across All Passes

Use this checklist before accepting the full three-pass program.

## Architecture

- [ ] `src/game-core` still has no Phaser/browser imports.
- [ ] Presenters do not call gameplay resolvers.
- [ ] CombatScene is orchestration, not a gameplay/state god object.
- [ ] Interaction state is tested outside Phaser.
- [ ] Input lock and request lifecycle are tested.

## Interaction

- [ ] Hover, selected, focused, submitted, and impact are not visually confused.
- [ ] Detail overlay suspends targeting and restores selection safely.
- [ ] Click-through from overlays is blocked.
- [ ] Space does not end turn during targeting.
- [ ] Esc behavior is ordered correctly.
- [ ] Invalid target recovery works.
- [ ] Duplicate submits are blocked.
- [ ] Stale revisions are rejected safely.

## Visual Grammar

- [ ] Enemy overhead UI is intent token, not card.
- [ ] Normal attack cards never show orange line.
- [ ] Pet-command cards show card-to-pet command thread.
- [ ] Enemy rings show effect target.
- [ ] Pet ring responds to command hover/selected/resolving.
- [ ] Player HUD remains authoritative for HP/block/status.
- [ ] Ember Fox has no HP bar.
- [ ] Statuses are local.

## Animation

- [ ] Card play locks input.
- [ ] PetCommanded visually reaches Ember Fox before PetReacted.
- [ ] PetReacted reads as pet action, not generic popup only.
- [ ] Damage appears on the actual target.
- [ ] Enemy attacks travel toward Keeper/avatar, not camera.
- [ ] Unknown/missing event visual does not break playback.

## Asset Readiness

- [ ] Asset manifest exists and is combat-only.
- [ ] Asset keys are stable and grouped.
- [ ] Dynamic text/numbers remain code-rendered.
- [ ] Card frame zones are fixed and documented.
- [ ] Intent/status/tag icon specs exist.
- [ ] Fallback policy is centralized.
- [ ] Missing asset tests pass.

## Validation

- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] `npm run zip:review` passes.
- [ ] Preview evidence or manual preview steps are included.
