# Design Direction v0.2 — Ember Journal: Ashbound Companions

Status: Living draft  
Version: 0.2
Date: 2026-05-26
Scope: Concept art direction, practical combat UI/UX direction, and early production-feasible visual framing
Related project docs: `architecture.md`, `Slay the Spire Inspired Game.txt`

This document replaces `Design Direction v0.1` as the current visual and UI/UX direction. Version 0.1 established the art direction, world tone, Ember Fox identity, and first concept-art sequence. Version 0.2 keeps that direction, but revises the combat UI/UX after practical low-fidelity wireframe exploration.

The biggest v0.2 decision is:

**Use a side-view party-versus-enemies combat layout with a small Keeper battlefield avatar, Ember Fox as the active pet co-hero, enemy sprites on the opposite side, and all combat state shown through modular HUD/presenter elements.**

The player should be visually present in the battlefield, but player stats remain in a HUD panel. The pet should be visually present in the battlefield, but the pet does not have a Phase 1 HP bar. Pet-command cards point first to the pet. Enemy target rings show which enemy will receive the effect.

---

## 1. Purpose

This document captures the current committed visual and UI/UX direction for the pet-centered roguelite deckbuilder.

It should guide:

- concept art;
- generated image prompts;
- practical UI/UX mockups;
- combat screen layout;
- future asset manifests;
- Phaser presenter planning;
- early production-feasible art decisions.

It is still not a final art bible. It is a living design document that can change after additional mockups, implementation tests, and playtesting.

---

## 2. Current Step

The project is still in visual and UI/UX pre-production.

The current goal is no longer only to explore mood concepts. The goal is now to converge on an achievable combat UX that can be assembled with:

- Phaser presentation code;
- modular image-generated assets;
- code-rendered text and numbers;
- simple sprites, pose swaps, tweens, and VFX;
- deterministic game-core events.

The immediate next step after this document is to create an `asset_manifest.md` or equivalent production asset breakdown, not to attempt final polished in-game art.

---

## 3. Existing Project Truths

The game is a browser-first, TypeScript + Vite + Phaser 4, pet-centered roguelite deckbuilder.

The game may be inspired by deckbuilder roguelikes, but it should not visually or emotionally present itself as a direct clone of any existing game.

The core identity remains:

- The player selects persistent pets before a run.
- Pets are always present in combat.
- Players interact with pets through pet-command cards and class abilities.
- Pet upgrades affect pet behavior, pet modifiers, command-card patterns, evolution paths, and side-story progression.
- Roguelite progression should unlock choices, memories, side stories, evolution routes, and build variety rather than only increasing numbers.
- Pet side stories are separate from the main story.
- Phase 1 supports one active pet, Ember Fox, but the visual and layout direction must remain future-ready for multiple active pets.

The visual layer must support those truths without overcommitting to a production burden the project cannot afford.

---

## 4. Committed Direction v0.2

Working title for the visual direction:

**Ember Journal — Ashbound Companions**

One-line creative promise:

**A traveler and their ember fox companion cross a dangerous ash-covered wilderness, using cards as signals, commands, memories, and moments of trust.**

Updated practical UX promise:

**In combat, the Keeper and Ember Fox appear together as a left-side party. Enemies face them from the right. Cards drive actions, pet-command cards visibly command Ember Fox, and the battlefield remains readable enough to implement with modular Phaser presenters.**

Tone keywords:

- warm but dangerous;
- clean, smooth, readable fantasy;
- pet-centered tactical adventure;
- field journal magic;
- ash forest, old shrines, ember light;
- readable side-view combat;
- companion bond;
- production-feasible UI;
- future multi-pet ready.

Core emotional target:

The player should feel that Ember Fox is a co-hero. The fox is not a mascot, cosmetic follower, disposable summon, or generic fire effect. The player is surviving because of the relationship between the Keeper and the pet.

---

## 5. Art Pillars

### 5.1 Pet Is the Co-Hero

Ember Fox must be visually present and emotionally important in combat, reward screens, story screens, and progression screens.

The fox should have a clear silhouette, posture, expression, and reaction states. It should feel like a persistent companion with memory and agency.

In combat, Ember Fox should stand on the battlefield, not only appear as an icon.

### 5.2 The Keeper Is Present, But Not the Main Visual Load

The Keeper should appear in the combat battlefield as a small avatar or silhouette so enemy attacks, self-targeting, and pet guarding are easy to understand.

However, the Keeper should not dominate the scene.

The Keeper's battlefield avatar is for:

- enemy attack targeting;
- self-card targeting;
- command source readability;
- Tailguard and protection effects;
- player-pet relationship readability.

The Keeper's HP, block, and status details belong in the Player HUD panel, not above the battlefield avatar.

### 5.3 Cards Are Communication

Cards are not only attacks and spells. Some cards represent player-to-pet communication.

Pet-command cards should read differently from normal cards. They should visually communicate signal, trust, command, and response.

A player should immediately understand when a card means:

- the player acts directly;
- the player commands Ember Fox;
- Ember Fox reacts;
- the player and pet perform a combo.

### 5.4 Warm Danger

The world should not be pure cozy fantasy and should not be grimdark horror.

The desired feeling is a campfire in a hostile wilderness: warm light, old paper, ember glow, but also ash, monsters, ruins, and pressure.

### 5.5 Field Journal UI

The UI should feel like a magical travel journal rather than a cold technical interface.

Useful motifs:

- parchment;
- ink annotations;
- hand-drawn icons;
- fox-paw runes;
- burnt paper edges;
- field notes;
- pinned charms;
- old shrine markings;
- map lines and node sketches.

### 5.6 Future Multi-Pet Ready

Phase 1 only needs Ember Fox, but the visual structure should not lock the game into a forever-single-pet layout.

Combat should show the active pet clearly and can include faint inactive future pet slots near the player/pet party cluster. These should be subtle. They should not look like monetized mobile-game unlock slots.

### 5.7 Event-Readable Combat

The game architecture is event-driven, so combat visuals should clearly support readable event playback.

Visual moments to support:

- card played;
- energy spent;
- pet commanded;
- pet reacted;
- damage dealt;
- block gained;
- burn/status applied;
- monster intent displayed;
- enemy attack resolved;
- reward offered;
- story or memory unlocked.

---

## 6. World Direction

Working world name:

**The Ashbound Wilds**

The world is a wilderness marked by old magical fire, ash-covered forests, forgotten shrines, and living ember roots. It should feel ancient, damaged, and dangerous, but not dead.

### 6.1 Key Locations

**Ashwood Trail**  
A burned enchanted forest. Trees are charcoal-black outside but still glow faintly within. This is the main early combat environment.

**Cinder Shrine**  
Small old shrines carved with pet-spirit symbols. This is a strong setting for pet upgrades, story events, and memory unlocks.

**Emberroot Hollow**  
Underground roots with warm internal glow. Good for Ember Fox memories and quiet story moments.

**Glassfall Ruins**  
Old ruins partly melted into glass by ancient heat. This can support elite or boss visual direction later.

**Campfire Journal Space**  
A safe interstitial space where the Keeper opens the journal and Ember Fox sits nearby, lighting the page with its tail. This may become an important reward, upgrade, or memory screen identity.

---

## 7. First Player Class Direction

Working class name:

**The Ashbound Keeper**

The Keeper is not a traditional warrior or pure mage. The Keeper is a traveler, handler, field researcher, and companion-bonded tactician.

### 7.1 Visual Notes

The Keeper should have:

- a cloak or long travel coat with slightly burnt edges;
- a rune glove, command bracer, whistle, charm, or small signal tool;
- a field journal or card case;
- practical boots and travel gear;
- a staff, short blade, or simple tool-like weapon that does not overpower the pet visually.

The Keeper's palette should be quieter than Ember Fox:

- charcoal;
- worn leather;
- muted teal or moss;
- warm parchment;
- small ember accents.

The Keeper should look observant and tactical, not like a lone damage-dealing hero who happens to own a pet.

### 7.2 Combat Avatar Direction

The combat avatar should be simple and practical.

Recommended Phase 1 pose set:

- idle / ready;
- command pose;
- hurt or guarded pose.

The avatar can be small and silhouette-readable. It does not need full animation at first.

The Keeper avatar is not a card, not a large illustrated portrait, and not the main stat display. It is a battlefield target and relationship anchor.

---

## 8. Ember Fox Direction

Ember Fox is the first active pet and the emotional anchor of Phase 1.

### 8.1 Role

Ember Fox is:

- a persistent companion;
- a combat partner;
- a burn/status enabler;
- a command responder;
- a guard/protection participant;
- a bond-scaling pet whose upgrades change behavior and story progression.

Ember Fox is not:

- a generic fire fox;
- a background mascot;
- a temporary summon;
- a static icon;
- a wolf with orange fire effects.

### 8.2 Shape and Silhouette

Ember Fox should be a small-to-medium fox with a readable silhouette:

- pointed ears;
- long expressive tail;
- light agile body;
- low combat crouch;
- quick directional posture;
- fire or ember detail concentrated around the tail, paws, eyes, and forehead rune.

### 8.3 Palette

Initial palette direction:

- ember orange;
- burnt sienna;
- charcoal markings;
- warm gold eyes;
- subtle pale gold or blue-gold spiritual highlights;
- small fire particles, not constant huge flames.

### 8.4 Markings

Possible visual signatures:

- a small ember rune on the forehead;
- charcoal-dark ear tips and paws;
- ember cracks or markings along the body;
- faint pawprint sparks when moving;
- tail tip like a glowing coal brush.

The markings should feel mystical and companion-like, not demonic.

### 8.5 Personality

Ember Fox should feel:

- curious;
- loyal;
- alert;
- agile;
- slightly wild;
- emotionally responsive to the player.

At higher bond, Ember Fox should visually appear more synchronized with the Keeper: looking back for commands, anticipating action, or reacting during reward and memory screens.

### 8.6 Combat Poses

Important pose set for concept art and early sprite generation:

- idle alert stance;
- commanded response pose;
- forward bite or dash attack;
- tailguard defensive pose;
- burn-application pose;
- hurt or pressured pose if pet injury is introduced later;
- calm journal/campfire pose.

### 8.7 Pet HP Decision

**Phase 1 should not show Ember Fox with an HP bar.**

Reason: a pet HP bar implies a much larger combat system involving enemy pet targeting, pet death, injury, revival, and pet-protection balancing. That is too large for the first playable slice.

Instead, Ember Fox can display:

- active pet base ring;
- readiness icon;
- pet status tray;
- ember charge pips;
- guard or empowered state;
- command glow.

Pet pips are not HP. They represent charges, readiness, or temporary pet resources.

---

## 9. Early Gameplay Visual Seeds

These are visual seeds only, not final balance commitments.

### 9.1 Example Pet-Command Cards

**Fox Bite**  
Ember Fox lunges forward and bites. If the target has burn, the effect may be enhanced.

Visual: low fox dash, ember trail, sharp but readable action.

**Kindle Mark**  
The Keeper marks an enemy with a rune; Ember Fox's forehead rune responds and burn is applied.

Visual: command line from card to Ember Fox, enemy target ring, then burn application on target.

**Tailguard**  
Ember Fox returns to the Keeper and curls its tail into a protective ember shield.

Visual: warm defensive arc, fox close to Keeper avatar, clear block/guard read in Player HUD.

### 9.2 Example Pet Upgrades

**Soot-Paw Instinct**  
The first pet-command card each turn creates an extra minor fox reaction.

Visual: glowing pawprint rune around Ember Fox's paws.

**Banked Ember**  
Burn damage stores ember charges around the fox. A later pet-command card is empowered.

Visual: small floating embers or charge pips around the pet base ring.

**Old Shrine Memory**  
Unlocks a memory and possibly opens an evolution branch or future pet-command reward pool.

Visual: fox looking at an old shrine carving of an ancestral fox spirit.

---

## 10. Practical Combat UI/UX Direction v0.2

### 10.1 Overall Composition

The current committed combat composition is:

**side-view party-versus-enemies formation**

Left side:

- small Keeper battlefield avatar;
- Ember Fox active pet, slightly forward;
- subtle future pet slots near the party cluster.

Right side:

- enemy sprites / silhouettes;
- each enemy with intent icon above, HP/status below, and target ring at base.

Bottom:

- Player HUD panel;
- energy orb;
- draw pile;
- hand cards;
- discard pile;
- end turn button.

Top:

- mostly empty;
- small menu button only.

This layout is chosen because it makes attacks directional, pet guarding readable, and target selection practical.

### 10.2 Why Not Front-Facing Enemy Attacks

Enemies should not primarily face the camera and splash attacks onto the screen.

That style can look dramatic, but it creates UX problems:

- it is unclear whether enemies attack the Keeper, the pet, or the player as the camera;
- pet guard becomes harder to express;
- three enemies attacking can clutter the screen;
- VFX may cover the hand and cards;
- player damage becomes abstract if the Keeper is only a HUD panel.

Instead, enemies face the Keeper and Ember Fox from the right side. Enemy attacks travel leftward toward the Keeper avatar by default.

### 10.3 Keeper Battlefield Avatar

The Keeper avatar is on the battlefield.

Purpose:

- enemy attacks have a visible target;
- self-target cards have a visible anchor;
- the Keeper can visually command Ember Fox;
- Tailguard and protection effects make sense;
- the player-pet bond is visible in combat.

Rules:

- The Keeper avatar is not a hand card.
- The Keeper avatar is not the main player stat panel.
- The Keeper avatar should not visually overpower Ember Fox.
- Player HP, block, and buffs/debuffs are shown in the Player HUD panel.

### 10.4 Player HUD Panel

The Player HUD panel lives in the bottom-left HUD area.

It displays:

- Keeper portrait or class icon;
- HP bar;
- block shield badge or block bar;
- player buff/debuff tray.

It responds to:

- player damage;
- block gained;
- player status applied;
- self-target card hover;
- enemy attack impact.

The Player HUD panel is the authoritative state readout for the player. The battlefield avatar is the visual target and animation anchor.

### 10.5 Ember Fox Active Pet Area

Ember Fox stands near the Keeper, slightly forward.

It displays:

- Ember Fox sprite or silhouette;
- active pet base ring;
- two or three ember charge pips;
- pet status tray;
- command glow state.

Rules:

- no pet HP bar in Phase 1;
- pet pips are charge/readiness resources, not life;
- pet statuses are local to the pet and should not appear in a global top bar;
- pet ring can glow when a pet-command card is hovered or played.

### 10.6 Future Pet Slots

Future pet slots may be shown as faint inactive rune circles near the party cluster.

Rules:

- subtle, small, and low-contrast;
- no heavy lock icons;
- do not make them look like monetized mobile-game slots;
- do not place them so prominently that they distract from Ember Fox.

The purpose is to keep the layout future-ready for multiple active pets while keeping Phase 1 focused.

### 10.7 Enemy Presentation

Enemies should be sprites or silhouettes, not cards.

Each enemy slot should include:

- intent icon above;
- enemy sprite / silhouette;
- HP bar below;
- enemy status tray below HP;
- base target ring under the enemy.

Enemy cards are not recommended because they visually conflict with the player's hand cards.

### 10.8 Enemy Intent Icons

Enemy intent icons belong above enemies.

They should represent the enemy's next action, such as:

- attack;
- defend;
- buff;
- debuff;
- special;
- unknown/charging.

Enemy overhead space should primarily be reserved for intent. Buffs and debuffs should not compete with intent overhead.

### 10.9 Enemy HP and Status Tray

Enemy HP appears below the enemy sprite.

Enemy buffs/debuffs/statuses appear in a local status tray below the HP bar.

Examples:

- burn;
- mark;
- shield/block;
- strength-like buff;
- vulnerability-like debuff;
- special boss state.

When a status is newly applied, the icon may briefly pop near the enemy body, then settle into the status tray.

### 10.10 Target Rings

Target rings are the primary way to show targetability.

Enemy ring states:

- faint ring: valid target;
- medium ring: hovered target;
- strong ring: selected target;
- impact pulse: target just hit.

Pet ring states:

- active pet;
- pet-command hover;
- pet-command resolving;
- empowered/charged.

Keeper avatar/HUD states:

- self-target hover;
- enemy attack target;
- guard/block preview;
- damage impact.

### 10.11 Pet-Command Targeting Grammar

This is a core UX rule.

**Orange command line = card-to-pet command relationship.**

It does not represent final damage path.

For a pet-command attack card:

1. The hand card is hovered or selected.
2. The card lifts and glows.
3. An orange command line points from the card to Ember Fox.
4. Valid enemy targets show faint target rings.
5. The hovered or selected enemy gets a stronger target ring.
6. On play, Ember Fox reacts and attacks the selected enemy.

This means:

- orange line answers: who receives the command?
- enemy ring answers: who receives the effect?
- pet animation answers: how the command is executed?

Normal player attack cards do not use the orange command line. They use enemy target rings directly.

Self cards highlight the Keeper avatar and Player HUD panel.

Pet support cards use the orange command line to Ember Fox but may not show enemy target rings.

Tailguard cards use the orange command line to Ember Fox and show a guard/block preview on the Keeper avatar and Player HUD panel.

### 10.12 Enemy Attack Grammar

In Phase 1, enemies attack the Keeper/player by default.

A standard enemy attack should read as:

1. enemy intent shows attack;
2. enemy performs wind-up / lunge / projectile toward the left side;
3. attack direction points toward the Keeper avatar;
4. shield/impact effect appears near Keeper avatar or between Keeper and enemy;
5. Player HUD HP/block updates and pulses;
6. if Tailguard or guard is active, Ember Fox intercepts visually with tail shield or guard arc.

Enemies should not primarily attack the camera/screen.

If future content allows enemies to attack pets, that must be a clearly introduced system with its own intent marker and pet condition UI.

---

## 11. Bottom HUD Direction

### 11.1 Layout

Recommended bottom HUD order:

```txt
[Player HUD] [Energy Orb] [Draw Pile] [Hand Cards] [Discard Pile] [End Turn]
```

### 11.2 Energy Orb

Energy should be separate from the Player HUD.

It displays current turn energy and optionally max energy.

It should respond to:

- turn start refill;
- card play energy spend;
- insufficient energy card hover;
- energy gain effects.

### 11.3 Draw Pile and Discard Pile

Draw pile appears left of the hand.

Discard pile appears right of the hand.

This supports a readable card flow:

```txt
Draw Pile -> Hand -> Played Card -> Discard Pile
```

During reshuffle, discard pile can animate back to draw pile.

Only draw and discard piles should be shown in Phase 1 unless exhaust is implemented.

### 11.4 Hand Cards

Hand cards should be code-assembled, not baked as full image cards.

A card presenter should compose:

- card frame;
- cost circle;
- art window;
- title text;
- rules text;
- tag icons;
- type badge;
- hover outline;
- playable/unplayable state.

Image generation should create frames, icons, and art windows. Text, numbers, cost, and rules should be rendered by code.

### 11.5 Card Type and Cost

Do not confuse card cost with card type.

Recommended structure:

- cost circle in a consistent position, usually top-left;
- pet-command identity through border, paw-rune badge, or type badge;
- burn/guard/draw/etc. through tag icons, not by replacing cost.

### 11.6 End Turn Button

The end turn button belongs at the bottom-right.

For final UI, it should use code-rendered text such as `End Turn` or a clear turn-arrow icon.

Avoid a pure play-triangle icon in final UI because it may read as video playback rather than turn ending.

---

## 12. Local Status Rules

Statuses should be local to their affected target.

### 12.1 Player Buff/Debuff

Player statuses appear in the Player HUD panel.

Examples:

- burn;
- guard;
- block-related state;
- mark;
- class buff;
- temporary debuff.

### 12.2 Pet Buff/Debuff

Pet statuses appear below or around the active pet base ring.

Examples:

- ready;
- commanded this turn;
- empowered;
- guarding;
- banked ember charge;
- temporary debuff if introduced later.

### 12.3 Enemy Buff/Debuff

Enemy statuses appear below enemy HP bars in local status trays.

Enemy overhead should be reserved for intent.

### 12.4 Global Battle Effects

Global battle effects are not part of the Phase 1 combat layout unless absolutely needed.

If added later, they should use a small, clearly separate battle modifier strip, not the old top-center status strip.

---

## 13. Production Feasibility Rules

### 13.1 Do Not Treat AI UI Mockups as Final UI

Generated UI mockups are references, not production screenshots.

The playable UI should be built from modular assets and code.

Recommended breakdown:

- static background plate;
- Keeper avatar sprite;
- Ember Fox pose sprites;
- enemy sprite assets;
- reusable card frames;
- reusable UI panels;
- icon set;
- VFX sprites;
- code-rendered text/numbers;
- Phaser tweens and pose swaps.

### 13.2 Prefer Pose Swaps + Tweens Over Full Animation

Phase 1 should not require full hand-drawn animation.

Use:

- idle bob;
- pose swap;
- short dash tween;
- shake/flash;
- glow/pulse;
- simple particles;
- command line curve;
- target ring pulse.

### 13.3 Keep Visual Complexity Below Concept Art Density

Concept art can be rich. In-game UI must be clearer.

Combat UI should prioritize:

- large hit areas;
- readable cards;
- clean intent icons;
- visible target rings;
- local status trays;
- clear player/pet/enemy separation;
- minimal top HUD.

---

## 14. Phaser Presenter Implications

The combat UI should map cleanly to presenters.

Suggested presenters:

- `PlayerAvatarPresenter` — battlefield Keeper avatar, target anchor, hurt/command pose;
- `PlayerHudPresenter` — player HP, block, player statuses;
- `PetPresenter` — Ember Fox sprite, pet ring, charge pips, pet statuses;
- `MonsterPresenter` — enemy sprite, intent, HP, status tray, target ring;
- `CardPresenter` — code-assembled hand cards;
- `CombatHudPresenter` — energy, draw pile, discard pile, end turn;
- `TargetingPresenter` — valid rings, selected target, command line;
- `CombatEventPlayer` — consumes events and plays visual feedback.

Suggested event playback mapping:

```txt
CardPlayed
-> CardPresenter moves/lifts card

EnergySpent
-> Energy orb pulses and updates

PetCommanded
-> Orange command line pulses from card to Ember Fox
-> Pet ring glows

PetReacted
-> Ember Fox pose changes or dashes

DamageDealt
-> Monster shakes/flashes
-> HP bar updates

StatusApplied
-> Status icon pops near target
-> Status icon settles into local status tray

BlockGained
-> Player HUD or target shield badge pulses

MonsterIntentSet
-> Intent icon updates above enemy
```

---

## 15. Card Frame Families

### 15.1 Normal Card

Visual language:

- parchment base;
- clean border;
- class symbol;
- readable art window;
- clear title/rules zones;
- restrained decoration.

### 15.2 Pet-Command Card

Visual language:

- paw-rune border or badge;
- warm ember accent;
- pet-command type indicator;
- clear compatibility with the orange command line.

Pet-command cards should instantly read as cards that instruct or interact with a pet.

### 15.3 Pet Upgrade Reward

Pet upgrade rewards should feel different from normal hand cards.

They may look like:

- shrine tokens;
- journal stickers;
- pinned charms;
- carved memory plates;
- evolution fragments.

They should still fit into a practical reward UI.

---

## 16. Reward Screen Direction

The reward screen should not be only three cards floating on a blank background.

Preferred direction:

- campfire clearing or Cinder Shrine;
- Ember Fox visible on the side;
- card reward options and pet-upgrade options presented together;
- hovering a pet upgrade causes Ember Fox to react;
- upgrade selection should feel like growth of the companion, not only a stat increase.

Practical implementation:

- static shrine/campfire background;
- Ember Fox calm/idle sprite;
- reusable card presenters;
- pet upgrade presenter as charm/token panel;
- code-rendered text;
- hover glow and pet reaction tween.

---

## 17. Map Screen Direction

The run map should feel like a journal map.

Possible motifs:

- ink path lines;
- layered wilderness route;
- glowing available nodes;
- completed nodes marked with ash or ember stamp;
- current path shown through paired footprints: Keeper bootprint plus fox pawprint.

Practical implementation:

- background journal parchment;
- route lines drawn by code;
- node icons as sprites;
- available/completed/locked/active states as code-driven visuals;
- no baked full route image for live gameplay.

---

## 18. Pet Journal / Memory / Evolution Screen

The pet progression screen should be a two-page journal spread.

Left page:

- Ember Fox portrait;
- nickname;
- bond progress;
- current role or evolution state;
- unlocked pet upgrades.

Right page:

- memories;
- story flags;
- evolution nodes;
- locked sketches covered in ash;
- unlocked memories as warm hand-drawn illustrations.

This screen should make pet progression feel personal, not mechanical.

---

## 19. Initial Color Direction

Approximate palette only. Final colors may change after concept images and UI tests.

- Ember Orange: `#E96B2C`
- Coal Black: `#1F1A18`
- Charcoal Blue: `#222C3A`
- Burnt Sienna: `#9B4A2D`
- Warm Parchment: `#D8B980`
- Soft Gold: `#F2B85B`
- Muted Moss/Teal: `#46635E`
- Ash Gray: `#7D756C`

Lighting principle:

Warm foreground ember light should contrast with cool charcoal-blue shadows.

For practical UI mockups, reduce color complexity first. Prove layout readability before adding full color.

---

## 20. First Concept Art Set

The concept-art set remains useful, but its purpose is now separated from production UI.

### 20.1 Image 1 — World and Duo Mood Concept

Purpose: establish tone, world, Keeper/Ember Fox relationship, and color direction.

Content:

- The Ashbound Keeper;
- Ember Fox as co-hero;
- Ashwood Trail entrance;
- ancient glowing ruin in distance;
- ash particles;
- warm ember light against cool shadows;
- no UI and no text.

### 20.2 Image 2 — Ember Fox Character Sheet

Purpose: establish silhouette, personality, poses, and markings.

Content:

- front view;
- side view;
- combat crouch;
- command reaction;
- tailguard pose;
- calm campfire pose;
- forehead rune and tail detail.

### 20.3 Image 3 — Practical Combat Wireframe

Purpose: validate achievable combat layout.

Current committed direction:

- side-view party-versus-enemies;
- Keeper avatar on battlefield;
- Ember Fox active pet;
- enemy sprites, not cards;
- local status trays;
- pet-command line to Ember Fox;
- enemy target rings for selected effect target;
- player stats in bottom-left HUD.

### 20.4 Image 4 — Card Frame Exploration

Purpose: distinguish normal cards, pet-command cards, and pet-upgrade rewards.

Content:

- three card frame variants;
- icon language;
- readable title/text zones;
- art window placement;
- cost/energy treatment.

### 20.5 Image 5 — Reward and Pet Upgrade Screen

Purpose: make pet growth feel central.

Content:

- campfire or Cinder Shrine;
- card rewards;
- pet upgrade reward;
- Ember Fox reacting to hover/selection;
- journal or shrine motif.

### 20.6 Image 6 — Pet Journal / Memory / Evolution Screen

Purpose: define long-term pet progression UI.

Content:

- double-page journal;
- Ember Fox portrait;
- bond progress;
- memory sketches;
- evolution branch nodes;
- locked and unlocked states.

### 20.7 Image 7 — Run Map Screen

Purpose: define route progression style.

Content:

- journal-map route;
- available/completed/locked nodes;
- bootprint plus fox-paw current path;
- subtle pet slot or companion indicator.

---

## 21. Updated Low-Fidelity Combat Wireframe Prompt

This prompt reflects the current v0.2 combat UI consensus.

```txt
16:9 low-fidelity practical wireframe for a pet-centered roguelite deckbuilder combat screen, clean grey parchment background, no final art, no readable text, no decorative painting, production-feasible Phaser layout.

The top UI is almost empty, only a small menu button in the top right.

The upper 68 percent is the combat battlefield. Use a side-view party-versus-enemies formation. On the left side of the battlefield, show a small Keeper battlefield avatar silhouette standing slightly behind the active pet. The Keeper is a visual target and command source, not a card and not a large detailed character. Next to the Keeper and slightly forward, show Ember Fox as a simple three-quarter side-view fox silhouette standing on an active circular pet base ring. Around the pet ring show two or three small ember charge pips, clearly not HP. Below the pet ring show a small pet status tray. Near the party cluster, show two very faint inactive future pet slot circles, small and subtle, no heavy lock icons.

On the right side of the battlefield, show three enemy sprite silhouettes facing left, not cards. Each enemy stands on a base target ring. Above each enemy is a large intent icon circle. Below each enemy sprite is an HP bar placeholder and a local enemy status icon tray. One enemy has a stronger selected target ring, other valid enemies have faint rings.

The composition should make it clear that enemies attack the Keeper/player by default, while Ember Fox can guard or respond. Enemy attacks should target the Keeper avatar direction, not the camera.

The bottom HUD contains a compact Player status panel on the far left with portrait circle, HP bar, block shield badge, and local player buff/debuff tray. Next to it is a separate ember energy orb. Then a face-down draw pile stack, five large hand cards in the center, a face-up or tilted discard pile stack, and a large end turn button on the far right.

One hand card is lifted as a hovered pet-command attack card. The hovered card has a paw-rune badge and an orange command line from the card to Ember Fox only. The orange line does not point to the enemy. Valid enemy targets are shown by faint base rings, and the selected enemy target is shown by a stronger ring.

All card text areas are blank bars only. Cost circles, title bars, rules text bars, and tag icon rows are visible as placeholders. Use modular UI boxes, clear hitboxes, large readable zones, code-rendered text and numbers, local status trays, practical 2D interface, implementable in Phaser with presenters and layout helpers.
```

Negative direction:

```txt
no readable text, no logo, no watermark, no fake handwriting, no detailed fantasy painting, no full player card on the battlefield, no enemy cards, no front-facing first-person attack composition, no enemy attacks splashing directly at the camera, no top global status strip, no tiny unreadable icons, no cluttered HUD, no photorealism, no sci-fi UI, no mobile gacha UI, no existing game clone, no baked numbers, no heavy lock icons, do not make the orange command line point directly to the enemy, do not make pet pips look like HP, do not hide the Keeper avatar, do not hide Ember Fox
```

---

## 22. Watchouts

Avoid making the game look like a generic fantasy deckbuilder.

Avoid making Ember Fox too cute and powerless. It should be lovable, but still capable and wild.

Avoid making the UI too decorative. Tactical readability matters.

Avoid designing combat composition that can only ever support one pet.

Avoid pet upgrades that look like ordinary stat cards. Pet upgrades should feel like companion growth, memory, behavior, or evolution.

Avoid visual effects that cover the board and hide intent, damage, burn, or block readability.

Avoid front-facing enemy attack grammar where enemies primarily attack the screen.

Avoid placing all buffs/debuffs in a global top strip. Statuses should stay local to their target.

Avoid making enemies look like cards. Enemy sprites and player hand cards must have different visual languages.

Avoid making the Keeper a battlefield card. Use a small battlefield avatar plus a separate Player HUD panel.

Avoid giving Ember Fox an HP bar in Phase 1 unless the design intentionally commits to pet injury/death/targeting systems.

---

## 23. Open Questions for Later

These remain intentionally unresolved:

- Will pets ever have HP, condition, injury, or morale?
- Can enemies target pets in later phases?
- How many active pet slots should future classes support?
- Should the Keeper avatar be customizable?
- Should boss HP use a separate large boss bar?
- How many statuses can be shown before a `+N` overflow indicator is needed?
- Should pet charge pips be tied to a specific mechanic such as Banked Ember, or remain generic for now?
- What is the exact final card aspect ratio?
- Should the end turn button use text, icon, or both?
- How much of the final UI should use generated art directly versus hand-built vector/shape assets?

---

## 24. Evaluation Rubric for Practical Combat UI

A combat wireframe or implementation should be judged by these questions:

1. Can the player immediately identify the Keeper, Ember Fox, and enemies?
2. Is Ember Fox clearly a battlefield co-hero?
3. Is the Keeper present as an enemy target without becoming a card?
4. Are enemy intents readable above enemies?
5. Are enemy HP and statuses local and readable?
6. Are player HP/block/statuses clear in the Player HUD?
7. Are pet charges/statuses readable without implying pet HP?
8. Does a pet-command card clearly point to Ember Fox first?
9. Is the selected enemy target clear through target rings?
10. Can normal player cards, self cards, pet-command cards, and pet support cards be distinguished?
11. Is the bottom HUD practical for Phaser implementation?
12. Does the layout stay future-ready for multiple pets?
13. Does the screen avoid unnecessary top HUD clutter?
14. Can this be assembled from modular assets and code-rendered text?

---

## 25. Version Notes

### v0.2 — 2026-05-26

Revised after practical low-fidelity combat UI exploration.

Main changes:

- committed to side-view party-versus-enemies combat layout;
- restored a small Keeper battlefield avatar for enemy targeting and pet-guard readability;
- clarified that player stats remain in a separate Player HUD panel;
- clarified that enemies should be sprites/silhouettes, not cards;
- clarified that Ember Fox should not show a Phase 1 HP bar;
- defined pet charge pips and local pet status tray;
- defined local status trays for player, pet, and enemies;
- removed global top status strip from Phase 1 combat UI;
- defined pet-command targeting grammar: orange line to pet, enemy ring for effect target;
- clarified enemy attack grammar: enemies attack Keeper direction, not the camera;
- revised bottom HUD order: Player HUD, energy, draw pile, hand, discard pile, end turn;
- added production feasibility rules for modular assets and Phaser presenters.

### v0.1 — 2026-05-25

Initial design direction created.

Committed working direction:

**Ember Journal — Ashbound Companions**

Main decisions:

- pet-first visual identity;
- Ember Fox as first emotional anchor;
- Ashbound Wilds world direction;
- warm danger tone;
- field-journal UI language;
- future multi-pet-ready layout direction;
- first concept art sequence defined;
- first image prompt seed drafted.
