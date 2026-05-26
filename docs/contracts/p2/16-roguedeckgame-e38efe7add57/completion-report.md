# P2.01 Combat Wireframe UI Completion Report

Date: 2026-05-26

Implementation commit: `c717f94f167155b7d8e4fe750fc86ff3b6681589`

## Summary

Completed the Phase 2.01 combat wireframe implementation against `docs/ui_ux_interaction.md` v0.3. The combat UI now renders a no-assets side-view battlefield with a Keeper avatar, Ember Fox active pet position, future pet slot placeholders, enemy silhouettes with intent and HP/status placement, bottom HUD ordering, canonical 5:7 hand cards, selected/hovered card states, manual enemy targeting, and pet-command orange line preview.

The implementation remains presentation-only. Combat rules, target validity, card effects, monster intents, and event resolution continue to come from `src/game-core`.

## Implementation Evidence

- Reworked combat layout constants in `src/game-phaser/layout/combat-layout.ts`, `hand-layout.ts`, and `pet-layout.ts`.
- Added `src/game-phaser/presenters/TargetingPresenter.ts` for the orange pet-command line.
- Updated Phaser combat presenters for battlefield avatars, enemy silhouettes, intent amounts, HP/status shelves, target rings, bottom HUD, card hover/selection, and overflow indicators.
- Extended `src/game-phaser/view-models/combat-view-model.ts` with revision, target metadata, intent amount/target hint, status tooltip labels, UI caps, and unsupported Phase 1 warnings.
- Updated sandbox controllers to accept explicit enemy targets and reject stale combat revisions.
- Updated `src/game-phaser/scenes/CombatScene.ts` to select targetable cards first, resolve clicked enemies through the controller, lock input before action submission, cancel selected cards with `Esc`, and end turn from idle with `Space`.
- Added `data:,` favicon in `index.html` to keep local production preview free of favicon 404 console noise while preserving the no-external-URL app entry invariant.
- Synced the task folder snapshot for the relevant UI document, Phaser implementation, Phaser tests, and app entry.

## Contract Coverage

- Side-view party-versus-enemies layout: implemented with board, Keeper avatar, Ember Fox, future pet slots, and enemy slots.
- Keeper battlefield avatar, not card: implemented in `PlayerPresenter`.
- Ember Fox active pet co-hero: implemented in `PetPresenter`; no Phase 1 pet HP bar is rendered.
- Enemies as silhouettes, not cards: implemented in `MonsterPresenter`.
- Enemy intent above, HP/status below, target ring at base: implemented.
- Bottom HUD order: Player HUD, Energy, Draw, Hand, Discard, End Turn.
- Canonical 5:7 cards: implemented via `CARD_SIZE` 96x134.
- Selected and hovered card states: implemented.
- Manual enemy targeting: implemented for enemy-targeted cards with explicit target IDs.
- Pet-command orange line to Ember Fox: implemented through `TargetingPresenter`.
- Stale-state handling: controller rejects stale combat revisions.
- Stale target recovery: failed target submits refresh the latest view model, restore selection with the latest revision only when still valid, otherwise clear selection safely.
- Duplicate-submit prevention: scene locks input before gameplay action submission.
- Target click priority: monster slots include a transparent hit zone from intent through status/ring area so clicking the intent/sprite/HP/status/ring selects the enemy during targeting.
- Multiple active pet readiness: the presenter renders active pets up to the Phase 1 visual slot cap, then empty future slots.
- Phase 1 caps: view model exposes hand/enemy/pet/status/tag caps and unsupported-count warnings.
- Boundary hygiene: Phaser presenters do not import game-core systems or own gameplay resolvers; `src/game-core` remains Phaser/browser free.

## Validation Evidence

Commands completed successfully:

```txt
npm run typecheck
npm test
npm run build
npm run build:cli
cmd /c "npm run game:cli -- --seed p2-cli-smoke --json --auto"
cmd /c "npm run sim:smoke"
cmd /c "npm run sim:fuzz -- --runs 20 --max-steps 300 --seed p2-fuzz"
cmd /c "npm run sim:analyze -- --runs 20 --max-steps 300 --seed p2-analyze --strict-health"
cmd /c "npm run sim:balance"
cmd /c "npm run sim:replay -- --trace tests/game-core/traces/smoke-complete.json"
npm audit --audit-level=moderate
git diff --check
```

Key results:

```txt
npm test: 58 files passed, 450 tests passed
npm run build: dist/index.html 0.46 kB, dist/assets/index-y7UZvK2m.js 1,493.42 kB
npm run build:cli: dist-cli/game-cli.mjs, dist-cli/simulate-runs.mjs, parse chunk built
game:cli json auto: ok=true, finalStatus=completed, steps=54, invariantChecks=55
sim:smoke: 3 runs, 0 failures
sim:fuzz: 20 runs, 0 failures
sim:analyze strict-health: 20 runs, 0 failures, health no issues
sim:balance: 200 runs, 0 failures, completion 46.5%, target 45.0%-60.0%, health no issues
sim:replay: 1 replay, 0 failures
npm audit: 0 vulnerabilities
git diff --check: passed
```

Architecture checks:

```txt
rg "from ['\"]phaser|Math\.random|window|document|localStorage|sessionStorage" src/game-core
```

Result: no matches.

```txt
rg -n "game-core/systems|createCombat\(|playCard\(|endPlayerTurn\(|resolveEnemyTurn\(" src/game-phaser/presenters src/game-phaser/scenes
```

Result: no matches.

## Production Preview Evidence

Preview server:

```txt
npx vite preview --host 127.0.0.1 --port 4216
```

Playwright preview smoke at `http://127.0.0.1:4216/`:

```txt
HTML: 200, text/html, 461 bytes
JS: 200, text/javascript, 1493421 bytes
CSS: 200, text/css, 575 bytes
Canvas: 1, 1280x720
Screenshot unique byte count: 256
Bad responses: []
Failed requests: []
Console errors: []
```

Rendered evidence files:

- `docs/contracts/p2/16-roguedeckgame-e38efe7add57/preview-combat-wireframe-selected-1280x720.png`
- `docs/contracts/p2/16-roguedeckgame-e38efe7add57/preview-pet-command-line-1280x720.png`

## Scope Notes

No final art assets, asset manifest, reward UI redesign, map UI redesign, pet journal UI, mobile layout, exact damage prediction, player-facing combat log, pet HP, or enemy pet targeting were added. Those remain outside this contract.

## Review Status

Initial independent review found blockers in stale target recovery, multi-pet presentation, enemy-slot hit coverage, and a stale preview artefact. Those blockers were fixed and the misleading preview image was removed.

Final independent code reviewer: GREEN, no blockers or advisories.

Final independent contract auditor: GREEN, no blockers or advisories.
