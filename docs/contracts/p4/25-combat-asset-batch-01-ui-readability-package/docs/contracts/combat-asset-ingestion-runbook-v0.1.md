# Combat Asset Ingestion Runbook v0.1

Status: Draft for Codex execution  
Scope: How to apply image-generated combat assets into the Phaser game  
Initial target: Batch 1 Card/UI Readability Kit

This runbook tells Codex how to take generated image files and make them usable by the game without breaking the existing code-driven combat UI.

---

## 1. Ground Rules

1. Do not change `src/game-core` for asset ingestion.
2. Do not bake gameplay text or numbers into assets.
3. Do not remove code fallbacks.
4. Do not make combat depend on every image being present.
5. Do not replace CardPresenter with generated full-card screenshots.
6. Do not add pet HP UI.
7. Do not render enemy hands as battlefield cards.
8. Keep all asset keys aligned with `src/game-phaser/assets/combat-asset-keys.ts`.

---

## 2. Recommended Runtime Folders

Create these folders if missing:

```txt
public/assets/combat/cards/frames/
public/assets/combat/cards/rarity/
public/assets/combat/cards/source_badges/
public/assets/combat/cards/family_badges/
public/assets/combat/icons/intent/
public/assets/combat/icons/status/
public/assets/combat/icons/tags/
public/assets/combat/ui/hud/
public/assets/combat/ui/panels/
public/assets/combat/ui/slots/
public/assets/combat/vfx/general/
public/assets/combat/fallback/
```

Archive raw and intermediate generated files here:

```txt
art_source/generated/combat/batch_01_ui_readability/raw/
art_source/generated/combat/batch_01_ui_readability/working/
```

Do not load raw sheets directly in Phaser.

---

## 3. Cleaning and Export Rules

For every final runtime PNG:

- use transparent background where appropriate;
- crop tightly but leave enough padding for glow effects;
- no text, numbers, watermarks, signatures, logos, or labels;
- use snake_case file names exactly matching the Batch 1 contract;
- export as PNG;
- preserve alpha;
- preserve smooth edges;
- avoid excessive texture sizes for tiny icons;
- keep a visually consistent style across a family.

For generated icon sheets:

1. Save raw sheet under `art_source/generated/.../raw/`.
2. Crop each component into separate runtime PNG.
3. Resize to the target size if necessary.
4. Inspect at runtime scale and 4K scale.
5. Regenerate any unreadable or ambiguous icon.

---

## 4. Add a Combat Asset Registry / Loader

If no loader exists yet, create:

```txt
src/game-phaser/assets/combat-asset-registry.ts
src/game-phaser/assets/combat-asset-loader.ts
```

Suggested shape:

```ts
import type { Scene } from "phaser";
import { CombatAssetKeys, type CombatAssetKey } from "./combat-asset-keys";

export type CombatAssetDefinition = {
  readonly key: CombatAssetKey;
  readonly path: string;
  readonly batch: "batch-01-ui-readability" | "batch-02-combat-identity" | "batch-03-card-art" | "batch-04-vfx";
  readonly requiredForBatch: boolean;
};

export const COMBAT_ASSET_DEFINITIONS: readonly CombatAssetDefinition[] = [
  {
    key: CombatAssetKeys.cardFrames.normal,
    path: "assets/combat/cards/frames/combat_card_frame_normal.png",
    batch: "batch-01-ui-readability",
    requiredForBatch: true
  }
  // ...continue for every Batch 1 runtime file...
];

export const preloadCombatAssets = (scene: Scene): void => {
  for (const asset of COMBAT_ASSET_DEFINITIONS) {
    if (!scene.textures.exists(asset.key)) {
      scene.load.image(asset.key, asset.path);
    }
  }
};
```

Notes:

- Paths under `public/` are referenced from web root, so `public/assets/...` becomes `assets/...` at runtime.
- Use `CombatAssetKeys`; do not duplicate raw string literals throughout presenters.
- Batch 1 can load all generated assets eagerly in `CombatScene` for simplicity.
- Future optimization can split by scene or use atlases, but not in this batch.

---

## 5. Hook Loader into CombatScene

If `CombatSceneOrchestrator` does not already preload combat assets, add:

```ts
import { preloadCombatAssets } from "../assets/combat-asset-loader";

public preload(): void {
  preloadCombatAssets(this);
}
```

Keep `create()` as presentation setup. Loading belongs in `preload()`.

---

## 6. Preserve Fallback Behavior

Existing fallback utilities should remain active:

- if a texture exists, presenter uses it;
- if missing, presenter uses code-rendered placeholder/glyph;
- missing art should not crash combat;
- unknown icon keys should use fallback icons;
- unknown VFX assets should use code fallback behavior.

Do not remove `combat-fallback-assets.ts` behavior.

---

## 7. Presenter Integration Expectations

Batch 1 should make these visible where presenters already support texture resolution:

- CardPresenter uses card frames, overlays, rarity gems, source badges, family badges, art placeholder, tag icons.
- CombatHudPresenter uses energy orb, draw pile, discard pile, End Turn skin, Player HUD skins if implemented.
- MonsterPresenter uses intent icons/tokens, enemy target ring, enemy HP/status tray skins if implemented.
- PetPresenter uses pet ring, command glow, Ember Charge pip, inactive pet slot, pet status tray if implemented.
- CombatOverlayPresenter uses tooltip/detail/pause panel skins if implemented.
- TargetingPresenter uses ring/line assets or code fallback.

It is acceptable if some Batch 1 assets are loaded but not used immediately, as long as the loader and registry are correct and fallbacks remain safe.

---

## 8. Tests to Add or Update

Recommended tests:

1. Asset registry includes all Batch 1 keys.
2. No duplicate asset keys in the registry.
3. Asset registry paths use `assets/combat/...` not `public/assets/...`.
4. Card visual generator still maps starter cards to expected frames/source/rarity/family.
5. CardPresenter still renders with missing textures by fallback.
6. CombatScene preload calls the asset loader if testable.

Avoid brittle image-size tests unless the project adds an image metadata helper.

---

## 9. Validation Commands

Run:

```bash
npm run typecheck
npm run test:phaser -- --reporter=dot
npm run build
```

Recommended full check:

```bash
npm run test:core -- --reporter=dot
npm run test:cli -- --reporter=dot
npm run test:scripts -- --reporter=dot
```

---

## 10. Manual Visual QA

Open the combat preview after assets are loaded:

```bash
npm run dev
```

Then open the browser route used by the project for combat preview, for example:

```txt
http://localhost:5173/?combatPreview=1
```

Check:

- normal and pet-command cards are visually distinct;
- text remains code-rendered and readable;
- no asset contains fake text or labels;
- target rings are visible over the board;
- intent icons are readable over enemy area;
- status/tag icons are legible at small sizes;
- player HUD and energy do not compete visually;
- End Turn still reads as a button after code text is rendered;
- missing one asset does not crash combat if tested deliberately.

---

## 11. Deliverables for Codex

When done, provide:

- generated raw asset archive path;
- runtime asset files path;
- list of generated asset keys;
- any skipped or regenerated assets;
- code changes for loader/registry;
- test results;
- at least one combat preview screenshot if possible;
- notes on assets that need human review.

