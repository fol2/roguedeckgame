# Combat Asset Contract Patch v0.1 Package

This package contains one repo patch plus the two contract documents generated from that patch.

## Files

- `combat-asset-contract-v0.1.patch` — single patch to apply to the project source.
- `combat_asset_manifest.md` — 4K-ready combat-only asset manifest, intended for `docs/contracts/combat-ui-asset-manifest-v0.1.md`.
- `combat-asset-contract-patch-v0.1.md` — implementation patch contract / review notes, intended for `docs/contracts/combat-asset-contract-patch-v0.1.md`.

## Patch Scope

- Updates the combat asset manifest into a 4K-ready single-runtime-asset contract.
- Extends combat asset keys for backgrounds, Keeper poses, Ember Fox poses, official Ashwood enemies, card visual engine parts, v0.5 plan/Intent tokens, status/tag icons, slots, and required VFX hooks.
- Adds the in-game Card Visual Generator scaffold under `src/game-phaser/card-visuals/`.
- Updates CardPresenter to use generated card visual specs while keeping all gameplay text/numbers code-rendered.
- Adds/updates tests for the manifest, asset keys, card visual generator, layout contracts, and VFX hooks.

## Validation Performed

- `npm run typecheck` — passed.
- `npm run test:core -- --reporter=dot` — passed: 60 files / 584 tests.
- `npm run test:phaser -- --reporter=dot` — passed: 47 files / 276 tests.
- `npm run test:cli -- --reporter=dot` — passed: 3 files / 15 tests.
- `npm run test:scripts -- --reporter=dot` — passed: 1 file / 6 tests.
- `npm run build` — passed.
- `git apply --check combat-asset-contract-v0.1.patch` against `roguedeckgame-review-68f631660d99.zip` — passed.

## Apply

From the project root:

```bash
git apply combat-asset-contract-v0.1.patch
npm run typecheck
npm run test:phaser -- --reporter=dot
npm run build
```
