# Combat UI Asset Manifest v0.1

## 1. Scope

This manifest is combat-only. It covers the Phaser combat presentation layer, combat presenters, combat layout helpers, combat event VFX, and combat detail/tooltip overlays.

Phase 1 implementation authoring canvas: `1280 x 720`.

This manifest does not cover reward UI, map UI, save/load UI, pet journal UI, or final art production. Missing assets must keep combat playable through code-rendered placeholders.

## 2. Dynamic Text Rule

Gameplay text and live numbers are code-rendered. They must not be baked into images.

- Card titles are code-rendered.
- Card costs are code-rendered.
- Card rules are code-rendered.
- HP, block, status stacks, and status durations are code-rendered.
- Energy values are code-rendered.
- Intent amounts are code-rendered.
- Draw and discard pile counts are code-rendered.
- End Turn text is code-rendered.
- Tooltip and detail text is code-rendered.
- Event-log text and debug text are code-rendered.

Assets may contain decorative blanks, icons, frames, panels, sprites, silhouettes, and VFX pieces. They may not contain live gameplay values.

## 3. Layering

| Layer | Assets Allowed | Dynamic Content |
| --- | --- | --- |
| BackgroundLayer | Combat background plates, neutral board fallback | None |
| BoardEntityLayer | Keeper sprite, Ember Fox sprite, enemy sprites/silhouettes, inactive pet slot runes | Labels and state text remain code-rendered |
| BoardUiLayer | Intent token frames/icons, enemy HP frame, status trays, target rings | Intent amounts, HP, block, and stacks are code-rendered |
| HudLayer | Player HUD panel, energy orb, draw/discard pile frames, End Turn button skin | HP/block/energy/pile counts/button text are code-rendered |
| TargetingLayer | Pet-command thread, command marker, endpoint rune flash | No damage or target numbers |
| VfxLayer | Impact burst, burn pop, shield arc, resolve pulse, defeat burst | Popup labels are code-rendered |
| TooltipLayer | Tooltip panel skin | Title/body text is code-rendered |
| DetailLayer | Detail panel skin, close button frame, click blocker tint | Title/body/footer text is code-rendered |
| DebugLayer | Optional debug panel frame | All debug text is code-rendered |

## 4. Card Frame Spec

Canonical card ratio: `5:7`.

Current 1x hand card display: `96 x 134 px`.

Recommended exports:

- `2x`: `192 x 268 px`
- `3x`: `288 x 402 px`

The current implementation zones are exported from `CARD_FRAME_ASSET_SPEC` in `src/game-phaser/layout/card-frame-layout.ts`.

| Zone | 1x Position/Size | Dynamic? | Asset-backed? | Notes |
| --- | --- | --- | --- | --- |
| cost socket | `x 30, y -45, 26 x 26` | Yes | Optional skin only | Cost number is code-rendered |
| title band | `x 0, y -46, 86 x 28` | Yes | Optional skin only | Card title is code-rendered |
| family badge | `x -20, y -16, 42 x 17` | No live text | Yes | Pet-command needs paw/rune readable without colour |
| art window | `x 0, y -22, 78 x 30` | No gameplay text | Yes | Blank placeholder if missing |
| rules text box | `x 0, y 25, 78 x 42` | Yes | Optional blank plate | Rules text is code-rendered |
| tag row | `x 0, y 53, 78 x 14` | Yes | Optional tray/icon row | Tag text/icons are code-rendered/replaced independently |
| rarity/frame accent | edge strip | No | Yes | Decorative only |
| hover outline layer | full card outline | State-driven | Optional overlay | Must not resize card |
| selected overlay layer | full card outline | State-driven | Optional overlay | Must not hide text |
| unplayable overlay layer | full card tint | State-driven | Optional overlay | Must preserve readability |

## 5. Card Frame Families

Required frame variants:

- Normal attack/skill frame: neutral combat card shell.
- Pet-command frame: orange/ember command family, with paw/rune badge or another non-colour cue.
- Pet-support frame: reserved Phase 1/Phase 2 family for pet support cards.
- Power/future frame placeholder: reserved only, not active gameplay content.
- Unplayable overlay.
- Selected overlay.
- Hover overlay.

No card frame may include baked title, cost, rules, damage, block, energy, or status values.

## 6. Intent Token Spec

Current token display size: `70 x 46 px`.

Token layout is exported from `INTENT_TOKEN_LAYOUT` in `src/game-phaser/layout/intent-token-layout.ts`.

Required token/icon variants:

- Unknown
- Attack
- Defend
- Buff
- Debuff
- Special
- Charging
- Scoped marker
- Rough strength low/medium/high marker
- Multi-hit marker support

Anchors:

- Glyph anchor: centred at `x 0, y -6` relative to token centre.
- Amount label anchor: centred at `x 0, y 12` relative to token centre.
- Tooltip hitbox padding: `8 px`.

Unknown `?` must look intentional, not like missing art. Exact/scoped/rough copy comes from the combat view model.

Enemy intent is represented by token grammar only. Enemy battlefield card assets are explicitly excluded.

## 7. Status and Tag Icon Spec

Status icons required:

- burn
- block
- guard
- empowered
- marked
- pet-commanded/ready
- status overflow `+N` container
- fallback status icon

Tag icons required:

- pet-command
- fox
- burn
- guard
- block
- draw
- mark
- attack
- setup
- combo

Visible caps:

- Enemy statuses: `4 + overflow`
- Player statuses: `5 + overflow`
- Pet statuses: `3 + overflow`
- Card tags: `4 + detail panel`

Status and tag icon layout is exported from `STATUS_ICON_LAYOUT` in `src/game-phaser/layout/status-icon-layout.ts`.

## 8. Player HUD Spec

Current player HUD panel: `176 x 120 px` at bottom left.

Required assets:

- Player HUD frame.
- Portrait frame.
- HP bar track/fill mask.
- Block badge area.
- Status tray plate.
- Hover/detail frame skin if needed. Hitboxes stay code/layout-defined.

Code-rendered anchors:

- Player name: `PLAYER_HUD_TEXT.nameX/nameY`.
- HP label and HP fill value.
- Block value.
- Status labels/stacks.

Keeper battlefield pose needs:

- idle
- command
- hurt

The Keeper battlefield avatar is a board entity. HP/block/status readability stays in the HUD, not on the battlefield sprite.

HUD control assets:

- Energy orb skin at the existing energy anchor.
- Draw pile frame and optional back plate.
- Discard pile frame and optional back plate.
- End Turn button skin.
- Menu button skin.

Code-rendered HUD control values:

- Current/max energy.
- Draw pile count.
- Discard pile count.
- End Turn label.
- Menu glyph or label.

## 9. Pet Area Spec

Required Ember Fox sprite/pose needs:

- idle
- command-ready
- bite/dash
- tailguard
- burn apply
- calm/future optional

Required pet area assets:

- Pet ring asset or code-rendered ring.
- Command glow layer.
- Ember Charge pip asset only if the mechanic is active.
- Pet status tray.
- Inactive future pet slot rune circle.

Phase 1 has no pet HP asset. Do not add pet injury/death/morale art in this pass.

## 10. Enemy Slot Spec

Support `1-3` enemies.

Required enemy slot assets:

- Enemy sprite/silhouette safe box: current `86 x 110 px`.
- Intent token anchor above enemy.
- Target ring anchor around enemy base.
- HP bar track/fill frame.
- Block badge area if needed.
- Status tray anchor.
- Enemy slot hitbox is code/layout-defined.

Enemy pose/sprite requirements:

- Training Slime idle.
- Generic enemy idle fallback.
- Future hurt/defeated poses may replace VFX, but must preserve hitbox.

Do not include enemy battlefield card frame assets.

## 11. Target Ring and Command Line VFX Spec

Target ring states:

- base
- valid
- focused
- hovered
- submitted
- impact
- invalid feedback

Target ring style tokens are exported from `COMBAT_TARGET_RING_TOKENS` in `src/game-phaser/layout/combat-ui-tokens.ts`.

Command line states:

- hover thread
- selected thread
- resolving pulse marker
- endpoint rune flash

The command line is pet-command-specific VFX/code-rendered. It must not be used for normal damage paths, enemy targeting, generic targeting, or enemy attacks.

## 12. Event VFX Spec

Event-to-VFX hooks are exported from `COMBAT_EVENT_VFX_SPECS` in `src/game-phaser/animation/combat-vfx-keys.ts`.

| Event | Source | Target Anchor | Asset Key | Fallback | Timing | Input Locked |
| --- | --- | --- | --- | --- | --- | --- |
| CardPlayed | card event | hand card | none | code popup | 120-220 ms | yes |
| EnergySpent | energy event | energy orb | none | code pulse | 120-220 ms | yes |
| PetCommanded | pet command event | active pet | `combat.vfx.petCommand.thread` | code thread | 140-260 ms | yes |
| PetReacted | pet event | active pet | none | code pulse | 120-220 ms | yes |
| PetModifierActivated | pet modifier event | active pet | none | code pulse | 120-220 ms | yes |
| DamageDealt | damage event | target combatant | `combat.vfx.impactBurst` | code burst | 120-220 ms | yes |
| BlockGained | block event | target combatant | `combat.vfx.shieldArc` | code pulse | 120-220 ms | yes |
| StatusApplied | status event | target combatant | `combat.vfx.statusPop` | code popup | 120-220 ms | yes |
| StatusExpired | status event | target combatant | none | code popup | 120-220 ms | yes |
| MonsterIntentSet | intent event | enemy intent anchor | none | code pulse | 120-220 ms | yes |
| MonsterIntentResolved | intent event | enemy anchor | `combat.vfx.intentResolvePulse` | neutral code pulse | 120-220 ms | yes |
| CombatantDefeated | combatant event | defeated combatant | `combat.vfx.defeatBurst` | code pulse | 120-240 ms | yes |
| CombatEnded | combat event | HUD centre | none | code popup | 120-240 ms | yes |
| ActionRejected | request event | player HUD | none | code popup | 100-180 ms | no |

Unknown events produce a debug warning, skip visual playback, and continue event playback.

## 13. Tooltip and Detail Panel Spec

Tooltip panel:

- Skin asset: `combat.ui.tooltipPanel`.
- Clamped to the 1280x720 canvas safe margin.
- Title/body text anchors remain code-rendered.
- Missing tooltip copy falls back to title plus `No details available yet.`

Detail panel:

- Skin asset: `combat.ui.detailPanel`.
- Close button hitbox remains layout-defined.
- Click blocker overlay prevents board/HUD click-through.
- Title/body/footer text anchors remain code-rendered.

## 14. Production Export Rules

- Transparent PNG is preferred for sprites, UI pieces, frames, icons, and VFX.
- Do not bake gameplay text or live numbers.
- Export at `2x` or `3x` where possible.
- Icons must remain readable at the current token/status sizes.
- Avoid premultiplied-alpha edge artefacts.
- File names use snake case and include scale suffix.
- Source names should match the runtime asset key group.

Examples:

```txt
combat_card_frame_pet_command_2x.png
combat_icon_intent_attack_2x.png
combat_pet_ember_fox_idle_2x.png
combat_vfx_command_marker_2x.png
```

## 15. Asset Replacement Checklist

- Replace frame asset only; card text still renders.
- Replace icon asset only; tooltip still works.
- Replace sprite pose only; hitbox stays stable.
- Replace VFX marker only; event order stays stable.
- Remove one requested asset; missing asset fallback still passes tests.
- Replace pet-command thread asset; normal attack still has no orange command line.
- Replace intent token skin; enemy battlefield cards are still absent.

## 16. Golden Flow Review Matrix

| Flow | Reviewer Must See |
| --- | --- |
| Normal enemy attack card | Normal card hover/selection never shows orange command line; enemy target ring shows valid/focused/hover states |
| Fox Bite pet-command attack | Orange command thread runs from card to Ember Fox, not to the enemy; damage VFX appears at target only |
| Tailguard/pet guard | Pet-command frame and pet glow are visible; block text remains code-rendered |
| Burn status application and tick | Burn/status icon or fallback appears locally on affected combatant; stack text remains code-rendered |
| Card detail during targeting | Detail overlay blocks board clicks and restores targeting state safely |
| Invalid target recovery | Invalid feedback does not submit gameplay; selected card state remains recoverable |
| End turn and enemy attack | Enemy intent token resolves neutrally; semantic damage/block/status events own VFX |
| Victory transition | CombatEnded popup/transition appears without relying on final art |

## Phase 1 Exclusions

- No final art is required.
- No new production dependency is required.
- No pet HP asset is permitted.
- No enemy pet-targeting marker asset is permitted.
- No enemy battlefield card asset is permitted.
