# Image Generation Workflow Experiment - Batch 01

Status: active workflow experiment  
Scope: Combat Asset Batch 01, starting with the first twelve assets  
Purpose: replace deterministic placeholder generation with prompt-driven image-generation assets while preserving exact runtime dimensions, transparent PNG output, no baked text, and Phaser-safe ingestion.

## Working Position

The Batch 01 prompt pack is directionally usable and should be refined through live generation rather than avoided. Image generation can produce richer UI assets than code-drawn placeholders, but the workflow must absorb the practical cleanup steps: chroma-key transparency, crop, exact resize, naming, alpha validation, visual inspection, and runtime smoke.

## Source Preservation Rule

Approved image-generated assets must keep their full-size source files for future use. The runtime-sized PNG is a derivative, not the only retained asset.

For every approved frame, preserve at minimum:

- raw full-size image-generator output;
- full-size alpha-cleaned PNG;
- exact runtime candidate PNG;
- layout overlay or composed proof used for approval.

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

## Branch B Locked Layout Metrics

Branch B is now the accepted working direction for the next image-generation pass. The current source of truth is:

```txt
docs/evidence/p4-25-combat-asset-batch-01/layout-editor-saves/latest-layout.json
```

Current `384 x 536` top-left layout metrics:

```txt
costSocket: x 40, y 17, w 76, h 76
artWindow: x 46, y 29, w 287, h 265
rarityGemSocket: x 162, y 262, w 60, h 60
titleBand: x 63, y 303, w 252, h 28
rulesTextBox: x 60, y 344, w 261, h 132
tag1: x 117, y 480, w 41, h 41
tag2: x 170, y 480, w 41, h 41
tag3: x 222, y 480, w 41, h 41
```

Important measurement notes:

- `rarityGemSocket` is horizontally centred: `(384 - 60) / 2 = 162`.
- The rarity gem is a separate image-generated overlay, not baked into the card frame.
- The gem sits between the art window and title band, so later card-frame prompts should leave a clean centred socket in this area.
- The art window no longer uses the earlier short landscape crop. It is now `287 x 265`, an aspect ratio of approximately `1.083:1`.
- Future card art-window prompts and crops must target this near-square landscape ratio, not the earlier wide banner ratio.
- `tag1`, `tag2`, and `tag3` are independent slots. Do not regenerate a single baked tag row that forces equal spacing.

### Rarity Gem Mock

The first rarity placement mock used an image-generated rare gem:

```txt
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/rarity_gem_mock/combat_card_rarity_rare_raw_chroma_attempt_01.png
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/rarity_gem_mock/combat_card_rarity_rare_alpha_mock_01.png
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/rarity_gem_mock/combat_card_rarity_rare_alpha_mock_01_192.png
```

Validation result:

```txt
raw generation path: built-in image generator
transparency workflow: chroma-key removal
alpha range: 0..255
corner alpha: 0
runtime mock size: 192 x 192
no text, no numbers, no labels
```

Visual evidence:

```txt
docs/evidence/p4-25-combat-asset-batch-01/rarity-gem-layout-editor-mock.png
docs/evidence/p4-25-combat-asset-batch-01/rarity-gem-layout-editor-mock-no-wires.png
```

## Experiment 02 - Pet Command Card Frame

Target runtime file:

```txt
public/assets/combat/cards/frames/combat_card_frame_pet_command.png
```

Approved working candidate:

```txt
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/pet_command_frame_attempt_04/combat_card_frame_pet_command_candidate_04.png
```

Raw and alpha files:

```txt
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/pet_command_frame_attempt_04/combat_card_frame_pet_command_raw_chroma_attempt_04.png
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/pet_command_frame_attempt_04/combat_card_frame_pet_command_alpha_full_attempt_04.png
```

Validation result:

```txt
raw generation path: built-in image generator
transparency workflow: chroma-key removal
runtime candidate size: 384 x 536
alpha range: 0..255
corner alpha: 0, 0, 0, 0
no text, no numbers, no labels
```

Visual evidence:

```txt
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/pet_command_frame_attempt_04/combat_card_frame_pet_command_candidate_04_layout_overlay.png
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/pet_command_frame_attempt_04/combat_card_frame_pet_command_candidate_04_composed_proof.png
docs/evidence/p4-25-combat-asset-batch-01/pet-command-layout-editor-latest-json-confirmation.png
```

Rejected attempts:

```txt
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/rejected/pet_command_frame_attempt_01/
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/rejected/pet_command_frame_attempt_02/
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/rejected/pet_command_frame_attempt_03/
```

Lessons:

- Do not mention a gem, rarity socket, centred socket, or similar "pink elephant" phrase in frame prompts.
- Explicitly forbid central ornaments between the art window and title band.
- Pet-command visual language must be universal to all pets, not fox-specific.
- Colour tone must differ from the normal card frame; attempt 04 uses a cooler teal/copper command palette.
- Pet-command layout is allowed to differ from normal layout and must be confirmed in its own editor.

Current pet-command layout source of truth:

```txt
docs/evidence/p4-25-combat-asset-batch-01/layout-editor-saves/latest-pet-command-layout.json
```

Current `384 x 536` pet-command metrics:

```txt
costSocket: x 42, y 23, w 76, h 76
artWindow: x 53, y 37, w 272, h 258
rarityGemSocket: x 162, y 262, w 60, h 60
titleBand: x 63, y 303, w 252, h 28
rulesTextBox: x 64, y 345, w 255, h 127
tag1: x 110, y 477, w 41, h 41
tag2: x 169, y 477, w 41, h 41
tag3: x 226, y 477, w 41, h 41
```

## Experiment 03 - Pet Support Card Frame

Target runtime file:

```txt
public/assets/combat/cards/frames/combat_card_frame_pet_support.png
```

Current discussion candidate:

```txt
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/pet_support_frame_attempt_03/combat_card_frame_pet_support_candidate_03.png
```

Raw and alpha files:

```txt
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/pet_support_frame_attempt_03/combat_card_frame_pet_support_raw_chroma_attempt_03.png
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/pet_support_frame_attempt_03/combat_card_frame_pet_support_alpha_full_attempt_03.png
```

Validation result:

```txt
raw generation path: built-in image generator
transparency workflow: chroma-key removal
runtime candidate size: 384 x 536
top-left cost socket: open alpha cutout
no text, no numbers, no labels
```

Visual evidence:

```txt
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/pet_support_frame_attempt_03/combat_card_frame_pet_support_candidate_03_layout_overlay.png
docs/evidence/p4-25-combat-asset-batch-01/pet-support-layout-editor-attempt-03.png
```

Current pet-support layout source of truth:

```txt
docs/evidence/p4-25-combat-asset-batch-01/layout-editor-saves/latest-pet-support-layout.json
```

Lessons:

- Attempt 02 established the accepted pet-support colour direction: pale jade, sage, ivory parchment, and soft aged gold.
- Attempt 02 was not sufficient because the top-left cost socket was filled parchment instead of negative alpha.
- Attempt 03 corrects the cost socket as an open alpha cutout while keeping the accepted visual direction.
- The bottom tag row must remain three small independent sockets, not a tall decorative footer or three large plaques.

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

Current status:

```txt
1. normal frame: accepted workflow anchor
2. pet-command frame: accepted candidate and card-specific layout saved
3. pet-support frame: accepted candidate and card-specific layout saved
4. keeper-signal frame: candidate and card-specific layout saved
5. future-power frame: accepted candidate and card-specific layout saved
6. temporary frame: accepted candidate and card-specific layout saved
7. hover overlay: attempt 01 preferred for future animated VFX direction; card-specific layout saved
8. selected overlay: candidate and card-specific layout saved
9. unplayable overlay: no image asset; engine grey/desaturate/dim state only
10. art-window placeholder: candidate and composed proof generated
11. starter rarity token: candidate and composed proof generated
12. common rarity token: candidate and composed proof generated
```

## Experiment 04 - Keeper Signal Card Frame

Target runtime file:

```txt
public/assets/combat/cards/frames/combat_card_frame_keeper_signal.png
```

Current candidate:

```txt
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/keeper_signal_frame_attempt_01/combat_card_frame_keeper_signal_candidate_01.png
```

Raw and alpha files:

```txt
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/keeper_signal_frame_attempt_01/combat_card_frame_keeper_signal_raw_chroma_attempt_01.png
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/keeper_signal_frame_attempt_01/combat_card_frame_keeper_signal_alpha_full_attempt_01.png
```

Visual evidence:

```txt
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/keeper_signal_frame_attempt_01/combat_card_frame_keeper_signal_candidate_01_layout_overlay.png
docs/evidence/p4-25-combat-asset-batch-01/layout-editor-saves/latest-keeper-signal-layout.json
```

Notes:

- The candidate uses smoky indigo, charcoal ink, pale silver, and restrained ember signal accents.
- The cost socket is an alpha cutout.
- Card-specific layout metrics are required; do not assume the normal-frame metrics fit.

## Experiment 05 - Future Power Card Frame

Target runtime file:

```txt
public/assets/combat/cards/frames/combat_card_frame_future_power.png
```

Accepted candidate:

```txt
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/future_power_frame_attempt_02/combat_card_frame_future_power_candidate_02.png
```

Raw and alpha files:

```txt
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/future_power_frame_attempt_02/combat_card_frame_future_power_raw_chroma_attempt_02.png
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/future_power_frame_attempt_02/combat_card_frame_future_power_alpha_full_attempt_02.png
```

Visual evidence:

```txt
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/future_power_frame_attempt_02/combat_card_frame_future_power_candidate_02_layout_overlay.png
docs/evidence/p4-25-combat-asset-batch-01/layout-editor-saves/latest-future-power-layout.json
```

Notes:

- Attempt 02 replaced the too-normal colour direction with obsidian, silver, violet-blue, and cool grey-lavender.
- The art window and cost socket are alpha cutouts.
- The frame keeps three independent tag sockets rather than a single footer row.

## Experiment 06 - Temporary Card Frame

Target runtime file:

```txt
public/assets/combat/cards/frames/combat_card_frame_temporary.png
```

Accepted candidate:

```txt
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/temporary_frame_attempt_02/combat_card_frame_temporary_candidate_02.png
```

Raw and alpha files:

```txt
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/temporary_frame_attempt_02/combat_card_frame_temporary_raw_chroma_attempt_02.png
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/temporary_frame_attempt_02/combat_card_frame_temporary_alpha_full_attempt_02.png
```

Visual evidence:

```txt
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/temporary_frame_attempt_02/combat_card_frame_temporary_candidate_02_layout_overlay.png
docs/evidence/p4-25-combat-asset-batch-01/layout-editor-saves/latest-temporary-layout.json
```

Notes:

- Attempt 02 uses pale ash, smoky cool grey, worn silver, soft charcoal, and contained ember flecks.
- The fading treatment stays inside the card silhouette.
- Card-specific layout metrics are saved for later engine mapping.

## Experiment 07 - Hover Overlay

Target runtime file:

```txt
public/assets/combat/cards/overlays/combat_card_frame_hover_overlay.png
```

Preferred candidate for VFX direction:

```txt
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/hover_overlay_attempt_01/combat_card_frame_hover_overlay_candidate_01.png
```

Visual evidence:

```txt
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/hover_overlay_attempt_01/combat_card_frame_hover_overlay_candidate_01_normal_proof.png
docs/evidence/p4-25-combat-asset-batch-01/layout-editor-saves/latest-hover-overlay-layout.json
```

Notes:

- Attempt 01 is the preferred visual direction because it has enough strength for later outer-glow animation.
- Overlay placement must be card-specific. One global overlay transform does not fit every frame.
- Attempt 02 remains preserved as a subtler alternative.

## Experiment 08 - Selected Overlay

Target runtime file:

```txt
public/assets/combat/cards/overlays/combat_card_frame_selected_overlay.png
```

Current candidate:

```txt
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/selected_overlay_attempt_01/combat_card_frame_selected_overlay_candidate_01.png
```

Visual evidence:

```txt
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/selected_overlay_attempt_01/combat_card_frame_selected_overlay_candidate_01_normal_proof.png
docs/evidence/p4-25-combat-asset-batch-01/layout-editor-saves/latest-selected-overlay-layout.json
```

Notes:

- The selected overlay should read stronger than hover.
- Placement must also be card-specific.
- Future Phaser implementation should allow per-card overlay settings instead of a single global transform.

## Experiment 09 - Unplayable State

Target runtime file from the original list:

```txt
public/assets/combat/cards/overlays/combat_card_frame_unplayable_overlay.png
```

Decision:

```txt
No image-generated runtime asset for Batch 01.
```

Preserved abandoned source:

```txt
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/unplayable_overlay_attempt_01/
```

Notes:

- The approved approach is engine-owned greying, dimming, or desaturation of the whole card.
- A separate image overlay creates avoidable alignment risk across different frame silhouettes.
- The generated attempt is preserved only as rejected workflow evidence and must not be promoted to `public/assets`.

## Experiment 10 - Art Window Placeholder

Target runtime file:

```txt
public/assets/combat/cards/placeholders/combat_card_art_window_placeholder.png
```

Current candidate:

```txt
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/art_window_placeholder_attempt_01/combat_card_art_window_placeholder_candidate_01_287x265.png
```

Raw source and visual proof:

```txt
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/art_window_placeholder_attempt_01/combat_card_art_window_placeholder_raw_attempt_01.png
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/art_window_placeholder_attempt_01/combat_card_art_window_placeholder_candidate_01_287x265_normal_proof.png
```

Validation result:

```txt
runtime candidate size: 287 x 265
no text, no numbers, no labels
proof uses the current normal-frame art window
```

Notes:

- The placeholder is a quiet parchment and ash wash.
- This is intentionally content-light so future card art can replace it without changing frame layout.
- The current card art window is near-square landscape and this derivative preserves that exact layout-editor size.

## Experiment 11 - Starter Rarity Token

Target runtime file:

```txt
public/assets/combat/cards/rarity/combat_card_rarity_starter.png
```

Current candidate:

```txt
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/rarity_starter_attempt_01/combat_card_rarity_starter_candidate_01_192.png
```

Raw, alpha, and visual proof:

```txt
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/rarity_starter_attempt_01/combat_card_rarity_starter_raw_chroma_attempt_01.png
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/rarity_starter_attempt_01/combat_card_rarity_starter_alpha_full_attempt_01.png
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/rarity_starter_attempt_01/combat_card_rarity_starter_candidate_01_normal_proof.png
```

Validation result:

```txt
runtime candidate size: 192 x 192
corner alpha: 0, 0, 0, 0
no text, no numbers, no labels
```

Notes:

- Starter rarity uses a modest wood-and-bronze training-token treatment.
- It is a separate overlay and must not be baked into card frames.

## Experiment 12 - Common Rarity Token

Target runtime file:

```txt
public/assets/combat/cards/rarity/combat_card_rarity_common.png
```

Current candidate:

```txt
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/rarity_common_attempt_01/combat_card_rarity_common_candidate_01_192.png
```

Raw, alpha, and visual proof:

```txt
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/rarity_common_attempt_01/combat_card_rarity_common_raw_chroma_attempt_01.png
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/rarity_common_attempt_01/combat_card_rarity_common_alpha_full_attempt_01.png
art_source/generated/combat/batch_01_ui_readability/imagegen_experiments/rarity_common_attempt_01/combat_card_rarity_common_candidate_01_normal_proof.png
```

Validation result:

```txt
runtime candidate size: 192 x 192
corner alpha: 0, 0, 0, 0
no text, no numbers, no labels
```

Notes:

- Common rarity uses a bronze shield-like token with an amber centre.
- There is intentionally no gem for common in the frame itself; rarity is declared by this separate overlay.
