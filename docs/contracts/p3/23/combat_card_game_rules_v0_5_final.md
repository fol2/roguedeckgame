# Combat Card Game Rules v0.5 — Shared Actor Card Game

Status: final PoC implementation contract / design rulebook
Language: Cantonese with English technical terms
Scope: shared combat card rules for player, enemy, future clone/PvP actors, retain-hand flow, deterministic smart planning, team/leader planning, Intent timing, visibility, and first-playable acceptance criteria.

Related documents:

- `architecture.md` — deterministic game-core, Phaser boundary, data-driven content, persistent multi-pet-ready model.
- `ui_ux_interaction.md` — combat presentation, pet-command orange line, enemy sprite/intents, Phase 1 UI caps.
- `design.md` — Ember Journal / Ashbound Companions visual and emotional direction.
- `combat_content_foundation.md` — first playable content that obeys this rules contract.

Replacement note:

```txt
This v0.5 document replaces the old v0.4 combat_card_game_rules.md.
It also absorbs the rule-level parts of combat_poc_v0_5_book.md.
combat_content_foundation.md remains, but only as the first-content contract.
```

From v0.5 onward, the core law is:

```txt
Every combat participant that plays cards is a Card Actor.
Player and enemy use the same card-game runtime.
The difference is controller, content source, visibility, and capability — not core rules.
```

v0.5 is the final mechanical foundation for the first playable proof of concept. After v0.5, future work should be content expansion, UI presentation, art, balance, and polish — not another reinvention of the combat rules.

---

## 1. Why v0.5 Exists

v0.4 proved these ideas:

```txt
Combat is a two-sided card game.
Enemies have card holdings.
Intent visibility is not universal free information.
Reveal / Scope / Obscure can exist as gameplay effects.
Ashwood Trail content can be authored around enemy decks.
```

But v0.4 still treated enemy card play as a specialized enemy system. v0.5 corrects that.

The target is now:

```txt
A shared actor card game where:
  the player plays cards through human input,
  enemies play cards through deterministic smart AI,
  every actor uses hand / draw / discard / exhaust / energy,
  all unplayed cards are retained by default,
  enemies plan their action before player input,
  Intent is a visibility-limited readout of that current plan,
  elite and boss leaders can plan team turns,
  and the first playable content runs fully on this model.
```

---

## 2. Non-Negotiable Laws

These are the rules future development must obey unless this document is explicitly updated.

```txt
1. Player and enemy use the same actor card runtime.
2. Unplayed cards are retained by default for all actors.
3. Draw per turn is lower than old draw/discard deckbuilders because hands persist.
4. Played cards go to discard unless the card says exhaust/remove/other.
5. Every Card Actor has energy, hand, draw pile, discard pile, exhaust pile, and hand cap.
6. Enemy strength comes from deck, hand size, draw, energy, passives, and team authority — not artificial AI stupidity.
7. AI should play as well as practical under known information and bounded deterministic compute.
8. AI cannot access opponent-private information.
9. Actors do not know their own draw pile order.
10. Enemy planning happens after enemy draw/refill and before player input unlocks.
11. Intent is a visibility-limited readout of the current enemy/team plan.
12. Intent may update during player turn if the battlefield changes and the enemy/team replans.
13. Enemy action window executes the latest legal committed plan and does not perform a normal draw before execution.
14. Elite/boss leaders may plan the whole enemy team.
15. No leader means each enemy plans independently with shared public/team context.
16. Phaser renders view-models and events; game-core owns all gameplay rules.
17. Pet-command visual grammar remains strict: orange line means card -> pet command.
18. First playable content must use this model by default, not legacy intent-only fallback.
```

---

## 3. Card Actor Model

A Card Actor is any combat participant that uses cards.

Examples:

```txt
Human player
AI-controlled enemy
Boss leader
Future clone of the player
Future PvP opponent
Future enemy companion or summoned card actor
```

A Card Actor has:

```txt
actorId
actorKind: player | enemy | petActor | clone | future
controllerKind: human | heuristicAi | leaderHeuristic | remoteHumanFuture
side: playerSide | enemySide
teamId
card zones
energy
hand cap
draw rules
status state
passives / modifiers
visibility rules
```

The engine must not hardcode:

```txt
if player then real card game, else monster intent script
```

The correct model is:

```txt
human controller chooses player card actions;
AI controller chooses enemy card actions;
both submit legal card plays into the same card-play runtime.
```

---

## 4. Universal Card Zones

Every Card Actor uses the same combat zones:

```txt
Combat Deck Source
Draw Pile
Hand
Planned
Play Area
Discard Pile
Exhaust Pile
Removed / Trash
Temporary Created Cards
```

Definitions:

```txt
Combat Deck Source
= the actor's starting card list for this combat. For the player, this comes from the run deck. For enemies, this comes from enemy definition / encounter data.

Draw Pile
= shuffled combat pile. Uses card instance IDs, not card definition IDs.

Hand
= cards currently available to the actor or controller.

Planned
= cards chosen as part of the actor's current plan but not yet executed.

Play Area
= transient zone during resolution / event playback.

Discard Pile
= played cards usually go here and can reshuffle into draw pile.

Exhaust Pile
= removed for this combat.

Removed / Trash
= permanent run-level removal. Mostly player-side and not a normal enemy combat operation.

Temporary Created Cards
= cards created during combat. Usually disappear after combat unless explicitly kept.
```

Enemy cards are real runtime cards, but enemy hands are not rendered as battlefield cards. Enemy card information appears through Intent, Reveal, Scope, debug overlays, and view-model readouts.

---

## 5. Retain-By-Default Rule

v0.5 changes the core hand rule.

```txt
All actors retain unplayed cards by default.
End turn does not discard unplayed hand cards.
Only played cards move to discard/exhaust/other destination.
```

This applies to player and enemies.

Consequences:

```txt
The old Retain keyword no longer means “keep this card at end turn” by default.
Draw per turn must be lower than old draw/discard deckbuilders.
Hand cap becomes an important balancing pressure.
Cards can clog hand if they are not played.
Discard/cycle effects become valuable future design space.
```

Future keywords that may replace old retain behavior:

```txt
Fleeting
= if unplayed at end of turn, discard or exhaust.

Prepared
= gains value if held across turns.

Heavy
= costly to hold, or counts double against hand cap.

Stale
= loses value if held too long.
```

---

## 6. Baseline Actor Resource Profiles

These are first PoC baselines, not eternal balance laws.

Player baseline:

```txt
opening hand: 5
draw per turn: 3
max energy: 3
energy refill: 3
max hand: 10
max card plays: limited by energy/cards, no separate cap by default
unplayed hand policy: retain
```

Normal enemy baseline:

```txt
opening hand: 2
draw per turn: 1
max energy: 1
energy refill: 1
max hand: 3
max card plays per action window: 1 by energy/cost
unplayed hand policy: retain
```

Elite baseline:

```txt
opening hand: 4
draw per turn: 2
max energy: 2
energy refill: 2
max hand: 5
max card plays per action window: usually 2
unplayed hand policy: retain
can be leader: yes, when encounter data says so
```

Boss baseline:

```txt
opening hand: 5
draw per turn: 3
max energy: 3
energy refill: 3
max hand: 7
max card plays per action window: usually 3
unplayed hand policy: retain
can be leader: usually yes
```

Design meaning:

```txt
Player spends around 3, draws 3.
Normal spends around 1, draws 1.
Elite spends around 2, draws 2.
Boss spends around 3, draws 3.
```

Enemy strength comes from these capabilities plus deck quality, passives, team authority, and card synergies. Do not weaken normal enemies by making their AI stupid.

---

## 7. Difficulty and Intelligence

Difficulty is out of scope for the PoC.

The AI should be as smart as practical under:

```txt
known information
legal card rules
actor capability
team/leader authority
bounded deterministic compute
```

Weak enemies are weak because they have weaker resources and cards:

```txt
low energy
small hand
low draw
weak deck
few/no passives
limited team authority
```

Strong enemies are strong because they have stronger resources and cards:

```txt
more energy
larger hand
higher draw
stronger deck
passives
team/leader planning
special card-game modifiers
```

Do not create “easy AI” by making enemies ignore good plays. Later difficulty settings may modify actor capabilities, content tables, reward generosity, or optional AI compute limits, but v0.5 does not define difficulty modes.

---

## 8. Actor Knowledge Rules

Actors do not know their own draw pile order.

An AI planner may use:

```txt
own hand
own discard
own exhaust
known deck composition if exposed by content/actor memory
own energy
own statuses / passives / modifiers
ally hands/resources if team/leader rules allow
player public HP/block/statuses
public combat history
visible battlefield state
current Intent visibility state, where relevant
```

An AI planner may not use:

```txt
opponent hidden hand
opponent hidden draw order
opponent private future choices
own hidden draw pile order
future RNG results
any data the actor/team should not know
```

The engine stores draw pile arrays for deterministic simulation, but AI planner knowledge snapshots must not expose unknown draw order.

Current-turn planning does not require future draw knowledge because enemy draw/refill happens before planning and before player input.

---

## 9. Core Timing Model

The key v0.5 timing rule:

```txt
Enemy draws/refills for its next action before player input unlocks.
Enemy plans after that draw/refill.
Player sees Intent during player turn.
Player actions may cause enemy/team replan.
Enemy action window executes the latest legal plan.
Enemy action window does not normal-draw before execution.
```

This fixes the problem where Intent would otherwise be based on cards the enemy has not drawn yet.

---

## 10. Combat Setup Flow

Combat setup:

```txt
1. Build all actor combat card instances.
2. Shuffle all actor draw piles with seeded RNG.
3. Player draws opening hand.
4. Enemies draw opening hands.
5. Enemy/team planner creates the first plan from already-held enemy cards.
6. Intent readout is generated from that plan according to visibility.
7. Player Turn 1 starts.
```

No actor knows hidden draw pile order after shuffle. The draw itself is deterministic, but hidden order is not planner knowledge.

---

## 11. Player Turn Flow

Player turn:

```txt
1. Player sees current Intent readout.
2. Player receives input.
3. Player plays cards through human controller.
4. After each resolved player action, enemy/team planner may recompute at safe checkpoints.
5. If plan changes, Intent readout updates according to current visibility.
6. Player ends turn.
```

Player cards use the same card-play runtime as enemy cards.

Player action may change enemy plans by changing battlefield state:

```txt
dealing damage
killing an enemy
adding/removing status
adding block
revealing/scoping/obscuring intent
moving enemy cards through future control effects
locking a plan through future control cards
```

---

## 12. Enemy Action Window

Enemy action window:

```txt
1. Enemy/team commits latest legal plan.
2. Planned cards move through play/resolution in sequence.
3. Card effects resolve using shared card-play/effect runtime.
4. Played cards move to discard/exhaust/other destination.
5. Combat outcome is checked after each meaningful event.
6. Enemy action window ends.
```

Important:

```txt
No normal enemy draw/refill happens before execution.
Draw/refill for the next plan happens before the next player input window.
```

If an enemy card explicitly draws a card, that is a card effect, not turn-rule draw.

---

## 13. Pre-Player-Input Refill and Planning

Before each player input window:

```txt
1. Start-of-turn effects resolve according to timing rules.
2. Player energy refills.
3. Player draws per turn up to hand cap.
4. Enemy energy refills.
5. Enemies draw/refill for their next action up to hand cap.
6. Enemy/team planner creates the next plan from currently held cards.
7. Intent readout is generated.
8. Player input unlocks.
```

This means player sees an Intent that is based on cards already in enemy hands.

---

## 14. Plan, Intent, and Commitment

Three terms must stay separate:

```txt
Plan
= internal selected card sequence for an actor or team.

Intent
= player-facing readout of that plan, limited by visibility.

Commitment
= whether the plan is locked or can still change before execution.
```

Default rule:

```txt
Intent is a live readout of the current best plan.
Intent is not always a promise unless the plan is explicitly Locked.
```

Plan commitment states:

```txt
live
= may recompute at safe checkpoints during player turn.

adaptive
= may change within legal hand/energy/team constraints; UI must communicate instability if visible.

locked
= may not change unless invalidated or changed by explicit card/effect.

committed
= final plan being executed now.
```

Future control effect:

```txt
Lock Intent
= forces target enemy/team to keep its current legal plan for this action window unless invalidated.
```

---

## 15. Turn-Level Planning, Not Per-Card Thinking

Enemy AI thinks per action window / turn plan, not one card at a time.

Wrong:

```txt
play one card
re-evaluate from scratch
play another card
re-evaluate again
```

Correct:

```txt
1. Build knowledge snapshot.
2. Enumerate legal card sequences.
3. Simulate candidate sequences.
4. Score resulting states.
5. Pick best sequence.
6. Store as plan.
7. Generate Intent summary.
8. Execute latest legal plan during enemy action window.
```

Normal enemies usually plan one card because they have 1 energy.
Elites and bosses can plan multi-card sequences.

Mid-turn draw exception:

```txt
If an AI-controlled actor draws during its own action sequence, drawn cards enter hand.
They are not playable in the same action sequence unless a card/effect grants an explicit replan checkpoint.
```

This preserves turn-level planning while leaving future design space for special draw/replan cards.

---

## 16. Smart Deterministic Planner

AI planning should use deterministic plan enumeration and evaluation.

Recommended pipeline:

```txt
1. Build knowledge snapshot.
2. Generate legal card plays and legal target choices.
3. Generate legal sequences under energy, hand, and play constraints.
4. Simulate each candidate sequence on cloned state using the same effect resolver.
5. Score final state.
6. Use stable deterministic tie-breaker or seeded tie-breaker.
7. Store chosen plan and reason tags.
```

The planner is not an LLM.
It is a deterministic game AI.

---

## 17. Planner Scoring Goals

Default enemy goal priority:

```txt
1. Kill the player.
2. Keep self / leader alive.
3. Keep useful allies alive.
4. Improve future turns through setup, status, protection, or card advantage.
5. Avoid wasting resources.
```

Scoring should reward:

```txt
lethal damage
player HP reduction
status pressure
leader survival
self survival
ally survival
useful block
protecting valuable allies
setup if safe
obscure/reveal denial if valuable
future card advantage
```

Scoring should penalize:

```txt
wasted block
meaningless obscure
overkill beyond useful amount
duplicate low-value statuses
setup while lethal is available
protecting irrelevant ally over killing player
illegal or invalid target dependencies
```

AI profiles are valuation personalities, not intelligence levels.

Examples:

```txt
aggressive_simple
= high damage weight, lower survival weight.

defensive_guardian
= high survival/protect weight, medium damage weight.

information_disruptor
= high obscure/debuff value, medium damage.

boss_leader
= lethal highest, leader survival very high, ally utility medium, setup high when safe.
```

---

## 18. Bounded Planning Without Artificial Stupidity

Smart planning must be performance-safe.

Use bounded exhaustive planning, pruning, and beam search, not intentional bad play.

Recommended PoC limits:

```txt
Normal enemies:
  enumerate all legal sequences; usually tiny.

Elites:
  keep top candidate sequences, e.g. K = 6.

Bosses:
  keep top candidate sequences, e.g. K = 8.

Leader/team planner:
  use beam width, e.g. 12.

Max simulated team plans:
  bounded, e.g. 200-500 depending performance.
```

These are engineering compute budgets, not gameplay difficulty modes.

---

## 19. Individual Planning

When no team leader controls an enemy, the enemy plans independently.

Independent planner may still use shared public/team context:

```txt
ally HP/statuses if visible to team
whether allies are alive
player public state
known team directives from statuses/passives
```

Independent planner may not command allies or reorder the whole team unless a card/passive grants it.

No leader execution order:

```txt
enemies execute left-to-right by battlefield slot
```

---

## 20. Team and Leader Planning

Elite/boss leaders may plan the whole enemy team.

Leader planner may know:

```txt
all allied hands/resources, if team knowledge allows
allied HP/statuses
allied energy
allied discard/exhaust if team knowledge allows
player public state
leader passives/directives
battlefield formation
```

Leader planner may choose:

```txt
which ally acts first
which ally attacks
which ally guards
which ally applies debuff first
which ally protects leader
which ally sacrifices tempo
which card sequence each ally should execute
```

Leader planner must still obey:

```txt
each actor's hand
each actor's energy
each actor's card costs
each actor's target rules
statuses/passives
no opponent-private information
no creating cards from nowhere
```

Leader objective priority:

```txt
1. Kill the player.
2. Keep the leader alive.
3. Keep useful allies alive.
4. Preserve or improve future team turns.
5. Use synergy efficiently.
```

Leader death rule:

```txt
If the leader dies before enemy action, team planning degrades.
Remaining enemies either keep still-legal independent parts of the plan or replan independently once.
```

---

## 21. Plan Recompute During Player Turn

After each resolved player action, enemy/team plans may recompute at safe checkpoints.

Safe checkpoints:

```txt
after player card fully resolves
after status application / damage / defeat events settle
after reveal/scope/obscure effects settle
after a card/effect explicitly requests replan
before player input unlocks again
```

If the plan changes and the player has enough visibility, the UI must update Intent readout.

If player sees exact/scoped plan and it changes, emit a plan-change event/readout so it does not feel like hidden cheating.

---

## 22. Plan Commitment and Locking

Default plans are live/adaptive until committed.

A plan becomes committed when:

```txt
enemy action window begins, or
an explicit Lock effect forces commitment earlier.
```

Committed plans execute unless invalidated.

Invalidation examples:

```txt
planned actor defeated
planned card no longer in hand/planned zone
planned target defeated or illegal
energy changed and plan no longer payable
status prevents play
```

Repair rule:

```txt
If a plan becomes invalid, planner repairs using legal known options.
If repair is impossible, actor skips the invalid card/action.
```

---

## 23. Sequence-Aware Intent

Intent is a visibility-limited readout of a plan sequence, not just a single enemy card.

Intent visibility levels:

```txt
none
unknown
category
rough
exact
scoped
```

Meaning:

```txt
none
= UI shows no useful intent.

unknown
= UI shows ?.

category
= broad plan categories: Attack, Guard, Debuff, Attack + Debuff.

rough
= category plus rough strength: Heavy Attack, Light Attack + Burn, Guard + Setup.

exact
= chosen sequence names and known amount/effect lines where allowed.

scoped
= candidate sequences, reason tags, or team plan details depending Scope depth.
```

Examples:

```txt
unknown:
  ?

category:
  Attack
  Attack + Debuff
  Guard + Special

rough:
  Heavy Attack
  Light Attack + Burn
  Guard + Setup

exact:
  Cinder Dust -> Ash Bite
  Antler Strike -> Ember Hooves

scoped:
  Candidate Plan A: Antler Strike -> Ember Hooves
  Candidate Plan B: Guarded Snort -> Paw the Ash
  Reason: lethal pressure / protect leader / setup if safe
```

`?` is valid designed information, not missing data.

---

## 24. Reveal, Scope, Obscure

Reveal, Scope, and Obscure remain core information mechanics.

```txt
Reveal
= improve visibility of current plan readout.

Scope
= expose deeper information such as candidate sequences, team plan, or reason tags.

Obscure
= reduce or cap visibility of plan readout.

Lock
= future control effect that freezes current legal plan.
```

Reveal does not necessarily persist.

```txt
A one-shot reveal may only affect current plan.
A class passive may reveal normal enemy categories every planning window.
A pet upgrade may improve visibility after pet-command cards.
```

Scope is especially valuable against elites and bosses because they may have multi-card or team plans.

---

## 25. Actor-Relative Target Language

Shared actor runtime needs actor-relative targeting.

Avoid long-term player-centric selectors:

```txt
targetEnemy
targetPlayer
```

Prefer actor-relative selectors:

```txt
self
targetOpponent
allOpponents
randomOpponent
lowestHpOpponent
targetAlly
allAllies
leaderAlly
alliedMinion
activePet
leadingPet
allActivePets
```

This supports:

```txt
player vs enemy
enemy vs player
future clone fight
future PvP
future enemy companion/minion actors
future multi-pet systems
```

Phase 1 compatibility adapters may exist, but new effect definitions should move toward actor-relative language.

---

## 26. Player Cards and Enemy Cards

Player cards and enemy cards should keep different content wrappers but share runtime systems.

Keep separate:

```txt
PlayerCardDefinition
EnemyCardDefinition
```

Share:

```txt
CardRuntime
CardInstance
CardZoneMovement
CardCostValidation
EffectResolver
TargetResolver
StatusResolver
PlanSimulator
```

Reason:

```txt
Player cards have rarity, reward pools, duplicate policy, class/pet source, and deckbuilding rules.
Enemy cards have enemy tier, AI hints, encounter tuning, and intent metadata.
```

Correct doctrine:

```txt
Different content wrappers.
Same card-play engine.
```

---

## 27. AI Hints

Enemy cards may include AI hints, but hints must not replace real effects.

AI hints are for scoring and pruning only.

Example:

```json
{
  "id": "cinder_dust",
  "cost": 1,
  "family": "debuff",
  "effects": [
    { "type": "applyStatus", "target": "targetOpponent", "status": "burn", "amount": 1 }
  ],
  "aiHints": {
    "tags": ["debuff", "burn"],
    "pressure": 3,
    "setup": 2
  },
  "intent": {
    "kind": "debuff"
  }
}
```

If the real effect does not apply Burn, the AI hint must not pretend it does.

---

## 28. JSON / Workbench-Friendly Data Shape

Enemy/actor data should be editable through JSON/workbench style tools.

Recommended enemy shape:

```json
{
  "id": "ash_slime",
  "tier": "normal",
  "hp": 20,
  "cardActor": {
    "deck": [
      { "cardId": "slime_tackle", "copies": 3 },
      { "cardId": "jelly_guard", "copies": 1 }
    ],
    "openingHandSize": 2,
    "drawPerTurn": 1,
    "maxHandSize": 3,
    "maxEnergy": 1,
    "energyPerTurn": 1,
    "unplayedHandPolicy": "retain"
  },
  "ai": {
    "controller": "heuristic",
    "profile": "aggressive_simple",
    "teamRole": "independent",
    "weights": {
      "lethal": 10000,
      "damage": 1.2,
      "selfSurvival": 0.6,
      "allySupport": 0.0,
      "setup": 0.2,
      "obscure": 0.1
    }
  }
}
```

Recommended boss/leader shape:

```json
{
  "id": "emberroot_warden",
  "tier": "boss",
  "cardActor": {
    "openingHandSize": 5,
    "drawPerTurn": 3,
    "maxHandSize": 7,
    "maxEnergy": 3,
    "energyPerTurn": 3,
    "unplayedHandPolicy": "retain"
  },
  "ai": {
    "controller": "leaderHeuristic",
    "profile": "boss_leader_burn_guard",
    "teamRole": "leader",
    "planning": {
      "canChooseTeamOrder": true,
      "canPlanAllies": true,
      "candidateBeamWidth": 8
    }
  }
}
```

Workbench authoring should tune cards/resources/profile weights first, not write special code paths.

---

## 29. Pet and Multi-Pet Compatibility

Phase 1 uses one active pet: Ember Fox.

Engine model must remain multi-pet ready:

```txt
activePetInstanceIds: PetInstanceId[]
maxActivePets: class data
petSlots: data-driven future extension
pet targets: leading / specific / allActive / randomActive / withTag
```

Do not hardcode one permanent pet into effect resolver, UI data, or combat state.

Pet-command visual grammar remains:

```txt
orange line = card -> pet command relationship
```

Enemy target rings show actual effect targets.

---

## 30. Shared Effects and Statuses

Shared effect resolver should support both player and enemy cards.

Core effect families:

```txt
damage
block
draw
discard
exhaust
applyStatus
removeStatus
createTemporaryCard
gainEnergy
revealIntent
scopeIntent
obscureIntent
petAttack
petBlock
petReact
```

Status rules must remain deterministic and event-driven.

Burn remains the first major status:

```txt
start-of-turn or timing-defined tick
block-ignoring damage
stack decay
can defeat combatants
emits events
```

---

## 31. Reward and Rare Holder Compatibility

Reward rules remain content-facing but must obey shared actor runtime.

Rare card holder principle:

```txt
A rare holder is an encounter whose combat actor/deck represents a held reward identity.
Winning may offer the held reward.
```

Cinder Scribe remains the first rare-card bearer content hook.

Reward generation must not add enemy-only cards to player reward pools unless a player-card version exists.

---

## 32. View-Model Requirements

Combat view-models must expose plan-sequence readouts without making Phaser calculate rules.

Enemy intent view-model should support:

```txt
visibilityLevel
summaryLabel
categoryKinds
roughStrengthLabel
exactSequenceLabels
scopedCandidatePlans
reasonTags
isUnknown
isScoped
isAdaptive
isLocked
hasChangedThisWindow
actorPlanCount
teamPlanOrder if visible/scoped
```

Enemy/actor debug readouts may include:

```txt
hand count
draw count
discard count
exhaust count
planned count
energy
max energy
draw per turn
max hand
controller kind
team role
```

Phaser renders these values. Phaser does not calculate them.

---

## 33. Event Requirements

Required event families:

```txt
ActorDeckShuffled
ActorCardDrawn
ActorCardMoved
ActorEnergyRefilled
ActorEnergySpent
ActorPlanCreated
ActorPlanChanged
ActorPlanCommitted
ActorPlanRepaired
ActorCardPlayed
ActorCardResolved
IntentVisibilityChanged
IntentReadoutChanged
TeamPlanCreated
TeamPlanChanged
TeamPlanCommitted
```

Legacy event names may remain as compatibility wrappers during migration, but v0.5 implementation should move toward actor-neutral event names.

Event order matters and should be tested.

---

## 34. Testing Contract

Core tests must cover:

```txt
shared actor card zones
retain-by-default hand behavior
player draw-per-turn under retain-all
enemy draw/refill before player input
enemy does not normal-draw before execution
AI planner cannot see own draw pile order
AI planner cannot see opponent-private information
normal enemy one-card plan
elite multi-card plan
boss/team leader plan
plan recompute after player action
Intent readout changes when plan changes
Reveal/Scope/Obscure on sequence-aware plan
plan invalidation and repair
leader death degradation
actor-relative target resolver
rare holder reward remains compatible
```

Testing should verify event order, not only final HP.

---

## 35. Simulation Acceptance Criteria

First playable simulation should prove:

```txt
no crashes
no infinite loops
no illegal card plays
no hidden draw-order leakage to AI
no enemy action drawing before execution unless card effect says draw
no unsupported hand cap overflow beyond UI limits
all Ashwood Trail enemies use actor card runtime
wins/losses both possible
reward can be offered and claimed/skipped after victory
```

Balance target for PoC can remain broad:

```txt
200-500 seeded runs
completion rate roughly 40%-70% until manual playtesting exists
no deterministic seed class that always softlocks
```

Do not overfit simulation before the UI is playable.

---

## 36. Implementation Patch Scope for Final PoC

The final PoC patch should implement:

```txt
shared actor card runtime or migration layer strong enough for player/enemy parity
retain-by-default for player and enemies
reduced player draw-per-turn
actor energy for enemies
enemy draw/refill before player input
enemy action window without normal draw
smart deterministic individual planner
leader/team planner
sequence-aware Intent readout
Reveal/Scope/Obscure on plan sequences
actor-relative target compatibility
first content using actor runtime by default
tests and simulations for the above
```

The final PoC patch should not implement:

```txt
final art
polished animation
pet HP / pet injury / pet death
full PvP networking
full clone encounter
huge reward pool
mobile UI
full pile inspection
permanent meta progression
full difficulty modes
```

---

## 37. Fairness Rules

AI can be smart, but must stay fair.

```txt
AI may play optimally from known information.
AI may not use opponent-private information.
AI may not know own draw order.
AI may not create cards or effects outside legal content.
AI may not secretly bypass energy/cost/target rules.
AI plan changes must be visible when player has enough Intent visibility.
Obscure and unknown Intent must be designed states, not missing data.
```

---

## 38. UI Contract Notes

UI must preserve these visual rules:

```txt
Enemies are sprites/silhouettes, not visible battlefield cards.
Enemy hands are not shown by default.
Intent is shown above/near enemies.
Plan sequence detail belongs in tooltip/detail/debug readout.
Orange command line means card -> pet command only.
Enemy target rings show actual effect target.
Phaser renders view-models and events; it does not calculate card legality, AI plans, or damage.
```

Phase 1 UI caps still apply unless `ui_ux_interaction.md` changes:

```txt
Hand cards: 0-10
Enemies: 1-3
Active pet visual slots: up to 3
```

---

## 39. Open Questions Deferred After PoC

These are explicitly not blockers for v0.5:

```txt
final difficulty modes
full PvP networking
clone fight content
advanced draw-order inspection mechanics
full discard/cycle archetype
pet HP / injury / death
multi-pet playable class
large boss spectacle
final UI polish
final balance
```

---

## 40. Final PoC Definition of Done

The v0.5 PoC is done when:

```txt
1. Player and enemies both use shared actor card runtime.
2. Player and enemies both retain unplayed hand by default.
3. Enemies have energy, hand, draw, discard, exhaust, and hand cap.
4. Enemy draw/refill happens before player input and planning.
5. Enemy action window executes latest legal plan without normal draw.
6. AI planner uses only legal known information.
7. Normal enemies plan from their hand/resources.
8. Elite/boss leaders can plan team turns.
9. Intent is sequence-aware and visibility-limited.
10. Reveal/Scope/Obscure work on current plan readout.
11. First playable content uses this model by default.
12. Tests and simulations prove the model does not softlock or cheat.
```

---

## 41. One-Sentence Doctrine

```txt
Combat is a shared actor card game: every participant plays from retained hands, bounded energy, and real decks; enemies are smart deterministic planners, Intent is a readable slice of their current plan, and first playable content must prove this system rather than bypass it.
```
