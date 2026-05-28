# P2/20 Combat UI/UX Hardening Completion Report

Date: 2026-05-28
Worktree: `D:\Coding\roguedeckgame-p2-20-combat-ui-ux-hardening`
Base commit: `d3fa10bbb02732f0108ce86165546c5ef33a53b8`

## Completed Scope

- Applied the supplied combat UI/UX hardening patch to a dedicated worktree.
- Replaced player-facing partial enemy intent copy that referred to enemy internal cards with action/intent language.
- Added regression coverage that rejects `planned card`, `card name`, and `card text` wording in partial enemy intent UI copy.
- Added split validation scripts for core, Phaser, and CLI suites.
- Hardened CLI smoke entry builds with content-addressed cache keys and owner-token build locks.
- Hardened review ZIP creation for extracted no-git review folders with a default-deny filesystem fallback.
- Removed the `unzip` command dependency by reading ZIP central-directory entries in Node.
- Fixed Windows production preview integration smoke by invoking local Vite directly and detecting Windows Chrome/Edge installations.
- Split browser bindings and debug export responsibilities out of `CombatSceneOrchestrator` without changing gameplay behaviour.
- Added current runtime evidence under `docs/evidence/p2-20-combat-ui-ux-hardening/`.

## Evidence

Evidence pack:

```txt
docs/evidence/p2-20-combat-ui-ux-hardening/README.md
docs/evidence/p2-20-combat-ui-ux-hardening/preview-home.png
docs/evidence/p2-20-combat-ui-ux-hardening/preview-workbench.png
```

Final patch for this worktree:

```txt
docs/contracts/p2/20-combat-ui-ux-hardening/combat-ui-ux-hardening-final.patch
```

## Validation

Latest passing gates:

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

Production preview evidence was captured from:

```txt
node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173 --strictPort
```

## Reviewer Follow-Up

The first independent code review found blockers in partial intent copy, CLI cache locking, review ZIP fallback safety, and Windows ZIP tooling. These have been addressed in this worktree.

The first contract audit found blockers in review ZIP readiness, missing current p2/20 evidence, an unrepresented integration smoke fix, and the deferred orchestrator split advisory. This worktree now includes current evidence, a final patch, and a no-behaviour orchestration split for browser/debug responsibilities.
