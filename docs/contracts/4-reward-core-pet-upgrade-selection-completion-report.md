# Reward Core and Pet Upgrade Selection Completion Report

## Summary

Engineering Contract v0.5 is implemented in game-core only.

The slice now supports deterministic post-combat reward generation for won combats, card reward claiming, pet upgrade reward claiming, reward skipping, starter reward card content, focused fixtures, and core tests. No reward UI, Phaser work, story progression, card upgrade resolution, or pet upgrade modifier resolution was implemented.

## Changed File Tree

```txt
docs/contracts/4-reward-core-pet-upgrade-selection-contract.md
docs/contracts/4-reward-core-pet-upgrade-selection.md
docs/contracts/4-reward-core-pet-upgrade-selection-completion-report.md
docs/plans/2026-05-25-005-reward-core-pet-upgrade-selection-plan.md
src/game-core/data/cards/reward-cards.ts
src/game-core/data/registry.ts
src/game-core/ids.ts
src/game-core/index.ts
src/game-core/model/event.ts
src/game-core/model/reward.ts
src/game-core/systems/rewards.ts
src/game-core/testing/combat-fixtures.ts
src/game-core/testing/reward-fixtures.ts
tests/game-core/localhost-smoke.test.js
tests/game-core/model-shape.test.ts
tests/game-core/registry.test.ts
tests/game-core/reward-claim.test.ts
tests/game-core/reward-generate.test.ts
tests/game-core/reward-integration.test.ts
```

`src/game-core/model/run.ts` and `src/game-core/model/pet.ts` already satisfied the contract shapes before this ticket: `RunState` already uses `activePetInstanceIds` and `deckCardIds`, and `PetInstance` already uses `unlockedUpgradeIds`. They were inspected and did not need edits.

## Implementation Notes

- Added branded `RewardOfferId` and `RewardOptionId` helpers.
- Added reward offer, option, and claim state models.
- Migrated reward events to serializable `RewardOffered`, `RewardSelected`, `RewardSkipped`, `CardRewardAdded`, and `PetUpgradeUnlocked` payloads.
- Added six non-starter reward cards and included them in `starterRegistry`.
- Added `generateCombatRewardOffer`, `claimReward`, and `skipReward`.
- Reward generation rejects non-won combat phases and missing active pet instances.
- Reward generation uses seeded RNG and excludes duplicate options within one offer.
- Card reward eligibility excludes starter, special, and `unrewardable` cards, and respects `requiresPetDefinitionId`.
- Pet upgrade eligibility targets a specific active `petInstanceId` and excludes already unlocked upgrades.
- Claiming a card appends to `RunState.deckCardIds`.
- Claiming a pet upgrade appends to the target `PetInstance.unlockedUpgradeIds`.
- Claim and skip reject closed or invalid offers without mutating input state.
- Claim revalidates caller-supplied option eligibility rather than trusting serialized offer data.

## Verification

```txt
npm run typecheck
PASS

npm test
PASS: 16 test files, 130 tests

npm run smoke:localhost
PASS
Smoke URL observed: http://127.0.0.1:51379/health
Reviewer re-run URL observed: http://127.0.0.1:51513/health

npm audit --audit-level=moderate
PASS: 0 vulnerabilities

rg Phaser import scan in src/game-core
PASS: no matches

npm ls --depth=0
PASS: direct dependencies remain typescript and vitest only
```

## Required Validation Output

1. Changed file tree: listed above.
2. Commands run and results: listed above.
3. No Phaser dependency was added: confirmed by unchanged production dependencies and `npm ls --depth=0`.
4. `src/game-core` contains no Phaser imports: confirmed by static `rg` scan and model-shape test.
5. Reward generation only works for won combat: covered by `reward-generate.test.ts` and integration tests.
6. Card reward options are deterministic and exclude starter cards: covered by same-seed, different-seed payload, and starter-exclusion tests.
7. Pet upgrade options target specific pet instances: covered by generation and multi-pet integration tests.
8. Claiming card rewards appends to `RunState.deckCardIds`: covered by claim and integration tests.
9. Claiming pet upgrades appends to `PetInstance.unlockedUpgradeIds`: covered by claim and integration tests.
10. No pet upgrade modifier resolution was implemented: confirmed by code inspection; only upgrade IDs are appended.
11. No reward UI was implemented: confirmed by changed file tree; all implementation is game-core/tests/docs plus localhost smoke.
12. All tests pass: `npm test` passed 16 files / 130 tests.
13. Implementation commit SHA: `4ccda22db5f12206d69fa446f480f7eb706380f7`.
14. Final pushed HEAD SHA: `96f3ef665171920534fe39ba576eda85f2f74e49`.

## Independent Reviews

### Code Reviewer

- Agent: `019e5e72-7ad8-79f2-8f89-26270402c3c4`
- First pass: NOT GREEN.
- Blockers fixed:
  - `claimReward` now revalidates card eligibility and rejects inactive pet upgrade targets.
  - `generateCombatRewardOffer` now rejects missing active pet instances.
  - Different-seed test now compares option payload/order rather than seed-derived option IDs.
- Second pass: GREEN.

### Contract Auditor

- Agent: `019e5e72-98ab-71e2-93b7-2621e2021182`
- First pass: NOT GREEN due to expected closeout items before report/commit/push.
- Functional second pass: GREEN, with only final report/commit/push pending at that time.

## Non-Goals Confirmed

- No Phaser.
- No Vite UI.
- No React.
- No reward screen UI.
- No art assets.
- No map generation.
- No save/load.
- No story progression.
- No pet upgrade modifier resolution.
- No card upgrade resolution.
- No boss rewards.
- No relics.
- No production dependencies.

## Final Git Evidence

- Baseline HEAD before ticket: `dcc33f7eb1b13a5be866e6b0aed8a8b80c31616a`
- Implementation commit SHA: `4ccda22db5f12206d69fa446f480f7eb706380f7`
- Final pushed HEAD SHA: `96f3ef665171920534fe39ba576eda85f2f74e49`
