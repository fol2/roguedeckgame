# Hardening Debug Screen Evidence

## Phase 4 - Visual-State Parity Diagnostics

Date: 2026-05-27

Validation commands:

- `npm run typecheck` - passed.
- `npx vitest run tests/game-phaser/combat-parity.test.ts tests/game-phaser/combat-presenter-parity-snapshot.test.ts tests/game-phaser/card-presenter.test.ts tests/game-phaser/combat-debug-overlay.test.ts tests/game-phaser/debug-view-model.test.ts tests/game-phaser/combat-scene-boundary.test.ts` - passed, 6 files and 37 tests.
- `npm run build` - passed with no warnings after Phaser vendor chunk splitting.
- `npm test` - passed, 86 files and 679 tests.
- `npm run smoke:localhost` - passed.
- `git diff --check` - passed.
- `rg -n "from ['\"](.*phaser|phaser)['\"]|from \"phaser\"|from 'phaser'" src/game-core` - no matches.

Browser proof:

- `phase4-parity-overlay-combat.png` - development-only combat debug overlay showing parity diagnostics with `Parity: ok`.
- `phase4-parity-overlay-after-play.png` - overlay after playing a card, showing updated playback, hand, pile, monster HP, and `Parity: ok`.
- `phase4-console-warnings.txt` - Playwright console collection for the Phase 4 browser path, with zero errors and zero warnings.

Reviewer follow-up:

- Correctness review found transient hand-count false positives, orphan card false negatives, and HP/block snapshots that copied view-model inputs. The implementation was revised to count expected hand cards through valid transient states, keep stale non-moving visuals as hand-zone snapshots, and derive HUD/monster snapshots from rendered text labels.
- Contract review additionally required rendered pile-label snapshots and an evidence index. The HUD pile parity snapshot now reads the rendered count labels, and this file records the Phase 4 validation artefacts.

## Phase 5 - Draw and Discard Animation Hardening

Date: 2026-05-27

Validation commands:

- `npm run typecheck` - passed.
- `npx vitest run tests/game-phaser/combat-scene-boundary.test.ts tests/game-phaser/combat-event-player.test.ts tests/game-phaser/combat-event-fx-presenter.test.ts tests/game-phaser/combat-playback-policy.test.ts tests/game-phaser/card-presenter.test.ts tests/game-core/combat-draw.test.ts tests/game-core/combat-turn.test.ts` - passed, 7 files and 60 tests.
- `npm run build` - passed with no warnings.
- `npm test` - passed, 86 files and 684 tests.
- `npm run smoke:localhost` - passed.
- `git diff --check` - passed.

Browser proof:

- `phase5-draw-discard-initial.png` - combat overlay before ending the turn.
- `phase5-draw-discard-after-end-turn.png` - overlay after end-turn playback, showing turn 2, `DeckShuffled`, card movement playback observations, updated piles, and `Parity: ok`.
- `phase5-console-warnings.txt` - Playwright console collection for the Phase 5 browser path, with zero errors and zero warnings.
