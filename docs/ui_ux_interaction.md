# UI/UX Interaction Contract v0.1 — Combat Only

Status: Draft / implementation contract seed  
Version: 0.1  
Date: 2026-05-26  
Scope: Combat interaction only  
Related docs: `architecture.md`, `design.md`

This document defines the first detailed combat UI/UX interaction contract for the pet-centered roguelite deckbuilder.

It is based on the currently agreed combat wireframe direction from `design.md v0.2`:

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
- bottom HUD order: Player HUD, energy, draw pile, hand cards, discard pile, end turn.

This file is intentionally detailed because future asset planning, game-core view models, Phaser presenters, event playback, and Codex implementation tasks should all depend on this contract.

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
- Which interactions are Phase 1 requirements, and which are deferred?

This document should reduce future ambiguity before creating `asset_manifest.md`, Phaser presenter tickets, or game-core view-model contracts.

---

## 2. Scope

### 2.1 In Scope

This v0.1 covers only combat UI/UX.

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
- View-model and presenter implications.
- Phase 1 acceptance criteria for combat interaction.

### 2.2 Out of Scope

Not included in v0.1:

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
- charge pips;
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

---

## 4. Combat Screen Regions

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

### 4.1 Combat Board

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

### 4.2 Bottom HUD

The lower portion of the screen.

Owns:

- Player HUD;
- energy orb;
- draw pile;
- hand cards;
- discard pile;
- end turn button.

### 4.3 Overlay Layer

An interaction overlay above the board and HUD.

Owns:

- quick tooltips;
- pinned detail panels;
- modal confirmations if later needed;
- disabled-input overlay if needed;
- pause/settings overlay if the menu is opened.

---

## 5. Rendering and Interaction Layers

Phaser should conceptually render combat in layers. Implementation can use containers, depth constants, or scene sublayers.

Recommended order, back to front:

1. `BackgroundLayer` — combat background plate.
2. `BoardEntityLayer` — Keeper avatar, Ember Fox, enemies.
3. `BoardUiLayer` — intent icons, HP bars, local status trays, base rings.
4. `HudLayer` — Player HUD, energy, piles, hand cards, end turn.
5. `TargetingLayer` — valid target rings, selected target rings, orange command line.
6. `VfxLayer` — hit sparks, burn ticks, shield arcs, damage numbers.
7. `TooltipLayer` — quick hover tooltips.
8. `DetailLayer` — pinned detail panels and modal overlays.
9. `DebugLayer` — optional debug-only overlays.

Gameplay rules must not live in these layers. They display view-model state and consume game-core events.

---

## 6. Core Interaction Principles

### 6.1 Locality

State should appear close to the object it affects.

- Player statuses appear in Player HUD.
- Pet statuses appear near the pet ring.
- Enemy statuses appear below enemy HP.
- Enemy intents appear above enemies.

Do not use a global top status strip for Phase 1 combat.

### 6.2 One Visual Element, One Meaning

Avoid overloading visual cues.

- Orange line means pet-command only.
- Enemy ring means enemy targetability/selection.
- Pet pips mean pet charge/readiness, not HP.
- Player HUD means player state.
- Keeper avatar means battlefield target/animation anchor.
- Intent icon means next enemy action.

### 6.3 Gameplay First, Flavor Second

Tooltips and detail panels may include flavor text, but gameplay information must appear first.

### 6.4 Hover Is Helpful, Not Mandatory Forever

Desktop Phase 1 may use hover heavily, but design should leave room for click-to-pin and long-press detail panels later.

### 6.5 Phaser Presents; Core Decides

Phaser may show previews, highlights, tooltips, and animations. It must not decide combat rules.

Valid targets, playable state, intent data, status values, and event results should come from game-core or presentation view models built from game-core state.

---

## 7. Combat Scene States

The CombatScene should operate through explicit UI states. These are presentation states, not necessarily game-core lifecycle states.

### 7.1 State List

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

### 7.2 `loading`

Used before assets and initial view model are ready.

UI behavior:

- Show loading placeholder or simple fade-in.
- Disable all input.

Exit when combat view model and assets are available.

### 7.3 `intro`

Optional short combat start state.

UI behavior:

- Show combat board.
- Show initial enemies and party.
- Play `CombatStarted` / initial intent setup if available.
- Input is locked.

Can be skipped for early implementation.

### 7.4 `player_turn_idle`

Default active player state.

UI behavior:

- Hand cards are interactive.
- End turn button is interactive.
- Hover tooltips are enabled.
- Valid actions are readable through card state.

### 7.5 `card_hover`

Entered when the pointer hovers a hand card without selecting it.

UI behavior:

- Card lifts slightly.
- Card scales subtly or moves to a preview height.
- Quick card preview may appear after a short delay.
- If the card is pet-command, orange line may preview to Ember Fox.
- Valid targets may appear faintly if the targeting rule is simple and non-intrusive.

Should return to `player_turn_idle` when pointer leaves and no card is selected.

### 7.6 `card_selected`

Entered when the player clicks or begins dragging a card.

UI behavior:

- Selected card remains lifted.
- Selected card has stronger outline.
- UI shows required targeting information.
- Other hand cards dim slightly but remain visible.
- End turn remains visible but may be visually deemphasized.

### 7.7 `targeting`

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

### 7.8 `detail_open`

Entered when the user opens a pinned detail panel.

UI behavior:

- Pinned detail panel appears.
- Combat input is paused or constrained depending on detail type.
- Hover tooltips may be suppressed behind the detail panel.
- Close with Escape, close button, or clicking outside if safe.

For Phase 1, opening card/enemy/pet detail may pause targeting to avoid misclicks.

### 7.9 `resolving_player_action`

Entered after a valid action is submitted to game-core and events are returned.

UI behavior:

- Input is locked.
- Card movement, energy update, command line pulse, pet reaction, damage, status application, card move, and outcome are animated from emitted events.
- End turn is disabled.
- Tooltips and selection are hidden or suppressed.

Exit when event playback completes and the resulting view model is rendered.

### 7.10 `enemy_turn_intro`

Entered after the player ends the turn.

UI behavior:

- End turn button disabled.
- Hand cards are disabled or moving to discard.
- Enemy intents become visually emphasized.
- Optional short banner or turn indicator can appear.

### 7.11 `enemy_action_preview`

Optional state before each enemy action resolves.

UI behavior:

- Active enemy intent icon pulses.
- Active enemy target direction may briefly show a dashed line or target marker toward Keeper avatar.
- This should be brief, not always visible.

### 7.12 `enemy_action_resolving`

Enemy action event playback.

UI behavior:

- Active enemy animates or pulses.
- Attack/projectile travels left toward Keeper avatar by default.
- Player HUD updates if player is damaged or blocked.
- If guard/Tailguard applies, Ember Fox intercepts visually.
- Status applications pop and settle into local trays.

### 7.13 `turn_transition`

Short transition between enemy turn and next player turn.

UI behavior:

- New turn events play: energy refill, draw cards, status ticks, intent update.
- Input remains locked until complete.

### 7.14 `combat_victory`

Entered when combat is won.

UI behavior:

- Stop player card input.
- Play enemy defeat/fade if needed.
- Show minimal victory feedback.
- Transition to RewardScene or reward flow after event playback.

Reward UI is out of scope for this v0.1 document.

### 7.15 `combat_defeat`

Entered when player loses.

UI behavior:

- Stop all input except continue/menu.
- Show defeat feedback.
- Transition to loss/run summary flow later.

Loss screen is out of scope for this v0.1 document.

### 7.16 `paused`

Entered through menu button or pause shortcut.

UI behavior:

- Combat animation may pause if technically feasible.
- Input is redirected to pause overlay.
- Game-core state is not mutated by the pause overlay.

---

## 8. Input Model

### 8.1 Phase 1 Primary Input

Phase 1 primary input is mouse/trackpad.

Required:

- hover card;
- click card to select;
- click valid target to play targeted card;
- click card again or click empty space to cancel selection;
- click end turn;
- hover status/intent/card/pet/enemy for quick tooltip;
- right-click or info action to pin detail, if feasible.

Drag-to-play is optional for Phase 1.

### 8.2 Keyboard Shortcuts

Recommended but not mandatory for first implementation:

```txt
Esc        cancel selection or close detail
Space      end turn when no card selected
1-9        select hand card by position
Tab        cycle valid targets after card selected
Enter      confirm selected target / play selected card
I          open pinned detail for hovered/selected item
```

Keyboard support should not drive initial UI complexity, but the interaction model should not make it impossible.

### 8.3 Touch / Long Press

Touch is not a Phase 1 requirement, but do not design interactions that can only ever work through hover.

Future touch mapping:

- tap card = select;
- tap valid target = play;
- tap selected card again = cancel;
- long-press card/status/pet/enemy = detail panel;
- tap outside detail = close.

### 8.4 Controller

Controller support is out of scope.

---

## 9. Card Interaction

Cards are the main combat input.

### 9.1 Card States

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

### 9.2 Idle Card

Display:

- normal size;
- normal frame;
- cost visible;
- art window visible;
- title and rules text visible when final text rendering exists;
- tag/type icons visible.

Interaction:

- hover enters `card_hover`.
- click selects if player turn and card is interactable.

### 9.3 Hovered Card

Display:

- card lifts upward;
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

### 9.4 Selected Card

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

### 9.5 Unplayable Card

Display:

- dimmed frame;
- cost may show warning state;
- tooltip explains why it cannot be played.

Common reasons:

- insufficient energy;
- no valid target;
- card disabled by status;
- not player's turn;
- event playback in progress.

Unplayable card hover should still allow detail inspection.

### 9.6 Resolving Card

Display:

- selected/played card moves to play area or rises from hand;
- input disabled;
- card resolves through event playback;
- after resolution, card moves to discard/exhaust/other pile according to game-core events.

Do not move cards to discard before game-core returns events.

### 9.7 Card Detail Preview

Hovering a card should support quick preview. Pinning should support full detail.

The quick preview may simply be the enlarged card itself in Phase 1.

Pinned card detail should show:

- card name;
- cost;
- card family/type;
- target type;
- tags;
- rules text;
- keyword explanations;
- one-line flavor note if available.

Details are specified further in Section 17.

---

## 10. Card Families and Targeting Behavior

### 10.1 Normal Enemy-Targeted Card

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

### 10.2 Self-Targeted Card

Example role: gain block, draw, self buff.

Hover:

- Keeper avatar glows;
- Player HUD glows;
- if card grants block, shield badge can preview/pulse.

Selected:

- if no target choice is needed, card may be playable immediately on click.
- If confirmation is desired, selected card can show Player HUD as target.

Play:

- submit action with self target or no explicit target depending on core model;
- Player HUD updates from events.

### 10.3 Pet-Command Enemy-Targeted Card

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
- Phase 1 may auto-select Ember Fox as the pet actor.
- Event playback should show card -> pet -> target.

Visual grammar:

```txt
orange line = who receives the command
enemy ring = who receives the effect
pet animation = how the effect is executed
```

### 10.4 Pet-Command Self/Guard Card

Example: `Tailguard`.

Hover:

- orange command line points to Ember Fox;
- Ember Fox ring glows;
- Keeper avatar and Player HUD show guard/block preview.

Selected:

- no enemy target ring unless card also targets an enemy.

Play:

- submit action with pet actor and player/self target if needed.
- Event playback should show Ember Fox guarding Keeper.

### 10.5 Pet Support Card

Example: empower next pet command.

Hover:

- orange command line points to Ember Fox;
- Ember Fox ring and relevant pips/status tray preview update.

Selected:

- if only one active pet, no explicit target needed.
- if future multiple active pets exist, valid pet rings appear.

Play:

- submit action with pet target.
- Pet status/charge update through events.

### 10.6 Area-of-Effect Enemy Card

Hover:

- all affected enemy rings glow faintly;
- no single selected target if all enemies are affected;
- card preview can show all-enemy target pattern.

Play:

- submit action with no enemy target or an AOE target spec, depending on core design.
- Event playback resolves effects in the order emitted by game-core.

### 10.7 No-Target Utility Card

Example: draw cards, gain energy.

Hover:

- card lifts;
- relevant HUD area may preview effect if simple.

Play:

- click card once to play if no target required.
- Event playback handles draw/energy/status effects.

### 10.8 Future Multi-Pet Card

Out of Phase 1 for full implementation, but UI must not block it.

Future targeting possibilities:

- leading pet;
- specific pet;
- all active pets;
- random active pet;
- pet with tag.

Phase 1 UI may show faint inactive pet slots, but only Ember Fox is selectable.

---

## 11. Targeting System

### 11.1 Target Ring States

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

### 11.2 Valid Target Preview

When a selected card requires a target:

- all valid targets show faint rings;
- invalid combatants do not highlight;
- selected/hovered target gets stronger ring.

Target validity must come from core/view-model data, not duplicated Phaser rules.

### 11.3 Target Selection

Clicking a valid target submits the action.

Clicking an invalid target should:

- not submit action;
- show small negative feedback such as shake or tooltip;
- keep the card selected.

Clicking empty board should cancel selection, unless a modal/detail panel is open.

### 11.4 Default Targeting

Some cards may have default targets.

Examples:

- self cards target Keeper/player;
- pet support cards target active pet if only one active pet exists;
- no-target utility cards play immediately.

Default target behavior must be explicit in card definition/view model.

### 11.5 Target Preview Values

Phase 1 may skip exact predicted damage previews.

If implemented later, previews should be visually conservative and must not contradict game-core results.

Examples:

- ghost block amount on Player HUD;
- small projected HP loss marker on enemy HP bar;
- status icon ghost in target status tray.

Do not implement prediction logic in Phaser unless supplied by core/view-model.

---

## 12. Keeper Battlefield Avatar

### 12.1 Purpose

The Keeper avatar is the battlefield representation of the player.

It supports:

- enemy attack direction;
- self-card target clarity;
- pet guard readability;
- command source animation;
- player-pet relationship.

### 12.2 Display

Recommended display:

- small silhouette or sprite;
- left side of combat board;
- slightly behind Ember Fox;
- faces right toward enemies;
- no HP bar above head;
- no permanent status icons above head.

### 12.3 States

Recommended visual states:

```txt
idle
command
self_target_hover
guarded
damage_impact
defeated
```

### 12.4 Interactions

Hovering Keeper avatar:

- shows quick tooltip or Player Quick Panel.
- If a self-target card is selected, Keeper avatar highlights.

Clicking Keeper avatar:

- if selected card can target self, play/confirm target;
- otherwise may open Player Quick Panel only if appropriate.

### 12.5 Relationship to Player HUD

The Player HUD is the authoritative numeric readout.

Keeper avatar is the visual target and animation anchor.

When player takes damage:

- Keeper avatar flashes/shakes;
- Player HUD HP/block updates and pulses.

When player gains block:

- Player HUD shield pulses;
- optional small shield effect appears near Keeper avatar.

---

## 13. Player HUD

### 13.1 Display

Player HUD lives in the bottom-left HUD area.

It should display:

- portrait/class icon;
- HP bar;
- block shield badge or block bar;
- local player status tray.

### 13.2 Interactions

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

### 13.3 Player Quick Tooltip

Should show:

```txt
Keeper
HP: current / max
Block: current
Statuses: short list
```

If there are no statuses, omit or show `No active statuses`.

### 13.4 Player Detail Panel

Pinned detail may show:

- class name;
- HP/max HP;
- block;
- all statuses with explanations;
- current turn effects;
- optional deck/hand/discard summary.

Phase 1 can keep this minimal.

---

## 14. Ember Fox Pet Area

### 14.1 Display

Ember Fox appears on the battlefield near the Keeper.

Display elements:

- Ember Fox sprite/silhouette;
- active pet base ring;
- charge pips around or near ring;
- local pet status tray;
- command glow state.

### 14.2 No Phase 1 Pet HP

Do not show an HP bar for Ember Fox in Phase 1.

Reason: pet HP implies enemy pet targeting, pet injury/death, revive, protection, and additional balance systems.

Pet charge pips must not look like HP.

### 14.3 Pet Charge Pips

Charge pips represent pet-specific temporary resources.

Examples:

- Banked Ember charges;
- next pet-command empowerment;
- once-per-turn pet reaction readiness;
- temporary command resource.

Display rules:

- show only when mechanic exists or as placeholder during prototype;
- use ember dots/pips, not hearts;
- maximum pips should be small, usually 2–4;
- tooltip must explain meaning.

### 14.4 Pet Status Tray

Local tray below or near pet ring.

Can display:

- ready;
- commanded this turn;
- empowered;
- guarding;
- banked ember;
- temporary debuff if later introduced.

Do not display a long row of empty slots unless needed for layout debugging.

### 14.5 Pet Hover Tooltip

Hovering Ember Fox should show a combat-relevant Pet Quick Tooltip.

Suggested content:

```txt
Ember Fox
Role: Burn / Command / Guard
State: Ready / Commanded / Empowered / Guarding
Charges: 2 / 3 Banked Ember
Active upgrades: short icon list if any
```

Do not show full bond story, memories, or evolution tree in combat tooltip.

### 14.6 Pet Detail Panel

Pinned pet detail may show:

- pet name;
- pet role;
- current command state;
- current charges;
- active pet upgrades relevant to combat;
- current pet statuses with explanations;
- hint to open Pet Journal later, if that screen exists.

### 14.7 Pet Interactions

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

## 15. Future Pet Slots

### 15.1 Display

Future pet slots may appear as faint inactive rune circles near the Keeper/Ember Fox party cluster.

Rules:

- subtle;
- small;
- low contrast;
- no heavy lock icons;
- not visually equal to active Ember Fox;
- do not look like monetized slots.

### 15.2 Phase 1 Behavior

Phase 1:

- only Ember Fox is active;
- inactive slots are non-interactive or show a tiny tooltip;
- pet-command cards auto-target Ember Fox as pet actor.

### 15.3 Tooltip

Hover inactive pet slot:

```txt
Inactive Pet Slot
Future classes may support more active pets.
```

Optional: hide this tooltip in production until multi-pet content is closer.

---

## 16. Enemy Presentation

### 16.1 Display

Each enemy slot displays:

- intent icon above;
- enemy sprite/silhouette;
- HP bar below;
- local enemy status tray below HP;
- base target ring under enemy.

Enemies should not look like hand cards.

### 16.2 Enemy Intent

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

If attack amount is known and implemented, it may appear near the icon or in tooltip. Avoid tiny unreadable numbers.

### 16.3 Enemy HP

HP bar displays current and max HP.

Damage updates should animate through event playback.

If enemy has block/shield, use a small shield badge near HP bar rather than replacing HP.

### 16.4 Enemy Status Tray

Status tray appears below HP.

Can show:

- burn;
- mark;
- shield/block;
- strength-like buff;
- vulnerability-like debuff;
- special boss state.

Maximum visible statuses:

- Phase 1 recommended max: 4 icons.
- If more than 4, show `+N` overflow or open detail on hover.

### 16.5 Enemy Hover Tooltip

Hover enemy sprite, HP bar, intent, or status tray should show enemy quick info.

Suggested enemy quick tooltip:

```txt
Enemy Name
HP: current / max
Intent: Attack the Keeper / Defend / Buff / Special
Statuses: Burn 3, Marked, etc.
```

If hovering a specific status icon, show status tooltip instead of full enemy tooltip.

### 16.6 Enemy Detail Panel

Pinned enemy detail may show:

- name;
- HP/max HP;
- block if any;
- intent details;
- all statuses;
- enemy traits if implemented;
- target validity if a card is selected.

### 16.7 Enemy Selection

If a selected card can target enemies:

- valid enemies get faint rings;
- hovered enemy gets stronger ring;
- clicked enemy becomes selected target and action is submitted.

If enemy is not a valid target:

- no ring or disabled ring;
- click gives invalid feedback.

---

## 17. Tooltip and Detail System

The combat UI needs a shared information system.

### 17.1 Three Information Levels

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
- end turn button.

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

Should appear after a short delay, such as 250–400 ms.

#### Level 3 — Pinned Detail Panel

Larger panel for reading.

Used for:

- card detail;
- enemy detail;
- pet detail;
- player detail;
- keyword explanations;
- complex status explanations.

Should be opened by right-click, info key, long hover, or future long press.

### 17.2 Tooltip Priority

When multiple elements overlap, priority should be:

1. selected/hovered hand card;
2. selected target;
3. specific status/intent icon;
4. enemy/pet/player general hover;
5. piles/energy/buttons.

Specific icon tooltip should override general unit tooltip.

### 17.3 Tooltip Placement

Tooltip should avoid covering:

- hovered hand card;
- target being selected;
- end turn button;
- player HP if relevant;
- card rules text.

Preferred placement:

- above hand for cards;
- near but offset from status icons;
- inside safe screen margins;
- never off-screen.

### 17.4 Tooltip Timing

Suggested delays:

```txt
Status/intent icon tooltip: 250 ms
Card quick preview: immediate lift, detail tooltip after 350 ms
Enemy/pet/player general tooltip: 350 ms
Pinned detail: explicit action, no delay
```

### 17.5 Tooltip During Targeting

During targeting:

- keep target highlights more important than tooltips;
- show quick target tooltip only if it does not obscure rings;
- pinned detail can pause targeting.

### 17.6 Pinned Detail Behavior

When pinned detail opens:

- freeze or cancel active targeting unless design later chooses otherwise;
- keep combat input from submitting accidental actions;
- close with Escape, close button, or clicking outside;
- after closing, return to previous safe state, preferably `player_turn_idle`.

---

## 18. Card Detail Content

Card detail must prioritize gameplay clarity.

### 18.1 Required Card Detail Fields

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

### 18.2 Card Family/Type

Examples:

```txt
Attack
Skill
Pet-Command
Power
Pet Support
```

The exact taxonomy may change, but pet-command identity must be explicit.

### 18.3 Target Type

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

### 18.4 Tags

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

Tags should have tooltip explanations where useful.

### 18.5 Keyword Explanations

Card detail should list relevant keyword explanations below rules text.

Example:

```txt
Keywords
Burn: Damages at turn start, then decreases.
Pet-Command: Sends a command to the active pet.
Guard: Helps protect the Keeper from incoming damage.
```

This avoids needing per-word hover inside Phaser text in Phase 1.

### 18.6 Flavor Note

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

---

## 19. Status and Keyword Tooltips

### 19.1 Status Tooltip Required Fields

Every status tooltip should be able to show:

```txt
Name
Stack or value
Duration, if any
Timing
Expiration or decay rule
Short gameplay explanation
```

### 19.2 Burn Tooltip

Burn is an important Phase 1 status.

Suggested tooltip:

```txt
Burn 4
At the start of this unit's turn, take 4 damage ignoring Block.
Then Burn decreases. Expires at 0.
```

If final rules differ, the tooltip must match game-core behavior.

### 19.3 Block Tooltip

Suggested tooltip:

```txt
Block 6
Prevents incoming attack damage.
Usually resets at the end of the turn.
```

If block timing differs, update this text.

### 19.4 Mark Tooltip

Suggested tooltip:

```txt
Marked
Certain cards or pet commands have extra effects against this target.
```

### 19.5 Empowered Tooltip

Suggested tooltip:

```txt
Empowered
The next pet-command card gains an extra effect.
Removed after use.
```

### 19.6 Guard Tooltip

Suggested tooltip:

```txt
Guard
Ember Fox is ready to help protect the Keeper.
```

Exact mechanics must match game-core.

### 19.7 Overflow Status Tooltip

If a unit has more statuses than visible icons:

- show first few icons;
- show `+N` overflow icon;
- hovering `+N` opens compact list;
- pinned detail shows full list.

---

## 20. Enemy Intent Tooltips

### 20.1 Required Intent Tooltip Fields

Enemy intent tooltip should show:

```txt
Intent name
Target hint
Amount, if known
Short explanation
```

### 20.2 Attack Intent

Suggested tooltip:

```txt
Attack
This enemy will attack the Keeper.
Damage: 7
```

If damage amount is not revealed in Phase 1, use:

```txt
Attack
This enemy will attack the Keeper.
```

### 20.3 Defend Intent

```txt
Defend
This enemy will gain Block or protect itself.
```

### 20.4 Buff Intent

```txt
Buff
This enemy will strengthen itself or an ally.
```

### 20.5 Debuff Intent

```txt
Debuff
This enemy will apply a negative status.
```

### 20.6 Special Intent

```txt
Special
This enemy will use a unique action.
```

Special intents should be clear enough that players do not feel cheated.

---

## 21. Energy, Piles, and End Turn

### 21.1 Energy Orb

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

### 21.2 Draw Pile

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

### 21.3 Discard Pile

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

### 21.4 Exhaust Pile

Out of scope unless exhaust exists in Phase 1.

Do not show a third pile unless the mechanic exists.

### 21.5 End Turn Button

Bottom-right button.

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

Final UI should use code-rendered text or a clear turn icon. A play triangle alone is discouraged.

---

## 22. Pet-Command Line

### 22.1 Meaning

The orange command line means:

```txt
This card commands Ember Fox / active pet.
```

It does not mean:

- the enemy target;
- damage path;
- projectile path;
- generic card targeting.

### 22.2 When It Appears

Show orange command line when:

- pet-command card is hovered;
- pet-command card is selected;
- pet-command event is resolving.

Do not show it for:

- normal attack cards;
- normal self cards;
- enemy attacks;
- generic card hover.

### 22.3 Visual Treatment

Recommended:

- curved line from selected/hovered card to Ember Fox;
- warm ember/orange color;
- subtle glow;
- not too thick;
- should not cover important card text;
- should not point to enemy target.

### 22.4 During Resolution

On `PetCommanded` event:

- command line pulses toward Ember Fox;
- Ember Fox ring glows;
- optional small rune flash on Keeper avatar or card.

Then later events animate pet response.

---

## 23. Enemy Attack Grammar

### 23.1 Default Target

In Phase 1, enemies attack the Keeper/player by default.

This is visually expressed by:

- side-view enemy facing left;
- attack VFX traveling left;
- Keeper avatar as impact anchor;
- Player HUD as state update readout.

### 23.2 Attack Preview

Do not constantly display dashed attack lines from all enemies.

Attack preview lines may appear:

- when hovering enemy intent;
- during enemy action preview;
- in tutorial/debug mode.

Persistent attack lines would clutter the board.

### 23.3 Enemy Attack Resolution

Expected visual sequence:

1. enemy intent icon pulses;
2. enemy wind-up / lunge / projectile begins;
3. VFX moves left toward Keeper avatar;
4. if block/guard applies, shield impact appears;
5. Keeper avatar flashes or guarded pose plays;
6. Player HUD block/HP updates;
7. any status icons pop and settle.

### 23.4 Tailguard / Guard Intercept

If Ember Fox guards the Keeper:

- Ember Fox moves/poses between enemy and Keeper;
- guard arc or tail shield appears;
- Player HUD shield/block area pulses;
- event log/status tray reflects guard/block result.

### 23.5 Future Pet Targeting

If future enemies can attack pets:

- intent must clearly show pet target marker;
- pet UI must support condition/impact feedback;
- this should not be silently introduced.

Phase 1 should not implement enemy pet targeting.

---

## 24. Combat Event Playback

Game-core emits events. Phaser plays them.

### 24.1 General Rules

- Input locks during event playback.
- Events play in emitted order unless an explicit event-player batching rule exists.
- Visuals should not create gameplay outcomes.
- After playback, render latest view model from state.
- If playback is skipped/fast-forwarded later, final state must still render correctly.

### 24.2 Event-to-Visual Mapping

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
-> optional small text/icon pop

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

### 24.3 Event Grouping

Some events may be grouped visually for smoothness, but ordering must remain understandable.

Example:

- `CardPlayed` and `EnergySpent` can animate nearly together.
- `PetCommanded` should visibly precede `PetReacted`.
- `DamageDealt` should visibly precede `StatusApplied` if that is the event order.

### 24.4 Playback Speed

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

### 24.5 Skip/Fast Mode

Not required in v0.1, but event player should not make it impossible.

If added later:

- click/keyboard can speed up animations;
- final state must still match core state.

---

## 25. Player Turn Flow

### 25.1 Start of Player Turn

Expected sequence:

1. game-core produces turn start events;
2. energy refills;
3. cards draw;
4. statuses tick/expire if relevant;
5. enemy intents update if timing requires;
6. input unlocks.

UI state ends in `player_turn_idle`.

### 25.2 Hover Card

1. pointer enters card;
2. card lifts;
3. quick visual preview appears;
4. if pet-command, orange line to Ember Fox appears;
5. if targetable, valid target rings may appear faintly;
6. tooltip appears after delay.

### 25.3 Select Card

1. player clicks card;
2. card enters selected state;
3. if no target needed, action may submit immediately or show confirm depending on card type;
4. if target needed, UI enters `targeting`.

### 25.4 Select Target

1. valid targets are highlighted;
2. player clicks target;
3. controller submits action request to game-core;
4. if action is valid, events return and UI enters `resolving_player_action`;
5. if action is invalid, show error feedback and return to safe state.

### 25.5 Resolve Card

1. play events;
2. update view model;
3. restore player input if combat continues and it is still player's turn;
4. transition to victory/defeat if combat ended.

### 25.6 End Turn

1. player clicks End Turn;
2. input locks;
3. remaining hand cards move according to game-core events;
4. enemy turn begins;
5. enemy actions resolve;
6. next player turn begins or combat ends.

---

## 26. Invalid Actions and Error Feedback

### 26.1 Invalid Action Sources

Common invalid actions:

- insufficient energy;
- card not in hand;
- invalid target;
- no active pet for pet-command card;
- target defeated before action resolves;
- combat already ended;
- not player's turn;
- input during event playback.

### 26.2 Feedback Rules

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

### 26.3 Core vs UI Validation

UI may visually disable obviously invalid cards using view-model data.

Game-core must still validate action on submit.

If core rejects, UI shows error and re-renders latest safe view model.

---

## 27. View-Model Requirements

Combat UI needs a serializable view model. Exact TypeScript names may change, but the data shape should support these concepts.

### 27.1 Combat View Model

Recommended high-level shape:

```ts
type CombatViewModel = {
  combatId: string;
  phase: 'playerTurn' | 'enemyTurn' | 'resolving' | 'won' | 'lost';
  turnNumber: number;
  activeSide: 'player' | 'enemy' | 'none';
  player: PlayerCombatViewModel;
  pets: PetCombatViewModel[];
  enemies: EnemyCombatViewModel[];
  hand: CardInHandViewModel[];
  piles: PileViewModel;
  energy: EnergyViewModel;
  validTargetsByCardInstanceId: Record<string, TargetPreviewViewModel>;
  uiHints?: CombatUiHintsViewModel;
};
```

### 27.2 Player View Model

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

### 27.3 Pet View Model

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
    label: string;
    tooltip: string;
  };
  statuses: StatusViewModel[];
  activeUpgradeIcons?: IconRefViewModel[];
};
```

No `hp` field is required for Phase 1 pet display unless future design adds pet condition/HP.

### 27.4 Enemy View Model

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

### 27.5 Intent View Model

```ts
type IntentViewModel = {
  intentId: string;
  kind: 'attack' | 'defend' | 'buff' | 'debuff' | 'special' | 'unknown' | 'charging';
  iconKey: string;
  amount?: number;
  targetHint?: 'keeper' | 'self' | 'allEnemies' | 'pet' | 'unknown';
  tooltip: TooltipContent;
};
```

### 27.6 Status View Model

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

### 27.7 Card View Model

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
  detail: CardDetailViewModel;
};
```

### 27.8 Target Preview View Model

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
```

### 27.9 Tooltip Content

```ts
type TooltipContent = {
  title: string;
  lines: string[];
  keywords?: { name: string; description: string }[];
};
```

---

## 28. Presenter Implications

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
```

### 28.1 Presenter Responsibilities

Presenters:

- own Phaser GameObjects;
- render view models;
- expose callbacks for UI actions;
- play simple local animations;
- do not own game rules;
- do not call game-core resolvers directly;
- use layout helpers.

### 28.2 Controller Responsibilities

Presentation controller:

- receives UI requests from scene/presenters;
- calls game-core actions;
- receives updated state and `GameEvent[]`;
- stores latest state/events;
- builds or requests updated view model;
- tells scene/event player what to render/play.

### 28.3 Layout Helpers

Use layout helpers instead of magic coordinates.

Suggested helpers:

```txt
combat-layout.ts
hand-layout.ts
party-layout.ts
enemy-layout.ts
hud-layout.ts
tooltip-layout.ts
```

### 28.4 UI Requests

Recommended UI request objects:

```ts
type CombatUiRequest =
  | { type: 'selectCard'; cardInstanceId: string }
  | { type: 'cancelSelection' }
  | { type: 'playCard'; cardInstanceId: string; target?: CombatTargetSelection }
  | { type: 'endTurn' }
  | { type: 'openDetail'; subject: DetailSubject }
  | { type: 'closeDetail' };
```

Final names may change, but interactions should be explicit.

---

## 29. Accessibility and Readability

### 29.1 Do Not Rely on Color Alone

Use both color and shape.

Examples:

- pet-command uses orange line plus paw-rune badge;
- enemy selected target uses stronger ring plus brightness/thickness;
- unplayable card uses dimming plus tooltip reason;
- buff/debuff use icon shapes, not only colors.

### 29.2 Readable Hit Areas

Important hit areas:

- cards;
- enemy slots;
- intent icons;
- status icons;
- end turn button;
- energy/piles;
- Player HUD;
- pet.

Small icons should have padded hitboxes larger than the visual icon.

### 29.3 Text Size

Card text must remain readable at final game resolution.

If card rules are too long:

- shorten rules text;
- rely on detail panel for keyword explanations;
- avoid shrinking text to unreadable size.

### 29.4 Motion and Clarity

Animations should clarify, not obscure.

Avoid:

- huge screen-covering VFX;
- constant attack lines;
- particles over card text;
- enemy attacks splashing at camera;
- all statuses popping at once without settling.

---

## 30. Phase 1 Required Interactions

The following interactions are required for Phase 1 combat UX.

### 30.1 Required

- Display Keeper avatar on battlefield.
- Display Player HUD with HP/block/status tray.
- Display Ember Fox on battlefield with ring, charge pips, and status tray.
- Display enemies as sprites/silhouettes with intent, HP, status tray, and target ring.
- Display bottom HUD with energy, draw pile, hand, discard pile, end turn.
- Hover cards.
- Select cards.
- Target enemies for enemy-targeted cards.
- Play no-target/self-target cards.
- Show pet-command orange line to Ember Fox.
- Show enemy target rings for effect targets.
- Lock input during event playback.
- Show quick tooltips for status icons and enemy intents.
- Show at least basic card detail/expanded card readability.
- End turn and resolve enemy actions.
- Display local status changes.

### 30.2 Strongly Recommended

- Pinned detail panel for cards.
- Pet quick tooltip.
- Enemy quick tooltip.
- Player HUD tooltip.
- Invalid action feedback.
- Keyboard Escape to cancel.
- Space to end turn.

### 30.3 Deferred

- Full touch design.
- Controller support.
- Full pile inspection.
- Exact damage prediction preview.
- Full glossary/codex screen.
- Multi-pet selection UI beyond inactive slots.
- Enemy pet targeting.
- Pet HP/condition system.
- Exhaust pile unless mechanic exists.

---

## 31. Combat UX Acceptance Checklist

A combat implementation or mockup should be reviewed against this checklist.

### 31.1 Layout

- [ ] Keeper avatar is visible on battlefield and does not look like a card.
- [ ] Ember Fox is visible as active pet co-hero.
- [ ] Enemies are sprites/silhouettes, not cards.
- [ ] Enemy intents are above enemies.
- [ ] Enemy HP/statuses are below enemies.
- [ ] Player state is in bottom-left Player HUD.
- [ ] Pet has no Phase 1 HP bar.
- [ ] Pet pips do not look like HP.
- [ ] Top UI is minimal.
- [ ] Bottom HUD order is readable.

### 31.2 Targeting

- [ ] Pet-command card shows orange line to Ember Fox.
- [ ] Orange line does not point to enemy.
- [ ] Enemy target is shown through target ring.
- [ ] Normal player attack card does not use orange command line.
- [ ] Self cards highlight Keeper avatar / Player HUD.
- [ ] Invalid targets do not appear valid.

### 31.3 Information

- [ ] Statuses are local to affected combatant.
- [ ] Enemy intent tooltip explains next action.
- [ ] Status tooltip explains stack/timing/duration.
- [ ] Card detail explains type, target, tags, rules, keywords.
- [ ] Pet tooltip explains pips/statuses.
- [ ] Player HUD tooltip explains HP/block/statuses.

### 31.4 Event Playback

- [ ] Card play locks input.
- [ ] Energy spend visibly updates energy orb.
- [ ] Pet-command event visually reaches Ember Fox before pet reacts.
- [ ] Damage updates HP bar and impact feedback.
- [ ] Status application pops then settles into local tray.
- [ ] Enemy attacks travel toward Keeper, not screen/camera.
- [ ] Event playback does not invent gameplay outcomes.

### 31.5 Implementation Hygiene

- [ ] Phaser presenters do not own game rules.
- [ ] View models provide target validity and tooltip content.
- [ ] Layout uses helpers/constants, not scattered magic numbers.
- [ ] UI remains future-ready for multiple pets.
- [ ] Missing art can be replaced by placeholders without breaking interaction.

---

## 32. Open Questions for Later Versions

These are intentionally unresolved in v0.1.

- Should pinned card detail pause targeting or preserve selected card after closing?
- Should no-target cards play on first click, or require second confirmation?
- Should exact damage prediction be added in Phase 1 or Phase 2?
- What is the final visible maximum status icons before overflow?
- Should enemy attack amount always be visible on intent, or only in tooltip?
- Should pet charge pips be generic, or tied immediately to `Banked Ember`?
- Should draw/discard piles be clickable in Phase 1?
- Should card hover show a separate tooltip, or simply enlarge the card enough?
- Should keyboard shortcuts be implemented immediately?
- How should UI scale for smaller browser windows?
- Should combat log exist in Phase 1, or only debug mode?

---

## 33. Non-Negotiables

- No player card on battlefield.
- No enemy cards in combat board.
- No pet HP bar in Phase 1.
- Orange command line is pet-command only.
- Enemy ring shows effect target.
- Enemy overhead is for intent, not general statuses.
- Buff/debuff/statuses are local, not global top strip.
- Phaser presentation must not implement gameplay rules.
- Combat UI must remain future-ready for multiple active pets.
- Text and numbers must be code-rendered, not baked into generated images.
- Missing art should not block functional interaction.

---

## 34. Version Notes

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
