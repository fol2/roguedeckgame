# Codex Task Contract v0.1 — Generate and Apply Combat Asset Batch 01

Status: Ready to give to Codex agent  
Task type: image generation + asset cleanup + Phaser ingestion  
Scope: Combat Asset Batch 01 only

## Objective

Generate and integrate the Batch 01 Card/UI Readability Kit for the combat screen.

This task must use the image generator for the visual assets, then apply the cleaned runtime assets to the Phaser project through a loader/registry. Do not generate final combat screenshots. Do not generate full cards with baked text.

## Required Reading

Read these project docs first:

```txt
docs/contracts/combat-ui-asset-manifest-v0.1.md
or docs/combat_asset_manifest.md

docs/ui_ux_interaction.md
docs/combat_card_game_rules.md
docs/combat_content_foundation.md
docs/design.md
docs/architecture.md

docs/contracts/combat-asset-generation-overview-v0.1.md
docs/contracts/combat-asset-batch-01-ui-readability-contract-v0.1.md
docs/prompts/combat-asset-batch-01-ui-readability-prompts-v0.1.md
docs/contracts/combat-asset-ingestion-runbook-v0.1.md
```

## Non-Negotiables

- Do not touch `src/game-core`.
- Do not alter combat rules.
- Do not make Phaser decide gameplay outcomes.
- Do not bake gameplay text or numbers into images.
- Do not render enemy hands/cards on the battlefield.
- Do not add pet HP assets.
- Do not remove code fallbacks.
- Do not replace CardPresenter with generated full-card screenshots.
- Do not ship `_1x`, `_2x`, `_3x` runtime image variants.

## Deliverables

### 1. Runtime Assets

Create cleaned PNG runtime files under:

```txt
public/assets/combat/
```

Use the exact file names from:

```txt
docs/contracts/combat-asset-batch-01-ui-readability-contract-v0.1.md
```

### 2. Raw Asset Archive

Save raw image-generation output and intermediate files under:

```txt
art_source/generated/combat/batch_01_ui_readability/raw/
art_source/generated/combat/batch_01_ui_readability/working/
```

### 3. Phaser Loader / Registry

If missing, create:

```txt
src/game-phaser/assets/combat-asset-registry.ts
src/game-phaser/assets/combat-asset-loader.ts
```

The registry must map every Batch 1 runtime file to its `CombatAssetKeys` key.

### 4. CombatScene Preload Hook

If missing, add `preloadCombatAssets(this)` to `CombatSceneOrchestrator.preload()`.

### 5. Tests

Add/update tests so that:

- Batch 1 asset keys are present in the registry;
- no duplicate keys exist;
- asset paths are web-root paths beginning with `assets/combat/`;
- card visual generator still maps starter card metadata correctly;
- texture fallback behavior still works when an asset is missing.

### 6. Evidence

Provide:

- list of generated assets;
- list of any assets skipped or needing regeneration;
- validation command output;
- combat preview screenshot if possible.

## Execution Steps

1. Create runtime and raw asset folders.
2. Use the prompts in `combat-asset-batch-01-ui-readability-prompts-v0.1.md`.
3. Generate card frames first; do not continue if the card frame language is wrong.
4. Generate rarity/source/family badges.
5. Generate intent/status/tag icons.
6. Generate HUD/panel/control/ring assets.
7. Clean, crop, resize, and export each asset as transparent PNG.
8. Save raw images and working crops.
9. Create/update asset registry and loader.
10. Hook loader into CombatScene preload.
11. Run tests and build.
12. Open combat preview and visually inspect.

## Validation Commands

Required:

```bash
npm run typecheck
npm run test:phaser -- --reporter=dot
npm run build
```

Recommended:

```bash
npm run test:core -- --reporter=dot
npm run test:cli -- --reporter=dot
npm run test:scripts -- --reporter=dot
```

## Done Criteria

The task is done only when:

- all Batch 1 runtime assets are present;
- the combat scene loads them through stable asset keys;
- code-rendered text/numbers are still used;
- missing textures still fall back safely;
- combat preview still works;
- tests and build pass.

