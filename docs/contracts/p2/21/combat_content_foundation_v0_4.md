# Combat Content Foundation v0.4

Status: implementation contract / living content rulebook
Language: English technical contract, with Cantonese design notes where useful
Scope: first playable class, first pet, starter deck, first map, first enemies, rare-card bearer, boss, reward pool, and content authoring rules built on `combat_card_game_rules.md`.

Related docs:

- `combat_card_game_rules.md` — card-game law: draw/play/discard, enemy holdings, Intent visibility, adaptive enemies, fairness, reward-bearer rules.
- `architecture.md` — deterministic game-core, Phaser boundary, data-driven content, persistent multi-pet-ready model.
- `ui_ux_interaction.md` — combat presentation, pet-command orange line, enemy sprite/intents, hand and enemy UI caps.
- `design.md` — Ember Journal / Ashbound Companions visual and emotional direction.

Document split:

```txt
combat_card_game_rules.md
= the rules of the combat card game.

combat_content_foundation.md
= the first content set that obeys those rules.
```

This document is not a final balance sheet. It is the contract for what the first playable content is trying to teach and how it should be represented in data.

---
## v0.3 Implementation Update

v0.3 hardens the content foundation by making the first-map enemy `cardGame` metadata drive real runtime enemy holdings instead of acting only as descriptive metadata. New first-map enemies should now be authored with card-game fields that can produce enemy card instances, enemy hands, planned cards, discards, and deterministic reshuffles.

Implementation expectations:

```txt
Normal enemies:
  handSize = 1
  planSlots = 1
  planMode = locked

Elites:
  handSize = 2
  planSlots = 1
  planMode = adaptive or charging

Bosses:
  handSize = 3
  planSlots = 1, with future room for special phase slots
  planMode = adaptive / charging / scriptedPhase as data allows
```

Content authoring rule:

```txt
Every enemy deck entry should point to a real monster ability.
Every monster ability used by an enemy deck should also have an Intent-facing representation.
Enemy deck duplicates express frequency, not collectible duplicate limits.
Enemy-card events are debug/presentation data; enemies are still rendered as sprites with Intent UI, not as visible battlefield cards.
```

---

## 1. Core Content Promise

The first playable slice must prove this identity:

```txt
The player is reading an enemy card game through imperfect information,
then answering it with Keeper signals and Ember Fox commands.
```

The first map must not feel like a generic deckbuilder with a pet attached. It should feel like a relationship-and-information card game from the first combat.

Required first-slice pillars:

```txt
Player: Ashbound Keeper
Pet: Ember Fox
First map: Ashwood Trail
Combat identity: two-sided card game with imperfect Intent visibility
Player decision axis: action vs information vs pet command
Enemy identity: every enemy has a small card deck / ability deck
Reward identity: card rewards, pet upgrades, and at least one rare-card bearer hook
```

---

## 2. Content Must Obey These Non-Negotiables

Content must obey the architecture and UX contracts.

```txt
Game-core owns rules.
Phaser owns presentation.
Cards, monsters, pets, upgrades, rewards, and encounters are data-first.
No card-name-specific combat branches.
No single-pet engine assumption.
No direct Math.random() for gameplay.
Enemy cards are not rendered as battlefield cards.
Intent visibility is information, not an automatic universal truth.
The orange command line is only for card -> pet command relationship.
```

Phase 1 UI-supported caps:

```txt
Hand cards: 0-10
Enemies: 1-3
Active pet visual slots: up to 3, but Phase 1 uses one active pet
Enemy visible statuses: 4 + overflow
Player visible statuses: 5 + overflow
Pet visible statuses: 3 + overflow
Card visible tag icons: 4 + detail panel
```

If content exceeds these caps, treat it as unsupported content until the UI contract changes.

---

## 3. Card Axes: Source and Rarity

Every card should be understood through two independent axes.

```txt
Card Source
= where the card belongs thematically and mechanically.

Card Rarity
= how often it appears and how duplicate-limited it should be.
```

Recommended source values:

```txt
universalPlayer
= common player card available across compatible classes.

classBound
= card tied to a player class identity, such as Ashbound Keeper signals.

petBound
= card tied to a pet identity, such as Ember Fox commands.

petSupport
= card that modifies or supports pets without necessarily being a direct command.

encounterReward
= card primarily earned from a special encounter or rare holder.

eventOnly
= story/event/map reward only.

temporary
= combat-created card that normally disappears after combat.

legacy
= compatibility content kept for fixtures, tests, or migration.
```

Recommended rarity values:

```txt
starter
common
uncommon
rare
special
unique
```

Important distinction:

```txt
petBound is not a rarity.
A card can be petBound + common, petBound + uncommon, petBound + rare, etc.
```

---

## 4. Duplicate Policy

Duplicate limits should be explicit content policy, not accidental balance.

Recommended player deck duplicate rules:

```txt
Starter cards:
  can appear multiple times in the starter deck.

Universal common:
  max 3 copies in run deck.

Class common:
  max 3 copies in run deck.

PetBound common:
  max 2 copies in run deck.

Uncommon:
  max 2 copies in run deck.

Rare:
  max 1 copy in run deck unless duplicateAllowed is explicit.

Special / unique:
  max 1 copy in run deck.

Temporary:
  not counted against run-deck duplicate limits because they normally disappear after combat.

Legacy:
  should not define future balance.
```

Enemy deck duplicates mean frequency, not collectible duplicates.

Example:

```txt
Ash Slime deck:
  Slime Tackle x2
  Jelly Guard x1
```

This means Ash Slime attacks more often than it guards.

---

## 5. Player Card Families

Player-side card families:

```txt
Keeper Attack
= Keeper acts directly against enemies. No orange command line.

Keeper Skill
= block, draw, setup, utility, self-defense.

Keeper Signal
= class identity information cards: read, reveal, scope, mark, prepare, coordinate.

Pet-Command
= card commands an active pet. Uses orange command line.

Pet Support
= card modifies or supports pet state, resources, upgrades, or future commands. May target a pet.

Power / Ongoing
= long-term combat modifier. Use sparingly in the first slice.
```

Hard grammar rule:

```txt
Only true pet-command cards should use the command visual grammar.
Only cards that actually command a pet should use the command tag.
```

---

## 6. Enemy Card Families

Enemy-side card families:

```txt
Attack
= damages the Keeper/player by default.

Guard
= gains block, protects self, or shields allies.

Debuff
= applies a negative status to the player.

Buff
= improves self or ally.

Burn / Status
= applies Burn or another status.

Obscure
= hides or degrades Intent visibility. Phase 1 may represent this through telegraph/default visibility before a full obscure effect exists.

Charge
= prepares a stronger or delayed future action.

Signature
= a named enemy identity card.

Boss Phase
= boss card-like phase action; still resolved through data and events.
```

Enemy cards can use the same effect language as player cards, but enemy card definitions should not be mixed into the player reward registry.

---

## 7. First Player: Ashbound Keeper

First class name:

```txt
Ashbound Keeper
```

Implementation compatibility note:

```txt
The current player class id may remain novice_tamer temporarily for migration/tests,
but the player-facing class name should be Ashbound Keeper.
```

Identity:

```txt
field tactician
companion handler
ash-wilds survivor
information reader
pet-command coordinator
```

Core strengths:

```txt
information advantage
stable pet-command access
Burn pressure
safe defensive play
mid-combat adaptation through reveal/scope
```

Core weaknesses:

```txt
low raw burst at start
needs sequencing
elite/boss uncertainty requires investment in reveal/scope or safe play
```

Recommended class data:

```txt
Max HP: 70
Energy: 3
Draw per turn: 5
Starting deck size: 10
Max active pets: 1
Pet slot model: collection-based, future-ready
Starting pet: Ember Fox
Starting passive: Field Sense
```

Class tags:

```txt
keeper
signal
fieldcraft
burn
command
scout
```

---

## 8. Ashbound Keeper Passive: Field Sense

Starting passive:

```txt
Field Sense
Normal enemies show category Intent.
Elites, bosses, and rare bearers show ? unless revealed or scoped.
```

Why this exists:

```txt
Intent visibility is not universal free information.
The first class receives a weak information passive so early combat is readable.
Advanced enemies still preserve uncertainty and adaptive room.
```

Field Sense should be represented as a class modifier/passive, not a hardcoded UI rule.

---

## 9. First Pet: Ember Fox

Ember Fox is the first active pet and the first slice's emotional anchor.

Role:

```txt
Burn / Command / Guard / Fetch / Read-the-field support
```

Combat personality:

```txt
agile
responsive
creates pressure through Burn
protects the Keeper through Tailguard
smooths bad hands through Fetch
later helps read enemy intent through upgrades
```

Ember Fox is not:

```txt
raw damage pet only
a passive stat stick
a disposable summon
a generic fire spell source
a pet with Phase 1 HP
```

Phase 1 pet HP rule:

```txt
Do not give Ember Fox an HP bar in Phase 1.
Do not implement enemy pet targeting, pet death, pet injury, revive, or morale without a later contract.
```

Ember Charge rule:

```txt
Ember Charge is not baseline.
It appears only when an upgrade/card such as Banked Ember enables it.
```

---

## 10. Starter Deck v0.3

Starting deck size:

```txt
10 cards
5 Keeper / Signal cards
5 Pet-Command cards
```

Starter deck list:

```txt
Keeper's Tap x2
Field Brace x2
Read the Ash x1
Fox Bite x2
Tailguard x1
Kindle Mark x1
Fetch Signal x1
```

Starting deck IDs:

```txt
keepers_tap
keepers_tap
field_brace
field_brace
read_the_ash
fox_bite
fox_bite
tailguard
kindle_mark
fetch_signal
```

Design reason:

```txt
The first hand should usually show at least one pet-command card.
The first deck should teach responding to enemy plans, not only dealing damage.
The first deck should show that information is a resource.
```

---

## 11. Starter Card Contracts

### Keeper's Tap

```txt
ID: keepers_tap
Family: Keeper Attack
Cost: 1
Target: Enemy
Rarity: starter
Source: classBound
Effect: Deal 5 damage.
Tags: keeper, attack, signal
Purpose: direct Keeper action; no orange command line.
```

### Field Brace

```txt
ID: field_brace
Family: Keeper Skill
Cost: 1
Target: Self
Rarity: starter
Source: classBound
Effect: Gain 5 Block.
Tags: keeper, block, guard
Purpose: basic safety, especially against unknown or attack-category Intent.
```

### Read the Ash

```txt
ID: read_the_ash
Family: Keeper Signal
Cost: 1
Target: Enemy
Rarity: starter
Source: classBound
Effect: Draw 1. Improve target enemy Intent visibility by 1 level for current plan, capped at rough.
Tags: keeper, signal, scout, draw, reveal
Purpose: teach that information can be bought with energy/card tempo.
```

### Fox Bite

```txt
ID: fox_bite
Family: Pet-Command
Cost: 1
Target: Pet + Enemy
Rarity: starter
Source: petBound
Effect: Command Ember Fox: pet attacks for 4, then apply 2 Burn.
Tags: pet, fox, command, attack, burn
Purpose: core pet-command attack and Burn identity.
```

### Tailguard

```txt
ID: tailguard
Family: Pet-Command
Cost: 1
Target: Pet + Self
Rarity: starter
Source: petBound
Effect: Command Ember Fox: gain 6 Block; fox reacts with guard.
Tags: pet, fox, command, guard, block
Purpose: prove the pet protects, not only attacks.
```

### Kindle Mark

```txt
ID: kindle_mark
Family: Pet-Command
Cost: 1
Target: Pet + Enemy
Rarity: starter
Source: petBound
Effect: Command Ember Fox: apply 3 Burn.
Tags: pet, fox, command, burn, setup, mark
Purpose: answer enemy Guard/block turns through delayed pressure.
```

### Fetch Signal

```txt
ID: fetch_signal
Family: Pet-Command
Cost: 0
Target: Pet / No enemy
Rarity: starter
Source: petBound
Effect: Command Ember Fox: draw 1; fox reacts with fetch.
Tags: pet, fox, command, fetch, draw
Purpose: 0-cost utility command, hand smoothing, pet identity in awkward hands.
```

---

## 12. First Reward Card Pool

The first map reward pool should be small and identity-rich.

Recommended first-slice card count:

```txt
Universal player commons: 3-5
Ashbound Keeper commons: 3-5
Ember Fox petBound commons/uncommons: 4-6
Uncommons: 4-6
Rares: 1-3, with at least one rare holder hook
```

Initial reward cards:

```txt
Ember Spark
  universalPlayer common
  Deal damage and apply Burn.

Quick Guard
  universalPlayer common
  Gain Block.

Trail Notes
  universalPlayer common
  Draw cards.

Field Signal
  classBound common
  Draw and improve Intent visibility.

Measured Step
  classBound common
  Gain Block and improve Intent visibility.

Kindle
  classBound uncommon
  Apply Burn to all enemies.

Cinder Sweep
  classBound uncommon
  Deal area damage and apply Burn.

Coordinated Strike
  classBound uncommon pet-command
  Command Ember Fox to attack; this must use pet-command grammar.

Fox Flare
  petBound uncommon
  Ember Fox attack + Burn.

Sootstep
  petBound common
  Burn + guarded movement.

Return Signal
  petBound uncommon
  Ember Fox fetch/draw utility.

Ash Rewrite
  encounterReward rare
  Draw and scope/improve target enemy Intent visibility.
  Primary source: Cinder Scribe rare-card bearer.
```

Reward-pool rule:

```txt
Generic cards fill gaps.
ClassBound cards express Ashbound Keeper reading/signaling.
PetBound cards express Ember Fox behavior.
EncounterReward cards should feel discovered or earned, not just randomly found.
```

---

## 13. First Pet Upgrade Pool

Pet upgrades should change play pattern, not only add numbers.

Initial Ember Fox upgrades:

```txt
Warm Bond
  First Ember Fox command each combat costs 1 less.
  Role: opener / early pet identity.

Burning Fang
  Burn-tagged Ember Fox commands gain stronger pet attack and Burn application.
  Role: Burn-command scaling.

Ash Instinct
  When a burned enemy dies during your turn, draw 1 once per turn.
  Role: Burn payoff / hand smoothing.
```

Recommended next upgrades after this patch:

```txt
Soot-Paw Instinct
  Once per turn, after your first pet-command, improve target enemy Intent visibility by 1 level.
  Role: ties Ember Fox to the information game.

Banked Ember
  Burn damage stores Ember Charge, max 3. At full charge, next pet-command is empowered.
  Role: introduces named pet resource and pips only when mechanic exists.

Old Shrine Memory
  Unlocks a pet memory and future petBound card options.
  Role: progression / side story.
```

---

## 14. First Map: Ashwood Trail

First map name:

```txt
Ashwood Trail
```

Purpose:

```txt
Teach that enemies have card-like plans.
Teach that Intent visibility is partial information.
Teach the difference between direct Keeper action and pet command.
Teach Burn as a delayed answer to Guard/block.
Introduce one information-disrupting enemy.
Introduce one adaptive elite.
Introduce one rare-card bearer.
End with a boss-like test of partial information and Burn/Guard pressure.
```

Supported encounter sizes:

```txt
1-3 enemies only.
```

First map encounter roster:

```txt
Normal:
  Ash Slime
  Cinder Mite
  Soot Crow
  Root Husk
  Mixed pairs/trios from those enemies

Elite:
  Charred Stag

Rare holder:
  Cinder Scribe

Boss:
  Emberroot Warden
```

---

## 15. Normal Enemy: Ash Slime

Purpose:

```txt
Teach Attack vs Guard.
```

Contract:

```txt
ID: training_slime   # compatibility id
Display name: Ash Slime
HP: 20
Hand size: 1
Plan mode: locked
Field Sense visibility: category
```

Deck / ability frequency:

```txt
Slime Tackle x2
  Attack
  Deal 6.

Jelly Guard x1
  Guard
  Gain 5 Block.
```

Player lesson:

```txt
Attack category -> block, Tailguard, race, or kill.
Guard category -> Burn/setup is stronger than dumping all direct damage into block.
```

---

## 16. Normal Enemy: Cinder Mite

Purpose:

```txt
Teach debuff/Burn pressure and racing debuffs.
```

Contract:

```txt
ID: ash_mite   # compatibility id
Display name: Cinder Mite
HP: 16
Hand size: 1
Plan mode: locked
Field Sense visibility: category
```

Deck:

```txt
Ash Bite x2
  Attack
  Deal 4.

Cinder Dust x1
  Debuff
  Apply Burn 1 to Keeper.

Skitter x1
  Guard
  Gain 3 Block.
```

Player lesson:

```txt
Debuff category can be answered by racing damage, blocking safely, or using Read the Ash for better information.
```

---

## 17. Normal Enemy: Soot Crow

Purpose:

```txt
Teach that information can be disrupted.
```

Contract:

```txt
ID: soot_crow
Display name: Soot Crow
HP: 18
Hand size: 1
Plan mode: locked
Field Sense visibility: category unless action telegraph is hidden/unknown
```

Deck:

```txt
Peck x2
  Attack
  Deal 5.

Ash Flutter x1
  Special / Obscure-flavored
  Gain 2 Block and hide behind ash.

Black Caw x1
  Debuff
  Apply Burn 1.
```

Implementation note:

```txt
Full obscureIntent is reserved by the combat rules.
Phase 1 can represent Soot Crow's identity through unknown/default telegraph and special tags until full obscure resolution is implemented.
```

Player lesson:

```txt
Read the Ash and reveal/scope cards are not luxury; information can be part of survival.
```

---

## 18. Normal Enemy: Root Husk

Purpose:

```txt
Teach slow Guard pressure and Burn as answer to defensive enemies.
```

Contract:

```txt
ID: root_husk
Display name: Root Husk
HP: 28
Hand size: 1
Plan mode: locked
Field Sense visibility: category
```

Deck:

```txt
Root Swipe x2
  Attack
  Deal 7.

Bark Over x2
  Guard
  Gain 7 Block.

Ember Sap x1
  Special / Guard
  Gain 5 Block and prepare pressure.
```

Player lesson:

```txt
Burn/setup remains valuable when the enemy spends turns guarding.
```

---

## 19. Elite: Charred Stag

Purpose:

```txt
First adaptive enemy.
```

Contract:

```txt
ID: charred_stag
Display name: Charred Stag
HP: 55
Hand size: 2
Plan slots: 1
Plan mode: adaptive / charging
Default visibility: unknown
Field Sense: does not fully reveal
Read/reveal: can improve one level
Scope: can show better current-plan information later
```

Deck:

```txt
Antler Strike x2
  Attack
  Deal 10.

Ember Hooves x1
  Special / Attack / Burn
  Deal 6 and apply Burn 1.

Guarded Snort x1
  Guard
  Gain 9 Block.

Paw the Ash x1
  Charge
  Gain 4 Block and prepare a stronger line.

Crown Flare x1
  Special / Obscure / Burn
  Gain 4 Block and apply Burn 1.
```

Adaptive fairness:

```txt
The elite may adapt only within its hand/candidate set and authored rules.
It may not create a perfect counter from nowhere.
If a visible plan changes, the UI/event layer must communicate instability or plan change.
```

---

## 20. Rare-Card Bearer: Cinder Scribe

Purpose:

```txt
First rare-card holder encounter.
The rare card should feel carried, guarded, or written by the encounter, not randomly generated.
```

Contract:

```txt
ID: cinder_scribe
Encounter ID: cinder_scribe_encounter
Display name: Cinder Scribe
HP: 42
Hand size: 2
Plan mode: locked / light adaptive later
Difficulty: rare
Reward bearer kind: cardBearer
Held reward: Ash Rewrite
Reveal state: rumored
First-time reward: guaranteed
Repeat drop: chance-based, with fallback reward pool
```

Deck:

```txt
Ink Spark x2
  Special / Attack / Burn
  Deal 5 and apply Burn 1.

Page Shield x1
  Guard
  Gain 8 Block.

Smudge the Future x1
  Special / Obscure-flavored
  Gain 4 Block and hide/blur the future.
```

Held reward:

```txt
Ash Rewrite
  Rarity: rare
  Source: encounterReward
  Effect: Draw 1. Scope/improve target enemy Intent visibility by 2 levels, capped at scoped.
```

---

## 21. Boss: Emberroot Warden

Purpose:

```txt
First-map boss-like test of partial information, Guard, Burn, and pet-command sequencing.
```

Contract:

```txt
ID: forest_warden   # compatibility id
Display name: Emberroot Warden
HP: 90
Hand size: 3
Plan slots: 1
Plan mode: adaptive + charging
Default visibility: unknown / phase / charge marker
Field Sense: does not fully reveal
Scope/reveal: improves current-plan information
```

Deck:

```txt
Root Slam x2
  Attack
  Deal 12.

Cinder Bark x2
  Guard / Burn
  Gain 10 Block. Apply Burn 1.

Old Flame x1
  Debuff
  Apply Burn 2.

Ash Bloom x1
  Charge / Special
  Prepares the next pressure line.

Ancient Shelter x1
  Guard / Cleanse
  Gain 12 Block. Reduce Burn on self by 2.
```

Boss lesson:

```txt
The player cannot solve the boss by reading free exact intent every turn.
They need safe play, Burn pressure, and selective information spending.
```

---

## 22. First Map Encounter Graph

Recommended Ashwood Trail flow:

```txt
Start
  -> Ash Slime / Cinder Mite early choices
  -> mixed normal fights
  -> Root Husk / Soot Crow pressure choices
  -> Charred Stag elite OR Cinder Scribe rare holder branch
  -> Emberroot Warden boss
```

The exact graph can be small. What matters is that the first map offers:

```txt
simple tutorial fight
status/debuff fight
information disruption fight
defensive enemy fight
adaptive elite
rare-card bearer
boss-like endpoint
```

---

## 23. How Combat Should Feel

### Basic normal enemy turn

```txt
Enemy shows Attack category through Field Sense.
Player chooses Field Brace / Tailguard / race damage.
Enemy resolves its card-like action.
Cards move through draw, hand, discard.
```

### Unknown or blurred Intent turn

```txt
Enemy shows ? or Special.
Player can spend Read the Ash to improve visibility.
Player can choose safe block, Burn setup, or risk damage race.
```

### Pet-command turn

```txt
Player hovers Fox Bite.
Orange line points to Ember Fox.
Enemy rings show valid effect targets.
On play, CardPlayed -> EnergySpent -> PetCommanded -> PetReacted -> Damage/Status events.
```

### Elite adaptive turn

```txt
Elite starts hidden or partial.
Reveal improves information but may not fully lock the plan.
Scope later can show candidate set or current preferred action.
Player chooses whether to overblock, setup Burn, or attack.
```

---

## 24. Effect Verbs Required by This Foundation

Implemented or reserved effect language needed by this content:

```txt
damage
block
draw
applyStatus
cleanseStatus
petAttack
petBlock
petReact
improveIntentVisibility
revealIntent      # reserved / future expansion
scopeIntent       # reserved / future expansion
obscureIntent     # reserved / future expansion
enemyPlanChanged  # event / future expansion
```

Starter content should avoid complex conditional text until the engine has proper conditional-effect support.

Deferred conditional examples:

```txt
If target has Burn...
If the enemy intends to Attack...
If you played a pet-command this turn...
If this enemy's plan is adaptive...
```

These are good future design spaces, but they should be data-driven when implemented.

---

## 25. Implementation Contract for Current Patch

This content foundation expects the codebase to expose:

```txt
Card metadata:
  source
  rarity
  rewardPools
  dropSources
  duplicatePolicy

Intent visibility model:
  IntentVisibilityLevel
  intentVisibilityOverrides on CombatState
  improveIntentVisibility effect
  EnemyIntentVisibilityChanged event

Class passive:
  Field Sense as a player class modifier

First content:
  Ashbound Keeper display name
  Ember Fox command card set
  starter deck v0.3
  Ashwood Trail encounters
  Ash Slime, Cinder Mite, Soot Crow, Root Husk
  Charred Stag
  Cinder Scribe rare-card bearer
  Emberroot Warden
```

Compatibility rule:

```txt
Existing ids may remain for compatibility if tests, saves, or scenes depend on them.
Player-facing names and content behavior should move to the v0.3 contract.
```

---

## 26. What This Document Does Not Yet Finalize

Not finalized:

```txt
final balance
final card art
final enemy art
full rare-holder reward resolution UI
full adaptive AI implementation
true scope candidate-set UI
pet unlock encounters
second pet
multi-pet targeting UI
pet HP / injury / morale
full conditional card language
```

Do not block implementation of the first content contract on these deferred systems.

---

## 27. Hard Recommendation

Lock the first playable content around this sentence:

```txt
Ashbound Keeper survives Ashwood Trail by reading imperfect enemy plans,
signaling through cards, and commanding Ember Fox as a co-hero.
```

Everything in the first map should support that sentence. If a card, enemy, or reward does not support it, it should be cut, delayed, or rewritten.

---

## v0.4 Implementation Update — Reveal/Scope, Balance, and Intent ViewModel

v0.4 is the first integrated pass across the three systems that should now develop together:

```txt
A. Reveal / Scope / Obscure system
B. Ashwood Trail balance pass
C. Intent view-model and tooltip contract
```

### A. Reveal / Scope / Obscure Content Rules

Ashbound Keeper and Ember Fox content can now use the runtime information effects defined in `combat_card_game_rules.md`.

Current first-map card responsibilities:

```txt
Read the Ash
= starter information card. Draw 1 and improve target Intent visibility by one step, capped at rough.

Field Signal
= reward information card. Draw and improve Intent visibility.

Ash Rewrite
= rare Cinder Scribe reward. Draw 1 and scope the target enemy candidate set.
```

Enemy obscure responsibilities:

```txt
Soot Crow / Ash Flutter
= introduces enemy-driven visibility degradation.

Cinder Scribe / Smudge the Future
= rare-card bearer that demonstrates information manipulation.
```

These are not flavor-only tags anymore. They affect runtime Intent visibility state.

### B. Ashwood Trail Balance Pass v0.4

The first-map balance target remains:

```txt
Normal completion target: 45% - 60%
Sample: 200 deterministic balance runs
Strict health: enabled
Strict balance: enabled
```

Final v0.4 implementation balance result after the integrated reveal/scope/obscure pass:

```txt
Seed prefix: balance-normal
Runs: 200
Completed: 90
Lost: 110
Completion rate: 45.0%
Result: inside target band
```

The small boss tuning applied in v0.4:

```txt
Emberroot Warden HP: 90 -> 94
Root Slam damage: 12 -> 13
Cinder Bark block: 10 -> 11
```

Reason:

```txt
The first v0.4 balance run completed at 61.0%, slightly above the 60.0% ceiling.
The boss was the main terminal filter, so the pass tightened boss pressure without making normal enemies harsher.
```

Do not overcorrect normal fights yet. Normal enemies are still teaching cards, visibility, burn, and pet-command grammar.

### C. Intent ViewModel / Tooltip Contract v0.4

The combat view-model now exposes richer Intent information without making Phaser own rules.

Intent tokens may include:

```txt
visibility
kind
amountLabel
strengthLabel
scope
tooltip
detail
debug
```

Scoped Intent data may include:

```txt
candidateCount
candidate card names
planMode
unstable flag
scope explanation lines
```

Scoped data is allowed to reveal candidate names, because the point of scope is to show possible enemy cards. It should not reveal exact damage/block/effect text unless visibility is exact.

Enemy card holdings may also be exposed as debug/readout view-model data:

```txt
drawCount
handCount
plannedCount
discardCount
exhaustCount
planMode
candidateCount
```

This is for presenter/debug/readout support. It does not mean enemy cards should be rendered as battlefield cards.

### Content Version

The runtime content version for this pass is:

```txt
ashwood-trail-reveal-scope-v4
```

### v0.4 Non-Negotiables

```txt
Reveal/scope/obscure effects are data-driven.
Enemy obscure effects may hide information but may not bypass enemy card holdings.
Adaptive enemies may change plan only inside authored candidate sets.
Scoped UI can show candidate names, not exact effect text.
Balance should use strict-health and strict-balance simulations before claiming success.
Enemy cards remain internal holdings plus Intent UI, not visible battlefield cards.
```
