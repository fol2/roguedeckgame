---
title: Phase 14 Workbench Hardening Consolidation Plan
type: hardening
status: active
date: 2026-05-27
---

# Phase 14 Workbench Hardening Consolidation Plan

## Summary

Phase 14 is a consolidation phase after the post-Phase 13 review. The goal is to make the default validation gate reliable, remove the duplicated combat playability rules between core and presentation, and turn the content workbench from a read-only browser into a stronger production/debug cockpit without adding major new gameplay content.

This work keeps the existing architecture intact: `src/game-core` remains deterministic and Phaser-free, Phaser scenes stay presentation-only, and pet-command modelling remains multi-pet ready even while Phase 1 presents one active pet.

## Problem Frame

The engine is in good shape after the previous phases: typecheck, CLI build, smoke simulation, and balance simulation have been passing. The main risk is now confidence erosion rather than missing features. A default `npm test` run can time out in CLI smoke/version tests even though the same file passes by itself, the combat view model can disagree with core when pet-command cost modifiers affect effective card cost, the workbench still lacks drilldown tools for content authoring, and large scene/workbench files are accumulating refactor debt.

The next implementation pass should therefore prefer boring, testable hardening over adding a second pet, pet HP, enemy pet targeting, or a large new content batch.

---

## Requirements

**Validation gate reliability**

- R1. `npm test` must complete reliably under the default suite settings.
- R2. CLI/version smoke coverage must avoid flaky nested `npm run` behaviour in the fast unit lane, or be isolated with explicit integration timing semantics.
- R3. The required validation gate must include `npm run typecheck`, `npm test`, `npm run build`, `npm run build:cli`, smoke simulation with analysis, and strict balance simulation.

**Shared combat action contract**

- R4. Core must expose a shared card action/playability contract that includes effective cost after pet modifiers, playability, unplayable reason, target mode, valid enemy targets, valid pet targets, actor pet target or slot, whether manual targeting is required, and play mode.
- R5. Core card play validation and `buildCombatViewModel` must consume the same contract instead of duplicating simplified presentation rules.
- R6. Regression coverage must prove UI playability and core resolution agree when a pet-command cost modifier changes a card's cost.
- R7. The contract must remain deterministic and must not import Phaser or browser APIs.

**Workbench V2 read-only tools**

- R8. The workbench must provide per-item diagnostics and broken-reference drilldown.
- R9. The workbench must provide dependency and reverse-reference data that supports "where used" inspection.
- R10. The workbench must show registry fingerprint/content metadata in the read-only UI.
- R11. Balance dashboard generation must stay lazy, explicit, cached, or otherwise isolated from initial workbench render.
- R12. Trace replay import/view and a read-only scenario/action runner are desirable only where they fit without broad resolver coupling or unstable UI expansion.
- R13. Workbench UI must not contain gameplay resolver calls and must not import Phaser.

**Submit hardening and refactor debt**

- R14. Reward claim/skip, map node selection, and non-combat completion should use request IDs, state revisions, or an equivalent safe-submit guard where the current controller shape supports it.
- R15. `CombatScene` should shed low-risk action submission/detail/debug helper responsibilities before more UI behaviour is added.
- R16. `src/app/content-workbench.ts` should be split into smaller modules along state/model, diagnostics/reference panels, report panels, and DOM rendering boundaries.
- R17. Reward, map, and pet journal/memory/evolution interaction contracts should be documented at a small, practical level before richer UI is built.

**Scope boundaries**

- R18. Do not add a second pet.
- R19. Do not add pet HP.
- R20. Do not add enemy pet targeting.
- R21. Do not create a write editor.
- R22. Do not weaken existing architecture boundary tests.
- R23. Do not add major new cards or broad content expansion.

---

## Key Technical Decisions

- KTD1. Treat the card action contract as a core system, not a Phaser helper. The contract should live under `src/game-core/systems` or a nearby core-facing module so both `playCard` validation and presentation view models can consume the same source of truth.
- KTD2. Keep the contract query pure for UI callers. The view model needs effective cost and target/playability metadata without consuming once-per-turn or once-per-combat modifier state before a real action is submitted.
- KTD3. Separate contract inspection from action mutation. If existing cost-modifier code consumes modifier usage, introduce a preview/evaluation path or options object that computes the same effective cost and events without mutating combat state for view-model rendering.
- KTD4. Make CLI smoke tests direct-node by default in the unit lane. The important behaviour is CLI provenance and command output; nested `npm run` warning checks can be represented by script-entry calls or moved behind an explicit integration test path if needed.
- KTD5. Build Workbench V2 from existing reports first. `buildContentWorkbenchViewModel`, content dependency reports, registry fingerprints, trace parsing, and balance dashboard helpers are already present; prefer assembling and exposing them over inventing a write-mode editor.
- KTD6. Refactor by extraction, not rewrite. `CombatScene` and the workbench renderer should keep behaviour stable while helper modules take over narrow responsibilities.

---

## Implementation Units

### U1. Stabilise CLI/version tests and the default validation gate

- **Goal:** Make the default `npm test` lane reliably green without losing CLI provenance coverage.
- **Files:** Modify `tests/game-cli/version.test.ts`, `scripts/run-cli-entry.mjs`, `package.json`, or Vitest config files only where necessary.
- **Patterns:** Follow the existing `runNode` helper path for direct CLI entry execution. Avoid test changes that only increase global timeouts without reducing the nested-process cost.
- **Test scenarios:** The CLI version command reports `currentRuntimeMetadata`; JSON auto results include the same metadata; simulation output prints provenance; invalid simulation parse errors stay concise; the default test suite completes without a 5-second timeout.
- **Verification:** `npm test`, focused `npx vitest run tests/game-cli/version.test.ts`, and `npm run build:cli`.

### U2. Introduce a shared card action/playability contract

- **Goal:** Make core validation and combat view models agree on effective card cost, playability, target requirements, and pet-command ownership.
- **Files:** Modify or create `src/game-core/systems/card-action-contract.ts`; modify `src/game-core/systems/combat.ts`, `src/game-core/systems/card-actions.ts`, `src/game-core/systems/pet-modifiers.ts`, and `src/game-core/index.ts` as needed; update `tests/game-core/combat-pet-command.test.ts` and add focused contract tests.
- **Patterns:** Reuse `getCardActionProfile`, `resolvePetCommandOwnerIds`, `applyPetCommandCostModifiers`, `validateCardEffects`, and existing `GameActionError` semantics. Keep the evaluation deterministic and Phaser-free.
- **Test scenarios:** A pet-command card with a cost-reducing modifier is playable at the reduced effective cost; the same card is rejected when energy is below effective cost; a future cost-increasing modifier reports the higher cost and matching rejection reason; targetless cards reject unexpected targets; targeted cards expose alive monster target ids in deterministic order.
- **Verification:** Focused game-core contract/combat tests, `npm run typecheck`, and `npm test`.

### U3. Consume the shared contract in the combat view model

- **Goal:** Remove duplicated presentation playability logic from `buildCombatViewModel`.
- **Files:** Modify `src/game-phaser/view-models/combat-view-model.ts`; update `tests/game-phaser/combat-view-model.test.ts` and any affected presenter tests.
- **Patterns:** Keep Phaser code out of the view model and import only core runtime APIs. Preserve existing UI copy where possible, but source `cost`, `playable`, `unplayableReason`, `targetKind`, `playMode`, `requiresManualTarget`, valid enemy ids, valid pet ids, and command pet slot from the shared contract.
- **Test scenarios:** A cost-modified pet-command card displays the effective cost and playable state that core accepts; a missing required active pet remains unplayable; dead enemies are excluded from valid targets; Phase 1 UI caps still report warnings without hiding the latest state.
- **Verification:** Focused combat view-model tests, `npm run typecheck`, and `npm test`.

### U4. Build Workbench V2 diagnostics and reference drilldown

- **Goal:** Add read-only authoring tools for per-item diagnostics, reverse references, "where used", broken-reference drilldown, and registry/content metadata.
- **Files:** Modify `src/game-core/systems/content-workbench.ts`, `src/game-core/testing/content-dependencies.ts`, and related workbench model tests; add small modules under `src/app/content-workbench/` for panels and state if extraction is useful.
- **Patterns:** Build from registry data and existing dependency report shapes. Keep all content authoring logic data-driven and avoid gameplay resolver calls from UI code.
- **Test scenarios:** Selecting a content item shows diagnostics scoped to that item; missing dependency issues link back to the offending source item; reverse references show which cards, rewards, encounters, side stories, or upgrades reference the selected item; registry fingerprint and content metadata are visible in reports or metadata panels.
- **Verification:** `tests/game-core/content-dependencies.test.ts`, workbench model tests, and `tests/game-phaser/content-workbench-ui.test.ts`.

### U5. Make workbench reports explicit/cached and split the renderer

- **Goal:** Keep the workbench fast and maintainable while preserving current routes and read-only behaviour.
- **Files:** Split `src/app/content-workbench.ts` into modules such as `src/app/content-workbench/model.ts`, `src/app/content-workbench/dom.ts`, `src/app/content-workbench/diagnostics-panel.ts`, `src/app/content-workbench/reports-panel.ts`, and `src/app/content-workbench/render.ts`; update imports in `src/app/main.ts` or tests as needed.
- **Patterns:** Preserve the existing fake-DOM test style. Keep balance dashboard creation lazy and cache the result after an explicit reports-tab/report action.
- **Test scenarios:** Initial workbench render does not build the balance dashboard; opening reports builds it once; switching tabs reuses the cached result; dashboard errors remain contained in the report panel; search remains usable during sequential typing.
- **Verification:** Focused workbench UI tests, `npm run build`, and browser/workbench smoke through the local app.

### U6. Extend safe-submit semantics beyond combat where practical

- **Goal:** Reduce double-submit and stale UI risk in map/reward/non-combat flows.
- **Files:** Modify `src/game-phaser/controllers/run-sandbox-controller.ts`, `src/game-phaser/view-models/vertical-slice-view-model.ts`, `src/game-phaser/scenes/MapScene.ts`, `src/game-phaser/scenes/RewardScene.ts`, and focused controller tests.
- **Patterns:** Reuse the combat request-id/revision style where it fits. Keep run lifecycle rules in core and presentation submission guards in Phaser/controller code.
- **Test scenarios:** Duplicate map-selection request ids are rejected or ignored deterministically; stale reward claim/skip revisions do not mutate state twice; non-combat completion rejects stale submissions; happy-path flows still emit the same run events in order.
- **Verification:** `tests/game-phaser/run-controller.test.ts`, `tests/game-phaser/vertical-slice-controller.test.ts`, map/reward scene boundary tests, and `npm test`.

### U7. Extract low-risk CombatScene helpers and document missing contracts

- **Goal:** Reduce `CombatScene` responsibility before adding further UI surfaces.
- **Files:** Extract helpers under `src/game-phaser/interaction/` or `src/game-phaser/debug/`; modify `src/game-phaser/scenes/CombatScene.ts`; add focused tests where helpers contain logic. Add concise docs under `docs/contracts/` for reward, map, and pet journal/memory/evolution interaction contracts.
- **Patterns:** Keep scene orchestration intact and move pure state/submission/debug-copy logic first. Avoid broad visual rewrites.
- **Test scenarios:** Action submission locks and stale-revision handling still behave as before; detail/modal restoration preserves selection; debug export/parity capture still produces expected diagnostics; docs state request/revision expectations for reward and map screens.
- **Verification:** `tests/game-phaser/combat-action-submission.test.ts`, `tests/game-phaser/combat-debug-overlay.test.ts`, `tests/game-phaser/debug-trace-export.test.ts`, `tests/game-phaser/combat-scene-boundary.test.ts`, and browser smoke.

---

## Acceptance Examples

- AE1. Given the full default suite is run, when `npm test` reaches `tests/game-cli/version.test.ts`, then it completes without the previous 5-second timeout and without dropping CLI provenance coverage.
- AE2. Given a pet-command card has a cost-reducing pet modifier and the player has exactly the reduced energy amount, when the view model is built, then the card displays the reduced cost as playable and `playCard` accepts it.
- AE3. Given the same pet-command card has energy below the effective cost, when the view model is built and `playCard` is attempted, then both report the same insufficient-energy state.
- AE4. Given a content item with a missing referenced dependency, when it is selected in the workbench, then the item diagnostics and broken-reference drilldown identify the source and missing target.
- AE5. Given the workbench opens on its default tab, when no report tab/action has been selected, then balance simulation aggregation has not run.
- AE6. Given a user double-clicks a reward claim or map node using the same request id/revision, when the second submission is processed, then it is rejected or ignored without mutating run state twice.

---

## System-Wide Impact

The work touches the CLI test lane, core card-action systems, Phaser view models, workbench model/UI code, and run presentation controllers. It should not alter content balance, add new pet mechanics, or change Phaser rendering behaviour beyond extracting helpers and making existing interactions safer.

The highest-risk behavioural change is the shared card action contract because it must compute effective pet-command cost consistently without consuming modifier usage during view-model rendering. That deserves focused tests before broad refactoring.

---

## Risks & Dependencies

- Previewing cost modifiers can accidentally consume once-per-turn or once-per-combat usage if the shared contract reuses mutation-oriented helpers without a pure evaluation path.
- Moving CLI npm smoke checks out of the default test lane can reduce coverage if direct-node replacement tests do not preserve the important provenance assertions.
- Workbench V2 can grow too much surface area. Prefer per-item diagnostics, where-used, broken-reference drilldown, and metadata first; treat trace replay import and scenario runner as stretch items if they remain compact.
- Safe-submit semantics outside combat may reveal core lifecycle assumptions. Keep controller-level duplicate/stale guards separate from game-core rule resolution.
- Splitting `content-workbench.ts` can create import churn. Keep extraction mechanical and verify with focused fake-DOM tests after each boundary move.

---

## Sources / Research

- `tests/game-cli/version.test.ts` for the current timeout-prone CLI/version smoke tests.
- `src/game-core/systems/combat.ts` for core card validation, pet-command cost modification, and energy spending.
- `src/game-core/systems/card-actions.ts` for current action target/play-mode profiling.
- `src/game-core/systems/pet-modifiers.ts` for pet-command cost and effect modifiers.
- `src/game-phaser/view-models/combat-view-model.ts` for duplicated presentation playability logic.
- `src/game-core/systems/content-workbench.ts` and `src/app/content-workbench.ts` for current workbench model and renderer responsibilities.
- `tests/game-phaser/content-workbench-ui.test.ts` for current fake-DOM workbench coverage and lazy report expectations.
- `src/game-phaser/scenes/CombatScene.ts`, `src/game-phaser/scenes/MapScene.ts`, and `src/game-phaser/scenes/RewardScene.ts` for presentation submit and scene orchestration debt.
