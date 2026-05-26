# Engineering Contract — Phase 1.5d Policy Matrix Balance Guard

## Objective

Improve the Phase 1.5 engine-side test and balance harness before Phase 2 UI/UX work starts.

This ticket must not add UI, Playwright, browser monkey testing, new art, animation, or new gameplay content. It should make the existing simulation engine better at answering balance questions such as:

- Does a chaos/random legal policy still sit near the normal fresh-starter target?
- Does a simple aggressive policy perform differently from random?
- Does a defensive policy survive materially better?
- Does the deterministic smoke policy still prove that a coherent policy can finish the game?
- Are we seeing early signs of overpower/underpower or low choice pressure?

## Rationale

The current Phase 1.5c balance gate is useful, but it measures one broad random/legal sample. That is enough for a normal baseline, but not enough to reason about skill bands or policy sensitivity.

Before UI/UX Phase 2, add a small policy matrix layer. This keeps balance work in deterministic `src/game-core` and lets future balance passes compare multiple agent styles without depending on Phaser, browser UI, or monkey tests.

## Non-Negotiables

- Do not import Phaser, browser APIs, `src/game-phaser`, or `src/app` from `src/game-core`.
- Do not add production dependencies.
- Do not add Playwright in this ticket.
- Do not rebalance numbers in this ticket unless tests prove a regression.
- Do not change card, monster, or reward content except for central balance target metadata.
- Do not claim human balance is solved. This remains simulation balance.

## Required Implementation

Add:

```txt
src/game-core/testing/policy-profiles.ts
src/game-core/testing/policy-matrix.ts
tests/game-core/policy-profiles.test.ts
tests/game-core/policy-matrix.test.ts
```

Update:

```txt
package.json
src/game-cli/parse.ts
src/game-cli/simulate-runs.ts
src/game-core/data/balance/act1-normal.ts
src/game-core/index.ts
src/game-core/testing/analysis.ts
src/game-core/testing/simulation.ts
tests/game-cli/parse.test.ts
tests/game-core/simulation-fuzz.test.ts
```

## Policy Profiles

Create stable policy IDs:

```txt
randomLegal
greedyDamage
defensive
deterministicSmoke
```

Expected behavior:

- `randomLegal`: existing random legal policy; chaos baseline.
- `greedyDamage`: prefers damage, burn, pet-command attacks, and offensive pet upgrades.
- `defensive`: estimates incoming damage from monster intents, blocks/guards first when under threat, then attacks.
- `deterministicSmoke`: existing deterministic policy for no-force completion proof.

All policies must choose only legal actions. If a policy chooses an illegal action, simulation must fail.

## Simulation Integration

Extend `runFuzzSimulation` so it accepts:

```ts
policy?: AgentPolicyId
```

Default must remain `randomLegal` so existing fuzz behavior is preserved.

For non-random policies, use action source `policy`. For `randomLegal`, keep source `fuzz`.

## CLI Integration

Add:

```bash
npm run sim:matrix
npm run sim:analyze -- --policy greedyDamage --invalid-action-rate 0
npm run sim:analyze -- --policy defensive --invalid-action-rate 0
```

Support flags:

```txt
--policy <randomLegal|greedyDamage|defensive|deterministicSmoke>
--policy-matrix
--strict-policy-matrix
```

`sim:matrix` should run the policy matrix and print completion/loss/failure rates per policy.

## Balance Target Metadata

Extend central normal balance metadata with policy-matrix sample defaults and warning/gate bands.

The default matrix can warn when strong simple policies complete too often, but it should not hard-fail by default. Strict mode may convert target bands into errors.

## Tests

Add tests that verify:

- policy IDs are stable;
- unknown policy IDs are rejected by parser helpers;
- every policy chooses a legal initial action;
- greedy/defensive policy simulations reach terminal states without rejected legal actions;
- policy matrix summarizes all policies;
- strict policy matrix can enforce target bands when explicitly requested;
- CLI parser understands policy matrix flags;
- existing fuzz test timeout is not flaky after the additional policy machinery.

## Validation Commands

Run:

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
npm run sim:balance
npm run sim:matrix
npm run sim:exhaustive-small -- --seed ci-exhaustive --max-depth 40 --max-states 1000
npm run sim:replay -- --trace tests/game-core/traces/smoke-complete.json
npm audit --audit-level=moderate
```

Stress checks:

```bash
npm run sim:fuzz -- --runs 250 --max-steps 500 --seed stress-fuzz
npm run sim:exhaustive-small -- --seed stress-exhaustive --max-depth 80 --max-states 5000
```

## Expected Initial Finding

The normal random/legal balance gate should remain around the configured 45%-60% completion band.

The new matrix is expected to reveal that simple non-random policies can currently reach 100% completion. Treat this as an early balance signal, not a blocker for Phase 2 UI/UX. The next real tuning pass can decide whether to lower strong-policy win rate, improve enemy/boss pressure, or preserve high skilled-agent success for early prototype feel.

## Acceptance Criteria

- Existing Phase 1.5 validation still passes.
- `npm run sim:balance` still passes.
- `npm run sim:matrix` passes and prints policy-level completion/loss/failure rates.
- Tests increase coverage for policy profiles and matrix reporting.
- No UI/UX implementation is added.
- No dependencies are added.
- No game-core architecture boundary is weakened.
