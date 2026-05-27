# Phase 8 - Documentation and Runtime Proof Evidence

## Scope

- Updated extension-point documentation for monster ability planning, content schemas, workbench view models, and the content authoring workflow.
- Updated the combat interaction contract so enemy intent display is explicitly backed by planned monster ability metadata when available.
- Aligned the Phaser combat view model so monster intent display metadata reads planned monster ability effects before falling back to legacy intent effects.
- Added regression coverage proving planned monster ability metadata drives intent description, target hint, and amount.

## Validation

- `npm run typecheck`
- `npx vitest run tests/game-phaser/combat-view-model.test.ts tests/game-phaser/vertical-slice-view-model.test.ts tests/game-core/combat-intents.test.ts tests/game-core/combat-enemy-turn.test.ts`
- `npm run build`
- `npm test`
- `npm run smoke:localhost`
- `node scripts/run-cli-entry.mjs simulate-runs --mode smoke --analyze`
- `node scripts/run-cli-entry.mjs simulate-runs --mode replay --trace tests/game-core/traces/smoke-complete.json`
- Browser smoke against `http://127.0.0.1:5174/`
- Browser combat-path proof against the Vite app's run sandbox controller
- `git diff --check`

## Final Local Results

- TypeScript typecheck passed.
- Focused tests passed: 4 files, 42 tests.
- Full tests passed: 79 files, 640 tests.
- Build passed.
- Localhost smoke passed: 1 test.
- Smoke simulation with analysis passed: 3 runs, 0 failures.
- Replay simulation passed: 1 run, 0 failures.
- Browser startup smoke rendered the run map canvas with no runtime console errors beyond the Phaser startup log.
- Browser combat-path proof passed through map selection, combat start, planned monster ability display, card play, enemy turn, next-turn draw, combat win, reward offering, reward skip, and map advancement.
- Diff check passed.

## Artefacts

- `docs/evidence/phase-8-docs-runtime-proof/phase8-browser-home.png`
- `docs/evidence/phase-8-docs-runtime-proof/phase8-browser-combat-start.png`
- `docs/evidence/phase-8-docs-runtime-proof/phase8-browser-after-card-play-2.png`
- `docs/evidence/phase-8-docs-runtime-proof/phase8-browser-after-enemy-turn-settled.png`
- `docs/evidence/phase-8-docs-runtime-proof/phase8-browser-combat-path.json`
- `docs/evidence/phase-8-docs-runtime-proof/phase8-browser-console.log`
