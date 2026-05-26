# P2.01 — Combat Wireframe UI Without Assets

Status: proposed / implemented in accompanying patch  
Scope: Phaser combat presentation only, no final art assets

## Objective

Implement a no-assets combat wireframe that validates `docs/ui_ux_interaction.md` v0.3 before creating the combat asset manifest.

This patch intentionally uses Phaser primitives: rectangles, circles, ellipses, text, lines, and placeholder silhouettes. It does not add art assets.

## Why This Exists

The combat interaction contract now defines the practical UI baseline:

- side-view party-versus-enemies layout;
- Keeper battlefield avatar on the left;
- Ember Fox active pet co-hero near the Keeper;
- enemies as sprite/silhouette placeholders on the right, not cards;
- enemy intent above, HP/status below, target ring at base;
- bottom HUD order: Player HUD, Energy, Draw, Hand, Discard, End Turn;
- pet-command cards show an orange command line to Ember Fox;
- enemy target rings show the effect target.

The wireframe implementation lets the project validate this layout and interaction grammar before committing time to generated assets.

## In Scope

- Rework Phaser combat layout constants into side-view combat regions.
- Render Keeper as a battlefield avatar, not a card.
- Render Ember Fox as an active pet placeholder with future pet slots.
- Render enemies as silhouettes with intent, HP/status shelf, and target rings.
- Render bottom HUD as separate Player HUD, Energy Orb, draw/discard piles, and End Turn.
- Convert hand cards toward the canonical 5:7 card shape.
- Add selected-card and hovered-card states.
- Add manual enemy targeting for enemy-targeted cards.
- Add orange pet-command line preview via `TargetingPresenter`.
- Extend combat view models with target/play metadata needed by Phaser.
- Preserve old controller behavior by keeping default targeting when no explicit target is passed.

## Out of Scope

- Final art assets.
- Asset manifest.
- Reward, map, or pet journal UI redesign.
- Full pinned detail panel.
- Full tooltip system.
- Exact damage prediction.
- Pet HP or enemy pet targeting.
- Full keyboard/controller/touch UX.

## Acceptance Criteria

- `npm run typecheck` passes.
- `npm test` passes.
- Combat still plays through existing controller tests.
- Presenters remain free of gameplay resolver imports.
- `src/game-core` remains free of Phaser imports.
- Player-targeted and pet-command semantics remain game-core driven.
- Enemy-targeted cards can be selected first and resolved against clicked enemies in Phaser.
- Pet-command cards preview with orange line to Ember Fox, not to the enemy.

## Validation Run

Validated locally after patch:

```txt
npm run typecheck
npm test -- --reporter=dot
```

Result:

```txt
58 test files passed
443 tests passed
```
