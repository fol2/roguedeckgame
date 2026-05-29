# Combat Asset Contract v0.1 Completion Report

Status: Complete
Date: 2026-05-30

## Scope Completed

- Applied the combat asset contract patch and resolved contract drift in runtime keys, layout helpers, CardPresenter, VFX specs, fallback handling, and tests.
- Added the generated card visual spec scaffold under `src/game-phaser/card-visuals/`.
- Kept gameplay text, numbers, card rules, costs, Intent amounts, and tooltips code-rendered.
- Removed `combat.enemy.trainingSlime.idle` from the production runtime key contract so official Ashwood enemies and `combat.enemy.generic.idle` remain the runtime targets.
- Wired CardPresenter to consume frame, rarity, source, family, art window, tag icon, hover overlay, selected overlay, and unplayable overlay asset keys when textures exist, while preserving code-rendered fallbacks.
- Wired combat VFX specs into runtime playback so available VFX textures can render before code fallbacks.
- Enlarged hand cards to `192 x 268` logical pixels, with stacked hand spacing so larger hands overlap naturally and can intrude into the battle zone without leaving the viewport.

## Independent Review

- Code reviewer: CODE REVIEW GREEN.
- Contract auditor: CONTRACT AUDIT GREEN.

All reviewer advisories were treated as blockers and fixed before this report.

## Validation Evidence

- `git pull --ff-only` on `main`: already up to date with `origin/main`.
- `npm run typecheck`: passed.
- `npm run test:core -- --reporter=dot`: passed, 60 files / 584 tests.
- `npm run test:phaser -- --reporter=dot`: passed, 47 files / 287 tests.
- `npm run test:cli -- --reporter=dot`: passed, 3 files / 15 tests.
- `npm run test:scripts -- --reporter=dot`: passed, 1 file / 6 tests.
- `npm test -- --reporter=dot`: passed, 111 files / 892 tests.
- `npm run build`: passed, production bundle generated in `dist/`.
- `git diff --check`: passed.
- Production preview smoke: `npx vite preview --host 127.0.0.1 --port 4173`, loaded `http://127.0.0.1:4173/?final-smoke=1` in Playwright.
- Preview console: Phaser WebGL banner only; no application error was observed.
- Preview screenshot: `docs/contracts/p4/24-combat_asset_contract_v0_1_package/evidence/combat-asset-contract-final-preview.png`.
- Large-card preview screenshot: `docs/contracts/p4/24-combat_asset_contract_v0_1_package/evidence/large-hand-cards-preview.png`.

## Residual Notes

- The contract intentionally does not add generated image files.
- Missing textures continue to fall back to code-rendered placeholders so combat interaction remains playable while art is incomplete.
