# Pet Upgrade Modifier Resolution Plan

## Files to Add or Update

- Add `src/game-core/systems/pet-modifiers.ts`.
- Update pet, combat, event, upgrade data, registry validation, fixture, and public export files in `src/game-core`.
- Add focused Vitest coverage for Burning Fang, Warm Bond, Ash Instinct, multi-pet ownership, and reward-to-combat integration.
- Copy the contract into `docs/contracts/5-pet-upgrade-modifier-resolution.md`.
- Add a completion report in `docs/contracts` after implementation and review.

## Test Plan

- Run `npm run typecheck`.
- Run `npm test`.
- Run `npm run smoke:localhost`.
- Run `npm audit --audit-level=moderate`.
- Run `npm run zip:review`.
- Scan `src/game-core` for Phaser imports.

## Non-Goals

- No Phaser, Vite UI, React, art assets, map generation, save/load, story progression, reward UI, card upgrade resolution, relics, bosses, or production dependencies.
- Do not create a generic scripting engine.

## Architecture Risks

- Keep pet modifier resolution in `src/game-core`.
- Keep modifier rules data-driven and avoid card-name branches.
- Return `ActionRejected` for malformed active modifier data instead of throwing in normal gameplay paths.

## Event-Order Risks

- Lock Warm Bond cost events before `EnergySpent`.
- Keep effect modifier events serializable and deterministic.
- Resolve Ash Instinct trigger events after card effects and before the played card moves to discard.

## Multi-Pet Risks

- Derive active modifiers per active pet instance.
- Scope modifier ownership to resolved pet targets.
- Track once-per-turn and once-per-combat usage per pet instance, not globally.
