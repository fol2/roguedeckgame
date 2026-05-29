# Combat Asset Manifest v0.1 — 4K-Ready Combat Only

Status: Draft for acceptance  
Version: 0.1  
Date: 2026-05-29  
Scope: Combat assets only  
Target project: browser-first TypeScript + Vite + Phaser pet-centered roguelite deckbuilder  
Related docs: `architecture.md`, `combat_card_game_rules.md`, `combat_content_foundation.md`, `ui_ux_interaction.md`, `design.md`

This document is the production asset contract for the combat screen. It translates the accepted combat UI/UX direction into image-generation-ready, Phaser-ready, and code-contract-ready asset requirements.

It is not a final art bible. It is not a reward/map/journal manifest. It is not a balance document.

The goal is to let the team generate all image-backed combat parts with image generation, while keeping the playable UI modular, code-driven, 4K-ready, and aligned with the v0.5 shared Card Actor combat model.

Policy summary: use a single runtime asset per asset key. Intent exact text and amount are code-rendered, along with scoped plan labels, reason tags, attack amount labels, End Turn text, tooltip/detail text, and all live gameplay values. Gameplay values must not be baked into images.

---

## 1. Current Combat Direction

Combat uses the accepted side-view party-versus-enemies layout:

```txt
[Keeper Avatar] [Ember Fox]       [Enemy 1] [Enemy 2] [Enemy 3]
```

The left side is the player party. The Keeper appears as a small battlefield avatar, and Ember Fox appears as the active pet co-hero. The right side contains enemy sprites or silhouettes, not battlefield cards. The bottom HUD contains player state, energy, draw pile, hand cards, discard pile, and End Turn.

The visual identity remains:

```txt
Ember Journal — Ashbound Companions
```

Core visual pillars for combat assets:

- clean and smooth strokes;
- polished console fantasy adventure feel;
- readable tactical RPG silhouettes;
- warm ember light against cool ash shadows;
- field-journal UI skin;
- parchment, ink, paw-runes, shrine marks, ember accents;
- no baked gameplay text;
- no full generated combat screenshots used as runtime UI;
- modular sprites, panels, icons, VFX, and card parts assembled by Phaser presenters.

---

## 2. Scope

### 2.1 In Scope

This manifest covers combat-only visual assets for:

- parallax combat backgrounds;
- Keeper battlefield avatar poses;
- Ember Fox combat poses;
- official Ashwood Trail enemy sprites;
- card frames, rarity visuals, source badges, family badges, and card art windows;
- enemy plan/Intent readout tokens;
- status icons and card tag icons;
- bottom HUD pieces;
- Player HUD pieces;
- pet slot and enemy slot presentation pieces;
- target rings and pet-command visual language;
- required hybrid VFX;
- tooltip/detail/modal skins;
- fallback placeholders;
- image-generation rules and acceptance checks.

### 2.2 Out of Scope

This manifest does not cover:

- reward screen assets;
- run map assets;
- pet journal, memory, or evolution screen assets;
- save/load UI;
- settings menu details beyond combat menu button/pause panel skin;
- final cutscenes;
- final animation sprite sheets;
- mobile/touch-specific UI;
- controller-specific UI;
- pet HP, pet injury, pet death, pet revive, or pet morale UI;
- enemy pet-targeting markers;
- large top boss HP bar;
- full pile inspection UI;
- player-facing combat log UI;
- generated full-card images with baked text;
- generated full combat screenshots used as runtime UI.

---

## 3. Non-Negotiable Asset Rules

These rules must not be violated by any generated asset.

1. **Gameplay text and numbers are code-rendered.**  
   Assets must not bake card titles, card rules, cost, HP, block, status stack, status duration, energy, pile counts, intent amounts, End Turn text, tooltip text, or debug text.

2. **Enemies are sprites, not cards.**  
   Enemy hands exist in the v0.5 card runtime, but they are hidden unless revealed/scoped/debugged. The combat board displays enemies as creatures with plan/Intent readouts.

3. **The Keeper avatar is not a card.**  
   The Keeper appears in the battlefield as a small avatar/silhouette. Player HP/block/statuses remain in the Player HUD.

4. **Ember Fox has no Phase 1 HP bar.**  
   No asset should imply pet HP, pet death, pet injury, or enemy pet targeting.

5. **Orange command line is pet-command only.**  
   It means `card -> active pet command relationship`. It is not a generic targeting line or damage path.

6. **Enemy target rings show effect targets.**  
   For a pet-command attack card, the orange line goes to Ember Fox and the enemy ring shows the target enemy.

7. **Intent readout is sequence-aware.**  
   Enemy Intent assets must support v0.5 visibility-limited plan sequence readouts. Intent is not a legacy scripted monster ability.

8. **VFX behavior is required.**  
   VFX texture assets can have code fallbacks, but the combat presentation must still show command, impact, burn, shield, status, intent, and defeat feedback.

9. **The asset set is 4K-ready with one runtime asset per key.**  
   Do not maintain parallel `1x`, `2x`, and `3x` runtime variants in v0.1.

10. **Missing assets must not break combat interaction.**  
    Code fallbacks and placeholders must keep the combat playable while art is incomplete.

---

## 4. Source-of-Truth Files

This manifest must stay aligned with the project source.

### 4.1 Design and Rules Source of Truth

```txt
docs/architecture.md
docs/combat_card_game_rules.md
docs/combat_content_foundation.md
docs/design.md
docs/ui_ux_interaction.md
```

### 4.2 Phaser Runtime Source of Truth

```txt
src/game-phaser/assets/combat-asset-keys.ts
src/game-phaser/assets/combat-fallback-assets.ts
src/game-phaser/layout/game-size.ts
src/game-phaser/layout/fixed-resolution-stage.ts
src/game-phaser/layout/combat-layout.ts
src/game-phaser/layout/hand-layout.ts
src/game-phaser/layout/card-frame-layout.ts
src/game-phaser/layout/combat-ui-caps.ts
src/game-phaser/layout/status-icon-layout.ts
src/game-phaser/layout/intent-token-layout.ts
src/game-phaser/layout/combat-ui-tokens.ts
src/game-phaser/layout/pet-layout.ts
src/game-phaser/animation/combat-vfx-keys.ts
```

### 4.3 Sync Rule

If this manifest adds, removes, or renames a runtime asset key, then `combat-asset-keys.ts` must be updated in the same implementation phase.

If a layout size changes, the relevant layout file must be updated.

If an event VFX route changes, `combat-vfx-keys.ts` must be updated.

If a card family/source/rarity visual language changes, `CardPresenter` and the card view model must remain compatible.

---

## 5. 4K-Ready Single Runtime Asset Policy

### 5.1 Layout Baseline vs Render Target

The current Phaser logical layout is based on:

```txt
Logical canvas: 1280 x 720
Aspect ratio: 16:9
Current fixed render scale cap: 4
4K target display: 3840 x 2160
```

The logical canvas can remain `1280 x 720`. Combat presenters place objects in logical coordinates. The runtime canvas can render at a higher internal pixel size using the existing fixed-resolution stage approach.

### 5.2 Single Runtime Asset Policy

Use one high-resolution runtime asset per asset key.

Do not ship parallel runtime filenames such as:

```txt
*_1x.png
*_2x.png
*_3x.png
```

Preferred runtime filename pattern:

```txt
combat_pet_ember_fox_idle.png
combat_card_frame_pet_command.png
combat_icon_status_burn.png
combat_background_ashwood_mid_trees.png
```

The manifest records logical display size and recommended source pixel size. The runtime file name should not include scale suffixes unless a later performance pack system is explicitly introduced.

### 5.3 UI, Card, Icon, and Small VFX Asset Resolution

For UI/card/icon assets, author the source at approximately:

```txt
source pixels = logical display size x 4
```

Examples based on current layout:

| Asset | Logical Display | Recommended Source Pixels |
| --- | ---: | ---: |
| Hand card frame | `192 x 268` | `768 x 1072` |
| Status icon | `22 x 22` | `88 x 88` |
| Intent token | `70 x 46` | `280 x 184` |
| Draw pile | `58 x 82` | `232 x 328` |
| End Turn button | `124 x 56` | `496 x 224` |
| Player HUD frame | `176 x 120` | `704 x 480` |
| Pet ring zone | about `118 x 118` | about `472 x 472` |

This gives enough source pixels for 4K/Retina-style display while keeping memory manageable.

### 5.4 Character and Enemy Sprite Resolution

For Keeper, Ember Fox, and enemies, author each isolated pose at a source size large enough for 4K display and future hover/detail scaling.

Minimum guidance:

| Sprite Type | Logical Role | Recommended Source Height |
| --- | --- | ---: |
| Keeper pose | small battlefield avatar | `512-768 px` |
| Ember Fox pose | active pet co-hero | `512-768 px` |
| Normal enemy idle | standard enemy slot | `512-768 px` |
| Elite enemy idle | larger enemy slot | `768-1024 px` |
| Boss enemy idle | larger enemy slot | `1024-1400 px` |

The sprite should be transparent PNG and include only the character/creature. No UI, no HP bars, no shadows that make placement impossible. A soft contact shadow can be code-rendered or generated as a separate optional asset.

### 5.5 Background and Parallax Layer Resolution

Combat backgrounds should be 4K-ready but must respect browser/WebGL texture and memory limits.

Recommended full-layer size:

```txt
3840 x 2160
```

Maximum recommended per layer without profiling:

```txt
4096 x 2304
```

Do not create a single `5120 x 2880` full-screen layer in v0.1 unless profiling proves safe. Multiple huge layers can quickly become GPU-memory-heavy.

### 5.6 Texture Filtering Doctrine

The art direction is smooth fantasy artwork, not pixel art.

Runtime config should remain compatible with:

```txt
pixelArt: false
antialias: true
antialiasGL: true
linear / smooth texture filtering
```

If an individual texture becomes blurry after scaling, fix the source asset clarity or Phaser texture settings for that texture. Do not globally switch to pixel-art behavior.

### 5.7 Export Format

Preferred:

```txt
PNG with transparency
```

Use PNG for:

- sprites;
- UI panels;
- card frames;
- icons;
- VFX;
- foreground parallax layers with alpha.

Background layers may use PNG initially for simplicity. Later, lossless/lossy optimization can be considered, but that is not part of v0.1.

---

## 6. Asset Ownership Categories

### 6.1 Image-Backed Generated Assets

These should be produced by image generation or manually edited image output:

- parallax backgrounds;
- Keeper poses;
- Ember Fox poses;
- enemy sprites;
- card frames;
- card art windows;
- rarity gems and source badges;
- family badges;
- icons;
- UI panel skins;
- VFX textures.

### 6.2 Code-Rendered Dynamic Content

These must be rendered by Phaser/code:

- all text;
- all numbers;
- card cost;
- card title;
- card rules text;
- HP values;
- block values;
- status stacks/durations;
- energy values;
- draw/discard counts;
- intent amounts and sequence labels;
- tooltip content;
- detail panel content;
- debug overlay text;
- layout and hitboxes.

### 6.3 Hybrid VFX

Hybrid VFX use both image assets and Phaser code.

Examples:

- command thread uses a code curve plus generated marker/rune/particle texture;
- impact burst uses generated spark texture plus code scale/fade;
- shield arc uses generated arc texture plus code alpha/tween;
- burn tick uses generated ember particle plus code movement;
- intent changed pulse uses code scale/glow and optional generated ring.

The texture asset improves quality. The behavior is required even before the texture is final.

---

## 7. Priority Tiers

These tiers define implementation order, not final importance.

### Tier 0 — Code Fallback Required

Must exist before art replacement:

- target rings;
- orange command line;
- HP bars;
- block bars;
- status tray layout;
- text/numbers;
- fallback silhouettes;
- fallback icons;
- placeholder card frames;
- basic tooltip/detail panels;
- basic VFX pulses.

### Tier 1 — Critical UI Readability Assets

First image-generation batch:

- normal card frame;
- pet-command card frame;
- pet-support card frame;
- rarity gems;
- source badges;
- card family/type badges;
- intent token frame and core intent icons;
- status icons;
- tag icons;
- player HUD frame;
- energy orb;
- draw pile and discard pile skins;
- End Turn button skin;
- tooltip and detail panel skin;
- pet ring and enemy target ring skins.

### Tier 2 — Combat Identity Assets

Second image-generation batch:

- Ashwood Trail parallax background layers;
- Keeper four combat poses;
- Ember Fox six combat poses;
- official Ashwood enemy idle sprites;
- starter deck card art windows.

### Tier 3 — Required VFX Polish

Third image-generation batch, still required before combat is considered presentable:

- command thread marker/rune;
- endpoint rune flash;
- target ring pulse texture;
- impact burst;
- burn apply pop;
- burn tick;
- shield arc;
- status pop;
- intent changed pulse;
- intent resolve pulse;
- defeat burst;
- card play flash;
- energy spend pulse.

---

## 8. Proposed Asset Folder Structure

Suggested runtime asset folder:

```txt
public/assets/combat/
  backgrounds/ashwood/
  combatants/keeper/
  combatants/pets/ember_fox/
  combatants/enemies/ashwood/
  cards/frames/
  cards/rarity/
  cards/source_badges/
  cards/family_badges/
  cards/art/starter/
  icons/intent/
  icons/status/
  icons/tags/
  ui/hud/
  ui/panels/
  ui/slots/
  vfx/pet_command/
  vfx/impact/
  vfx/status/
  vfx/intent/
  vfx/general/
  fallback/
```

Suggested source/reference folder for generated originals:

```txt
art_source/generated/combat/
```

Generated originals can be larger, messy, or layered. Runtime assets should be cleaned, cropped, transparent where needed, and named according to this manifest.

---

## 9. Naming Rules

Use snake_case filenames.

Do:

```txt
combat_pet_ember_fox_idle.png
combat_enemy_ash_slime_idle.png
combat_card_frame_pet_command.png
combat_icon_status_burn.png
combat_background_ashwood_mid_trees.png
```

Do not:

```txt
Fox Bite Final 2x.png
card_text_burn_3.png
enemy_card_ash_slime.png
ember_fox_hp_bar.png
combat_screen_mockup.png
```

Runtime asset keys use dot notation, for example:

```txt
combat.pet.emberFox.idle
combat.enemy.ashSlime.idle
combat.cardFrame.petCommand
combat.icon.status.burn
```

File names do not need to exactly match dot notation, but the loader manifest must map them explicitly.

---

## 10. Required Runtime Key Updates

The current repo already has a seed `CombatAssetKeys` object. This manifest expands it.

### 10.1 Existing Keys to Keep

Keep current groups where still valid:

```txt
backgrounds
uiPanels
controls
cardFrames
icons
combatants
slots
vfx
```

### 10.2 Keys to Add or Rename

The following target keys should be added or aligned in `combat-asset-keys.ts`.

#### Backgrounds

```txt
combat.background.ashwood.skyRuins
combat.background.ashwood.midTrees
combat.background.ashwood.groundPlane
combat.background.ashwood.foregroundAsh
combat.background.neutralBoardFallback
```

Existing `combat.background.ashwood` may remain as a compatibility composite/fallback, but the production target is layered parallax.

#### Keeper

```txt
combat.keeper.idle
combat.keeper.command
combat.keeper.attack
combat.keeper.hurtGuarded
```

Existing `combat.keeper.hurt` can map to `hurtGuarded` until renamed.

#### Ember Fox

```txt
combat.pet.emberFox.idle
combat.pet.emberFox.commandReady
combat.pet.emberFox.bite
combat.pet.emberFox.tailguard
combat.pet.emberFox.burnApply
combat.pet.emberFox.calm
```

#### Official Ashwood Enemies

```txt
combat.enemy.generic.idle
combat.enemy.ashSlime.idle
combat.enemy.cinderMite.idle
combat.enemy.sootCrow.idle
combat.enemy.rootHusk.idle
combat.enemy.charredStag.idle
combat.enemy.cinderScribe.idle
combat.enemy.emberrootWarden.idle
```

Existing `combat.enemy.trainingSlime.idle` should become dev-only or map to `combat.enemy.generic.idle`. It should not be the official first-content name.

#### Card Visual Engine

```txt
combat.cardFrame.normal
combat.cardFrame.petCommand
combat.cardFrame.petSupport
combat.cardFrame.keeperSignal
combat.cardFrame.futurePower
combat.cardFrame.temporary
combat.cardFrame.hoverOverlay
combat.cardFrame.selectedOverlay
combat.cardFrame.unplayableOverlay
combat.cardFrame.artWindowPlaceholder
```

Rarity visuals:

```txt
combat.cardRarity.starter
combat.cardRarity.common
combat.cardRarity.uncommon
combat.cardRarity.rare
combat.cardRarity.special
combat.cardRarity.unique
```

Source badges:

```txt
combat.cardSource.universalPlayer
combat.cardSource.classBound
combat.cardSource.petBound
combat.cardSource.petSupport
combat.cardSource.encounterReward
combat.cardSource.eventOnly
combat.cardSource.temporary
combat.cardSource.legacy
```

Family badges:

```txt
combat.cardFamily.keeperAttack
combat.cardFamily.keeperSkill
combat.cardFamily.keeperSignal
combat.cardFamily.petCommand
combat.cardFamily.petSupport
combat.cardFamily.power
combat.cardFamily.temporary
```

Starter card art windows:

```txt
combat.cardArt.keepersTap
combat.cardArt.fieldBrace
combat.cardArt.readTheAsh
combat.cardArt.foxBite
combat.cardArt.tailguard
combat.cardArt.kindleMark
combat.cardArt.fetchSignal
```

#### Intent / Plan Readout

```txt
combat.intentToken.frame
combat.icon.intent.unknown
combat.icon.intent.attack
combat.icon.intent.defend
combat.icon.intent.buff
combat.icon.intent.debuff
combat.icon.intent.special
combat.icon.intent.charging
combat.icon.intent.obscured
combat.intentMarker.scoped
combat.intentMarker.locked
combat.intentMarker.adaptive
combat.intentMarker.changedPulse
combat.intentMarker.multiHit
combat.intentMarker.roughLow
combat.intentMarker.roughMedium
combat.intentMarker.roughHigh
```

Exact plan sequence labels, amounts, and scoped candidate text remain code-rendered.

#### Status Icons

```txt
combat.icon.status.burn
combat.icon.status.block
combat.icon.status.guard
combat.icon.status.empowered
combat.icon.status.marked
combat.icon.status.ready
combat.icon.status.commanded
combat.icon.status.obscured
combat.icon.status.scoped
combat.icon.status.revealed
combat.icon.status.bound
combat.icon.status.fallback
combat.icon.status.overflow
```

#### Tag Icons

```txt
combat.icon.tag.petCommand
combat.icon.tag.fox
combat.icon.tag.burn
combat.icon.tag.guard
combat.icon.tag.block
combat.icon.tag.draw
combat.icon.tag.mark
combat.icon.tag.attack
combat.icon.tag.setup
combat.icon.tag.combo
combat.icon.tag.keeper
combat.icon.tag.signal
combat.icon.tag.scout
combat.icon.tag.fetch
combat.icon.tag.reveal
combat.icon.tag.scope
combat.icon.tag.obscure
combat.icon.tag.rare
combat.icon.tag.fallback
```

#### Pet / Enemy Slot UI

```txt
combat.slot.petRing
combat.slot.petCommandGlow
combat.slot.petStatusTray
combat.slot.inactivePetSlot
combat.slot.emberChargePip
combat.slot.enemyTargetRing
combat.slot.enemyHpBarTrack
combat.slot.enemyHpBarFillMask
combat.slot.enemyBlockBadge
combat.slot.enemyStatusTray
```

#### Required Hybrid VFX

```txt
combat.vfx.commandThread
combat.vfx.commandMarker
combat.vfx.endpointRuneFlash
combat.vfx.targetRingPulse
combat.vfx.cardPlayFlash
combat.vfx.energySpendPulse
combat.vfx.impactBurst
combat.vfx.burnApplyPop
combat.vfx.burnTick
combat.vfx.shieldArc
combat.vfx.statusPop
combat.vfx.intentChangedPulse
combat.vfx.intentResolvePulse
combat.vfx.defeatBurst
```

---

## 11. Parallax Background Assets

### 11.1 Required Layers

The first combat environment is Ashwood Trail.

Required layered assets:

| Asset Key | Filename | Source Size | Alpha | Purpose |
| --- | --- | ---: | --- | --- |
| `combat.background.ashwood.skyRuins` | `combat_background_ashwood_sky_ruins.png` | `3840x2160` or max `4096x2304` | usually opaque | distant sky, ruins, cool ash atmosphere |
| `combat.background.ashwood.midTrees` | `combat_background_ashwood_mid_trees.png` | `3840x2160` or max `4096x2304` | alpha preferred | midground trees, burned forest silhouettes |
| `combat.background.ashwood.groundPlane` | `combat_background_ashwood_ground_plane.png` | `3840x2160` or max `4096x2304` | opaque or alpha | readable combat floor, character grounding |
| `combat.background.ashwood.foregroundAsh` | `combat_background_ashwood_foreground_ash.png` | `3840x2160` or max `4096x2304` | alpha required | drifting ash, foreground branches, light particles |

### 11.2 Layer Rules

- No characters.
- No enemies.
- No cards.
- No UI.
- No readable text.
- Ground plane must keep combat silhouettes readable.
- Foreground ash must not obscure cards, intent tokens, HP bars, or status icons.
- Parallax movement must be subtle and presentational only.
- Hitboxes and gameplay positions do not depend on parallax layer positions.

### 11.3 Suggested Parallax Motion

| Layer | Motion |
| --- | --- |
| skyRuins | nearly static |
| midTrees | very slow horizontal drift or camera offset |
| groundPlane | static |
| foregroundAsh | subtle drifting particles / slow offset |

---

## 12. Keeper Avatar Assets

The Keeper is present on the battlefield as a visual target and command source. The Keeper is not a card and not the main stat readout.

### 12.1 Required Poses

| Asset Key | Filename | Facing | Source Height | Purpose |
| --- | --- | --- | ---: | --- |
| `combat.keeper.idle` | `combat_keeper_idle.png` | right | `512-768 px` | default stance |
| `combat.keeper.command` | `combat_keeper_command.png` | right | `512-768 px` | pet-command / signal / planning cards |
| `combat.keeper.attack` | `combat_keeper_attack.png` | right | `512-768 px` | direct Keeper attack cards |
| `combat.keeper.hurtGuarded` | `combat_keeper_hurt_guarded.png` | right | `512-768 px` | hurt, block, Tailguard, guarded state |

### 12.2 Visual Requirements

- Clean silhouette at small size.
- More muted palette than Ember Fox.
- Simple travel cloak / field gear / command bracer.
- No large weapon dominating the frame.
- Must read as Ashbound Keeper, not generic knight or wizard.
- No HP, block, status, or text baked onto sprite.
- Transparent background.
- Feet/baseline consistent across poses.

### 12.3 Animation Strategy

Use pose swap + tween + VFX:

- idle bob;
- command bracer glow;
- attack pose flash/projectile;
- hurt/guarded shake;
- no full animation requirement in v0.1.

---

## 13. Ember Fox Assets

Ember Fox is the first pet and the combat co-hero. These assets have higher identity priority than the Keeper.

### 13.1 Required Poses

| Asset Key | Filename | Facing | Source Height | Purpose |
| --- | --- | --- | ---: | --- |
| `combat.pet.emberFox.idle` | `combat_pet_ember_fox_idle.png` | right / 3/4 side | `512-768 px` | default alert stance |
| `combat.pet.emberFox.commandReady` | `combat_pet_ember_fox_command_ready.png` | right / looking back slightly | `512-768 px` | receives pet-command |
| `combat.pet.emberFox.bite` | `combat_pet_ember_fox_bite.png` | right | `512-768 px` | attack / Fox Bite |
| `combat.pet.emberFox.tailguard` | `combat_pet_ember_fox_tailguard.png` | left/guard arc or 3/4 | `512-768 px` | guard / Tailguard |
| `combat.pet.emberFox.burnApply` | `combat_pet_ember_fox_burn_apply.png` | right | `512-768 px` | Kindle Mark / burn application |
| `combat.pet.emberFox.calm` | `combat_pet_ember_fox_calm.png` | neutral / side | `512-768 px` | calm combat idle, victory, tutorial, future reward reuse |

### 13.2 Visual Requirements

- Must read as a fox, not a wolf.
- Small-to-medium body, agile stance, sharp ears, long expressive tail.
- Ember/fire details controlled, not full-body fireball.
- Forehead rune and tail ember glow should be visible but not noisy.
- No pet HP language.
- No text or UI baked into sprite.
- Transparent background.
- Consistent silhouette and markings across poses.

### 13.3 Pet Charge Asset

`combat.slot.emberChargePip` is conditional.

Rules:

- Use only when Ember Charge mechanic exists or is active.
- Must look like ember seed / coal spark / small warm charge.
- Must not look like heart, blood, health, or generic HP pip.
- Should support empty/fill/pulse states through tint/alpha/code, not separate mandatory files.

---

## 14. Official Ashwood Enemy Assets

Use official first-content names. Do not build first-slice art around `trainingSlime` naming.

### 14.1 Required Enemy Idle Sprites

| Asset Key | Filename | Tier | Source Height | Notes |
| --- | --- | --- | ---: | --- |
| `combat.enemy.generic.idle` | `combat_enemy_generic_idle.png` | fallback | `512 px` | fallback monster silhouette |
| `combat.enemy.ashSlime.idle` | `combat_enemy_ash_slime_idle.png` | normal | `512-768 px` | simple aggressive tutorial enemy |
| `combat.enemy.cinderMite.idle` | `combat_enemy_cinder_mite_idle.png` | normal | `512-768 px` | burn/debuff pressure enemy |
| `combat.enemy.sootCrow.idle` | `combat_enemy_soot_crow_idle.png` | normal | `512-768 px` | information disruption enemy |
| `combat.enemy.rootHusk.idle` | `combat_enemy_root_husk_idle.png` | normal | `512-768 px` | defensive slow pressure enemy |
| `combat.enemy.charredStag.idle` | `combat_enemy_charred_stag_idle.png` | elite | `768-1024 px` | adaptive pressure, possible leader |
| `combat.enemy.cinderScribe.idle` | `combat_enemy_cinder_scribe_idle.png` | rare bearer | `768-1024 px` | information/reward enemy |
| `combat.enemy.emberrootWarden.idle` | `combat_enemy_emberroot_warden_idle.png` | boss | `1024-1400 px` | first boss/team leader |

### 14.2 Enemy Sprite Rules

- Enemies face left toward the Keeper.
- Enemies are sprites/silhouettes, not cards.
- No intent icon, HP bar, status tray, or target ring baked into sprite.
- No readable text.
- Transparent PNG.
- Stable feet/baseline.
- Hurt/defeat are handled by VFX/tint/shake in v0.1, not separate mandatory poses.

### 14.3 Size Classes

| Class | Intended Use | UI Behavior |
| --- | --- | --- |
| normal | Ash Slime, Cinder Mite, Soot Crow, Root Husk | standard enemy slot |
| elite | Charred Stag | larger sprite inside one enemy slot |
| rare bearer | Cinder Scribe | larger/clearer silhouette, still local HP/status |
| boss | Emberroot Warden | larger local slot, no top boss bar in v0.1 |

---

## 15. Card Visual Engine

Cards are not generated as complete images. Cards are generated by a visual engine inside the game.

### 15.1 Card Composition

`CardPresenter` composes:

```txt
card frame
+ rarity gem/accent
+ source badge
+ family/type badge
+ cost socket
+ art window image
+ title text
+ rules text
+ tag icons
+ hover/selected/unplayable overlays
```

Image generation supplies the visual parts. Phaser supplies layout, text, values, hitboxes, state, and interactivity.

### 15.2 Canonical Ratio

```txt
Card aspect ratio: 5:7
Current hand-card logical display: 192 x 268
Recommended source frame: 768 x 1072
```

Card detail panels can scale the same card component larger. Do not make separate full-card art for detail view.

### 15.3 Dynamic Card Text Rule

Never bake into card images:

- card name;
- cost;
- rules text;
- damage value;
- block value;
- draw amount;
- rarity text;
- tooltip text;
- keyword definitions.

### 15.4 Card Source and Rarity Are Separate

Every player-facing card has two independent visual axes:

```txt
Card Source = where this card belongs thematically/mechanically.
Card Rarity = how common or duplicate-limited this card is.
```

Do not use rarity alone to show pet identity. Do not use source alone to show rarity.

---

## 16. Card Frame Families

### 16.1 Required Frame Assets

| Asset Key | Filename | Purpose |
| --- | --- | --- |
| `combat.cardFrame.normal` | `combat_card_frame_normal.png` | normal attack/skill frame |
| `combat.cardFrame.petCommand` | `combat_card_frame_pet_command.png` | true pet-command cards |
| `combat.cardFrame.petSupport` | `combat_card_frame_pet_support.png` | pet-support cards that modify pet state/future commands |
| `combat.cardFrame.keeperSignal` | `combat_card_frame_keeper_signal.png` | Keeper information/signal cards |
| `combat.cardFrame.futurePower` | `combat_card_frame_future_power.png` | reserved power/ongoing frame |
| `combat.cardFrame.temporary` | `combat_card_frame_temporary.png` | combat-created temporary card frame |
| `combat.cardFrame.hoverOverlay` | `combat_card_frame_hover_overlay.png` | hover highlight overlay |
| `combat.cardFrame.selectedOverlay` | `combat_card_frame_selected_overlay.png` | selected highlight overlay |
| `combat.cardFrame.unplayableOverlay` | `combat_card_frame_unplayable_overlay.png` | disabled/unplayable overlay |
| `combat.cardFrame.artWindowPlaceholder` | `combat_card_art_window_placeholder.png` | fallback art window |

### 16.2 Frame Requirements

- 5:7 ratio.
- Clear cost socket.
- Clear art window.
- Clear title band.
- Clear rules text zone.
- Clear tag row.
- Frame must not reduce text readability.
- Pet-command frame must include paw-rune/command visual cue, not only orange color.
- Normal card frame must not accidentally look like pet-command.

---

## 17. Rarity Visual Language

Use gem, edge accent, or small jewel/socket language. Do not rely only on color.

| Rarity | Asset Key | Visual Direction |
| --- | --- | --- |
| starter | `combat.cardRarity.starter` | simple stamped mark, practical training feel |
| common | `combat.cardRarity.common` | plain bronze/wood/small mark |
| uncommon | `combat.cardRarity.uncommon` | brighter teal/green or polished charm |
| rare | `combat.cardRarity.rare` | warm gold ember gem |
| special | `combat.cardRarity.special` | shrine/memory seal |
| unique | `combat.cardRarity.unique` | distinct sealed-charm / story mark |

Rarity assets should be small, modular overlays or sockets. They should not require a fully separate frame for every source+rarity combination.

---

## 18. Source Visual Language

Source identifies thematic/mechanical origin.

| Source | Asset Key | Visual Direction |
| --- | --- | --- |
| universalPlayer | `combat.cardSource.universalPlayer` | neutral journal mark |
| classBound | `combat.cardSource.classBound` | Keeper bracer / field signal mark |
| petBound | `combat.cardSource.petBound` | Ember Fox paw-rune / fox sigil |
| petSupport | `combat.cardSource.petSupport` | pet charm / link rune |
| encounterReward | `combat.cardSource.encounterReward` | rare-holder seal / scribe mark |
| eventOnly | `combat.cardSource.eventOnly` | story/journal event seal |
| temporary | `combat.cardSource.temporary` | fading ash border / temporary mark |
| legacy | `combat.cardSource.legacy` | debug/migration mark only |

Source badges should be visible in card detail and optionally small in hand view.

---

## 19. Card Family Badges and Tag Icons

### 19.1 Family Badges

| Family | Asset Key | Orange Command Line? |
| --- | --- | --- |
| Keeper Attack | `combat.cardFamily.keeperAttack` | no |
| Keeper Skill | `combat.cardFamily.keeperSkill` | no |
| Keeper Signal | `combat.cardFamily.keeperSignal` | no |
| Pet-Command | `combat.cardFamily.petCommand` | yes, if it commands active pet |
| Pet Support | `combat.cardFamily.petSupport` | maybe, only if it targets/commands pet |
| Power/Ongoing | `combat.cardFamily.power` | no unless card says pet-command |
| Temporary | `combat.cardFamily.temporary` | depends on family |

Only true pet-command cards use orange command visual grammar.

### 19.2 Tag Icons

Required tag icons:

```txt
combat.icon.tag.petCommand
combat.icon.tag.fox
combat.icon.tag.burn
combat.icon.tag.guard
combat.icon.tag.block
combat.icon.tag.draw
combat.icon.tag.mark
combat.icon.tag.attack
combat.icon.tag.setup
combat.icon.tag.combo
combat.icon.tag.keeper
combat.icon.tag.signal
combat.icon.tag.scout
combat.icon.tag.fetch
combat.icon.tag.reveal
combat.icon.tag.scope
combat.icon.tag.obscure
combat.icon.tag.rare
combat.icon.tag.fallback
```

Card tag visible cap:

```txt
4 visible icons + full list in detail panel
```

---

## 20. Starter Deck Card Art Windows

These are art-window illustrations only, not complete cards.

Recommended source size:

```txt
1600 x 900 or 1536 x 864
```

The CardPresenter crops/masks the art into the card art window. Keep the focal point centered and readable after cropping.

| Card ID | Asset Key | Filename | Visual Brief |
| --- | --- | --- | --- |
| `keepers_tap` | `combat.cardArt.keepersTap` | `combat_card_art_keepers_tap.png` | Keeper direct tap/strike, no pet command |
| `field_brace` | `combat.cardArt.fieldBrace` | `combat_card_art_field_brace.png` | Keeper bracing with field-journal shield signal |
| `read_the_ash` | `combat.cardArt.readTheAsh` | `combat_card_art_read_the_ash.png` | Keeper reading ash trail / intent information |
| `fox_bite` | `combat.cardArt.foxBite` | `combat_card_art_fox_bite.png` | Ember Fox lunging with ember trail |
| `tailguard` | `combat.cardArt.tailguard` | `combat_card_art_tailguard.png` | fox tail forms protective arc around Keeper |
| `kindle_mark` | `combat.cardArt.kindleMark` | `combat_card_art_kindle_mark.png` | Keeper rune + fox forehead glow + burn mark |
| `fetch_signal` | `combat.cardArt.fetchSignal` | `combat_card_art_fetch_signal.png` | fox responds to small hand signal / retrieves card-light |

Rules:

- No title text.
- No cost.
- No rules text.
- No frame.
- No UI.
- No logos/signatures.
- Keep compositions simple enough to read inside a small art window.

---

## 21. Card Detail Visual Engine

Card detail uses an enlarged generated card preview plus a code-rendered sidebar.

### 21.1 Card Detail Panel Assets

Card detail is an enlarged version of the same CardPresenter plus a sidebar.

### 21.1 Required Assets

| Asset Key | Filename | Purpose |
| --- | --- | --- |
| `combat.ui.detailPanel` | `combat_ui_detail_panel.png` | full modal/detail background |
| `combat.ui.detailCloseButton` | `combat_ui_detail_close_button.png` | close button skin |
| `combat.ui.clickBlockerTint` | `combat_ui_click_blocker_tint.png` | translucent blocker/tint if image-backed |
| `combat.ui.cardDetailSidebar` | `combat_ui_card_detail_sidebar.png` | optional sidebar panel skin |
| `combat.ui.cardDetailKeywordRow` | `combat_ui_card_detail_keyword_row.png` | optional keyword list row skin |
| `combat.ui.cardDetailTagTray` | `combat_ui_card_detail_tag_tray.png` | optional tag tray skin |

If `cardDetailSidebar`, `cardDetailKeywordRow`, or `cardDetailTagTray` are not separate assets, `detailPanel` can contain neutral zones and code can render rows.

### 21.2 Detail Layout Requirements

Detail panel shows:

```txt
[left] enlarged card preview
[right] sidebar information
```

Sidebar text is code-rendered:

- name;
- cost;
- rarity;
- source;
- family;
- target grammar;
- tags;
- rules;
- keyword explanations;
- one-line field note.

---

## 22. Intent / Plan Readout Assets

Intent is a visibility-limited readout of the current enemy/team planned card sequence.

### 22.1 Required Token Assets

| Asset Key | Filename | Purpose |
| --- | --- | --- |
| `combat.intentToken.frame` | `combat_intent_token_frame.png` | shared token frame |
| `combat.icon.intent.unknown` | `combat_icon_intent_unknown.png` | intentional unknown `?` state |
| `combat.icon.intent.attack` | `combat_icon_intent_attack.png` | attack category |
| `combat.icon.intent.defend` | `combat_icon_intent_defend.png` | guard/defend category |
| `combat.icon.intent.buff` | `combat_icon_intent_buff.png` | buff/setup category |
| `combat.icon.intent.debuff` | `combat_icon_intent_debuff.png` | debuff/status pressure category |
| `combat.icon.intent.special` | `combat_icon_intent_special.png` | special/unique action category |
| `combat.icon.intent.charging` | `combat_icon_intent_charging.png` | setup/charge/action building |
| `combat.icon.intent.obscured` | `combat_icon_intent_obscured.png` | obscured/degraded visibility |

### 22.2 Required Marker Assets

| Asset Key | Filename | Purpose |
| --- | --- | --- |
| `combat.intentMarker.scoped` | `combat_intent_marker_scoped.png` | Scope/revealed deeper info |
| `combat.intentMarker.locked` | `combat_intent_marker_locked.png` | locked plan state |
| `combat.intentMarker.adaptive` | `combat_intent_marker_adaptive.png` | adaptive/live plan state |
| `combat.intentMarker.changedPulse` | `combat_intent_marker_changed_pulse.png` | plan changed visual marker |
| `combat.intentMarker.multiHit` | `combat_intent_marker_multi_hit.png` | multi-hit indicator |
| `combat.intentMarker.roughLow` | `combat_intent_marker_rough_low.png` | rough low strength |
| `combat.intentMarker.roughMedium` | `combat_intent_marker_rough_medium.png` | rough medium strength |
| `combat.intentMarker.roughHigh` | `combat_intent_marker_rough_high.png` | rough high strength |

### 22.3 Code-Rendered Intent Content

The following are code-rendered:

- amount labels such as `7`;
- multi-hit labels such as `3x2`;
- rough labels such as `Heavy`;
- exact sequence labels such as `Cinder Dust -> Ash Bite`;
- scoped candidate plans;
- reason tags;
- tooltips.

### 22.4 Intent Asset Requirements

- Readable above enemies at small size.
- Unknown `?` must look designed, not missing.
- Obscured/unknown/scoped markers must be visually distinct.
- No text except symbolic glyphs. A `?` glyph is acceptable if generated cleanly, but code-rendered `?` is safer.
- Must support category, rough, exact, and scoped readouts without changing the enemy sprite.

---

## 23. Status and Tag Icon Assets

Card tag icon assets are defined in Section 19.2. This section defines combat status icons and completes the shared **Status and Tag Icon Assets** contract.

### 23.1 Required Status Icons

| Status | Asset Key | Notes |
| --- | --- | --- |
| Burn | `combat.icon.status.burn` | core Phase 1 status |
| Block | `combat.icon.status.block` | shield/block state |
| Guard | `combat.icon.status.guard` | guard/protection state |
| Empowered | `combat.icon.status.empowered` | next pet-command or similar boost |
| Marked | `combat.icon.status.marked` | setup/target mark |
| Ready | `combat.icon.status.ready` | pet/actor readiness |
| Commanded | `combat.icon.status.commanded` | pet commanded this turn |
| Obscured | `combat.icon.status.obscured` | information visibility degraded |
| Scoped | `combat.icon.status.scoped` | deeper intent info available |
| Revealed | `combat.icon.status.revealed` | current plan info improved |
| Bound | `combat.icon.status.bound` | reserved for Warden/Root-style debuff if implemented |
| Fallback | `combat.icon.status.fallback` | unknown status fallback |
| Overflow | `combat.icon.status.overflow` | `+N` container/icon |

### 23.2 Status Icon Size

Current logical status icon size:

```txt
22 x 22
```

Recommended source size:

```txt
88 x 88
```

### 23.3 Status Requirements

- Must be readable at `22 x 22` logical.
- Use clear shape, not color alone.
- Stacks/durations are code-rendered overlays or adjacent text.
- Do not bake numbers.
- Overflow icon supports code-rendered `+N`.

---

## 24. HUD and Control Assets

### 24.1 Player HUD Assets

| Asset Key | Filename | Current Logical Size / Role |
| --- | --- | --- |
| `combat.ui.playerHudFrame` | `combat_ui_player_hud_frame.png` | `176 x 120` frame |
| `combat.ui.playerPortraitFrame` | `combat_ui_player_portrait_frame.png` | portrait socket |
| `combat.ui.playerHpBarTrack` | `combat_ui_player_hp_bar_track.png` | HP track |
| `combat.ui.playerHpBarFillMask` | `combat_ui_player_hp_bar_fill_mask.png` | mask/fill style |
| `combat.ui.playerBlockBadge` | `combat_ui_player_block_badge.png` | block shield badge |
| `combat.ui.playerStatusTray` | `combat_ui_player_status_tray.png` | status tray skin |
| `combat.ui.playerHoverFrame` | `combat_ui_player_hover_frame.png` | self-target/hover highlight |

### 24.2 Bottom HUD and Controls

| Asset Key | Filename | Current Logical Size / Role |
| --- | --- | --- |
| `combat.ui.bottomHudPlate` | `combat_ui_bottom_hud_plate.png` | bottom HUD plate |
| `combat.control.energyOrb` | `combat_control_energy_orb.png` | energy orb around radius `38` |
| `combat.control.drawPile` | `combat_control_draw_pile.png` | `58 x 82` stack |
| `combat.control.discardPile` | `combat_control_discard_pile.png` | `58 x 82` stack |
| `combat.control.endTurnButton` | `combat_control_end_turn_button.png` | `124 x 56` button |
| `combat.control.menuButton` | `combat_control_menu_button.png` | `48 x 34` button |

### 24.3 HUD Rules

- Player HUD does not show card art.
- Energy is separate from Player HUD.
- Draw pile is face-down visual language.
- Discard pile is face-up or tilted visual language.
- End Turn label is code-rendered; asset is button skin only.
- Menu glyph can be code-rendered or part of skin, but avoid baked text labels.

---

## 25. Pet Slot and Enemy Slot Assets

### 25.1 Pet Slot Assets

| Asset Key | Filename | Purpose |
| --- | --- | --- |
| `combat.slot.petRing` | `combat_slot_pet_ring.png` | active pet base ring |
| `combat.slot.petCommandGlow` | `combat_slot_pet_command_glow.png` | hover/selected command glow |
| `combat.slot.petStatusTray` | `combat_slot_pet_status_tray.png` | pet status tray |
| `combat.slot.inactivePetSlot` | `combat_slot_inactive_pet_slot.png` | faint future pet slot |
| `combat.slot.emberChargePip` | `combat_slot_ember_charge_pip.png` | conditional Ember Charge pip |

Pet slot rules:

- Future slots are subtle and non-monetized.
- Pet pips must not look like HP.
- Pet ring should make Ember Fox active without overpowering sprite.

### 25.2 Enemy Slot Assets

| Asset Key | Filename | Purpose |
| --- | --- | --- |
| `combat.slot.enemyTargetRing` | `combat_slot_enemy_target_ring.png` | enemy base target ring |
| `combat.slot.enemyHpBarTrack` | `combat_slot_enemy_hp_bar_track.png` | HP bar track |
| `combat.slot.enemyHpBarFillMask` | `combat_slot_enemy_hp_bar_fill_mask.png` | HP bar mask/fill style |
| `combat.slot.enemyBlockBadge` | `combat_slot_enemy_block_badge.png` | block badge if needed |
| `combat.slot.enemyStatusTray` | `combat_slot_enemy_status_tray.png` | enemy status tray |

Enemy slot rules:

- Enemy target ring states can use tint/alpha/code animation with one base asset.
- HP numbers and block values are code-rendered.
- Enemy statuses appear below HP, not overhead.
- Enemy overhead is for Intent readout.

---

## 26. Required Hybrid VFX Assets

VFX is required behavior. Texture assets can start as placeholders, but final combat should have image-backed VFX quality.

| VFX | Asset Key | Filename | Fallback | Purpose |
| --- | --- | --- | --- | --- |
| Command thread | `combat.vfx.commandThread` | `combat_vfx_command_thread.png` | code curve | card -> Ember Fox command relationship |
| Command marker | `combat.vfx.commandMarker` | `combat_vfx_command_marker.png` | code marker | moving ember dot/marker along command line |
| Endpoint rune flash | `combat.vfx.endpointRuneFlash` | `combat_vfx_endpoint_rune_flash.png` | code pulse | flash at Ember Fox ring/rune |
| Target ring pulse | `combat.vfx.targetRingPulse` | `combat_vfx_target_ring_pulse.png` | code ring pulse | selected/impact ring feedback |
| Card play flash | `combat.vfx.cardPlayFlash` | `combat_vfx_card_play_flash.png` | code flash | card enters play area |
| Energy spend pulse | `combat.vfx.energySpendPulse` | `combat_vfx_energy_spend_pulse.png` | code pulse | energy orb spend/refill feedback |
| Impact burst | `combat.vfx.impactBurst` | `combat_vfx_impact_burst.png` | code burst | damage impact |
| Burn apply pop | `combat.vfx.burnApplyPop` | `combat_vfx_burn_apply_pop.png` | code popup | burn applied |
| Burn tick | `combat.vfx.burnTick` | `combat_vfx_burn_tick.png` | code popup | burn damage tick |
| Shield arc | `combat.vfx.shieldArc` | `combat_vfx_shield_arc.png` | code arc/pulse | block/guard effect |
| Status pop | `combat.vfx.statusPop` | `combat_vfx_status_pop.png` | code popup | status applied/expired |
| Intent changed pulse | `combat.vfx.intentChangedPulse` | `combat_vfx_intent_changed_pulse.png` | code pulse | plan/readout changed |
| Intent resolve pulse | `combat.vfx.intentResolvePulse` | `combat_vfx_intent_resolve_pulse.png` | code pulse | enemy plan/action resolving |
| Defeat burst | `combat.vfx.defeatBurst` | `combat_vfx_defeat_burst.png` | code pulse/fade | defeated combatant |

### 26.1 VFX Rules

- VFX must clarify state changes.
- VFX must not cover card text, intent icons, HP bars, or status trays for long.
- Use short alpha/scale/tween motion.
- VFX cannot invent gameplay outcomes.
- Event order still follows game-core events.

---

## 27. Tooltip, Detail, Pause, and Debug Panel Assets

| Asset Key | Filename | Purpose |
| --- | --- | --- |
| `combat.ui.tooltipPanel` | `combat_ui_tooltip_panel.png` | quick hover tooltip skin |
| `combat.ui.detailPanel` | `combat_ui_detail_panel.png` | pinned detail modal skin |
| `combat.ui.detailCloseButton` | `combat_ui_detail_close_button.png` | close button skin |
| `combat.ui.clickBlockerTint` | `combat_ui_click_blocker_tint.png` | click-through blocker/tint |
| `combat.ui.pausePanel` | `combat_ui_pause_panel.png` | pause/menu panel skin |
| `combat.ui.eventLogPanel` | `combat_ui_event_log_panel.png` | debug-only event log panel |

Rules:

- Text is code-rendered.
- Detail panel must block click-through.
- Tooltip panel should be readable on dark and bright background areas.
- Event log is debug-only in Phase 1.

---

## 28. Fallback Assets and Missing-Asset Rules

### 28.1 Required Fallbacks

| Missing Asset | Fallback |
| --- | --- |
| background | neutral parchment/grey board |
| Keeper sprite | humanoid silhouette |
| Ember Fox sprite | fox/paw silhouette |
| enemy sprite | generic monster silhouette |
| card frame | simple 5:7 rectangle frame |
| card art | blank art window placeholder |
| icon | generic circular icon |
| VFX | code pulse/popup/thread |
| tooltip panel | code rectangle |
| detail panel | code rectangle |

### 28.2 Fallback Rules

- Missing art must not block combat interaction.
- Missing art should produce a debug warning but not crash.
- Fallbacks must preserve hitboxes.
- Fallbacks must preserve text readability.
- Fallbacks must preserve pet-command grammar.

---

## 29. Image Generation Rules

The team will use image generation for all image-backed assets. This is allowed and expected, but prompts must target isolated reusable production assets, not screenshots.

### 29.1 Global Style Clause

Use this style language consistently:

```txt
clean and smooth strokes, polished console fantasy adventure art direction, readable tactical RPG silhouettes, warm ember fantasy, field-journal UI motifs, parchment and ink accents, soft painterly cel-shaded finish, crisp shapes, controlled glow, original fantasy world, production-feasible 2D game asset
```

### 29.2 Global Negative Clause

Use this negative direction consistently:

```txt
no readable text, no logo, no watermark, no signature, no fake language text, no modern objects, no sci-fi UI, no photorealism, no horror realism, no clutter, no existing game clone, no franchise-specific symbols, no baked gameplay numbers, no full UI screenshot, no card title or rules text, no HP bars baked into sprites
```

### 29.3 Sprite Prompt Rules

For Keeper, Ember Fox, and enemy sprites:

```txt
isolated transparent PNG game sprite, side-view or three-quarter side-view, consistent lighting, clean silhouette, no background, no UI, no text, no shadow baked into background, stable baseline, production-ready sprite pose
```

### 29.4 UI Asset Prompt Rules

For frames, panels, icons, buttons, trays:

```txt
isolated transparent PNG UI asset, reusable modular game UI piece, no text, no numbers, no labels, clean readable shape, symmetrical if intended for scaling, field-journal parchment and ember accents, suitable for code-rendered text overlay
```

### 29.5 Card Art Window Prompt Rules

For card art windows:

```txt
card art window illustration only, no card frame, no title, no cost, no rules text, no UI, centered composition, readable at small size, warm ember fantasy, clean smooth strokes
```

### 29.6 Parallax Background Prompt Rules

For background layers:

```txt
4K parallax background layer for side-view combat, no characters, no enemies, no cards, no UI, no text, readable ground plane, ash forest atmosphere, warm ember light, cool charcoal shadows
```

Each parallax layer must have a distinct role. Do not generate four nearly identical full paintings and call them layers.

### 29.7 VFX Prompt Rules

For VFX textures:

```txt
isolated transparent PNG VFX sprite, ember fantasy effect, clean alpha edges, no background, no text, no UI, suitable for scaling/fading/tweening in Phaser
```

### 29.8 Generated Asset QA

Reject or regenerate assets with:

- fake text;
- signatures/watermarks;
- baked UI numbers;
- wrong facing direction;
- inconsistent Ember Fox markings;
- enemy that looks like a card;
- pet HP/heart language;
- full screenshot composition;
- unreadable tiny icon shape;
- excessive glow that hides gameplay areas;
- art that resembles a protected franchise character too closely.

---

## 30. Acceptance Checklist by Asset Group

### 30.1 Backgrounds

- [ ] Four Ashwood layers exist.
- [ ] No UI/characters baked in.
- [ ] Ground plane supports readable silhouettes.
- [ ] Foreground layer does not obscure cards/status/intent.
- [ ] 4K-ready size within manifest limits.

### 30.2 Keeper

- [ ] Four required poses exist.
- [ ] Facing right.
- [ ] Transparent background.
- [ ] Consistent baseline and costume.
- [ ] Command and attack poses are visually different.
- [ ] No HP/status baked in.

### 30.3 Ember Fox

- [ ] Six required poses exist.
- [ ] Fox remains consistent across poses.
- [ ] Clearly fox, not wolf.
- [ ] No pet HP language.
- [ ] CommandReady reads as receiving command.
- [ ] Bite / Tailguard / BurnApply are distinct.

### 30.4 Enemies

- [ ] All official Ashwood enemies have idle sprites.
- [ ] Facing left.
- [ ] Transparent background.
- [ ] No card frame or UI baked in.
- [ ] Normal/elite/boss size classes are clear.
- [ ] Cinder Scribe reads as rare-card bearer / information enemy.
- [ ] Emberroot Warden reads as boss/leader.

### 30.5 Cards

- [ ] Card frames preserve 5:7 ratio.
- [ ] Cost socket remains clear.
- [ ] Text/rules zones remain readable.
- [ ] Pet-command frame reads as pet-command by shape, not only color.
- [ ] Rarity visuals are modular.
- [ ] Source badges are modular.
- [ ] Starter card art windows contain no text/frame.

### 30.6 Intent / Status / Tags

- [ ] Intent icons support unknown/category/rough/scoped language.
- [ ] Unknown looks intentional.
- [ ] Status icons readable at logical `22 x 22`.
- [ ] Tag icons readable in card tag row.
- [ ] Overflow icon supports code-rendered `+N`.

### 30.7 HUD / Panels

- [ ] Player HUD frame supports HP/block/status.
- [ ] Energy orb separate from Player HUD.
- [ ] Draw/discard piles visually distinct.
- [ ] End Turn button supports code-rendered label.
- [ ] Tooltip/detail panels support code-rendered text and click blocking.

### 30.8 VFX

- [ ] Pet-command VFX is visually unique.
- [ ] Normal attack never uses pet-command line.
- [ ] Impact/burn/shield/status/defeat VFX are readable.
- [ ] VFX does not obscure gameplay information too long.
- [ ] Code fallback exists for every VFX behavior.

---

## 31. Golden Flow Asset Review

Use these flows to review whether assets support gameplay clarity.

### Flow 1 — Normal Keeper Attack

Expected visual result:

- normal/keeper card frame;
- no orange line;
- Keeper attack pose or attack VFX;
- enemy target ring and impact burst.

### Flow 2 — Fox Bite

Expected visual result:

- pet-command card frame;
- orange line to Ember Fox;
- enemy target ring;
- Ember Fox commandReady then bite pose;
- impact + burn apply VFX on enemy.

### Flow 3 — Tailguard

Expected visual result:

- pet-command frame;
- orange line to Ember Fox;
- Ember Fox tailguard pose;
- shield arc near Keeper;
- Player HUD block pulse.

### Flow 4 — Read the Ash

Expected visual result:

- Keeper Signal card language;
- Keeper command/signal pose;
- target enemy intent token reveal/scope/rough marker update;
- no pet-command line unless the card actually commands pet.

### Flow 5 — Burn

Expected visual result:

- burn icon pops and settles into enemy status tray;
- burn tick VFX is local to affected enemy;
- stack number code-rendered.

### Flow 6 — Enemy Plan Readout Change

Expected visual result:

- intent token pulses or changed marker appears;
- exact text/amount is code-rendered;
- enemy sprite remains creature, not card.

### Flow 7 — End Turn / Enemy Attack

Expected visual result:

- End Turn button disables;
- enemy intent resolves;
- enemy attack travels left toward Keeper;
- Keeper hurt/guarded pose and Player HUD update.

### Flow 8 — Missing Asset

Expected visual result:

- fallback placeholder appears;
- interaction remains playable;
- debug warning appears if enabled;
- no crash, no layout break.

---

## 32. Deferred Assets

Do not create these in combat v0.1 unless the relevant contract is updated:

- pet HP bar;
- pet injury/death/revive poses;
- enemy pet-target intent marker;
- visible enemy hand cards;
- enemy battlefield card frame;
- top boss HP bar;
- reward card choice background;
- pet upgrade reward charms;
- run map nodes;
- pet journal panels;
- full pile viewer modal;
- player-facing combat log panel;
- mobile/touch-specific controls;
- controller glyph set.

---

## 33. Minimal First Image-Generation Batch

Although all image-backed assets are expected to be generated eventually, the first practical batch should focus on readability and identity.

Recommended first batch:

1. `combat.cardFrame.normal`
2. `combat.cardFrame.petCommand`
3. rarity gems: starter/common/uncommon/rare
4. source badges: classBound/petBound/petSupport/encounterReward
5. core family badges: Keeper Attack, Keeper Skill, Keeper Signal, Pet-Command, Pet Support
6. core intent icons: unknown/attack/defend/buff/debuff/special/charging
7. core status icons: burn/block/guard/empowered/marked/ready/fallback/overflow
8. core tag icons: petCommand/fox/burn/guard/block/draw/mark/attack/setup/signal
9. Player HUD frame
10. energy orb
11. draw pile and discard pile skins
12. End Turn button skin
13. pet ring and enemy target ring
14. Ember Fox idle and commandReady
15. generic enemy idle
16. Ashwood parallax groundPlane and midTrees

Do not start with every enemy and every card art if the card frame/intent/status visual language is not accepted yet.

---

## 34. Full First-Playable Asset Completion Target

Before the first playable combat is considered visually presentable, the following should exist:

- four Ashwood parallax background layers;
- Keeper idle/command/attack/hurtGuarded;
- Ember Fox idle/commandReady/bite/tailguard/burnApply/calm;
- official Ashwood enemy idle sprites;
- normal/petCommand/petSupport/keeperSignal card frames;
- rarity/source/family visual engine assets;
- starter deck card art windows;
- v0.5 plan/Intent token assets;
- status and tag icon sets;
- bottom HUD / Player HUD / tooltip / detail panel skins;
- pet/enemy slot UI assets;
- required hybrid VFX textures or polished code fallbacks;
- fallback placeholders.

---

## 35. Version Notes

### v0.1 — 2026-05-29

Initial combat asset manifest.

Key decisions:

- combat-only scope;
- 4K-ready single runtime asset policy;
- no `1x/2x/3x` parallel runtime asset sets;
- parallax background from the beginning;
- Keeper gets idle, command, attack, hurt/guarded poses;
- Ember Fox gets six combat poses;
- official Ashwood enemy roster included;
- card visual engine formalized: frame, rarity, source, family, art window, tags, detail panel;
- v0.5 sequence-aware Intent readout asset support added;
- VFX behavior marked required, with code fallback allowed;
- all dynamic text/numbers remain code-rendered;
- no pet HP, no enemy battlefield cards, no full generated card screenshots.
