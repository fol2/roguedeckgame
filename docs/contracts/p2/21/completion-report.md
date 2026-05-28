# P2/21 Reveal, Scope, Balance, and Intent Completion Report

Date: 2026-05-28
Worktree: `/Users/jamesto/Coding/roguedeckgame`
Base branch: `main`

## Completed Scope

- Implemented data-driven `revealIntent`, `scopeIntent`, and `obscureIntent` effect definitions, builders, descriptors, validation, and combat resolution.
- Updated Read the Ash to use the formal `revealIntent` content path for rough current-plan reads.
- Added intent visibility override modes for reveal floors, obscure ceilings, and scoped intent metadata.
- Updated Ash Rewrite to scope the current enemy candidate set instead of improving to exact card text.
- Added enemy obscure intent behaviour to Soot Crow and Cinder Scribe content.
- Added enemy card plan metadata and adaptive finalisation so enemies may change plans inside their planned candidate set at enemy-turn resolution.
- Added `EnemyPlanChanged` events and advanced the game event and trace state hash schemas to version 5.
- Updated Phaser presentation/view-model code to consume scoped candidate data, enemy holding readouts, and plan-change events without moving game rules into Phaser.
- Applied the contract balance intent for Emberroot Warden: 94 HP, Root Slam 13 damage, and Cinder Bark 11 block.
- Bumped the content version to `ashwood-trail-reveal-scope-v4`.
- Added regression coverage for scoped Ash Rewrite metadata, adaptive plan finalisation, event schema projection, content authoring coverage, Phaser view-model scoped copy, and workbench versioning.
- Added regression coverage proving adaptive finalisation rejects actions outside the planned candidate set and that authored enemy obscure effects cap visibility at runtime.

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
npm test -- targeted P2/21 suites          PASS - 6 files / 104 tests
npm test                                   PASS - 110 files / 856 tests
npm run build                              PASS
npm run build:cli                          PASS
npm run smoke:localhost                    PASS - http://127.0.0.1:50981/health
npm run test:integration                   PASS - 2 files / 4 tests
npm run sim:smoke -- --trace-output tests/game-core/traces/smoke-complete.json
                                            PASS - 3 runs / 0 failures
npm run sim:balance                        PASS - 200 fuzz runs / 0 failures / 55.5% completion
```

Balance target:

```txt
Target completion range: 45.0% - 60.0%
Observed completion rate: 55.5%
Content version: ashwood-trail-reveal-scope-v4
Registry fingerprint: fnv1a32:fa7f9782
Event schema: 5
Trace schema: 5
```

## Review ZIP Policy Check

`scripts/create-review-zip.mjs` excludes archived phase-contract folders `docs/contracts/p1`, `docs/contracts/p1.5`, and `docs/contracts/p2` from review ZIPs while leaving those folders eligible for normal git tracking. That matches the current policy for this task: P2 contract artefacts belong in git, but are excluded from generated review ZIP artefacts.

## Independent Review Status

- Independent code review: GREEN after blocker fixes.
- Independent contract audit: GREEN after blocker fixes.
