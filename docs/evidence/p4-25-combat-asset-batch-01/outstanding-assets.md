# Batch 01 Outstanding Asset Inventory

Date: 2026-05-31  
Scope: Combat Asset Batch 01 UI Readability Kit  
Authoritative registry: `src/game-phaser/assets/combat-asset-registry.ts`

## Count Summary

| State | Count | Notes |
|---|---:|---|
| Batch 01 registry entries | 112 | All entries loaded through `BATCH_01_COMBAT_ASSET_DEFINITIONS`. |
| Image-generation assets already promoted to runtime | 111 | Six card frames, hover overlay, selected overlay, art-window placeholder, all six rarity gems, all eight card source badges, all seven card family badges, all seventeen Intent UI assets, all thirteen status icons, all nineteen tag icons, all ten combat slot assets, all thirteen HUD/control assets, and all nine detail/pause/event panel assets. |
| Registry entry intentionally not generated | 1 | `combat.cardFrame.unplayableOverlay`; unplayable state is engine-rendered grey/dim treatment. |
| Outstanding image-generation assets | 0 | All active image-generation requirements have runtime PNGs, preserved sources, alpha/dimension validation, and proof sheets. The sole skipped registry entry is the approved engine-owned unplayable state. |

## Shared Generation Rules

- Generate modular game UI assets, not screenshots or complete cards.
- Keep all final runtime assets as transparent PNGs at the contract dimensions listed below.
- Preserve raw image-generation sources under `art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/`.
- Never delete approved full-size sources or rejected attempts unless explicitly requested.
- Do not bake text, fake text, letters, numbers, labels, logos, watermarks, card titles, rules text, cost values, HP values, or intent amounts into any asset.
- Use the established Ember Journal - Ashbound Companions style anchor: clean smooth strokes, polished console fantasy adventure UI, field-journal fantasy materials, parchment, ink, warm ember accents, cool ash shadows, subtle brass/leather, restrained decoration, and high readability at small game UI sizes.
- For transparent requests with the built-in image-generation path, generate on a flat removable chroma-key background first, remove the key locally, then validate alpha before runtime promotion.
- Rarity gems render inside card-specific `rarityGemSocket` zones. The current runtime socket is 60 x 60 on the 384 x 536 layout-editor card canvas and 30 x 30 in Phaser's 192 x 268 display scale. Runtime PNGs remain 192 x 192 so the engine can scale them cleanly.

## Outstanding Categories

| Category | Outstanding | Runtime dimensions | Description |
|---|---:|---|---|
| Card rarity gems | 0 | 192 x 192 | Complete six-rarity runtime set is promoted and validated. |
| Card source badges | 0 | 192 x 192 | Complete eight-source runtime badge set is promoted and validated. |
| Card family badges | 0 | 192 x 192 | Complete seven-family runtime badge set is promoted and validated. |
| Intent UI | 0 | 280 x 184, 192 x 192, 128 x 128 | Complete enemy intent token frame, intent category icon, and plan-state marker set is promoted and validated. All numeric intent values stay engine-rendered. |
| Status icons | 0 | 128 x 128 | Complete combatant status icon set is promoted and validated. Stack counts and labels stay engine-rendered. |
| Tag icons | 0 | 128 x 128 | Complete card tag icon set is promoted and validated. They are reviewed at roughly 20.5 x 20.5 hand-card display scale. |
| HUD and controls | 0 | Mixed | Complete bottom HUD, player HUD parts, piles, energy orb, and menu/end-turn controls are promoted and validated. |
| Detail, pause, and event panels | 0 | Mixed | Complete tooltip/detail/pause/event panel set is promoted and validated. Content text remains engine-rendered. |
| Combat slots | 0 | Mixed | Complete pet/enemy rings, glows, charge/status trays, HP tracks, and block badges are promoted and validated. |

## Collaborative Layout Editors

| Outstanding category | Editor | Latest layout save | Validation state |
|---|---|---|---|
| HUD and controls | `docs/evidence/p4-25-combat-asset-batch-01/layout-editor-hud-controls.html` | `docs/evidence/p4-25-combat-asset-batch-01/layout-editor-saves/latest-hud-controls-layout.json` | Tailscale/mobile/browser smoke complete; promoted to runtime using the approved HUD/control layout metrics. |
| Detail, pause, and event panels | `docs/evidence/p4-25-combat-asset-batch-01/layout-editor-panels.html` | `docs/evidence/p4-25-combat-asset-batch-01/layout-editor-saves/latest-panels-layout.json` | Tailscale/mobile/browser smoke complete; promoted to runtime using the approved panel layout metrics. |
| Combat slots | `docs/evidence/p4-25-combat-asset-batch-01/layout-editor-slots.html` | `docs/evidence/p4-25-combat-asset-batch-01/layout-editor-saves/latest-slots-layout.json` | Tailscale/mobile/browser smoke complete; promoted to runtime using the approved slot layout metrics. |

## Card Rarity Gems - Complete 6

| Asset key | Runtime path | Dimensions | Description |
|---|---|---:|---|
| `combat.cardRarity.starter` | `assets/combat/cards/rarity/combat_card_rarity_starter.png` | 192 x 192 | Wood-and-bronze starter token. |
| `combat.cardRarity.common` | `assets/combat/cards/rarity/combat_card_rarity_common.png` | 192 x 192 | Bronze shield-like common token with amber centre. |
| `combat.cardRarity.uncommon` | `assets/combat/cards/rarity/combat_card_rarity_uncommon.png` | 192 x 192 | Brighter teal-green polished charm, distinct from common and rare. |
| `combat.cardRarity.rare` | `assets/combat/cards/rarity/combat_card_rarity_rare.png` | 192 x 192 | Warm gold ember gem. |
| `combat.cardRarity.special` | `assets/combat/cards/rarity/combat_card_rarity_special.png` | 192 x 192 | Shrine or memory seal, visibly special without text or letters. |
| `combat.cardRarity.unique` | `assets/combat/cards/rarity/combat_card_rarity_unique.png` | 192 x 192 | Distinct sealed story charm, most singular silhouette in the set. |

## Card Source Badges - Complete 8

| Asset key | Runtime path | Dimensions | Description |
|---|---|---:|---|
| `combat.cardSource.universalPlayer` | `assets/combat/cards/source_badges/combat_card_source_universal_player.png` | 192 x 192 | Neutral field-journal mark for universally available player cards. |
| `combat.cardSource.classBound` | `assets/combat/cards/source_badges/combat_card_source_class_bound.png` | 192 x 192 | Ashbound Keeper command-bracer or field-signal mark. |
| `combat.cardSource.petBound` | `assets/combat/cards/source_badges/combat_card_source_pet_bound.png` | 192 x 192 | Pet-bound companion command mark. Do not make it fox-only unless the card content requires that. |
| `combat.cardSource.petSupport` | `assets/combat/cards/source_badges/combat_card_source_pet_support.png` | 192 x 192 | Pet support charm or link rune. |
| `combat.cardSource.encounterReward` | `assets/combat/cards/source_badges/combat_card_source_encounter_reward.png` | 192 x 192 | Encounter reward seal or rare-holder token. |
| `combat.cardSource.eventOnly` | `assets/combat/cards/source_badges/combat_card_source_event_only.png` | 192 x 192 | Story or journal event seal. |
| `combat.cardSource.temporary` | `assets/combat/cards/source_badges/combat_card_source_temporary.png` | 192 x 192 | Fading ash mark for temporary source. |
| `combat.cardSource.legacy` | `assets/combat/cards/source_badges/combat_card_source_legacy.png` | 192 x 192 | Old archive or legacy seal. |

## Card Family Badges - Complete 7

| Asset key | Runtime path | Dimensions | Description |
|---|---|---:|---|
| `combat.cardFamily.keeperAttack` | `assets/combat/cards/family_badges/combat_card_family_keeper_attack.png` | 192 x 192 | Keeper attack identity, offensive but not monster-like. |
| `combat.cardFamily.keeperSkill` | `assets/combat/cards/family_badges/combat_card_family_keeper_skill.png` | 192 x 192 | Keeper skill identity, tactical utility. |
| `combat.cardFamily.keeperSignal` | `assets/combat/cards/family_badges/combat_card_family_keeper_signal.png` | 192 x 192 | Signal/scout/ash-reading identity. |
| `combat.cardFamily.petCommand` | `assets/combat/cards/family_badges/combat_card_family_pet_command.png` | 192 x 192 | Command identity for instructing pets. |
| `combat.cardFamily.petSupport` | `assets/combat/cards/family_badges/combat_card_family_pet_support.png` | 192 x 192 | Support/bond identity for pet-support cards. |
| `combat.cardFamily.power` | `assets/combat/cards/family_badges/combat_card_family_power.png` | 192 x 192 | Ongoing power identity, mystical but clean. |
| `combat.cardFamily.temporary` | `assets/combat/cards/family_badges/combat_card_family_temporary.png` | 192 x 192 | Temporary/fading identity. |

## Intent UI - Complete 17

| Asset key | Runtime path | Dimensions | Description |
|---|---|---:|---|
| `combat.intentToken.frame` | `assets/combat/icons/intent/combat_intent_token_frame.png` | 280 x 184 | Enemy intent token frame for icon plus engine-rendered amount/summary. |
| `combat.icon.intent.unknown` | `assets/combat/icons/intent/combat_icon_intent_unknown.png` | 192 x 192 | Unknown plan icon. |
| `combat.icon.intent.attack` | `assets/combat/icons/intent/combat_icon_intent_attack.png` | 192 x 192 | Attack plan icon. |
| `combat.icon.intent.defend` | `assets/combat/icons/intent/combat_icon_intent_defend.png` | 192 x 192 | Defend plan icon. |
| `combat.icon.intent.buff` | `assets/combat/icons/intent/combat_icon_intent_buff.png` | 192 x 192 | Buff plan icon. |
| `combat.icon.intent.debuff` | `assets/combat/icons/intent/combat_icon_intent_debuff.png` | 192 x 192 | Debuff plan icon. |
| `combat.icon.intent.special` | `assets/combat/icons/intent/combat_icon_intent_special.png` | 192 x 192 | Special plan icon. |
| `combat.icon.intent.charging` | `assets/combat/icons/intent/combat_icon_intent_charging.png` | 192 x 192 | Charging plan icon. |
| `combat.icon.intent.obscured` | `assets/combat/icons/intent/combat_icon_intent_obscured.png` | 192 x 192 | Obscured plan icon. |
| `combat.intentMarker.scoped` | `assets/combat/icons/intent/combat_intent_marker_scoped.png` | 128 x 128 | Scoped plan-state marker. |
| `combat.intentMarker.locked` | `assets/combat/icons/intent/combat_intent_marker_locked.png` | 128 x 128 | Locked plan-state marker. |
| `combat.intentMarker.adaptive` | `assets/combat/icons/intent/combat_intent_marker_adaptive.png` | 128 x 128 | Adaptive plan-state marker. |
| `combat.intentMarker.changedPulse` | `assets/combat/icons/intent/combat_intent_marker_changed_pulse.png` | 128 x 128 | Changed-pulse plan-state marker. |
| `combat.intentMarker.multiHit` | `assets/combat/icons/intent/combat_intent_marker_multi_hit.png` | 128 x 128 | Multi-hit plan-state marker. |
| `combat.intentMarker.roughLow` | `assets/combat/icons/intent/combat_intent_marker_rough_low.png` | 128 x 128 | Rough low-estimate marker. |
| `combat.intentMarker.roughMedium` | `assets/combat/icons/intent/combat_intent_marker_rough_medium.png` | 128 x 128 | Rough medium-estimate marker. |
| `combat.intentMarker.roughHigh` | `assets/combat/icons/intent/combat_intent_marker_rough_high.png` | 128 x 128 | Rough high-estimate marker. |

## Status Icons - Complete 13

| Asset key | Runtime path | Dimensions | Description |
|---|---|---:|---|
| `combat.icon.status.burn` | `assets/combat/icons/status/combat_icon_status_burn.png` | 128 x 128 | Burn status. |
| `combat.icon.status.block` | `assets/combat/icons/status/combat_icon_status_block.png` | 128 x 128 | Block status. |
| `combat.icon.status.guard` | `assets/combat/icons/status/combat_icon_status_guard.png` | 128 x 128 | Guard status. |
| `combat.icon.status.empowered` | `assets/combat/icons/status/combat_icon_status_empowered.png` | 128 x 128 | Empowered status. |
| `combat.icon.status.marked` | `assets/combat/icons/status/combat_icon_status_marked.png` | 128 x 128 | Marked status. |
| `combat.icon.status.ready` | `assets/combat/icons/status/combat_icon_status_ready.png` | 128 x 128 | Ready status. |
| `combat.icon.status.commanded` | `assets/combat/icons/status/combat_icon_status_commanded.png` | 128 x 128 | Commanded status. |
| `combat.icon.status.obscured` | `assets/combat/icons/status/combat_icon_status_obscured.png` | 128 x 128 | Obscured status. |
| `combat.icon.status.scoped` | `assets/combat/icons/status/combat_icon_status_scoped.png` | 128 x 128 | Scoped status. |
| `combat.icon.status.revealed` | `assets/combat/icons/status/combat_icon_status_revealed.png` | 128 x 128 | Revealed status. |
| `combat.icon.status.bound` | `assets/combat/icons/status/combat_icon_status_bound.png` | 128 x 128 | Bound status. |
| `combat.icon.status.overflow` | `assets/combat/icons/status/combat_icon_status_overflow.png` | 128 x 128 | Overflow status. |
| `combat.icon.status.fallback` | `assets/combat/icons/status/combat_icon_status_fallback.png` | 128 x 128 | Generic unknown status. |

## Tag Icons - Complete 19

| Asset key | Runtime path | Dimensions | Description |
|---|---|---:|---|
| `combat.icon.tag.petCommand` | `assets/combat/icons/tags/combat_icon_tag_pet_command.png` | 128 x 128 | Pet command tag. |
| `combat.icon.tag.fox` | `assets/combat/icons/tags/combat_icon_tag_fox.png` | 128 x 128 | Fox tag. Keep this as fox-specific because the registry key is fox-specific. |
| `combat.icon.tag.burn` | `assets/combat/icons/tags/combat_icon_tag_burn.png` | 128 x 128 | Burn tag. |
| `combat.icon.tag.guard` | `assets/combat/icons/tags/combat_icon_tag_guard.png` | 128 x 128 | Guard tag. |
| `combat.icon.tag.block` | `assets/combat/icons/tags/combat_icon_tag_block.png` | 128 x 128 | Block tag. |
| `combat.icon.tag.draw` | `assets/combat/icons/tags/combat_icon_tag_draw.png` | 128 x 128 | Draw tag. |
| `combat.icon.tag.mark` | `assets/combat/icons/tags/combat_icon_tag_mark.png` | 128 x 128 | Mark tag. |
| `combat.icon.tag.attack` | `assets/combat/icons/tags/combat_icon_tag_attack.png` | 128 x 128 | Attack tag. |
| `combat.icon.tag.setup` | `assets/combat/icons/tags/combat_icon_tag_setup.png` | 128 x 128 | Setup tag. |
| `combat.icon.tag.combo` | `assets/combat/icons/tags/combat_icon_tag_combo.png` | 128 x 128 | Combo tag. |
| `combat.icon.tag.keeper` | `assets/combat/icons/tags/combat_icon_tag_keeper.png` | 128 x 128 | Keeper tag. |
| `combat.icon.tag.signal` | `assets/combat/icons/tags/combat_icon_tag_signal.png` | 128 x 128 | Signal tag. |
| `combat.icon.tag.scout` | `assets/combat/icons/tags/combat_icon_tag_scout.png` | 128 x 128 | Scout tag. |
| `combat.icon.tag.fetch` | `assets/combat/icons/tags/combat_icon_tag_fetch.png` | 128 x 128 | Fetch tag. |
| `combat.icon.tag.reveal` | `assets/combat/icons/tags/combat_icon_tag_reveal.png` | 128 x 128 | Reveal tag. |
| `combat.icon.tag.scope` | `assets/combat/icons/tags/combat_icon_tag_scope.png` | 128 x 128 | Scope tag. |
| `combat.icon.tag.obscure` | `assets/combat/icons/tags/combat_icon_tag_obscure.png` | 128 x 128 | Obscure tag. |
| `combat.icon.tag.rare` | `assets/combat/icons/tags/combat_icon_tag_rare.png` | 128 x 128 | Rare tag. |
| `combat.icon.tag.fallback` | `assets/combat/icons/tags/combat_icon_tag_fallback.png` | 128 x 128 | Generic unknown tag. |

## HUD And Controls - Complete 13

| Asset key | Runtime path | Dimensions | Description |
|---|---|---:|---|
| `combat.ui.bottomHudPlate` | `assets/combat/ui/hud/combat_ui_bottom_hud_plate.png` | 5120 x 640 | Long bottom HUD plate with empty zones for engine-rendered UI. |
| `combat.ui.playerHudFrame` | `assets/combat/ui/hud/combat_ui_player_hud_frame.png` | 704 x 480 | Player HUD frame for portrait, HP, block, and status surfaces. |
| `combat.ui.playerPortraitFrame` | `assets/combat/ui/hud/combat_ui_player_portrait_frame.png` | 256 x 256 | Player portrait frame. |
| `combat.ui.playerHpBarTrack` | `assets/combat/ui/hud/combat_ui_player_hp_bar_track.png` | 512 x 96 | Player HP bar track. |
| `combat.ui.playerHpBarFillMask` | `assets/combat/ui/hud/combat_ui_player_hp_bar_fill_mask.png` | 512 x 96 | Player HP fill mask. |
| `combat.ui.playerBlockBadge` | `assets/combat/ui/hud/combat_ui_player_block_badge.png` | 192 x 192 | Player block badge without number. |
| `combat.ui.playerStatusTray` | `assets/combat/ui/hud/combat_ui_player_status_tray.png` | 512 x 128 | Player status tray. |
| `combat.ui.playerHoverFrame` | `assets/combat/ui/hud/combat_ui_player_hover_frame.png` | 704 x 480 | Player hover frame. |
| `combat.control.energyOrb` | `assets/combat/ui/hud/combat_control_energy_orb.png` | 320 x 320 | Energy orb without number. |
| `combat.control.drawPile` | `assets/combat/ui/hud/combat_control_draw_pile.png` | 232 x 328 | Draw pile control without count. |
| `combat.control.discardPile` | `assets/combat/ui/hud/combat_control_discard_pile.png` | 232 x 328 | Discard pile control without count. |
| `combat.control.endTurnButton` | `assets/combat/ui/hud/combat_control_end_turn_button.png` | 496 x 224 | End-turn button surface without text. |
| `combat.control.menuButton` | `assets/combat/ui/hud/combat_control_menu_button.png` | 160 x 160 | Menu button icon/surface. |

## Detail, Pause, And Event Panels - Complete 9

| Asset key | Runtime path | Dimensions | Description |
|---|---|---:|---|
| `combat.ui.tooltipPanel` | `assets/combat/ui/panels/combat_ui_tooltip_panel.png` | 704 x 320 | Tooltip panel with empty text area. |
| `combat.ui.detailPanel` | `assets/combat/ui/panels/combat_ui_detail_panel.png` | 1280 x 880 | Large detail panel with empty content area. |
| `combat.ui.cardDetailSidebar` | `assets/combat/ui/panels/combat_ui_card_detail_sidebar.png` | 512 x 880 | Card detail sidebar surface. |
| `combat.ui.cardDetailKeywordRow` | `assets/combat/ui/panels/combat_ui_card_detail_keyword_row.png` | 640 x 96 | Keyword row tray. |
| `combat.ui.cardDetailTagTray` | `assets/combat/ui/panels/combat_ui_card_detail_tag_tray.png` | 640 x 128 | Tag tray for detail panel. |
| `combat.ui.detailCloseButton` | `assets/combat/ui/panels/combat_ui_detail_close_button.png` | 160 x 160 | Detail close button surface. |
| `combat.ui.clickBlockerTint` | `assets/combat/ui/panels/combat_ui_click_blocker_tint.png` | 64 x 64 | Repeating tint tile for modal blocker. |
| `combat.ui.pausePanel` | `assets/combat/ui/panels/combat_ui_pause_panel.png` | 960 x 640 | Pause panel with empty text/control areas. |
| `combat.ui.eventLogPanel` | `assets/combat/ui/panels/combat_ui_event_log_panel.png` | 768 x 512 | Event log panel with empty content area. |

## Combat Slots - Complete 10

| Asset key | Runtime path | Dimensions | Description |
|---|---|---:|---|
| `combat.slot.petRing` | `assets/combat/ui/slots/combat_slot_pet_ring.png` | 472 x 472 | Active pet ring. |
| `combat.slot.petCommandGlow` | `assets/combat/ui/slots/combat_slot_pet_command_glow.png` | 472 x 472 | Pet command glow overlay. |
| `combat.slot.emberChargePip` | `assets/combat/ui/slots/combat_slot_ember_charge_pip.png` | 128 x 128 | Ember charge pip. |
| `combat.slot.petStatusTray` | `assets/combat/ui/slots/combat_slot_pet_status_tray.png` | 384 x 104 | Pet status tray. |
| `combat.slot.inactivePetSlot` | `assets/combat/ui/slots/combat_slot_inactive_pet_slot.png` | 472 x 472 | Inactive pet slot. |
| `combat.slot.enemyTargetRing` | `assets/combat/ui/slots/combat_slot_enemy_target_ring.png` | 472 x 472 | Enemy target ring. |
| `combat.slot.enemyHpBarTrack` | `assets/combat/ui/slots/combat_slot_enemy_hp_bar_track.png` | 512 x 96 | Enemy HP bar track. |
| `combat.slot.enemyHpBarFillMask` | `assets/combat/ui/slots/combat_slot_enemy_hp_bar_fill_mask.png` | 512 x 96 | Enemy HP fill mask. |
| `combat.slot.enemyBlockBadge` | `assets/combat/ui/slots/combat_slot_enemy_block_badge.png` | 192 x 192 | Enemy block badge without number. |
| `combat.slot.enemyStatusTray` | `assets/combat/ui/slots/combat_slot_enemy_status_tray.png` | 384 x 104 | Enemy status tray. |
