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

## Phase 8 - Full Bundle, Evidence, and Review

Date: 2026-05-27

Validation commands:

- `phase8-test-bundle.txt` records `npm run typecheck`, `npm run build`, `npm run build:cli`, `npm test`, and `npm run smoke:localhost` passing. The full test run covered 88 files and 700 tests.
- `phase8-cli-bundle.txt` records the final CLI bundle passing: `npm run game:cli -- --help`, `npm run game:cli -- --version`, `npm run game:cli -- --seed cli-dev --auto`, `npm run game:cli -- --seed cli-dev --json --auto`, `node scripts/run-cli-entry.mjs game-cli --seed cli-dev --json --auto`, and `node dist-cli/game-cli.mjs --seed cli-dev --json --auto`.
- `phase8-simulation-bundle.txt` records `node scripts/run-cli-entry.mjs simulate-runs --mode smoke --analyze`, `node scripts/run-cli-entry.mjs simulate-runs --mode replay --trace tests/game-core/traces/smoke-complete.json`, `npm run sim:balance`, and `npm run sim:exhaustive-small` passing. The balance run covered 200 runs with no failures; exhaustive-small covered 1000 runs with no failures.
- `phase8-browser-trace-replay.txt` records `node scripts/run-cli-entry.mjs simulate-runs --mode replay --trace docs/evidence/hardening-debug-screen/phase8-browser-debug-trace.json` passing for the exported browser debug trace.
- `phase8-repository-hygiene.txt` records `git diff --check` passing, current branch/status output, and no `phaser` matches in `src/game-core`.

Browser proof:

- `phase8-browser-combat-overlay.png` - development combat debug overlay showing runtime metadata, trace/save schema versions, input state, event summary, playback observations, and parity status.
- `phase8-browser-after-click-card.png` - browser path after playing a Strike through mouse card selection and keyboard target confirmation.
- `phase8-browser-after-drag-drop.png` - browser path after drag/drop playing a second Strike onto the monster target marker.
- `phase8-browser-after-end-turn-draw-discard.png` - browser path after End Turn, showing ordered discard/draw playback, turn 2, updated piles, and parity status.
- `phase8-browser-trace-export-feedback.png` - overlay after pressing `F8`, showing the debug trace export feedback.
- `phase8-browser-debug-trace.json` - exported browser debug trace with runtime metadata, four replayable actions (`selectMapNode`, `playCard`, `playCard`, `endTurn`), four event batches, final run summary, diagnostics, and replay conversion command.
- `phase8-browser-console-warnings.txt` - Playwright console collection for the Phase 8 browser path. It records two expected debug playback fallback warnings and zero unexpected browser errors.

Reviewer follow-up:

- The final browser path intentionally leaves debug playback fallback warnings visible in the console and exported trace diagnostics. They are expected development diagnostics from the debug layer, not silent runtime failures, and the exported trace replays successfully through the simulation CLI.

## Phase 9 - Content Workbench UI MVP

Date: 2026-05-27

Validation commands:

- `phase9-test-bundle.txt` records `npm run typecheck`, `npm run build`, `npm run build:cli`, `npm test`, and `npm run smoke:localhost` passing. The full test run covered 89 files and 706 tests.
- `phase9-cli-simulation-bundle.txt` records the final CLI and simulation bundle passing: CLI version, source CLI auto JSON run, built CLI auto JSON run, simulation version, simulation smoke analysis, replay of `tests/game-core/traces/smoke-complete.json`, `npm run sim:balance`, and `npm run sim:exhaustive-small`. The balance run covered 200 runs with no failures; exhaustive-small covered 1000 runs with no failures.
- `phase9-repository-hygiene.txt` records `git diff --check` passing, no `phaser` matches in `src/game-core`, and current branch/status output.
- `npx vitest run tests/game-core/content-workbench.test.ts tests/game-phaser/content-workbench-ui.test.ts tests/game-phaser/app-entry.test.ts tests/game-phaser/phaser-boundary.test.ts` passed during focused workbench verification, covering 4 files and 21 tests.

Browser proof:

- `phase9-workbench-overview.png` - local read-only content workbench at `?workbench=content`, showing all 14 registry collections, runtime metadata, diagnostics counts, and JSON preview.
- `phase9-workbench-filter-diagnostics.png` - Monsters collection filtered to `warden`, with structured diagnostics tab open and zero registry, level authoring, dependency, missing-reference, or unused-content issues.
- `phase9-workbench-reports.png` - reports tab showing content and level authoring metrics sourced from the core workbench view model.
- `phase9-workbench-mobile.png` - portrait viewport proof for the workbench header, summary metrics, and collection navigation reflow.
- `phase9-workbench-mobile-detail.png` - portrait full-page proof for the filtered item list, selected item metadata, tabs, diagnostics panel, and dependency diagnostics copy after single-column reflow.
- `phase9-browser-console-warnings.txt` - Playwright console collection for the Phase 9 browser path, with zero errors and zero warnings.

Reviewer follow-up:

- The app entry now keeps Phaser behind a dynamic import. The content workbench route loads `src/app/content-workbench.ts` separately and consumes `buildContentWorkbenchViewModel(starterRegistry)` without importing Phaser or calling gameplay resolvers.
