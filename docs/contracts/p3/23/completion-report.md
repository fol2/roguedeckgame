# p3/23 Completion Report

Date: 2026-05-28
Scope: v0.5 first playable combat slice hard cut.

## Implementation Summary

- Added shared `CombatState.cardActors` authority for player and enemy card zones, resources, and plans.
- Kept legacy top-level player piles and monster card state as projections from `cardActors`.
- Changed player end turn to retain unplayed hand cards by default.
- Moved player draw/play/energy paths to the player Card Actor authority.
- Added enemy Card Actor resource profiles, deck costs, deterministic held-card planning, and multi-card planned sequence execution.
- Added leader/team planning metadata and deterministic team execution order for leader-controlled encounters.
- Added a player-action replan checkpoint that updates enemy plan readouts only when semantic plans change.
- Removed scheduled intent scripts as the first-playable enemy action source.
- Added sequence legality checks for enemy card costs against actor energy refill.
- Aligned Ashwood Trail enemy deck copies/missing cards with the content contract, then tuned strict balance to the configured normal target.
- Added a runtime `next_attack_boost` setup status so Ember Sap, Paw the Ash, and Ash Bloom have tested next-attack behaviour.
- Made enemy-owned `draw` effects draw from the source enemy Card Actor, covering Borrowed Line without touching the player's deck.
- Implemented Warden Command as a simple team Block effect while keeping leader/team order planning as the main directive.
- Copied the engineering contract into canonical `docs/engineering_contract_v0_5.md`.
- Added `card-actor-runtime.ts` and `enemy-ai.ts` entrypoints that route to the implemented Card Actor/runtime systems.

## Contract Evidence

- `createCombat` creates player and enemy Card Actors by default.
- `createCombat` rejects monsters without v0.5 `cardGame` data.
- Enemy planning selects from already-held actor cards, not draw/discard hidden zones.
- Existing enemy actors with empty hands draw `drawPerTurn`, not `openingHandSize`.
- Enemy turns resolve every legal planned card in order and emit per-card resolution/movement events.
- Enemy planned sequences over actor energy refill reject with `insufficient_enemy_energy`.
- Leader enemies can create deterministic team order via `enemyPlanOrder`, and enemy turns obey the latest alive-monster order.
- If a leader is defeated before enemy action, the action order degrades to surviving legal plan parts.
- Player card actions can recompute enemy/team plans after resolution without a new draw/refill.
- First-playable scheduled intent metadata no longer chooses enemy actions.
- Ashwood Trail enemy deck copies include the contracted Slime Tackle x3, Cinder Dust x2, Soot Crow Flutter x2, Charred Stag Guarded Snort x2, Cinder Scribe Borrowed Line, and Emberroot Warden Root Bind/Warden Command cards.
- Setup cards are no longer empty placeholders: Borrowed Line draws one enemy card, Ember Sap/Paw the Ash/Ash Bloom apply `next_attack_boost`, and Warden Command grants allied Block.

Balance tuning note:

- Charred Stag and Emberroot Warden keep the contracted card/resource/cost/deck shape, but suggested elite/boss numbers were tuned for the strict simulation target after setup effects became live: Charred Stag HP 50; Emberroot Warden HP 70, Root Slam 10, Cinder Bark 8 Block, Old Flame 1 Burn.

## Validation

- `npm run typecheck`: passed.
- `npm run build`: passed.
- `npm run build:cli`: passed.
- `npm run test:core`: 60 files / 584 tests passed.
- `npm test`: 110 files / 876 tests passed.
- `npm run test:integration`: 2 files / 4 tests passed.
- `npm run test:phaser`: 46 files / 271 tests passed.
- `npm run sim:smoke -- --max-steps 500`: 3 runs, 0 failures, passed.
- `npm run sim:smoke -- --max-steps 500 --trace-output tests/game-core/traces/smoke-complete.json`: passed and regenerated committed trace.
- `npm run sim:balance`: 200 runs, 0 failures, completion 46.0%, loss 54.0%, strict health passed.
- `npm run smoke:localhost`: 1 file / 1 test passed, health URL `http://127.0.0.1:58054/health`.
- Static checks passed: canonical contract `cmp`, no scheduled-intent action source in `monster-intents.ts`, no Phaser import in `src/game-core`, and `git diff --check`.

## Localhost Preview Evidence

- Preview server: `http://127.0.0.1:4174/`.
- `curl -fsS -D /tmp/roguedeckgame-preview.headers http://127.0.0.1:4174/ -o /tmp/roguedeckgame-preview.html`: HTTP 200.
- Preview HTML included `<title>Pet Roguelite Deckbuilder</title>`, `/assets/index-S6pmIthD.js`, `/assets/index-C3SUpnFv.css`, and `<div id="game-root"></div>`.

Browser screenshot automation was not available in this local environment: `playwright`, `@playwright/test`, `chromium`, `google-chrome`, and `gstack` were not installed. The deployed preview was still verified by HTTP and asset inspection, and the Phaser/view-model tests passed.

## Review Loop

Initial independent subagent review returned RED on enemy sequence execution, scheduled intent action-source leakage, opening draw timing, missing canonical artifacts, and missing completion evidence.

Resolved items:

- Enemy turns now execute a full planned Card Actor sequence rather than only the first card.
- Planned cards are discarded one by one after resolution.
- Sequence cost legality is enforced.
- Existing enemy actors no longer receive opening-hand draw on later planning windows.
- Scheduled intent scripts no longer override Card Actor planning.
- Leader/team planning, player-action replanning, and Ashwood Trail deck alignment blockers were resolved after final RED review.
- Setup-card effect drift from final RED review was resolved with tested enemy draw, next-attack boost, and team Block runtime effects.
- Canonical engineering contract and expected runtime/AI module entrypoints were added.
- This completion report captures validation and localhost evidence.

Residual note:

- Enemy `intentPool` remains as metadata used to map card-backed monster abilities to UI intent IDs and presentation text. It is not used as the first-playable action source.
