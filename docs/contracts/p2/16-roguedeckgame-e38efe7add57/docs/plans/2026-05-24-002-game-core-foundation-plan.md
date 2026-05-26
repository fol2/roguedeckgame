# Game-Core Foundation Plan

## Files To Create

- Minimal package setup: `package.json`, `tsconfig.json`, `vitest.config.ts`
- Core engine foundation under `src/game-core`
- Registry tests under `tests/game-core`
- Contract copy at `docs/contracts/1-game-core-foundation.md`
- Completion report in `docs/contracts`

## Non-Goals

- No Phaser implementation.
- No Vite UI.
- No combat resolver, card play, monster AI, rewards, save/load, map generation, or art assets.
- No production dependencies.

## Validation Commands

- `npm install`
- `npm run typecheck`
- `npm test`
- Localhost evidence is limited by the contract's core-only scope; do not add a UI server solely for this ticket.

## Architecture Risks

- Accidentally modelling a single permanent pet instead of `activePetInstanceIds`.
- Leaking Phaser or browser assumptions into `src/game-core`.
- Letting starter content become hardcoded engine behaviour.
- Implementing resolver logic before the model and registry boundaries are stable.
