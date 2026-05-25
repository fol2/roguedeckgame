# Engineering Contract v0.6 Completion Report

## Status

Implementation complete locally. Final pushed commit SHA and review ZIP path are recorded after commit and push because the review ZIP script archives `HEAD` and requires a clean worktree.

## Changed File Tree

- `docs/contracts/5-pet-upgrade-modifier-resolution-contract.md`
- `docs/contracts/5-pet-upgrade-modifier-resolution.md`
- `docs/contracts/5-pet-upgrade-modifier-resolution-completion-report.md`
- `docs/plans/2026-05-25-006-pet-upgrade-modifier-resolution-plan.md`
- `src/game-core/data/registry.ts`
- `src/game-core/data/upgrades/ember-fox-upgrades.ts`
- `src/game-core/index.ts`
- `src/game-core/model/combat.ts`
- `src/game-core/model/event.ts`
- `src/game-core/model/pet.ts`
- `src/game-core/model/registry.ts`
- `src/game-core/systems/combat.ts`
- `src/game-core/systems/effects.ts`
- `src/game-core/systems/pet-modifiers.ts`
- `src/game-core/systems/statuses.ts`
- `src/game-core/systems/validation.ts`
- `src/game-core/testing/combat-fixtures.ts`
- `src/game-core/testing/reward-fixtures.ts`
- `tests/game-core/localhost-smoke.test.js`
- `tests/game-core/model-shape.test.ts`
- `tests/game-core/pet-modifier-ash-instinct.test.ts`
- `tests/game-core/pet-modifier-burning-fang.test.ts`
- `tests/game-core/pet-modifier-integration.test.ts`
- `tests/game-core/pet-modifier-multi-pet.test.ts`
- `tests/game-core/pet-modifier-warm-bond.test.ts`
- `tests/game-core/registry.test.ts`

## Implementation Summary

- Added explicit pet modifier rule data for cost discounts, pet-command effect amount changes, and burned-enemy defeat triggers.
- Added active modifier derivation from active `PetInstance.unlockedUpgradeIds` during combat creation.
- Added per-pet modifier usage tracking for once-per-turn and once-per-combat rules.
- Added temporary modifier resolution through `RunPetState.temporaryModifierIds` and `registry.petModifiers`.
- Added serializable `CardCostModified`, `PetModifierActivated`, and `PetModifierConsumed` events.
- Integrated cost modifiers before energy checks and effect modifiers before effect resolution.
- Integrated Ash Instinct trigger resolution after player-turn defeat events, including supported player-turn Burn damage processing.
- Extended registry and runtime validation for modifier rule types, malformed selectors, malformed cost data, malformed limits, malformed effect modifier data, duplicate modifier IDs, unknown statuses, unsupported trigger effects, invalid draw amounts, invalid modifier entries, and missing modifier rules.

## Modifier Behaviour Confirmed

- Unlocked pet upgrades produce active modifiers in new combats via `RunPetState.activeModifierIds`.
- Burning Fang modifies eligible Ember Fox burn pet-command effects:
  - `Fox Bite`: petAttack 5 to 7, Burn 2 to 3.
  - `Fox Flare`: petAttack 3 to 5, Burn 3 to 4.
- Warm Bond modifies the first reducible eligible Ember Fox command cost once per combat:
  - Cost 1 to 0.
  - Does not consume on already-zero-cost `Fox Fetch`.
  - Usage persists across turns in the same combat.
- Ash Instinct triggers on burned enemy defeat during player turn, once per turn per pet instance, only while combat continues.
- Modifier ownership follows resolved pet targets:
  - leading, specific, allActive, randomActive, and withTag ownership paths are supported.
  - randomActive ownership is locked to the same seeded pet target used for effect playback.
- Reward-claimed Burning Fang affects a future combat, proving reward claiming connects to modifier resolution.
- Registry card definitions and upgrade definitions are not mutated by modifier resolution.

## Event Order

Warm Bond on `Fox Bite` is locked by tests as:

```txt
CardPlayed
PetModifierActivated
CardCostModified
PetModifierConsumed
EnergySpent
PetCommanded
DamageDealt
StatusApplied
CardMoved
```

Ash Instinct on non-final burned enemy defeat is locked by tests as:

```txt
CardPlayed
EnergySpent
DamageDealt
CombatantDefeated
PetModifierActivated
PetModifierConsumed
CardMoved
CardDrawn
CardMoved
```

The first `CardMoved` in the Ash Instinct sequence is the existing draw system moving the drawn card from draw pile to hand. The final `CardMoved` moves the played card from hand to discard.

## Non-Goals Confirmed

No reward UI, Phaser UI, Vite UI, React, map generation, save/load, story progression, card upgrade resolution, relics, bosses, production dependencies, or generic scripting engine were implemented.

## Verification

- `npm run typecheck`: passed.
- `npm test`: passed, 21 test files / 195 tests.
- `npm run smoke:localhost`: passed.
  - Latest smoke URL: `http://127.0.0.1:55572/health`.
- `npm audit --audit-level=moderate`: passed, 0 vulnerabilities.
- `git diff --check`: passed.
- Contract copy compare: `git diff --no-index docs/contracts/5-pet-upgrade-modifier-resolution-contract.md docs/contracts/5-pet-upgrade-modifier-resolution.md`: passed.
- Phaser scan: `rg -n "from ['\"]phaser|from ['\"]Phaser|import ['\"]phaser|import ['\"]Phaser" src/game-core`: no matches.
- Direct `Math.random` scan in `src/game-core`: no matches.

## Independent Review

- Code reviewer first pass: NOT GREEN. Blockers were malformed cost modifier validation, unsupported trigger effects being silently ignored, and `temporaryModifierIds` not resolving.
- Fixes applied:
  - Runtime and registry validation now reject invalid `amount`, `minCost`, unknown `limit.type`, and unsupported trigger effects.
  - Trigger modifiers are limited to `draw` effects for this ticket.
  - Temporary modifiers resolve through `registry.petModifiers`, with missing-definition rejection and tests.
- Later code reviewer passes found additional validation hardening gaps. Fixes applied:
  - Trigger draw amounts must be positive integers.
  - Standalone `registry.petModifiers` are validated.
  - Non-array, null, undefined, and malformed modifier/rule/effect entries return validation errors instead of throwing.
  - Runtime and registry validation reject unknown status IDs, malformed selectors, unknown selector pet definitions, explicit undefined optional fields, null/undefined limits, unknown effect types, and non-finite effect amounts.
  - Active upgrade modifier and temporary modifier paths both reject malformed runtime data.
- Code reviewer final pass: GREEN.
- Contract auditor first pass: NOT GREEN due to expected closeout blockers and three required file-list diffs.
- Fixes applied:
  - Added scoped changes to `model/combat.ts`, `systems/effects.ts`, and `testing/reward-fixtures.ts`.
- Contract auditor second pass: GREEN for functional/contract implementation, with only unavoidable final closeout items pending at that time.

## Final Closeout Notes

- Final pushed commit SHA is verified after commit and push and reported in the final handoff; the report commit cannot self-reference its own SHA.
- Review ZIP path is generated from clean `HEAD` by `npm run zip:review` after commit, then reported in the final handoff.
