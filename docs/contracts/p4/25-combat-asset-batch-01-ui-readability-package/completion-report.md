# Combat Asset Batch 01 Completion Report

Status: Complete  
Scope: `docs/contracts/p4/25-combat-asset-batch-01-ui-readability-package/`  
Batch: Card/UI Readability Kit

## Summary

Batch 01 is integrated as modular Phaser-loaded PNG assets. Gameplay text, HP, block, energy, pile counts, card costs, card titles, card rules, intent amounts, and button labels remain code-rendered. The work does not touch `src/game-core` or combat rules.

## Delivered Assets

- Runtime PNG root: `public/assets/combat/`
- Raw image-generation archive: `art_source/generated/combat/batch_01_ui_readability/raw/combat_asset_batch_01_ui_readability_raw_sheet.png`
- Working export manifest: `art_source/generated/combat/batch_01_ui_readability/working/batch_01_generation_manifest.json`
- Working export script: `art_source/generated/combat/batch_01_ui_readability/working/generate_batch_01_assets.py`
- Working contact sheets: `art_source/generated/combat/batch_01_ui_readability/working/*_working_contact_sheet.png`
- Runtime asset count: 112
- Skipped image-generation assets: `combat.cardFrame.unplayableOverlay`; live unplayable state is engine-owned greying/dimming.
- Regenerated assets: rarity/source/family badge filenames were regenerated once to match exact contract snake_case paths.
- Image-generation runtime promotion update: the six approved card frames, hover overlay, selected overlay, art-window placeholder, all six rarity tokens, all eight card source badges, all seven card family badges, all seventeen Intent UI assets, and all thirteen status icons now replace their earlier deterministic runtime PNGs.
- Current outstanding review inventory: `docs/evidence/p4-25-combat-asset-batch-01/outstanding-assets.md`
- Rarity gem validation evidence: `docs/evidence/p4-25-combat-asset-batch-01/rarity-gems-validation.json` and `docs/evidence/p4-25-combat-asset-batch-01/rarity-gems-runtime-sheet.png`
- Source badge validation evidence: `docs/evidence/p4-25-combat-asset-batch-01/source-badges-validation.json` and `docs/evidence/p4-25-combat-asset-batch-01/source-badges-runtime-sheet.png`
- Family badge validation evidence: `docs/evidence/p4-25-combat-asset-batch-01/family-badges-validation.json` and `docs/evidence/p4-25-combat-asset-batch-01/family-badges-runtime-sheet.png`
- Intent UI validation evidence: `docs/evidence/p4-25-combat-asset-batch-01/intent-ui-validation.json` and `docs/evidence/p4-25-combat-asset-batch-01/intent-ui-runtime-sheet.png`
- Status icon validation evidence: `docs/evidence/p4-25-combat-asset-batch-01/status-icons-validation.json` and `docs/evidence/p4-25-combat-asset-batch-01/status-icons-runtime-sheet.png`

### `assets/combat/cards/family_badges/`
- `combat.cardFamily.keeperAttack` -> `assets/combat/cards/family_badges/combat_card_family_keeper_attack.png` (192 x 192)
- `combat.cardFamily.keeperSkill` -> `assets/combat/cards/family_badges/combat_card_family_keeper_skill.png` (192 x 192)
- `combat.cardFamily.keeperSignal` -> `assets/combat/cards/family_badges/combat_card_family_keeper_signal.png` (192 x 192)
- `combat.cardFamily.petCommand` -> `assets/combat/cards/family_badges/combat_card_family_pet_command.png` (192 x 192)
- `combat.cardFamily.petSupport` -> `assets/combat/cards/family_badges/combat_card_family_pet_support.png` (192 x 192)
- `combat.cardFamily.power` -> `assets/combat/cards/family_badges/combat_card_family_power.png` (192 x 192)
- `combat.cardFamily.temporary` -> `assets/combat/cards/family_badges/combat_card_family_temporary.png` (192 x 192)

### `assets/combat/cards/frames/`
- `combat.cardFrame.normal` -> `assets/combat/cards/frames/combat_card_frame_normal.png` (384 x 536)
- `combat.cardFrame.petCommand` -> `assets/combat/cards/frames/combat_card_frame_pet_command.png` (384 x 536)
- `combat.cardFrame.petSupport` -> `assets/combat/cards/frames/combat_card_frame_pet_support.png` (384 x 536)
- `combat.cardFrame.keeperSignal` -> `assets/combat/cards/frames/combat_card_frame_keeper_signal.png` (384 x 536)
- `combat.cardFrame.futurePower` -> `assets/combat/cards/frames/combat_card_frame_future_power.png` (384 x 536)
- `combat.cardFrame.temporary` -> `assets/combat/cards/frames/combat_card_frame_temporary.png` (384 x 536)
- `combat.cardFrame.hoverOverlay` -> `assets/combat/cards/frames/combat_card_frame_hover_overlay.png` (384 x 536)
- `combat.cardFrame.selectedOverlay` -> `assets/combat/cards/frames/combat_card_frame_selected_overlay.png` (384 x 536)
- `combat.cardFrame.unplayableOverlay` -> `assets/combat/cards/frames/combat_card_frame_unplayable_overlay.png` (384 x 536, retained for registry compatibility; live unplayable rendering is now engine-owned greying/dimming)
- `combat.cardFrame.artWindowPlaceholder` -> `assets/combat/cards/frames/combat_card_art_window_placeholder.png` (287 x 265)

### `assets/combat/cards/rarity/`
- `combat.cardRarity.starter` -> `assets/combat/cards/rarity/combat_card_rarity_starter.png` (192 x 192)
- `combat.cardRarity.common` -> `assets/combat/cards/rarity/combat_card_rarity_common.png` (192 x 192)
- `combat.cardRarity.uncommon` -> `assets/combat/cards/rarity/combat_card_rarity_uncommon.png` (192 x 192)
- `combat.cardRarity.rare` -> `assets/combat/cards/rarity/combat_card_rarity_rare.png` (192 x 192)
- `combat.cardRarity.special` -> `assets/combat/cards/rarity/combat_card_rarity_special.png` (192 x 192)
- `combat.cardRarity.unique` -> `assets/combat/cards/rarity/combat_card_rarity_unique.png` (192 x 192)

### `assets/combat/cards/source_badges/`
- `combat.cardSource.universalPlayer` -> `assets/combat/cards/source_badges/combat_card_source_universal_player.png` (192 x 192)
- `combat.cardSource.classBound` -> `assets/combat/cards/source_badges/combat_card_source_class_bound.png` (192 x 192)
- `combat.cardSource.petBound` -> `assets/combat/cards/source_badges/combat_card_source_pet_bound.png` (192 x 192)
- `combat.cardSource.petSupport` -> `assets/combat/cards/source_badges/combat_card_source_pet_support.png` (192 x 192)
- `combat.cardSource.encounterReward` -> `assets/combat/cards/source_badges/combat_card_source_encounter_reward.png` (192 x 192)
- `combat.cardSource.eventOnly` -> `assets/combat/cards/source_badges/combat_card_source_event_only.png` (192 x 192)
- `combat.cardSource.temporary` -> `assets/combat/cards/source_badges/combat_card_source_temporary.png` (192 x 192)
- `combat.cardSource.legacy` -> `assets/combat/cards/source_badges/combat_card_source_legacy.png` (192 x 192)

### `assets/combat/icons/intent/`
- `combat.intentToken.frame` -> `assets/combat/icons/intent/combat_intent_token_frame.png` (280 x 184)
- `combat.icon.intent.unknown` -> `assets/combat/icons/intent/combat_icon_intent_unknown.png` (192 x 192)
- `combat.icon.intent.attack` -> `assets/combat/icons/intent/combat_icon_intent_attack.png` (192 x 192)
- `combat.icon.intent.defend` -> `assets/combat/icons/intent/combat_icon_intent_defend.png` (192 x 192)
- `combat.icon.intent.buff` -> `assets/combat/icons/intent/combat_icon_intent_buff.png` (192 x 192)
- `combat.icon.intent.debuff` -> `assets/combat/icons/intent/combat_icon_intent_debuff.png` (192 x 192)
- `combat.icon.intent.special` -> `assets/combat/icons/intent/combat_icon_intent_special.png` (192 x 192)
- `combat.icon.intent.charging` -> `assets/combat/icons/intent/combat_icon_intent_charging.png` (192 x 192)
- `combat.icon.intent.obscured` -> `assets/combat/icons/intent/combat_icon_intent_obscured.png` (192 x 192)
- `combat.intentMarker.scoped` -> `assets/combat/icons/intent/combat_intent_marker_scoped.png` (128 x 128)
- `combat.intentMarker.locked` -> `assets/combat/icons/intent/combat_intent_marker_locked.png` (128 x 128)
- `combat.intentMarker.adaptive` -> `assets/combat/icons/intent/combat_intent_marker_adaptive.png` (128 x 128)
- `combat.intentMarker.changedPulse` -> `assets/combat/icons/intent/combat_intent_marker_changed_pulse.png` (128 x 128)
- `combat.intentMarker.multiHit` -> `assets/combat/icons/intent/combat_intent_marker_multi_hit.png` (128 x 128)
- `combat.intentMarker.roughLow` -> `assets/combat/icons/intent/combat_intent_marker_rough_low.png` (128 x 128)
- `combat.intentMarker.roughMedium` -> `assets/combat/icons/intent/combat_intent_marker_rough_medium.png` (128 x 128)
- `combat.intentMarker.roughHigh` -> `assets/combat/icons/intent/combat_intent_marker_rough_high.png` (128 x 128)

### `assets/combat/icons/status/`
- `combat.icon.status.burn` -> `assets/combat/icons/status/combat_icon_status_burn.png` (128 x 128)
- `combat.icon.status.block` -> `assets/combat/icons/status/combat_icon_status_block.png` (128 x 128)
- `combat.icon.status.guard` -> `assets/combat/icons/status/combat_icon_status_guard.png` (128 x 128)
- `combat.icon.status.empowered` -> `assets/combat/icons/status/combat_icon_status_empowered.png` (128 x 128)
- `combat.icon.status.marked` -> `assets/combat/icons/status/combat_icon_status_marked.png` (128 x 128)
- `combat.icon.status.ready` -> `assets/combat/icons/status/combat_icon_status_ready.png` (128 x 128)
- `combat.icon.status.commanded` -> `assets/combat/icons/status/combat_icon_status_commanded.png` (128 x 128)
- `combat.icon.status.obscured` -> `assets/combat/icons/status/combat_icon_status_obscured.png` (128 x 128)
- `combat.icon.status.scoped` -> `assets/combat/icons/status/combat_icon_status_scoped.png` (128 x 128)
- `combat.icon.status.revealed` -> `assets/combat/icons/status/combat_icon_status_revealed.png` (128 x 128)
- `combat.icon.status.bound` -> `assets/combat/icons/status/combat_icon_status_bound.png` (128 x 128)
- `combat.icon.status.overflow` -> `assets/combat/icons/status/combat_icon_status_overflow.png` (128 x 128)
- `combat.icon.status.fallback` -> `assets/combat/icons/status/combat_icon_status_fallback.png` (128 x 128)

### `assets/combat/icons/tags/`
- `combat.icon.tag.petCommand` -> `assets/combat/icons/tags/combat_icon_tag_pet_command.png` (128 x 128)
- `combat.icon.tag.fox` -> `assets/combat/icons/tags/combat_icon_tag_fox.png` (128 x 128)
- `combat.icon.tag.burn` -> `assets/combat/icons/tags/combat_icon_tag_burn.png` (128 x 128)
- `combat.icon.tag.guard` -> `assets/combat/icons/tags/combat_icon_tag_guard.png` (128 x 128)
- `combat.icon.tag.block` -> `assets/combat/icons/tags/combat_icon_tag_block.png` (128 x 128)
- `combat.icon.tag.draw` -> `assets/combat/icons/tags/combat_icon_tag_draw.png` (128 x 128)
- `combat.icon.tag.mark` -> `assets/combat/icons/tags/combat_icon_tag_mark.png` (128 x 128)
- `combat.icon.tag.attack` -> `assets/combat/icons/tags/combat_icon_tag_attack.png` (128 x 128)
- `combat.icon.tag.setup` -> `assets/combat/icons/tags/combat_icon_tag_setup.png` (128 x 128)
- `combat.icon.tag.combo` -> `assets/combat/icons/tags/combat_icon_tag_combo.png` (128 x 128)
- `combat.icon.tag.keeper` -> `assets/combat/icons/tags/combat_icon_tag_keeper.png` (128 x 128)
- `combat.icon.tag.signal` -> `assets/combat/icons/tags/combat_icon_tag_signal.png` (128 x 128)
- `combat.icon.tag.scout` -> `assets/combat/icons/tags/combat_icon_tag_scout.png` (128 x 128)
- `combat.icon.tag.fetch` -> `assets/combat/icons/tags/combat_icon_tag_fetch.png` (128 x 128)
- `combat.icon.tag.reveal` -> `assets/combat/icons/tags/combat_icon_tag_reveal.png` (128 x 128)
- `combat.icon.tag.scope` -> `assets/combat/icons/tags/combat_icon_tag_scope.png` (128 x 128)
- `combat.icon.tag.obscure` -> `assets/combat/icons/tags/combat_icon_tag_obscure.png` (128 x 128)
- `combat.icon.tag.rare` -> `assets/combat/icons/tags/combat_icon_tag_rare.png` (128 x 128)
- `combat.icon.tag.fallback` -> `assets/combat/icons/tags/combat_icon_tag_fallback.png` (128 x 128)

### `assets/combat/ui/hud/`
- `combat.ui.bottomHudPlate` -> `assets/combat/ui/hud/combat_ui_bottom_hud_plate.png` (5120 x 640)
- `combat.ui.playerHudFrame` -> `assets/combat/ui/hud/combat_ui_player_hud_frame.png` (704 x 480)
- `combat.ui.playerPortraitFrame` -> `assets/combat/ui/hud/combat_ui_player_portrait_frame.png` (256 x 256)
- `combat.ui.playerHpBarTrack` -> `assets/combat/ui/hud/combat_ui_player_hp_bar_track.png` (512 x 96)
- `combat.ui.playerHpBarFillMask` -> `assets/combat/ui/hud/combat_ui_player_hp_bar_fill_mask.png` (512 x 96)
- `combat.ui.playerBlockBadge` -> `assets/combat/ui/hud/combat_ui_player_block_badge.png` (192 x 192)
- `combat.ui.playerStatusTray` -> `assets/combat/ui/hud/combat_ui_player_status_tray.png` (512 x 128)
- `combat.ui.playerHoverFrame` -> `assets/combat/ui/hud/combat_ui_player_hover_frame.png` (704 x 480)
- `combat.control.energyOrb` -> `assets/combat/ui/hud/combat_control_energy_orb.png` (320 x 320)
- `combat.control.drawPile` -> `assets/combat/ui/hud/combat_control_draw_pile.png` (232 x 328)
- `combat.control.discardPile` -> `assets/combat/ui/hud/combat_control_discard_pile.png` (232 x 328)
- `combat.control.endTurnButton` -> `assets/combat/ui/hud/combat_control_end_turn_button.png` (496 x 224)
- `combat.control.menuButton` -> `assets/combat/ui/hud/combat_control_menu_button.png` (160 x 160)

### `assets/combat/ui/panels/`
- `combat.ui.tooltipPanel` -> `assets/combat/ui/panels/combat_ui_tooltip_panel.png` (704 x 320)
- `combat.ui.detailPanel` -> `assets/combat/ui/panels/combat_ui_detail_panel.png` (1280 x 880)
- `combat.ui.cardDetailSidebar` -> `assets/combat/ui/panels/combat_ui_card_detail_sidebar.png` (512 x 880)
- `combat.ui.cardDetailKeywordRow` -> `assets/combat/ui/panels/combat_ui_card_detail_keyword_row.png` (640 x 96)
- `combat.ui.cardDetailTagTray` -> `assets/combat/ui/panels/combat_ui_card_detail_tag_tray.png` (640 x 128)
- `combat.ui.detailCloseButton` -> `assets/combat/ui/panels/combat_ui_detail_close_button.png` (160 x 160)
- `combat.ui.clickBlockerTint` -> `assets/combat/ui/panels/combat_ui_click_blocker_tint.png` (64 x 64)
- `combat.ui.pausePanel` -> `assets/combat/ui/panels/combat_ui_pause_panel.png` (960 x 640)
- `combat.ui.eventLogPanel` -> `assets/combat/ui/panels/combat_ui_event_log_panel.png` (768 x 512)

### `assets/combat/ui/slots/`
- `combat.slot.petRing` -> `assets/combat/ui/slots/combat_slot_pet_ring.png` (472 x 472)
- `combat.slot.petCommandGlow` -> `assets/combat/ui/slots/combat_slot_pet_command_glow.png` (472 x 472)
- `combat.slot.emberChargePip` -> `assets/combat/ui/slots/combat_slot_ember_charge_pip.png` (128 x 128)
- `combat.slot.petStatusTray` -> `assets/combat/ui/slots/combat_slot_pet_status_tray.png` (384 x 104)
- `combat.slot.inactivePetSlot` -> `assets/combat/ui/slots/combat_slot_inactive_pet_slot.png` (472 x 472)
- `combat.slot.enemyTargetRing` -> `assets/combat/ui/slots/combat_slot_enemy_target_ring.png` (472 x 472)
- `combat.slot.enemyHpBarTrack` -> `assets/combat/ui/slots/combat_slot_enemy_hp_bar_track.png` (512 x 96)
- `combat.slot.enemyHpBarFillMask` -> `assets/combat/ui/slots/combat_slot_enemy_hp_bar_fill_mask.png` (512 x 96)
- `combat.slot.enemyBlockBadge` -> `assets/combat/ui/slots/combat_slot_enemy_block_badge.png` (192 x 192)
- `combat.slot.enemyStatusTray` -> `assets/combat/ui/slots/combat_slot_enemy_status_tray.png` (384 x 104)
## Integration

- Registry: `src/game-phaser/assets/combat-asset-registry.ts`
- Loader: `src/game-phaser/assets/combat-asset-loader.ts`
- Preload hook: `CombatSceneOrchestrator.preload()` calls `preloadCombatAssets(this)`.
- Card composition: `CardPresenter` composes card art behind transparent frame windows, generated frames above the art, engine-rendered cost/title/rules text, separate rarity tokens, three tag sockets, and hover/selected overlays through card-specific layout metrics from the layout editor.
- Unplayable state: live cards no longer render `combat.cardFrame.unplayableOverlay`; unplayable cards are greyed/dimmed by engine-owned Phaser presentation.
- Existing implemented UI surfaces now resolve texture assets with code fallbacks: HUD, energy, draw/discard piles, End Turn, player HUD panels, enemy intent tokens/icons, enemy target rings, enemy HP/status surfaces, pet rings/glows/charge pips/status chips, tooltip/detail/pause panels.
- Missing textures still fall back through `resolveCombatTexture` or existing code-rendered shapes.

## Validation

Required commands:

- `npm run typecheck` - passed
- `npm run test:phaser` - passed, 50 files / 295 tests
- `npm run build` - passed
- `npm test` - passed, 114 files / 900 tests

Recommended commands:

- `npm run test:core` - passed, 60 files / 584 tests
- `npm run test:cli` - passed, 3 files / 15 tests
- `npm run test:scripts` - passed, 1 file / 6 tests

The package scripts provide the dot reporter directly, so the captured logs avoid npm CLI warnings while preserving the requested reporter output.

Command logs:

- `docs/evidence/p4-25-combat-asset-batch-01/validation/typecheck.log`
- `docs/evidence/p4-25-combat-asset-batch-01/validation/test-phaser.log`
- `docs/evidence/p4-25-combat-asset-batch-01/validation/build.log`
- `docs/evidence/p4-25-combat-asset-batch-01/validation/test-core.log`
- `docs/evidence/p4-25-combat-asset-batch-01/validation/test-cli.log`
- `docs/evidence/p4-25-combat-asset-batch-01/validation/test-scripts.log`
- `docs/evidence/p4-25-combat-asset-batch-01/validation/runtime-integration-typecheck.log`
- `docs/evidence/p4-25-combat-asset-batch-01/validation/runtime-integration-test-phaser.log`
- `docs/evidence/p4-25-combat-asset-batch-01/validation/runtime-integration-build.log`
- `docs/evidence/p4-25-combat-asset-batch-01/validation/runtime-integration-test-all.log`

Asset validation:

- Evidence: `docs/evidence/p4-25-combat-asset-batch-01/asset-png-validation.json`
- Runtime integration validation: `docs/evidence/p4-25-combat-asset-batch-01/runtime-card-integration-validation.json`
- Intent UI validation: `docs/evidence/p4-25-combat-asset-batch-01/intent-ui-validation.json`
- Status icon validation: `docs/evidence/p4-25-combat-asset-batch-01/status-icons-validation.json`
- Result: true (112 RGBA PNGs, expected dimensions, transparent pixels present, critical duplicate checks passed)

Production preview smoke:

- Evidence screenshot: `docs/evidence/p4-25-combat-asset-batch-01/preview-combat-batch-01.png`
- Evidence JSON: `docs/evidence/p4-25-combat-asset-batch-01/preview-combat-batch-01-cdp-smoke.json`
- Per-asset runtime gallery screenshot: `docs/evidence/p4-25-combat-asset-batch-01/runtime-asset-gallery.png`
- Per-asset runtime gallery JSON: `docs/evidence/p4-25-combat-asset-batch-01/runtime-asset-gallery.json`
- Image-generation runtime integration screenshot: `docs/evidence/p4-25-combat-asset-batch-01/runtime-card-integration-dev.png`
- Vite preview production route screenshot: `docs/evidence/p4-25-combat-asset-batch-01/runtime-card-integration-preview-map.png`
- Served URL: `http://127.0.0.1:4173/` via `vite preview`
- Combat asset responses: 112
- Failed combat asset responses: 0
- Browser console warnings/errors: 0
- Per-asset browser decode/render checks: 112 passed / 0 failed

## Contract Notes

- No runtime `_1x`, `_2x`, or `_3x` variants were created.
- No pet HP assets were created.
- No enemy hand or enemy battlefield card assets were created.
- Raw/working files are not referenced by Phaser.
- The screenshot in evidence is a proof artefact only; it is not a runtime asset.
