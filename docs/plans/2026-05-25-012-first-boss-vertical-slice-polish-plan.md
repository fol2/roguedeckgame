# First Boss Vertical Slice Polish Plan

## Contract

- Source: `docs/contracts/11-first-boss-vertical-slice-polish-contract.md`
- Delivery copy: `docs/contracts/11-first-boss-vertical-slice-polish.md`
- Completion report: `docs/contracts/11-first-boss-vertical-slice-polish-completion-report.md`

## Files To Add Or Update

- Core content: `src/game-core/data/monsters/forest-monsters.ts`, `src/game-core/data/encounters/forest-encounters.ts`
- Run/browser bridge: `src/game-phaser/controllers/RunSandboxController.ts`
- View models: `src/game-phaser/view-models/run-view-model.ts`, `src/game-phaser/view-models/combat-view-model.ts`, `src/game-phaser/view-models/reward-view-model.ts`
- Phaser polish: `MapScene`, `CombatScene`, `RewardScene`, related presenters, event messages, and layout helpers
- Tests: vertical-slice content, run flow, controller, view model, and existing boundary suites

## Content Plan

- Keep existing encounter IDs to avoid churn.
- Replace `forest_elite_placeholder` data with Charred Stag.
- Replace `forest_boss_placeholder` data with Forest Warden.
- Use only existing monster intent and effect shapes: damage, block, and applyStatus.
- Do not add reward cards unless tests or playability show a clear contract need.

## Test Plan

- Add core content tests proving registry validity, elite/boss monster data, encounter wiring, boss reachability, and known effect types.
- Add core lifecycle tests proving deterministic map-to-boss completion and loss without Phaser.
- Add controller tests proving Map -> Combat -> Reward -> Map progression, event/rest structural completion, elite/boss reachability, reset, serialisation, and rejection messages.
- Add view-model tests proving elite/boss labels, combat context, reward option details, event formatting, and JSON serialisation.
- Keep existing boundary tests enforcing game-core and Phaser separation.

## Non-Goals

- No final art, generated assets, audio, save/load UI, story/dialogue UI, card upgrade UI, relics, meta-currency, generic boss scripting engine, deployment package, React, Redux, Zustand, Pixi, GSAP, Playwright, Electron, or Tauri.
- No new production dependency.

## Architecture Risks

- Phaser scenes must not call core lifecycle or gameplay resolver functions directly.
- `src/game-core` must remain Phaser-free and browser-storage-free.
- Boss/elite behaviour must stay data-driven and use existing effect types.

## Controller-Flow Risks

- Completed/lost runs must expose a reset/new-run path.
- Rejected actions must preserve useful event messages.
- Combat completion must go through `RunSandboxController`, not scenes calling core.

## Boss-Content Overbuild Risks

- Keep Forest Warden data-only for this ticket.
- Do not add phases, thresholds, summons, relic rewards, or a boss framework.

## UI Polish Scope Limits

- Use placeholder shapes/text only.
- Improve clarity through labels, statuses, connection lines, intent text, reward details, and reset/continue controls.
- Keep layout constants centralised in layout helper files.
