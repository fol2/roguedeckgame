# Design Direction v0.1 — Ember Journal: Ashbound Companions

Status: Living draft  
Version: 0.1  
Date: 2026-05-25  
Scope: Concept art direction and early UI/UX visual framing  
Related project docs: `architecture.md`, `Slay the Spire Inspired Game.txt`

## 1. Purpose

This document captures the first committed visual and UX direction for the pet-centered roguelite deckbuilder. It is intentionally versioned as `v0.1` because the theme, art direction, UI style, and concept-art prompts may change after the first image explorations.

This document is not final art direction. It is a shared starting point for concept art, generated image prompts, UI/UX mockups, and later implementation decisions.

## 2. Current Step

The current step is visual pre-production, not implementation.

The goal is to frame:

- the visual identity of the game;
- the emotional role of the pet companion;
- the first concept art targets;
- the early UI/UX language;
- the first image-generation direction.

The immediate next creative step after this document is to generate the first mood concept image. No UI implementation, Phaser scene work, combat implementation, balance design, or production art should be started from this document alone.

## 3. Existing Project Truths

The game is a browser-first, TypeScript + Vite + Phaser 4, pet-centered roguelite deckbuilder.

The game may be inspired by deckbuilder roguelikes, but it should not visually or emotionally present itself as a direct Slay the Spire clone.

The core identity is:

- The player selects persistent pets before a run.
- Pets are always present in combat.
- Players interact with pets through pet-command cards and class abilities.
- Pet upgrades affect pet behavior, pet modifiers, command-card patterns, evolution paths, and side-story progression.
- Roguelite progression should unlock choices, memories, side stories, evolution routes, and build variety rather than only increasing numbers.
- Pet side stories are separate from the main story.
- Phase 1 supports one active pet, Ember Fox, but the visual and layout direction should remain future-ready for multiple active pets.

## 4. Committed Direction v0.1

Working title for the visual direction:

**Ember Journal — Ashbound Companions**

One-line creative promise:

**A traveler and their ember fox companion cross a dangerous ash-covered wilderness, using cards as signals, commands, memories, and moments of trust.**

Tone keywords:

- warm but dangerous;
- soft fantasy, not childish;
- pet-centered adventure;
- field journal magic;
- ash forest, old shrines, ember light;
- readable tactical combat;
- companion bond;
- future multi-pet ready.

Core emotional target:

The player should feel that Ember Fox is a co-hero. The fox is not a mascot, cosmetic follower, disposable summon, or generic fire effect. The player is surviving because of the relationship between the Keeper and the pet.

## 5. Art Pillars

### 5.1 Pet Is the Co-Hero

Ember Fox must be visually present and emotionally important in combat, reward screens, story screens, and progression screens.

The fox should have a clear silhouette, posture, expression, and reaction states. It should feel like a persistent companion with memory and agency.

### 5.2 Cards Are Communication

Cards are not only attacks and spells. In this game, some cards represent player-to-pet communication.

Pet-command cards should read differently from normal cards. They should visually communicate signal, trust, command, and response.

A player should immediately understand when a card means:

- the player acts directly;
- the player commands Ember Fox;
- Ember Fox reacts;
- the player and pet perform a combo.

### 5.3 Warm Danger

The world should not be pure cozy fantasy and should not be grimdark horror.

The desired feeling is a campfire in a hostile wilderness: warm light, old paper, ember glow, but also ash, monsters, ruins, and pressure.

### 5.4 Field Journal UI

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

### 5.5 Future Multi-Pet Ready

Phase 1 only needs Ember Fox, but visual structure should not lock the game into a forever-single-pet layout.

Combat, map, reward, and pet-journal UI should be able to expand later into multiple pet slots or multiple active companions.

### 5.6 Event-Readable Combat

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
- reward offered;
- story or memory unlocked.

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

## 8. Ember Fox Direction

Ember Fox is the first active pet and the emotional anchor of Phase 1.

### 8.1 Role

Ember Fox is:

- a persistent companion;
- a combat partner;
- a burn/status enabler;
- a command responder;
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

Important pose set for concept art:

- idle alert stance;
- commanded response pose;
- forward bite or dash attack;
- tailguard defensive pose;
- burn-application pose;
- hurt or pressured pose;
- calm journal/campfire pose.

## 9. Early Gameplay Visual Seeds

These are visual seeds only, not final balance commitments.

### 9.1 Example Pet-Command Cards

**Fox Bite**  
Ember Fox lunges forward and bites. If the target has burn, the effect may be enhanced.

Visual: low fox dash, ember trail, sharp but readable action.

**Kindle Mark**  
The Keeper marks an enemy with a rune; Ember Fox's forehead rune responds and burn is applied.

Visual: command line between card, Keeper, fox, and enemy.

**Tailguard**  
Ember Fox returns to the Keeper and curls its tail into a protective ember shield.

Visual: warm defensive arc, fox close to player, clear block/guard read.

### 9.2 Example Pet Upgrades

**Soot-Paw Instinct**  
The first pet-command card each turn creates an extra minor fox reaction.

Visual: glowing pawprint rune around Ember Fox's paws.

**Banked Ember**  
Burn damage stores ember charges around the fox. A later pet-command card is empowered.

Visual: small floating embers around the tail.

**Old Shrine Memory**  
Unlocks a memory and possibly opens an evolution branch or future pet-command reward pool.

Visual: fox looking at an old shrine carving of an ancestral fox spirit.

## 10. UI/UX Direction

### 10.1 Overall UI Feel

The UI should combine tactical clarity with field-journal warmth.

It should avoid:

- sterile sci-fi UI;
- generic fantasy stone UI;
- excessive ornate decoration that hides game state;
- clutter that makes card effects or monster intents hard to read.

### 10.2 Combat Screen

Initial composition:

- enemies in upper or middle-right area;
- player/Keeper on lower-left or middle-left;
- Ember Fox near the Keeper but slightly forward;
- hand of cards along the bottom;
- energy as a glowing ember core near the hand;
- monster intent icons above enemies;
- status icons near combatants;
- active pet slot near the player/pet area.

When a pet-command card is hovered, a faint command line or rune trail can connect the card to Ember Fox.

When a pet-command card is played, the card, Keeper, and Ember Fox should all participate visually in the event.

### 10.3 Card Frame Families

**Normal Card**  
Parchment, ink, class symbol, clean readable text panel.

**Pet-Command Card**  
Paw-rune border, Ember Fox sigil, warmer glow, visual connection to pet.

**Pet Upgrade Reward**  
Should feel less like a normal hand card and more like a shrine token, journal sticker, carved charm, or memory fragment.

### 10.4 Reward Screen

The reward screen should not be only three cards floating on a blank background.

Preferred direction:

- campfire clearing or Cinder Shrine;
- Ember Fox visible on the side;
- card reward options and pet-upgrade options presented together;
- hovering a pet upgrade causes Ember Fox to react;
- upgrade selection should feel like growth of the companion, not only a stat increase.

### 10.5 Map Screen

The run map should feel like a journal map.

Possible motifs:

- ink path lines;
- layered wilderness route;
- glowing available nodes;
- completed nodes marked with ash or ember stamp;
- current path shown through paired footprints: Keeper bootprint plus fox pawprint.

### 10.6 Pet Journal / Memory / Evolution Screen

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

## 11. Initial Color Direction

Approximate palette only. Final colors may change after concept images.

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

## 12. First Concept Art Set

The first concept-art batch should be small and purposeful.

### 12.1 Image 1 — World and Duo Mood Concept

Purpose: establish tone, world, Keeper/Ember Fox relationship, and color direction.

Content:

- The Ashbound Keeper;
- Ember Fox as co-hero;
- Ashwood Trail entrance;
- ancient glowing ruin in distance;
- ash particles;
- warm ember light against cool shadows;
- no UI and no text.

### 12.2 Image 2 — Ember Fox Character Sheet

Purpose: establish silhouette, personality, poses, and markings.

Content:

- front view;
- side view;
- combat crouch;
- command reaction;
- tailguard pose;
- calm campfire pose;
- forehead rune and tail detail.

### 12.3 Image 3 — Combat Screen Concept

Purpose: test tactical readability and pet-command flow.

Content:

- Keeper;
- Ember Fox;
- one or two enemies;
- monster intent icons;
- hand of cards;
- energy ember;
- pet slot;
- burn/block/status indicators.

### 12.4 Image 4 — Card Frame Exploration

Purpose: distinguish normal cards, pet-command cards, and pet-upgrade rewards.

Content:

- three card frame variants;
- icon language;
- readable title/text zones;
- art window placement;
- cost/energy treatment.

### 12.5 Image 5 — Reward and Pet Upgrade Screen

Purpose: make pet growth feel central.

Content:

- campfire or Cinder Shrine;
- card rewards;
- pet upgrade reward;
- Ember Fox reacting to hover/selection;
- journal or shrine motif.

### 12.6 Image 6 — Pet Journal / Memory / Evolution Screen

Purpose: define long-term pet progression UI.

Content:

- double-page journal;
- Ember Fox portrait;
- bond progress;
- memory sketches;
- evolution branch nodes;
- locked and unlocked states.

### 12.7 Image 7 — Run Map Screen

Purpose: define route progression style.

Content:

- journal-map route;
- available/completed/locked nodes;
- bootprint plus fox-paw current path;
- subtle pet slot or companion indicator.

## 13. Prompt Seed for First Image

This is a draft prompt for the next step. It should be revised before generation if needed.

```txt
16:9 concept art for a pet-centered roguelite deckbuilder video game, a young ashbound keeper traveler standing at the edge of a burned enchanted forest, accompanied by a small mystical ember fox companion, warm orange firelight against charcoal blue shadows, ancient glowing ruins in the distance, ash particles floating in the air, soft fantasy adventure tone, dangerous but cozy, the fox is a co-hero not a mascot, subtle magical field journal aesthetic, painterly game concept art, readable silhouettes, no modern objects, no UI, no text
```

Negative direction:

```txt
avoid childish cartoon, avoid generic anime mascot, avoid realistic horror, avoid sci-fi, avoid overdesigned armor, avoid huge weapons, avoid making the fox look like a wolf, avoid cluttered background, avoid text or logos
```

## 14. Things Not Decided Yet

The following are intentionally undecided in v0.1:

- final rendering style: painterly, clean 2D illustration, semi-flat, or hybrid;
- exact character age, gender presentation, and face design for the Keeper;
- final UI layout dimensions;
- final card typography and font choices;
- exact evolution branches for Ember Fox;
- exact monster visual style;
- final world lore explanation;
- production asset pipeline;
- whether generated art will be used only as reference or as direct placeholder art.

## 15. Watchouts

Avoid making the game look like a generic fantasy deckbuilder.

Avoid making Ember Fox too cute and powerless. It should be lovable, but still capable and wild.

Avoid making the UI too decorative. Tactical readability matters.

Avoid designing combat composition that can only ever support one pet.

Avoid pet upgrades that look like ordinary stat cards. Pet upgrades should feel like companion growth, memory, behavior, or evolution.

Avoid visual effects that cover the board and hide intent, damage, burn, or block readability.

## 16. Evaluation Rubric for First Mood Concept

The first generated image should be judged by these questions:

1. Does Ember Fox feel like a co-hero?
2. Does the world feel warm but dangerous?
3. Does the Keeper look like someone who commands and bonds with pets, not a generic warrior?
4. Is the silhouette readable at small size?
5. Is the image distinct from generic fantasy card games?
6. Does the style suggest a future field-journal UI naturally?
7. Can this direction support combat, reward, map, and pet memory screens?
8. Can the concept expand to future multiple active pets?

## 17. Version Notes

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
