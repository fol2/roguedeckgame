# Combat Asset Batch 01 Prompts v0.1 — Card/UI Readability Kit

Status: Draft prompts for image-generation execution  
Scope: Combat-only Batch 1 assets  
Use with: `combat-asset-batch-01-ui-readability-contract-v0.1.md`

These prompts are written for a Codex/image-generation workflow. Generate modular game assets, not screenshots. Clean/crop/export the generated results into the runtime files listed in the Batch 1 contract.

---

## 1. Global Style Prompt Add-On

Append this to most generation prompts:

```txt
Ember Journal — Ashbound Companions visual style, clean and smooth strokes, polished console fantasy adventure UI, readable tactical RPG interface, warm ember accents against cool ash shadows, field-journal fantasy materials, parchment, ink, fox-paw runes, old shrine marks, burnt paper edges, subtle brass and leather, restrained decoration, high readability at small game UI sizes, original fantasy world, not a clone of any existing franchise, transparent PNG asset, no text, no numbers, no logo, no watermark, no signature
```

---

## 2. Global Negative Prompt

Use this negative prompt for every image:

```txt
no readable text, no fake glyphs, no letters, no numbers, no logo, no watermark, no signature, no full combat screenshot, no complete card with title or rules text, no HP values, no cost numbers, no baked labels, no sci-fi UI, no photorealism, no mobile gacha style, no cluttered ornate details, no tiny unreadable details, no franchise-specific symbols, no existing game clone, no pet HP hearts, no enemy card frame, no modern flat app UI, no messy sketch lines
```

---

## 3. Generation Strategy

Prefer individual transparent PNG generation for large structured assets:

- card frames;
- HUD panels;
- detail panels;
- energy orb;
- draw/discard piles;
- End Turn button;
- pet/enemy rings.

Use cohesive icon sheets only for small icons/badges, then crop each icon manually:

- rarity gems;
- source badges;
- family badges;
- intent icons;
- status icons;
- tag icons;
- intent markers.

If a sheet is used:

- arrange icons in a clean grid;
- no labels in the image;
- leave wide spacing between icons;
- crop each icon into its runtime PNG;
- do not use the sheet directly at runtime.

---

## 4. Prompt 01 — Card Frame Family Sheet

Use this prompt if generating card frames as one cohesive sheet. If the output is inconsistent, regenerate each frame individually using the variant prompts below.

```txt
Create a cohesive UI asset sheet of six blank 5:7 fantasy deckbuilder card frames for a pet-centered roguelite deckbuilder. The frames are modular game UI assets, not complete cards. Show six separate blank card frames in a clean grid with wide spacing and transparent background. Each frame must have an empty cost socket at top-left, empty art window, empty title band, empty rules text area, and empty tag icon row. No text, no numbers, no symbols that look like letters.

Frame 1: normal player card, parchment and ink, restrained border.
Frame 2: pet-command card, fox-paw rune border, warm ember command accents, clearly distinct from normal.
Frame 3: pet-support card, pet charm and link-rune motif, supportive not aggressive.
Frame 4: Keeper signal card, field-journal / scout / ash-reading motif, quiet tactical feel.
Frame 5: future power card, ongoing ember seal, more mystical but not overdecorated.
Frame 6: temporary card, fading ash edge, fragile temporary feel.

Ember Journal — Ashbound Companions visual style, clean and smooth strokes, polished console fantasy adventure UI, readable tactical RPG interface, warm ember accents against cool ash shadows, field-journal fantasy materials, parchment, ink, fox-paw runes, old shrine marks, burnt paper edges, subtle brass and leather, restrained decoration, high readability at small game UI sizes, original fantasy world, transparent PNG asset, no text, no numbers, no logo, no watermark, no signature
```

Negative prompt: use the Global Negative Prompt.

### Individual Card Frame Variant Template

Use this if the sheet fails:

```txt
Create one blank 5:7 fantasy deckbuilder card frame UI asset: {FRAME_DESCRIPTION}. The card frame must be transparent PNG, isolated, centered, high resolution, with empty cost socket at top-left, empty art window, empty title band, empty rules text area, and empty tag icon row. No title, no rules, no numbers, no labels, no fake text. The frame should be readable at small hand-card size and should leave strong negative space for code-rendered text. Ember Journal — Ashbound Companions visual style, parchment, ink, clean smooth strokes, polished console fantasy adventure UI, restrained decoration.
```

Frame descriptions:

```txt
normal player card frame, parchment and ink, restrained border, neutral field-journal motif
pet-command card frame, fox-paw rune border, warm ember command accents, pet communication identity
pet-support card frame, pet charm and link-rune motif, support and bond identity
Keeper signal card frame, ash-reading, scout mark, command bracer motif, information card identity
future power card frame, ongoing ember seal, mystical but clean
temporary card frame, fading ash edge, fragile temporary card identity
```

---

## 5. Prompt 02 — Card Overlays and Art Placeholder

```txt
Create a transparent UI asset sheet for deckbuilder card overlays and art placeholder. Four separate 5:7 overlay/card-window assets in a clean grid with wide spacing and transparent background. No text, no numbers.

Asset 1: hover overlay, subtle warm glow around card border, transparent center.
Asset 2: selected overlay, stronger readable outline, transparent center.
Asset 3: unplayable overlay, muted smoky dim overlay, transparent enough that card remains visible.
Asset 4: blank art-window placeholder, field-journal parchment mini illustration placeholder, no text, no title, no symbols that look like letters.

Clean smooth strokes, polished fantasy UI, ember and parchment style, reusable game UI overlay assets, no text, transparent PNG.
```

Negative prompt: use the Global Negative Prompt.

---

## 6. Prompt 03 — Rarity Gems Sheet

```txt
Create a cohesive transparent PNG icon sheet of six small card rarity gem assets for a fantasy deckbuilder UI. Arrange six gems in a clean grid with wide spacing, no labels, no text. Each gem should be distinguishable by shape as well as color and readable at small size.

Order left to right, top to bottom:
1 starter: simple stamped mark, humble training token
2 common: plain bronze or wood charm
3 uncommon: brighter teal-green polished charm
4 rare: warm gold ember gem
5 special: shrine or memory seal
6 unique: distinct sealed story charm

Field-journal fantasy materials, parchment-compatible, subtle brass, warm ember accents, clean smooth strokes, readable silhouettes, original UI icon assets, transparent background.
```

Negative prompt: use the Global Negative Prompt.

---

## 7. Prompt 04 — Card Source Badges Sheet

```txt
Create a cohesive transparent PNG icon sheet of eight card source badges for a fantasy deckbuilder UI. Arrange eight badges in a clean grid with wide spacing, no labels, no text, no letters. Each badge should be modular, small, and readable.

Order left to right, top to bottom:
1 universalPlayer: neutral field-journal mark
2 classBound: Ashbound Keeper command bracer / field signal mark
3 petBound: generic companion command charm, not species-specific, no fox or paw mark
4 petSupport: pet charm / link rune
5 encounterReward: rare-holder / scribe seal
6 eventOnly: story or journal event seal
7 temporary: fading ash mark
8 legacy: subdued debug/migration mark

Parchment, ink, brass charm, ember accent, clean smooth strokes, readable tactical RPG UI, transparent background.
```

Negative prompt: use the Global Negative Prompt.

---

## 8. Prompt 05 — Card Family Badges Sheet

```txt
Create a cohesive transparent PNG icon sheet of seven card family/type badges for a fantasy deckbuilder UI. Arrange seven badges in a clean grid with wide spacing, no labels, no text, no letters. Each badge must read by shape at small UI size.

Order left to right, top to bottom:
1 Keeper Attack: direct Keeper strike / small blade-staff impact motif
2 Keeper Skill: shield / fieldcraft utility motif
3 Keeper Signal: scout signal / ash-reading eye-rune motif
4 Pet-Command: generic companion command signal, not species-specific, no fox or paw mark
5 Pet Support: pet support/link charm motif
6 Power/Ongoing: ongoing ember seal motif
7 Temporary: fading ash/time mark motif

Clean smooth strokes, polished console fantasy UI, field journal style, restrained decoration, transparent background.
```

Negative prompt: use the Global Negative Prompt.

---

## 9. Prompt 06 — Intent / Plan Readout Icons Sheet

```txt
Create a cohesive transparent PNG icon sheet of eight enemy Intent / plan-readout icons for a tactical roguelite deckbuilder. These icons appear above enemy sprites and represent visibility-limited enemy plan categories. Arrange eight icons in a clean grid with wide spacing. No labels, no text, no numbers.

Order left to right, top to bottom:
1 unknown: clear question/unknown shape without using a literal text question mark if possible, mysterious but readable
2 attack: sharp strike / claw / blade impact motif
3 defend: shield / guard motif
4 buff: strengthening aura or reinforced charm motif, no letters or glyph-like text
5 debuff: weakening cracked charm or curse mark motif, no letters or glyph-like text
6 special: unique star/shrine action motif
7 charging: gathering energy / wind-up motif
8 obscured: smoke/ash-covered hidden plan motif

Readable at small size, strong silhouettes, not player-card icons, field-journal fantasy style, ember and ash palette, transparent background.
```

Negative prompt: use the Global Negative Prompt.

---

## 10. Prompt 07 — Intent Token Frame and Markers Sheet

```txt
Create a transparent PNG UI asset sheet for enemy Intent / plan-readout token frame and eight small plan-state markers. Arrange assets with wide spacing, no labels, no text, no numbers.

Asset 1: intent token frame, rounded/circular field-journal token frame suitable for an icon plus code-rendered amount/summary.
Asset 2: scoped marker, reveals deeper plan information.
Asset 3: locked marker, plan is locked/committed.
Asset 4: adaptive marker, plan can change/adapt, using shifting plate geometry only; no arrows, chevrons, circular-arrow symbols, letters, or glyph-like text.
Asset 5: changed pulse marker, plan changed and should pulse.
Asset 6: multi-hit marker, multiple hits indicator without numbers.
Asset 7: rough low marker, low pressure, no tick marks, numbers, or letters.
Asset 8: rough medium marker, medium pressure, no tick marks, numbers, or letters.
Asset 9: rough high marker, high pressure, no tick marks, numbers, or letters.

Clean smooth strokes, readable tactical RPG UI, parchment/ink/ember style, transparent background, no text.
```

Negative prompt: use the Global Negative Prompt.

---

## 11. Prompt 08 — Status Icons Sheet

```txt
Create a cohesive transparent PNG icon sheet of thirteen combat status icons for a pet-centered tactical deckbuilder. Arrange icons in a clean grid with wide spacing, no labels, no text, no numbers. Each icon must be readable at small size and use shape plus color, not color alone.

Order left to right, top to bottom:
1 burn: ember flame / coal spark
2 block: shield / barrier
3 guard: protective tail/shield arc
4 empowered: charged ember burst
5 marked: target rune / mark sigil
6 ready: alert check / ready rune without text
7 commanded: paw-command flash
8 obscured: ash cloud hiding information
9 scoped: focused lens / scout rune
10 revealed: opened eye/clear ash rune
11 bound: binding loop/rune
12 overflow: stacked small icons container, no plus sign or number baked in
13 fallback: generic unknown status token

Field-journal fantasy UI, warm ember accents, cool ash shadows, clean smooth strokes, transparent background.
```

Negative prompt: use the Global Negative Prompt.

---

## 12. Prompt 09 — Card Tag Icons Sheet

```txt
Create a cohesive transparent PNG icon sheet of nineteen small card tag icons for a pet-centered fantasy deckbuilder. Arrange icons in a clean grid with wide spacing, no labels, no text, no letters, no numbers. Icons must be simple and readable in a small card tag row.

Order left to right, top to bottom:
1 petCommand: paw-command rune
2 fox: fox head / fox tail symbol, not a wolf
3 burn: small flame/coal
4 guard: shield/guard arc
5 block: block shield
6 draw: card draw / pulled card silhouette without text
7 mark: target mark rune
8 attack: strike/claw
9 setup: prepared rune/gear-like charm, not mechanical sci-fi
10 combo: linked runes
11 keeper: Keeper bracer / traveler mark
12 signal: hand signal / signal rune
13 scout: small eye/pathfinder mark
14 fetch: small fox-paw retrieving card-light
15 reveal: clearing ash / open eye
16 scope: lens / focused scout mark
17 obscure: ash cloud / hidden plan
18 rare: small rare-card bearer/scribe seal
19 fallback: generic tag token

Clean smooth strokes, field-journal fantasy UI, restrained decoration, transparent background.
```

Negative prompt: use the Global Negative Prompt.

---

## 13. Prompt 10 — HUD Controls and Player HUD Sheet

Prefer individual generation for large pieces. If generating as one sheet, crop carefully.

```txt
Create a transparent PNG UI asset sheet for a fantasy roguelite deckbuilder bottom HUD and controls. Assets are modular, not a full screen. Arrange with wide spacing, no text, no numbers, no labels.

Include these separate assets:
1 bottom HUD plate, long parchment/leather panel with subtle ember accents, no text
2 Player HUD frame, compact status frame for portrait, HP bar, block badge, status tray, no labels
3 player portrait frame, circular or rounded frame
4 player HP bar track, empty bar frame only
5 player HP fill mask, clean fill shape only, no value
6 player block badge, shield badge without number
7 player status tray, small tray frame
8 player hover frame, subtle highlight frame
9 energy orb, ember energy core, empty center for code number
10 draw pile, face-down card stack icon, no count
11 discard pile, face-up or tilted card stack icon, no count
12 End Turn button skin, readable button shape with blank center, no words
13 menu button skin, small square/round button frame, no glyph text if possible

Ember Journal field-journal fantasy UI, parchment, brass, leather, ember glow, clean smooth strokes, high readability, transparent background.
```

Negative prompt: use the Global Negative Prompt.

---

## 14. Prompt 11 — Tooltip, Detail, Pause, Overlay Panel Sheet

```txt
Create a transparent PNG UI asset sheet of reusable panel skins for a fantasy deckbuilder interface. These are modular panels, not a full screen. Arrange with wide spacing. No text, no labels, no numbers.

Include separate assets:
1 tooltip panel, small parchment field-note panel, readable blank interior
2 detail panel, larger modal panel for card/enemy/pet detail, blank interior, code text area clear
3 card detail sidebar, vertical parchment sidebar panel, blank interior
4 card detail keyword row, small row strip for keyword explanations, blank
5 card detail tag tray, small tray for tag icons, blank
6 detail close button, small close-button frame only, no X text if possible; code can draw icon
7 click blocker tint, subtle translucent dark vignette panel texture
8 pause panel, medium modal panel, blank interior
9 event log panel, debug-only muted panel, blank interior

Field-journal fantasy UI, parchment, ink, subtle brass corners, burnt paper edges, clean smooth strokes, restrained decoration, transparent PNG assets, no text.
```

Negative prompt: use the Global Negative Prompt.

---

## 15. Prompt 12 — Pet / Enemy Slot Rings and Trays Sheet

```txt
Create a transparent PNG UI asset sheet for pet and enemy combat slot indicators in a side-view tactical deckbuilder. Arrange assets with wide spacing. No text, no numbers, no labels.

Include separate assets:
1 active pet ring, warm ember circular base ring
2 pet command glow, orange command highlight ring/glow overlay
3 Ember Charge pip, tiny ember seed/coal spark, not a heart, not HP
4 pet status tray, small local tray near pet ring
5 inactive pet slot, faint empty rune circle, subtle, no lock icon
6 enemy target ring, readable ground oval/circle target ring
7 enemy HP bar track, empty bar frame only
8 enemy HP fill mask, simple fill shape only, no value
9 enemy block badge, small shield badge
10 enemy status tray, small local tray under HP

Clean smooth strokes, field-journal fantasy UI, ember accents, readable tactical RPG shapes, transparent background.
```

Negative prompt: use the Global Negative Prompt.

---

## 16. Individual Asset Prompt Fallback Template

Use this when any sheet fails or a single crop is not good enough:

```txt
Create one isolated transparent PNG game UI asset for a pet-centered roguelite deckbuilder: {ASSET_DESCRIPTION}. The asset must be centered, high resolution, cleanly cropped, and suitable for Phaser runtime use. No readable text, no numbers, no labels, no logo, no watermark, no signature. Ember Journal — Ashbound Companions style: clean smooth strokes, polished console fantasy adventure UI, field-journal fantasy materials, parchment, ink, warm ember accents, restrained decoration, high readability at small size.
```

Use the global negative prompt as well.

---

## 17. Batch 1 Regeneration Rules

Regenerate if:

- any text, fake text, letters, numbers, logo, watermark, or signature appears;
- a card frame includes baked title/rules/cost;
- an enemy/card/pet HP meaning is implied incorrectly;
- icons are unreadable at small size;
- pet-command visual language is not distinguishable;
- generated assets are fused together and cannot be cleanly cropped;
- background is not removable for transparent assets;
- the style looks sci-fi, photorealistic, or too mobile-gacha.
