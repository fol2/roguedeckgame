# Combat Asset Contract Patch v0.1

Status: implementation patch contract  
Scope: combat-only asset contract, runtime asset keys, layout contract, VFX contract, and in-game card visual generator scaffold

This patch aligns the repository with `docs/contracts/combat-ui-asset-manifest-v0.1.md`.

It does not add generated image files. It prepares the codebase so image-generated assets can be dropped into stable runtime keys later without changing combat logic.

## Objectives

1. Make combat asset keys 4K-ready and source-of-truth friendly.
2. Replace old `1x / 2x / 3x` language with one high-resolution runtime asset per key.
3. Add parallax Ashwood Trail background keys.
4. Add official Ashwood enemy sprite keys.
5. Add required Keeper and Ember Fox pose keys.
6. Add rarity, source, family, and starter art window keys for the in-game card visual engine.
7. Add sequence-aware intent/readout marker keys for the v0.5 shared Card Actor model.
8. Add required hybrid VFX keys while retaining code fallbacks.
9. Add a pure TypeScript card visual generator that maps combat card view-model metadata to frames, rarity gems, source badges, family badges, art windows, tag icons, and palette cues.
10. Keep Phaser presentation modular and keep gameplay text/numbers code-rendered.

## Files Changed

Expected files:

```txt
docs/contracts/combat-ui-asset-manifest-v0.1.md
docs/contracts/combat-asset-contract-patch-v0.1.md
src/game-phaser/assets/combat-asset-keys.ts
src/game-phaser/assets/combat-fallback-assets.ts
src/game-phaser/card-visuals/card-visual-generator.ts
src/game-phaser/card-visuals/index.ts
src/game-phaser/layout/hand-layout.ts
src/game-phaser/layout/card-frame-layout.ts
src/game-phaser/layout/intent-token-layout.ts
src/game-phaser/layout/status-icon-layout.ts
src/game-phaser/animation/combat-vfx-keys.ts
src/game-phaser/presenters/CardPresenter.ts
src/game-phaser/view-models/combat-view-model.ts
tests/game-phaser/card-visual-generator.test.ts
```

Existing tests for asset keys, manifest, card frame layout, intent token layout, status icon layout, VFX keys, and card presenter mocks should be updated with the new contract.

## Non-Goals

This patch does not:

- add PNG/WebP assets;
- implement an asset loading pipeline for real images;
- change game-core combat rules;
- implement reward, map, or pet journal assets;
- add pet HP or enemy pet targeting;
- generate full cards as baked images;
- remove code fallbacks.

## Card Visual Generator Contract

The in-game card generator is not an image generator. It is a runtime visual composition contract.

`buildCardVisualSpec(card)` should produce:

```txt
frameKey
rarity gem key/label/glyph
source badge key/label/glyph
family badge key/label/glyph
art window key
palette
visible tag icon/glyph mapping
pet-command grammar flag
```

`CardPresenter` then composes the live card from:

```txt
frame + rarity + source + family + art window + code-rendered cost/title/rules/tags
```

The image generator will later produce the image-backed pieces. Phaser keeps rendering the final card dynamically.

## Validation

Recommended validation after applying the patch:

```bash
npm run typecheck
npm run test:phaser -- --reporter=dot
npm test -- --reporter=dot
npm run build
```

If full tests are too slow, at minimum run:

```bash
npm run typecheck
npm run test:phaser -- --reporter=dot
```

## Acceptance Criteria

- Asset keys include parallax Ashwood background layers.
- Asset keys include Keeper idle/command/attack/hurtGuarded.
- Asset keys include Ember Fox idle/commandReady/bite/tailguard/burnApply/calm.
- Asset keys include all official Ashwood enemies.
- Asset keys include card rarity/source/family/art-window groups.
- Asset keys include sequence-aware intent markers.
- Asset keys include required hybrid VFX hooks.
- `CARD_FRAME_ASSET_SPEC` uses one high-resolution runtime export contract.
- `CombatCardViewModel` exposes rarity/source metadata for presentation.
- `buildCardVisualSpec` maps source/rarity/family independently.
- `CardPresenter` uses the visual generator instead of hardcoding all card visual language locally.
- Missing images remain safe because existing code-rendered placeholder behavior is preserved.
