# Game-Core Combat MVP Plan

## Files to add or update

- Add combat/action models in `src/game-core/model`.
- Add deterministic combat, draw, and effect systems in `src/game-core/systems`.
- Add combat fixtures in `src/game-core/testing`.
- Update `src/game-core/ids.ts`, `src/game-core/model/event.ts`, and `src/game-core/index.ts`.
- Add focused Vitest coverage for combat creation, draw, card play, and pet commands.
- Add contract copy and completion report under `docs/contracts`.

## Test plan

- `npm run typecheck`
- `npm test`
- `npm run smoke:localhost`
- `npm audit --audit-level=moderate`
- Direct source checks for no Phaser imports, `CardInstanceId[]` piles, card-instance event payloads, and multi-pet fixtures.

## Non-goals

- No Phaser, Vite UI, React, browser presentation, or art assets.
- No monster AI, full enemy turns, map generation, rewards, save/load, story progression, card upgrades, or pet upgrade modifier resolution.
- No production dependencies.

## Architecture risks

- Duplicate cards must be represented by `CardInstanceId`, not only `CardId`.
- Invalid gameplay must return serializable `ActionRejected` events and errors without mutating input state.
- Pet targeting must remain multi-pet-ready while Novice Tamer stays data-limited to one active pet.
- Effect resolution must stay data-driven and avoid card-name-specific branches.
