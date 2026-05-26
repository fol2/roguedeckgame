# Engineering Contract v0.5 — Reward Core and Pet Upgrade Selection

## Objective

Implement the first deterministic game-core reward slice for the pet-centered roguelite deckbuilder.

This ticket should add core-only reward models, deterministic post-combat reward generation, card reward claiming, pet upgrade reward claiming, reward skipping, starter reward content, and tests.

This task must stay entirely inside `src/game-core`, tests, and docs.

Do **not** implement Phaser.
Do **not** implement Vite UI.
Do **not** implement React.
Do **not** create art assets.
Do **not** implement map generation.
Do **not** implement save/load.
Do **not** implement story progression.
Do **not** implement pet upgrade modifier resolution yet.
Do **not** implement card upgrade resolution yet.
Do **not** add production dependencies.

Use these skills:

- `$game-architecture-guard`
- `$combat-engine-test-writer`
- `$content-author`
- `$pet-system-designer`
- `$story-event-author` only if touching story-adjacent reward hooks

## Current Baseline

Latest pushed HEAD before this ticket:

```txt
dcc33f7eb1b13a5be866e6b0aed8a8b80c31616a
```

The current game-core already includes:

- `CardInstanceId`
- deterministic combat creation
- draw / hand / discard / exhaust piles
- `playCard`
- `endPlayerTurn`
- `resolveEnemyTurn`
- monster intents
- Burn start-of-turn ticking
- win/loss combat outcome
- `CombatEnded` events
- Ember Fox command cards
- three Ember Fox pet upgrade definitions as data
- Training Slime and Ash Mite
- 89 passing tests

## Design Goal

After this ticket, core-only gameplay should be able to:

1. Finish a combat with phase `"won"`.
2. Generate deterministic post-combat reward options.
3. Offer card rewards and pet upgrade rewards.
4. Claim one reward.
5. Add a selected card reward to the run deck.
6. Add a selected pet upgrade to a specific persistent `PetInstance`.
7. Skip a reward.
8. Reject reward generation for lost or unfinished combats.
9. Reject invalid or duplicate reward claims without mutating input state.

No UI is needed. Reward state and reward events are the interface for later Phaser playback.

## Required File Changes

Create or update:

```txt
src/game-core/ids.ts
src/game-core/model/reward.ts
src/game-core/model/event.ts
src/game-core/model/run.ts
src/game-core/model/pet.ts
src/game-core/data/cards/reward-cards.ts
src/game-core/data/registry.ts
src/game-core/systems/rewards.ts
src/game-core/testing/reward-fixtures.ts
src/game-core/testing/combat-fixtures.ts
src/game-core/index.ts

tests/game-core/reward-generate.test.ts
tests/game-core/reward-claim.test.ts
tests/game-core/reward-integration.test.ts
tests/game-core/model-shape.test.ts
```

Keep all existing tests passing.

## ID Requirements

Add new branded ID types in `src/game-core/ids.ts`:

```ts
RewardOfferId
RewardOptionId
```

Add helpers:

```ts
rewardOfferId(value: string): RewardOfferId
rewardOptionId(value: string): RewardOptionId
```

Use these IDs in reward model and events.

## Reward Model Requirements

Update `src/game-core/model/reward.ts`.

Create reward option types:

```ts
export type CardRewardOption = {
  readonly id: RewardOptionId;
  readonly type: "card";
  readonly cardId: CardId;
};

export type PetUpgradeRewardOption = {
  readonly id: RewardOptionId;
  readonly type: "petUpgrade";
  readonly petInstanceId: PetInstanceId;
  readonly petDefinitionId: PetDefinitionId;
  readonly upgradeId: UpgradeId;
};

export type RewardOption = CardRewardOption | PetUpgradeRewardOption;
```

Create reward state:

```ts
export type RewardOfferStatus = "open" | "claimed" | "skipped";

export type RewardOfferState = {
  readonly id: RewardOfferId;
  readonly source: "combat";
  readonly combatId: RunId;
  readonly seed: string | number;
  readonly status: RewardOfferStatus;
  readonly options: readonly RewardOption[];
  readonly selectedOptionId?: RewardOptionId;
};
```

Create result state used when claiming or skipping rewards:

```ts
export type RewardClaimState = {
  readonly rewardOffer: RewardOfferState;
  readonly run: RunState;
  readonly petInstances: readonly PetInstance[];
};
```

If Codex chooses slightly different names, the model must still support:

- one reward offer per post-combat reward screen
- multiple option types
- card reward options
- pet upgrade reward options targeted to a specific pet instance
- claimed/skipped status
- immutable update of `RunState` and `PetInstance[]`

## Event Model Requirements

Update `GameEvent` in `src/game-core/model/event.ts`.

Add serializable reward events:

```ts
RewardOffered
RewardSelected
RewardSkipped
CardRewardAdded
PetUpgradeUnlocked
```

Suggested shapes:

```ts
RewardOffered:
  type: "RewardOffered"
  rewardOfferId: RewardOfferId
  options: readonly RewardOption[]

RewardSelected:
  type: "RewardSelected"
  rewardOfferId: RewardOfferId
  rewardOptionId: RewardOptionId
  rewardType: RewardOption["type"]

RewardSkipped:
  type: "RewardSkipped"
  rewardOfferId: RewardOfferId

CardRewardAdded:
  type: "CardRewardAdded"
  cardId: CardId

PetUpgradeUnlocked:
  type: "PetUpgradeUnlocked"
  petInstanceId: PetInstanceId
  upgradeId: UpgradeId
```

If an existing `RewardOffered` event shape conflicts with this, migrate it carefully and update tests. All events must remain plain serializable objects.

## Reward Generation Requirements

Create `src/game-core/systems/rewards.ts`.

Implement:

```ts
export type GenerateCombatRewardInput = {
  readonly combat: CombatState;
  readonly run: RunState;
  readonly registry: GameContentRegistry;
  readonly petInstances: readonly PetInstance[];
  readonly seed: string | number;
  readonly cardOptionCount?: number;
  readonly petUpgradeOptionCount?: number;
};

export const generateCombatRewardOffer = (
  input: GenerateCombatRewardInput
): GameActionResult<RewardOfferState>;
```

Behavior:

1. Only generate rewards if `combat.phase === "won"`.
2. Reject if combat is `"lost"`, `"player_turn"`, `"enemy_turn"`, or `"not_started"`.
3. Use deterministic seeded RNG.
4. Do not mutate `combat`, `run`, `registry`, or `petInstances`.
5. Generate card reward options and pet upgrade reward options.
6. Default card option count: `3`.
7. Default pet upgrade option count: `1`.
8. If fewer eligible options exist, return only what exists.
9. Do not duplicate options within the same offer.
10. Emit one `RewardOffered` event.
11. Return `ok: true` with a `RewardOfferState` whose `status` is `"open"`.

Normal invalid usage should return:

```ts
ok: false
state: a serializable rejected/empty reward offer or original offer state if available
events: [{ type: "ActionRejected", ... }]
errors: [{ code, message, path? }]
```

Prefer returning a meaningful placeholder `RewardOfferState` for generation failure, similar to how `createCombat` returns a `not_started` state.

## Card Reward Eligibility

A card is eligible for card rewards when:

1. The card exists in `registry.cards`.
2. `card.rarity !== "starter"`.
3. `card.rarity !== "special"`, unless Codex documents why special rewards should be included.
4. If `card.requiresPetDefinitionId` exists, at least one active run pet instance has that pet definition.
5. The card is not excluded by future tags such as `"unrewardable"` if Codex adds such a tag.

Do not hardcode card names in reward logic.

Use tags, rarity, and `requiresPetDefinitionId`.

## Pet Upgrade Reward Eligibility

A pet upgrade is eligible when:

1. The upgrade exists in `registry.petUpgrades`.
2. The upgrade's `petDefinitionId` matches an active pet instance's definition.
3. The target pet instance does not already have that `upgradeId` in `unlockedUpgradeIds`.
4. The option targets a specific `petInstanceId`.

Important: if two active pets share the same pet definition, the same upgrade may be offered for either pet as separate options, because each targets a different pet instance.

Do not resolve modifier effects yet. This ticket only unlocks the upgrade ID on the persistent pet instance.

## Reward Claim Requirements

Implement:

```ts
export type ClaimRewardInput = {
  readonly rewardOffer: RewardOfferState;
  readonly selectedOptionId: RewardOptionId;
  readonly run: RunState;
  readonly petInstances: readonly PetInstance[];
  readonly registry: GameContentRegistry;
};

export const claimReward = (
  input: ClaimRewardInput
): GameActionResult<RewardClaimState>;
```

Behavior:

1. Validate the reward offer is `"open"`.
2. Validate the selected option exists in the offer.
3. For card reward:
   - validate the card exists in registry
   - return updated `RunState` with `cardId` appended to `deckCardIds`
   - emit `RewardSelected`
   - emit `CardRewardAdded`
4. For pet upgrade reward:
   - validate target pet instance exists
   - validate upgrade exists
   - validate upgrade is for that pet definition
   - validate the pet does not already have this upgrade
   - return updated `PetInstance[]` with the upgrade ID appended to that pet's `unlockedUpgradeIds`
   - emit `RewardSelected`
   - emit `PetUpgradeUnlocked`
5. Mark reward offer as `"claimed"` and store `selectedOptionId`.
6. Do not mutate the input run, pet instances, or reward offer.
7. On failure, return `ok: false`, `ActionRejected`, useful error, and the original state.

## Reward Skip Requirements

Implement:

```ts
export type SkipRewardInput = {
  readonly rewardOffer: RewardOfferState;
  readonly run: RunState;
  readonly petInstances: readonly PetInstance[];
};

export const skipReward = (
  input: SkipRewardInput
): GameActionResult<RewardClaimState>;
```

Behavior:

1. Validate reward offer is `"open"`.
2. Mark it as `"skipped"`.
3. Do not mutate run or pet instances.
4. Emit `RewardSkipped`.
5. Reject if the offer is already claimed or skipped.

## Starter Reward Content Requirements

Add `src/game-core/data/cards/reward-cards.ts` with a small reward card pool.

Add at least six non-starter cards. Keep them simple and compatible with existing effects.

Suggested cards:

```txt
Ember Spark
Type: attack
Cost: 1
Rarity: common
Tags: attack, burn, fire
Effects:
- damage 4 to target
- applyStatus burn 1 to target

Quick Guard
Type: skill
Cost: 1
Rarity: common
Tags: block, guard
Effects:
- block 6 self

Study Command
Type: skill
Cost: 0
Rarity: common
Tags: draw, command
Effects:
- draw 1

Kindle
Type: skill
Cost: 1
Rarity: uncommon
Tags: burn, fire, setup
Effects:
- applyStatus burn 2 to allEnemies

Coordinated Strike
Type: attack
Cost: 1
Rarity: uncommon
Tags: attack, pet, command, combo
Effects:
- damage 5 target
- petReact leading pet reaction "strike_followup"

Fox Flare
Type: pet-command
Cost: 1
Rarity: uncommon
RequiresPetDefinitionId: ember_fox
Tags: pet, fox, burn, command
Effects:
- petAttack leading pet for 3 to target
- applyStatus burn 3 to target
```

The exact numbers may be adjusted, but keep the pool small and testable.

Update `src/game-core/data/registry.ts` so these reward cards are included in `starterRegistry.cards`.

## Pet Upgrade Content Requirements

The three existing Ember Fox upgrades should remain as data:

```txt
Burning Fang
Warm Bond
Ash Instinct
```

Do not implement their modifier behavior yet. This ticket only makes them selectable/unlockable.

## Tests Required

Use Vitest.

### `reward-generate.test.ts`

Test:

1. Generates a reward offer after won combat.
2. Rejects reward generation when combat is not won.
3. Rejects reward generation after lost combat.
4. Same seed creates the same reward offer.
5. Different seeds can produce different reward offers when enough eligible options exist.
6. Emits `RewardOffered` with serializable options.
7. Card rewards exclude starter cards.
8. Pet-command rewards requiring Ember Fox are eligible when Ember Fox is active.
9. Pet-command rewards requiring Ember Fox are not eligible when Ember Fox is not active.
10. Pet upgrade options target a specific pet instance.
11. Already-unlocked pet upgrades are excluded.
12. Reward generation does not mutate combat, run, registry, or pet instances.

### `reward-claim.test.ts`

Test:

1. Claiming a card reward appends the card to `run.deckCardIds`.
2. Claiming a card reward emits `RewardSelected` and `CardRewardAdded`.
3. Claiming a pet upgrade reward appends the upgrade to the target pet instance's `unlockedUpgradeIds`.
4. Claiming a pet upgrade emits `RewardSelected` and `PetUpgradeUnlocked`.
5. Claiming an invalid option returns `ok: false` and does not mutate inputs.
6. Claiming an already claimed reward rejects.
7. Claiming a skipped reward rejects.
8. Claiming an upgrade already owned by that pet rejects.
9. Claiming an upgrade for the wrong pet definition rejects.
10. Skipping an open reward marks it as skipped and emits `RewardSkipped`.
11. Skipping an already claimed/skipped reward rejects.
12. Claim and skip results are serializable plain objects.

### `reward-integration.test.ts`

Test:

1. Play a lethal card to set combat phase to `"won"`, then generate rewards.
2. Resolve enemy loss is not needed here; use a simple won combat fixture if cleaner.
3. Claiming a card reward after combat win updates the run deck.
4. Claiming a pet upgrade after combat win updates the matching pet instance.
5. Lost combat cannot generate rewards.
6. Multi-pet reward generation can create pet upgrade options for more than one active pet instance.
7. No reward claiming mutates the original `RunState` or original `PetInstance[]`.

### Existing Tests

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
localhost-smoke
```

Update expected event shapes only where reward event model migration legitimately requires it.

## Fixture Requirements

Add focused helpers in `src/game-core/testing/reward-fixtures.ts`:

```ts
createWonCombatFixture
createLostCombatFixture
createOpenRewardOfferFixture
createCardRewardOfferFixture
createPetUpgradeRewardOfferFixture
createRewardRunFixture
createRewardPetInstancesFixture
createMultiPetRewardFixture
```

Fixtures should stay small and readable.

## Mutation Safety

Core functions should avoid mutating input state.

Rejected normal reward actions must return:

```ts
ok: false
state: original or placeholder state
events: [{ type: "ActionRejected", ... }]
errors: [...]
```

Valid reward actions return new state objects.

Do not add Immer or other dependencies.

## Error Handling

Do not throw for normal reward errors.

Return `ok: false` for:

- combat is not won
- reward offer is not open
- selected option does not exist
- reward card is missing from registry
- reward upgrade is missing from registry
- target pet instance is missing
- target pet definition does not match upgrade definition
- pet already has the selected upgrade
- invalid reward option type

## Documentation

Create:

```txt
docs/contracts/4-reward-core-pet-upgrade-selection.md
docs/plans/YYYY-MM-DD-005-reward-core-pet-upgrade-selection-plan.md
```

Copy this contract into `docs/contracts/4-reward-core-pet-upgrade-selection.md`.

The plan should briefly include:

- files to add/update
- test plan
- non-goals
- architecture risks
- reward eligibility risks
- mutation-safety risks

## Commands to Run

Run:

```bash
npm run typecheck
npm test
npm run smoke:localhost
npm audit --audit-level=moderate
```

Do not add production dependencies.

## Validation Output Required

When complete, report:

1. Changed file tree.
2. Commands run and results.
3. Confirmation that no Phaser dependency was added.
4. Confirmation that `src/game-core` contains no Phaser imports.
5. Confirmation that reward generation only works for won combat.
6. Confirmation that card reward options are deterministic and exclude starter cards.
7. Confirmation that pet upgrade options target specific pet instances.
8. Confirmation that claiming card rewards appends to `RunState.deckCardIds`.
9. Confirmation that claiming pet upgrades appends to `PetInstance.unlockedUpgradeIds`.
10. Confirmation that no pet upgrade modifier resolution was implemented.
11. Confirmation that no reward UI was implemented.
12. Confirmation that all tests pass.
13. Implementation commit SHA.
14. Final pushed HEAD SHA.

## Non-Goals

Do not implement Phaser.
Do not implement Vite UI.
Do not implement React.
Do not implement reward screen UI.
Do not implement map generation.
Do not implement save/load.
Do not implement story progression.
Do not implement pet upgrade modifier resolution.
Do not implement card upgrade resolution.
Do not implement boss rewards.
Do not implement relics.
Do not implement weighted rarity tables beyond simple deterministic selection.
Do not create art assets.
Do not add production dependencies.
