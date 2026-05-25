# Phaser Combat Scene Event Playback Plan

Source contract: `docs/contracts/9-phaser-combat-scene-event-playback-contract.md`

## Files to Add or Update

- Add `CombatScene` and register it in the Vite Phaser app flow.
- Add `CombatSandboxController` as the only Phaser-facing bridge that calls run/combat core actions.
- Add serializable combat view models for player, pets, monsters, intents, hand, piles, and event messages.
- Add small Phaser presenters for player, pet, monsters, hand cards, HUD, and event log.
- Add central combat, hand, and pet layout helpers.
- Add `CombatEventPlayer` plus a pure event-message formatter.
- Add focused game-phaser tests for controller behaviour, view-model serialization, event formatting, and scene/presenter boundaries.
- Update existing app-entry and Phaser boundary tests.

## Scene / Controller / Presenter Split

- `BootScene` stays tiny and routes to `CombatScene`.
- `CombatScene` owns orchestration, input locking, and presenter refresh only.
- `CombatSandboxController` creates a deterministic Novice Tamer + Ember Fox combat sandbox and delegates actions to `src/game-core`.
- View-model files shape core state into JSON-friendly presentation data without importing Phaser.
- Presenters own Phaser GameObjects and render placeholder rectangles/text only.
- `CombatEventPlayer` consumes returned `GameEvent[]` and appends formatted messages in order.

## Test Plan

- Run `npm run typecheck`.
- Run `npm test`.
- Run `npm run build`.
- Run `npm run smoke:localhost`.
- Run `npm audit --audit-level=moderate`.
- Run `git diff --check`.
- Run contract-copy diff between the two ticket-9 contract files.
- Run dependency shape checks with `npm ls`.
- Run local Vite curl smoke against `/` and `/src/app/main.ts`.
- Run `npm run zip:review` after commit from a clean worktree.

## Non-Goals

- No drag-and-drop.
- No manual target selection.
- No final UI, art, audio, particles, shaders, or asset loading.
- No map, reward, save, or story UI.
- No React, Redux, Zustand, Pixi, GSAP, Playwright, Electron, Tauri, or deployment packaging.
- No new production dependencies.

## Architecture Risks

- Phaser scene accidentally taking on gameplay rules.
- Presenters importing resolver functions instead of receiving view models.
- View-models importing Phaser and becoming browser-bound.
- `src/game-core` boundary regressing through presentation imports or browser APIs.

## Event Playback Risks

- Event order being lost by rendering final state only.
- Rejected actions disappearing after re-render.
- Scene input remaining enabled while playback is active.

## Phaser Build Risks

- Phaser 4 import shape breaking Vite build.
- Hardcoded coordinates scattering outside layout helpers.
- Placeholder text becoming unreadable or overlapping at the fixed game size.
