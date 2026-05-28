# P2/20 Combat UI/UX Hardening Evidence

Date: 2026-05-28
Worktree: `D:\Coding\roguedeckgame-p2-20-combat-ui-ux-hardening`
Base: `origin/main` at `d3fa10bbb02732f0108ce86165546c5ef33a53b8`

## Scope

This evidence pack verifies the combat UI/UX hardening contract after applying and extending the supplied hardening patch. The contract fix scope covers:

- player-facing enemy intent copy, so partial visibility does not expose enemy internal cards as battlefield cards;
- deterministic split validation scripts for core, Phaser, and CLI suites;
- cached CLI smoke builds that are safe under parallel Vitest workers;
- review ZIP fallback support for extracted no-git review folders without including dependency, build, local, or sensitive files;
- Windows-compatible production preview smoke coverage.

## Validation

Commands run from this worktree:

```txt
npm ci
npm run typecheck
npm run test:core
npm run test:phaser
npm run test:cli
npm test
npm run test:integration
npm run build
npm run build:cli
npm run sim:smoke
npm run game:version
node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173 --strictPort
```

Observed passing results:

```txt
npm run typecheck              PASS
npm run test:core              PASS - 60 files / 557 tests
npm run test:phaser            PASS - 46 files / 268 tests
npm run test:cli               PASS - 4 files / 21 tests
npm test                       PASS - 110 files / 846 tests
npm run test:integration       PASS - 2 files / 4 tests
npm run build                  PASS
npm run build:cli              PASS
npm run sim:smoke              PASS - 3 runs / 0 failures
npm run game:version           PASS - registry fingerprint fnv1a32:bc9df23e
```

## Runtime Evidence

Production preview was served from `dist` at:

```txt
http://127.0.0.1:4173/
http://127.0.0.1:4173/workbench/content
```

Screenshots:

```txt
docs/evidence/p2-20-combat-ui-ux-hardening/preview-home.png
docs/evidence/p2-20-combat-ui-ux-hardening/preview-workbench.png
```

The integration smoke also launches the built bundle through Vite preview, fetches app/workbench routes and assets, opens the workbench in a Chrome-compatible browser, verifies rendered content, and asserts that no browser runtime errors were emitted.

## Review Findings Resolved

The independent code reviewer found blockers in enemy intent wording, CLI cache locking, review ZIP fallback inclusion, and Windows ZIP listing. The worktree now:

- rejects `planned card`, `card name`, and `card text` copy in partial enemy intent view-model output;
- protects CLI cache locks with an owner PID/token, so a slow live builder cannot have its lock stolen;
- uses a default-deny filesystem fallback allowlist for no-git review ZIPs;
- excludes `.env*`, `.npmrc`, logs, dependency folders, build folders, archived contract folders, and old ZIPs from no-git review ZIP fallback;
- reads ZIP central-directory entries in Node instead of requiring `unzip`.

## Notes

The original contract described `CombatSceneOrchestrator Split Pass` as the next ticket after this hardening patch. This work keeps that as a separate behavioural-no-op refactor rather than silently expanding the current patch into a large structural rewrite.
