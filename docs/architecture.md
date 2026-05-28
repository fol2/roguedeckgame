# Game Architecture Bible v0.5 — Shared Actor Card Game Hard Cut

Status: final PoC architecture contract / implementation gate  
Scope: repository architecture, source ownership, hard-cut migration rules, and code audit contract for the v0.5 shared Card Actor combat model.

Related documents:

- `combat_card_game_rules.md` — canonical combat law: shared Card Actors, retain-by-default hands, deterministic planning, sequence-aware Intent, team/leader planning.
- `combat_content_foundation.md` — first playable content: Ashbound Keeper, Ember Fox, Ashwood Trail, first enemies, reward pool.
- `ui_ux_interaction.md` — combat presentation and input contract.
- `design.md` — visual and emotional direction.

Replacement note:

```txt
This v0.5 architecture document replaces older pre-v0.5 architecture assumptions.
The project must no longer maintain both old monster-intent combat and v0.5 Card Actor combat as parallel playable models.
Legacy code may exist only as isolated migration/debug/replay compatibility during the hard cut, not as first-playable runtime behavior.
```

---

## 1. Core Architecture Law

The game is a browser-first TypeScript + Vite + Phaser pet-centered roguelite deckbuilder.

The main rule remains:

```txt
src/game-core must never import Phaser, browser APIs, src/game-phaser, or src/app.
```

Game rules live in `src/game-core`.

Phaser renders, animates, and handles presentation input in `src/game-phaser`.

The browser app shell lives in `src/app`.

Phaser may submit player requests and render returned view-models/events. Phaser must not decide card legality, actor planning, enemy plans, target rules, status timing, reward resolution, pet command resolution, or seeded randomness.

---

## 2. v0.5 Architectural Identity

From v0.5 onward, combat is not “player cards versus monster intents.”

The canonical model is:

```txt
Every combat participant that plays cards is a Card Actor.
Player and enemy use the same card-game runtime.
The difference is controller, content source, visibility, team authority, and resources — not core card rules.
```

This is a hard cut.

Do not continue building first playable combat on top of a legacy monster-intent action system.

The first playable proof of concept must run on:

```txt
Shared Card Actor runtime
Retain-by-default hands
Actor energy / draw / hand cap / discard / exhaust
Deterministic smart AI planner
Sequence-aware Intent readouts
Team/leader planning for elites and bosses
Actor-relative effects and targets
```

---

## 3. Canonical Source Layout

Preferred source ownership:

```txt
src/
  app/
    browser entry and shell only

  game-core/
    data/              content definitions and registries
    model/             serializable game models and ID types
    systems/           deterministic gameplay systems
    testing/           fixtures, simulation helpers, trace helpers
    ids.ts
    index.ts

  game-phaser/
    animation/         event playback animation helpers
    controllers/       presentation controllers that submit requests to core
    debug/             debug overlays and source scanners
    layout/            screen layout constants and helpers
    presenters/        Phaser GameObject presenters
    scenes/            Phaser scenes
    view-models/       view-model builders and presentation readouts

  game-cli/
    simulation and development CLI entrypoints
```

No gameplay rule should be added to `src/game-phaser`, `src/app`, or browser-only code.

---

## 4. Shared Card Actor Runtime

`CombatState` should have one authoritative card-zone model for every card-playing actor.

A Card Actor represents:

```txt
human player
AI enemy
elite leader
boss leader
future player clone
future PvP opponent
future enemy companion / summoned card actor
```

A Card Actor state should own:

```txt
actorId
combatantId or ownerCombatantId
actorKind: player | enemy | petActor | clone | future
side: playerSide | enemySide
teamId
controllerKind: human | heuristicAi | leaderHeuristic | remoteHumanFuture

cardInstances
drawPile
hand
planned
playArea
discardPile
exhaustPile
removedPile

openingHandSize
drawPerTurn
maxHandSize
maxEnergy
energy
energyRefill
unplayedHandPolicy: retain

passives / modifiers / statuses
visibility state
```

First playable runtime must not model the player with top-level `drawPile/hand/discardPile/energy` while enemies use a separate `monsterCardStates` subsystem. View-models may project convenient player/enemy shapes, but the authoritative state should be actor-based.

---

## 5. Retain-By-Default Runtime

v0.5 changes the old hand rule.

```txt
All actors retain unplayed cards by default.
End turn does not discard unplayed hand cards.
Played cards move to discard/exhaust/other destination according to the card.
```

The old “discard all non-retained hand cards at end turn” model must be removed from first-playable runtime.

The old `Retain` keyword is no longer a core keyword meaning “keep this card at end turn.” If a card needs old deckbuilder behavior, it should use a future keyword such as:

```txt
Fleeting
Prepared
Heavy
Stale
```

Player baseline for first playable:

```txt
opening hand: 5
draw per turn: 3
max energy: 3
energy refill: 3
max hand: 10
unplayed hand policy: retain
```

Normal enemy baseline:

```txt
opening hand: 2
draw per turn: 1
max energy: 1
energy refill: 1
max hand: 3
unplayed hand policy: retain
```

Elite baseline:

```txt
opening hand: 4
draw per turn: 2
max energy: 2
energy refill: 2
max hand: 5
unplayed hand policy: retain
```

Boss baseline:

```txt
opening hand: 5
draw per turn: 3
max energy: 3
energy refill: 3
max hand: 7
unplayed hand policy: retain
```

These values are content baselines, not engine hardcaps.

---

## 6. Turn Windows and Planning Timing

The v0.5 timing model is mandatory.

```txt
Enemies draw/refill for their next action before player input unlocks.
Enemies plan after that draw/refill.
Player sees Intent during player turn.
Player actions may cause enemy/team replan.
Enemy action window executes the latest legal plan.
Enemy action window does not normal-draw before execution.
```

Combat setup:

```txt
1. Build actor card instances.
2. Shuffle actor draw piles with seeded RNG.
3. Player draws opening hand.
4. Enemies draw opening hands.
5. Enemy/team planner creates the first plan from already-held enemy cards.
6. Intent readout is generated.
7. Player input starts.
```

Player action checkpoint:

```txt
1. Human controller submits a legal card play or end-turn request.
2. Core resolves the request and emits events.
3. Enemy/team planner may recompute from current hands/resources/public state.
4. Intent readout updates according to visibility.
5. Input unlocks again if still player turn.
```

Enemy action window:

```txt
1. Core commits the latest legal enemy/team plan.
2. Enemy actors execute planned card sequence(s) through the same card-play runtime.
3. Played enemy cards move to discard/exhaust/other destinations.
4. No standard enemy draw occurs before execution.
5. After enemy actions, next player-planning window prepares the next Intent.
```

---

## 7. Controllers and AI Boundary

Controllers choose actions. The card runtime resolves actions.

Required controller concepts:

```txt
HumanCardController
= receives player input and submits legal requests.

HeuristicAiController
= plans one actor's action sequence using deterministic search and scoring.

LeaderTeamPlanner
= used by elites/bosses that can plan allied enemy turns.

RemoteHumanControllerFuture
= reserved for future PvP/networking.
```

AI must be strong, deterministic, and information-bounded.

Do not intentionally make enemies stupid to create difficulty. Enemy strength should come from:

```txt
energy
opening hand
draw per turn
max hand
deck quality
card costs
passives
team/leader authority
encounter composition
```

AI planner may use only allowed knowledge:

```txt
own hand
own discard
own exhaust
known deck composition where allowed
own energy/status/passives
ally hands/resources if leader/team rules allow
opponent public HP/block/statuses
public combat history
visible battlefield state
```

AI planner must not use:

```txt
opponent hidden hand
opponent hidden draw order
opponent private future choices
own hidden draw pile order
future RNG results
```

The engine stores draw pile arrays for deterministic simulation, but planner knowledge snapshots must not expose hidden draw order.

---

## 8. Planning Algorithm Contract

Enemy planning is not a one-card random intent roll.

The planner should work conceptually as:

```txt
1. Build actor/team knowledge snapshot.
2. Generate legal card sequences from current hand, energy, targets, and play limits.
3. Simulate candidate sequences on cloned state using the same resolver.
4. Score resulting states.
5. Choose best sequence with deterministic tie-break.
6. Store selected sequence as the current plan.
7. Generate visibility-limited Intent readout from the plan.
```

Team/leader planning may combine allied candidate sequences through bounded search/beam search. Bounded compute is an engineering limit, not a difficulty mode.

No LLM should be used for combat AI.

---

## 9. Team and Leader Planning

No leader:

```txt
Each enemy plans independently using own hand/resources and shared public/team context.
Execution order defaults to battlefield slot order unless content says otherwise.
```

Leader present:

```txt
Leader planner may inspect allied hands/resources allowed by team rules.
Leader planner may plan the whole enemy team.
Leader planner may choose team execution order.
Leader objective prioritizes killing the player, preserving leader survival, preserving useful allies, and executing synergies.
```

If the leader dies before enemy execution:

```txt
team plan degrades to independent plans or repaired legal fallback.
```

If a planned actor/card/target becomes invalid:

```txt
repair the plan if legal;
otherwise skip the invalid part and emit clear events/readout changes.
```

---

## 10. Intent Readout Architecture

Intent is presentation of a plan, not the source of the enemy action.

```txt
Plan
= actor/team card sequence selected by controller.

Intent
= player-visible summary of that plan, limited by visibility.

Commitment
= whether the plan is locked or may recompute before execution.
```

Intent levels should support:

```txt
none
unknown
category
rough
exact
scoped
```

Readout examples:

```txt
?
Attack
Attack + Debuff
Heavy Attack
Cinder Dust -> Ash Bite
Scoped: Plan A or Plan B, with reason tags
```

If plan changes after a player action, game-core must update the plan/readout and emit events that Phaser can animate or pulse. Exact Intent means “current known plan,” not a guarantee unless the plan is explicitly locked.

Enemy hands remain hidden unless reveal/scope/debug view-models expose them. Enemies are still rendered as sprites with Intent readouts, not as battlefield card hands.

---

## 11. Effects and Targeting

Effects should be data-driven and actor-relative.

Avoid long-term player-centric target names such as:

```txt
targetEnemy
targetPlayer
```

Preferred target selectors:

```txt
self
targetOpponent
allOpponents
randomOpponent
lowestHpOpponent
targetAlly
allAllies
leaderAlly
activePet
leadingPet
specificPet
```

The same card-play runtime should resolve player and enemy card plays. Player cards and enemy cards may keep different content wrappers because reward, rarity, AI hints, and enemy tier metadata differ.

Doctrine:

```txt
Different content wrappers.
Same runtime.
```

No combat effect should branch on card name.

Bad:

```ts
if (card.name === "Fox Bite") { ... }
```

Good:

```txt
effect: petAttack
tags: pet, fox, command, burn
modifier: modifyPetCommandEffectAmount
```

---

## 12. Pet Architecture

Pets remain persistent companions.

The first playable uses one active pet, Ember Fox, but the engine must remain multi-pet ready.

Do not hardcode a single global pet.

Use collection-based models such as:

```txt
activePetInstanceIds
petSlots
pet targets: leading | allActive | specific | randomActive | withTag
```

Pet-command visual grammar remains strict:

```txt
orange line = card -> pet command relationship
```

Enemy target rings still show effect targets.

Phase 1 does not include pet HP, pet injury, pet death, pet morale, pet revive, or enemy pet targeting.

---

## 13. Content and Workbench Contract

Content should be workbench-friendly JSON/data.

Player classes should define card actor resource profiles:

```txt
openingHandSize
drawPerTurn
maxHandSize
maxEnergy
energyRefill
unplayedHandPolicy
startingDeck
maxActivePets
```

Enemy definitions should define:

```txt
cardActor resource profile
deck card entries and copies
AI controller/profile/team role
leader capability
intent visibility baseline
passives/modifiers
```

Enemy card definitions should include:

```txt
cost
family
effects
intent metadata
AI hints
source/tier tags
```

The old intent-pool/scheduled-intent structure must not be the first-playable action source. If phase behavior is needed, express it as boss passive, card-game modifier, setup card, or team planning rule.

---

## 14. Events and View-Model Boundary

Combat events are the interface for tests and Phaser playback.

v0.5 event families should be actor-based:

```txt
ActorTurnStarted
ActorEnergyRefilled
ActorCardsDrawn
ActorCardMoved
ActorCardPlayed
ActorCardResolved
ActorPlanCreated
ActorPlanChanged
ActorPlanCommitted
TeamPlanCreated
TeamPlanChanged
IntentReadoutChanged
PetCommanded
PetReacted
DamageDealt
BlockGained
StatusApplied
CombatantDefeated
CombatEnded
```

Legacy monster-intent events should not be the gameplay source of truth. If retained for old trace replay or compatibility, they must be generated as projection/translation events only and should not drive first-playable combat.

View-models may expose player-friendly fields such as player hand, enemy slots, and Intent readouts. Those are presentation projections. They must not duplicate gameplay logic.

---

## 15. Testing Expectations

Core tests must run in Node without Phaser or browser APIs.

Hard-cut test coverage must include:

```txt
architecture boundary: game-core imports no Phaser/browser/app
retain-by-default: unplayed cards remain in hand
player draw per turn uses class actor profile
enemy draw/refill happens before player input planning
enemy action window does not standard-draw before execution
AI cannot see opponent private hand or own hidden draw order
planner generates legal card sequences under energy and target rules
leader can plan allied enemy turns when encounter data permits
Intent readout reflects plan sequence and visibility level
player actions can trigger enemy/team replan
legacy monster-intent fallback is not used by Ashwood Trail first playable
pet-command events remain ordered and visible
reward flow still works after combat victory
```

Trace tests should move to v0.5 actor/plan event schemas. Old traces should be deleted or isolated as explicit legacy replay fixtures.

---

## 16. Code Audit Contract for the v0.5 Hard Cut

This section records the architecture-level code review target for the current repository snapshot. It is not a code patch; it is the cut list future code work must follow.

### Maintain

Keep and adapt these systems because they fit v0.5:

```txt
seeded RNG helpers
status resolution, especially Burn semantics
basic effect resolution for damage/block/draw/status/pet effects
pet definitions, pet instances, pet targeting model, pet modifiers
reward offer / claim / skip lifecycle
run map and run lifecycle
Phaser scene/presenter/layout/event playback boundary
view-model driven presentation approach
content validation framework
simulation/smoke/balance harnesses
```

### Update Heavily

These areas must be reworked, not lightly patched:

```txt
src/game-core/model/combat.ts
  Replace parallel player card zones + monsterCardStates with shared CardActorState authority.

src/game-core/model/card.ts and enemy card/content models
  Support actor-neutral runtime, costs, sources, AI hints, and v0.5 metadata.

src/game-core/model/player.ts / player class data
  Add card actor resource profile fields.

src/game-core/model/monster.ts / monster data
  Replace intentPool/cardGame handSize/planSlots model with cardActor resources and AI profile/team role.

src/game-core/systems/combat.ts
  Replace player-only playCard and old turn windows with shared actor card play and v0.5 timing.

src/game-core/systems/draw.ts and card-pile utilities
  Make draw/reshuffle/move helpers actor-zone based.

src/game-core/systems/effects.ts
  Move toward actor-relative target selectors and owner-aware card zones.

src/game-core/systems/intent-visibility.ts and intent-presentation.ts
  Present plan-sequence readouts, scoped candidate sequences, and reason tags.

src/game-core/systems/validation.ts and content-schema.ts
  Validate v0.5 actor resources, costs, AI profiles, leader/team fields, and reject first-playable legacy intent-only enemies.

src/game-phaser/view-models/combat-view-model.ts
  Project actor-state data into player hand, pile counts, enemy plan Intent readouts, and debug actor holdings.

tests and traces
  Rebuild around v0.5 actor events and retain-by-default rules.
```

### Remove From First-Playable Runtime

These pre-v0.5 concepts should not survive as active gameplay paths:

```txt
legacy monster intent as action source
intentPool-first combat resolution
scheduled monster intent scripts
single-card planned monster ability as the enemy action model
MonsterCardGameDefinition handSize/planSlots/defaultPlanMode/adaptiveRuleIds as primary runtime shape
player-only top-level drawPile/hand/discard/energy authority
retainedCardInstanceIds and old RetainEffect/CardRetained semantics
end-turn discard of all non-retained player cards
chooseMonsterIntents as first-playable planner
finalizePlannedMonsterAbility as first-playable planner
MonsterIntentResolved / MonsterAbilityPlayed as source-of-truth action events
legacy starter cards kept only for migration/tests
old smoke traces that encode pre-v0.5 combat flow
```

If any legacy artifact must remain temporarily, it must be quarantined behind explicit names such as `legacy`, `migration`, or `traceReplayOnly` and must not be used by Ashwood Trail first playable content.

---

## 17. UI/UX Architecture Impact

The v0.5 hard cut should have limited layout impact but real view-model meaning changes.

Mostly unchanged:

```txt
side-view battlefield
Keeper + Ember Fox on left
enemy sprites on right
bottom hand/HUD/piles/end-turn layout
orange pet-command line
target rings
status trays
Phaser event playback boundary
```

Must change in presentation contract/view-models:

```txt
unplayed cards remain in hand at end turn
only played/fleeting/explicitly discarded cards animate to discard
Intent above enemies is a plan-sequence readout, not a single monster intent
unknown/category/rough/exact/scoped visibility applies to plan sequences
debug overlay should show actor resources and plan sequences
enemy energy/hand may be shown in debug or scope detail, not necessarily normal UI
```

---

## 18. First Playable Acceptance Gate

The v0.5 hard cut is complete only when:

```txt
Ashbound Keeper + Ember Fox + Ashwood Trail run on shared Card Actor runtime.
No first-playable enemy uses legacy intent-only action resolution.
Player and enemy unplayed hands retain by default.
Enemy planning happens after draw/refill and before player input.
Enemy turn executes latest legal plan without standard draw.
AI planner is deterministic and knowledge-bounded.
Elite/boss leader planning exists for team encounters.
Intent readouts summarize current plan sequences.
Core tests and simulation prove the flow without Phaser.
Phaser renders view-models/events without owning gameplay logic.
```
