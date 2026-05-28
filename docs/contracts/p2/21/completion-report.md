# P2/21 Reveal, Scope, Balance, and Intent Completion Report

Date: 2026-05-28
Worktree: `/Users/jamesto/Coding/roguedeckgame`
Base branch: `main`

## Completed Scope

- Implemented data-driven `revealIntent`, `scopeIntent`, and `obscureIntent` effect definitions, builders, descriptors, validation, and combat resolution.
- Kept Read the Ash as a one-step current-plan visibility improvement capped at rough, per the v0.4 content contract.
- Added runtime coverage for explicit `revealIntent` effects without changing Read the Ash semantics.
- Added intent visibility override modes for reveal floors, obscure ceilings, and scoped intent metadata.
- Updated Ash Rewrite to scope the current enemy candidate set instead of improving to exact card text.
- Added enemy obscure intent behaviour to Soot Crow and Cinder Scribe content.
- Added enemy card plan metadata and adaptive finalisation so enemies may change plans inside their planned candidate set at enemy-turn resolution.
- Added enemy card lifecycle events: `EnemyDeckShuffled`, `EnemyCardMoved`, `EnemyPlanCreated`, `EnemyPlanFinalized`, and `EnemyCardResolved`.
- Added runtime `handSize` and `planSlots` fields to enemy card holding state.
- Added `EnemyPlanChanged` events and advanced the game event and trace state hash schemas to version 5.
- Updated Phaser presentation/view-model code to consume scoped candidate data, enemy holding readouts, and plan-change events without moving game rules into Phaser.
- Applied the contract balance intent for Emberroot Warden: 94 HP, Root Slam 13 damage, and Cinder Bark 11 block.
- Bumped the content version to `ashwood-trail-reveal-scope-v4`.
- Added registry validation for monster `cardGame` metadata, including enemy deck ability references, owned abilities, copy counts, hand size, plan slots, default plan mode, default intent visibility, and adaptive rule ids.
- Added regression coverage for scoped Ash Rewrite metadata, adaptive plan finalisation, event schema projection, content authoring coverage, Phaser view-model scoped copy, and workbench versioning.
- Added regression coverage proving stepwise Read the Ash behaviour, explicit reveal effects, effective visibility event levels under obscure ceilings, adaptive finalisation candidate-set rejection, enemy lifecycle events, and authored enemy obscure runtime caps.

The supplied `reveal_scope_balance_intent_v0_4.patch` could not be applied directly because it targets older root documents and already-diverged files. I treated the patch and the two v0.4 contract documents as the requirements source and implemented the scope manually against the current codebase.

## Evidence

Key implementation areas:

```txt
src/game-core/model/effect.ts
src/game-core/model/combat.ts
src/game-core/model/event.ts
src/game-core/systems/effects.ts
src/game-core/systems/intent-visibility.ts
src/game-core/systems/monster-intents.ts
src/game-core/systems/combat.ts
src/game-core/data/cards/reward-cards.ts
src/game-core/data/monsters/forest-monsters.ts
src/game-core/data/balance/act1-normal.ts
src/game-phaser/view-models/combat-view-model.ts
src/game-phaser/animation/*
```

Focused test updates:

```txt
tests/game-core/combat-play-card.test.ts
tests/game-core/combat-intents.test.ts
tests/game-core/model-shape.test.ts
tests/game-core/registry.test.ts
tests/game-core/content-authoring.test.ts
tests/game-core/content-workbench.test.ts
tests/game-core/trace-replay.test.ts
tests/game-phaser/combat-view-model.test.ts
tests/game-phaser/content-workbench-ui.test.ts
```

## Validation

Latest passing gates:

```txt
npm run typecheck                          PASS
npm test -- targeted P2/21 suites          PASS - 5 files / 114 tests
npm test                                   PASS - 110 files / 860 tests
npm run build                              PASS
npm run build:cli                          PASS
npm run smoke:localhost                    PASS - http://127.0.0.1:53245/health
npm run test:integration                   PASS - 2 files / 4 tests
npm run sim:smoke -- --trace-output tests/game-core/traces/smoke-complete.json
                                            PASS - 3 runs / 0 failures
npm run sim:balance                        PASS - 200 fuzz runs / 0 failures / 45.0% completion
```

Balance target:

```txt
Target completion range: 45.0% - 60.0%
Observed completion rate: 45.0%
Content version: ashwood-trail-reveal-scope-v4
Registry fingerprint: fnv1a32:76f97442
Event schema: 5
Trace schema: 5
```

## Review ZIP Policy Check

`scripts/create-review-zip.mjs` excludes archived phase-contract folders `docs/contracts/p1`, `docs/contracts/p1.5`, and `docs/contracts/p2` from review ZIPs while leaving those folders eligible for normal git tracking. That matches the current policy for this task: P2 contract artefacts belong in git, but are excluded from generated review ZIP artefacts.

## Independent Review Status

- Independent code review: GREEN after final validation/doc fixes.
- Independent contract audit: GREEN after final validation/doc fixes.
