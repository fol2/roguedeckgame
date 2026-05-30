# Combat Asset Generation Overview v0.1

Status: Draft for Codex/image-generation execution  
Scope: Combat assets only  
Primary source contract: `docs/contracts/combat-ui-asset-manifest-v0.1.md` or `docs/combat_asset_manifest.md`  
Related docs: `docs/ui_ux_interaction.md`, `docs/combat_card_game_rules.md`, `docs/combat_content_foundation.md`, `docs/design.md`, `docs/architecture.md`

This document breaks combat asset production into image-generation batches and defines the execution order. It assumes the combat asset contract patch is already applied and that the repo contains the in-game card visual generator scaffold.

The goal is not to create polished final art all at once. The goal is to replace the current wireframe/fallback visuals with modular, 4K-ready, game-usable assets in the safest order.

---

## 1. Current Green-Light State

The repo is ready to start image-backed combat assets if these checks pass locally:

```bash
npm ci --ignore-scripts
npm run typecheck
npm run test:core -- --reporter=dot
npm run test:phaser -- --reporter=dot
npm run test:cli -- --reporter=dot
npm run test:scripts -- --reporter=dot
npm run build
```

This asset work must not weaken the current core architecture boundary:

- `src/game-core` owns gameplay rules.
- Phaser renders view-models and events.
- Phaser must not decide card legality, enemy plans, target rules, status timing, pet command resolution, reward resolution, or seeded randomness.
- Generated assets must not contain baked gameplay text or gameplay numbers.

---

## 2. Number of Image-Generation Batches

Use **four image-generation batches** plus one non-image QA/hardening pass.

### Batch 1 — Card/UI Readability Kit

Purpose: replace the most important gameplay-readability wireframe pieces first.

Includes:

- card frames;
- card rarity gems;
- card source badges;
- card family badges;
- intent / plan readout icons and markers;
- status icons;
- card tag icons;
- Player HUD / bottom HUD / controls;
- tooltip/detail/pause panels;
- pet/enemy slot rings and trays.

This is the first batch to execute.

### Batch 2 — Combat Identity Kit

Purpose: give the battlefield its visual identity while keeping the already-tested UI readable.

Includes:

- Ashwood Trail parallax background layers;
- Keeper avatar poses;
- Ember Fox combat poses;
- official Ashwood enemy idle sprites.

### Batch 3 — Starter Deck Card Art Windows

Purpose: add card illustration identity without breaking the in-game card generator.

Includes art-window images only for:

- Keeper's Tap;
- Field Brace;
- Read the Ash;
- Fox Bite;
- Tailguard;
- Kindle Mark;
- Fetch Signal.

These are not full generated cards. The game assembles full cards through `CardPresenter` and the card visual generator.

### Batch 4 — Required Hybrid VFX Kit

Purpose: replace code-only VFX fallbacks with image-backed VFX textures.

Includes:

- pet-command thread marker/rune;
- endpoint rune flash;
- impact burst;
- burn apply pop;
- burn tick;
- shield arc;
- status pop;
- intent changed / resolve pulses;
- defeat burst;
- card play flash;
- energy spend pulse.

### Final QA / Optimization Pass

Purpose: verify 4K readiness, readability, loader correctness, missing-asset safety, file size, texture filtering, and visual consistency after all batches.

This is not an image-generation batch, although it may require selective regeneration.

---

## 3. Why Batch 1 Comes First

Batch 1 should happen before characters and backgrounds because it validates the game language:

- pet-command card must read differently from normal cards;
- enemy Intent must remain readable under v0.5 plan readout rules;
- statuses and tags must be understandable at small sizes;
- Player HUD, energy, piles, and End Turn must look like functional UI, not concept art;
- the in-game card visual generator must prove it can compose cards from modular parts.

If Batch 1 fails, character art and backgrounds will not fix the game. If Batch 1 succeeds, the rest of the art pipeline becomes safer.

---

## 4. Global Asset Policy

Batch work must obey the combat asset manifest:

- one high-resolution runtime asset per asset key;
- no `_1x`, `_2x`, `_3x` runtime variants;
- UI/card/icon assets are authored around 4x logical display size;
- backgrounds later use 3840x2160 or max 4096x2304 per layer;
- text and numbers remain code-rendered;
- missing assets must not block combat interaction;
- generated UI mockups are not runtime assets;
- runtime assets are modular pieces assembled by Phaser presenters.

---

## 5. Global Visual Style

All batches should share this visual language:

```txt
Ember Journal — Ashbound Companions
clean and smooth strokes
polished console fantasy adventure feel
readable tactical RPG silhouettes
warm ember light against cool ash shadows
field-journal UI skin
parchment, ink, fox-paw runes, shrine marks, ember accents
restrained decoration
high readability at small game UI sizes
original fantasy world, not a clone of any existing franchise
```

Avoid:

```txt
readable text baked into images
fake glyph paragraphs
logos
watermarks
signatures
photorealism
sci-fi UI
mobile gacha style
cluttered ornate frames
uncroppable sheets
full combat screenshots used as runtime UI
full generated cards with text
pet HP language
enemy cards on the battlefield
```

---

## 6. Batch 1 Acceptance Summary

Batch 1 is accepted when:

- all Batch 1 runtime files exist under `public/assets/combat/...`;
- the Phaser loader or asset registry maps every Batch 1 file to the correct `CombatAssetKeys` key;
- `CardPresenter` visibly uses card frames, rarity/source/family badges, and tag icons from the generated assets;
- `MonsterPresenter` / intent rendering can use intent icons and markers;
- player HUD, energy, piles, End Turn, tooltip/detail panels, and rings have skinned assets or safe fallbacks;
- no gameplay text or numbers are baked into image files;
- no card is generated as a full static card image;
- fallback behavior remains intact when an asset is missing;
- the validation commands pass.

---

## 7. Handoff Files for Batch 1

Use these files for Batch 1:

```txt
docs/contracts/combat-asset-batch-01-ui-readability-contract-v0.1.md
docs/prompts/combat-asset-batch-01-ui-readability-prompts-v0.1.md
docs/contracts/combat-asset-ingestion-runbook-v0.1.md
docs/contracts/combat-asset-batch-01-codex-task-v0.1.md
```

