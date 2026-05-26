# Validation Report — Phase 1.5c Normal Difficulty Balance

## Source ZIP / Git Sync

The supplied ZIP was checked against GitHub main.

```txt
ZIP declared commit: 551543f84324a60295633b8cba8ca9b478a2852a
GitHub repo: fol2/roguedeckgame
GitHub compare: 551543f84324a60295633b8cba8ca9b478a2852a == main
Status: identical
Ahead/behind: 0 / 0
```

## Baseline Finding

Before this patch, the Phase 1.5b analyzer reported a very high completion rate in broad simulation samples. More importantly, inspection found the full-run balance metric was not meaningful yet because combat creation reset the player to full HP every fight.

That meant final-boss win rate could not be balanced correctly until HP persisted across the run.

## Patch Result

This patch adds persistent run-level HP and a normal balance gate.

```txt
npm run sim:balance
completed=93
lost=107
completion=46.5%
loss=53.5%
configured target=45.0% - 60.0%
```

## Final Validation Commands

```txt
npm run typecheck                                           passed
npm test                                                    passed, 57 files / 438 tests
npm run build                                               passed
npm run build:cli                                           passed
npm run game:cli -- --seed cli-smoke --auto                 passed, completed in 61 steps
npm run game:cli -- --seed cli-smoke --json --auto          passed, completed in 61 steps
npm run sim:smoke                                           passed
npm run sim:fuzz -- --runs 20 --max-steps 300 --seed ci-fuzz passed
npm run sim:analyze -- --runs 20 --max-steps 300 --seed ci-fuzz --strict-health passed
npm run sim:balance                                         passed
npm run sim:exhaustive-small -- --seed ci-exhaustive --max-depth 40 --max-states 1000 passed
npm run sim:replay -- --trace tests/game-core/traces/smoke-complete.json passed
npm audit --audit-level=moderate                            passed, 0 vulnerabilities
git diff --check                                            passed
```

## Stress Gates

```txt
npm run sim:fuzz -- --runs 250 --max-steps 500 --seed stress-fuzz passed, 0 failures
npm run sim:exhaustive-small -- --seed stress-exhaustive --max-depth 80 --max-states 5000 passed, 0 failures
```

## Notes

This is a first automated balance baseline, not final human balance. The target is intentionally a band and should be revisited when smarter agents, more content, meta-progression, and human playtest data exist.
