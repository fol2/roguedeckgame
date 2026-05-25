# Engineering Contract v0.6 — Pet Upgrade Modifier Resolution

## Objective

Implement the first real pet-upgrade modifier system in `src/game-core`.

The previous ticket allowed reward claiming to append pet upgrade IDs to `PetInstance.unlockedUpgradeIds`. This ticket makes those unlocked upgrades affect combat in a deterministic, testable, event-driven way.

This task must stay entirely inside `src/game-core`, tests, and docs.

Use these skills:

- `$game-architecture-guard`
- `$pet-system-designer`
- `$combat-engine-test-writer`
- `$content-author`

## Current Baseline

Latest pushed HEAD before this ticket:

```txt
04bc9a056b0e890fb31634df7a0257500cce1e5d
```

The current game-core already includes:

- deterministic combat loop
- card instances
- pet-command cards
- monster intents
- Burn status
- win/loss combat outcome
- reward offer generation
- card reward claiming
- pet upgrade reward claiming
- reward skipping
- `PetInstance.unlockedUpgradeIds`
- Ember Fox upgrades as data: `burning_fang`, `warm_bond`, `ash_instinct`

## Core Design Goal

Pet upgrades should upgrade the pet, not individual cards directly.

After this ticket:

- an unlocked Ember Fox upgrade should create one or more active pet modifiers in combat
- those modifiers should alter pet-command behavior deterministically
- modifiers should emit serializable events for future Phaser playback
- modifiers should be data-driven enough to add future pet upgrades without hardcoding combat logic by card name
- the system must remain multi-pet ready

## Non-Goals

Do not implement Phaser.
Do not implement Vite UI.
Do not implement React.
Do not create art assets.
Do not implement map generation.
Do not implement save/load.
Do not implement story progression.
Do not implement card upgrade resolution.
Do not implement relics.
Do not implement bosses.
Do not implement reward UI.
Do not add production dependencies.
Do not hardcode behavior by card name.

## Required File Changes

Create or update:

```txt
src/game-core/model/pet.ts
src/game-core/model/event.ts
src/game-core/model/combat.ts
src/game-core/systems/combat.ts
src/game-core/systems/effects.ts
src/game-core/systems/pet-modifiers.ts
src/game-core/data/upgrades/ember-fox-upgrades.ts
src/game-core/testing/combat-fixtures.ts
src/game-core/testing/reward-fixtures.ts
src/game-core/index.ts

tests/game-core/pet-modifier-burning-fang.test.ts
tests/game-core/pet-modifier-warm-bond.test.ts
tests/game-core/pet-modifier-ash-instinct.test.ts
tests/game-core/pet-modifier-multi-pet.test.ts
tests/game-core/pet-modifier-integration.test.ts
```

Keep all existing tests passing.

## Data Model Requirements

Extend the pet modifier model so modifiers are explicit and data-driven.

The exact shape may be adjusted, but it must support these concepts:

```ts
PetModifierDefinition:
  id
  name
  description
  tags
  rules
```

Suggested rule union:

```ts
export type PetModifierRule =
  | ModifyPetCommandCostRule
  | ModifyPetCommandEffectAmountRule
  | TriggerOnEnemyDefeatedWithStatusRule;
```

Suggested selector type:

```ts
export type CardSelector = {
  readonly cardType?: CardType;
  readonly requiresPetDefinitionId?: PetDefinitionId;
  readonly tagsAny?: readonly string[];
  readonly tagsAll?: readonly string[];
};
```

Suggested cost rule:

```ts
export type ModifyPetCommandCostRule = {
  readonly type: "modifyPetCommandCost";
  readonly selector: CardSelector;
  readonly amount: number; // negative for discount
  readonly minCost?: number;
  readonly limit?: { readonly type: "oncePerCombat" | "oncePerTurn" };
};
```

Suggested effect amount rule:

```ts
export type ModifyPetCommandEffectAmountRule = {
  readonly type: "modifyPetCommandEffectAmount";
  readonly selector: CardSelector;
  readonly effectType: "petAttack" | "applyStatus";
  readonly statusId?: StatusId;
  readonly amount: number;
};
```

Suggested trigger rule:

```ts
export type TriggerOnEnemyDefeatedWithStatusRule = {
  readonly type: "triggerOnEnemyDefeatedWithStatus";
  readonly requiredStatusId: StatusId;
  readonly effects: readonly EffectDefinition[];
  readonly limit?: { readonly type: "oncePerTurn" | "oncePerCombat" };
};
```

The final implementation does not need to match these names exactly, but it must preserve the same capabilities and remain serializable.

## Combat State Requirements

Combat must track modifier usage without mutating input state.

Update either `RunPetState` or `CombatState` to track modifier use.

Suggested shape inside `RunPetState`:

```ts
readonly activeModifierIds: readonly PetModifierId[];
readonly usedModifierIdsThisCombat: readonly PetModifierId[];
readonly usedModifierIdsThisTurn: readonly PetModifierId[];
```

Or an equivalent structure.

Requirements:

1. Active modifiers should be derived from active `PetInstance.unlockedUpgradeIds` during `createCombat`.
2. Temporary modifiers should still be possible later through `RunPetState.temporaryModifierIds`.
3. `usedModifierIdsThisTurn` must reset at the start of each player turn.
4. `usedModifierIdsThisCombat` must persist for the full combat.
5. This must work with multiple active pet instances.

## Event Requirements

Add serializable events for modifier playback and debugging.

Required events:

```ts
CardCostModified
PetModifierActivated
PetModifierConsumed
```

Suggested shapes:

```ts
CardCostModified:
  type: "CardCostModified"
  cardInstanceId: CardInstanceId
  cardId: CardId
  originalCost: number
  modifiedCost: number
  modifierId: PetModifierId
  petInstanceId: PetInstanceId

PetModifierActivated:
  type: "PetModifierActivated"
  petInstanceId: PetInstanceId
  upgradeId: UpgradeId
  modifierId: PetModifierId
  reason: "cardCost" | "effectAmount" | "enemyDefeatedWithStatus"

PetModifierConsumed:
  type: "PetModifierConsumed"
  petInstanceId: PetInstanceId
  modifierId: PetModifierId
  scope: "turn" | "combat"
```

Do not remove existing event types.

All events must remain plain serializable objects.

## Active Modifier Resolution Requirements

Create:

```txt
src/game-core/systems/pet-modifiers.ts
```

It should provide helpers like:

```ts
getActivePetModifierContexts(state, registry)
applyPetCommandCostModifiers(...)
applyPetCommandEffectModifiers(...)
resolvePetModifierTriggersAfterEvents(...)
resetTurnPetModifierUsage(...)
```

Exact function names can differ, but responsibilities must be clear.

A modifier context should include at least:

```ts
petInstanceId
petDefinitionId
upgradeId
modifierId
modifier
```

Requirements:

1. Only active pet instances should contribute modifiers.
2. Only unlocked upgrades on that pet instance should contribute modifiers.
3. The upgrade definition must match the pet definition.
4. Missing upgrade definitions should not crash normal gameplay; return an `ActionRejected` result when the missing definition is required during combat creation or modifier resolution.
5. Modifiers should not apply from inactive pets.
6. Modifiers should not apply from a second pet when a command targets only the leading pet and the second pet is not the target.
7. Modifiers should be deterministic.
8. Do not use direct `Math.random()`.

## Pet Target and Modifier Ownership Rules

For this ticket, modifier ownership should follow the pet target used by the pet-command card.

Rules:

1. If the card has a pet effect with `petTarget: { type: "leading" }`, only the leading pet's modifiers apply.
2. If the card has `petTarget: { type: "specific" }`, only that active pet's modifiers apply.
3. If the card has `petTarget: { type: "allActive" }`, all resolved active pets may contribute modifiers.
4. If the card has `petTarget: { type: "randomActive" }`, the selected random active pet's modifiers apply, using seeded RNG.
5. If the card has `petTarget: { type: "withTag" }`, all resolved active pets with that tag may contribute modifiers.
6. If the card has no pet effect but `requiresPetDefinitionId`, use the first active pet instance matching that pet definition.
7. Non-pet cards should not receive pet-command modifiers unless a future rule explicitly supports that. Do not implement non-pet-card modifier application in this ticket.

## Ember Fox Modifier Behavior

Update `src/game-core/data/upgrades/ember-fox-upgrades.ts` so the three starter upgrades have real modifier rules.

### Burning Fang

Design intent:

```txt
Ember Fox burn-attack commands hit harder and apply more Burn.
```

Required behavior:

For eligible Ember Fox pet-command cards with tags including `burn`:

- each `petAttack` effect gains `+2` amount
- each `applyStatus` effect for Burn gains `+1` stack

Examples:

- `Fox Bite`: petAttack 5 -> 7, Burn 2 -> 3
- `Fox Flare`: petAttack 3 -> 5, Burn 3 -> 4

Events:

- emit `PetModifierActivated` when Burning Fang modifies the card effects
- modifier does not need to be consumed

### Warm Bond

Design intent:

```txt
The first Ember Fox command each combat is cheaper.
```

Required behavior:

For the first eligible Ember Fox pet-command card played each combat by the matching pet:

- reduce card cost by 1
- minimum cost is 0
- emit `CardCostModified`
- emit `PetModifierActivated`
- emit `PetModifierConsumed` with `scope: "combat"`

Examples:

- first `Fox Bite` in combat: cost 1 -> 0
- second `Fox Guard` in the same combat: normal cost 1
- first `Fox Fetch` in combat: cost already 0, should remain 0 but still counts as used only if the implementation applies the rule; prefer not consuming Warm Bond when cost is already 0 unless this complicates the implementation. Whichever behavior is chosen must be documented and tested.

Preferred behavior:

```txt
Do not consume Warm Bond on a card whose cost is already 0 and cannot be reduced.
```

### Ash Instinct

Design intent:

```txt
When a burned enemy dies during the player turn, Ember Fox helps you keep momentum.
```

Required behavior:

During `player_turn`, when an enemy with Burn is defeated:

- draw 1 card
- trigger at most once per turn per eligible pet instance
- emit `PetModifierActivated`
- emit `PetModifierConsumed` with `scope: "turn"`
- include the normal draw events from the existing draw system

Clarifications:

1. The enemy must have Burn at the moment defeat is caused or immediately before the damage that defeats it.
2. Trigger should work when the defeat is caused by a normal card, pet-command card, or Burn damage during player turn.
3. Do not trigger during `enemy_turn` for this ticket.
4. Do not trigger after combat is already won/lost if drawing would be meaningless. If the final enemy dies and combat becomes `won`, Ash Instinct should not draw. Test this explicitly.
5. In a multi-enemy fight, if one burned enemy dies and at least one enemy remains alive, Ash Instinct can draw.

## Cost Resolution Requirements

Update `playCard` so it uses modified cost.

Current flow roughly does:

```txt
validate card
check energy against card.cost
emit CardPlayed
emit EnergySpent
resolve effects
move card to discard
```

New flow should be:

```txt
validate card
resolve applicable cost modifiers
check energy against modified cost
emit CardPlayed
emit CardCostModified if applicable
emit PetModifierActivated/Consumed if applicable
emit EnergySpent with modified amount
resolve modified effects
move card to discard
```

Exact event order can differ slightly, but it must be deterministic and tested.

Recommended event order for Warm Bond on Fox Bite:

```txt
CardPlayed
PetModifierActivated
CardCostModified
PetModifierConsumed
EnergySpent
PetCommanded
DamageDealt
StatusApplied
CardMoved
```

If a different order is chosen, document it in the completion report and lock it in tests.

## Effect Modifier Requirements

Before resolving a card's effects, apply effect modifiers to a copied effect list.

Requirements:

1. Do not mutate the card definition in the registry.
2. Do not mutate the original effect definitions.
3. Effect modification should be deterministic.
4. Modified effect values should be visible through resulting combat events.
5. The system should support multiple modifiers without depending on card names.

## Trigger Modifier Requirements

After resolving damage/status effects, check whether trigger modifiers should fire.

For Ash Instinct:

- detect `CombatantDefeated` events for enemy combatants
- check the defeated enemy had Burn before or at defeat time
- only trigger during `player_turn`
- only trigger if combat has not ended
- draw 1 card using the existing draw system
- respect once-per-turn usage

Keep this implementation narrow. Do not build a full trigger scripting engine yet.

## Multi-Pet Requirements

Add tests proving the system remains multi-pet ready.

Minimum cases:

1. Leading pet has Burning Fang, second pet does not: modifier applies.
2. Second pet has Burning Fang, leading pet does not: modifier does not apply to a `leading` command.
3. `allActive` pet command can receive modifiers from multiple active pets where appropriate.
4. Warm Bond usage is tracked per pet instance, not globally across all pets.
5. Ash Instinct usage is tracked per pet instance per turn.

If case 3 becomes too large because starter content has no `allActive` command, create a tiny test-only card definition inside the test registry.

## Integration With Rewards

Add an integration test that proves the reward system now connects to combat modifiers:

1. Generate a reward offer containing `Burning Fang` or use a fixture reward offer for it.
2. Claim the pet upgrade.
3. Start a new combat using the updated `petInstances` returned by `claimReward`.
4. Play `Fox Bite`.
5. Confirm the modified damage/Burn behavior occurs.

This verifies that reward claiming does not merely update data; the next combat actually uses the unlocked upgrade.

## Tests Required

Use Vitest.

### `pet-modifier-burning-fang.test.ts`

Test:

1. `Fox Bite` without Burning Fang remains petAttack 5 and Burn 2.
2. `Fox Bite` with Burning Fang becomes petAttack 7 and Burn 3.
3. `Fox Flare` with Burning Fang becomes petAttack 5 and Burn 4.
4. Burning Fang emits `PetModifierActivated`.
5. Burning Fang does not mutate registry card definitions.
6. Burning Fang does not apply from an inactive pet.
7. Burning Fang does not apply from a non-target second pet for `leading` commands.

### `pet-modifier-warm-bond.test.ts`

Test:

1. First eligible Ember Fox command costs 1 less.
2. Cost cannot go below 0.
3. Warm Bond emits `PetModifierActivated`, `CardCostModified`, and `PetModifierConsumed`.
4. Warm Bond is used only once per combat for that pet.
5. Warm Bond usage persists across player turns in the same combat.
6. Warm Bond does not apply from inactive pets.
7. Rejected actions do not consume Warm Bond.
8. If the chosen behavior is to not consume on already-zero-cost cards, test `Fox Fetch` does not consume it.

### `pet-modifier-ash-instinct.test.ts`

Test:

1. A burned non-final enemy defeated during player turn draws 1.
2. A non-burned enemy defeated during player turn does not trigger.
3. Ash Instinct emits `PetModifierActivated` and `PetModifierConsumed`.
4. Ash Instinct triggers at most once per turn.
5. Usage resets on the next player turn.
6. Ash Instinct does not trigger during enemy turn.
7. Ash Instinct does not draw after final enemy death if combat is already `won`.
8. Rejected actions do not consume Ash Instinct.

### `pet-modifier-multi-pet.test.ts`

Test:

1. Modifier ownership follows the resolved pet target.
2. Leading pet modifier applies only from the leading pet.
3. Second pet's modifier does not affect a leading command unless the second pet is the leading pet.
4. All-active test-only command can resolve modifiers for multiple pets.
5. Warm Bond and Ash Instinct usage are tracked per pet instance.

### `pet-modifier-integration.test.ts`

Test:

1. Claiming Burning Fang through `claimReward` updates the pet instance.
2. A new combat created with the updated pet instance uses Burning Fang.
3. Existing reward tests still pass.
4. Existing combat tests still pass.

## Existing Test Expectations

All existing tests must keep passing:

```txt
registry
rng
model-shape
combat-create
combat-draw
combat-play-card
combat-pet-command
combat-turn
combat-intents
combat-enemy-turn
combat-status
combat-outcome
reward-generate
reward-claim
reward-integration
localhost-smoke
```

If event orders change because modifier events are added, update only the tests that use modified-pet fixtures. Existing no-upgrade combat fixtures should not gain extra modifier events.

## Mutation Safety

Rejected normal gameplay actions must return:

```ts
ok: false
state: originalState
events: [{ type: "ActionRejected", ... }]
errors: [...]
```

Valid actions should return a new state.

Do not mutate:

- registry card definitions
- registry upgrade definitions
- input combat state
- input run state
- input pet instances

No Immer or other dependency.

## Error Handling

Do not throw for normal gameplay errors.

Return `ok: false` for:

- missing unlocked upgrade definition during modifier resolution
- unlocked upgrade definition with mismatched pet definition
- missing modifier definition data required by an active upgrade
- invalid modifier rule data
- invalid phase where modifier trigger resolution is requested directly

If a modifier is malformed in registry data, prefer early validation in `createCombat` or modifier helper rather than silently ignoring it.

## Registry Validation

Extend `validateRegistry` if useful.

Recommended checks:

1. Pet upgrade modifiers have unique modifier IDs.
2. Pet upgrade modifier rule types are known.
3. Modifier card selectors are structurally valid.
4. Modifier effect type references are known.
5. Modifier status references such as Burn use known status IDs if status definitions are available.

Do not overbuild validation, but add enough coverage to catch obvious data mistakes.

## Documentation

Create:

```txt
docs/contracts/5-pet-upgrade-modifier-resolution.md
docs/plans/YYYY-MM-DD-006-pet-upgrade-modifier-resolution-plan.md
```

Copy this contract into `docs/contracts/5-pet-upgrade-modifier-resolution.md`.

The plan should briefly include:

- files to add/update
- test plan
- non-goals
- architecture risks
- event-order risks
- multi-pet risks

## Commands to Run

Run:

```bash
npm run typecheck
npm test
npm run smoke:localhost
npm audit --audit-level=moderate
npm run zip:review
```

If `zip:review` is unavailable for any reason, report why, but do not treat that as a blocker unless the script itself is broken.

Do not add production dependencies.

## Validation Output Required

When complete, report:

1. Changed file tree.
2. Commands run and results.
3. Confirmation that no Phaser dependency was added.
4. Confirmation that `src/game-core` contains no Phaser imports.
5. Confirmation that unlocked pet upgrades produce active modifiers in combat.
6. Confirmation that Burning Fang modifies eligible Ember Fox pet-command effects.
7. Confirmation that Warm Bond modifies first eligible pet-command cost once per combat.
8. Confirmation that Ash Instinct triggers on burned enemy defeat, once per turn, only while combat continues.
9. Confirmation that modifier ownership follows resolved pet targets and remains multi-pet ready.
10. Confirmation that reward-claimed upgrades affect future combats.
11. Confirmation that registry/card definitions are not mutated by modifiers.
12. Confirmation that no reward UI, Phaser UI, map generation, save/load, story progression, or boss logic was implemented.
13. Confirmation that all tests pass.
14. Final pushed commit SHA.
15. Review zip path if generated.

## Final Reminder

Do not turn this into a generic scripting engine.

Implement the smallest robust modifier architecture that supports:

- Burning Fang effect amount modification
- Warm Bond cost discount with once-per-combat usage
- Ash Instinct burned-enemy defeat trigger with once-per-turn usage
- future multi-pet ownership
- deterministic event playback
