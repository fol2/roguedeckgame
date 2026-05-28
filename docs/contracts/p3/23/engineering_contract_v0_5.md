# Engineering Contract v0.5 — First Playable Combat Slice Hard Cut

Status: implementation contract for the v0.5 one-off hard cut
Scope: game-core runtime, enemy AI, combat state, UI/view-model compatibility, tests, simulation, and first playable Ashwood Trail content.

## 1. Objective

This change removes the pre-v0.5 split between a real player card game and a specialized enemy intent resolver.

The first playable combat slice must now run on the shared Card Actor model defined by `combat_card_game_rules.md` v0.5:

```txt
Every card-playing combat participant is a Card Actor.
Player and enemy use the same retained-hand card runtime.
Controllers differ; card rules do not.
```

This is not a compatibility phase. First playable content must not rely on legacy monster intent resolution as an action source.

## 2. Hard-Cut Runtime Laws

```txt
1. `CombatState.cardActors` is the source of truth for card zones, energy, and card plans.
2. Any old-shaped top-level player pile fields are read-only projections derived from `cardActors`; they are not gameplay authority and not a fallback path.
3. Player and enemy unplayed cards are retained by default.
4. End turn does not discard unplayed cards.
5. Draw per turn comes from the actor resource profile.
6. Enemies draw/refill before player input, then plan from already-held cards.
7. Enemy turn executes the latest legal plan and does not perform a normal draw before execution.
8. Enemy AI is deterministic and knowledge-bounded.
9. Normal/elite/boss strength comes from cards, energy, hand size, draw, passives, and team authority.
10. Intent is a visibility-limited readout of the current actor/team plan sequence.
```

## 3. Code Ownership

`src/game-core` owns all gameplay rules:

```txt
card actor creation
actor draw/refill
actor card movement
shared card play resolution
enemy sequence planning
team/leader planning
status/effect resolution
reward generation
simulation
```

`src/game-phaser` remains a presentation layer:

```txt
render projected hand/cards
render enemy sprites and intent readouts
play event animations
lock/unlock input
show debug diagnostics
```

Phaser must not decide card legality, damage, enemy actions, draw order, intent amounts, or AI plans.

## 4. Engineering Deliverables

This implementation must provide:

```txt
- shared Card Actor state in combat model
- player Card Actor creation from run deck
- enemy Card Actor creation from monster cardActor data
- retained-hand draw/refill runtime
- actor-neutral card movement and card draw helpers
- player card play through shared actor card path
- enemy card play through shared actor card path
- deterministic enemy sequence planner
- deterministic leader/team planner
- sequence-aware intent projection
- actor/team events for draw, movement, play, plan, commit, and resolution
- Ashwood Trail monster resource profiles and AI profiles
- v0.5 docs copied into canonical docs
- build/typecheck/smoke validation
```

## 5. Removed First-Playable Responsibilities

These concepts are no longer allowed as first-playable action sources:

```txt
legacy monster intent pool choosing actual actions
scheduled intent scripts as the enemy action source
single-card monster planned ability as the only enemy plan model
end-turn discard-all player hand behavior
Retain as the normal way to keep cards
AI behavior reduced by artificial stupidity
```

Legacy action paths are removed from the first-playable runtime. Any old-shaped fields that remain must be read-only debug/view-model projections derived from `cardActors`; they must not resolve gameplay, migrate rules at runtime, or provide fallback behavior.

## 6. First Playable Content Contract

Ashwood Trail content must use Card Actor resources:

```txt
Player Ashbound Keeper:
  opening hand 5
  draw per turn 3
  max hand 10
  max energy 3
  unplayed hand retain

Normal enemies:
  opening hand 2
  draw per turn 1
  max hand 3
  max energy 1

Elite / rare bearer:
  opening hand 4
  draw per turn 2
  max hand 5
  max energy 2

Boss:
  opening hand 5
  draw per turn 3
  max hand 7
  max energy 3
```

Enemy decks, AI profiles, and card costs are content data and should be workbench-friendly.

## 7. UI/UX Alignment

The UI layout should not be rebuilt for v0.5.

Required semantic changes:

```txt
Enemy Intent displays a plan-sequence summary, not a single scripted monster intent.
Enemy hands remain hidden unless revealed/scoped/debugged.
The debug layer may show Card Actor resources.
End Turn must not animate unplayed cards to discard.
Played cards still animate to discard/exhaust.
```

The side-view layout, Keeper avatar, Ember Fox co-hero, enemy sprites, hand cards, orange pet-command line, and target rings remain valid.

## 8. Acceptance Gate

The patch is acceptable only if:

```txt
npm run typecheck passes
npm run build passes
npm run build:cli passes
npm run sim:smoke -- --max-steps 500 passes
first playable combat uses cardActors by default
createCombat rejects monsters without cardActor data
no first-playable enemy action resolves through legacy intentPool selection
```

Full historical tests may require semantic updates when they encode pre-v0.5 behavior. Updated tests should protect the v0.5 laws instead of preserving old intent-only or discard-all assumptions.
