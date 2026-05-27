---
title: Hardening and Debug Screen Programme Plan
type: hardening
status: proposed
date: 2026-05-27
---

# Hardening and Debug Screen Programme Plan

## Summary

This programme hardens the current playable TypeScript, Vite, Phaser 4 roguelite first, then uses that hardened foundation for the next scoped engine and UI readiness tracks. The initial work should make combat, input, animation, run simulation, and CLI behaviour observable and reproducible. Later tracks can add editor/workbench UI, planned monster-card UX, deeper status rules, multi-pet proof, and balance-report UX only after the hardening gates are green.

The expected execution window is 8+ hours for the hardening foundation and longer for the full expanded programme. It should run as a goal-driven implementation with phase gates, review after each major unit, and full validation before moving to the next track.

## Problem Frame

Recent refactors made the engine more data-driven and easier to expand, but debugging still relies too much on visual observation, console warnings, and manual interpretation of event batches. This is risky because the hardest bugs now sit between systems:

- core emits correct events but Phaser animates from the wrong origin;
- event playback falls back silently and the player only sees a visual mismatch;
- draw/discard order is correct in `GameEvent[]` but the final hand snapshot appears instantly;
- input can race animation playback, duplicate requests, or stale combat revisions;
- CLI and browser paths can drift if they do not report and validate the same runtime version, registry, trace schema, and simulation assumptions.

The next work should therefore focus on observability, hardening, and parity, not on new cards, monsters, effects, or balance changes.

## Scope

In scope:

- Development-only combat debug screen and overlay.
- Event playback inspector for every combat event batch.
- Visual-state parity diagnostics after actions and after animation settle.
- Draw/discard animation hardening for one-by-one state-visible movement.
- Input race and stale revision hardening.
- Runtime warning capture in the debug surface.
- Trace export and replay support for reproducing browser issues in simulation.
- CLI/runtime version provenance so browser, CLI, simulation, and tests can prove they use the same main code and content metadata.
- Evidence documentation with screenshots, command output summaries, and browser proof.
- Read-only local content workbench UI MVP after the hardening foundation is green.
- Monster planned-card UX after planned ability diagnostics and event playback are stable.
- Buff, debuff, and status engine hardening after event-order and simulation coverage are ready.
- Multi-pet readiness proof after debug/parity tools can expose pet slot and command routing state.
- Balance dashboard/report UX after CLI simulation metadata and balance reports are aligned.

Out of scope:

- New gameplay content during the hardening foundation phases.
- Large content-pack expansion unrelated to the readiness tracks.
- Full card, monster, level, player, pet, buff/debuff write editor.
- Moving gameplay rules into Phaser.
- Remote telemetry or hosted analytics.
- Production player-facing debug UI.

## Expanded In-Scope Roadmap

The following tracks are in scope for the expanded programme, but they must run only after the hardening foundation is green. They should not be mixed into the same phase as debug infrastructure because that would make regressions harder to isolate. Each track needs its own implementation, review, test, simulation, browser proof, evidence update, commit, and merge/fast-forward gate.

### R1. Content Workbench UI MVP

Build a local read-only editor/workbench for authored content. It should let developers inspect cards, monsters, monster abilities, encounters, reward pools, statuses, and pets; show diagnostics, missing references, unused content, and dependency warnings; and provide JSON preview for each selected item. The first version should consume the existing Phase 7 content workbench foundation and stay read-only. Write/edit controls remain out of scope for this programme.

**Acceptance:** The workbench lists every existing registry collection above, shows diagnostics without parsing formatted strings, exposes JSON preview, has no gameplay resolver calls in the UI, and passes typecheck, build, focused workbench tests, full tests, CLI simulation bundle, and browser proof.

### R2. Monster Planned Card UX

Turn enemy intent display into a clearer "monster planned card" concept. Monsters already have planned abilities; the next UX layer can present that plan as a card-like enemy action. Later player abilities may peek, reveal, or modify the monster's next planned play. This should build on planned monster ability metadata, not reintroduce Phaser-side monster logic.

**Acceptance:** Enemy intent can render from planned monster ability metadata as a card-like planned action; reveal/hidden policy is explicit; no monster logic moves into Phaser; tests cover planned metadata, fallback metadata, event order, view model output, and browser proof.

### R3. Buff, Debuff, and Status Engine Round

Deepen the status engine for long-term card design. This work should cover stacking rules, duration rules, trigger timing, cleanse, consume, preview text, AI/simulation reporting, and status-specific UI/debug copy. This is a gameplay-engine expansion and must carry its own core event-order tests.

**Acceptance:** Status behaviours are data-driven, event ordered, deterministic, and simulation-visible; cleanse/consume/expiry paths emit typed events; preview/debug copy comes from descriptors; no card-name-specific logic is introduced.

### R4. Multi-Pet Readiness Proof

Run a controlled proof that the game can support more than one active pet without hidden single-pet assumptions. The proof should cover two active pet slots, targeting, pet-command routing, UI layout, save/load, simulation, and debug visibility. It does not need to deliver full three-pet gameplay, but it should prove the engine model remains collection-based.

**Acceptance:** A deterministic two-pet test run can create combat, route pet commands, save/load, simulate, and render debug state without assuming a single pet. Multi-pet UI can remain prototype-level but must expose slot identity and command routing clearly.

### R5. Balance Dashboard and Report UX

Convert the existing CLI balance report into a workbench/debug-facing view. It should make encounter win rate, damage taken, reward pick rate, monster ability frequency, run paths, and health warnings easier to scan. This should reuse simulation output rather than inventing a second balance-reporting path.

**Acceptance:** The dashboard reads the same aggregate report shape as CLI simulation, displays the key metrics above, includes runtime/content metadata, and has tests proving CLI and dashboard summaries do not drift.

## Architecture Rules

- `src/game-core` must not import Phaser.
- Game rules stay in `src/game-core`; debug UI must only observe state, events, diagnostics, and view models.
- Phaser may render debug surfaces, capture presenter observations, and play animations from `GameEvent[]`.
- Debug tools must not decide card legality, target legality, monster ability resolution, reward resolution, or encounter progression.
- Randomness in core and simulation must remain seeded.
- CLI, browser, and simulation must consume the same current registry and version/provenance metadata.

## Programme Goals

### G1. Make combat state inspectable

At any combat point, a developer should be able to see seed, run status, combat phase, turn, revision, energy, hand, draw pile, discard pile, selected card, drag state, valid targets, monster planned abilities, current input lock, and recent warnings.

### G2. Make event playback inspectable

Every `GameEvent` should have a playback policy and an observation record: whether it was animated, log-only, state-sync-only, skipped, unknown, timed out, or recovered through fallback.

### G3. Make visual/state drift visible

After each action and after each playback batch, diagnostics should identify mismatches between core/view model state and Phaser presenters, especially hand, draw pile, discard pile, card locations, player HP/block, monster HP/block, and selected/dragged card state.

### G4. Make draw/discard sequence reliable

Discard and draw animation should follow event order. A turn that discards two cards and draws four cards should visibly move two cards away, then reveal card one, card two, card three, and card four in sequence.

### G5. Make input races non-destructive

Duplicate submits, stale revisions, locked input, drag/click overlap, and action attempts during playback must never mutate state twice or create visual ambiguity.

### G6. Make browser issues reproducible in CLI/simulation

The debug screen should allow copying/exporting enough seed, action, event, and state information for a failing browser interaction to become a trace or focused test.

### G7. Keep CLI version aligned with main code

The CLI, simulation CLI, browser runtime, and tests should expose and validate the same runtime provenance: package version, content version, trace schema version, registry fingerprint or equivalent content identity, and build/git metadata when available. The CLI must not report stale or independent version information.

## Key Decisions

- **Debug screen first, editor later:** The workbench/editor foundation remains separate. This plan is for runtime debugging and hardening, not content authoring.
- **Observation over mutation:** Debug tools observe state and event playback. They do not repair gameplay state at runtime.
- **Structured diagnostics over formatted strings:** Debug data should be machine-testable first and rendered second.
- **Event playback policy is explicit:** Unknown events may continue safely, but they must be visible as diagnostics.
- **CLI alignment is a required acceptance gate:** Browser and CLI validation should prove they are built from the same source and content metadata.

## Tickets

### HD-00. Runtime Provenance and CLI Alignment

**Goal:** Add or formalise a shared runtime provenance surface used by browser, game CLI, simulation CLI, and tests.

**Likely files:**

- `src/game-core/model/runtime-metadata.ts`
- `src/game-core/data/registry.ts`
- `src/game-cli/main.ts`
- `src/game-cli/simulate-runs.ts`
- `src/game-phaser/view-models/run-view-model.ts`
- `tests/game-cli/version.test.ts`
- `tests/game-core/runtime-metadata.test.ts`
- `tests/game-phaser/run-view-model.test.ts`
- `package.json`

**Tasks:**

- Define current runtime metadata in one shared location.
- Include package version, content version, trace schema version, save schema version if already exported, and registry/content identity.
- Add CLI output for `--version` or include version metadata in `--help` and JSON output.
- Add simulation CLI output for the same metadata when running smoke, replay, analysis, and balance modes.
- Add browser/debug view model access to the same metadata.
- Ensure built CLI output and `scripts/run-cli-entry.mjs` output agree.

**Acceptance:**

- `npm run game:cli -- --version` or equivalent reports the same package/content/runtime metadata as browser debug view model.
- `node scripts/run-cli-entry.mjs simulate-runs --mode smoke --analyze` reports the same content/runtime metadata.
- Tests fail if CLI metadata drifts from the shared main-code metadata.
- No independent hardcoded CLI version string exists outside the shared metadata source.

### HD-01. Debug State View Model

**Goal:** Build a stable debug view model for run, combat, input, event, warning, and metadata state.

**Likely files:**

- `src/game-phaser/view-models/debug-view-model.ts`
- `src/game-phaser/controllers/RunSandboxController.ts`
- `src/game-phaser/view-models/combat-view-model.ts`
- `tests/game-phaser/debug-view-model.test.ts`
- `tests/game-phaser/combat-controller.test.ts`

**Tasks:**

- Expose seed, run status, current node, combat phase, turn number, revision, energy, selected card, drag state, input lock, pending request id, and latest events.
- Expose hand, draw pile, discard pile, monster summaries, player summary, pets, planned monster abilities, and `uiWarnings`.
- Include runtime provenance from HD-00.
- Keep the model serialisable and renderer-agnostic.

**Acceptance:**

- Debug view model can be built in map, combat, reward, completed, and lost states.
- Building the model never mutates state.
- Missing combat state produces a useful debug state instead of throwing.
- Tests assert key fields and serialisability.

### HD-02. Combat Debug Overlay V1

**Goal:** Render the debug state in a development-only combat overlay.

**Likely files:**

- `src/game-phaser/presenters/CombatDebugOverlayPresenter.ts`
- `src/game-phaser/scenes/CombatScene.ts`
- `src/game-phaser/layout/combat-layout.ts`
- `tests/game-phaser/combat-debug-overlay.test.ts`
- `tests/game-phaser/combat-scene-boundary.test.ts`

**Tasks:**

- Enable by query parameter, local debug flag, or keyboard toggle.
- Show compact panels for runtime metadata, run/combat state, input state, piles, selected card, target state, monster plans, warnings, and recent events.
- Ensure the overlay does not block normal card drag/click unless pointer focus is inside the overlay.
- Keep visual styling utilitarian and dense.

**Acceptance:**

- Overlay is hidden by default.
- Overlay can be toggled in combat.
- Overlay updates after card play, drag/drop, end turn, draw, discard, reward transition, and reset.
- Browser proof includes a screenshot with overlay enabled.

### HD-03. Event Playback Inspector

**Goal:** Record and show how each event was played.

**Likely files:**

- `src/game-phaser/animation/combat-animation-policy.ts`
- `src/game-phaser/animation/CombatEventPlayer.ts`
- `src/game-phaser/animation/CombatEventFxPresenter.ts`
- `src/game-phaser/presenters/CombatDebugOverlayPresenter.ts`
- `tests/game-phaser/combat-animation-policy.test.ts`
- `tests/game-phaser/combat-event-player.test.ts`
- `tests/game-phaser/combat-event-fx-presenter.test.ts`

**Tasks:**

- Define playback policy for every current `GameEvent["type"]`.
- Record observation fields: event type, policy, startedAt, endedAt, duration, visual route, fallback used, warning code, and error summary.
- Mirror unknown event, timeout, FX failure, and fallback cases into the debug overlay.
- Keep console warnings, but make overlay diagnostics the primary debugging surface.

**Acceptance:**

- A completeness test fails when a new event type lacks a playback policy.
- Unknown future events continue playback and produce a visible diagnostic.
- FX failure records fallback and still resolves playback.
- Input unlocks after playback completes or times out.

### HD-04. Visual-State Parity Diagnostics

**Goal:** Detect drift between core/view model state and Phaser presenters.

**Likely files:**

- `src/game-phaser/debug/combat-parity.ts`
- `src/game-phaser/scenes/CombatScene.ts`
- `src/game-phaser/presenters/CardPresenter.ts`
- `src/game-phaser/presenters/CombatDebugOverlayPresenter.ts`
- `tests/game-phaser/combat-parity.test.ts`
- `tests/game-phaser/card-presenter.test.ts`

**Tasks:**

- Compare view model hand count against visible hand card presenters.
- Compare draw/discard counts against pile UI.
- Check card presenter locations against expected hand, draw pile, discard pile, or transient animation states.
- Check selected/dragged card still exists and is playable after state changes.
- Check player and monster HP/block labels after event playback.
- Report info/warn/error severities without throwing in normal runtime.

**Acceptance:**

- A card visually left in hand after core moved it to discard creates an error diagnostic.
- Draw/discard count drift creates a diagnostic.
- Stale selected card creates a diagnostic and is cleared.
- Parity checks run after action result, after playback batch, and after scene refresh.

### HD-05. Draw and Discard Animation Hardening

**Goal:** Ensure draw/discard follows event order and remains visually state-consistent.

**Likely files:**

- `src/game-phaser/animation/combat-animation-plan.ts`
- `src/game-phaser/animation/CombatEventFxPresenter.ts`
- `src/game-phaser/presenters/CardPresenter.ts`
- `src/game-phaser/layout/hand-layout.ts`
- `tests/game-phaser/combat-animation-plan.test.ts`
- `tests/game-phaser/combat-event-fx-presenter.test.ts`
- `tests/game-core/combat-draw.test.ts`
- `tests/game-core/combat-turn.test.ts`

**Tasks:**

- Audit `CardMoved`, `CardDrawn`, and `DeckShuffled` animation routes.
- Animate discard one card at a time from current hand position to discard pile.
- Animate draw one card at a time from draw pile or reshuffled discard pile to final hand slot.
- Ensure final refresh does not skip intermediate reveal.
- Record fallback points and expose them in event playback inspector.

**Acceptance:**

- End turn with two cards left visibly moves two cards to discard and removes them from hand.
- Drawing four cards visibly reveals four cards one by one.
- Reshuffle from discard to draw pile is represented by event order and diagnostic markers.
- Existing draw/discard core event order tests still pass.

### HD-06. Input Race and Request Hardening

**Goal:** Make gameplay input robust during animation and repeated actions.

**Likely files:**

- `src/game-phaser/interaction/combat-interaction-state.ts`
- `src/game-phaser/scenes/CombatScene.ts`
- `src/game-phaser/controllers/RunSandboxController.ts`
- `tests/game-phaser/combat-interaction-state.test.ts`
- `tests/game-phaser/combat-controller.test.ts`
- `tests/game-core/agent-run-driver.test.ts`

**Tasks:**

- Centralise input lock state and expose it in the debug model.
- Block action submission while event playback is active.
- Record request id and expected revision for each submitted gameplay action.
- Surface duplicate request and stale revision rejections in debug overlay.
- Clear drag/selection state safely after state changes.

**Acceptance:**

- Double-clicking a playable card cannot apply effects twice.
- Drag/drop during playback cannot submit a second action.
- Stale revision produces `ActionRejected` and a debug diagnostic.
- Input lock reason is visible in the debug overlay.

### HD-07. Runtime Warning Capture

**Goal:** Capture expected and unexpected runtime warnings in one debug sink.

**Likely files:**

- `src/game-phaser/debug/debug-warning-sink.ts`
- `src/game-phaser/animation/CombatEventPlayer.ts`
- `src/game-phaser/animation/CombatEventFxPresenter.ts`
- `src/game-phaser/scenes/CombatScene.ts`
- `tests/game-phaser/debug-warning-sink.test.ts`
- `tests/game-phaser/combat-event-player.test.ts`

**Tasks:**

- Add a small warning sink for debug/runtime observations.
- Capture unknown event, playback timeout, timer fallback, FX fallback, missing point fallback, missing definition fallback, and unsupported UI cap warnings.
- Mirror warnings to overlay while preserving console output where useful.
- Distinguish expected debug warnings from unexpected runtime warnings in browser proof.

**Acceptance:**

- Forced unknown event appears in debug warning sink and overlay.
- Forced FX failure appears in debug warning sink and overlay.
- Normal browser smoke reports no unexpected warnings.

### HD-08. Trace Export and Replay Support

**Goal:** Let browser-observed failures become reproducible CLI or test cases.

**Likely files:**

- `src/game-phaser/debug/debug-trace-export.ts`
- `src/game-phaser/controllers/RunSandboxController.ts`
- `src/game-core/testing/trace.ts`
- `tests/game-phaser/debug-trace-export.test.ts`
- `tests/game-core/trace-replay.test.ts`
- `tests/game-cli/parse.test.ts`

**Tasks:**

- Export seed, runtime metadata, action history, event batches, selected node, final run state summary, and failure diagnostics.
- Make exported trace compatible with current trace parser or clearly version it.
- Add a debug control for copying event batch JSON and current trace JSON.
- Ensure exported trace can be used by simulation replay or converted into a focused regression fixture.

**Acceptance:**

- A browser combat path can export a trace with schema/version metadata.
- `npm run sim:replay -- --trace <exported-trace>` works for compatible traces, or the export includes an explicit conversion path.
- Trace parser rejects unsupported debug trace versions with a clear error.

### HD-09. CLI and Simulation Bundle Hardening

**Goal:** Make the command-line validation path a first-class acceptance gate.

**Likely files:**

- `src/game-cli/main.ts`
- `src/game-cli/simulate-runs.ts`
- `src/game-cli/format.ts`
- `src/game-cli/report-format.ts`
- `tests/game-cli/version.test.ts`
- `tests/game-cli/report-format.test.ts`
- `tests/game-core/simulation-analysis.test.ts`
- `package.json`

**Tasks:**

- Include runtime metadata in human and JSON CLI modes.
- Include runtime metadata in simulation reports.
- Add tests that compare CLI output metadata against shared runtime metadata.
- Ensure `npm run build:cli` builds current CLI entries.
- Add or document a single validation bundle that covers browser build, CLI build, core tests, smoke simulation, replay simulation, and balance simulation.

**Acceptance:**

- CLI version/provenance output matches shared metadata from main code.
- Built CLI and temporary `scripts/run-cli-entry.mjs` CLI report the same metadata.
- Simulation analysis output includes runtime/content metadata.
- CLI validation is part of the final required gate, not optional.

### HD-10. Hardening Test Matrix

**Goal:** Expand automated tests around debug, animation, input, simulation, and CLI alignment.

**Likely test files:**

- `tests/game-phaser/debug-view-model.test.ts`
- `tests/game-phaser/combat-debug-overlay.test.ts`
- `tests/game-phaser/combat-animation-policy.test.ts`
- `tests/game-phaser/combat-event-player.test.ts`
- `tests/game-phaser/combat-event-fx-presenter.test.ts`
- `tests/game-phaser/combat-parity.test.ts`
- `tests/game-phaser/debug-warning-sink.test.ts`
- `tests/game-phaser/debug-trace-export.test.ts`
- `tests/game-phaser/combat-scene-boundary.test.ts`
- `tests/game-core/combat-draw.test.ts`
- `tests/game-core/combat-turn.test.ts`
- `tests/game-core/trace-replay.test.ts`
- `tests/game-core/runtime-metadata.test.ts`
- `tests/game-cli/version.test.ts`
- `tests/game-cli/report-format.test.ts`

**Tasks:**

- Add focused tests for every new debug and hardening subsystem.
- Add event playback policy completeness tests.
- Add parity diagnostics tests.
- Add CLI version/provenance tests.
- Add replay compatibility tests for exported debug traces.

**Acceptance:**

- Focused tests pass before full test suite.
- Full test suite passes.
- Event policy completeness test fails when new `GameEvent` types are not classified.
- CLI alignment tests fail when CLI metadata drifts from shared runtime metadata.

### HD-11. Evidence, Manual, and Browser Proof

**Goal:** Leave reviewable proof that the hardening programme works.

**Likely files:**

- `docs/evidence/hardening-debug-screen/README.md`
- `docs/evidence/hardening-debug-screen/*.png`
- `docs/evidence/hardening-debug-screen/*.json`
- `docs/ui_ux_interaction.md`
- `docs/expansion-extension-points.md`

**Tasks:**

- Record validation commands and results.
- Capture browser screenshots of debug overlay, event playback inspector, parity diagnostics, and normal combat path.
- Capture at least one exported debug trace JSON.
- Update debug layer documentation.
- Document CLI/runtime metadata expectations.

**Acceptance:**

- Evidence doc includes exact validation bundle results.
- Browser proof shows overlay and normal combat still usable.
- Evidence includes CLI version/provenance output.
- Docs clearly mark debug UI as development-only.

## Required Final Validation Bundle

The final acceptance gate must run the test bundle and simulation bundle together. A phase may run smaller focused gates, but merge readiness requires the full bundle below.

### Test Bundle

- `npm run typecheck`
- `npm run build`
- `npm run build:cli`
- `npm test`
- `npm run smoke:localhost`

### CLI Bundle

- `npm run game:cli -- --help`
- `npm run game:cli -- --version` or the implemented equivalent provenance command.
- `npm run game:cli -- --seed cli-dev --auto`
- `npm run game:cli -- --seed cli-dev --json --auto`
- `node scripts/run-cli-entry.mjs game-cli --seed cli-dev --json --auto`
- `node dist-cli/game-cli.mjs --seed cli-dev --json --auto` after `npm run build:cli`, if the build output path is retained.

### Simulation Bundle

- `node scripts/run-cli-entry.mjs simulate-runs --mode smoke --analyze`
- `node scripts/run-cli-entry.mjs simulate-runs --mode replay --trace tests/game-core/traces/smoke-complete.json`
- `npm run sim:balance`
- `npm run sim:exhaustive-small`

### Browser Proof Bundle

- Start local Vite dev or preview server.
- Open the game with debug enabled.
- Capture combat overlay screenshot.
- Play at least one card by click.
- Play at least one attack card by drag/drop.
- End turn and verify discard/draw sequence.
- Capture event playback inspector after draw/discard.
- Export a debug trace.
- Verify normal path has no unexpected console errors or warnings.

### Repository Hygiene Bundle

- `git diff --check`
- `git status --short --branch`
- Confirm no Phaser import from `src/game-core`.
- Confirm CLI metadata, browser debug metadata, and simulation metadata match.

## Whole-Programme Acceptance

- Hardening foundation phases add no new gameplay content.
- Later expanded phases add only the minimum gameplay or UI capability required by their ticket and do not include broad content-pack expansion.
- Core rules remain deterministic and Phaser-free.
- Debug screen is development-only and hidden by default.
- Debug screen exposes runtime metadata, combat state, input state, event batches, warnings, and parity diagnostics.
- Every current `GameEvent` has an explicit playback policy.
- Unknown/future events are visible as diagnostics and do not break playback.
- Draw/discard animation follows event order and is visibly one-by-one.
- Visual-state parity diagnostics catch hand, pile, card-position, selected-card, HP/block, and warning drift.
- Duplicate request, stale revision, locked input, and drag/click overlap are non-destructive.
- Browser debug trace export can reproduce or support reproduction through CLI/simulation.
- CLI version/provenance is aligned with main code and validated by tests.
- Test bundle, CLI bundle, simulation bundle, browser proof bundle, and repository hygiene bundle all pass before merge.
- Content Workbench UI MVP remains read-only and consumes core workbench view models.
- Monster planned-card UX renders planned ability metadata without moving monster decision logic into Phaser.
- Status engine changes are event-ordered, deterministic, descriptor-backed, and simulation-visible.
- Multi-pet readiness proof covers two active pets across combat creation, pet-command routing, save/load, simulation, and debug visibility.
- Balance dashboard/report UX reuses CLI simulation aggregate data and validates parity with CLI output.

## Suggested Phase Gates

### Phase 1. Baseline and Runtime Provenance

- Implement HD-00.
- Add minimal CLI version/provenance tests.
- Run typecheck, focused CLI tests, and CLI smoke.

### Phase 2. Debug View Model and Overlay

- Implement HD-01 and HD-02.
- Run focused Phaser view-model and presenter tests.
- Browser smoke overlay rendering.

### Phase 3. Event Playback Inspector

- Implement HD-03 and HD-07 foundations.
- Run event-player, FX presenter, and policy completeness tests.

### Phase 4. Parity Diagnostics

- Implement HD-04.
- Add diagnostic tests and scene boundary coverage.

### Phase 5. Draw/Discard Hardening

- Implement HD-05.
- Run core draw/turn tests and Phaser animation tests.
- Browser proof for one-by-one discard and draw.

### Phase 6. Input Race Hardening

- Implement HD-06.
- Run interaction, controller, and stale revision tests.

### Phase 7. Trace Export and Replay

- Implement HD-08.
- Run trace parser/replay tests and CLI replay simulation.

### Phase 8. Full Bundle, Evidence, and Review

- Implement HD-10 and HD-11.
- Run full final validation bundle.
- Capture evidence screenshots and JSON.
- Resolve review findings.
- Commit, push, merge or fast-forward, and clean housekeeping.

### Phase 9. Content Workbench UI MVP

- Implement R1 after Phase 8 is merged and the worktree is clean.
- Keep the workbench read-only.
- Run focused workbench tests, typecheck, build, full tests, CLI bundle, simulation bundle, browser proof, and evidence capture.
- Commit, push, merge or fast-forward, and clean housekeeping before Phase 10.

### Phase 10. Monster Planned Card UX

- Implement R2 after Phase 9 is merged and the worktree is clean.
- Keep monster decision logic in `src/game-core`.
- Run focused planned ability, combat intent, view-model, Phaser presenter, event playback, CLI, simulation, and browser proof gates.
- Commit, push, merge or fast-forward, and clean housekeeping before Phase 11.

### Phase 11. Buff, Debuff, and Status Engine Round

- Implement R3 after Phase 10 is merged and the worktree is clean.
- Treat this as a core gameplay-engine phase with event-order tests before UI polish.
- Run focused core status tests, simulation analysis tests, CLI bundle, full tests, browser proof, and evidence capture.
- Commit, push, merge or fast-forward, and clean housekeeping before Phase 12.

### Phase 12. Multi-Pet Readiness Proof

- Implement R4 after Phase 11 is merged and the worktree is clean.
- Use a controlled two-pet proof, not a broad multi-pet content expansion.
- Run focused pet, combat, save/load, simulation, Phaser layout/debug, CLI, and browser proof gates.
- Commit, push, merge or fast-forward, and clean housekeeping before Phase 13.

### Phase 13. Balance Dashboard and Report UX

- Implement R5 after Phase 12 is merged and the worktree is clean.
- Reuse existing simulation aggregate data and avoid a second balance-reporting source of truth.
- Run focused report formatting, dashboard view-model, workbench/presenter, CLI parity, simulation bundle, browser proof, and evidence capture.
- Commit, push, merge or fast-forward, and clean housekeeping.

## Risks

- **Debug UI becomes gameplay UI:** Keep it gated and hidden by default.
- **Diagnostics become noisy:** Use stable severity and codes; only treat parity errors as blocking in tests or debug mode.
- **Animation hardening changes behaviour:** Core event order must remain the source of truth; tests should prove core state is unchanged except for bug fixes.
- **CLI metadata becomes another drift source:** Use one shared runtime metadata source and test CLI/browser/simulation against it.
- **Browser proof becomes flaky:** Use deterministic seed and fixed scripted path.

## Open Questions For Implementation

- Should `--version` be added as a distinct CLI flag, or should provenance be printed in `--help` and JSON mode only?
- Should registry identity be a deterministic hash, a content version string, or both?
- Should browser debug trace export be exactly the same as `AgentTrace`, or a debug trace format with conversion to `AgentTrace`?
- Should debug overlay be toggled by query parameter only, or also by keyboard shortcut?
