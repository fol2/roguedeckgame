# Game-Core Combat MVP Completion Report

## Summary

Implemented the deterministic game-core Combat MVP from `docs/contracts/2-game-core-combat-mvp.md`.

The implementation stays inside `src/game-core`, tests, and docs. It adds card instances, combat state, draw/hand/discard piles, energy, basic card play, effect resolution, pet-command resolution, turn helpers, serializable events, and focused Vitest coverage.

## Changed file tree

```txt
docs/contracts/2-combat-mvp-completion-report.md
docs/contracts/2-combat-mvp.md
docs/contracts/2-game-core-combat-mvp.md
docs/plans/2026-05-25-003-combat-mvp-plan.md
src/game-core/ids.ts
src/game-core/index.ts
src/game-core/model/action.ts
src/game-core/model/combat.ts
src/game-core/model/event.ts
src/game-core/model/status.ts
src/game-core/systems/combat.ts
src/game-core/systems/draw.ts
src/game-core/systems/effects.ts
src/game-core/testing/combat-fixtures.ts
src/game-core/testing/fixtures.ts
tests/game-core/combat-create.test.ts
tests/game-core/combat-draw.test.ts
tests/game-core/combat-pet-command.test.ts
tests/game-core/combat-play-card.test.ts
tests/game-core/combat-turn.test.ts
tests/game-core/model-shape.test.ts
```

## Verification

```txt
npm run typecheck
Result: passed

npm test
Result: passed, 9 test files, 55 tests

npm run smoke:localhost
Result: passed
Observed localhost URL: http://127.0.0.1:49433/health

npm audit --audit-level=moderate
Result: passed, found 0 vulnerabilities

npm ls --depth=0
Result: direct dependencies are dev-only TypeScript and Vitest
```

Source inspections:

```txt
rg -n "from ['\"]phaser|from ['\"]Phaser|import ['\"]phaser|import ['\"]Phaser" src/game-core
Result: no matches

rg -n "Math\.random|if \(card\.name|card\.name ===|monster AI|reward selection|save/load|map generation" src/game-core tests/game-core
Result: no matches
```

## Contract confirmations

- No Phaser dependency was added.
- `src/game-core` contains no Phaser imports.
- No production dependencies were added.
- Combat piles use `CardInstanceId[]`: `drawPile`, `hand`, `discardPile`, and `exhaustPile`.
- Card playback events include `cardInstanceId` where relevant: `CardPlayed`, `CardDrawn`, `CardMoved`, and `PetCommanded`.
- `RunState` still uses `activePetInstanceIds: readonly PetInstanceId[]`.
- Novice Tamer remains data-limited to one active pet through `maxActivePets: 1` and `petSlotCount: 1`.
- Multi-pet fixtures and tests exist in `src/game-core/testing/combat-fixtures.ts` and `tests/game-core/combat-pet-command.test.ts`.
- Invalid gameplay returns `ok: false`, `ActionRejected`, serializable errors, and the original state where an original state exists.
- `createCombat` returns `GameActionResult<CombatState>` and uses a `"not_started"` combat state for creation failures.
- `CombatStatusState` lives in `src/game-core/model/status.ts`.
- No Phaser, Vite UI, React, monster AI, full enemy turn, map generation, reward selection, save/load, story progression, card upgrade, pet upgrade modifier resolution, or art assets were implemented.

## Review status

Initial independent reviews were RED and were treated as blocking.

Fixes applied:

- Made `playCard` transactional for effect-time failures.
- Added regression coverage for effect-time failure immutability.
- Defined lethal follow-up semantics: target effects after a target is defeated skip that dead target rather than rejecting the whole card.
- Added lethal `Fox Bite` and lethal multi-effect regression coverage.
- Added direct `card_not_in_hand` rejection coverage.
- Aligned `createCombat` with `GameActionResult<CombatState>`.
- Moved `CombatStatusState` into `src/game-core/model/status.ts`.

Final independent review status will be recorded after the committed/pushed revision is re-audited.

## Commit

Implementation commit SHA: `669de5ad3ed8317c026b68f7bf53b3aa8b07c6da`

Final pushed HEAD is recorded in the final delivery note because a commit cannot contain its own final hash without changing that hash.
