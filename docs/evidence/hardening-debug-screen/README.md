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

## Phase 6 - Input Race and Request Hardening

Date: 2026-05-27

Validation commands:

- `npm run typecheck` - passed.
- `npx vitest run tests/game-phaser/combat-action-submission.test.ts tests/game-phaser/combat-interaction-state.test.ts tests/game-phaser/run-controller.test.ts tests/game-phaser/debug-view-model.test.ts tests/game-phaser/combat-debug-overlay.test.ts tests/game-phaser/combat-scene-boundary.test.ts tests/game-core/agent-run-driver.test.ts` - passed, 7 files and 55 tests.
- `npm run build` - passed with no warnings.
- `npm test` - passed, 87 files and 693 tests.
- `npm run smoke:localhost` - passed.
- `git diff --check` - passed.
- `rg -n "from ['\"](.*phaser|phaser)['\"]|from \"phaser\"|from 'phaser'" src/game-core` - no matches.

Browser proof:

- `phase6-input-hardening-initial.png` - run map before entering combat.
- `phase6-input-hardening-combat.png` - combat debug overlay showing input ready state, no pending request, no rejection, and no parity drift.
- `phase6-input-hardening-locked-playback.png` - overlay captured during accepted End Turn playback, showing `Input: locked playback`, the disabled End Turn control, and the active request (`combat-ui-1`).
- `phase6-input-hardening-after-double-end-turn-v2.png` - overlay after a double End Turn interaction has settled, showing only one accepted request (`last=combat-ui-1 exp=1`), turn 2, revision 2, cleared disabled feedback, and no rejection or parity drift.
- `phase6-request-rejection-diagnostics.json` - automated evidence index for stale revision, duplicate request, and input-locked overlay assertions.
- `phase6-console-warnings.txt` - Playwright console collection for the Phase 6 browser path, with zero errors and zero warnings.

## Phase 7 - Trace Export and Replay Support

Date: 2026-05-27

Validation commands:

- `npm run typecheck` - passed.
- `npx vitest run tests/game-phaser/debug-trace-export.test.ts tests/game-core/trace-replay.test.ts tests/game-phaser/run-controller.test.ts tests/game-phaser/combat-scene-boundary.test.ts tests/game-cli/parse.test.ts` - passed, 5 files and 48 tests.
- `npm run sim:replay -- -- --trace docs/evidence/hardening-debug-screen/phase7-browser-debug-trace.json` - passed with no warnings.
- `npm run build` - passed with no warnings.
- `npm test` - passed, 88 files and 699 tests.
- `npm run smoke:localhost` - passed.
- `npm run build:cli` - passed with no warnings.
- `node scripts/run-cli-entry.mjs game-cli --version` - passed and matched shared runtime metadata.
- `node scripts/run-cli-entry.mjs simulate-runs --version` - passed and matched shared runtime metadata.
- `node scripts/run-cli-entry.mjs simulate-runs --mode smoke --analyze` - passed with no health issues.
- `npm run sim:balance` - passed with completion rate inside the configured balance target.
- `npm run sim:exhaustive-small` - passed, 1000 runs and zero failures.
- `git diff --check` - passed.
- `rg -n "from ['\"](.*phaser|phaser)['\"]|from \"phaser\"|from 'phaser'" src/game-core` - no matches.

Browser proof:

- `phase7-debug-trace-export-overlay.png` - combat debug overlay after pressing the debug trace export control (`F8`), showing the copied trace feedback.
- `phase7-normal-combat-after-card.png` - normal combat proof after playing a card with the debug overlay enabled.
- `phase7-browser-debug-trace.json` - browser-exported debug trace JSON with runtime metadata, event batches, final run summary, diagnostics, and replay conversion command.
- `phase7-cli-provenance-and-replay.txt` - CLI version/provenance output and replay output for the exported browser debug trace.
- `phase7-console-warnings.txt` - Playwright console collection for the Phase 7 browser path, with zero errors and zero warnings.
