---
title: Phase 16 Validation Gate Repair Workbench Scene Refactor Plan
type: hardening
status: completed
date: 2026-05-27
---

# Phase 16 Validation Gate Repair Workbench Scene Refactor Plan

## Summary

Phase 16 makes the clean review ZIP validation trustworthy before any new gameplay expansion. The work repairs the default `npm test` gate, aligns review ZIP hygiene with artifact/evidence tests, updates CI to match the required release gate, hardens starter deck drift detection, adds designer-readable Deck and Level / Run Map workbench panels, and refactors the largest workbench/controller/scene surfaces without changing gameplay behaviour.

The phase is explicitly hardening/refactoring work. It must not add a second pet, pet HP, enemy pet targeting, a write editor, or a broad new content library.

## Problem Frame

Recent validation from a clean extracted review ZIP proved that `npm ci`, `npm run typecheck`, `npm run build`, `npm run build:cli`, `npm run test:integration`, `npm run sim:smoke -- --analyze`, `npm run sim:balance`, and `npm audit --audit-level=moderate` can pass, but the default `npm test` lane still fails. The failures are contract issues rather than gameplay expansion needs:

- A fast-lane CLI version test times out despite an integration version test already existing.
- A small simulation fuzz test can time out under full-suite contention while passing focused.
- A Phaser boundary test expects a screenshot under `docs/contracts/p2`, which the review ZIP now correctly excludes.
- The workbench UI balance dashboard test still performs real simulation work inside the default UI unit lane.

The same validation confirmed that starter deck registry and level authoring metadata are moving in the right direction, but the workbench still needs dedicated designer-readable views and the large surfaces are becoming difficult to maintain.

## Requirements

**Validation gate**

- R1. `npm test` must pass under the default script from a clean checkout and clean review ZIP extraction.
- R2. The default unit lane must not rely on manually split batches or focused invocations.
- R3. Spawn-heavy CLI provenance coverage must live in integration or have an explicit bounded timeout that cannot drag down fast unit tests.
- R4. The default simulation fuzz sample must stay deterministic and bounded under full-suite contention.
- R5. Workbench UI unit tests must not run heavy balance simulation; they should inject fake or cached dashboard data.
- R6. Real simulation-backed dashboard coverage must remain in a bounded core or integration lane.
- R7. CI must run `npm run typecheck`, `npm test`, `npm run build`, `npm run build:cli`, `npm run test:integration`, `npm run sim:smoke -- --analyze`, `npm run sim:balance`, and `npm audit --audit-level=moderate`.

**Review ZIP and evidence contract**

- R8. Review ZIPs must continue excluding nested contract snapshots such as `docs/contracts/p2`.
- R9. Default tests must not require files excluded from review ZIPs.
- R10. Screenshot/evidence checks should either use checked-in review-ZIP-included compact evidence, a manifest/checksum, or move to an explicit artifact/integration lane.
- R11. Do not reintroduce nested repo archives or snapshots under `docs/contracts`.

**Deck registry**

- R12. `RunState.deckCardIds` remains the mutable run deck.
- R13. Starter deck registry remains the first-class authoring source.
- R14. Add drift-prevention coverage between `PlayerClassDefinition.startingDeckId` and any compatibility `startingDeckCardIds`.
- R15. Prefer deprecating or removing direct player-class starter card lists where compatibility no longer needs them.
- R16. Keep validation for duplicate deck ids, empty decks, missing card references, unknown starter deck references, and invalid owner player classes.
- R17. Add or keep a dedicated workbench deck view showing deck id/name, owner class, card list, deck size, card family/type distribution, rarity mix, pet-command count, tag distribution, and where-used by player class.

**Level / Run Map viewer**

- R18. Add a dedicated read-only workbench panel/table for run map templates, not only JSON preview.
- R19. The viewer must expose node id, node type, layer, meaning, next node ids, encounter ids, expanded encounter names, monster ids, monster display names, monster roles/tags, encounter difficulty band, encounter budget, authoring budget min/max, reward pool id, and broken-reference diagnostics.
- R20. Tests must prove the workbench can answer what happens on a node, which enemies can appear, which nodes are elite or boss, which reward pool is used, and which references are broken.

**Refactor and submit hardening**

- R21. Split `src/app/content-workbench.ts` into smaller read-only rendering/state modules without changing behaviour.
- R22. Split `src/game-core/systems/content-workbench.ts` into smaller core workbench builders without changing behaviour.
- R23. Continue extracting safe pieces from `src/game-phaser/scenes/CombatScene.ts`, prioritising action submission, combat continue/completion, detail/modal restoration, debug export/parity capture, and keyboard routing.
- R24. Split `src/game-phaser/controllers/RunSandboxController.ts` where safe, prioritising request/revision guard, combat bridge, reward bridge, map bridge, and trace/debug recording.
- R25. Production Phaser scene calls must always provide `requestId` and expected revision for mutating actions.
- R26. Test helpers may remain ergonomic through explicit wrapper helpers.
- R27. Add static/source tests so production Phaser scenes cannot call mutating controller methods without request id and revision.

## Scope Boundaries

- Do not add a second pet.
- Do not add pet HP.
- Do not add enemy pet targeting.
- Do not add major new cards, monsters, rewards, or content libraries.
- Do not add a write editor.
- Do not weaken architecture boundary tests.
- Do not reintroduce nested repo snapshots into review ZIPs.

## Key Technical Decisions

- KTD1. Repair `npm test` first, then refactor. Refactors should happen only after the failing default lane is understood enough that every extraction can be checked against a green baseline.
- KTD2. Keep slow process and simulation coverage out of UI unit tests. UI tests should assert rendering, lazy loading, cache behaviour, and error containment through injected data; simulation correctness belongs in core/integration tests.
- KTD3. Replace hardcoded excluded evidence file assertions with durable review-safe contracts. A manifest or explicit integration artifact lane is better than making default tests depend on `docs/contracts/p2`.
- KTD4. Treat the starter deck registry as canonical while compatibility exists. If `startingDeckCardIds` stays temporarily, validation must prove it does not drift from the referenced starter deck.
- KTD5. Build the Deck and Level viewer from deterministic core workbench view models. Phaser remains presentation for gameplay, not content authoring logic.
- KTD6. Prefer behaviour-preserving extraction over new abstraction. Each split should create named modules that map to existing responsibilities and keep public contracts stable.
- KTD7. Production submit APIs should be stricter than helper APIs. Scenes pass revision/request ids explicitly; tests that are not about idempotency use helpers.

## Implementation Units

### U1. Repair Default Test Gate

- **Goal:** Make `npm test` pass reliably under the default script.
- **Files:** Modify `tests/game-cli/version.test.ts`, `tests/game-core/simulation-fuzz.test.ts`, `tests/game-phaser/content-workbench-ui.test.ts`, `tests-integration/game-cli/version.integration.test.ts`, `src/app/content-workbench.ts`, and supporting test helpers as needed.
- **Approach:** Move or narrow spawn-heavy CLI assertions, bound the deterministic fuzz sample for full-suite execution, and inject fake/cached dashboard data in UI tests while preserving real dashboard coverage in core/integration tests.
- **Test scenarios:** CLI unit test does not spawn an expensive built pipeline; integration version test still covers provenance; fuzz sample completes under full suite; workbench dashboard UI builds lazily once and reuses cached fake data; dashboard failure is contained.
- **Verification:** `npx vitest run tests/game-cli/version.test.ts tests/game-core/simulation-fuzz.test.ts tests/game-phaser/content-workbench-ui.test.ts`, then `npm test`.

### U2. Repair Review ZIP Evidence Mismatch

- **Goal:** Remove default-test dependency on `docs/contracts/p2` while preserving evidence integrity.
- **Files:** Modify `tests/game-phaser/combat-scene-boundary.test.ts`, add or modify a compact checked-in manifest under `docs/evidence/` if needed, and keep `scripts/create-review-zip.mjs` / `tests/scripts/create-review-zip.test.js` aligned.
- **Approach:** Replace hardcoded `docs/contracts/p2/...png` checks with a review-safe manifest/checksum or move the screenshot check to an explicit artifact lane. Keep review ZIP exclusions intact.
- **Test scenarios:** Clean review ZIP extraction can run `npm test`; nested contract snapshots stay excluded; any evidence contract refers only to included files or explicit integration artifacts.
- **Verification:** Focused boundary and ZIP script tests, `npm run zip:review -- --allow-dirty` when safe, and inspection of ZIP entries.

### U3. Update CI Release Gate

- **Goal:** Make CI match the full required validation gate.
- **Files:** Modify `.github/workflows/ci.yml`.
- **Approach:** Add build CLI, integration tests, smoke simulation with analyse, balance simulation, and audit steps in the requested order after the default unit test lane is fixed.
- **Test scenarios:** Workflow YAML contains every required command exactly once in a clear sequence.
- **Verification:** Static inspection plus local execution of the same command list.

### U4. Harden Starter Deck Registry

- **Goal:** Make starter deck registry canonical and prevent compatibility drift.
- **Files:** Modify `src/game-core/model/player.ts`, `src/game-core/data/players/novice-tamer.ts`, `src/game-core/data/decks/novice-tamer-starter.ts`, `src/game-core/systems/validation.ts`, `src/game-core/testing/content-dependencies.ts`, `src/game-core/systems/content-workbench.ts`, and tests under `tests/game-core/`.
- **Approach:** Keep `RunState.deckCardIds` mutable, resolve the starter deck by `startingDeckId`, add drift validation if `startingDeckCardIds` remains, and expose clear dependency diagnostics.
- **Test scenarios:** Valid registry has no drift warning; mismatched compatibility cards fail or warn at the player path; missing deck/card/owner references are reported; run creation copies from deck registry; deck economy mutates only run deck state.
- **Verification:** `tests/game-core/run-integration.test.ts`, `tests/game-core/deck-economy.test.ts`, `tests/game-core/content-dependencies.test.ts`, `tests/game-core/content-workbench.test.ts`, and `npm run typecheck`.

### U5. Add Dedicated Deck Workbench View

- **Goal:** Make deck registry information designer-readable without relying on JSON preview.
- **Files:** Modify/extract from `src/app/content-workbench.ts`, `src/app/styles.css`, `src/game-core/systems/content-workbench.ts`, and tests in `tests/game-phaser/content-workbench-ui.test.ts` / `tests/game-core/content-workbench.test.ts`.
- **Approach:** Render a read-only deck panel from structured view-model data with card list, distributions, pet-command count, tags, and where-used context.
- **Test scenarios:** Selecting `novice_tamer_starter` shows owner class, size, cards, type/family distribution, rarity mix, pet-command count, tag distribution, and player-class usage.
- **Verification:** Workbench core and UI tests, `npm run build`.

### U6. Add Dedicated Level / Run Map Viewer

- **Goal:** Make run map node consequences understandable from the workbench UI.
- **Files:** Modify `src/game-core/testing/level-authoring-report.ts`, `src/game-core/systems/content-workbench.ts`, extracted app workbench modules, `src/app/styles.css`, and tests in `tests/game-core/level-authoring-report.test.ts`, `tests/game-core/content-workbench.test.ts`, and `tests/game-phaser/content-workbench-ui.test.ts`.
- **Approach:** Extend deterministic core summaries first, then render a read-only table/panel for nodes and expanded encounter/monster/reward data. Include broken-reference drilldown from existing diagnostics.
- **Test scenarios:** Act 1 Forest node rows show type/layer/meaning/next ids; combat nodes show candidate encounters and monster names/roles; elite and boss nodes are discoverable; reward pool ids and budgets are visible; broken references appear at node/encounter paths.
- **Verification:** Focused level/workbench tests and browser smoke on the local workbench route.

### U7. Refactor Workbench Core and App Surfaces

- **Goal:** Reduce file size and ownership ambiguity without behaviour changes.
- **Files:** Split `src/app/content-workbench.ts` into modules such as `src/app/content-workbench/model.ts`, `collections.ts`, `render-state.ts`, `render-detail.ts`, `render-diagnostics.ts`, `render-reports.ts`, `render-deck-view.ts`, and `render-level-view.ts`; split `src/game-core/systems/content-workbench.ts` into focused builders such as deck, level, diagnostics, reports, and dependency builders.
- **Approach:** Extract pure helpers and render sections incrementally, preserving existing exports or adding compatibility re-exports from the original entrypoints.
- **Test scenarios:** Existing imports from `src/app/content-workbench.ts` and `src/game-core/workbench` still work; JSON output remains deterministic; diagnostics and report rendering match previous behaviour.
- **Verification:** `npm test`, `npm run typecheck`, and `npm run build`.

### U8. Refactor CombatScene and RunSandboxController Hardening Surfaces

- **Goal:** Continue splitting the largest presentation/controller surfaces while tightening submit semantics.
- **Files:** Modify/extract from `src/game-phaser/scenes/CombatScene.ts`, `src/game-phaser/controllers/RunSandboxController.ts`, `src/game-phaser/interaction/combat-action-submission.ts`, and related tests in `tests/game-phaser/`.
- **Approach:** Extract action submission/continue helpers, request/revision guard helpers, and bridge modules while keeping Phaser out of game-core and gameplay rules out of scenes.
- **Test scenarios:** Production scene source passes request id and revision to mutating calls; static tests catch missing request/revision arguments; duplicate request ids and stale revisions reject deterministically; combat completion does not advance twice.
- **Verification:** `tests/game-phaser/combat-scene-boundary.test.ts`, `tests/game-phaser/run-controller.test.ts`, `tests/game-phaser/combat-action-submission.test.ts`, and `npm test`.

### U9. Full Clean ZIP and Localhost Verification

- **Goal:** Prove the finished contract from clean source and deployed local environment.
- **Files:** No planned source files beyond validation evidence updates if needed.
- **Approach:** Run the full command gate, generate and inspect the review ZIP, extract it to a clean temp directory for validation, start the local Vite server, and smoke the app/workbench on localhost.
- **Test scenarios:** Full validation commands pass in the working tree and clean ZIP extraction; localhost app and workbench respond; no console/build blockers are observed.
- **Verification:** `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, `npm run build:cli`, `npm run test:integration`, `npm run sim:smoke -- --analyze`, `npm run sim:balance`, `npm audit --audit-level=moderate`, ZIP inspection, and localhost smoke.

## Acceptance Examples

- AE1. Given a clean extracted review ZIP, when `npm test` runs, then the command passes without manual batching.
- AE2. Given the default unit lane, when workbench UI tests run, then they do not execute a real 20-run balance simulation.
- AE3. Given the review ZIP excludes `docs/contracts/p2`, when Phaser boundary tests run, then they do not fail on missing p2 screenshots.
- AE4. Given a player class has both `startingDeckId` and compatibility `startingDeckCardIds`, when they drift, then validation reports the mismatch.
- AE5. Given a designer opens the Deck view, when `novice_tamer_starter` is selected, then owner, cards, counts, rarity mix, pet-command count, tags, and where-used are visible.
- AE6. Given a designer opens the Level viewer, when an elite or boss node is inspected, then encounter, monster, role/tag, budget, and reward pool details are visible.
- AE7. Given production Phaser source is inspected, when a mutating controller call is found, then request id and revision arguments are present.
- AE8. Given a duplicate combat-complete request is submitted, then the controller rejects or no-ops deterministically without advancing run state twice.

## System-Wide Impact

The work touches test placement, UI test dependency injection, CI, packaging/evidence contracts, deck validation, workbench data/view rendering, Phaser scene extraction, and controller guard extraction. It should not alter card effects, monster behaviour, map generation semantics, run balance, pet HP, or active-pet count. The most important runtime compatibility contract is that `RunState.deckCardIds` remains a plain mutable run-state card id list.

## Risks & Mitigations

- Moving slow CLI assertions could reduce coverage. Keep direct unit assertions for cheap metadata formatting and preserve process-level provenance in `tests-integration`.
- Refactoring large workbench files can accidentally change JSON/search/render behaviour. Use compatibility re-exports and focused before/after tests.
- Level viewer work can drift into editor behaviour. Keep all UI read-only and sourced from deterministic core reports.
- Tightening submit APIs can break legacy tests. Add explicit helper wrappers and static production-source tests instead of weakening guards.
- Clean ZIP validation can be expensive. Run it after the default lane is green and before final commit/push.

## Sources / Research

- User validation report in this task for the four default `npm test` blockers and required gate.
- `docs/plans/2026-05-27-021-phase-15-deck-registry-level-viewer-gate-hardening-plan.md` for previous deck registry and level viewer direction.
- `package.json` for the default unit, integration, build, simulation, and audit scripts.
- `tests/game-cli/version.test.ts` and `tests-integration/game-cli/version.integration.test.ts` for CLI provenance coverage split.
- `tests/game-core/simulation-fuzz.test.ts` for deterministic fuzz sample behaviour.
- `tests/game-phaser/combat-scene-boundary.test.ts` for the hardcoded p2 screenshot dependency and production source boundary checks.
- `tests/game-phaser/content-workbench-ui.test.ts` and `src/app/content-workbench.ts` for workbench UI rendering and balance dashboard simulation coupling.
- `scripts/create-review-zip.mjs` and `tests/scripts/create-review-zip.test.js` for review ZIP exclusions and nested snapshot hygiene.
- `.github/workflows/ci.yml` for the current incomplete CI gate.
- `src/game-core/systems/content-workbench.ts`, `src/game-core/testing/level-authoring-report.ts`, and `src/game-phaser/controllers/RunSandboxController.ts` for refactor targets.
