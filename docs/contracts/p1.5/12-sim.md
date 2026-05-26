# Engineering Contract v1.3 — Phase 1.5 Agent Play Harness, CLI, Simulation Testing, and Replayable Regression Traces

## Objective

Before starting Phase 2, strengthen the test module so the current Phase 1 game can be played, simulated, fuzzed, and replayed from start to end without relying on Phaser UI or forced state mutation.

This ticket creates a reusable pure-core agent play harness, a simple CLI for humans and agents, deterministic simulation runners, property/invariant checks, bounded state-space exploration, and replayable regression traces.

This task is about correctness, testability, and finding edge cases. It is not about UI/UX polish, art, animation, new content, or game balance expansion.

## Context

Phase 1 is complete. The current repo already has:

- deterministic `src/game-core` systems;
- run lifecycle functions;
- combat/reward/story/save systems;
- Phaser presentation and `RunSandboxController`;
- vertical-slice tests;
- architecture boundary tests.

However, some current full-run tests still force combat outcomes by mutating combat phase to `won` or `lost`. That is useful for lifecycle tests, but it does not prove that an actual agent can play the game through real legal actions from start to finish.

This ticket must add authentic playthrough coverage.

The test technique being introduced is commonly called:

```txt
fuzz testing / fuzzing
````

This ticket also includes:

```txt
property-based style invariant testing
model-based state-machine testing
bounded state-space exploration
trace replay regression testing
```

Do not oversell this as literally exploring every possible full game forever. The correct practical goal is:

* exhaustive/bounded exploration where the state space is small enough;
* seeded fuzzing where the state space is too large;
* invariant checks after every action;
* trace capture for every failure;
* replay tests that turn discovered bugs into permanent regressions.

## Non-Negotiable Architecture Rules

Keep the existing architecture intact:

* `src/game-core` must not import Phaser.
* `src/game-core` must not import `src/game-phaser` or `src/app`.
* `src/game-core` must not use browser APIs.
* Gameplay randomness must not use direct `Math.random()`.
* Phaser scenes must not gain gameplay rule logic.
* Do not move gameplay rules into CLI code.
* Do not add Playwright in this ticket.
* Do not add React, Redux, Zustand, GSAP, Pixi, Electron, Tauri, browser storage libraries, or animation libraries.
* Do not add production dependencies.
* Avoid new dev dependencies unless there is no workable alternative. Prefer using existing Vite/Vitest/TypeScript tooling.

The new CLI and simulation code should call pure game-core/testing harness APIs.

## High-Level Design

Create a new pure-core test harness layer:

```txt
src/game-core/testing/agent-actions.ts
src/game-core/testing/action-space.ts
src/game-core/testing/run-driver.ts
src/game-core/testing/invariants.ts
src/game-core/testing/policies.ts
src/game-core/testing/simulation.ts
src/game-core/testing/state-hash.ts
src/game-core/testing/trace.ts
```

Then create CLI and script wrappers around that harness:

```txt
src/game-cli/main.ts
src/game-cli/format.ts
src/game-cli/parse.ts
src/game-cli/simulate-runs.ts
```

The harness should be reusable by:

* Vitest tests;
* CLI;
* simulation scripts;
* future Phaser/UI replay tests;
* future AI agents.

Do not build the harness on top of `RunSandboxController`. That controller lives in `src/game-phaser/controllers` and is a presentation bridge. The CLI and simulation must use the new pure-core driver.

Do not refactor `RunSandboxController` unless a tiny change is necessary for compatibility. A later ticket may migrate the Phaser controller to delegate to the new driver, but that is not required here.

## Required Package Scripts

Update `package.json` with these scripts:

```json
{
  "game:cli": "npm run build:cli --silent && node dist-cli/game-cli.mjs",
  "build:cli": "vite build --config vite.cli.config.ts",
  "sim:smoke": "npm run build:cli --silent && node dist-cli/simulate-runs.mjs --mode smoke",
  "sim:fuzz": "npm run build:cli --silent && node dist-cli/simulate-runs.mjs --mode fuzz",
  "sim:exhaustive-small": "npm run build:cli --silent && node dist-cli/simulate-runs.mjs --mode exhaustive-small",
  "sim:replay": "npm run build:cli --silent && node dist-cli/simulate-runs.mjs --mode replay"
}
```

If script argument forwarding is awkward, adjust the implementation so these work:

```bash
npm run game:cli -- --help
npm run game:cli -- --seed agent-smoke --auto
npm run game:cli -- --seed agent-smoke --json --auto

npm run sim:smoke
npm run sim:fuzz -- --runs 100 --max-steps 500 --seed fuzz
npm run sim:exhaustive-small -- --seed exhaustive --max-depth 80 --max-states 5000
npm run sim:replay -- --trace tests/game-core/traces/smoke-complete.json
```

Use existing Vite dependency to build Node-targeted CLI bundles. Add:

```txt
vite.cli.config.ts
```

The config should bundle these entries:

```txt
src/game-cli/main.ts -> dist-cli/game-cli.mjs
src/game-cli/simulate-runs.ts -> dist-cli/simulate-runs.mjs
```

Do not introduce `tsx`, `ts-node`, or a custom TypeScript runtime unless this is explicitly justified in the completion report.

## Required File Changes

Expected files to add:

```txt
vite.cli.config.ts

src/game-core/testing/agent-actions.ts
src/game-core/testing/action-space.ts
src/game-core/testing/run-driver.ts
src/game-core/testing/invariants.ts
src/game-core/testing/policies.ts
src/game-core/testing/simulation.ts
src/game-core/testing/state-hash.ts
src/game-core/testing/trace.ts

src/game-cli/main.ts
src/game-cli/format.ts
src/game-cli/parse.ts
src/game-cli/simulate-runs.ts

tests/game-core/agent-action-space.test.ts
tests/game-core/agent-run-driver.test.ts
tests/game-core/agent-playthrough-smoke.test.ts
tests/game-core/simulation-invariants.test.ts
tests/game-core/simulation-fuzz.test.ts
tests/game-core/simulation-exhaustive-small.test.ts
tests/game-core/trace-replay.test.ts

tests/game-core/traces/.gitkeep
docs/contracts/12-agent-play-harness-simulation-testing-contract.md
docs/contracts/12-agent-play-harness-simulation-testing.md
docs/contracts/12-agent-play-harness-simulation-testing-completion-report.md
```

Expected files to update:

```txt
package.json
package-lock.json
src/game-core/index.ts
```

Optional file to update only if useful:

```txt
AGENTS.md
.agents/skills/combat-engine-test-writer/SKILL.md
docs/codex-skills.md
```

Do not update AGENTS/skills unless the change is short and directly relevant to simulation testing.

## Required Core Types

Create `src/game-core/testing/agent-actions.ts`.

Define a stable action protocol:

```ts
export type AgentAction =
  | SelectMapNodeAgentAction
  | PlayCardAgentAction
  | EndTurnAgentAction
  | CompleteCombatIfEndedAgentAction
  | ClaimRewardAgentAction
  | SkipRewardAgentAction
  | CompleteNonCombatNodeAgentAction
  | ResetRunAgentAction;

export type SelectMapNodeAgentAction = {
  readonly type: "selectMapNode";
  readonly nodeId: RunNodeId;
};

export type PlayCardAgentAction = {
  readonly type: "playCard";
  readonly cardInstanceId: CardInstanceId;
  readonly targetId?: CombatantId;
};

export type EndTurnAgentAction = {
  readonly type: "endTurn";
};

export type CompleteCombatIfEndedAgentAction = {
  readonly type: "completeCombatIfEnded";
};

export type ClaimRewardAgentAction = {
  readonly type: "claimReward";
  readonly rewardOptionId: RewardOptionId;
};

export type SkipRewardAgentAction = {
  readonly type: "skipReward";
};

export type CompleteNonCombatNodeAgentAction = {
  readonly type: "completeNonCombatNode";
};

export type ResetRunAgentAction = {
  readonly type: "reset";
};
```

Also define:

```ts
export type AgentActionSource =
  | "legal"
  | "policy"
  | "fuzz"
  | "invalid-injected"
  | "replay"
  | "cli";

export type AppliedAgentAction = {
  readonly step: number;
  readonly action: AgentAction;
  readonly source: AgentActionSource;
};
```

Keep these types serializable.

## Required Core Driver

Create `src/game-core/testing/run-driver.ts`.

Define a pure game-core driver that owns run state, pet instances, optional combat state, action RNG, and last events.

Suggested public API:

```ts
export type AgentRunDriverConfig = {
  readonly seed: string | number;
  readonly playerClassId?: PlayerClassId;
  readonly activePetInstanceIds?: readonly PetInstanceId[];
  readonly petInstances?: readonly PetInstance[];
  readonly registry?: GameContentRegistry;
};

export type AgentRunDriverSnapshot = {
  readonly run: RunState;
  readonly petInstances: readonly PetInstance[];
  readonly combat?: CombatState;
  readonly lastEvents: readonly GameEvent[];
};

export type AgentRunDriver = {
  readonly getSnapshot: () => AgentRunDriverSnapshot;
  readonly getLegalActions: () => readonly AgentAction[];
  readonly applyAction: (
    action: AgentAction,
    source?: AgentActionSource
  ) => GameActionResult<AgentRunDriverSnapshot>;
  readonly reset: () => GameActionResult<AgentRunDriverSnapshot>;
};
```

Implement:

```ts
export const createAgentRunDriver = (
  config: AgentRunDriverConfig
): AgentRunDriver => { ... };
```

Driver behavior:

1. On create/reset, create a run with `novice_tamer`, Ember Fox fixture/default, `starterRegistry`, and the provided seed unless overrides are supplied.
2. For `selectMapNode`, call `selectRunNode`.
3. If selecting a combat/elite/boss node, immediately call `startCombatForRunNode`.
4. For `playCard`, call core `playCard` with explicit `targetId` from the agent action. Do not auto-target inside the driver unless the action was produced by a policy.
5. For `endTurn`, call `endPlayerTurn`, then `resolveEnemyTurn` if appropriate, matching current browser flow.
6. For `completeCombatIfEnded`, require combat phase `won` or `lost`, then call `completeRunCombatNode`.
7. For `claimReward`, call `claimRunPendingReward`.
8. For `skipReward`, call `skipRunPendingReward`.
9. For `completeNonCombatNode`, call `completeRunNonCombatNode`.
10. For invalid actions, return `ok:false` with `ActionRejected` event and do not corrupt state.
11. Preserve the previous valid state when an invalid action is rejected, unless the underlying core lifecycle intentionally returns a safe rejected state.
12. Every result must include updated snapshot, events, and errors.
13. Driver snapshot and events must be JSON-serializable.
14. Do not throw for normal invalid gameplay actions.

Important: this driver is for testing/agent play. It may live under `src/game-core/testing`, but it must still respect core purity and deterministic behavior.

## Required Action Space

Create `src/game-core/testing/action-space.ts`.

Implement:

```ts
export const getLegalAgentActions = (
  snapshot: AgentRunDriverSnapshot,
  registry?: GameContentRegistry
): readonly AgentAction[] => { ... };
```

Legal action requirements:

* If run status is `completed` or `lost`, return `[]`.
* If run status is `map_select` and there is no active non-combat node, return one `selectMapNode` action per available node.
* If run status is `map_select` and there is an active `event` or `rest` node, return `completeNonCombatNode`.
* If run status is `combat` and combat phase is `player_turn`, return:

  * playable `playCard` actions for every playable card in hand;
  * all valid target combinations for target-required cards;
  * targetless play actions for targetless cards;
  * `endTurn`.
* If combat phase is `won` or `lost`, return `completeCombatIfEnded`.
* If run status is `reward`, return one `claimReward` action per open reward option plus `skipReward`.
* Do not include reset in normal legal actions. Reset is CLI-only/manual.

Ordering must be deterministic.

Suggested order:

1. complete forced transitions;
2. map node actions sorted by layer/order/id;
3. card actions in hand order;
4. target order by monster order;
5. reward actions in reward option order;
6. skip reward after claim options;
7. end turn after playable card actions.

## Required Invariant Checks

Create `src/game-core/testing/invariants.ts`.

Implement:

```ts
export type InvariantIssue = {
  readonly code: string;
  readonly message: string;
  readonly severity: "error" | "warning";
  readonly path?: string;
};

export type InvariantCheckResult = {
  readonly ok: boolean;
  readonly issues: readonly InvariantIssue[];
};

export const checkAgentRunInvariants = (
  snapshot: AgentRunDriverSnapshot
): InvariantCheckResult => { ... };
```

Check at least these invariants.

Run invariants:

* `run.status === "reward"` implies `pendingRewardOffer?.status === "open"`.
* `run.status !== "reward"` implies no open `pendingRewardOffer`.
* `run.status === "combat"` implies there is an active combat and exactly one active combat/elite/boss node.
* `run.status === "completed"` or `run.status === "lost"` implies no active combat in the snapshot.
* `completed` / `lost` run has no legal gameplay actions except reset if CLI asks manually.
* Map node ids are unique.
* At most one active node exists.
* Available nodes must not exist in earlier layers after a later active/completed node.
* Active pet instance ids are unique.
* Every active pet instance id exists in `petInstances`.

Combat invariants:

* A card instance id exists in exactly one pile among `drawPile`, `hand`, `discardPile`, `exhaustPile`.
* Every pile card id exists in `cardInstances`.
* No duplicate card instance id in a pile.
* `energy >= 0`.
* `maxEnergy >= 0`.
* `player.hp <= player.maxHp`.
* `monster.hp <= monster.maxHp`.
* If combat phase is `won`, all monsters are not alive.
* If combat phase is `lost`, player is not alive.
* If combat phase is `player_turn`, player is alive.
* Dead monsters should not have active intents.
* `activePetInstanceIds` has no duplicates.
* Every `runPetState.petInstanceId` refers to an active pet.

Reward invariants:

* Open reward offer option ids are unique.
* Card reward options reference registered cards.
* Pet-upgrade reward options reference registered upgrades.
* Pet-upgrade reward target pet exists.

Serialization invariants:

* Snapshot can be `JSON.stringify` / `JSON.parse` round-tripped.
* Events can be `JSON.stringify` / `JSON.parse` round-tripped.
* No function-like values should appear in snapshots or traces.

Warnings are allowed for non-fatal shape concerns. Errors must fail tests and simulations.

## Required State Hashing

Create `src/game-core/testing/state-hash.ts`.

Implement deterministic state hashing for bounded exploration:

```ts
export const createAgentStateHash = (
  snapshot: AgentRunDriverSnapshot
): string => { ... };
```

The hash must be stable across runs with the same state.

It should include gameplay-relevant fields:

* run status;
* map node statuses/current node;
* deck card ids;
* pending reward option ids/kinds;
* pet upgrade ids;
* combat phase;
* turn number;
* player hp/block/statuses;
* monster hp/block/statuses/alive/intents;
* energy;
* hand/draw/discard/exhaust card instance ids and card ids.

Do not include volatile fields such as last event text formatting if not gameplay-relevant.

## Required Policies

Create `src/game-core/testing/policies.ts`.

Implement at least three policies.

### 1. deterministicSmokePolicy

This should try to complete a run without forcing combat outcome.

Behavior:

* Select available nodes in deterministic order.
* Prefer normal combat before event/rest if both are available, unless the map requires otherwise.
* In combat:

  * if combat is ended, complete it;
  * play playable damage/burn/pet-command cards first;
  * target the lowest-hp alive monster unless a card has a better obvious target rule;
  * then play useful block/draw cards;
  * end turn when no useful playable card remains.
* In reward:

  * prefer pet upgrade if available;
  * otherwise claim first card reward;
  * skip only if no option exists.
* Complete event/rest nodes immediately.
* Stop once run is `completed` or `lost`.

This policy should be strong enough to complete at least one known deterministic seed in the current Phase 1 content.

### 2. randomLegalPolicy

Given a seeded RNG, pick a random legal action.

### 3. invalidActionInjector

Given a snapshot and RNG, occasionally produce invalid actions for fuzzing, such as:

* missing node id;
* locked node id;
* missing card id;
* dead target id;
* reward option id when no reward is open;
* end turn when no combat exists;
* complete combat before combat has ended;
* claim reward during combat.

Invalid actions should be rejected safely, not crash and not corrupt state.

## Required Trace Format

Create `src/game-core/testing/trace.ts`.

Define:

```ts
export type AgentTrace = {
  readonly schemaVersion: 1;
  readonly seed: string | number;
  readonly mode: "smoke" | "fuzz" | "exhaustive-small" | "cli" | "regression";
  readonly createdAt?: string;
  readonly finalStatus?: RunStatus;
  readonly steps: readonly AgentTraceStep[];
  readonly failure?: AgentTraceFailure;
};

export type AgentTraceStep = {
  readonly step: number;
  readonly action: AgentAction;
  readonly source: AgentActionSource;
  readonly ok: boolean;
  readonly events: readonly GameEvent[];
  readonly errors: readonly GameActionError[];
  readonly stateHashAfter: string;
};

export type AgentTraceFailure = {
  readonly step: number;
  readonly code: string;
  readonly message: string;
  readonly invariantIssues?: readonly InvariantIssue[];
};
```

Implement:

```ts
export const replayAgentTrace = (
  trace: AgentTrace,
  config?: Partial<AgentRunDriverConfig>
): ReplayResult => { ... };

export const serializeAgentTrace = (trace: AgentTrace) => string;
export const parseAgentTrace = (text: string) => AgentTrace;
```

Replay requirements:

* Start from the trace seed.
* Apply each action in order.
* Check that each step produces the same `ok` result.
* Check state hash after each step.
* Check invariants after each step.
* Return useful failure details if replay diverges.
* Do not require wall-clock `createdAt` to match.

## Required Simulation Runner

Create `src/game-core/testing/simulation.ts`.

Implement reusable functions:

```ts
export type SimulationMode =
  | "smoke"
  | "fuzz"
  | "exhaustive-small"
  | "replay";

export type SimulationConfig = {
  readonly mode: SimulationMode;
  readonly seed: string | number;
  readonly runs?: number;
  readonly maxSteps?: number;
  readonly maxDepth?: number;
  readonly maxStates?: number;
  readonly invalidActionRate?: number;
};

export type SimulationResult = {
  readonly ok: boolean;
  readonly mode: SimulationMode;
  readonly seed: string | number;
  readonly runsCompleted: number;
  readonly traces: readonly AgentTrace[];
  readonly failures: readonly AgentTrace[];
};
```

Implement:

```ts
export const runSmokeSimulation = (...): SimulationResult;
export const runFuzzSimulation = (...): SimulationResult;
export const runBoundedExhaustiveSimulation = (...): SimulationResult;
```

Smoke mode:

* Run deterministicSmokePolicy on a fixed set of seeds.
* Must include at least one seed that completes the current Phase 1 run without forced win/loss mutation.
* It is acceptable for some seeds to end in `lost`, but they must end cleanly without crash, invariant failure, or stuck state.
* Fail if a run exceeds `maxSteps`.

Fuzz mode:

* Run many seeds.
* At each step, choose random legal action.
* Occasionally inject invalid action based on `invalidActionRate`.
* Check invariants after every step.
* Fail on thrown exception, invariant error, replay divergence, or max-step stuck state.
* Capture a trace for every failure.

Bounded exhaustive mode:

* Use DFS or BFS.
* Explore legal actions from a seed.
* Use `createAgentStateHash` to deduplicate states.
* Stop at `maxDepth` or `maxStates`.
* Check invariants after every transition.
* It is acceptable to cap branching if needed, but the cap must be explicit and deterministic.
* This mode should be small enough to run in CI through Vitest.

## Required CLI

Create `src/game-cli/main.ts`.

The CLI has two purposes:

1. Let a human quickly play the current game in the terminal.
2. Let an external agent interact through a simple JSON Lines protocol.

It does not need to be pretty.

### CLI commands

Support:

```bash
npm run game:cli -- --help
npm run game:cli -- --seed cli-dev
npm run game:cli -- --seed cli-dev --auto
npm run game:cli -- --seed cli-dev --json
npm run game:cli -- --seed cli-dev --json --auto
```

### Human mode

Print:

* current run status;
* current node/map summary;
* combat summary if in combat;
* player hp/block/energy;
* monster hp/block/status/intent;
* hand cards;
* reward options;
* legal actions as numbered options.

Allow user to type:

```txt
1
2
end
skip
reset
quit
help
```

Human mode can map numbers to legal actions. It does not need curses, colors, layout, or animation.

### JSON Lines mode

On start, output one JSON object:

```json
{
  "type": "state",
  "ok": true,
  "stateSummary": {},
  "legalActions": [],
  "events": []
}
```

For each input line, accept:

```json
{"action":{"type":"selectMapNode","nodeId":"..."}}
{"action":{"type":"playCard","cardInstanceId":"...","targetId":"..."}}
{"action":{"type":"endTurn"}}
{"action":{"type":"completeCombatIfEnded"}}
{"action":{"type":"claimReward","rewardOptionId":"..."}}
{"action":{"type":"skipReward"}}
{"action":{"type":"completeNonCombatNode"}}
{"action":{"type":"reset"}}
```

Return:

```json
{
  "type": "result",
  "ok": true,
  "stateSummary": {},
  "legalActions": [],
  "events": [],
  "errors": []
}
```

On invalid JSON, return a JSON error object and keep the process alive.

### Auto mode

`--auto` should run deterministicSmokePolicy until `completed`, `lost`, or `maxSteps`.

It should print a compact summary:

```txt
Seed: cli-dev
Final status: completed
Steps: 123
Invariant checks: passed
Trace: not saved
```

If `--json --auto`, emit JSON result.

Do not make CLI output depend on Phaser view models.

## Required Simulation CLI

Create `src/game-cli/simulate-runs.ts`.

Support:

```bash
npm run sim:smoke
npm run sim:fuzz -- --runs 100 --max-steps 500 --seed fuzz
npm run sim:exhaustive-small -- --seed exhaustive --max-depth 80 --max-states 5000
npm run sim:replay -- --trace tests/game-core/traces/smoke-complete.json
```

Output should be clear and CI-friendly:

```txt
Simulation mode: fuzz
Seed prefix: fuzz
Runs: 100
Max steps: 500
Failures: 0
Result: passed
```

On failure:

* print seed;
* print step;
* print action;
* print invariant issue or exception;
* write a trace file under a generated temporary path or documented output path.

Do not write random trace artifacts into the repo by default during tests. Only committed regression traces belong under `tests/game-core/traces`.

## Required Tests

### 1. `tests/game-core/agent-action-space.test.ts`

Cover:

* initial run exposes available map node actions;
* locked nodes are not legal;
* selecting combat exposes combat actions;
* target-required cards produce target-specific play actions;
* won/lost combat exposes `completeCombatIfEnded`;
* reward state exposes claim actions plus skip;
* completed/lost state exposes no legal actions.

### 2. `tests/game-core/agent-run-driver.test.ts`

Cover:

* driver creates deterministic initial run;
* selecting a combat node starts combat;
* play card uses explicit target;
* invalid action returns `ok:false` and `ActionRejected`;
* end turn resolves enemy turn and starts next player turn when appropriate;
* completed combat advances to reward or completed boss state;
* claim/skip reward returns to map selection;
* reset returns to deterministic initial state;
* snapshots are JSON-serializable.

### 3. `tests/game-core/agent-playthrough-smoke.test.ts`

Cover:

* deterministicSmokePolicy completes at least one known seed from start to final `completed` without forcing combat result;
* one or more additional seeds reach either `completed` or `lost` cleanly;
* no invariant errors occur after any step;
* the run does not exceed max steps.

Important: This test must not mutate combat directly to `won` or `lost`.

### 4. `tests/game-core/simulation-invariants.test.ts`

Cover intentionally constructed edge cases:

* duplicate card instance across piles fails invariant;
* reward status mismatch fails invariant;
* active pet id missing from pet instances fails invariant;
* won combat with alive monster fails invariant;
* lost combat with alive player fails invariant;
* legal clean driver snapshot passes invariant checks.

### 5. `tests/game-core/simulation-fuzz.test.ts`

Cover:

* fuzz simulation runs a small deterministic sample in CI, such as 20 runs with max 300 steps;
* invalid action injection happens at least once in a controlled test;
* invalid injected actions are rejected safely;
* no crash, no invariant error, no stuck state.

Keep this fast. Large fuzz runs belong to manual scripts, not normal `npm test`.

### 6. `tests/game-core/simulation-exhaustive-small.test.ts`

Cover:

* bounded exhaustive mode explores a small deterministic state space;
* state hashes deduplicate states;
* all visited states pass invariants;
* max-depth/max-states caps are honored.

Keep this fast.

### 7. `tests/game-core/trace-replay.test.ts`

Cover:

* a generated smoke trace can be serialized, parsed, and replayed;
* replay fails clearly if an action is changed;
* replay fails clearly if a state hash diverges;
* committed trace files under `tests/game-core/traces` replay successfully.

Commit at least one small known-good trace:

```txt
tests/game-core/traces/smoke-complete.json
```

This trace should be stable and should not be enormous. If the complete trace is too large, commit a smaller regression trace and keep full trace generation available through scripts.

## Required Documentation

Create:

```txt
docs/contracts/12-agent-play-harness-simulation-testing-contract.md
docs/contracts/12-agent-play-harness-simulation-testing.md
docs/contracts/12-agent-play-harness-simulation-testing-completion-report.md
```

The two contract files should match exactly, following the existing repo convention.

The completion report must include:

* summary of implemented harness;
* list of changed files;
* CLI usage examples;
* simulation usage examples;
* whether any new dependency was added;
* final verification commands and results;
* test count after implementation;
* evidence that at least one authentic no-force playthrough completes;
* note that Playwright/browser monkey testing remains a later optional ticket.

## Validation Commands

Run from a clean checkout:

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run build:cli
npm run game:cli -- --help
npm run game:cli -- --seed cli-smoke --auto
npm run game:cli -- --seed cli-smoke --json --auto
npm run sim:smoke
npm run sim:fuzz -- --runs 20 --max-steps 300 --seed ci-fuzz
npm run sim:exhaustive-small -- --seed ci-exhaustive --max-depth 40 --max-states 1000
npm run sim:replay -- --trace tests/game-core/traces/smoke-complete.json
npm audit --audit-level=moderate
git diff --check
npm run zip:review
```

Also verify the generated review ZIP:

```bash
unzip -q roguedeckgame-review-<sha>.zip -d /tmp/roguedeckgame-review-check
cd /tmp/roguedeckgame-review-check/<repo-folder>
npm ci
npm run typecheck
npm test
npm run build
npm run build:cli
npm run sim:smoke
```

## Acceptance Criteria

This ticket is complete only if all of the following are true:

* The game can be played from terminal through `npm run game:cli`.
* The game can be auto-played by a deterministic policy.
* At least one seed reaches `completed` without forced combat win/loss mutation.
* Multiple seeds reach `completed` or `lost` cleanly without crash/stuck state.
* Legal action generation works from pure core state.
* Invalid actions are rejected safely.
* Invariants run after simulation steps.
* Fuzz simulation can run in CI with small limits.
* Bounded exhaustive simulation can run in CI with small limits.
* Replay trace system can serialize, parse, and replay traces.
* At least one committed trace replays successfully.
* No Phaser/browser dependency is introduced into `src/game-core`.
* No production dependency is added.
* No Playwright/browser automation is added in this ticket.
* `npm run typecheck`, `npm test`, `npm run build`, CLI build, simulation scripts, audit, and review ZIP validation pass.

## Explicit Non-Goals

Do not add new cards, pets, monsters, rewards, bosses, or story content.

Do not rebalance the game unless the authentic playthrough is impossible due to a genuine Phase 1 bug. If a minimal bug fix is required, document it clearly in the completion report.

Do not implement Playwright.

Do not implement browser monkey testing.

Do not improve UI visuals.

Do not refactor Phaser scenes for style.

Do not create save/load UI.

Do not add asset files.

Do not create a large generated trace corpus.

Do not claim exhaustive coverage of the full game. Use the wording “bounded exhaustive exploration” for the exhaustive-small mode.

## Suggested Follow-Up Ticket After This

After this ticket lands, a later optional ticket can add UI-level interaction testing:

```txt
Phase 1.6 — Browser Interaction Smoke / Canvas Monkey Testing
```

That later ticket may explicitly approve Playwright and should replay some of the core agent traces through Phaser UI where possible.

For now, keep this ticket focused on pure-core agent play, CLI, simulation, fuzzing, invariants, and trace replay.
