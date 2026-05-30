# Combat Asset Batch 01 Contract v0.1 — Card/UI Readability Kit

Status: Draft for Codex/image-generation execution  
Scope: Combat only  
Batch: 1 of 4 image-generation batches  
Depends on: `combat_asset_manifest.md`, `ui_ux_interaction.md`, `combat_card_game_rules.md`, `combat_content_foundation.md`, `design.md`

Batch 01 creates the modular UI and card-readability asset kit. These are the assets that make the existing combat wireframe feel like a real game while preserving code-rendered text, code-driven state, and Phaser presenter control.

Do not generate full combat screenshots. Do not generate full card images with text. Generate modular parts only.

---

## 1. Objective

Generate, clean, export, and integrate the first set of image-backed combat UI assets:

- card frame skins;
- rarity gems;
- source badges;
- family/type badges;
- intent / plan readout icons and markers;
- status icons;
- tag icons;
- bottom HUD and Player HUD skins;
- controls;
- tooltip/detail/pause panels;
- pet/enemy slot rings and trays.

This batch must prove the in-game card visual generator can compose cards from modular parts.

---

## 2. Non-Negotiables

1. All gameplay text and numbers are code-rendered.
2. Generated assets must not contain titles, rules text, costs, HP values, damage values, labels, or fake glyph text.
3. Cards are assembled by `CardPresenter`; generated assets are frames, badges, gems, art placeholders, and icons.
4. Enemy hands/cards are not rendered on the battlefield.
5. Pet-command visual language must be distinct from normal card language.
6. Orange command line is pet-command only; this batch may create supporting ring/glow assets, not a generic targeting line.
7. Intent assets support v0.5 plan readout visibility. Exact plan names and amounts remain code-rendered.
8. Ember Fox has no pet HP assets.
9. Assets are 4K-ready single runtime assets; no `_1x`, `_2x`, `_3x` runtime filename variants.
10. All assets must have safe fallbacks in code.

---

## 3. Runtime Folder Target

Runtime files should go under:

```txt
public/assets/combat/
  cards/frames/
  cards/rarity/
  cards/source_badges/
  cards/family_badges/
  icons/intent/
  icons/status/
  icons/tags/
  ui/hud/
  ui/panels/
  ui/slots/
  vfx/general/
  fallback/
```

Raw generator output should go under:

```txt
art_source/generated/combat/batch_01_ui_readability/raw/
art_source/generated/combat/batch_01_ui_readability/working/
```

Only cleaned runtime PNGs should be referenced by Phaser.

---

## 4. Asset Size Policy

Batch 1 assets use one high-resolution runtime asset per key. Recommended source pixels are based on roughly 4x logical display size.

| Asset Type | Recommended Runtime Source Size |
| --- | ---: |
| Card frame | `384 x 536` |
| Card frame overlay | `384 x 536` |
| Card art placeholder | `320 x 180` or larger, transparent-safe |
| Rarity gem | `192 x 192` |
| Source badge | `192 x 192` |
| Family badge | `192 x 192` |
| Status icon | `88 x 88` or `128 x 128` |
| Tag icon | `88 x 88` or `128 x 128` |
| Intent token frame | `280 x 184` |
| Intent icon | `192 x 192` |
| Intent marker | `128 x 128` |
| Energy orb | `320 x 320` |
| Draw/discard pile | `232 x 328` |
| End Turn button skin | `496 x 224` or 9-slice-safe equivalent |
| Player HUD frame | `704 x 480` |
| Bottom HUD plate | approx `5120 x 640`, or 9-slice-safe panel asset |
| Tooltip/detail/pause panel | 9-slice-safe high-res panel asset, not full-screen text |
| Pet/enemy rings | `472 x 472` or similar square transparent asset |

If image generation cannot produce exact sizes, generate larger and downscale/crop to the target. Preserve transparent background where appropriate.

---

## 5. Card Frame Assets

These are 5:7 card frames. They must preserve blank zones for cost, art, title, rules, and tags.

| Asset Key | Runtime File | Notes |
| --- | --- | --- |
| `combat.cardFrame.normal` | `public/assets/combat/cards/frames/combat_card_frame_normal.png` | neutral Keeper/player frame |
| `combat.cardFrame.petCommand` | `public/assets/combat/cards/frames/combat_card_frame_pet_command.png` | paw-rune / ember command identity |
| `combat.cardFrame.petSupport` | `public/assets/combat/cards/frames/combat_card_frame_pet_support.png` | pet charm/link identity |
| `combat.cardFrame.keeperSignal` | `public/assets/combat/cards/frames/combat_card_frame_keeper_signal.png` | field-signal / read-the-ash identity |
| `combat.cardFrame.futurePower` | `public/assets/combat/cards/frames/combat_card_frame_future_power.png` | reserved ongoing/power frame |
| `combat.cardFrame.temporary` | `public/assets/combat/cards/frames/combat_card_frame_temporary.png` | fading ash / temporary feel |
| `combat.cardFrame.hoverOverlay` | `public/assets/combat/cards/frames/combat_card_frame_hover_overlay.png` | transparent hover glow |
| `combat.cardFrame.selectedOverlay` | `public/assets/combat/cards/frames/combat_card_frame_selected_overlay.png` | transparent selected glow |
| `combat.cardFrame.unplayableOverlay` | `public/assets/combat/cards/frames/combat_card_frame_unplayable_overlay.png` | transparent disabled overlay |
| `combat.cardFrame.artWindowPlaceholder` | `public/assets/combat/cards/frames/combat_card_art_window_placeholder.png` | blank art window fallback |

Acceptance:

- no text, no numbers, no fake labels;
- cost socket clear but empty;
- title/rules/tag zones readable when code text is overlaid;
- pet-command frame is visibly distinct from normal frame without relying only on color;
- frames are not too ornate for small hand-card display.

---

## 6. Rarity Gem Assets

Rarity is separate from source. These are small modular overlays.

| Asset Key | Runtime File | Visual Direction |
| --- | --- | --- |
| `combat.cardRarity.starter` | `public/assets/combat/cards/rarity/combat_card_rarity_starter.png` | simple stamped mark |
| `combat.cardRarity.common` | `public/assets/combat/cards/rarity/combat_card_rarity_common.png` | plain bronze/wood charm |
| `combat.cardRarity.uncommon` | `public/assets/combat/cards/rarity/combat_card_rarity_uncommon.png` | brighter teal/green charm |
| `combat.cardRarity.rare` | `public/assets/combat/cards/rarity/combat_card_rarity_rare.png` | warm gold ember gem |
| `combat.cardRarity.special` | `public/assets/combat/cards/rarity/combat_card_rarity_special.png` | shrine/memory seal |
| `combat.cardRarity.unique` | `public/assets/combat/cards/rarity/combat_card_rarity_unique.png` | distinct sealed story charm |

Acceptance:

- visible at small size;
- distinguishable by shape as well as color;
- no letters, no labels;
- not visually confused with card cost.

---

## 7. Card Source Badge Assets

Source identifies where the card belongs thematically/mechanically.

| Asset Key | Runtime File | Visual Direction |
| --- | --- | --- |
| `combat.cardSource.universalPlayer` | `public/assets/combat/cards/source_badges/combat_card_source_universal_player.png` | neutral journal mark |
| `combat.cardSource.classBound` | `public/assets/combat/cards/source_badges/combat_card_source_class_bound.png` | Keeper bracer / field signal |
| `combat.cardSource.petBound` | `public/assets/combat/cards/source_badges/combat_card_source_pet_bound.png` | Ember Fox paw-rune / fox sigil |
| `combat.cardSource.petSupport` | `public/assets/combat/cards/source_badges/combat_card_source_pet_support.png` | pet charm / link rune |
| `combat.cardSource.encounterReward` | `public/assets/combat/cards/source_badges/combat_card_source_encounter_reward.png` | rare bearer / scribe seal |
| `combat.cardSource.eventOnly` | `public/assets/combat/cards/source_badges/combat_card_source_event_only.png` | story/journal event seal |
| `combat.cardSource.temporary` | `public/assets/combat/cards/source_badges/combat_card_source_temporary.png` | fading ash mark |
| `combat.cardSource.legacy` | `public/assets/combat/cards/source_badges/combat_card_source_legacy.png` | debug/migration mark, subdued |

Acceptance:

- shape-based, no text;
- does not duplicate rarity gem language;
- petBound must clearly imply fox/pet without becoming a mascot illustration.

---

## 8. Card Family Badge Assets

Family indicates gameplay role. These badges support hand readability and detail panels.

| Asset Key | Runtime File | Visual Direction |
| --- | --- | --- |
| `combat.cardFamily.keeperAttack` | `public/assets/combat/cards/family_badges/combat_card_family_keeper_attack.png` | Keeper direct strike |
| `combat.cardFamily.keeperSkill` | `public/assets/combat/cards/family_badges/combat_card_family_keeper_skill.png` | shield/fieldcraft utility |
| `combat.cardFamily.keeperSignal` | `public/assets/combat/cards/family_badges/combat_card_family_keeper_signal.png` | signal/scout/read motif |
| `combat.cardFamily.petCommand` | `public/assets/combat/cards/family_badges/combat_card_family_pet_command.png` | paw-command mark |
| `combat.cardFamily.petSupport` | `public/assets/combat/cards/family_badges/combat_card_family_pet_support.png` | pet support/link charm |
| `combat.cardFamily.power` | `public/assets/combat/cards/family_badges/combat_card_family_power.png` | ongoing ember seal |
| `combat.cardFamily.temporary` | `public/assets/combat/cards/family_badges/combat_card_family_temporary.png` | fading ash/time mark |

Acceptance:

- petCommand badge is unmistakable;
- badges remain readable at small size;
- no letters or fake labels.

---

## 9. Intent / Plan Readout Assets

Intent is a v0.5 plan-readout, not a legacy monster script. Exact plan text and amounts are code-rendered.

| Asset Key | Runtime File |
| --- | --- |
| `combat.intentToken.frame` | `public/assets/combat/icons/intent/combat_intent_token_frame.png` |
| `combat.icon.intent.unknown` | `public/assets/combat/icons/intent/combat_icon_intent_unknown.png` |
| `combat.icon.intent.attack` | `public/assets/combat/icons/intent/combat_icon_intent_attack.png` |
| `combat.icon.intent.defend` | `public/assets/combat/icons/intent/combat_icon_intent_defend.png` |
| `combat.icon.intent.buff` | `public/assets/combat/icons/intent/combat_icon_intent_buff.png` |
| `combat.icon.intent.debuff` | `public/assets/combat/icons/intent/combat_icon_intent_debuff.png` |
| `combat.icon.intent.special` | `public/assets/combat/icons/intent/combat_icon_intent_special.png` |
| `combat.icon.intent.charging` | `public/assets/combat/icons/intent/combat_icon_intent_charging.png` |
| `combat.icon.intent.obscured` | `public/assets/combat/icons/intent/combat_icon_intent_obscured.png` |
| `combat.intentMarker.scoped` | `public/assets/combat/icons/intent/combat_intent_marker_scoped.png` |
| `combat.intentMarker.locked` | `public/assets/combat/icons/intent/combat_intent_marker_locked.png` |
| `combat.intentMarker.adaptive` | `public/assets/combat/icons/intent/combat_intent_marker_adaptive.png` |
| `combat.intentMarker.changedPulse` | `public/assets/combat/icons/intent/combat_intent_marker_changed_pulse.png` |
| `combat.intentMarker.multiHit` | `public/assets/combat/icons/intent/combat_intent_marker_multi_hit.png` |
| `combat.intentMarker.roughLow` | `public/assets/combat/icons/intent/combat_intent_marker_rough_low.png` |
| `combat.intentMarker.roughMedium` | `public/assets/combat/icons/intent/combat_intent_marker_rough_medium.png` |
| `combat.intentMarker.roughHigh` | `public/assets/combat/icons/intent/combat_intent_marker_rough_high.png` |

Acceptance:

- readable above enemy sprites;
- does not look like player card icons;
- supports unknown/scoped/obscured information mechanics;
- no text or numbers baked in.

---

## 10. Status Icon Assets

| Asset Key | Runtime File |
| --- | --- |
| `combat.icon.status.burn` | `public/assets/combat/icons/status/combat_icon_status_burn.png` |
| `combat.icon.status.block` | `public/assets/combat/icons/status/combat_icon_status_block.png` |
| `combat.icon.status.guard` | `public/assets/combat/icons/status/combat_icon_status_guard.png` |
| `combat.icon.status.empowered` | `public/assets/combat/icons/status/combat_icon_status_empowered.png` |
| `combat.icon.status.marked` | `public/assets/combat/icons/status/combat_icon_status_marked.png` |
| `combat.icon.status.ready` | `public/assets/combat/icons/status/combat_icon_status_ready.png` |
| `combat.icon.status.commanded` | `public/assets/combat/icons/status/combat_icon_status_commanded.png` |
| `combat.icon.status.obscured` | `public/assets/combat/icons/status/combat_icon_status_obscured.png` |
| `combat.icon.status.scoped` | `public/assets/combat/icons/status/combat_icon_status_scoped.png` |
| `combat.icon.status.revealed` | `public/assets/combat/icons/status/combat_icon_status_revealed.png` |
| `combat.icon.status.bound` | `public/assets/combat/icons/status/combat_icon_status_bound.png` |
| `combat.icon.status.overflow` | `public/assets/combat/icons/status/combat_icon_status_overflow.png` |
| `combat.icon.status.fallback` | `public/assets/combat/icons/status/combat_icon_status_fallback.png` |

Acceptance:

- readable at 22 logical pixels;
- strong silhouette;
- color plus shape, not color alone;
- overflow icon must not include `+N` text baked in; the `+N` number is code-rendered.

---

## 11. Tag Icon Assets

| Asset Key | Runtime File |
| --- | --- |
| `combat.icon.tag.petCommand` | `public/assets/combat/icons/tags/combat_icon_tag_pet_command.png` |
| `combat.icon.tag.fox` | `public/assets/combat/icons/tags/combat_icon_tag_fox.png` |
| `combat.icon.tag.burn` | `public/assets/combat/icons/tags/combat_icon_tag_burn.png` |
| `combat.icon.tag.guard` | `public/assets/combat/icons/tags/combat_icon_tag_guard.png` |
| `combat.icon.tag.block` | `public/assets/combat/icons/tags/combat_icon_tag_block.png` |
| `combat.icon.tag.draw` | `public/assets/combat/icons/tags/combat_icon_tag_draw.png` |
| `combat.icon.tag.mark` | `public/assets/combat/icons/tags/combat_icon_tag_mark.png` |
| `combat.icon.tag.attack` | `public/assets/combat/icons/tags/combat_icon_tag_attack.png` |
| `combat.icon.tag.setup` | `public/assets/combat/icons/tags/combat_icon_tag_setup.png` |
| `combat.icon.tag.combo` | `public/assets/combat/icons/tags/combat_icon_tag_combo.png` |
| `combat.icon.tag.keeper` | `public/assets/combat/icons/tags/combat_icon_tag_keeper.png` |
| `combat.icon.tag.signal` | `public/assets/combat/icons/tags/combat_icon_tag_signal.png` |
| `combat.icon.tag.scout` | `public/assets/combat/icons/tags/combat_icon_tag_scout.png` |
| `combat.icon.tag.fetch` | `public/assets/combat/icons/tags/combat_icon_tag_fetch.png` |
| `combat.icon.tag.reveal` | `public/assets/combat/icons/tags/combat_icon_tag_reveal.png` |
| `combat.icon.tag.scope` | `public/assets/combat/icons/tags/combat_icon_tag_scope.png` |
| `combat.icon.tag.obscure` | `public/assets/combat/icons/tags/combat_icon_tag_obscure.png` |
| `combat.icon.tag.rare` | `public/assets/combat/icons/tags/combat_icon_tag_rare.png` |
| `combat.icon.tag.fallback` | `public/assets/combat/icons/tags/combat_icon_tag_fallback.png` |

Acceptance:

- readable in card tag row;
- not too detailed;
- no text labels;
- petCommand and fox tags must be clearly distinct.

---

## 12. HUD, Panel, Control, Slot Assets

### HUD / Panels

| Asset Key | Runtime File |
| --- | --- |
| `combat.ui.bottomHudPlate` | `public/assets/combat/ui/hud/combat_ui_bottom_hud_plate.png` |
| `combat.ui.playerHudFrame` | `public/assets/combat/ui/hud/combat_ui_player_hud_frame.png` |
| `combat.ui.playerPortraitFrame` | `public/assets/combat/ui/hud/combat_ui_player_portrait_frame.png` |
| `combat.ui.playerHpBarTrack` | `public/assets/combat/ui/hud/combat_ui_player_hp_bar_track.png` |
| `combat.ui.playerHpBarFillMask` | `public/assets/combat/ui/hud/combat_ui_player_hp_bar_fill_mask.png` |
| `combat.ui.playerBlockBadge` | `public/assets/combat/ui/hud/combat_ui_player_block_badge.png` |
| `combat.ui.playerStatusTray` | `public/assets/combat/ui/hud/combat_ui_player_status_tray.png` |
| `combat.ui.playerHoverFrame` | `public/assets/combat/ui/hud/combat_ui_player_hover_frame.png` |
| `combat.ui.tooltipPanel` | `public/assets/combat/ui/panels/combat_ui_tooltip_panel.png` |
| `combat.ui.detailPanel` | `public/assets/combat/ui/panels/combat_ui_detail_panel.png` |
| `combat.ui.cardDetailSidebar` | `public/assets/combat/ui/panels/combat_ui_card_detail_sidebar.png` |
| `combat.ui.cardDetailKeywordRow` | `public/assets/combat/ui/panels/combat_ui_card_detail_keyword_row.png` |
| `combat.ui.cardDetailTagTray` | `public/assets/combat/ui/panels/combat_ui_card_detail_tag_tray.png` |
| `combat.ui.detailCloseButton` | `public/assets/combat/ui/panels/combat_ui_detail_close_button.png` |
| `combat.ui.clickBlockerTint` | `public/assets/combat/ui/panels/combat_ui_click_blocker_tint.png` |
| `combat.ui.pausePanel` | `public/assets/combat/ui/panels/combat_ui_pause_panel.png` |
| `combat.ui.eventLogPanel` | `public/assets/combat/ui/panels/combat_ui_event_log_panel.png` |

### Controls

| Asset Key | Runtime File |
| --- | --- |
| `combat.control.energyOrb` | `public/assets/combat/ui/hud/combat_control_energy_orb.png` |
| `combat.control.drawPile` | `public/assets/combat/ui/hud/combat_control_draw_pile.png` |
| `combat.control.discardPile` | `public/assets/combat/ui/hud/combat_control_discard_pile.png` |
| `combat.control.endTurnButton` | `public/assets/combat/ui/hud/combat_control_end_turn_button.png` |
| `combat.control.menuButton` | `public/assets/combat/ui/hud/combat_control_menu_button.png` |

### Slots / Rings

| Asset Key | Runtime File |
| --- | --- |
| `combat.slot.petRing` | `public/assets/combat/ui/slots/combat_slot_pet_ring.png` |
| `combat.slot.petCommandGlow` | `public/assets/combat/ui/slots/combat_slot_pet_command_glow.png` |
| `combat.slot.emberChargePip` | `public/assets/combat/ui/slots/combat_slot_ember_charge_pip.png` |
| `combat.slot.petStatusTray` | `public/assets/combat/ui/slots/combat_slot_pet_status_tray.png` |
| `combat.slot.inactivePetSlot` | `public/assets/combat/ui/slots/combat_slot_inactive_pet_slot.png` |
| `combat.slot.enemyTargetRing` | `public/assets/combat/ui/slots/combat_slot_enemy_target_ring.png` |
| `combat.slot.enemyHpBarTrack` | `public/assets/combat/ui/slots/combat_slot_enemy_hp_bar_track.png` |
| `combat.slot.enemyHpBarFillMask` | `public/assets/combat/ui/slots/combat_slot_enemy_hp_bar_fill_mask.png` |
| `combat.slot.enemyBlockBadge` | `public/assets/combat/ui/slots/combat_slot_enemy_block_badge.png` |
| `combat.slot.enemyStatusTray` | `public/assets/combat/ui/slots/combat_slot_enemy_status_tray.png` |

Acceptance:

- panels are reusable and not tied to one screenshot;
- button text is not baked in;
- HP fill value is not baked in;
- energy numbers are not baked in;
- draw/discard counts are not baked in;
- rings remain readable over dark and warm backgrounds.

---

## 13. Done Definition

Batch 1 is done when:

1. Runtime asset files exist at the specified paths.
2. Raw image-generation files are archived under `art_source/generated/combat/batch_01_ui_readability/raw/`.
3. Generated files have no text, logos, watermarks, signatures, or baked gameplay numbers.
4. `CombatAssetKeys` still compiles and maps all used keys.
5. A combat asset registry/loader maps every Batch 1 key to its runtime file.
6. CombatScene preloads these assets before presenters render.
7. Presenters still fall back safely if any texture is missing.
8. CardPresenter uses generated frames/gems/badges/icons through the card visual generator.
9. Intent/status/tag/HUD/ring assets appear in combat preview where implemented.
10. The validation commands pass.

Required validation:

```bash
npm run typecheck
npm run test:phaser -- --reporter=dot
npm run build
```

Recommended validation:

```bash
npm run test:core -- --reporter=dot
npm run test:cli -- --reporter=dot
npm run test:scripts -- --reporter=dot
```

