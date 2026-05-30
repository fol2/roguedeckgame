# Image Generation Workflow Experiment - Batch 01

Status: active workflow experiment  
Scope: Combat Asset Batch 01, starting with the first twelve assets  
Purpose: replace deterministic placeholder generation with prompt-driven image-generation assets while preserving exact runtime dimensions, transparent PNG output, no baked text, and Phaser-safe ingestion.

## Working Position

The Batch 01 prompt pack is directionally usable and should be refined through live generation rather than avoided. Image generation can produce richer UI assets than code-drawn placeholders, but the workflow must absorb the practical cleanup steps: chroma-key transparency, crop, exact resize, naming, alpha validation, visual inspection, and runtime smoke.

## Experiment 01 - Normal Card Frame

Target runtime file:

```txt
public/assets/combat/cards/frames/combat_card_frame_normal.png
```

Required runtime size:

```txt
384 x 536
```

Raw image-generation output:

```txt
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/raw/combat_card_frame_normal_raw_01.png
```

Alpha working file:

```txt
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/working/combat_card_frame_normal_alpha_01b.png
```

Runtime candidate:

```txt
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/runtime_candidates/combat_card_frame_normal_candidate_01b.png
```

Refined runtime candidate:

```txt
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/runtime_candidates/combat_card_frame_normal_candidate_02.png
```

### Prompt Used

```txt
Use case: stylized-concept
Asset type: isolated game UI asset for a browser-first roguelite deckbuilder
Primary request: Create one blank 5:7 fantasy deckbuilder card frame UI asset for the runtime file combat_card_frame_normal.png.
Canvas and background: create the subject on a perfectly flat solid #00ff00 chroma-key background for later background removal. The background must be one uniform colour with no shadows, gradients, texture, floor plane, or lighting variation. Do not use #00ff00 anywhere in the subject.
Subject: a single normal player card frame, parchment and ink, restrained field-journal fantasy border, subtle brass and leather edge details, warm ember accents against cool ash shadows. The card frame must be isolated, centred, upright, and fill most of the image while leaving clean padding around the outer edge.
Required empty layout zones: empty cost socket at top-left, empty art window in the upper-middle, empty title band, empty rules text area, and empty tag icon row. These zones must be visibly open negative space for later engine-rendered text and icons.
Style/medium: polished console fantasy adventure UI, Ember Journal - Ashbound Companions visual language, clean smooth strokes, readable tactical RPG interface, original fantasy world.
Output intent: transparent PNG candidate after chroma-key removal, final crop will be resized to exactly 384 x 536 pixels.
Constraints: no text, no numbers, no labels, no fake glyphs, no letters, no logo, no watermark, no signature, no complete card with title or rules text, no baked gameplay values, no character art, no full combat screenshot, no ornate clutter, no tiny unreadable detail. Keep the centre areas deliberately quiet and readable.
```

### Observed Result

- The image generator produced a raw raster image, not an SVG.
- Raw output size was `1061 x 1483`, so the built-in workflow should not rely on prompt-only exact dimensions.
- Chroma-key removal produced an alpha PNG with transparent corners.
- Crop and resize produced an exact `384 x 536` runtime candidate.
- The generated frame followed the no text, no numbers, no labels constraint.
- Negative space was present and usable for engine-rendered text.
- The card frame was visually richer than the deterministic placeholder.

### Issues Found

- The frame is more ornate than the current first-playable readability target.
- The cost socket is large and visually dominant.
- The raw subject is close to the chroma-key edge, which increases matte cleanup risk.
- The prompt needs stronger wording for simple borders, wide padding, and no edge contact.

### Workflow Changes For Next Generation

Add these constraints to the next prompt:

```txt
Keep the border simple and production-readable rather than ornate.
The cost socket must be small and quiet, not a large emblem.
Leave at least 10 percent flat chroma-key padding around the entire card; no part of the card may touch the image edge.
Avoid protruding ornaments outside the main 5:7 silhouette.
Use clean empty rectangular zones for art, title, rules, and tag row.
```

## Candidate QA Gates

Each image-generated runtime candidate must pass:

- Raw output is archived under `art_source/generated/.../raw/`.
- Prompt is recorded before cleanup.
- Chroma-key or native alpha working file is archived under `art_source/generated/.../working/`.
- Runtime candidate has exact contract dimensions.
- Runtime candidate is RGBA PNG.
- All four corners are transparent.
- No readable text, numbers, labels, watermark, or fake glyphs are visible.
- Main subject has enough negative space for engine-rendered text.
- Asset is visually distinct from nearby variants where the contract requires distinction.
- Asset renders in the browser gallery from `vite preview`.

## Experiment 01 Refinement Result

The second prompt added stricter padding, simpler border, smaller socket, and no edge-contact wording. It produced a better cleanup profile:

- Raw output size: `1060 x 1484`
- Subject box after chroma-key removal: `(89, 94, 970, 1406)`
- Exact runtime candidate size: `384 x 536`
- Corner alpha: `[0, 0, 0, 0]`
- Non-transparent edge pixels: `0`
- Visual judgement: still somewhat ornate, but usable as a richer image-generated candidate and much better than the deterministic placeholder.

The updated prompt language should be carried into the next five card frame variants before creating the icon sheet prompts.

## Measurement Gate

The card frame prompt cannot be treated as purely aesthetic. It must align with the engine-owned card layout in `src/game-phaser/layout/hand-layout.ts`.

Current engine display size:

```txt
192 x 268
```

Batch 01 frame runtime size:

```txt
384 x 536
```

Measurement overlay for the second candidate:

```txt
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/working/combat_card_frame_normal_candidate_02_measurement_overlay.png
```

Engine-owned zones mapped to the `384 x 536` runtime asset:

```txt
rarityGemSocket: 22,18 to 66,62
costSocket: 292,14 to 364,86
titleBand: 18,12 to 366,88
familyBadge: 66,96 to 222,136
sourceBadge: 242,96 to 358,136
artWindow: 32,140 to 352,324
rulesTextBox: 32,342 to 352,482
tagRow: 32,464 to 352,512
```

Finding:

- The prompt pack currently says the card frame should have an empty cost socket at top-left.
- The engine currently renders the cost socket at top-right.
- This must be resolved before generating the rest of the card frames.

Decision for the next generation pass unless the engine layout is deliberately changed:

- Treat the engine layout as authoritative.
- Update image-generation prompts to use a top-right cost socket.
- Make generated frames mostly decorative backplates.
- Keep title, art, rules, and tag areas as quiet negative space rather than precise baked panels that fight engine-rendered rectangles.
- Use the measurement overlay as a required acceptance artefact for every card frame variant.

## Layout Branches For User Selection

Two viable branches are now being compared before the rest of the first dozen assets are generated.

### Branch A - V3 Generated Against Current Engine Overlay

Files:

```txt
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/runtime_candidates/combat_card_frame_normal_candidate_03.png
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/working/combat_card_frame_normal_candidate_03_engine_overlay.png
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/working/combat_card_frame_normal_candidate_03_composed_preview.png
```

Properties:

- Keeps the current top-right cost socket direction.
- Keeps title near the top.
- Better aligns with the existing `CARD_FRAME_ZONES`.
- Needs prompt refinements to remove or reduce bottom baked icon ornaments if they compete with engine-rendered tag chips.

Validation:

```txt
candidateSize: 384 x 536
nonTransparentEdgePixels: 0
```

### Branch B - V2 Style Anchor With Reverse Overlay

Files:

```txt
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/runtime_candidates/combat_card_frame_normal_candidate_02.png
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/working/combat_card_frame_normal_candidate_02_reverse_overlay_adjusted.png
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/working/combat_card_frame_normal_candidate_02_reverse_composed_preview_adjusted.png
```

Properties:

- Uses the stronger V2 visual anchor.
- Moves cost to top-left and title to the middle banner.
- Requires updating engine `CARD_FRAME_ZONES` if selected.
- Better follows the visual affordances of the generated frame, but it is a bigger UI contract change.

Proposed reverse-overlay zones on a `384 x 536` frame:

```txt
costSocket: 28,20 to 104,96
artWindow: 42,98 to 342,242
titleBand: 42,254 to 342,292
rulesTextBox: 42,316 to 342,454
tagRow: 84,462 to 300,518
rarityGemSocket: 124,470 to 164,510
familyBadge: 172,470 to 212,510
sourceBadge: 220,470 to 260,510
```

Selection rule:

- If Branch A is selected, continue refining prompts around the existing engine layout.
- If Branch B is selected, first update the card layout constants and tests, then generate the rest of the card-frame family against the reverse-overlay contract.

## First Twelve Asset Order

```txt
1. combat_card_frame_normal.png
2. combat_card_frame_pet_command.png
3. combat_card_frame_pet_support.png
4. combat_card_frame_keeper_signal.png
5. combat_card_frame_future_power.png
6. combat_card_frame_temporary.png
7. combat_card_frame_hover_overlay.png
8. combat_card_frame_selected_overlay.png
9. combat_card_frame_unplayable_overlay.png
10. combat_card_art_window_placeholder.png
11. combat_card_rarity_starter.png
12. combat_card_rarity_common.png
```
