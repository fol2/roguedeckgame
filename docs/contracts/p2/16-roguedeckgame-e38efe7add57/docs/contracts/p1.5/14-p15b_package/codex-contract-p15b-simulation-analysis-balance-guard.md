# Engineering Contract — Phase 1.5b Simulation Analysis, Balance Guard, and Broader Invalid Action Fuzzing

## Objective

Enhance the Phase 1.5 engine-side test harness so it can find more than crashes and lifecycle bugs.

The upgraded simulation layer should help detect:

- invalid action validation holes;
- overpowered or underpowered early content signals;
- unhealthy game-flow signals such as no losses, no rewards, no pet upgrades, no player damage, or no monster damage;
- reward/card/pet-upgrade coverage gaps;
- card and action usage concentration;
- stuck or failed traces.

This is still engine-side only. Do not add UI monkey testing, browser automation, Playwright, canvas clicking, art, UI polish, or Phaser refactors in this ticket.

## Base

Apply this work on top of:

```txt
ec08726d06fd5957178a1721d4393fd2b4554287
```

The review ZIP for this base should be `roguedeckgame-p15-hotfix-strict-target-validation-review.zip`.

## Non-Negotiable Rules

- Keep `src/game-core` deterministic and free of Phaser/browser imports.
- Do not add production dependencies.
- Do not add Playwright or browser monkey tests in this ticket.
- Do not change UI/UX.
- Keep all new analysis code serializable and Node-testable.
- Invalid gameplay actions should return `ok:false` and `ActionRejected`, not throw.
- Do not weaken existing trace replay, invariant, smoke, fuzz, or exhaustive simulation tests.

## Required Implementation

### 1. Broaden invalid action generation

Update `src/game-core/testing/policies.ts`.

Add:

```ts
export const enumerateInvalidAgentActions = (
  snapshot: AgentRunDriverSnapshot,
  registry?: GameContentRegistry
): readonly AgentAction[] => { ... };
```

It should generate intentionally invalid actions such as:

- missing map node;
- locked/completed/skipped map node;
- missing card id;
- card id from a non-hand pile;
- target-required card with no target;
- player-targeted card action when the card is expected to target an enemy;
- targetless card with a target id;
- dead target;
- reward claim outside a legal reward state;
- complete combat before combat ended;
- skip reward outside reward state;
- complete non-combat node when not active.

Filter the returned list against `getLegalAgentActions` so the list is made of actions that the model says are illegal.

Update `invalidActionInjector` to choose from this enumerated list.

### 2. Fix the validation bug discovered by broader fuzzing

Expanded invalid-action fuzzing finds that a player card with a target-required effect can target the player:

```json
{"type":"playCard","cardInstanceId":"...:strike","targetId":"player"}
```

This is currently accepted and damages the player. For the current Phase 1 engine, player card action targets should be alive monsters.

Update core combat validation in `src/game-core/systems/combat.ts`:

- if an action target is required and the provided target exists but is not a monster, return `ok:false`;
- emit `ActionRejected`;
- use a stable error code such as `invalid_target_type`;
- do not mutate combat state.

Do not implement friendly-target card support in this ticket. If friendly-target cards are introduced later, add explicit target metadata first.

### 3. Add simulation analysis module

Create:

```txt
src/game-core/testing/analysis.ts
```

It must export:

```ts
analyzeAgentTrace(trace)
analyzeAgentTraces(traces)
checkSimulationHealth(report, options?)
sortedCountEntries(counts, limit?)
```

Track at least:

- total runs;
- completed/lost/failed/other counts;
- completion/loss/failure rates;
- min/max/average steps;
- accepted/rejected actions;
- invalid injected/rejected/accepted actions;
- combats started/won/lost;
- rewards offered/selected/skipped;
- card rewards added;
- pet upgrades unlocked;
- story events completed;
- total damage to player;
- total damage to monsters;
- blocked damage;
- block gained by player;
- action counts;
- event counts;
- selected node counts;
- card play counts;
- reward card pick counts;
- pet upgrade pick counts;
- reward type counts.

`checkSimulationHealth` should return errors for hard correctness concerns and warnings for balance/coverage signals.

Suggested hard errors:

- simulation failures are present;
- invalid injected actions were accepted;
- no completed run when completion is required;
- invalid injection did not exercise any rejection when invalid rejection is required.

Suggested warnings:

- no losses in a broad fuzz sample;
- very high completion rate;
- very low completion rate;
- no rewards seen;
- no pet upgrades unlocked;
- no player damage seen;
- no monster damage seen.

### 4. Add CLI analysis output

Update:

```txt
src/game-cli/parse.ts
src/game-cli/simulate-runs.ts
package.json
```

Add CLI flags:

```bash
--analyze
--strict-health
```

Add package script:

```json
"sim:analyze": "node scripts/run-cli-entry.mjs simulate-runs --mode fuzz --analyze"
```

Example command:

```bash
npm run sim:analyze -- --runs 20 --max-steps 300 --seed ci-fuzz --strict-health
```

Expected output should include a compact report similar to:

```txt
Analysis:
  Terminal: completed=18, lost=2, failed=0, other=0
  Rates: completion=90.0%, loss=10.0%, failure=0.0%
  Steps: avg=94.2, min=59, max=124
  Actions: accepted=1708, rejected=175, invalidRejected=175, invalidAccepted=0
  Combat: started=69, won=67, lost=2
  Rewards: offered=49, selected=42, skipped=7, cards=28, petUpgrades=14
  Damage: toPlayer=1542, toMonsters=2741, blocked=1469, playerBlock=1627
  Top card plays: strike=311, defend=203, fox_fetch=117, fox_guard=108, fox_bite=107, focus=103
  Top card rewards: ember_spark=10, kindle=7, quick_guard=4, coordinated_strike=3, fox_flare=3, study_command=1
  Pet upgrades: burning_fang=6, warm_bond=6, ash_instinct=2
  Reward types: card=28, petUpgrade=14
  Actions: playCard:targetless=592, playCard:targeted=535, endTurn=423, selectMapNode=130, completeCombatIfEnded=82, claimReward=56
  Health: no issues
```

`--strict-health` should fail the process only on health errors, not warnings.

### 5. Export analysis helpers

Update `src/game-core/index.ts` so tests and future tools can import the analysis helpers from the game-core public barrel.

### 6. Tests

Add or update tests:

```txt
tests/game-core/simulation-analysis.test.ts
tests/game-core/simulation-fuzz.test.ts
tests/game-core/combat-play-card.test.ts
```

Required coverage:

- smoke traces produce useful engine-flow metrics;
- fuzz traces track invalid-action rejection coverage;
- health checks emit expected hard errors for deliberately bad samples;
- individual trace analysis works;
- invalid action enumeration returns illegal play-card actions;
- fuzz still rejects injected invalid actions safely;
- direct `playCard` rejects player-targeted target-required card actions;
- rejected target bug does not mutate state.

## Validation Commands

Run all commands from a clean checkout after applying the patch:

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run build:cli
npm run game:cli -- --seed cli-smoke --auto
npm run game:cli -- --seed cli-smoke --json --auto
npm run sim:smoke
npm run sim:fuzz -- --runs 20 --max-steps 300 --seed ci-fuzz
npm run sim:analyze -- --runs 20 --max-steps 300 --seed ci-fuzz --strict-health
npm run sim:exhaustive-small -- --seed ci-exhaustive --max-depth 40 --max-states 1000
npm run sim:replay -- --trace tests/game-core/traces/smoke-complete.json
npm audit --audit-level=moderate
git diff --check
```

Recommended stress gates:

```bash
npm run sim:fuzz -- --runs 250 --max-steps 500 --seed stress-fuzz
npm run sim:fuzz -- --runs 400 --max-steps 350 --seed stress-fuzz-400
npm run sim:exhaustive-small -- --seed stress-exhaustive --max-depth 80 --max-states 5000
```

## Acceptance Criteria

- All validation commands pass.
- Test count increases and includes simulation-analysis coverage.
- `sim:analyze` prints actionable flow/balance metrics.
- Broader invalid-action fuzzing finds no accepted invalid actions after the core target bug is fixed.
- No Phaser/browser dependency leaks into game-core.
- No new production dependency is added.
- No UI/UX or browser monkey testing is added.

## Non-Goals

- No Playwright.
- No UI monkey test.
- No Phaser scene changes.
- No game balance changes.
- No new cards, pets, monsters, bosses, or story content.
- No claim that this proves perfect balance. It provides early warning signals only.
