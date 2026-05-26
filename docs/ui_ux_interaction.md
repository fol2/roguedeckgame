# UI/UX Interaction Contract v0.3 — Combat Only

Status: Living draft / implementation contract  
Version: 0.3  
Date: 2026-05-26  
Scope: Combat interaction only  
Related docs: `architecture.md`, `design.md`

This document defines the combat-only UI/UX interaction contract for the pet-centered roguelite deckbuilder.

It is based on the agreed combat wireframe and current visual direction:

- side-view party-versus-enemies layout;
- small Keeper battlefield avatar on the left;
- Ember Fox as the active pet co-hero, slightly forward of the Keeper;
- enemy sprites/silhouettes on the right;
- enemy intents above enemies;
- enemy HP and statuses below enemies;
- player state in a bottom-left Player HUD panel;
- Ember Fox has no Phase 1 HP bar;
- pet-command cards show an orange command line to Ember Fox;
- enemy target rings show the actual effect target;
- bottom HUD order: Player HUD, energy, draw pile, hand cards, discard pile, End Turn.

Version 0.2 resolved the first set of combat interaction questions and converted them into implementation decisions. Version 0.3 hardens the contract by adding interaction invariants, Phase 1 hard caps, stale-state handling, duplicate-submit prevention, overlay/click-through rules, negative interaction coverage, golden flow proof scripts, and failure-recovery behavior. The document is intentionally detailed because future asset planning, game-core view models, Phaser presenters, event playback, frontend work, and Codex implementation tasks should all depend on this contract.

---

## 1. Purpose

The purpose of this document is to turn the agreed combat wireframe into a precise interaction model.

It should answer:

- What does every combat UI element mean?
- What can the player hover, select, inspect, or click?
- How are player, pet, and enemy states displayed?
- How does pet-command targeting work?
- How are card details, status details, and intent details shown?
- What information must game-core/view-models provide to Phaser?
- What should Phaser presenters render and animate?
- Which interactions are Phase 1 requirements, which are deferred, and which are explicitly unsupported?
- Which earlier open questions are now decided or hardened?

This document should reduce future ambiguity before creating `asset_manifest.md`, Phaser presenter tickets, or game-core view-model contracts.

---

## 2. Scope

### 2.1 In Scope

This v0.3 covers only combat UI/UX.

Included:

- Combat screen layout contract.
- Player turn interactions.
- Card hover, selection, targeting, play, and inspect behavior.
- Pet-command targeting grammar.
- Enemy targeting and intent display.
- Player, pet, and enemy status display.
- Tooltip and detail panel behavior inside combat.
- Combat event playback expectations.
- Input locking during event resolution.
- UI scaling assumptions for Phase 1.
- View-model and presenter implications.
- Phase 1 acceptance criteria for combat interaction.
- Interaction invariants that must not be violated.
- Negative interaction and monkey-test behavior.
- Hard caps for Phase 1 UI-supported combat states.
- Failure, fallback, stale request, and duplicate-submit handling.
- Golden flow scripts that prove the combat UX achieves its goal.

### 2.2 Out of Scope

Not included in v0.3:

- Reward screen interactions.
- Map screen interactions.
- Pet journal / memory / evolution screen interactions.
- Save/load UI.
- Settings menu details.
- Full controller/gamepad support.
- Full touch UI design.
- Final art, final animation, final asset list.
- Final balancing rules.
- Exact pixel coordinates.
- Full player-facing combat log.
- Full pile inspection UI.
- Exact damage prediction UI.
- Pet HP, pet injury, pet death, pet morale, or enemy pet-targeting systems.

These should be handled in later documents or later versions.

---

## 3. Source Design Decisions

This contract assumes the following decisions are already accepted.

### 3.1 Combat Composition

Combat uses a side-view party-versus-enemies formation.

```txt
[Keeper Avatar] [Ember Fox]       [Enemy 1] [Enemy 2] [Enemy 3]
```

The party is on the left. Enemies are on the right. Enemies attack leftward toward the Keeper by default.

The composition should not primarily use front-facing enemies that attack the camera/screen.

### 3.2 Keeper Presence

The Keeper appears on the battlefield as a small avatar or silhouette.

The Keeper avatar exists so that:

- enemies have a visible attack target;
- self-target cards have a visual anchor;
- pet guard effects have a protected target;
- the player-pet relationship is visible;
- command actions have a clear source.

The Keeper avatar is not a card and is not the main player stat display.

### 3.3 Player HUD

Player HP, block, and player statuses are displayed in the bottom-left Player HUD panel.

The Player HUD is the authoritative readout for player state. The battlefield Keeper avatar is the animation and targeting anchor.

### 3.4 Ember Fox Presence

Ember Fox stands on the battlefield as the active pet co-hero.

Ember Fox displays:

- pet sprite / silhouette;
- active pet base ring;
- optional Ember Charge pips;
- local pet status tray;
- command glow state.

Phase 1 does not show Ember Fox with an HP bar.

### 3.5 Enemy Presentation

Enemies are sprites or silhouettes, not cards.

Each enemy has:

- intent icon above;
- sprite/silhouette in the enemy slot;
- HP bar below;
- local status tray below HP;
- base target ring under the enemy.

### 3.6 Pet-Command Grammar

The orange command line always means:

```txt
card -> pet command relationship
```

It does not mean damage path.

For a pet-command attack card, the card points to Ember Fox with an orange line, while enemy target rings show which enemy will receive the effect.

### 3.7 Phaser/Core Boundary

Phaser presents and animates. Game-core decides combat rules.

Combat UI must not calculate gameplay outcomes, target validity, monster intents, status timing, or damage prediction by itself. It renders view-model state and plays game-core events.

---

## 4. Resolved Prior Decisions

Versions 0.2 and 0.3 resolve the currently known combat interaction questions as follows.

### 4.1 Pinned Detail and Targeting

Pinned detail panels suspend active targeting, but preserve the underlying selected card when possible.

Rules:

- Opening detail freezes combat input that could submit actions.
- If a card was selected before detail opened, remember the selection.
- Closing detail restores the selected/targeting state if it is still valid.
- If the selection is no longer valid, return to `player_turn_idle`.
- `Esc` closes detail first. If no detail is open, `Esc` cancels selected card.

### 4.2 No-Target and Self-Target Cards

No-target cards and self-target cards play on first click by default.

Rules:

- No-target utility card: click playable card once to play.
- Self-target card: click playable card once to play.
- Pet support card targeting the only active pet: click playable card once to play.
- Enemy-targeted cards still require target selection.
- Pet-command enemy-targeted cards require enemy target selection, while Ember Fox is auto-selected as the actor in Phase 1.
- Future high-risk cards may set `requiresConfirmation: true`, but default is false.

### 4.3 Exact Damage Prediction

Exact damage prediction is deferred to Phase 2.

Phase 1 shows:

- valid target rings;
- selected target ring;
- card rules text;
- enemy HP/status;
- enemy intent amount if provided by view model;
- clear event playback after action resolves.

Phase 1 does not show:

- projected enemy HP loss;
- ghost damage bars;
- fully calculated modifier-based previews;
- Phaser-calculated action outcomes.

If prediction is added later, it must come from core/view-model data such as `ActionPreviewViewModel`, not from duplicated Phaser combat logic.

### 4.4 Status Tray Overflow

Visible status icon limits are fixed for Phase 1:

```txt
Enemy status tray: 4 visible icons, then +N overflow
Player HUD status tray: 5 visible icons, then +N overflow
Pet status tray: 3 visible icons, then +N overflow
Card tag row: 4 visible tag icons, full list in detail panel
```

Overflow behavior:

- `+N` appears when status/tag count exceeds visible capacity.
- Hovering `+N` shows a compact tooltip list.
- Pinned detail shows the complete list.
- Newly applied statuses can briefly pop near the combatant before settling into visible tray or overflow.

### 4.5 Enemy Attack Amount Visibility

If attack amount is known and provided by the view model, it should be visible near the enemy intent icon.

Rules:

- Attack intent may show an amount such as `7`.
- Multi-hit may show `3x2` or a clear multi-hit marker.
- Unknown intent may show `?` or a special icon.
- Tooltip still explains the intent in words.
- Phaser does not calculate the amount.
- If amount is not implemented yet, show icon only.

### 4.6 Pet Charge Pips

Pet pips are not generic unexplained dots. Phase 1 uses a named pet resource:

```txt
Ember Charge
```

Rules:

- Ember Charge pips appear only when the mechanic exists or is active.
- If no pet charge mechanic is active, hide the pips rather than showing empty unexplained dots.
- Pips must not look like hearts or HP.
- Tooltip must explain current/max and what the charges do.
- `Banked Ember` is the first expected upgrade/mechanic that uses Ember Charge.

### 4.7 Draw and Discard Pile Interactions

Phase 1 requires hover tooltips and counts only.

Required:

- Draw pile displays count.
- Discard pile displays count.
- Hover draw/discard pile shows tooltip.
- Draw animations originate from draw pile.
- Played/end-turn cards animate to discard pile.

Deferred:

- Clicking draw pile to inspect full list.
- Clicking discard pile to inspect full list.
- Exhaust pile viewer.
- Full pile detail modal.

### 4.8 Card Hover Detail

Card hover uses the lifted/enlarged card itself as quick preview. It does not show a separate floating large tooltip by default.

Rules:

- Hover card immediately lifts.
- Hover card may scale slightly.
- Pet-command hover shows orange command line and targeting hints.
- Full card information is shown through pinned detail panel.
- Unplayable cards may show a small reason tooltip.

### 4.9 Keyboard Shortcuts

Phase 1 requires a minimal keyboard set:

```txt
Esc     close detail / cancel selected card
Space   end turn when no card is selected and no detail is open
```

Recommended but not required for first implementation:

```txt
1-9     select hand card by position
Tab     cycle valid targets
Enter   confirm selected target
I       open detail for hovered/selected item
```

### 4.10 UI Scaling

Phase 1 uses a fixed logical 16:9 layout with scale/letterbox.

Rules:

- Primary logical resolution: `1920x1080`.
- Minimum readability target: `1280x720`.
- Preserve aspect ratio.
- Use letterbox/pillarbox for non-16:9 browser windows.
- Do not implement responsive reflow for Phase 1.
- Do not design mobile portrait layout in Phase 1.
- Presenters must use layout helpers and safe margins, not scattered magic coordinates.
- Tooltips and detail panels must clamp inside safe screen bounds.

### 4.11 Combat Log

Player-facing combat log is deferred.

Phase 1 may have:

- debug-only event log;
- optional developer overlay showing recent `GameEvent[]`;
- no permanent player-facing log panel.

Combat events remain required for playback and testing. They are simply not shown as a full player-facing log in Phase 1.

### 4.12 Pet HP, Injury, Death, Morale

Phase 1 has none of these:

- pet HP;
- pet injury;
- pet death;
- pet revive;
- pet morale;
- enemy pet targeting.

Adding any of these later requires a separate design contract.

### 4.13 Future Active Pet Slots

Combat UI visually reserves up to 3 active pet slots:

```txt
1 active Ember Fox + 2 faint future pet slots
```

Rules:

- Phase 1 uses one active pet.
- The engine/view model must remain collection-based.
- UI practical target is 3 active pet slots max.
- Engine should not hard-limit future content to exactly 3 if data model can remain flexible.

### 4.14 Keeper Customization

Keeper customization is deferred.

Phase 1:

- Keeper avatar is class-based.
- View model may include `avatarKey` and `portraitKey`.
- No hair, gear, body, skin, or cosmetic customization UI.

### 4.15 Boss HP Bar

Separate large boss HP bar is deferred.

Phase 1:

- mini-boss / elite / boss-like enemies use normal enemy slot UI.
- Boss sprite can be larger, but HP/status remain local to enemy.
- No top boss HP bar unless a later contract explicitly adds it.

### 4.16 Card Aspect Ratio

Canonical card aspect ratio is:

```txt
5:7
```

Rules:

- Card frame assets should target 5:7.
- Phaser may scale cards, but should preserve ratio.
- Hand cards, hover cards, and detail cards use the same ratio.
- Card art, title, rules, tags, and cost areas should be designed inside this ratio.

### 4.17 End Turn Button

Final UI uses text plus icon.

Rules:

- Use code-rendered `End Turn` text.
- Add a small turn-arrow or hourglass icon if useful.
- Do not rely on a play-triangle alone.
- Button states must be clear: enabled, hover, pressed, disabled resolving, enemy turn.

### 4.18 Generated Art vs Code-Built UI

Generated art supports the skin. Code and presenters own dynamic UI composition.

Generated/image assets may include:

- background plates;
- Keeper avatar sprites;
- Ember Fox pose sprites;
- enemy sprites;
- card art windows;
- icon art;
- decorative card frames / panel skins;
- VFX sprites.

Code-rendered / Phaser-composed UI includes:

- text;
- numbers;
- HP bars;
- block bars;
- energy count;
- target rings;
- orange command line;
- status tray layout;
- card layout composition;
- hover outlines;
- selected states;
- tooltip placement;
- damage numbers;
- event sequencing.

### 4.19 Phase 1 UI-Supported Combat Caps

Phase 1 combat UI supports a deliberately bounded combat space.

Hard UI-supported caps:

```txt
Hand cards: 0-10
Enemies: 1-3
Active pet visual slots: up to 3
Enemy visible statuses: 4 + overflow
Player visible statuses: 5 + overflow
Pet visible statuses: 3 + overflow
Card visible tag icons: 4 + detail panel for full list
```

If game content exceeds these caps in Phase 1, treat it as unsupported content or a configuration error. Do not silently overflow off-screen or compress the UI until it becomes unreadable.

### 4.20 Stale State and Revision Handling

Combat view models should include a revision number.

Every gameplay UI request should carry the view model revision it was created from.

If a request arrives with a stale revision:

- do not apply the action blindly;
- ask the controller/core to revalidate or reject it;
- refresh the view model;
- clear or restore selection according to validity;
- show a safe feedback message if needed.

The UI must assume that animations, delayed clicks, and rapid user input can create stale interactions.

### 4.21 Duplicate-Submit Prevention

Once a card play or end-turn action is submitted, the UI must lock gameplay input immediately, before event playback starts.

This prevents:

- double-click playing the same card twice;
- double-click ending turn twice;
- card click plus keyboard shortcut submitting two actions;
- stale hover state submitting after resolution begins.

Use a request id, input lock, or both.

### 4.22 Overlay and Click-Through Rule

Pinned detail panels, pause overlays, confirmation modals, and menu overlays must capture clicks.

Closing a detail/modal consumes the click. The same click must not also select an enemy, play a card, or press End Turn underneath.

Quick tooltips usually do not capture clicks unless they contain interactive controls.

### 4.23 Targeting Priority During Overlap

During targeting, left-click priority belongs to target selection.

If a selected card can target an enemy, clicking anywhere inside that enemy's valid slot should select that enemy, including the enemy sprite, HP bar, status tray, or target ring.

Specific status or intent icons can still show hover tooltip. Opening detail for those icons during targeting should require right-click, an info key, or pinned-detail action.

### 4.24 Event Playback Failure Safety

Game state is authoritative. Animation is not.

If an animation fails, an asset is missing, an unknown event appears, or the browser loses focus during playback, the CombatEventPlayer must still finalize to the latest safe view model and unlock input when appropriate.

Event playback should never leave the game permanently input-locked.

### 4.25 Missing Data and Missing Asset Fallback

Missing art, missing icons, missing tooltip text, or missing card art must not block combat interaction.

Required fallback behavior:

- missing sprite: show placeholder silhouette;
- missing icon: show generic fallback icon;
- missing card art: show blank art window placeholder;
- missing tooltip: show title plus safe fallback text;
- unknown event: log debug warning and continue playback;
- unsupported Phase 1 state: show debug warning and use safe fallback if possible.

### 4.26 Combat Log Decision

Player-facing combat log remains deferred.

Debug event log is allowed and recommended during implementation. It should not become a permanent player UI panel in Phase 1.

---

## 5. Combat Screen Regions

The combat screen is divided into stable regions. Exact coordinates may change, but the meaning of each region should not.

```txt
┌──────────────────────────────────────────────────────────────┐
│ Combat Board                                         [Menu]  │
│                                                              │
│   [Keeper Avatar] [Ember Fox]        [Enemy Slots + Intents] │
│                                                              │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ [Player HUD] [Energy] [Draw] [Hand Cards] [Discard] [End]    │
└──────────────────────────────────────────────────────────────┘
```

### 5.1 Combat Board

The upper portion of the screen.

Owns:

- Keeper avatar;
- Ember Fox;
- future pet slot indicators;
- enemies;
- intent icons;
- HP bars and local status trays for enemies;
- target rings;
- pet-command line;
- combat VFX;
- floating feedback such as damage numbers or status popups.

### 5.2 Bottom HUD

The lower portion of the screen.

Owns:

- Player HUD;
- energy orb;
- draw pile;
- hand cards;
- discard pile;
- End Turn button.

Recommended order:

```txt
[Player HUD] [Energy Orb] [Draw Pile] [Hand Cards] [Discard Pile] [End Turn]
```

### 5.3 Overlay Layer

An interaction overlay above the board and HUD.

Owns:

- quick tooltips;
- pinned detail panels;
- modal confirmations if later needed;
- disabled-input overlay if needed;
- pause/settings overlay if the menu is opened.

### 5.4 Debug Layer

Debug-only overlay for development.

May show:

- recent events;
- hitboxes;
- layout anchors;
- target validity debug;
- current presentation state.

Must be hidden in normal player mode.

---

## 6. Rendering and Interaction Layers

Phaser should conceptually render combat in layers. Implementation can use containers, depth constants, or scene sublayers.

Recommended order, back to front:

1. `BackgroundLayer` — combat background plate.
2. `BoardEntityLayer` — Keeper avatar, Ember Fox, enemies.
3. `BoardUiLayer` — intent icons, HP bars, local status trays, base rings.
4. `HudLayer` — Player HUD, energy, piles, hand cards, End Turn.
5. `TargetingLayer` — valid target rings, selected target rings, orange command line.
6. `VfxLayer` — hit sparks, burn ticks, shield arcs, damage numbers.
7. `TooltipLayer` — quick hover tooltips.
8. `DetailLayer` — pinned detail panels and modal overlays.
9. `DebugLayer` — optional debug-only overlays.

Gameplay rules must not live in these layers. They display view-model state and consume game-core events.

---

## 7. Core Interaction Principles

### 7.1 Locality

State should appear close to the object it affects.

- Player statuses appear in Player HUD.
- Pet statuses appear near the pet ring.
- Enemy statuses appear below enemy HP.
- Enemy intents appear above enemies.

Do not use a global top status strip for Phase 1 combat.

### 7.2 One Visual Element, One Meaning

Avoid overloading visual cues.

- Orange line means pet-command only.
- Enemy ring means enemy targetability/selection.
- Pet pips mean Ember Charge or another named pet charge resource, not HP.
- Player HUD means player state.
- Keeper avatar means battlefield target/animation anchor.
- Intent icon means next enemy action.

### 7.3 Gameplay First, Flavor Second

Tooltips and detail panels may include flavor text, but gameplay information must appear first.

### 7.4 Hover Is Helpful, Not Mandatory Forever

Desktop Phase 1 may use hover heavily, but design should leave room for click-to-pin and long-press detail panels later.

### 7.5 Phaser Presents; Core Decides

Phaser may show highlights, tooltips, and animations. It must not decide combat rules.

Valid targets, playable state, intent data, status values, and event results should come from game-core or presentation view models built from game-core state.

### 7.6 Do Not Rely on Color Alone

Use color plus shape and motion.

Examples:

- pet-command uses orange line plus paw-rune badge;
- selected target uses thicker ring plus brightness;
- unplayable card uses dimming plus tooltip reason;
- statuses use icon shapes, not only colors.

---

## 8. Combat Scene States

The CombatScene should operate through explicit UI states. These are presentation states, not necessarily game-core lifecycle states.

### 8.1 State List

Recommended presentation states:

```txt
loading
intro
player_turn_idle
card_hover
card_selected
targeting
detail_open
resolving_player_action
enemy_turn_intro
enemy_action_preview
enemy_action_resolving
turn_transition
combat_victory
combat_defeat
paused
```

### 8.2 `loading`

Used before assets and initial view model are ready.

UI behavior:

- Show loading placeholder or simple fade-in.
- Disable all input.

Exit when combat view model and assets are available.

### 8.3 `intro`

Optional short combat start state.

UI behavior:

- Show combat board.
- Show initial enemies and party.
- Play `CombatStarted` / initial intent setup if available.
- Input is locked.

Can be skipped for early implementation.

### 8.4 `player_turn_idle`

Default active player state.

UI behavior:

- Hand cards are interactive.
- End Turn button is interactive.
- Hover tooltips are enabled.
- Valid actions are readable through card state.

### 8.5 `card_hover`

Entered when the pointer hovers a hand card without selecting it.

UI behavior:

- Card lifts immediately.
- Card scales subtly or moves to preview height.
- If the card is pet-command, orange line previews to Ember Fox.
- If the card is targetable, valid target rings may appear faintly.
- If card is unplayable, reason tooltip may appear after delay.

Should return to `player_turn_idle` when pointer leaves and no card is selected.

### 8.6 `card_selected`

Entered when the player clicks or begins selecting a card.

UI behavior:

- Selected card remains lifted.
- Selected card has stronger outline.
- UI shows required targeting information.
- Other hand cards dim slightly but remain visible.
- End Turn remains visible but may be visually deemphasized.

If no target is required, action may submit immediately instead of staying in selected state.

### 8.7 `targeting`

Entered when a selected card requires a target.

UI behavior:

- Valid targets show target rings or highlight.
- Invalid targets remain unhighlighted.
- The currently hovered target gets stronger highlight.
- Pet-command cards show orange line to pet.
- Normal attack cards do not show orange line.

Exit through:

- selecting a valid target;
- cancelling with right-click / Escape / clicking empty board;
- selecting a different card.

### 8.8 `detail_open`

Entered when the user opens a pinned detail panel.

UI behavior:

- Pinned detail panel appears.
- Combat action input is suspended.
- Existing selected card / targeting state is remembered.
- Hover tooltips behind the detail panel are suppressed.
- Close with Escape, close button, or safe outside click.

On close:

- Restore prior selected/targeting state if still valid.
- Otherwise return to `player_turn_idle`.

### 8.9 `resolving_player_action`

Entered after a valid action is submitted to game-core and events are returned.

UI behavior:

- Input is locked.
- Card movement, energy update, command line pulse, pet reaction, damage, status application, card move, and outcome are animated from emitted events.
- End Turn is disabled.
- Tooltips and selection are hidden or suppressed.

Exit when event playback completes and the resulting view model is rendered.

### 8.10 `enemy_turn_intro`

Entered after the player ends the turn.

UI behavior:

- End Turn button disabled.
- Hand cards are disabled or moving to discard.
- Enemy intents become visually emphasized.
- Optional short banner or turn indicator can appear.

### 8.11 `enemy_action_preview`

Optional state before each enemy action resolves.

UI behavior:

- Active enemy intent icon pulses.
- Active enemy target direction may briefly show a dashed line or target marker toward Keeper avatar.
- This should be brief, not always visible.

### 8.12 `enemy_action_resolving`

Enemy action event playback.

UI behavior:

- Active enemy animates or pulses.
- Attack/projectile travels left toward Keeper avatar by default.
- Player HUD updates if player is damaged or blocked.
- If guard/Tailguard applies, Ember Fox intercepts visually.
- Status applications pop and settle into local trays.

### 8.13 `turn_transition`

Short transition between enemy turn and next player turn.

UI behavior:

- New turn events play: energy refill, draw cards, status ticks, intent update.
- Input remains locked until complete.

### 8.14 `combat_victory`

Entered when combat is won.

UI behavior:

- Stop player card input.
- Play enemy defeat/fade if needed.
- Show minimal victory feedback.
- Transition to RewardScene or reward flow after event playback.

Reward UI is out of scope for this document.

### 8.15 `combat_defeat`

Entered when player loses.

UI behavior:

- Stop all input except continue/menu.
- Show defeat feedback.
- Transition to loss/run summary flow later.

Loss screen is out of scope for this document.

### 8.16 `paused`

Entered through menu button or pause shortcut.

UI behavior:

- Combat animation may pause if technically feasible.
- Input is redirected to pause overlay.
- Game-core state is not mutated by the pause overlay.

---

## 9. Input Model

### 9.1 Phase 1 Primary Input

Phase 1 primary input is mouse/trackpad.

Required:

- hover card;
- click card to select or play if no target is needed;
- click valid target to play targeted card;
- click another hand card to switch selection;
- click empty board / right-click / Escape to cancel selected targeting;
- click End Turn;
- hover status/intent/card/pet/enemy for quick tooltip;
- right-click, detail button, or info key to pin detail if implemented.

Drag-to-play is optional for Phase 1.

### 9.2 Required Keyboard Shortcuts

Required for Phase 1:

```txt
Esc     close detail; if no detail, cancel selected card/targeting
Space   end turn when player_turn_idle, no card selected, and no detail open
```

### 9.3 Recommended Keyboard Shortcuts

Recommended but not required for first implementation:

```txt
1-9     select hand card by position
Tab     cycle valid targets after card selected
Enter   confirm selected target / play selected card
I       open pinned detail for hovered/selected item
```

Keyboard support should not drive initial UI complexity, but the interaction model should not make it impossible.

### 9.4 Touch / Long Press

Touch is not a Phase 1 requirement, but do not design interactions that can only ever work through hover.

Future touch mapping:

- tap card = select;
- tap valid target = play;
- tap selected card again = cancel;
- long-press card/status/pet/enemy = detail panel;
- tap outside detail = close.

### 9.5 Controller

Controller support is out of scope.

---

## 10. Card Interaction

Cards are the main combat input.

### 10.1 Card States

Each hand card should have these display states:

```txt
idle
hovered
selected
playable
unplayable_insufficient_energy
unplayable_no_valid_target
unplayable_disabled_by_state
resolving
exhausted_or_moved
```

### 10.2 Idle Card

Display:

- normal size;
- normal frame;
- cost visible;
- art window visible;
- title and rules text visible when final text rendering exists;
- tag/type icons visible.

Interaction:

- hover enters `card_hover`.
- click selects or plays if player turn and card is interactable.

### 10.3 Hovered Card

Display:

- card lifts upward immediately;
- card may scale slightly;
- card shadow increases;
- rules text becomes easier to read if possible;
- playable card gets subtle glow;
- unplayable card remains dimmer.

If the card is a pet-command card:

- orange command preview line points to Ember Fox;
- Ember Fox base ring glows subtly;
- if targetable, valid enemy rings may appear faintly.

If the card is a normal targeted card:

- valid target rings may appear faintly;
- no orange command line.

If the card is self-targeting:

- Keeper avatar and Player HUD glow faintly.

### 10.4 Selected Card

Display:

- card stays lifted;
- stronger outline;
- other cards slightly dimmed;
- valid targets highlighted;
- selected card remains visibly connected to targeting state.

Interaction:

- click valid target = submit action.
- click another hand card = switch selection.
- click empty board / Escape / right-click = cancel selection.

### 10.5 Unplayable Card

Display:

- dimmed frame;
- cost may show warning state;
- tooltip explains why it cannot be played.

Common reasons:

- insufficient energy;
- no valid target;
- card disabled by status;
- not player's turn;
- event playback in progress;
- no active commandable pet.

Unplayable card hover should still allow detail inspection.

### 10.6 Resolving Card

Display:

- selected/played card moves to play area or rises from hand;
- input disabled;
- card resolves through event playback;
- after resolution, card moves to discard/exhaust/other pile according to game-core events.

Do not move cards to discard before game-core returns events.

### 10.7 Card Detail Preview

Hovering a card should support quick preview through the card itself. Pinning should support full detail.

Phase 1 quick preview:

- card lifts;
- card may scale slightly;
- no separate floating card tooltip by default.

Pinned card detail should show:

- card name;
- cost;
- card family/type;
- target type;
- tags;
- rules text;
- keyword explanations;
- one-line flavor note if available.

Details are specified further in Section 19.

---

## 11. Card Families and Targeting Behavior

### 11.1 Normal Enemy-Targeted Card

Example role: direct player attack.

Hover:

- card lifts;
- valid enemy rings appear faintly;
- no orange command line.

Selected:

- valid enemy rings appear;
- hovered enemy ring strengthens.

Play:

- submit action with card instance and enemy target;
- Keeper avatar may play command/attack pose;
- selected enemy receives impact through events.

### 11.2 Self-Targeted Card

Example role: gain block, draw, self buff.

Hover:

- Keeper avatar glows;
- Player HUD glows;
- if card grants block, shield badge can preview/pulse.

Play:

- click playable card once to play by default;
- submit action with self target or no explicit target depending on core model;
- Player HUD updates from events.

### 11.3 Pet-Command Enemy-Targeted Card

Example: `Fox Bite`.

Hover:

- card lifts;
- orange command line points to Ember Fox;
- Ember Fox ring glows;
- valid enemy rings appear faintly.

Selected:

- orange line remains;
- valid enemy rings remain;
- hovered enemy ring strengthens;
- selected enemy ring becomes strongest.

Play:

- submit action with card instance, pet actor, and enemy target.
- Phase 1 auto-selects Ember Fox as the pet actor.
- Event playback should show card -> pet -> target.

Visual grammar:

```txt
orange line = who receives the command
enemy ring = who receives the effect
pet animation = how the effect is executed
```

### 11.4 Pet-Command Self/Guard Card

Example: `Tailguard`.

Hover:

- orange command line points to Ember Fox;
- Ember Fox ring glows;
- Keeper avatar and Player HUD show guard/block preview.

Play:

- if no target choice is needed, click playable card once to play;
- submit action with pet actor and player/self target if needed;
- event playback should show Ember Fox guarding Keeper.

### 11.5 Pet Support Card

Example: empower next pet command.

Hover:

- orange command line points to Ember Fox;
- Ember Fox ring and relevant pips/status tray preview update.

Play:

- if only one active pet, click playable card once to play;
- if future multiple active pets exist, valid pet rings appear and player selects pet;
- pet status/charge update through events.

### 11.6 Area-of-Effect Enemy Card

Hover:

- all affected enemy rings glow faintly;
- no single selected target if all enemies are affected;
- card preview can show all-enemy target pattern.

Play:

- click playable card once if no target choice is needed;
- submit action with no enemy target or an AOE target spec, depending on core design;
- event playback resolves effects in the order emitted by game-core.

### 11.7 No-Target Utility Card

Example: draw cards, gain energy.

Hover:

- card lifts;
- relevant HUD area may preview effect if simple.

Play:

- click playable card once to play;
- event playback handles draw/energy/status effects.

### 11.8 Future Multi-Pet Card

Out of Phase 1 for full implementation, but UI must not block it.

Future targeting possibilities:

- leading pet;
- specific pet;
- all active pets;
- random active pet;
- pet with tag.

Phase 1 UI may show faint inactive pet slots, but only Ember Fox is selectable.

---

## 12. Targeting System

### 12.1 Target Ring States

Enemy target rings should support these states:

```txt
hidden
valid
hovered
selected
invalid
impact
```

Pet ring states:

```txt
inactive
active
command_hover
command_selected
empowered
resolving
```

Keeper avatar/HUD target states:

```txt
neutral
self_hover
self_selected
enemy_attack_preview
guard_preview
damage_impact
```

### 12.2 Valid Target Preview

When a selected card requires a target:

- all valid targets show faint rings;
- invalid combatants do not highlight;
- selected/hovered target gets stronger ring.

Target validity must come from core/view-model data, not duplicated Phaser rules.

### 12.3 Target Selection

Clicking a valid target submits the action.

Clicking an invalid target should:

- not submit action;
- show small negative feedback such as shake or tooltip;
- keep the card selected.

Clicking empty board should cancel selection, unless a modal/detail panel is open.

### 12.4 Default Targeting

Some cards may have default targets.

Examples:

- self cards target Keeper/player;
- pet support cards target active pet if only one active pet exists;
- no-target utility cards play immediately.

Default target behavior must be explicit in card definition/view model.

### 12.5 Target Preview Values

Exact target preview values are deferred.

Phase 1 should not calculate predicted damage or exact status changes in Phaser.

If added later, previews should be visually conservative and must not contradict game-core results.

Possible future previews:

- ghost block amount on Player HUD;
- small projected HP loss marker on enemy HP bar;
- status icon ghost in target status tray.

Do not implement prediction logic in Phaser unless supplied by core/view-model.

---

## 13. Keeper Battlefield Avatar

### 13.1 Purpose

The Keeper avatar is the battlefield representation of the player.

It supports:

- enemy attack direction;
- self-card target clarity;
- pet guard readability;
- command source animation;
- player-pet relationship.

### 13.2 Display

Recommended display:

- small silhouette or sprite;
- left side of combat board;
- slightly behind Ember Fox;
- faces right toward enemies;
- no HP bar above head;
- no permanent status icons above head.

### 13.3 States

Recommended visual states:

```txt
idle
command
self_target_hover
guarded
damage_impact
defeated
```

### 13.4 Interactions

Hovering Keeper avatar:

- shows quick tooltip or Player Quick Panel;
- if a self-target card is selected, Keeper avatar highlights.

Clicking Keeper avatar:

- if selected card can target self, play/confirm target;
- otherwise may open Player Quick Panel only if appropriate.

### 13.5 Relationship to Player HUD

The Player HUD is the authoritative numeric readout.

Keeper avatar is the visual target and animation anchor.

When player takes damage:

- Keeper avatar flashes/shakes;
- Player HUD HP/block updates and pulses.

When player gains block:

- Player HUD shield pulses;
- optional small shield effect appears near Keeper avatar.

---

## 14. Player HUD

### 14.1 Display

Player HUD lives in the bottom-left HUD area.

It should display:

- portrait/class icon;
- HP bar;
- block shield badge or block bar;
- local player status tray.

Player status tray visible limit:

```txt
5 visible icons, then +N overflow
```

### 14.2 Interactions

Hover Player HUD:

- show Player Quick Tooltip.

Click / inspect Player HUD:

- open pinned Player Detail Panel if implemented.

When self-target card is hovered/selected:

- Player HUD glows.

When player is damaged:

- HP bar updates;
- damage number may float near Keeper avatar or Player HUD;
- Player HUD briefly pulses red or shakes.

When block changes:

- shield badge pulses;
- block bar updates.

### 14.3 Player Quick Tooltip

Should show:

```txt
Keeper
HP: current / max
Block: current
Statuses: short list
```

If there are no statuses, omit or show `No active statuses`.

### 14.4 Player Detail Panel

Pinned detail may show:

- class name;
- HP/max HP;
- block;
- all statuses with explanations;
- current turn effects;
- optional deck/hand/discard summary.

Phase 1 can keep this minimal.

---

## 15. Ember Fox Pet Area

### 15.1 Display

Ember Fox appears on the battlefield near the Keeper.

Display elements:

- Ember Fox sprite/silhouette;
- active pet base ring;
- optional Ember Charge pips around or near ring;
- local pet status tray;
- command glow state.

### 15.2 No Phase 1 Pet HP

Do not show an HP bar for Ember Fox in Phase 1.

Reason: pet HP implies enemy pet targeting, pet injury/death, revive, protection, and additional balance systems.

Pet charge pips must not look like HP.

### 15.3 Ember Charge Pips

Phase 1 pet charge mechanic name:

```txt
Ember Charge
```

Ember Charge represents pet-specific temporary stored power, expected to be used by `Banked Ember` or similar upgrade mechanics.

Display rules:

- show only when mechanic exists or is active;
- hide pips if no active charge mechanic exists;
- use ember dots/pips, not hearts;
- recommended max visible pips: 3;
- tooltip must explain current/max and effect.

Suggested tooltip:

```txt
Ember Charge 2 / 3
Stored by Ember Fox.
At full charge, the next pet-command card is empowered.
```

Final text must match game-core behavior.

### 15.4 Pet Status Tray

Local tray below or near pet ring.

Can display:

- ready;
- commanded this turn;
- empowered;
- guarding;
- temporary debuff if later introduced.

Pet status tray visible limit:

```txt
3 visible icons, then +N overflow
```

Do not display a long row of empty slots unless needed for layout debugging.

### 15.5 Pet Hover Tooltip

Hovering Ember Fox should show a combat-relevant Pet Quick Tooltip.

Suggested content:

```txt
Ember Fox
Role: Burn / Command / Guard
State: Ready / Commanded / Empowered / Guarding
Ember Charge: 2 / 3, if active
Active upgrades: short icon list if any
```

Do not show full bond story, memories, or evolution tree in combat tooltip.

### 15.6 Pet Detail Panel

Pinned pet detail may show:

- pet name;
- pet role;
- current command state;
- current charges if active;
- active pet upgrades relevant to combat;
- current pet statuses with explanations;
- hint to open Pet Journal later, if that screen exists.

### 15.7 Pet Interactions

When pet-command card is hovered:

- pet ring glows;
- orange command line points to pet;
- pet may switch to command-ready pose if not too noisy.

When pet-command card resolves:

- pet ring pulses;
- pet pose changes;
- pet attacks, guards, or reacts according to events.

When pet gains charge:

- charge pip fills or pulses.

When pet status changes:

- status icon pops near pet and settles into pet status tray.

---

## 16. Future Pet Slots

### 16.1 Display

Future pet slots may appear as faint inactive rune circles near the Keeper/Ember Fox party cluster.

Rules:

- subtle;
- small;
- low contrast;
- no heavy lock icons;
- not visually equal to active Ember Fox;
- do not look like monetized slots.

### 16.2 Phase 1 Behavior

Phase 1:

- only Ember Fox is active;
- inactive slots are non-interactive or show a tiny tooltip;
- pet-command cards auto-target Ember Fox as pet actor.

### 16.3 Visual Capacity

Combat UI practical target:

```txt
up to 3 active pet slots
```

Phase 1 renders:

```txt
1 active pet + 2 faint future slots
```

The engine/model should stay collection-based and should not assume exactly one pet forever.

### 16.4 Tooltip

Hover inactive pet slot:

```txt
Inactive Pet Slot
Future classes may support more active pets.
```

Optional: hide this tooltip in production until multi-pet content is closer.

---

## 17. Enemy Presentation

### 17.1 Display

Each enemy slot displays:

- intent icon above;
- enemy sprite/silhouette;
- HP bar below;
- local enemy status tray below HP;
- base target ring under enemy.

Enemies should not look like hand cards.

### 17.2 Enemy Intent

Enemy intent appears above the enemy.

Intent examples:

```txt
attack
defend
buff
debuff
special
unknown
charging
```

Intent icon should be readable at small size.

If attack amount is known and implemented, show it near the icon.

### 17.3 Enemy HP

HP bar displays current and max HP.

Damage updates should animate through event playback.

If enemy has block/shield, use a small shield badge near HP bar rather than replacing HP.

### 17.4 Enemy Status Tray

Status tray appears below HP.

Can show:

- burn;
- mark;
- shield/block;
- strength-like buff;
- vulnerability-like debuff;
- special boss state.

Enemy status tray visible limit:

```txt
4 visible icons, then +N overflow
```

### 17.5 Enemy Hover Tooltip

Hover enemy sprite, HP bar, intent, or status tray should show enemy quick info.

Suggested enemy quick tooltip:

```txt
Enemy Name
HP: current / max
Intent: Attack the Keeper / Defend / Buff / Special
Statuses: Burn 3, Marked, etc.
```

If hovering a specific status icon, show status tooltip instead of full enemy tooltip.

### 17.6 Enemy Detail Panel

Pinned enemy detail may show:

- name;
- HP/max HP;
- block if any;
- intent details;
- all statuses;
- enemy traits if implemented;
- target validity if a card is selected.

### 17.7 Enemy Selection

If a selected card can target enemies:

- valid enemies get faint rings;
- hovered enemy gets stronger ring;
- clicked enemy becomes selected target and action is submitted.

If enemy is not a valid target:

- no ring or disabled ring;
- click gives invalid feedback.

### 17.8 Bosses and Large Enemies

Phase 1 does not use a separate large boss HP bar.

Large enemies may:

- use a larger sprite;
- use a larger local HP bar;
- retain local status tray;
- retain overhead intent.

A top boss bar requires a later design update.

---

## 18. Tooltip and Detail System

The combat UI needs a shared information system.

### 18.1 Three Information Levels

#### Level 1 — Always Visible

Always visible information includes:

- card cost;
- card family/type visual badge;
- player HP/block/status tray;
- pet ring/status/charges;
- enemy intent;
- enemy HP/status tray;
- target rings during targeting;
- energy;
- draw/discard piles;
- End Turn button.

#### Level 2 — Quick Tooltip

Small hover tooltip, usually 1–4 lines.

Used for:

- status icons;
- intent icons;
- energy;
- piles;
- pet pips;
- card tags;
- enemy hover;
- player HUD hover.

#### Level 3 — Pinned Detail Panel

Larger panel for reading.

Used for:

- card detail;
- enemy detail;
- pet detail;
- player detail;
- keyword explanations;
- complex status explanations.

Should be opened by right-click, info key, detail button, long hover, or future long press.

### 18.2 Tooltip Priority

When multiple elements overlap, priority should be:

1. selected/hovered hand card;
2. specific status / intent icon;
3. selected or hovered target;
4. enemy/pet/player general hover;
5. energy / piles / buttons;
6. background none.

Specific icon tooltip should override general unit tooltip.

### 18.3 Tooltip Placement

Tooltip should avoid covering:

- hovered hand card;
- target being selected;
- End Turn button;
- player HP if relevant;
- card rules text.

Preferred placement:

- above hand for cards;
- near but offset from status icons;
- inside safe screen margins;
- never off-screen.

Tooltips must clamp inside the 16:9 safe bounds.

### 18.4 Tooltip Timing

Default delays:

```txt
Status/intent icon tooltip: 250 ms
Card lift: immediate
Card unplayable reason: 250-350 ms
Enemy/pet/player general tooltip: 350 ms
Pinned detail: explicit action, no delay
```

### 18.5 Tooltip During Targeting

During targeting:

- target highlights are more important than tooltips;
- show quick target tooltip only if it does not obscure rings;
- pinned detail suspends targeting.

### 18.6 Pinned Detail Behavior

When pinned detail opens:

- suspend active targeting/action input;
- preserve selected card if possible;
- suppress hover tooltips behind the detail panel;
- close with Escape, close button, or safe outside click;
- after closing, restore previous selected/targeting state if still valid;
- otherwise return to `player_turn_idle`.

### 18.7 Tooltip Content Ownership

Tooltip content should come from data/view-models, not hardcoded Phaser presenter logic.

Phaser may format/render tooltips, but the source content should be provided by:

- card detail data;
- status definitions/view models;
- intent view models;
- pet upgrade/status data;
- keyword definitions.

---

## 19. Card Detail Content

Card detail must prioritize gameplay clarity.

### 19.1 Required Card Detail Fields

Pinned card detail should support:

```txt
Card name
Cost
Card family/type
Target type
Tags
Rules text
Keyword explanations
Flavor note
```

### 19.2 Card Family/Type

Examples:

```txt
Attack
Skill
Pet-Command
Power
Pet Support
Other
```

The exact taxonomy may change, but pet-command identity must be explicit.

### 19.3 Target Type

Examples:

```txt
Enemy
Self
Active Pet
All Enemies
No Target
Pet + Enemy
Pet + Self
```

Pet-command attack cards should clearly show both:

- actor: Ember Fox / active pet;
- effect target: selected enemy.

### 19.4 Tags

Examples:

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
finisher
```

Card tag row visible limit:

```txt
4 visible tags, full list in detail panel
```

Tags should have tooltip explanations where useful.

### 19.5 Keyword Explanations

Card detail should list relevant keyword explanations below rules text.

Example:

```txt
Keywords
Burn: Damages at turn start, then decreases.
Pet-Command: Sends a command to the active pet.
Guard: Helps protect the Keeper from incoming damage.
```

This avoids needing per-word hover inside Phaser text in Phase 1.

### 19.6 Flavor Note

A one-sentence field-journal note is allowed.

Rules:

- optional;
- one sentence only;
- visually secondary;
- never above gameplay rules;
- omit if it causes clutter.

Example:

```txt
Field Note: Ember Fox waits for the smallest hand signal before it lunges.
```

### 19.7 Card Aspect Ratio

Canonical card aspect ratio:

```txt
5:7
```

Rules:

- all card frames use this ratio;
- scaling preserves ratio;
- text layout and art window are designed within this ratio;
- generated card images should not bake in final text or numbers.

---

## 20. Status and Keyword Tooltips

### 20.1 Status Tooltip Required Fields

Every status tooltip should be able to show:

```txt
Name
Stack or value
Duration, if any
Timing
Expiration or decay rule
Short gameplay explanation
```

### 20.2 Burn Tooltip

Burn is an important Phase 1 status.

Suggested tooltip:

```txt
Burn 4
At the start of this unit's turn, take 4 damage ignoring Block.
Then Burn decreases. Expires at 0.
```

If final rules differ, the tooltip must match game-core behavior.

### 20.3 Block Tooltip

Suggested tooltip:

```txt
Block 6
Prevents incoming attack damage.
Usually resets at the end of the turn.
```

If block timing differs, update this text.

### 20.4 Mark Tooltip

Suggested tooltip:

```txt
Marked
Certain cards or pet commands have extra effects against this target.
```

### 20.5 Empowered Tooltip

Suggested tooltip:

```txt
Empowered
The next pet-command card gains an extra effect.
Removed after use.
```

### 20.6 Guard Tooltip

Suggested tooltip:

```txt
Guard
Ember Fox is ready to help protect the Keeper.
```

Exact mechanics must match game-core.

### 20.7 Ember Charge Tooltip

Suggested tooltip:

```txt
Ember Charge 2 / 3
Stored by Ember Fox.
At full charge, the next pet-command card is empowered.
```

Exact mechanics must match the pet upgrade/modifier data.

### 20.8 Overflow Status Tooltip

If a unit has more statuses than visible icons:

- show first few icons;
- show `+N` overflow icon;
- hovering `+N` opens compact list;
- pinned detail shows full list.

---

## 21. Enemy Intent Tooltips

### 21.1 Required Intent Tooltip Fields

Enemy intent tooltip should show:

```txt
Intent name
Target hint
Amount, if known
Short explanation
```

### 21.2 Attack Intent

If amount is known:

```txt
Attack
This enemy will attack the Keeper.
Damage: 7
```

If damage amount is not revealed or not implemented:

```txt
Attack
This enemy will attack the Keeper.
```

### 21.3 Multi-Hit Attack Intent

If multi-hit is known:

```txt
Attack
This enemy will attack the Keeper.
Damage: 3 x 2
```

Intent icon may display `3x2` or another readable compact marker.

### 21.4 Defend Intent

```txt
Defend
This enemy will gain Block or protect itself.
```

### 21.5 Buff Intent

```txt
Buff
This enemy will strengthen itself or an ally.
```

### 21.6 Debuff Intent

```txt
Debuff
This enemy will apply a negative status.
```

### 21.7 Special Intent

```txt
Special
This enemy will use a unique action.
```

Special intents should be clear enough that players do not feel cheated.

### 21.8 Intent Target Hint

Intent view model should include target hint where possible.

Examples:

```txt
keeper
self
ally
allEnemies
pet
unknown
```

Phase 1 default enemy attack target is `keeper`.

---

## 22. Energy, Piles, and End Turn

### 22.1 Energy Orb

Energy is separate from Player HUD.

Display:

- current energy;
- optional max energy;
- ember-themed orb.

Interactions:

- hover shows tooltip;
- pulse on energy spend;
- refill animation at turn start;
- warning pulse if player tries unaffordable card.

Tooltip:

```txt
Energy
Spend energy to play cards.
Refills at the start of your turn.
```

### 22.2 Draw Pile

Draw pile appears left of hand.

Display:

- face-down card stack;
- count rendered by code.

Interactions:

- hover shows count and short tooltip;
- draw animations originate here;
- reshuffle animation may move discard to draw.

Tooltip:

```txt
Draw Pile
Cards remaining to draw: N
```

Phase 1 click behavior:

- no full pile viewer required;
- may show tooltip only.

### 22.3 Discard Pile

Discard pile appears right of hand.

Display:

- face-up or tilted stack;
- count rendered by code.

Interactions:

- played and end-turn cards animate here;
- hover shows count;
- future click can open pile view, but not required in Phase 1.

Tooltip:

```txt
Discard Pile
Cards here return to the draw pile when reshuffled.
Cards in discard: N
```

### 22.4 Exhaust Pile

Out of scope unless exhaust exists in Phase 1.

Do not show a third pile unless the mechanic exists.

### 22.5 End Turn Button

Bottom-right button.

Final UI:

- code-rendered `End Turn` text;
- optional small turn-arrow/hourglass icon;
- not a play-triangle alone.

States:

```txt
enabled
hovered
pressed
disabled_resolving
disabled_enemy_turn
```

Click behavior:

- if enabled, submit end-turn action to controller/core;
- lock input;
- play discard/end-turn/enemy-turn events.

Tooltip:

```txt
End Turn
End your turn and let enemies act.
```

Keyboard:

- `Space` activates End Turn only when no card is selected, no detail is open, and it is player idle state.

---

## 23. Pet-Command Line

### 23.1 Meaning

The orange command line means:

```txt
This card commands Ember Fox / active pet.
```

It does not mean:

- the enemy target;
- damage path;
- projectile path;
- generic card targeting.

### 23.2 When It Appears

Show orange command line when:

- pet-command card is hovered;
- pet-command card is selected;
- pet-command event is resolving.

Do not show it for:

- normal attack cards;
- normal self cards;
- enemy attacks;
- generic card hover.

### 23.3 Visual Treatment

Recommended:

- curved line from selected/hovered card to Ember Fox;
- warm ember/orange color;
- subtle glow;
- not too thick;
- should not cover important card text;
- should not point to enemy target.

### 23.4 During Resolution

On `PetCommanded` event:

- command line pulses toward Ember Fox;
- Ember Fox ring glows;
- optional small rune flash on Keeper avatar or card.

Then later events animate pet response.

---

## 24. Enemy Attack Grammar

### 24.1 Default Target

In Phase 1, enemies attack the Keeper/player by default.

This is visually expressed by:

- side-view enemy facing left;
- attack VFX traveling left;
- Keeper avatar as impact anchor;
- Player HUD as state update readout.

### 24.2 Attack Preview

Do not constantly display dashed attack lines from all enemies.

Attack preview lines may appear:

- when hovering enemy intent;
- during enemy action preview;
- in tutorial/debug mode.

Persistent attack lines would clutter the board.

### 24.3 Enemy Attack Resolution

Expected visual sequence:

1. enemy intent icon pulses;
2. enemy wind-up / lunge / projectile begins;
3. VFX moves left toward Keeper avatar;
4. if block/guard applies, shield impact appears;
5. Keeper avatar flashes or guarded pose plays;
6. Player HUD block/HP updates;
7. any status icons pop and settle.

### 24.4 Tailguard / Guard Intercept

If Ember Fox guards the Keeper:

- Ember Fox moves/poses between enemy and Keeper;
- guard arc or tail shield appears;
- Player HUD shield/block area pulses;
- event log/status tray reflects guard/block result.

### 24.5 Future Pet Targeting

Phase 1 does not implement enemy pet targeting.

If future enemies can attack pets:

- intent must clearly show pet target marker;
- pet UI must support condition/impact feedback;
- core rules must define pet injury/condition consequences;
- this should not be silently introduced.

---

## 25. Combat Event Playback

Game-core emits events. Phaser plays them.

### 25.1 General Rules

- Input locks during event playback.
- Events play in emitted order unless an explicit event-player batching rule exists.
- Visuals should not create gameplay outcomes.
- After playback, render latest view model from state.
- If playback is skipped/fast-forwarded later, final state must still render correctly.

### 25.2 Event-to-Visual Mapping

Recommended mapping:

```txt
CombatStarted
-> fade in board, show party/enemies, show initial intents

TurnStarted
-> turn indicator, energy refill, draw sequence, status ticks if emitted here

CardDrawn
-> card animates from draw pile to hand

CardPlayed
-> selected card lifts/moves to play area

EnergySpent
-> energy orb pulses and updates

CardMoved
-> card moves hand -> discard/exhaust/etc.

PetCommanded
-> orange command line pulses from card to Ember Fox
-> pet ring glows

PetModifierActivated
-> pet status/upgrade icon pulses
-> optional small icon pop

PetReacted
-> Ember Fox pose swap / dash / guard motion

DamageDealt
-> target shakes/flashes
-> HP bar updates
-> damage number appears if used

BlockGained
-> shield badge/bar pulses on target HUD/status area

StatusApplied
-> status icon pops near target
-> icon settles into local status tray

StatusExpired
-> status icon fades/removes from tray

CombatantDefeated
-> defeated combatant fades/sinks/shatters

MonsterIntentSet
-> intent icon appears/updates above enemy

CombatEnded
-> lock combat input, play victory/defeat transition
```

### 25.3 Event Grouping

Some events may be grouped visually for smoothness, but ordering must remain understandable.

Example:

- `CardPlayed` and `EnergySpent` can animate nearly together.
- `PetCommanded` should visibly precede `PetReacted`.
- `DamageDealt` should visibly precede `StatusApplied` if that is the event order.

### 25.4 Playback Speed

Initial implementation can use fixed durations.

Recommended rough timings:

```txt
Card lift/play: 150-250 ms
Energy pulse: 150 ms
Command line pulse: 250-400 ms
Pet dash/guard: 300-500 ms
Hit flash/shake: 150-250 ms
Status pop/settle: 250-350 ms
Enemy action preview: 300-500 ms
```

These are starting points, not final tuning.

### 25.5 Skip/Fast Mode

Not required in v0.3, but event player should not make it impossible.

If added later:

- click/keyboard can speed up animations;
- final state must still match core state.

### 25.6 Debug Event Log

A debug-only event log may show emitted events during development.

Rules:

- not player-facing in Phase 1;
- useful for testing event order;
- must not replace visual event playback.

---

## 26. Player Turn Flow

### 26.1 Start of Player Turn

Expected sequence:

1. game-core produces turn start events;
2. energy refills;
3. cards draw;
4. statuses tick/expire if relevant;
5. enemy intents update if timing requires;
6. input unlocks.

UI state ends in `player_turn_idle`.

### 26.2 Hover Card

1. pointer enters card;
2. card lifts;
3. quick visual preview appears;
4. if pet-command, orange line to Ember Fox appears;
5. if targetable, valid target rings may appear faintly;
6. tooltip appears after delay if needed.

### 26.3 Select or Play Card

1. player clicks card;
2. if no target is required, submit immediately;
3. if target is required, card enters selected state and UI enters `targeting`;
4. if card is unplayable, show reason feedback.

### 26.4 Select Target

1. valid targets are highlighted;
2. player clicks target;
3. controller submits action request to game-core;
4. if action is valid, events return and UI enters `resolving_player_action`;
5. if action is invalid, show error feedback and keep/cancel selection according to recoverability.

### 26.5 Resolve Card

1. play events;
2. update view model;
3. restore player input if combat continues and it is still player's turn;
4. transition to victory/defeat if combat ended.

### 26.6 End Turn

1. player clicks End Turn or presses Space in allowed state;
2. input locks;
3. remaining hand cards move according to game-core events;
4. enemy turn begins;
5. enemy actions resolve;
6. next player turn begins or combat ends.

---

## 27. Invalid Actions and Error Feedback

### 27.1 Invalid Action Sources

Common invalid actions:

- insufficient energy;
- card not in hand;
- invalid target;
- no active pet for pet-command card;
- target defeated before action resolves;
- combat already ended;
- not player's turn;
- input during event playback.

### 27.2 Feedback Rules

Invalid action should not throw UI into broken state.

Display:

- small card shake;
- short tooltip/error message;
- subtle red/grey feedback;
- keep or clear selection depending on recoverability.

Examples:

```txt
Not enough energy.
Choose a valid enemy.
Ember Fox is not ready.
Cannot play during enemy turn.
```

### 27.3 Recoverability Rules

Recoverable invalid cases keep the selected card:

- clicked invalid target;
- target temporarily invalid but another valid target exists;
- insufficient energy discovered while hovering/attempting.

Unrecoverable invalid cases clear selection:

- card no longer in hand;
- no active commandable pet for a pet-command card;
- combat ended;
- selected card no longer exists after state update.

### 27.4 Core vs UI Validation

UI may visually disable obviously invalid cards using view-model data.

Game-core must still validate action on submit.

If core rejects, UI shows error and re-renders latest safe view model.

---

## 28. View-Model Requirements

Combat UI needs a serializable view model. Exact TypeScript names may change, but the data shape should support these concepts.

### 28.1 Combat View Model

Recommended high-level shape:

```ts
type CombatViewModel = {
  combatId: string;
  revision: number;
  phase: 'playerTurn' | 'enemyTurn' | 'resolving' | 'won' | 'lost';
  turnNumber: number;
  activeSide: 'player' | 'enemy' | 'none';
  inputLock?: CombatInputLockViewModel;
  unsupportedPresentationWarnings?: string[];
  player: PlayerCombatViewModel;
  pets: PetCombatViewModel[];
  enemies: EnemyCombatViewModel[];
  hand: CardInHandViewModel[];
  piles: PileViewModel;
  energy: EnergyViewModel;
  validTargetsByCardInstanceId: Record<string, TargetPreviewViewModel>;
  uiHints?: CombatUiHintsViewModel;
};

type CombatInputLockViewModel = {
  locked: boolean;
  reason?: 'loading' | 'resolving' | 'enemyTurn' | 'detailOpen' | 'paused' | 'transition' | 'submitting';
};
```

### 28.2 Player View Model

```ts
type PlayerCombatViewModel = {
  id: string;
  displayName: string;
  className: string;
  hp: number;
  maxHp: number;
  block: number;
  statuses: StatusViewModel[];
  avatarKey: string;
  portraitKey?: string;
  isDefeated: boolean;
};
```

### 28.3 Pet View Model

```ts
type PetCombatViewModel = {
  petInstanceId: string;
  definitionId: string;
  displayName: string;
  slotIndex: number;
  isActive: boolean;
  isCommandable: boolean;
  spriteKey: string;
  ringState: 'inactive' | 'active' | 'commandHover' | 'resolving' | 'empowered';
  chargePips?: {
    current: number;
    max: number;
    label: 'Ember Charge' | string;
    tooltip: TooltipContent;
  };
  statuses: StatusViewModel[];
  activeUpgradeIcons?: IconRefViewModel[];
};
```

No `hp` field is required for Phase 1 pet display unless future design adds pet condition/HP.

### 28.4 Enemy View Model

```ts
type EnemyCombatViewModel = {
  combatantId: string;
  definitionId: string;
  displayName: string;
  hp: number;
  maxHp: number;
  block: number;
  statuses: StatusViewModel[];
  intent: IntentViewModel;
  spriteKey: string;
  isDefeated: boolean;
  targetRingState?: 'hidden' | 'valid' | 'hovered' | 'selected' | 'impact';
};
```

### 28.5 Intent View Model

```ts
type IntentViewModel = {
  intentId: string;
  kind: 'attack' | 'defend' | 'buff' | 'debuff' | 'special' | 'unknown' | 'charging';
  iconKey: string;
  amount?: number;
  amountLabel?: string; // e.g. '7' or '3x2'
  targetHint?: 'keeper' | 'self' | 'ally' | 'allEnemies' | 'pet' | 'unknown';
  tooltip: TooltipContent;
};
```

### 28.6 Status View Model

```ts
type StatusViewModel = {
  statusId: string;
  iconKey: string;
  displayName: string;
  stacks?: number;
  duration?: number;
  isBuff?: boolean;
  isDebuff?: boolean;
  tooltip: TooltipContent;
};
```

### 28.7 Card View Model

```ts
type CardInHandViewModel = {
  cardInstanceId: string;
  definitionId: string;
  displayName: string;
  cost: number;
  cardFamily: 'attack' | 'skill' | 'petCommand' | 'power' | 'petSupport' | 'other';
  targetType: 'enemy' | 'self' | 'activePet' | 'petAndEnemy' | 'petAndSelf' | 'allEnemies' | 'none';
  tags: IconRefViewModel[];
  artKey?: string;
  frameKey: string;
  rulesText: string;
  playableState: 'playable' | 'insufficientEnergy' | 'noValidTarget' | 'disabled';
  unplayableReason?: string;
  requiresConfirmation?: boolean;
  detail: CardDetailViewModel;
};
```

### 28.8 Target Preview View Model

```ts
type TargetPreviewViewModel = {
  cardInstanceId: string;
  requiresTarget: boolean;
  actorPetInstanceId?: string;
  validEnemyIds: string[];
  validPetInstanceIds: string[];
  canTargetPlayer: boolean;
  targetMode: 'none' | 'enemy' | 'self' | 'pet' | 'petAndEnemy' | 'petAndSelf' | 'allEnemies';
  previewText?: string;
};

type HandViewModel = {
  cards: CardInHandViewModel[];
  maxSupportedCards: 10;
  overflowState?: 'none' | 'unsupported';
};

type EnemyLayoutViewModel = {
  enemies: EnemyCombatViewModel[];
  maxSupportedEnemies: 3;
  overflowState?: 'none' | 'unsupported';
};
```

### 28.9 Tooltip Content

```ts
type TooltipContent = {
  title: string;
  lines: string[];
  keywords?: { name: string; description: string }[];
};
```

### 28.10 Pile View Model

```ts
type PileViewModel = {
  drawCount: number;
  discardCount: number;
  exhaustCount?: number;
  drawTooltip: TooltipContent;
  discardTooltip: TooltipContent;
};
```

Phase 1 does not need full pile card lists in the view model.

### 28.11 Energy View Model

```ts
type EnergyViewModel = {
  current: number;
  max: number;
  tooltip: TooltipContent;
};
```

---

## 29. Presenter Implications

Suggested Phaser presenters for combat:

```txt
CombatScene
CombatBoardPresenter
PlayerAvatarPresenter
PlayerHudPresenter
PetPresenter
FuturePetSlotPresenter
MonsterPresenter
IntentPresenter
StatusTrayPresenter
CardPresenter
HandPresenter
CombatHudPresenter
PilePresenter
EnergyPresenter
EndTurnPresenter
TargetingPresenter
TooltipPresenter
DetailPanelPresenter
CombatEventPlayer
DebugEventLogPresenter
```

### 29.1 Presenter Responsibilities

Presenters:

- own Phaser GameObjects;
- render view models;
- expose callbacks for UI actions;
- play simple local animations;
- do not own game rules;
- do not call game-core resolvers directly;
- use layout helpers.

### 29.2 Controller Responsibilities

Presentation controller:

- receives UI requests from scene/presenters;
- calls game-core actions;
- receives updated state and `GameEvent[]`;
- stores latest state/events;
- builds or requests updated view model;
- tells scene/event player what to render/play.

### 29.3 Layout Helpers

Use layout helpers instead of magic coordinates.

Suggested helpers:

```txt
combat-layout.ts
hand-layout.ts
party-layout.ts
enemy-layout.ts
hud-layout.ts
tooltip-layout.ts
detail-layout.ts
```

### 29.4 UI Requests

Recommended UI request objects:

```ts
type CombatUiRequest =
  | { type: 'selectCard'; combatId: string; viewModelRevision: number; cardInstanceId: string }
  | { type: 'cancelSelection'; combatId: string; viewModelRevision: number }
  | { type: 'playCard'; combatId: string; viewModelRevision: number; requestId: string; cardInstanceId: string; target?: CombatTargetSelection }
  | { type: 'endTurn'; combatId: string; viewModelRevision: number; requestId: string }
  | { type: 'openDetail'; subject: DetailSubject }
  | { type: 'closeDetail' }
  | { type: 'hoverSubject'; subject: TooltipSubject }
  | { type: 'clearHover' };

type CombatTargetSelection = {
  enemyId?: string;
  petInstanceId?: string;
  targetPlayer?: boolean;
};
```

Final names may change, but interactions should be explicit.

### 29.5 Layout Constants

Phase 1 should centralize constants such as:

```txt
logicalWidth = 1920
logicalHeight = 1080
minimumReadableWidth = 1280
minimumReadableHeight = 720
cardAspectRatio = 5 / 7
handCardWidth
handCardHeight
hoverCardScale
hoverLiftPixels
statusTrayMaxEnemy = 4
statusTrayMaxPlayer = 5
statusTrayMaxPet = 3
```

Do not scatter these across presenters.

---

## 30. Accessibility and Readability

### 30.1 Do Not Rely on Color Alone

Use both color and shape.

Examples:

- pet-command uses orange line plus paw-rune badge;
- enemy selected target uses stronger ring plus brightness/thickness;
- unplayable card uses dimming plus tooltip reason;
- buff/debuff use icon shapes, not only colors.

### 30.2 Readable Hit Areas

Important hit areas:

- cards;
- enemy slots;
- intent icons;
- status icons;
- End Turn button;
- energy/piles;
- Player HUD;
- pet.

Small icons should have padded hitboxes larger than the visual icon.

### 30.3 Text Size

Card text must remain readable at final game resolution.

If card rules are too long:

- shorten rules text;
- rely on detail panel for keyword explanations;
- avoid shrinking text to unreadable size.

### 30.4 Motion and Clarity

Animations should clarify, not obscure.

Avoid:

- huge screen-covering VFX;
- constant attack lines;
- particles over card text;
- enemy attacks splashing at camera;
- all statuses popping at once without settling.

### 30.5 Small Browser Windows

Phase 1 uses 16:9 scaling rather than responsive reflow.

Rules:

- scale canvas to fit;
- preserve aspect ratio;
- use letterbox/pillarbox;
- clamp tooltip/detail panels inside safe bounds;
- minimum readability target is 1280x720.

---

## 31. Phase 1 Required Interactions

The following interactions are required for Phase 1 combat UX.

### 31.1 Required

- Display Keeper avatar on battlefield.
- Display Player HUD with HP/block/status tray.
- Display Ember Fox on battlefield with ring and status tray.
- Display Ember Charge pips only when active mechanic exists.
- Display faint future pet slots near party cluster.
- Display enemies as sprites/silhouettes with intent, HP, status tray, and target ring.
- Display bottom HUD with energy, draw pile, hand, discard pile, End Turn.
- Hover cards.
- Select cards.
- Target enemies for enemy-targeted cards.
- Play no-target/self-target cards on first click.
- Show pet-command orange line to Ember Fox.
- Show enemy target rings for effect targets.
- Lock input during event playback.
- Show quick tooltips for status icons and enemy intents.
- Show at least basic card detail/expanded card readability.
- End turn and resolve enemy actions.
- Display local status changes.
- Show enemy attack amount on intent if provided by view model.
- Support Esc to close detail/cancel selection.
- Support Space to end turn in idle state.

### 31.2 Strongly Recommended

- Pinned detail panel for cards.
- Pet quick tooltip.
- Enemy quick tooltip.
- Player HUD tooltip.
- Invalid action feedback.
- Status overflow `+N` tooltip.
- Intent target hint tooltip.
- Debug event log in development mode.

### 31.3 Deferred

- Full touch design.
- Controller support.
- Full pile inspection.
- Exact damage prediction preview.
- Full glossary/codex screen.
- Multi-pet selection UI beyond inactive slots.
- Enemy pet targeting.
- Pet HP/condition system.
- Player-facing combat log.
- Separate large boss HP bar.
- Exhaust pile unless mechanic exists.
- Keeper customization.

---


## 32. Interaction Invariants

These invariants are hard rules for Phase 1 combat interaction. If an implementation violates these, the UX contract is not being followed.

### 32.1 No Gameplay Submit During Pending or Resolving State

No gameplay action can be submitted while another gameplay action is pending or resolving.

Applies to:

- playing a card;
- ending turn;
- selecting a target after state has changed;
- keyboard shortcut submits;
- double-clicks;
- repeated pointer events.

The UI may still render, animate, and show non-interactive tooltips where safe.

### 32.2 Core Is the Final Validator

Every gameplay request is validated twice:

1. UI/view-model hints determine what appears playable and targetable.
2. Game-core validates the submitted action and returns success or failure.

If game-core rejects an action, the UI must refresh to the latest safe view model and show recoverable feedback.

### 32.3 Phaser Does Not Calculate Gameplay Outcomes

Phaser must not calculate:

- damage;
- target validity;
- status duration;
- status tick timing;
- enemy intent selection;
- pet modifier behavior;
- reward or combat outcome.

Phaser can animate events and render view-model data only.

### 32.4 Orange Line Is Pet-Command Only

The orange command line must never be used for normal player cards, enemy attacks, generic targeting, or damage paths.

It means only:

```txt
card -> active pet command relationship
```

This is a game identity rule, not only a visual rule.

### 32.5 Left-Click Meaning Depends on UI State

Left-click priority:

```txt
Idle: select/play card or interact with UI element
Card selected/targeting: choose valid target or cancel if empty board
Detail/modal open: interact with detail/modal only
Resolving/enemy turn: gameplay clicks ignored
Paused: pause menu owns input
```

### 32.6 No Click-Through From Overlays

A click that closes a modal/detail/pause overlay must not also click an element underneath.

Closing an overlay consumes the click.

### 32.7 Unsupported Phase 1 States Must Not Silently Break Layout

If a combat state exceeds Phase 1 UI support, it must show a debug warning, safe fallback, or content validation error.

Examples:

- more than 3 enemies;
- more than 10 cards in hand;
- pet HP introduced without UI contract;
- enemy pet targeting introduced without target markers;
- more active pets than the UI can present.

### 32.8 Missing Assets Must Not Block Interaction

Any missing image/icon/sprite should fall back to a placeholder without breaking card play, targeting, event playback, or combat resolution.

---

## 33. Phase 1 Hard Caps and Unsupported States

### 33.1 Hand Size

Phase 1 combat UI must support hand size 0-10.

Display behavior:

- 0 cards: empty hand area, no card interaction.
- 1-5 cards: normal spacing.
- 6-10 cards: compressed/fanned spacing while preserving hover readability.
- more than 10 cards: unsupported Phase 1 state.

If more than 10 cards appear, the UI should not allow cards to overflow off-screen. It should show a debug/content warning and use a safe fallback layout if possible.

### 33.2 Enemy Count

Phase 1 combat UI supports 1-3 enemies.

Display behavior:

- 1 enemy: centered on enemy side.
- 2 enemies: spaced clearly on enemy side.
- 3 enemies: standard slots.
- more than 3 enemies: unsupported Phase 1 state.

Boss-like enemies can use one larger slot, but no top boss HP bar exists in Phase 1.

### 33.3 Pet Slots

Phase 1 renders:

```txt
1 active Ember Fox + up to 2 faint inactive future slots
```

The UI practical target is up to 3 active pet slots later. The engine model should remain collection-based and not assume only one pet.

### 33.4 Status Overflow

Visible status caps remain:

```txt
Enemy: 4 + overflow
Player: 5 + overflow
Pet: 3 + overflow
Card tags: 4 + detail panel
```

Overflow is shown with `+N`, not by shrinking icons until unreadable.

### 33.5 Mechanics Explicitly Unsupported in Phase 1 Combat UI

Do not implement these unless the contract is updated:

- pet HP;
- pet injury;
- pet death;
- pet morale;
- enemy pet targeting;
- top boss HP bar;
- full pile viewer;
- player-facing combat log;
- exact damage prediction;
- exhaust pile unless exhaust exists;
- touch/mobile layout;
- controller navigation.

---

## 34. Request Lifecycle and Input Locking

### 34.1 Gameplay Request Lifecycle

A gameplay action should move through this lifecycle:

```txt
idle/selecting -> submit requested -> input locked -> core validates -> events returned -> event playback -> latest view model rendered -> input unlocked if combat continues
```

### 34.2 Immediate Lock on Submit

When a gameplay submit happens, lock input immediately.

Do not wait for:

- server/controller response;
- event playback start;
- first animation frame;
- card leaving the hand.

This prevents duplicate submits.

### 34.3 Request ID

Each gameplay submit should include a unique `requestId`.

The controller should reject or ignore duplicate request ids.

Recommended submit requests:

```ts
type PlayCardRequest = {
  type: 'playCard';
  combatId: string;
  viewModelRevision: number;
  requestId: string;
  cardInstanceId: string;
  target?: CombatTargetSelection;
};

type EndTurnRequest = {
  type: 'endTurn';
  combatId: string;
  viewModelRevision: number;
  requestId: string;
};
```

### 34.4 End Turn While Targeting

End Turn is visible during targeting but disabled or deemphasized.

Rules:

- click End Turn while targeting should not end turn;
- Space should not end turn while targeting;
- feedback may say `Cancel card first.`;
- player must cancel selection before ending turn.

### 34.5 Core Rejection

If game-core rejects an action:

- do not throw;
- show short feedback from the error if available;
- refresh the latest view model;
- keep selection only if the error is recoverable and the selected card still exists;
- clear selection if the card/target/combat is no longer valid.

---

## 35. Stale State and Revision Handling

### 35.1 View Model Revision

Every `CombatViewModel` should include:

```ts
revision: number
```

The revision increments whenever the combat presentation-relevant state changes.

### 35.2 Requests Carry Revision

Gameplay requests should carry:

```ts
combatId
viewModelRevision
requestId
```

The controller/core can use these to detect stale requests.

### 35.3 Stale Request Behavior

If a request is stale:

- reject safely or revalidate against latest state;
- refresh view model;
- clear invalid selection;
- show feedback if player-visible;
- do not apply stale target or card references blindly.

### 35.4 Examples

Examples of stale interaction:

- player clicks an enemy that was defeated by a previous queued event;
- player clicks a card that has already moved to discard;
- player presses Space after combat already ended;
- selected card was valid before a status changed, but invalid after the latest state;
- a hover target remains under pointer after layout changed.

All of these must fail safely.

---

## 36. Click Priority, Overlay Rules, and Monkey-Proofing

### 36.1 Click Priority in Targeting

When targeting an enemy, the entire valid enemy slot counts as the target area.

This includes:

- sprite;
- HP bar;
- status tray;
- base ring;
- intent icon if it belongs to that enemy slot and does not have a modal interaction active.

Specific icon hover tooltips can still appear, but left-click selects the target during targeting.

### 36.2 Right-Click / Info Key During Targeting

During targeting:

- left-click chooses target;
- right-click/info key opens detail for hovered item and suspends targeting;
- Escape cancels targeting;
- clicking empty board cancels targeting.

### 36.3 Quick Tooltip Click Behavior

Quick tooltips are informational. They should not capture normal gameplay clicks unless explicitly interactive.

### 36.4 Pinned Detail Click Behavior

Pinned detail is modal-like.

Rules:

- it captures clicks;
- close button closes it;
- outside click closes it if allowed;
- outside click is consumed;
- background cards/enemies/buttons do not receive that click.

### 36.5 Pause/Menu Overlay

Pause/menu overlay owns input while open.

It must not mutate combat state except through explicit menu actions.

### 36.6 Browser Focus and Resize

If browser focus is lost during event playback:

- no gameplay input is accepted;
- on focus return, continue playback or snap to final safe view model;
- do not submit pending gameplay actions automatically.

If browser window resizes:

- layout can rescale/reposition;
- gameplay state must not mutate;
- selected/targeting state can remain if still valid or safely cancel if layout no longer supports it.

---

## 37. Negative Interaction / Monkey Test Matrix

This matrix defines expected safe behavior when users behave unpredictably.

| Monkey action | Expected safe behavior |
|---|---|
| Double-click a playable no-target card | Card submits once only; second click ignored because input locks immediately. |
| Double-click an enemy-targeted card and enemy | Only one play request is accepted. |
| Spam-click End Turn | Only first valid end-turn request submits; later clicks ignored until safe state. |
| Click End Turn while targeting | End Turn disabled or feedback shown; turn does not end. |
| Press Space while a card is selected | Does not end turn. |
| Press Space while detail panel is open | Does not end turn; detail remains or closes only if Esc is used. |
| Select card, then click invalid enemy | Action not submitted; selected card remains if recoverable. |
| Select card, then click dead/removed enemy | Request rejected or ignored safely; latest view model refreshes. |
| Select pet-command attack card, then click Ember Fox | If enemy target is required, show `Choose an enemy`; do not play. |
| Select pet support card, then click enemy | If enemy is not valid, show invalid target feedback; do not play. |
| Hover status icon during targeting, then left-click it | If inside valid enemy slot, selects that enemy; status detail requires right-click/info. |
| Open card detail while card selected | Targeting suspended; closing detail restores selection if still valid. |
| Click outside detail panel | Detail closes only; underlying board/HUD receives no click. |
| Press Esc with detail open and card selected underneath | First Esc closes detail; second Esc cancels card selection. |
| Click card during enemy turn | Card does not play; input disabled feedback if needed. |
| Click End Turn during enemy turn | Button disabled; no request submitted. |
| Resize browser during targeting | Layout rescales; selection remains if valid or safely cancels. |
| Browser loses focus during event playback | No new input accepted; playback continues or snaps safely on return. |
| Missing sprite asset | Placeholder appears; interaction still works. |
| Missing status tooltip text | Fallback tooltip appears; no crash. |
| Unknown event in event playback | Debug warning, skip unknown visual, continue playback. |
| Core rejects submitted action | UI shows reason, refreshes latest view model, no desync. |
| Enemy dies during chained event before later effect | Phaser follows emitted events; no local guessing. |
| More than 3 enemies appear | Unsupported Phase 1 warning/fallback; do not silently break layout. |
| More than 10 cards in hand | Unsupported Phase 1 warning/fallback; do not overflow off-screen. |
| Pet HP appears in data | Ignore for Phase 1 display or warn; do not render pet HP bar without updated contract. |
| Enemy intent targets pet | Unsupported Phase 1 warning unless later contract defines pet targeting UI. |

---

## 38. Golden Flow Proof Scripts

These flows prove that the combat UX achieves the intended design. They are manual UX scripts now and can later become implementation or Playwright-style tests.

### 38.1 Flow 1 — Normal Enemy Attack Card

Goal: prove normal player cards are distinct from pet-command cards.

Steps:

1. Start player turn with a playable normal enemy-targeted card.
2. Hover the card.
3. Valid enemies show target rings.
4. No orange command line appears.
5. Select one enemy.
6. Card resolves.
7. Enemy HP changes through emitted events.
8. Card moves to discard through emitted events.

Pass criteria:

- player understands this is a direct player card;
- no pet-command visual appears;
- selected enemy is unambiguous.

### 38.2 Flow 2 — Fox Bite Pet-Command Attack

Goal: prove actor/effect-target grammar works.

Steps:

1. Hover `Fox Bite` or equivalent pet-command attack card.
2. Card lifts.
3. Orange line points to Ember Fox.
4. Ember Fox ring glows.
5. Valid enemies show rings.
6. Select enemy.
7. `PetCommanded` visual reaches Ember Fox.
8. Ember Fox reacts/dashes.
9. Enemy receives damage/status through events.

Pass criteria:

- orange line answers who receives command;
- enemy ring answers who receives effect;
- pet reaction happens before enemy impact.

### 38.3 Flow 3 — Tailguard / Pet Guard

Goal: prove Keeper avatar belongs on battlefield and pet protection reads clearly.

Steps:

1. Hover Tailguard-like pet-command guard card.
2. Orange line points to Ember Fox.
3. Keeper avatar and Player HUD show guard/block preview.
4. Play card.
5. Ember Fox changes guard pose or moves between Keeper and enemies.
6. Player HUD block/guard updates.
7. Next enemy attack shows guard/block impact.

Pass criteria:

- player can see who is being protected;
- pet action and Player HUD state change are connected.

### 38.4 Flow 4 — Burn Status Application and Tick

Goal: prove local status trays and tooltip timing work.

Steps:

1. Apply Burn to an enemy.
2. Burn icon pops near enemy.
3. Burn settles below enemy HP in local status tray.
4. Hover Burn icon.
5. Tooltip explains stack/timing/decay.
6. At correct turn timing, Burn tick event deals damage.
7. Burn stack updates or expires.

Pass criteria:

- status is local to enemy;
- tooltip teaches the mechanic;
- visual result matches core events.

### 38.5 Flow 5 — Card Detail During Targeting

Goal: prove detail system does not break targeting.

Steps:

1. Select a targetable card.
2. Valid target rings appear.
3. Open pinned card detail.
4. Targeting is suspended.
5. Close detail.
6. Previous selection and targeting are restored if still valid.
7. Choose target and resolve action.

Pass criteria:

- detail does not cancel the player's intent unless necessary;
- no click-through occurs;
- target selection remains understandable.

### 38.6 Flow 6 — Invalid Target Recovery

Goal: prove invalid actions are recoverable.

Steps:

1. Select enemy-targeted card.
2. Click invalid board area or invalid enemy.
3. UI shows feedback.
4. Card remains selected if still recoverable.
5. Click valid enemy.
6. Action resolves.

Pass criteria:

- invalid click does not submit action;
- player is not forced to restart selection unnecessarily.

### 38.7 Flow 7 — End Turn and Enemy Attack

Goal: prove side-view enemy attack grammar.

Steps:

1. End turn from idle.
2. Input locks.
3. Remaining hand moves according to events.
4. Enemy intent pulses.
5. Enemy attack travels left toward Keeper avatar.
6. Player HUD block/HP updates.
7. Next player turn begins or combat ends.

Pass criteria:

- enemy attack target is clear;
- enemies do not primarily attack the screen/camera;
- Player HUD and Keeper avatar both communicate impact.

### 38.8 Flow 8 — Victory Transition

Goal: prove combat end locks input safely.

Steps:

1. Defeat final enemy.
2. CombatantDefeated and CombatEnded events play.
3. Hand/input becomes disabled.
4. Victory feedback appears.
5. Scene transitions out after playback.

Pass criteria:

- no further cards can be played after victory;
- final state renders correctly;
- no input lock persists forever.

---

## 39. Failure and Fallback Behavior

### 39.1 Missing Asset Fallbacks

Required fallback presentation:

```txt
Missing combat background -> neutral parchment/grey board
Missing Keeper avatar -> simple humanoid silhouette
Missing Ember Fox sprite -> fox/paw silhouette placeholder
Missing enemy sprite -> monster silhouette placeholder
Missing card art -> blank art window placeholder
Missing icon -> generic circular icon with fallback symbol
Missing card frame -> simple rectangle frame
Missing VFX -> skip VFX and still update state
```

### 39.2 Missing Data Fallbacks

Required fallback behavior:

```txt
Missing tooltip -> title + "No details available yet."
Missing display name -> fallback id or "Unknown"
Missing intent amount -> show icon without amount
Missing status icon -> generic status icon
Missing card art key -> placeholder art
Missing target preview -> treat card as not targetable/playable unless core says otherwise
```

### 39.3 Unknown Event Handling

If CombatEventPlayer receives unknown event:

- log debug warning;
- do not crash;
- skip unknown visual;
- continue playback;
- render latest view model after sequence.

### 39.4 Playback Timeout / Finalize

Every event playback sequence should have a finalize path.

If animation fails or never completes:

- stop waiting after a reasonable timeout;
- render latest view model;
- unlock input if phase allows;
- log debug warning.

### 39.5 Core Error Handling

Game-core gameplay errors should return structured failure, not throw for normal invalid actions.

UI behavior:

- display short error if player-visible;
- refresh from latest state;
- preserve selection only when safe;
- never desync based on optimistic assumptions.

---

## 40. Combat Interaction Completion Gate

The combat-only interaction contract is ready to move into asset manifest and implementation planning when all items below are true.

### 40.1 Normal Paths Covered

The eight golden flows are defined and accepted.

### 40.2 Negative Paths Covered

The monkey test matrix has expected safe behavior for:

- double-clicks;
- spam clicks;
- invalid targets;
- stale requests;
- overlay click-through;
- input during enemy turn/resolution;
- missing assets/data;
- unsupported hand/enemy counts.

### 40.3 Phase 1 Caps Covered

The contract defines hard Phase 1 support for:

- hand cards;
- enemy count;
- active pet visual slots;
- visible status count;
- card tag count.

### 40.4 Ownership Covered

The contract clearly says:

- game-core owns rules;
- view models expose display data and valid targets;
- Phaser presenters render/animate;
- event playback follows emitted events;
- assets skin the UI but do not own dynamic state.

### 40.5 Unsupported Mechanics Blocked

The contract explicitly blocks accidental introduction of:

- pet HP;
- enemy pet targeting;
- top boss HP bar;
- exact Phaser damage prediction;
- full pile viewer;
- player-facing combat log;
- mobile layout;
- controller navigation.

### 40.6 Verdict for v0.3

If v0.3 is accepted without major objections, the combat interaction portion is sufficiently complete for the next production step:

```txt
asset_manifest.md v0.1 — Combat Only
```

The asset manifest should still remain combat-only first. Reward, map, and pet journal assets should wait until their own interaction contracts exist.

---

## 41. Combat UX Acceptance Checklist

A combat implementation or mockup should be reviewed against this checklist.

### 41.1 Layout

- [ ] Keeper avatar is visible on battlefield and does not look like a card.
- [ ] Ember Fox is visible as active pet co-hero.
- [ ] Enemies are sprites/silhouettes, not cards.
- [ ] Enemy intents are above enemies.
- [ ] Enemy HP/statuses are below enemies.
- [ ] Player state is in bottom-left Player HUD.
- [ ] Pet has no Phase 1 HP bar.
- [ ] Pet pips do not look like HP.
- [ ] Pet pips are hidden if no charge mechanic is active.
- [ ] Top UI is minimal.
- [ ] Bottom HUD order is readable.

### 41.2 Targeting

- [ ] Pet-command card shows orange line to Ember Fox.
- [ ] Orange line does not point to enemy.
- [ ] Enemy target is shown through target ring.
- [ ] Normal player attack card does not use orange command line.
- [ ] Self cards highlight Keeper avatar / Player HUD.
- [ ] Invalid targets do not appear valid.
- [ ] No-target/self-target cards can play without second confirmation.

### 41.3 Information

- [ ] Statuses are local to affected combatant.
- [ ] Enemy intent tooltip explains next action.
- [ ] Attack intent amount is visible if view model provides it.
- [ ] Status tooltip explains stack/timing/duration.
- [ ] Card detail explains type, target, tags, rules, keywords.
- [ ] Pet tooltip explains Ember Charge/statuses.
- [ ] Player HUD tooltip explains HP/block/statuses.
- [ ] Status overflow follows visible max limits.

### 41.4 Event Playback

- [ ] Card play locks input.
- [ ] Energy spend visibly updates energy orb.
- [ ] Pet-command event visually reaches Ember Fox before pet reacts.
- [ ] Damage updates HP bar and impact feedback.
- [ ] Status application pops then settles into local tray.
- [ ] Enemy attacks travel toward Keeper, not screen/camera.
- [ ] Event playback does not invent gameplay outcomes.

### 41.5 Implementation Hygiene

- [ ] Phaser presenters do not own game rules.
- [ ] View models provide target validity and tooltip content.
- [ ] View models provide intent amount/target hint if displayed.
- [ ] Layout uses helpers/constants, not scattered magic numbers.
- [ ] UI remains future-ready for multiple pets.
- [ ] Missing art can be replaced by placeholders without breaking interaction.
- [ ] Text and numbers are code-rendered, not baked into generated art.
- [ ] UI scales through 16:9 canvas fit/letterbox instead of ad hoc responsive reflow.

---

## 42. Non-Negotiables

- No player card on battlefield.
- No enemy cards in combat board.
- No pet HP bar in Phase 1.
- No enemy pet targeting in Phase 1.
- Orange command line is pet-command only.
- Enemy ring shows effect target.
- Enemy overhead is for intent, not general statuses.
- Buff/debuff/statuses are local, not global top strip.
- No exact damage prediction in Phaser.
- Phaser presentation must not implement gameplay rules.
- Combat UI must remain future-ready for multiple active pets.
- Text and numbers must be code-rendered, not baked into generated images.
- Missing art should not block functional interaction.
- Draw/discard pile inspection is not required for Phase 1.
- Combat log is debug-only in Phase 1.
- No duplicate gameplay submit during pending/resolving state.
- Every gameplay request must be validated by core even if UI already marked it valid.
- Detail/modal/menu overlays must not click through to the board or HUD underneath.
- Phase 1 combat content must not exceed supported hand/enemy caps without explicit fallback or warning.
- Unknown/missing assets and unknown events must fail safely, not break combat.

---

## 43. Still Deferred / Future Questions

These are intentionally deferred beyond v0.3. They should not block Phase 1 combat implementation.

- What exact pet injury/condition system, if any, should exist after Phase 1?
- What explicit UI is needed if future enemies can target pets?
- Should future classes ever support more than 3 active pets visually, or should 3 remain the hard UI cap?
- Should full keyboard/controller navigation become a formal requirement?
- Should a full player-facing combat log exist later?
- Should boss fights later introduce a top boss HP bar?
- Should exact damage prediction be added in Phase 2, and what core-backed preview model should power it?
- Should draw/discard pile click open full card list in Phase 2?
- How should mobile/touch layout differ if browser mobile support becomes a goal?

---

## 44. Version Notes

### v0.3 — 2026-05-26

Hardened the combat interaction contract for implementation readiness.

Main changes:

- added interaction invariants;
- added Phase 1 hard caps: 0-10 hand cards, 1-3 enemies, up to 3 visible pet slots;
- added unsupported-state rules for content that exceeds Phase 1 UI capacity;
- added stale request and view model revision handling;
- added request ids and immediate input locking to prevent duplicate submits;
- added End Turn behavior while targeting;
- added overlay and click-through rules;
- added target-click priority while hovering statuses or intents;
- added browser focus and resize safety rules;
- added negative interaction / monkey test matrix;
- added golden flow proof scripts;
- added missing asset/data/event fallback behavior;
- added event playback timeout/finalize rules;
- added combat interaction completion gate and verdict for moving to asset manifest.

### v0.2 — 2026-05-26

Resolved v0.1 open questions and converted them into implementation decisions.

Main changes:

- pinned detail suspends targeting and restores selected card when still valid;
- no-target/self-target/single-active-pet support cards play on first click;
- exact damage prediction deferred to Phase 2;
- status overflow limits defined: enemy 4, player 5, pet 3, card tags 4;
- attack intent amount should be visible when supplied by view model;
- pet pips are named `Ember Charge` and hidden if no active charge mechanic exists;
- draw/discard piles require hover count only; clickable pile viewer deferred;
- card hover uses lifted/enlarged card, not separate floating card tooltip;
- required keyboard shortcuts reduced to Esc and Space;
- scaling uses fixed 16:9 logical layout, primary 1920x1080, minimum target 1280x720;
- combat log is debug-only in Phase 1;
- Phase 1 has no pet HP, pet injury, pet death, pet morale, or enemy pet targeting;
- combat UI reserves up to 3 active pet slots visually while engine remains collection-based;
- Keeper customization deferred; avatar is class-based;
- separate boss HP bar deferred;
- canonical card aspect ratio set to 5:7;
- End Turn button uses text plus icon in final UI;
- clarified generated-art vs code-composed UI responsibilities;
- added intent target hints, tooltip ownership, invalid-action recovery, and layout constants.

### v0.1 — 2026-05-26

Initial combat-only interaction contract.

Defined:

- combat screen regions and layers;
- presentation UI state machine;
- card interaction states;
- card family targeting behavior;
- pet-command targeting grammar;
- Keeper avatar vs Player HUD responsibilities;
- Ember Fox display and no-HP Phase 1 rule;
- enemy display, intent, HP, and local status trays;
- tooltip and pinned detail system;
- card detail content structure;
- status, keyword, intent tooltip rules;
- energy/pile/end-turn interactions;
- enemy attack grammar;
- combat event playback mapping;
- view-model requirements;
- presenter implications;
- Phase 1 required interactions and acceptance checklist.
