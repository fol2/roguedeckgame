# Combat Content Foundation v0.5 — Ashwood Trail First Playable Content

Status: final PoC content contract / living content rulebook
Language: English technical contract, with Cantonese design notes where useful
Scope: first playable class, first pet, starter deck, first map, enemy resource profiles, enemy decks, rare-card bearer, boss, reward pool, and content authoring rules built on `combat_card_game_rules.md` v0.5.

Related documents:

- `combat_card_game_rules.md` — canonical combat/card-game law: shared Card Actors, retain-by-default, deterministic AI planning, sequence-aware Intent, and team/leader planning.
- `architecture.md` — deterministic game-core, Phaser boundary, data-driven content, persistent multi-pet-ready model.
- `ui_ux_interaction.md` — combat presentation, pet-command orange line, enemy sprite/intents, hand/enemy UI caps.
- `design.md` — Ember Journal / Ashbound Companions visual and emotional direction.

Replacement note:

```txt
combat_poc_v0_5_book.md replaces combat_card_game_rules.md as the rulebook.
This document remains because first playable content should not be mixed into the core rulebook.
This v0.5 file updates the old v0.4 combat_content_foundation.md to obey the shared Card Actor model.
```

Document split from v0.5 onward:

```txt
combat_card_game_rules.md
= universal combat law.

combat_content_foundation.md
= Ashbound Keeper, Ember Fox, Ashwood Trail, starter deck, first enemies, reward pool, and first-slice tuning targets.
```

This document must not contradict `combat_card_game_rules.md`. If they disagree, the rulebook wins and this content file must be updated.

---

## 1. Core Content Promise

The first playable slice must prove this identity:

```txt
The player and enemies are playing the same retained-hand card game.
The player reads visibility-limited enemy plans through Intent.
The player answers those plans with Keeper signals and Ember Fox commands.
```

The first map must not feel like a generic deckbuilder with a pet attached. It should feel like a relationship-and-information card game from the first combat.

Required first-slice pillars:

```txt
Player: Ashbound Keeper
Pet: Ember Fox
First map: Ashwood Trail
Combat identity: shared Card Actor game with imperfect Intent visibility
Player decision axis: action vs information vs pet command
Enemy identity: enemies are card actors with real deck/hand/energy/draw resources
Reward identity: card rewards, pet upgrades, and at least one rare-card bearer hook
```

---

## 2. Content Non-Negotiables

Content must obey the architecture, UI, and combat rulebook.

```txt
Game-core owns rules.
Phaser owns presentation.
Cards, enemies, pets, upgrades, rewards, and encounters are data-first.
No card-name-specific combat branches.
No single-pet engine assumption.
No direct Math.random() for gameplay.
Enemy cards are not rendered as battlefield cards.
Enemy hands are hidden unless revealed/scoped/debugged.
Intent visibility is information, not automatic truth.
The orange command line is only for card -> pet command relationship.
First playable content must use the v0.5 Card Actor runtime, not legacy intent-only fallback.
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

---

## 3. Card Axes: Source and Rarity

Every player-facing card should be understood through two independent axes.

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
= card that modifies or supports pet state, resources, upgrades, or future commands.

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

Important:

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

Enemy deck duplicates mean frequency, not collectible duplicate limits.

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
= damages the opposing player/actor by default.

Guard
= gains block, protects self, or shields allies.

Debuff
= applies a negative status to the player.

Buff
= improves self or ally.

Burn / Status
= applies Burn or another status.

Obscure
= hides or degrades Intent visibility.

Charge / Setup
= improves later plan/action windows.

Signature
= a named enemy identity card.

Boss Phase
= boss card-like phase action; still resolved through data and events.
```

Enemy cards can use the same effect language/runtime as player cards, but enemy card definitions should not be mixed into the player reward registry.

Doctrine:

```txt
Different content wrappers.
Same card-play engine.
```

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
hand can clog under retain-by-default rules
```

Recommended class data under v0.5:

```txt
Max HP: 70
Max energy: 3
Energy refill: 3
Opening hand: 5
Draw per turn: 3
Max hand: 10
Starting deck size: 10
Unplayed hand policy: retain
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
Advanced enemies still preserve uncertainty, adaptive room, and scope value.
```

Field Sense should be represented as a class modifier/passive, not a hardcoded UI rule.

Under v0.5, Field Sense reveals the category summary of the current plan sequence, not a single hardcoded monster intent.

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

## 10. Starter Deck v0.5

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
The deck must still function under retain-by-default hand rules.
```

Retain-all impact:

```txt
Player draw per turn is reduced to 3.
Unplayed block/reveal cards can stay in hand.
Hand clog becomes real, so future discard/cycle cards matter.
0-cost draw must be watched carefully in balance.
```

---

## 11. Starter Card Contracts

### Keeper's Tap

```txt
ID: keepers_tap
Family: Keeper Attack
Cost: 1
Target: targetOpponent
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
Target: self
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
Target: targetOpponent / enemy plan readout
Rarity: starter
Source: classBound
Effect: Draw 1. Improve target enemy/team Intent visibility by 1 level for current plan, capped at rough.
Tags: keeper, signal, scout, draw, reveal
Purpose: teach that information can be bought with energy/card tempo.
```

Under v0.5, `Read the Ash` reveals a plan-sequence readout, not a legacy one-card intent.

### Fox Bite

```txt
ID: fox_bite
Family: Pet-Command
Cost: 1
Target: activePet + targetOpponent
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
Target: activePet + self
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
Target: activePet + targetOpponent
Rarity: starter
Source: petBound
Effect: Command Ember Fox: apply 3 Burn.
Tags: pet, fox, command, burn, setup, mark
Purpose: answer Guard/Block turns and create delayed pressure.
```

### Fetch Signal

```txt
ID: fetch_signal
Family: Pet-Command
Cost: 0
Target: activePet / no opponent target
Rarity: starter
Source: petBound
Effect: Command Ember Fox: draw 1.
Tags: pet, fox, command, fetch, draw
Purpose: 0-cost pet utility; smooths awkward hands.
```

Balance warning:

```txt
Because unplayed cards are retained by default, Fetch Signal is stronger than in old draw/discard rules.
Watch hand cap, draw count, and 0-cost chain behavior during simulation.
```

---

## 12. First Map: Ashwood Trail

Purpose:

```txt
Teach the shared actor card game.
Teach that enemies have real hands/resources.
Teach imperfect Intent visibility.
Teach Ember Fox command identity.
Teach Burn as an answer to Guard/Block timing.
Teach that elite/boss enemies can plan smarter and lead teams.
```

First map roster:

```txt
Normal enemies:
  Ash Slime
  Cinder Mite
  Soot Crow
  Root Husk

Elite:
  Charred Stag

Rare-card bearer:
  Cinder Scribe

Boss:
  Emberroot Warden
```

Supported encounter sizes:

```txt
1-3 enemies only
```

---

## 13. Enemy Resource Baselines

Normal enemy baseline:

```txt
openingHandSize: 2
drawPerTurn: 1
maxHandSize: 3
maxEnergy: 1
energyPerTurn: 1
unplayedHandPolicy: retain
controller: heuristic
teamRole: independent unless led
```

Elite baseline:

```txt
openingHandSize: 4
drawPerTurn: 2
maxHandSize: 5
maxEnergy: 2
energyPerTurn: 2
unplayedHandPolicy: retain
controller: heuristic or leaderHeuristic
teamRole: independent or leader by encounter
```

Boss baseline:

```txt
openingHandSize: 5
drawPerTurn: 3
maxHandSize: 7
maxEnergy: 3
energyPerTurn: 3
unplayedHandPolicy: retain
controller: leaderHeuristic
teamRole: leader
```

---

## 14. Ash Slime

Role:

```txt
simple aggressive tutorial enemy
```

Suggested stats:

```txt
HP: 20
Tier: normal
```

Card Actor profile:

```txt
openingHandSize: 2
drawPerTurn: 1
maxHandSize: 3
maxEnergy: 1
energyPerTurn: 1
unplayedHandPolicy: retain
```

Deck:

```txt
Slime Tackle x3
Jelly Guard x1
```

Cards:

```txt
Slime Tackle
Cost: 1
Family: Attack
Effect: Deal 6 damage to targetOpponent.
Intent: Attack

Jelly Guard
Cost: 1
Family: Guard
Effect: Gain 5 Block.
Intent: Guard
```

AI profile:

```txt
aggressive_simple
prefer damage
use guard if low HP or no good attack
```

Behavior emerges naturally:

```txt
Mostly attacks, sometimes guards.
```

---

## 15. Cinder Mite

Role:

```txt
burn / debuff pressure enemy
```

Suggested stats:

```txt
HP: 16
Tier: normal
```

Card Actor profile:

```txt
openingHandSize: 2
drawPerTurn: 1
maxHandSize: 3
maxEnergy: 1
energyPerTurn: 1
unplayedHandPolicy: retain
```

Deck:

```txt
Ash Bite x2
Cinder Dust x2
Skitter x1
```

Cards:

```txt
Ash Bite
Cost: 1
Family: Attack
Effect: Deal 4 damage.
Intent: Attack

Cinder Dust
Cost: 1
Family: Debuff / Burn
Effect: Apply Burn 1 to targetOpponent.
Intent: Debuff

Skitter
Cost: 1
Family: Guard
Effect: Gain 3 Block.
Intent: Guard
```

AI profile:

```txt
burn_pressure
prefer Cinder Dust if player has low/no Burn
prefer attack if player HP is low
```

---

## 16. Soot Crow

Role:

```txt
information disruption enemy
```

Suggested stats:

```txt
HP: 18
Tier: normal
```

Card Actor profile:

```txt
openingHandSize: 2
drawPerTurn: 1
maxHandSize: 3
maxEnergy: 1
energyPerTurn: 1
unplayedHandPolicy: retain
```

Deck:

```txt
Peck x2
Ash Flutter x2
Black Caw x1
```

Cards:

```txt
Peck
Cost: 1
Family: Attack
Effect: Deal 5 damage.
Intent: Attack

Ash Flutter
Cost: 1
Family: Obscure / Guard
Effect: Obscure this enemy/team Intent by 1 level for current plan. Gain 2 Block.
Intent: Special / Obscure

Black Caw
Cost: 1
Family: Debuff
Effect: Apply Burn 1 or Scattered 1 if Scattered exists.
Intent: Debuff
```

AI profile:

```txt
information_disruptor
prefer obscure when player has high visibility or leader/team plan benefits from hiding
otherwise attack/debuff
```

---

## 17. Root Husk

Role:

```txt
defensive slow pressure enemy
```

Suggested stats:

```txt
HP: 28
Tier: normal
```

Card Actor profile:

```txt
openingHandSize: 2
drawPerTurn: 1
maxHandSize: 3
maxEnergy: 1
energyPerTurn: 1
unplayedHandPolicy: retain
```

Deck:

```txt
Root Swipe x2
Bark Over x2
Ember Sap x1
```

Cards:

```txt
Root Swipe
Cost: 1
Family: Attack
Effect: Deal 7 damage.
Intent: Attack

Bark Over
Cost: 1
Family: Guard
Effect: Gain 7 Block.
Intent: Guard

Ember Sap
Cost: 1
Family: Setup / Buff
Effect: Next attack gains +3 damage, or gain a simple Strength-like temporary modifier.
Intent: Setup
```

AI profile:

```txt
defensive_guardian
prefer guard when low HP
prefer attack when player has low Block
prefer setup when safe
```

---

## 18. Charred Stag Elite

Role:

```txt
first adaptive pressure enemy and possible leader
```

Suggested stats:

```txt
HP: 55
Tier: elite
```

Card Actor profile:

```txt
openingHandSize: 4
drawPerTurn: 2
maxHandSize: 5
maxEnergy: 2
energyPerTurn: 2
unplayedHandPolicy: retain
controller: heuristic or leaderHeuristic
teamRole: leader when encounter includes mobs, otherwise independent
```

Deck:

```txt
Antler Strike x2
Guarded Snort x2
Ember Hooves x1
Paw the Ash x1
Crown Flare x1
```

Cards:

```txt
Antler Strike
Cost: 1
Family: Attack
Effect: Deal 10 damage.
Intent: Attack

Guarded Snort
Cost: 1
Family: Guard
Effect: Gain 9 Block.
Intent: Guard

Ember Hooves
Cost: 1
Family: Attack / Burn
Effect: Deal 6 damage. Apply Burn 1.
Intent: Attack + Debuff

Paw the Ash
Cost: 1
Family: Setup / Charge
Effect: Next attack gains +5 damage or create a temporary charge modifier.
Intent: Setup / Charge

Crown Flare
Cost: 1
Family: Obscure / Special
Effect: Obscure Intent by 1 level. Gain 4 Block. Apply Burn 1.
Intent: Special
```

AI profile:

```txt
aggressive_adaptive
can choose two-card plan
attacks for lethal/pressure
guards or charges if player overblocks
uses burn/obscure when useful
can lead mobs in elite encounters
```

---

## 19. Cinder Scribe Rare-Card Bearer

Role:

```txt
information/reward enemy and first rare-card bearer
```

Suggested stats:

```txt
HP: 42
Tier: rareBearer / elite-lite
Encounter type: cardBearer
Held reward: Ash Rewrite
Reveal state: rumored or knownBeforeCombat
Drop rule: guaranteed first time, chance-based on repeats
```

Card Actor profile:

```txt
openingHandSize: 4
drawPerTurn: 2
maxHandSize: 5
maxEnergy: 2
energyPerTurn: 2
unplayedHandPolicy: retain
controller: heuristic
teamRole: independent, but can use information-control style
```

Deck:

```txt
Ink Spark x2
Page Shield x1
Smudge the Future x2
Borrowed Line x1
```

Cards:

```txt
Ink Spark
Cost: 1
Family: Attack / Burn
Effect: Deal 5 damage. Apply Burn 1.
Intent: Attack + Debuff

Page Shield
Cost: 1
Family: Guard
Effect: Gain 8 Block.
Intent: Guard

Smudge the Future
Cost: 1
Family: Obscure
Effect: Obscure current enemy/team Intent by 1 level.
Intent: Special / Obscure

Borrowed Line
Cost: 1
Family: Draw / Setup
Effect: Draw 1. Future implementation may allow an explicit mini-replan checkpoint.
Intent: Setup
```

Held player reward:

```txt
Ash Rewrite
Rarity: rare
Source: encounterReward / Ashbound Keeper
Cost: 1
Effect: Scope target enemy/team current plan. Draw 1. If plan is adaptive/team-led, show candidate sequence or reason tags.
Tags: keeper, signal, scope, rare
```

---

## 20. Emberroot Warden Boss

Role:

```txt
first boss-like card actor and team leader
```

Suggested stats:

```txt
HP: 90
Tier: boss
```

Card Actor profile:

```txt
openingHandSize: 5
drawPerTurn: 3
maxHandSize: 7
maxEnergy: 3
energyPerTurn: 3
unplayedHandPolicy: retain
controller: leaderHeuristic
teamRole: leader
canChooseTeamOrder: true
canPlanAllies: true
```

Deck:

```txt
Root Slam x2
Cinder Bark x2
Old Flame x2
Ash Bloom x1
Root Bind x1
Ancient Shelter x1
Warden Command x1
```

Cards:

```txt
Root Slam
Cost: 1
Family: Attack
Effect: Deal 12 damage.
Intent: Attack

Cinder Bark
Cost: 1
Family: Guard / Burn
Effect: Gain 10 Block. Apply Burn 1.
Intent: Guard + Debuff

Old Flame
Cost: 1
Family: Debuff / Burn
Effect: Apply Burn 2.
Intent: Debuff

Ash Bloom
Cost: 1
Family: Setup / Charge
Effect: Create a temporary next-plan modifier or improve future card value.
Intent: Setup / Special

Root Bind
Cost: 1
Family: Debuff
Effect: Apply Bound 1 if implemented; otherwise apply Burn 1 or reduce next draw by 1 in a tested way.
Intent: Debuff

Ancient Shelter
Cost: 1
Family: Guard / Cleanse
Effect: Gain 12 Block. Reduce Burn on self by 2.
Intent: Guard

Warden Command
Cost: 1
Family: Leader / Team
Effect: Improve ally attack/guard scoring or grant a simple team modifier. First PoC can implement as a leader planning directive rather than a complex effect.
Intent: Special / Team
```

AI profile:

```txt
boss_leader_burn_guard
lethal highest
leader survival very high
uses debuff + attack when pressure is good
uses guard/setup when safe
can direct allies in team encounters
```

---

## 21. First Map Encounter Composition

Early normal encounters:

```txt
Ash Slime
Cinder Mite
Ash Slime + Ash Slime
```

Mid normal encounters:

```txt
Ash Slime + Cinder Mite
Cinder Mite + Soot Crow
Root Husk
```

Late normal encounters:

```txt
Root Husk + Cinder Mite
Soot Crow + Ash Slime + Cinder Mite
```

Elite:

```txt
Charred Stag
Charred Stag + Ash Slime optional later
```

Rare holder:

```txt
Cinder Scribe
```

Boss:

```txt
Emberroot Warden
Emberroot Warden + one supporting normal enemy optional after solo boss validates
```

Do not exceed 3 enemies in Phase 1.

---

## 22. Reward Pool v0.5

First playable reward pool should be small.

Recommended scale:

```txt
Universal player commons: 5-6
Ashbound Keeper commons: 5-6
Ember Fox petBound commons: 5-6
Uncommons: 6-8
Rares: 3-5, with some gated behind rare holder / boss
Pet upgrades: 4-5
```

Playable slice minimum:

```txt
Total reward cards: 18-24
Pet upgrades: 3
Rare holder card: 1
Boss reward rare: 1 optional
```

Reward filtering rules:

```txt
starter cards should not appear in normal rewards unless explicitly allowed
legacy cards should not define future balance
encounterReward cards should appear through encounter/bearer rules unless explicitly pooled
enemy-only cards must not enter player reward pool unless a player-card version exists
petBound rewards require compatible active/unlocked pet context
```

---

## 23. First Pet Upgrade Pool

Pet upgrades should change play patterns, not only add numbers.

Recommended first upgrades:

```txt
Warm Bond
Rarity: common pet upgrade
Effect: The first pet-command each combat costs 1 less.
Purpose: makes pet identity appear earlier.

Soot-Paw Instinct
Rarity: common/uncommon pet upgrade
Effect: Once per turn, after you play your first pet-command, improve target enemy Intent visibility by 1 level.
Purpose: links Ember Fox to the information game.

Banked Ember
Rarity: uncommon pet upgrade
Effect: When Burn damages an enemy, Ember Fox gains 1 Ember Charge, max 3. At 3, next pet-command is empowered and consumes charge.
Purpose: introduces Ember Charge only when enabled.

Tailflame Guard
Rarity: uncommon
Effect: Tailguard also applies Burn 1 to the enemy with the strongest visible Attack intent.
Purpose: connects defense, Burn, and Intent visibility.

Old Shrine Memory
Rarity: special
Effect: Unlocks Ember Fox memory and adds one petBound card to future reward pool.
Purpose: progression/story, not only combat value.
```

---

## 24. Workbench Authoring Rules

Enemy authoring should start with resources and deck, not code.

For every enemy, content should define:

```txt
id
tier
hp
cardActor resource profile
deck entries with copies
AI controller/profile/teamRole
visibility defaults
intent metadata
reward bearer metadata if applicable
```

For every enemy card, content should define:

```txt
id
name
cost
family
effects
intent kind/readout metadata
aiHints
source/tier tags
```

For every player card, content should define:

```txt
id
name
family
cost
target selector
rarity
source
tags
effects
reward pool/drop source
duplicate policy
```

Content should tune in this order:

```txt
1. deck composition
2. energy/draw/hand profile
3. card values
4. AI weights/profile
5. HP
6. reward appearance rate
```

Do not solve balance by adding hardcoded monster behavior first.

---

## 25. First Slice Simulation Targets

Simulation targets for first playable content:

```txt
200-500 seeded runs
completion roughly 40%-70% until manual playtesting exists
no crash
no infinite loop
no impossible reward state
no invalid target spam
no unsupported hand/enemy count
wins and losses both possible
```

Manual playtest questions:

```txt
Does retain-all hand feel tactical rather than clogged?
Does Read the Ash feel useful without being mandatory?
Does Ember Fox feel like a co-hero from turn one?
Do enemies feel like they are playing cards, not rolling scripts?
Does Intent changing during player turn feel fair/readable?
Does leader planning make elite/boss fights more interesting without feeling like cheating?
```

---

## 26. Final Content Definition of Done

The content foundation is ready for the final PoC when:

```txt
1. Ashbound Keeper uses v0.5 actor resources.
2. Ember Fox starter commands work under shared actor runtime.
3. Starter deck works under retain-by-default rules.
4. All Ashwood Trail enemies define cardActor resources.
5. All Ashwood Trail enemies use real decks and costs.
6. Normal enemies are weak through resources/cards, not dumb AI.
7. Charred Stag demonstrates elite multi-card planning.
8. Cinder Scribe demonstrates rare-card bearer + information control.
9. Emberroot Warden demonstrates boss/leader planning.
10. Reward pool filtering prevents enemy/legacy/starter leakage.
11. Simulation and manual play can run the first map without legacy intent-only fallback.
```

---

## 27. One-Sentence Content Doctrine

```txt
Ashwood Trail must prove that the player, Ember Fox, and enemies are all part of the same retained-hand card game: the player wins by reading visibility-limited plans, spending cards wisely, and commanding the fox as a true combat partner.
```
