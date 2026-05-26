# Codex Contract — Phase 1.5 Hotfix: Strict Target Validation for Agent/Fuzz Actions

## Objective

Apply a small hotfix on top of commit `c41b1c0ebcf2dda7ab33e4aa172fa248e3ff541a` after independent validation of the Phase 1.5 agent harness.

The Phase 1.5 implementation is broadly correct and useful, but stress fuzzing found a real invalid-action acceptance bug:

```bash
npm run sim:fuzz -- --runs 250 --max-steps 500 --seed stress-fuzz
```

Before this hotfix, that command produced failures such as:

```txt
Failure seed: stress-fuzz:2
Failure step: 34
Failure code: invalid_injected_action_accepted
Failure message: Invalid action injection produced an accepted action.
```

Root cause: the invalid action injector can produce a `playCard` action that includes a `targetId` for a targetless card such as `Defend` or `Focus`. The current core `playCard` validation accepts that action and silently ignores the irrelevant `targetId`. For the agent/CLI protocol and fuzz harness, that should be rejected as an invalid interaction.

This is exactly the kind of edge case Phase 1.5 is supposed to reveal, so keep the harness. Fix the core validation.

## Required Change

In `src/game-core/systems/combat.ts`, reject `playCard` actions that include `targetId` when the card does not require an explicit action target.

A card requires an explicit action target only when at least one effect has:

```ts
target: { type: "target" }
```

without a baked-in `combatantId`.

If `action.targetId !== undefined` and no card effect requires an action target, return the normal rejected combat result:

```ts
error code: unexpected_card_target
message: Targetless cards must not include a target id.
path: targetId
```

The rejected action must:

- return `ok: false`;
- preserve the original combat state object;
- emit exactly one `ActionRejected` event;
- not move the card;
- not spend energy;
- not mutate player block, monster HP, piles, or events.

## Required Tests

Add direct core coverage in `tests/game-core/combat-play-card.test.ts`:

- playing `Defend` with a `targetId` rejects;
- error code is `unexpected_card_target`;
- state object is unchanged;
- serialized state remains unchanged;
- event sequence is exactly `["ActionRejected"]`.

Add agent-driver coverage in `tests/game-core/agent-run-driver.test.ts`:

- drive until a targetless `playCard` action is legal;
- inject the same card action with an alive monster `targetId`;
- driver returns `ok:false`;
- error code is `unexpected_card_target`;
- emitted event is `ActionRejected`;
- `createAgentStateHash` before and after is identical.

## Patch

A ready-to-apply patch is included in this ZIP:

```txt
phase-1.5-hotfix.patch
```

From the repo root, apply with:

```bash
patch -p1 < phase-1.5-hotfix.patch
```

The ZIP also contains full replacement copies under:

```txt
changed-files/
```

Use the patch first. Use the changed files only for manual inspection or recovery.

## Validation Commands

After applying the patch, run:

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
```

Also run the stress commands that exposed the issue:

```bash
npm run sim:fuzz -- --runs 250 --max-steps 500 --seed stress-fuzz
npm run sim:fuzz -- --runs 400 --max-steps 350 --seed stress-fuzz-400
npm run sim:exhaustive-small -- --seed stress-exhaustive --max-depth 80 --max-states 5000
```

Expected result after the hotfix:

```txt
Failures: 0
Result: passed
```

## Acceptance Criteria

This hotfix is complete when:

- standard typecheck/test/build/CLI/simulation commands pass;
- full `npm test` passes with the new tests included;
- direct `playCard` rejects targetless cards that include `targetId`;
- the agent driver also rejects this action and preserves state hash;
- `sim:fuzz --runs 250 --max-steps 500 --seed stress-fuzz` passes with zero failures;
- no dependency changes are made;
- no Phaser/browser dependency is introduced into `src/game-core`;
- no Playwright/browser automation is added.

## Non-Goals

Do not change card balance.

Do not change the agent action schema.

Do not modify the invalid action injector to hide the issue instead of fixing core validation.

Do not move this validation into Phaser or CLI code only. The fix belongs in `src/game-core/systems/combat.ts` because `playCard` itself should reject semantically invalid action payloads.
