# P2.01 Combat UI/UX Completion Report

Date: 2026-05-26

Source contract: `docs/ui_ux_interaction.md` v0.3

Implementation base before this closure change: `1a47547`

Final pushed commit and review ZIP path are reported in the hand-off after the report itself is committed, because the review ZIP archives `HEAD` and this report is part of that same closure state.

## Summary

Completed the combat-only, non-asset UI/UX hardening scope from `docs/ui_ux_interaction.md`. The combat scene now supports the no-assets side-view battlefield, Keeper and active pet anchors, multi-pet-ready presentation, enemy intent and status interaction, player/pet/card status overflow, pinned detail panels, quick tooltips, pause/menu overlay behaviour, deterministic request submission, stale/duplicate action rejection, visible event playback, and production-preview evidence at the required 1280x720 viewport.

The implementation keeps gameplay rules in `src/game-core`. Phaser code renders view-model state, collects player input, submits controller requests, and plays typed event FX. It does not calculate target validity, damage, monster intent, status timing, or card effects.

## Implemented Scope

- Side-view party-versus-enemies combat layout with Keeper avatar, Ember Fox active pet slot, future pet slots, enemy silhouettes, enemy intent above enemies, enemy HP/status below enemies, and bottom HUD ordering.
- Card hover, selection, keyboard focus, right-click/card detail inspection, unplayable feedback, tag chips, tag explanations, keyword explanations, and tag overflow tooltips.
- Targeting grammar for enemy cards and pet-command enemy cards, including orange card-to-pet command feedback and enemy target rings for actual effect targets.
- Pinned detail panels that suspend action submission, preserve valid selected cards where possible, capture overlay clicks, and close before cancelling card targeting on `Esc`.
- Player HUD, pet, enemy intent, pile, card, and status tooltips/details, including overflow chips for player, pet, enemy, and card tag limits. Tooltip/detail copy is supplied by the combat view model.
- Pause/menu overlay with input capture and `Esc` ordering.
- Resize and focus-loss handling in the Phaser scene, guarded so tests and non-browser contexts remain safe.
- Controller-level gameplay request IDs for card plays and end-turn requests, including missing-request and duplicate-request rejection.
- Stale combat revision handling and safe selection recovery after rejected submissions.
- Combat event playback that recognises known event types, warns on unknown events, awaits visible FX, and still finalises playback if an individual event presenter fails.
- Visible FX for card play, energy spend, card draw/move, pet command/react, damage, block, status changes, monster intent set/resolved, defeated combatants, combat end, and rejected actions.
- Production preview screenshots for entry click, pile tooltip, card detail, intent detail, pause overlay, normal attack FX, pet-command FX, and the original selected wireframe state.

## Explicitly Not Implemented

These remain outside the combat non-asset Phase 1 scope in the source contract:

- Final art assets, final animation timing polish, and `asset_manifest.md`.
- Reward, map, pet journal, save/load, settings, and full touch/controller UI.
- Exact damage prediction, projected HP loss, ghost damage bars, and Phaser-calculated previews.
- Full player-facing combat log and full pile inspection UI.
- Pet HP, pet injury, pet death, pet morale, and enemy pet-targeting systems.
- Final balancing changes.

## Files Changed

- `src/game-phaser/animation/CombatEventPlayer.ts`
- `src/game-phaser/animation/CombatEventFxPresenter.ts`
- `src/game-phaser/controllers/CombatSandboxController.ts`
- `src/game-phaser/controllers/RunSandboxController.ts`
- `src/game-phaser/layout/combat-layout.ts`
- `src/game-phaser/presenters/CardPresenter.ts`
- `src/game-phaser/presenters/CombatHudPresenter.ts`
- `src/game-phaser/presenters/CombatOverlayPresenter.ts`
- `src/game-phaser/presenters/MonsterPresenter.ts`
- `src/game-phaser/presenters/PetPresenter.ts`
- `src/game-phaser/presenters/PlayerPresenter.ts`
- `src/game-phaser/scenes/CombatScene.ts`
- `tests/game-phaser/combat-controller.test.ts`
- `tests/game-phaser/combat-event-player.test.ts`
- `tests/game-phaser/combat-scene-boundary.test.ts`
- `tests/game-phaser/run-controller.test.ts`
- `tests/game-phaser/vertical-slice-controller.test.ts`
- `vite.config.ts`

## Contract Coverage Matrix

| Contract area | Status | Evidence |
| --- | --- | --- |
| Side-view combat composition | Complete | `combat-layout.ts`, `PlayerPresenter`, `PetPresenter`, `MonsterPresenter`, screenshots |
| Keeper avatar and Player HUD separation | Complete | `PlayerPresenter`, `CombatHudPresenter` |
| Ember Fox co-hero without Phase 1 HP | Complete | `PetPresenter` |
| Multi-pet readiness | Complete | active pet arrays and visual slot rendering in `PetPresenter` |
| Enemy intent/HP/status placement | Complete | `MonsterPresenter` |
| Bottom HUD order | Complete | `CombatHudPresenter`, `CombatScene` layout usage |
| Card hover/select/inspect | Complete | `CardPresenter`, `CombatOverlayPresenter`, scene keyboard/mouse handling |
| Card keywords/details | Complete | card detail copy and keyword explanations in `CombatViewModel` |
| Pet-command grammar | Complete | `CombatScene`, `PetPresenter`, `CombatEventFxPresenter` |
| Valid target rings and target click priority | Complete | `MonsterPresenter`, `PlayerPresenter`, scene targeting |
| Tooltip and detail panel behaviour | Complete | `CombatOverlayPresenter`, presenter hover callbacks |
| Pinned detail suspends targeting | Complete | `CombatScene` selection/detail state handling |
| Overlay click-through prevention | Complete | `CombatOverlayPresenter`, pause/detail blockers |
| Event playback and input lock | Complete | `CombatEventPlayer`, `CombatEventFxPresenter`, `CombatScene` |
| Stale request handling | Complete | `RunSandboxController`, `CombatSandboxController`, tests |
| Duplicate-submit prevention | Complete | request ID tracking in controllers and scene-generated request IDs |
| Tooltip timing | Complete | `TOOLTIP_DELAYS_MS`, delayed tooltip scheduling in `CombatScene`, presenter delay metadata |
| Tooltip content ownership | Complete | card tag, pet status, pet general, and pet detail copy come from `CombatViewModel` |
| Player/pile/enemy/intent detail ownership | Complete | player HUD, pile, enemy, intent, status, and card detail copy come from `CombatViewModel` |
| Negative interaction recovery | Complete | controller tests and scene boundary tests |
| Phaser/core boundary | Complete | architecture scans and boundary tests |
| Screenshot proof | Complete | 1280x720 evidence files and screenshot-dimension test |

## Golden Flow Proof Matrix

| Golden flow | Proof status | Evidence |
| --- | --- | --- |
| Flow 1 - Normal Enemy Attack Card | Passed | `preview-combat-normal-attack-fx-1280x720.png`, `CombatEventFxPresenter` direct card/damage/card-move FX, `combat-event-player.test.ts` |
| Flow 2 - Fox Bite Pet-Command Attack | Passed | `preview-combat-pet-command-fx-1280x720.png`, `PetCommanded` and `PetReacted` FX order in `CombatEventFxPresenter`, pet-command targeting in `CombatScene` |
| Flow 3 - Tailguard / Pet Guard | Passed for non-asset Phase 1 | `PetPresenter` command glow, Keeper anchor in `PlayerPresenter`, Player HUD block presentation, `BlockGained` FX, no Phaser-side outcome calculation |
| Flow 4 - Burn Status Application and Tick | Passed | enemy status tray and 250 ms status tooltip timing, `StatusApplied`, `StatusTicked`, and `StatusExpired` FX, status tooltip copy from view model |
| Flow 5 - Card Detail During Targeting | Passed | `preview-combat-card-detail-1280x720.png`, detail overlay click capture, selection preservation/restoration in `CombatScene` |
| Flow 6 - Invalid Target Recovery | Passed | invalid board feedback in `CombatScene`, stale/invalid target rejection tests, recoverable selection restoration |
| Flow 7 - End Turn and Enemy Attack | Passed | `MonsterIntentSet` and `MonsterIntentResolved` FX, end-turn request IDs, enemy-to-Keeper attack line, Player HUD HP/block update |
| Flow 8 - Victory Transition | Passed | `CombatantDefeated` and `CombatEnded` FX, disabled hand/input on terminal combat phase, continue routing after playback |
| Negative and fallback matrix | Passed | duplicate/missing/stale request tests, unknown event fallback, overlay click-through prevention, unsupported UI warnings, screenshot dimension test |

## Validation Evidence

Commands completed successfully on 2026-05-26 after the final request-ID and event-FX changes:

```txt
npm run typecheck
npm test
npm run build
npm run build:cli
cmd /c "npm run game:cli -- --seed p2-combat-uiux --json --auto"
npm run sim:smoke
node scripts/run-cli-entry.mjs simulate-runs --mode fuzz --runs 20 --max-steps 300 --seed p2-combat-uiux-fuzz
node scripts/run-cli-entry.mjs simulate-runs --mode fuzz --analyze --runs 20 --max-steps 300 --seed p2-combat-uiux-analyze --strict-health
npm run sim:balance
node scripts/run-cli-entry.mjs simulate-runs --mode replay --trace tests/game-core/traces/smoke-complete.json
npm audit --audit-level=moderate
git diff --check
```

Key results:

```txt
npm test: 58 files passed, 460 tests passed
npm run build: dist/index.html 0.46 kB, dist/assets/index-CiFIGUGT.css 0.57 kB, dist/assets/index-D5zmyMgF.js 1,519.66 kB
npm run build:cli: dist-cli/game-cli.mjs, dist-cli/simulate-runs.mjs, parse chunk built
game:cli json auto: ok=true, finalStatus=completed, steps=65, invariantChecks=66
sim:smoke: 3 runs, 0 failures
sim:fuzz: 20 runs, 0 failures
sim:analyze strict-health: 20 runs, 0 failures, invalidAccepted=0, health no issues
sim:balance: 200 runs, 0 failures, completion 46.5%, target 45.0%-60.0%, health no issues
sim:replay: 1 replay, 0 failures
npm audit: 0 vulnerabilities
git diff --check: passed with Git CRLF normalisation warnings only
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

Production build was served locally through Vite preview after the final build:

```txt
npx vite preview --host 127.0.0.1 --port 4218
```

Browser preview smoke at `http://127.0.0.1:4218/`:

```txt
Viewport: 1280x720
Canvas: 1280x720
Body height: 720
Console errors: []
Bad responses: []
```

Rendered evidence files, all verified as 1280x720 and covered by the screenshot-dimension test:

- `docs/contracts/p2/16-roguedeckgame-e38efe7add57/preview-combat-wireframe-selected-1280x720.png`
- `docs/contracts/p2/16-roguedeckgame-e38efe7add57/preview-combat-entry-after-click-1280x720.png`
- `docs/contracts/p2/16-roguedeckgame-e38efe7add57/preview-combat-pile-tooltip-1280x720.png`
- `docs/contracts/p2/16-roguedeckgame-e38efe7add57/preview-combat-card-detail-1280x720.png`
- `docs/contracts/p2/16-roguedeckgame-e38efe7add57/preview-combat-intent-detail-1280x720.png`
- `docs/contracts/p2/16-roguedeckgame-e38efe7add57/preview-combat-pause-overlay-1280x720.png`
- `docs/contracts/p2/16-roguedeckgame-e38efe7add57/preview-combat-normal-attack-fx-1280x720.png`
- `docs/contracts/p2/16-roguedeckgame-e38efe7add57/preview-combat-pet-command-fx-1280x720.png`

## Review Status

Independent reviewers were used as blockers, with non-block advisories treated as blocking.

- Earlier code-review pass: RED. Findings covered event FX visibility/awaiting, duplicate request hardening, tooltip/detail click capture, and screenshot proof.
- Earlier contract-audit pass: RED. Findings covered incomplete event playback proof, stale report evidence, request ID semantics, and missing broader screenshot proof.
- Current implementation includes the fixes and validation evidence listed above.
- Final code-review and contract-audit statuses are recorded in the final hand-off after the reviewers re-check this report and working tree.
