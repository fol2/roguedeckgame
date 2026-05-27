---
title: Engine Truth and Workbench Acceptance Plan
type: hardening
status: completed
date: 2026-05-27
---

# Engine Truth and Workbench Acceptance Plan

## Summary

This plan closes the six highest-value hardening findings from the post-Phase 13 review: two engine correctness bugs, trace/replay truth gaps, side-story simulation coverage, workbench authoring resilience, and public API boundary hygiene. Acceptance is deliberately strict: every unit needs focused regression coverage, full verification, and independent reviewer sign-off before the work is treated as done.

## Problem Frame

The current engine baseline is strong: typecheck, unit tests, production build, smoke simulation, balance simulation, and bounded exhaustive simulation all pass. The review found that the remaining risk is not broad instability, but truth gaps around boundaries that future content authors will rely on. A stale combat can complete the wrong run node, discard/exhaust effects can reject valid cards, replay hashes can miss story and multi-pet divergence, the simulation driver can skip side-story progression, and the workbench can under-report authored dependencies or remount expensive/focused UI at the wrong time.

This work should preserve the existing architecture: deterministic rules stay in `src/game-core`, Phaser stays presentation-only, and workbench tooling remains read-only.

---

## Requirements

**Engine correctness**

- R1. Completing a run combat node must prove the supplied combat belongs to the active node and encounter, not only to the run.
- R2. Card effects that discard or exhaust cards from hand must not move the played card before the mandatory post-play discard step.
- R3. Repeated pet attacks must not apply damage to an already defeated target while combat continues against other enemies.

**Verification truth**

- R4. Agent trace state hashes must include story and multi-pet progression fields that affect run correctness.
- R5. Simulation and replay coverage must prove reachable pet side stories complete, persist, and replay deterministically.
- R6. Simulation and invariant tooling must be able to run against non-default registries and multi-pet fixtures without starter-registry false assumptions.

**Workbench and integration hardening**

- R7. Content dependency reports must include encounter authoring references such as reward pools and monster groups.
- R8. The content workbench must not eagerly run the balance dashboard before the reports tab needs it, and report failures must stay contained to the reports panel.
- R9. The content workbench search input must remain usable during sequential typing.
- R10. Browser boot and dev-only debug storage access must fail gracefully instead of producing blank pages or thrown storage errors.
- R11. Simulation CLI mode parsing must reject invalid modes explicitly.

**Architecture and acceptance**

- R12. Runtime `game-core` exports must stay separate from testing and workbench helper entrypoints.
- R13. `src/game-core` must remain Phaser-free, app-free, and presentation-free, with an automated boundary test.
- R14. Acceptance must include independent reviewer subagents that review correctness, tests, architecture, and runtime/workbench behaviour after implementation.

---

## Key Technical Decisions

- KTD1. Combat identity includes active-node context: model combat ownership with node/encounter metadata or a unique combat id derived from the run node, then validate that ownership in run completion. This addresses stale combat reuse without moving run lifecycle logic into Phaser.
- KTD2. Exclude the in-flight card from hand pile moves: keep the current hand/discard model, but make discard/exhaust hand selection aware of `context.cardInstanceId`. This is smaller than introducing a new in-play pile during this hardening pass.
- KTD3. Trace hashes are semantic, not cosmetic: include the run, pet, story, and combat fields that affect deterministic replay outcomes, while preserving stable sorted JSON output.
- KTD4. Side-story progression belongs in the run driver: the agent driver should execute the same run-level side-story checks a real run flow expects, so simulation metrics mean something.
- KTD5. Workbench reports are lazy and isolated: JSON and diagnostics remain available even if simulation-backed reports are slow or fail.
- KTD6. Export hygiene uses explicit entrypoints: keep `src/game-core/index.ts` for runtime engine APIs, introduce explicit testing/workbench entrypoints for non-runtime helpers, and update app/CLI/tests to import from the right surface.

---

## Implementation Units

### U1. Harden combat node ownership

- **Goal:** Prevent stale won/lost combat state from completing a newly active run node.
- **Files:** Modify `src/game-core/model/combat.ts`, `src/game-core/systems/combat.ts`, `src/game-core/systems/run-lifecycle.ts`; update `tests/game-core/run-combat-flow.test.ts` and related fixtures if needed.
- **Patterns:** Follow existing `GameActionResult` rejection style and typed `GameEvent` payloads.
- **Test scenarios:** Start and complete one combat node, select another combat node, then attempt to complete it with the previous combat and assert rejection. Assert the happy path still completes the matching node and emits existing events in order.
- **Verification:** Focused run-flow test plus full `npm test`.

### U2. Harden card effect movement and lethal pet repeats

- **Goal:** Make discard/exhaust effects safe for the currently played card and avoid repeated pet damage against defeated targets.
- **Files:** Modify `src/game-core/systems/effects.ts`; update `tests/game-core/combat-play-card.test.ts`, `tests/game-core/combat-pet-command.test.ts`, or focused effect tests.
- **Patterns:** Keep effect resolution deterministic and event-ordered; do not introduce card-name-specific logic.
- **Test scenarios:** A card that discards from hand should play successfully without discarding itself before final card movement. A card that exhausts from hand should do the same. A two-active-pet attack that kills one monster while another monster remains alive must not emit a second damage event against the defeated target.
- **Verification:** Focused combat tests, `npm run typecheck`, and full `npm test`.

### U3. Make trace hashes and simulation story progression truthful

- **Goal:** Ensure replay detects story and multi-pet divergence, and simulation exercises reachable side-story progression.
- **Files:** Modify `src/game-core/testing/state-hash.ts`, `src/game-core/testing/trace.ts` if schema handling is needed, `src/game-core/testing/run-driver.ts`, `src/game-core/testing/analysis.ts`; update `tests/game-core/trace-replay.test.ts`, `tests/game-core/agent-run-driver.test.ts`, `tests/game-core/simulation-analysis.test.ts`, and story integration tests.
- **Patterns:** Preserve seeded RNG and stable hash ordering. Use existing story systems rather than reimplementing story checks inside the driver.
- **Test scenarios:** Mutating story flags, pet memories, seen story event ids, bond XP, active pet ids, combat active pet ids, and run pet states must change the state hash. A completed simulated run with reachable side-story content must emit and persist `PetStoryEventCompleted`, then replay deterministically.
- **Verification:** Focused trace/story/simulation tests, `npm run sim:smoke`, and `npm run sim:exhaustive-small`.

### U4. Make simulation and invariants registry-aware

- **Goal:** Allow smoke/fuzz/exhaustive tooling and invariant checks to use custom registries and multi-pet fixtures without starter-registry blind spots.
- **Files:** Modify `src/game-core/testing/simulation.ts`, `src/game-core/testing/invariants.ts`, `src/game-core/testing/agent-actions.ts` if config types need extension; update `tests/game-core/simulation-invariants.test.ts`, `tests/game-core/multi-pet-readiness.test.ts`, and simulation tests.
- **Patterns:** Keep default behaviour unchanged for starter content, but thread registry/pet config through when supplied.
- **Test scenarios:** Custom monster planned ability ids and custom reward definitions pass invariants when present in the supplied registry. Multi-pet simulation reaches reward or terminal state while preserving active pet ids and run pet states.
- **Verification:** Focused invariant/simulation tests plus `npm run sim:balance`.

### U5. Harden content workbench dependencies, reports, and input behaviour

- **Goal:** Make workbench authoring reports complete and resilient without remounting the search input on every keystroke.
- **Files:** Modify `src/game-core/testing/content-dependencies.ts`, `src/game-core/testing/content-report.ts`, `src/app/content-workbench.ts`; update `tests/game-core/content-dependencies.test.ts`, `tests/game-core/content-workbench.test.ts`, and `tests/game-phaser/content-workbench-ui.test.ts`.
- **Patterns:** Keep the workbench read-only and data-driven. Avoid gameplay resolver calls from UI code.
- **Test scenarios:** Dependency reports include encounter authoring reward pool and monster-group references. Standalone pet modifiers contribute rule types to content reports. Balance dashboard generation is lazy and cached. Search supports sequential typing without losing usable focus.
- **Verification:** Focused workbench tests, `npm run build`, and browser/workbench smoke proof.

### U6. Clean runtime boundaries and integration failure paths

- **Goal:** Separate runtime exports from testing/workbench exports, add automated boundary protection, and harden browser/CLI failure surfaces.
- **Files:** Modify `src/game-core/index.ts`; create `src/game-core/testing/index.ts` and `src/game-core/workbench/index.ts` if useful; update imports in `src/app/content-workbench.ts`, `src/game-cli/*`, tests, and related modules. Modify `src/app/main.ts`, `src/game-phaser/scenes/CombatScene.ts`, and `src/game-cli/parse.ts`.
- **Patterns:** Keep `src/game-core` Phaser-free. Follow current app error styling and CLI parse error conventions.
- **Test scenarios:** Import-boundary test fails on Phaser/app imports from `src/game-core`. Production `game-core` barrel does not export testing-only helpers. Boot-level dynamic import failure renders a controlled app error. Blocked localStorage access does not crash debug overlay code. Invalid simulation modes produce explicit CLI errors.
- **Verification:** Boundary tests, CLI parser tests, browser/app tests, `npm run typecheck`, `npm test`, `npm run build`, and `npm run smoke:localhost`.

---

## Acceptance Examples

- AE1. Given a run has completed combat node A and selected combat node B, when completion is attempted with node A's old won combat, then the action is rejected and node B remains active.
- AE2. Given a playable card has a discard or exhaust effect, when the player plays that card, then the effect may move other hand cards but the played card still completes its normal final movement.
- AE3. Given a trace replay where only a pet story field diverges, when replay verifies state hashes, then replay fails with state hash divergence.
- AE4. Given the workbench opens on the JSON tab, when the balance simulation path throws, then the workbench still mounts and the report tab shows a contained error.
- AE5. Given `simulate-runs --mode typo`, when the CLI parses options, then it exits with an invalid-mode error instead of treating the run as replay.
- AE6. Given independent reviewers inspect the completed branch, when they review against this plan, then they find no unresolved P1/P2 correctness, test, architecture, or runtime acceptance issues.

---

## System-Wide Impact

The implementation touches the core engine, simulation harness, app boot path, workbench UI, CLI parsing, and public exports. The risk is manageable because each change is anchored to an existing test surface and should not add new gameplay content. The work should avoid broad rewrites of `validation.ts` or `CombatScene.ts`; those remain future refactor tracks unless a small extraction is required for U5 or U6.

---

## Risks & Dependencies

- Story progression inside simulation may require careful event ordering around `RunCombatCompleted`, reward creation, and side-story events. Tests should assert ordering rather than only final state.
- Expanding the state hash changes replay expectations. Preserve schema compatibility deliberately, or update tests and trace metadata together.
- Export hygiene can create noisy import churn. Keep it mechanical and verify with typecheck and full tests before layering behavioural changes on top.
- Workbench focus behaviour is hard to prove with a fake DOM. A browser-level or browser-like test should supplement unit coverage.

---

## Sources / Research

- `src/game-core/systems/run-lifecycle.ts` for run combat start and completion gates.
- `src/game-core/systems/combat.ts` and `src/game-core/systems/effects.ts` for play-card and effect resolution order.
- `src/game-core/testing/state-hash.ts`, `src/game-core/testing/trace.ts`, and `src/game-core/testing/run-driver.ts` for replay and simulation truth.
- `src/game-core/testing/content-dependencies.ts`, `src/game-core/testing/content-report.ts`, and `src/app/content-workbench.ts` for workbench authoring reports.
- `src/game-core/index.ts` for current public export breadth.
- `src/app/main.ts`, `src/game-phaser/scenes/CombatScene.ts`, and `src/game-cli/parse.ts` for integration failure paths.
