# Reward Core and Pet Upgrade Selection Plan

## Contract

- Source: `docs/contracts/4-reward-core-pet-upgrade-selection-contract.md`
- Copied contract: `docs/contracts/4-reward-core-pet-upgrade-selection.md`
- Scope: deterministic game-core reward generation, claim, skip, starter reward content, tests, and completion report.

## Files To Add Or Update

- `src/game-core/ids.ts`: add branded reward offer and option IDs.
- `src/game-core/model/reward.ts`: add reward option, offer, and claim state types.
- `src/game-core/model/event.ts`: add serializable reward events.
- `src/game-core/data/cards/reward-cards.ts`: add the first non-starter reward card pool.
- `src/game-core/data/registry.ts`: include reward cards in the starter registry.
- `src/game-core/systems/rewards.ts`: implement deterministic generation, claim, and skip behaviour.
- `src/game-core/testing/reward-fixtures.ts`: add focused reward fixtures.
- `src/game-core/testing/combat-fixtures.ts`: reuse existing won/lost/multi-pet combat helpers where possible.
- `src/game-core/index.ts`: export reward systems.
- `tests/game-core/reward-generate.test.ts`: cover deterministic generation and eligibility.
- `tests/game-core/reward-claim.test.ts`: cover claim, skip, invalid usage, events, and mutation safety.
- `tests/game-core/reward-integration.test.ts`: cover won-combat integration and multi-pet options.
- `tests/game-core/model-shape.test.ts`: cover reward IDs, option model shape, event serializability, and the Phaser boundary.
- `docs/contracts/4-reward-core-pet-upgrade-selection-completion-report.md`: final evidence report.

## Test Plan

- Run focused reward tests while implementing:
  - `npm test -- --run tests/game-core/reward-generate.test.ts tests/game-core/reward-claim.test.ts tests/game-core/reward-integration.test.ts tests/game-core/model-shape.test.ts`
- Run required final gates:
  - `npm run typecheck`
  - `npm test`
  - `npm run smoke:localhost`
  - `npm audit --audit-level=moderate`
- Inspect `src/game-core` for Phaser imports.
- Inspect dependency diffs to confirm no production dependencies were added.

## Non-Goals

- No Phaser, Vite UI, React, reward screen UI, art assets, map generation, save/load, story progression, relics, boss rewards, card upgrade resolution, or pet upgrade modifier resolution.

## Architecture Risks

- Reward systems must stay in `src/game-core` and emit typed events for future presentation layers.
- Reward generation must use seeded RNG only; no direct `Math.random()`.
- Reward events must remain plain serializable data.

## Reward Eligibility Risks

- Card rewards must exclude starter and special cards.
- Pet-command cards with `requiresPetDefinitionId` must require a matching active pet instance.
- Pet upgrade rewards must target a concrete `petInstanceId`.
- A shared pet definition across multiple active pet instances must still produce per-instance upgrade options.
- Already unlocked pet upgrades must be excluded from generation and rejected during claim.

## Mutation-Safety Risks

- Generation must not mutate combat, run, registry, or pet instances.
- Claim and skip must return new state where appropriate and leave rejected inputs unchanged.
- Rejected normal reward actions must return `ActionRejected` and useful errors, not throw.
