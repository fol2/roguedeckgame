# Combat Card Game Rules v0.4

Status: implementation contract / living design rulebook
Language: Cantonese / English technical terms
Scope: combat card-game rules, player/enemy card zones, intent visibility, enemy card holdings, reward-bearing encounter hooks, and rules that all combat content must obey.


Related docs:

- `architecture.md` — engine and Phaser boundary rules.
- `ui_ux_interaction.md` — combat presentation and input contract.
- `design.md` — visual / emotional direction.
- `combat_content_foundation.md` — first class, first pet, first map, first enemy decks, starter deck, reward pool, and content-specific card identities.

Document split:

```txt
combat_card_game_rules.md
= card-game law: zones, draw/play/discard, enemy holdings, Intent visibility, adaptive enemy fairness, reward-bearer mechanics.

combat_content_foundation.md
= first playable content contract: Ashbound Keeper, Ember Fox, Ashwood Trail, starter deck, first enemies, elite, rare holder, boss, reward pool.
```

Content may tune numbers, card names, enemy HP, and reward pools. Content must not violate this document's rules unless this document is updated first.

This document defines the game at the card-game level. Starter cards, first-map enemies, balance numbers, and reward pools live in `combat_content_foundation.md`; they may be tuned there as long as they obey this rules contract.

---

## 1. Core Law

**Combat is a two-sided card game.**

玩家同敵人都用卡。分別係：

```txt
Player cards = visible hand cards.
Enemy cards = hidden or partially visible holdings, expressed through Intent UI only when revealed.
```

敵人唔係純 scripted monster。敵人有 deck、hand、planned card、discard、exhaust。只係 UI 上唔會將敵人畫成「卡牌」。敵人仍然係 battlefield sprite / silhouette。敵人 card system 係 core rule；Intent display 係 information layer。

三個核心名詞要分清楚：

```txt
Enemy Card
= 敵人真正會打出嘅卡。

Enemy Plan
= 敵人目前準備、候選、或者 adaptive 嘅下一步行動。

Intent
= 玩家看見嘅資訊版本。可能係 full reveal、partial reveal、?、或者完全無顯示。
```

所以：

```txt
Enemy may have a planned card.
Player may not know it.
Intent visibility is a player information effect, not a universal combat rule.
```

呢條係 v0.3 嘅重要方向：**看見敵人意圖唔係免費規則，而係 class ability、buff、card effect、pet upgrade、reveal/scout/scope 等資訊能力帶嚟嘅優勢。**

---

## 2. Player Combat Zones

Player side 有以下 zones：

```txt
Run Deck
Combat Draw Pile
Hand
Play Area
Discard Pile
Exhaust Pile
Removed / Trash
Created / Temporary Cards
```

定義：

```txt
Run Deck
= run 期間永久牌組。Combat start 時用它建立 combat card instances。

Combat Draw Pile
= 今場 combat 可抽牌堆。用 CardInstanceId，不用 CardId，因為 duplicate cards 係正常。

Hand
= 玩家目前可打出嘅手牌。

Play Area
= card resolving 時短暫存在嘅位置。主要俾 event playback / animation 用。

Discard Pile
= 今場 combat 會再洗返入 draw pile 嘅牌。

Exhaust Pile
= 今場 combat 移除，不會再抽到。Combat 完結後通常返回 run deck，除非卡本身係 temporary。

Removed / Trash
= run-level 永久移除。v0.3 不建議 combat 內大量使用 trash，主要喺 camp/event/reward/removal screen 發生。

Created / Temporary Cards
= combat 內生成嘅卡。預設 combat 完結後消失，除非效果明確寫明加入 run deck。
```

v0.3 建議數值：

```txt
Starting deck size: 10
Minimum run deck size: 8
Maximum run deck size: 30
Opening hand: 5
Draw per player turn: 5
Hand cap: 10
Starting energy per turn: 3
Unspent energy: lost at end of player turn
```

`minimum run deck size = 8` 係為咗避免玩家 remove 到 deck 過細而令 balance 崩壞。
`maximum run deck size = 30` 係 Phase 1 設計上限，不是永久世界觀規則。將來如果有大 deck archetype，可以由 class/relic/buff 改寫。

---

## 3. Player Turn Rules

Combat start：

```txt
1. Build player combat card instances from run deck.
2. Shuffle player draw pile with seeded RNG.
3. Build enemy card instances for each enemy.
4. Shuffle each enemy draw pile with seeded RNG.
5. Each enemy creates its first plan.
6. Intent visibility is calculated.
7. Player draws opening hand.
8. Player turn begins.
```

Start of player turn：

```txt
1. Start-of-turn statuses resolve.
2. Energy refills to max energy.
3. Draw until draw count is satisfied or hand cap is reached.
4. If draw pile is empty and cards still need to be drawn, shuffle discard into draw pile.
5. Enemy plans/intents are refreshed if timing says so.
6. Input unlocks.
```

Playing a card：

```txt
1. Player selects card.
2. Core validates card is in hand, playable, affordable, and has valid target.
3. Energy is spent if required.
4. Card effects resolve in emitted event order.
5. Card moves to discard/exhaust/other zone according to its rules.
6. Combat outcome is checked.
```

End of player turn：

```txt
1. End-turn action is submitted.
2. Input locks immediately.
3. Non-retained hand cards move to discard.
4. End-of-turn statuses resolve if applicable.
5. Enemy turn begins.
```

Draw reshuffle rule：

```txt
When drawing and draw pile is empty:
  if discard pile has cards:
    shuffle discard into draw pile
    continue drawing
  else:
    stop drawing
```

Retain rule：

```txt
Retained cards stay in hand during end turn.
Retained cards count against hand cap next turn.
```

Exhaust rule：

```txt
Exhaust removes the card from this combat only.
Combat-created cards that exhaust do not return after combat unless explicitly stated.
```

Trash / Remove rule：

```txt
Trash means permanent run-deck removal.
v0.3 prefers trash/removal outside combat.
If combat effects later trash cards, they must be rare, explicit, and heavily tested.
```

---

## 4. Enemy Card System

Each enemy has its own card holdings.

```ts
type EnemyCardHoldingState = {
  enemyCombatantId: CombatantId;
  drawPile: EnemyCardInstanceId[];
  hand: EnemyCardInstanceId[];
  planned: EnemyPlanState[];
  discardPile: EnemyCardInstanceId[];
  exhaustPile: EnemyCardInstanceId[];
  handSize: number;
  planSlots: number;
};
```

Enemy cards are real combat content, but not rendered as battlefield cards. They are translated into intent/unknown/scoped UI.

Normal enemies：

```txt
Enemy deck size: 3–6 cards
Enemy hand size: 1
Plan slots: 1
Adaptive behavior: minimal or none
Visibility: depends on player reveal effects
```

Elites：

```txt
Enemy deck size: 5–8 cards
Enemy hand size: 2
Plan slots: 1
Adaptive behavior: allowed
Visibility: often partial or unknown unless scoped
```

Bosses：

```txt
Enemy deck size: 8–12+ cards
Enemy hand size: 3
Plan slots: 1, sometimes 2 for special phases
Adaptive behavior: expected
Visibility: can be hidden, partial, false-stable, or scoped depending on player abilities
```

Enemy card flow：

```txt
1. Enemy draws up to hand size.
2. Enemy creates plan from hand.
3. Player may or may not see intent.
4. Enemy resolves planned card during enemy turn.
5. Resolved enemy card moves to discard/exhaust.
6. Enemy refills hand and creates next plan.
7. Enemy discard reshuffles when draw pile is empty.
```

Enemy does not need visible energy in v0.3. Their limitation should come from deck composition, cooldown tags, exhaust cards, phase rules, and adaptive constraints.

---
Enemy Card Holding Engine v0.3 implementation contract:

```txt
CombatState owns monsterCardStates for every enemy that uses card-game metadata.
Each monsterCardState owns drawPile, hand, planned, discardPile, exhaustPile, handSize, and planSlots.
Enemy card instances move between zones through typed events.
Enemy plan creation must happen before player input unlocks.
Enemy card finalization must happen before MonsterAbilityPlayed resolves.
Resolved enemy cards move from planned to discard or exhaust.
Enemy discard reshuffles into draw pile only when the enemy needs to draw and its draw pile is empty.
Legacy intentPool-only enemies may still use the compatibility path, but new content should use cardGame metadata.
```

Required enemy-card lifecycle events:

```txt
EnemyDeckShuffled
EnemyCardMoved
EnemyPlanCreated
EnemyPlanChanged
EnemyPlanFinalized
EnemyCardResolved
```

Event meaning:

```txt
EnemyDeckShuffled
= enemy draw pile order changed through seeded RNG.

EnemyCardMoved
= enemy card instance moved between draw, hand, planned, discard, or exhaust.

EnemyPlanCreated
= enemy chose a locked plan or candidate set from current holdings.

EnemyPlanChanged
= adaptive enemy changed preferred card within a legal candidate set.

EnemyPlanFinalized
= planned card became the card that will resolve now.

EnemyCardResolved
= enemy card finished resolving and is ready to move to its destination zone.
```

Fairness rule for v0.3 implementation:

```txt
Adaptive enemies may only choose from cards that are already in hand / candidate set / explicit phase insertions.
They must not create a perfect answer from nowhere.
If visible plan information changes, core must emit an event so UI/debug tools can explain the change.
```

---

## 5. Intent Visibility System

**Intent display is not automatic.**

Every enemy can have a next card, but player-facing info depends on visibility level.

```ts
type IntentVisibilityLevel =
  | "none"
  | "unknown"
  | "category"
  | "rough"
  | "exact"
  | "scoped";
```

Meaning：

```txt
none
= UI shows no useful intent. Enemy may have no icon or only idle marker.

unknown
= UI shows ?.

category
= UI shows broad type: attack, defend, buff, debuff, special, charge.

rough
= UI shows category + rough strength, e.g. Attack / Heavy, Debuff / Minor.

exact
= UI shows exact card name, amount, target hint, and tooltip.

scoped
= special advanced view. For elite/boss, may show candidate cards, condition branches, or current likely card.
```

Recommended visual mapping：

```txt
none      -> no icon or dim unreadable haze
unknown   -> ?
category  -> attack/defend/debuff/etc. icon
rough     -> icon + Low/Med/High or icon intensity
exact     -> icon + amount + full tooltip
scoped    -> icon + scope mark + candidate/conditional tooltip
```

Important: `?` should not feel like missing data. It is a valid designed state.

---

## 6. Reveal, Scout, and Scope

Intent visibility should come from player-side effects.

v0.3 reserves these effect families：

```txt
Reveal
= improve visibility of enemy intent.

Scout
= look at hidden enemy card holdings, usually weaker than full reveal.

Scope
= advanced reveal for elite/boss adaptive plans.

Obscure
= enemy effect that hides or degrades intent visibility.

Lock
= force or freeze an enemy plan, usually non-boss only or heavily restricted.
```

Example effect definitions：

```ts
type RevealIntentEffect = {
  type: "revealIntent";
  target: "targetEnemy" | "allEnemies";
  level: IntentVisibilityLevel;
  duration: "currentPlan" | "untilEndOfTurn" | "nextEnemyTurn" | "combat";
};

type ScopeIntentEffect = {
  type: "scopeIntent";
  target: "targetEnemy" | "allEnemies";
  depth: "category" | "candidateSet" | "conditionHint" | "exactIfLocked";
  duration: "currentPlan" | "nextEnemyTurn";
};
```

Reveal should not always persist.

```txt
Even if the player reveals an intent this turn,
next round may return to ? unless the reveal source is a persistent buff/class passive.
```

Example effects：

```txt
One-shot card:
  Reveal target enemy's current intent.

Buff:
  At start of each player turn, reveal normal enemy intent categories.

Class passive:
  Normal enemies show category by default.

Advanced skill:
  Scope one elite/boss intent candidate set this turn.
```

---

## 7. Adaptive Elite and Boss Rules

Elite and boss enemies can adapt.

But adaptivity must not become unfair cheating. The enemy still uses cards.

Define enemy plan modes：

```ts
type EnemyPlanMode =
  | "locked"
  | "adaptive"
  | "charging"
  | "scriptedPhase";
```

Meaning：

```txt
locked
= enemy has chosen a specific card. If revealed exactly, it should not change unless a game effect changes it.

adaptive
= enemy has a candidate set and will choose at resolution or after player action based on state.

charging
= enemy is preparing a later card. Player may see charge marker, ?, or scoped detail.

scriptedPhase
= boss phase rule inserts or prioritizes certain cards, but still emits card-like events.
```

Normal enemy should usually use `locked`.

Elite can use `adaptive`.

Boss should frequently use `adaptive`, `charging`, or `scriptedPhase`.

A boss with adaptive plan might look like this internally：

```ts
type EnemyPlanState = {
  mode: "adaptive";
  candidateCardInstanceIds: EnemyCardInstanceId[];
  currentPreferredCardInstanceId?: EnemyCardInstanceId;
  adaptiveRuleId: EnemyAdaptiveRuleId;
  visibility: IntentVisibilityState;
};
```

Player-facing examples：

```txt
No reveal:
  ?

Reveal category:
  Special ?

Scope:
  Candidate set: Heavy Attack OR Guarded Buff.
  Tooltip: This enemy may change action depending on your Block.
```

Hard rule：

```txt
If an enemy changes a visible plan, emit EnemyPlanChanged.
If the player had exact reveal and the enemy is allowed to change anyway, UI must communicate that the plan was unstable/adaptive.
```

This avoids the feeling of betrayal. For bosses, `exact` may not always mean “guaranteed locked”; it can mean “exact current preferred action.” A stronger `lock` or `true read` effect can be introduced later, but not in starter content.

---

## 8. Fairness Rules for Hidden Intent

Because intent is not always shown, we need fairness rules.

Hidden intent is allowed, but hidden nonsense is not.

v0.3 fairness contract：

```txt
1. Unknown intent must still obey enemy deck, cooldown, phase, and tier limits.
2. Normal enemies should not have huge surprise swings without previous teaching.
3. Elite/boss adaptive enemies should have readable traits, phase tells, or repeated patterns.
4. If an action is extremely dangerous, it should be telegraphed somehow: charge, animation, status, boss phase, or scopeable hint.
5. Player must have access to reveal/scout/scope tools through class, cards, pet upgrades, or buffs.
6. Hidden intent should create uncertainty, not random punishment.
```

So `?` is not a license to do anything. It means the player lacks information, not that the enemy ignores rules.

---

## 9. Card Definitions and Rarity

All player cards need rarity.

```ts
type CardRarity =
  | "starter"
  | "common"
  | "uncommon"
  | "rare"
  | "special"
  | "unique"
  | "petBound";
```

Meaning：

```txt
starter
= starts in deck, normally not in reward pool.

common
= basic reward pool, frequent.

uncommon
= build-shaping, less frequent.

rare
= powerful, specialized, or archetype-defining.

special
= event/encounter/map/story source only.

unique
= one-off card, boss reward, story reward, or cannot duplicate.

petBound
= tied to a specific pet, pet evolution, pet memory, or pet encounter.
```

Card definition should include：

```ts
type PlayerCardDefinition = {
  id: CardId;
  name: string;
  family: "attack" | "skill" | "power" | "petCommand" | "petSupport" | "other";
  rarity: CardRarity;
  cost: number;
  targetType: CardTargetType;
  tags: string[];
  effects: EffectDefinition[];
  rewardPools?: RewardPoolId[];
  dropSources?: RewardDropSource[];
};
```

Pet-command is a card family, not a rarity. So we can have：

```txt
common pet-command
uncommon pet-command
rare pet-command
petBound pet-command
```

Enemy cards can have their own rarity/tier, but do not need to map one-to-one to player rarity.

```ts
type EnemyCardTier =
  | "basic"
  | "advanced"
  | "elite"
  | "boss"
  | "rareBearer"
  | "special";
```

Enemy card tier is about threat and encounter design, not direct player reward rarity.

---

## 10. Enemy Card Families

Enemy cards should have clear families.

```txt
Attack
= damages Keeper/player by default.

Guard
= gains block, shield, or protection.

Buff
= improves self/ally.

Debuff
= applies negative status to player.

Burn / Status
= applies Burn or other status.

Special
= unique behavior, usually elite/boss.

Charge
= prepares stronger future action.

Summon
= creates or calls ally; Phase 1 probably deferred.

Escape / Steal
= future special encounter behavior.
```

Enemy cards should be authored as data using shared effect language where possible.

Good：

```txt
Enemy card: Slime Tackle
family: attack
effects: damage player 6
```

Bad：

```ts
if enemy.name === "Slime" then hardcode attack
```

---

## 11. Player Card Families

Player card families v0.3：

```txt
Attack
= Keeper acts directly against enemy.

Skill
= block, draw, setup, utility.

Power
= longer-term combat modifier.

Pet-Command
= card commands active pet. Uses orange command line.

Pet Support
= targets or modifies pet but may not be a direct command.

Technique / Other
= future class-specific category if needed.
```

Hard language rule：

```txt
Only true pet-command cards should use the command visual grammar.
Orange command line means card -> pet command relationship.
```

This keeps card communication clean and consistent.

---

## 12. Rare Card Holder Encounters

Some combat encounters can be **card bearer encounters**.

Meaning：

```txt
A rare or special card is represented by an enemy, relic-being, corrupted keeper, shrine guardian, wild pet, or card-carrying creature.
Winning the encounter may offer that card as a reward.
```

This is not just random reward generation. It makes rare cards feel discovered, hunted, rescued, stolen back, or earned.

Definition shape：

```ts
type RewardBearerEncounter = {
  kind: "cardBearer" | "petBearer" | "upgradeBearer";
  bearerId: string;
  heldReward: HeldRewardDefinition;
  revealState: "knownBeforeCombat" | "rumored" | "hiddenUntilWin";
  dropRule: RewardDropRule;
};

type HeldRewardDefinition =
  | { type: "playerCard"; cardId: CardId; rarity: CardRarity }
  | { type: "petDefinition"; petDefinitionId: PetDefinitionId }
  | { type: "petCommandCard"; cardId: CardId; petDefinitionId: PetDefinitionId }
  | { type: "petUpgrade"; upgradeId: PetUpgradeId };

type RewardDropRule = {
  chancePercent: number;
  pityKey?: string;
  guaranteedFirstTime?: boolean;
  fallbackRewardPoolId?: RewardPoolId;
};
```

v0.3 reward-bearing principles：

```txt
1. Reward chance must use seeded RNG.
2. Reward result should be reproducible from combat seed/run seed.
3. The card bearer may use a thematic enemy card in combat, but does not need to literally use the player card.
4. Rare holder encounters should be memorable and scarce.
5. If drop is not guaranteed, fallback reward must still be meaningful.
6. Unique/pet unlocks should usually be guaranteed or story-gated, not low-chance frustration.
```

Example：

```txt
Encounter: Cinder Scribe
Held reward: Rare card "Ash Rewrite"
Reveal state: rumored before combat
Drop rule: 45% chance, guaranteed first time if this is tutorial rare-holder
Combat behavior: enemy uses enemy-card versions of draw/discard/debuff actions
```

Another example：

```txt
Encounter: Wild Ember Kit
Held reward: future pet "Ember Kit"
Reveal state: known before combat
Drop rule: guaranteed if rescued / won with condition
Combat behavior: not necessarily killed; maybe calm, protect, or survive trial
```

---

## 13. Pet Encounter Rules

Future pets can appear through encounter content.

Not every pet should be bought or randomly selected. Some pets can be discovered.

Pet encounter types：

```txt
Wild Pet Trial
= fight, survive, or prove bond to unlock a pet.

Rescue Encounter
= defeat enemies threatening a pet.

Corrupted Pet Encounter
= cleanse or defeat corruption to unlock pet later.

Pet Memory Encounter
= does not unlock pet, but unlocks pet command card, side story, or evolution branch.

Pet Rival Encounter
= future advanced content; pet tests current companion or class.
```

Important distinction：

```txt
Unlocking a pet is not the same as adding a card.
```

A pet encounter reward can be：

```txt
new PetInstance
new PetDefinition unlocked for future runs
petBound card added to reward pool
pet memory
pet upgrade
evolution branch
side-story flag
```

Pet encounters should mostly unlock future options, memories, command sets, or persistent pet access — not just temporary combat summons.

---

## 14. Reward Flow After Combat

At combat end：

```txt
1. CombatEnded event resolves.
2. If won, reward generation starts.
3. Reward generator checks:
   - normal reward pool
   - encounter-specific reward bearer
   - pet upgrade eligibility
   - pet encounter rewards
   - story/memory flags
4. RewardOfferState is created.
5. Player may claim one or more options depending on node rules.
6. Claimed reward updates run state / pet instance / card deck.
7. Skipped reward clears pending reward and advances map state.
```

Reward option types v0.3：

```txt
card
petUpgrade
petUnlock
petCommandUnlock
petMemory
gold/resource later
removeCard later
```

Phase 1 can implement only `card` and `petUpgrade`, but the rules should leave space for future pet reward options.

---

## 15. Enemy Card Visibility and Reward Bearers

A card-bearing enemy does not need to show the held reward immediately.

Reveal modes：

```txt
knownBeforeCombat
= map node or encounter preview tells player this enemy holds a rare card/pet.

rumored
= UI hints that this is a special bearer, but exact reward hidden.

hiddenUntilWin
= player only discovers special reward after winning.
```

This gives different emotional rhythms：

```txt
Known rare holder:
  "I want that card. I choose this risky fight."

Rumored holder:
  "This enemy has something unusual."

Hidden reward:
  "Surprise discovery."
```

For pet encounters, recommended default is mostly `knownBeforeCombat` or `rumored`, not fully hidden, because new pets are major emotional content.

---

## 16. Combat Information as Class Identity

Since intent visibility is not automatic, classes can have different relationships to information.

Example class identities：

```txt
Ashbound Keeper
= balanced class. May start with a passive/buff that reveals normal enemy intent category, but not exact amounts.

Scout-like class later
= stronger reveal/scope tools, weaker raw damage.

Beast-command class later
= reads enemy through pet reactions; pet may reveal category when commanded.

Risk class later
= little or no intent visibility, but stronger payoffs for blind play.

Control class later
= can scope, delay, or lock enemy plans.
```

For Phase 1, recommended：

```txt
Ashbound Keeper starts with Field Sense:
  Normal enemies show category intent.
  Elites and bosses show ? unless revealed/scoped.
```

This makes intent visibility a class passive/buff, not a universal combat law. It also keeps early combat readable enough for new players.

Alternative options：

```txt
Option A — recommended:
  Field Sense reveals normal enemy category intent.
  Elite/boss remain unknown unless revealed/scoped.

Option B — more mysterious:
  No passive reveal.
  All enemies show ? unless player uses reveal.
  Risk: early game may feel too blind.

Option C — tutorial-only reveal:
  First tutorial fights reveal normal intents.
  After tutorial, reveal becomes class/card/buff mechanic.
  Risk: player may feel rule changed.
```

---

## 17. Enemy Intent UI States

Each enemy slot should support：

```ts
type IntentViewState =
  | { state: "none" }
  | { state: "unknown"; iconKey: "intent_unknown" }
  | { state: "category"; kind: IntentKind }
  | { state: "rough"; kind: IntentKind; strength: "low" | "medium" | "high" }
  | { state: "exact"; cardName: string; kind: IntentKind; amountLabel?: string; targetHint?: IntentTargetHint }
  | { state: "scoped"; scopedLines: string[]; candidateKinds?: IntentKind[] };
```

UI examples：

```txt
?
Attack
Attack / Heavy
Attack 7
Scoped: Attack OR Buff
```

Tooltip examples：

```txt
Unknown
This enemy's next action is hidden.

Attack
This enemy is preparing an attack. Exact damage unknown.

Attack 7
This enemy will attack the Keeper for 7 damage.

Scoped
This elite may Attack if you have low Block, or Buff if you defend heavily.
```

Phaser should not calculate intent amount itself. It renders whatever view model supplies. Sometimes the view model intentionally supplies unknown or partial information.

---

## 18. Enemy Plan Timing

If player is meant to respond to enemy cards, enemy plan must exist before player acts. But if enemy is adaptive, the plan may not be fully locked.

v0.2 timing：

```txt
At start of player turn:
  Each living enemy has either:
    locked plan,
    adaptive candidate set,
    charging plan,
    or scripted phase plan.

During player turn:
  Player actions may change enemy state.
  Adaptive enemies may update current preferred card.
  If visible/scoped info changes, emit visibility/change events.

At enemy turn:
  Each enemy finalizes one card from its plan state.
  Enemy resolves that card.
  Enemy card moves to discard/exhaust.
  Enemy prepares next plan for next player turn.
```

Enemy resolution order：

```txt
Normal rule: left-to-right by battlefield slot.
Boss-specific rule can override later, but must be explicit.
```

---

## 19. Phase 1 Content Boundaries

For Phase 1, keep it small.

Combat rules can support all above, but actual content should be limited.

Recommended Phase 1 content：

```txt
Player:
  1 class: Ashbound Keeper
  1 starting passive: Field Sense

Pet:
  1 active pet: Ember Fox
  future multi-pet-ready state, but maxActivePets = 1

Enemy:
  2 normal enemies
  1 elite / mini-boss
  1 boss-like encounter later

Intent visibility:
  normal enemies: category shown by Field Sense
  elite: ? unless revealed
  boss: ? / phase / charge unless scoped

Rewards:
  card rewards
  pet upgrade rewards
  one rare card bearer encounter later
```

Do not put every advanced mechanic into first vertical slice.

---

## 20. First Enemy Design Implication

First enemies should teach enemy-card rules.

Example simple normal enemy：

```txt
Ash Slime

Deck:
  Tackle x2
  Harden x1

With Field Sense:
  player sees Attack or Guard, not exact value unless upgraded.
```

Example second normal enemy：

```txt
Cinder Mite

Deck:
  Bite x2
  Cinder Dust x1
  Skitter x1

With Field Sense:
  player sees Attack / Debuff / Guard category.
```

Example elite：

```txt
Charred Stag

Deck:
  Antler Strike x2
  Guarded Snort x1
  Ember Hooves x1
  Paw the Ash x1

Default:
  player sees ? or Special ?

With Reveal:
  player sees category.

With Scope:
  player sees candidate set or conditional hint.
```

This makes the first elite immediately different without adding tons of new UI.

---

## 21. Design Rules for Adaptive Enemies

Adaptive enemies should adapt within constraints.

Allowed：

```txt
Choose between cards in hand.
Prefer attack if player has low block.
Prefer buff if player already over-blocked.
Use special if phase threshold reached.
React to Burn or pet-command tags if designed.
```

Not allowed：

```txt
Create arbitrary perfect counter every turn.
Ignore deck/hand/cooldown.
Change a locked exact-revealed card without showing plan instability.
Punish player for using reveal by becoming unreadable with no explanation.
```

Bosses can be smarter, but still card-based.

---

## 22. Starter Pack Design Consequence

We should not finalize starter pack before enemy rules are accepted.

Starter deck should be designed as an answer-set to first enemy decks and first information rules.

Starter pack must answer：

```txt
Enemy Attack card
= block, guard, race, or kill.

Enemy Guard card
= burn, setup, scaling, or delayed damage.

Enemy Debuff/status card
= race, block, reveal, or cleanse later.

Unknown intent
= reveal, safe block, flexible pet-command, or risk/reward attack.

Elite/Boss adaptive intent
= scope, prepare, or build resilient turn.
```

So starter pack is no longer：

```txt
some damage cards
some block cards
some pet cards
```

It becomes：

```txt
a beginner information-and-response kit.
```

This is the higher-level correction.

---

## 23. Effects Needed for v0.2 Engine Expansion

Not all need to be implemented immediately, but the model should reserve space.

Core combat effect/event needs：

```txt
revealIntent
scopeIntent
obscureIntent
enemyPlanChanged event
enemyCardResolved event
rewardBearerResolved
```

Suggested events：

```txt
EnemyCardDrawnHidden
EnemyPlanCreated
EnemyIntentVisibilityChanged
EnemyPlanChanged
EnemyCardRevealed
EnemyCardResolved
EnemyCardMoved
RewardBearerRevealed
RewardRollResolved
```

For UI, important view-model states：

```txt
IntentUnknownShown
IntentCategoryShown
IntentScoped
IntentHidden
```

Maybe these are not separate gameplay events; they can be view-model state. But for debugging and event playback, `EnemyIntentVisibilityChanged` is useful.

---

## 24. Data Model Draft

Player card：

```ts
type PlayerCardDefinition = {
  id: CardId;
  name: string;
  family: PlayerCardFamily;
  rarity: CardRarity;
  cost: number;
  targetType: CardTargetType;
  tags: string[];
  effects: EffectDefinition[];
  rewardPools?: RewardPoolId[];
  dropSources?: RewardDropSource[];
  petBinding?: {
    petDefinitionId?: PetDefinitionId;
    requiredPetTags?: string[];
  };
};
```

Enemy card：

```ts
type EnemyCardDefinition = {
  id: EnemyCardId;
  name: string;
  family: EnemyCardFamily;
  tier: EnemyCardTier;
  tags: string[];
  effects: EffectDefinition[];
  telegraph: {
    defaultVisibility: IntentVisibilityLevel;
    kind: IntentKind;
    amountLabelMode?: "hidden" | "rough" | "exact";
    targetHint?: IntentTargetHint;
  };
  ai?: {
    priority?: number;
    cooldownTags?: string[];
    adaptiveRuleIds?: EnemyAdaptiveRuleId[];
  };
};
```

Enemy plan：

```ts
type EnemyPlanState = {
  enemyCombatantId: CombatantId;
  mode: EnemyPlanMode;
  lockedCardInstanceId?: EnemyCardInstanceId;
  candidateCardInstanceIds?: EnemyCardInstanceId[];
  currentPreferredCardInstanceId?: EnemyCardInstanceId;
  visibility: IntentVisibilityState;
  canChangeAfterReveal: boolean;
};
```

Intent visibility：

```ts
type IntentVisibilityState = {
  level: IntentVisibilityLevel;
  source?: "none" | "classPassive" | "buff" | "card" | "petUpgrade" | "enemyObscure";
  expires: "currentPlan" | "endOfPlayerTurn" | "afterEnemyAction" | "combat" | "never";
  scopedCandidateIds?: EnemyCardInstanceId[];
};
```

Reward bearer：

```ts
type EncounterRewardBearer = {
  bearerKind: "cardBearer" | "petBearer" | "upgradeBearer";
  heldReward: HeldRewardDefinition;
  revealState: "knownBeforeCombat" | "rumored" | "hiddenUntilWin";
  dropRule: RewardDropRule;
};
```

---

## 25. Non-Negotiables v0.2

```txt
Combat is a two-sided card game.

Enemies use cards internally.

Enemy cards are not rendered as battlefield cards.

Intent is player-facing information, not always guaranteed truth.

Intent visibility can be none, unknown, partial, exact, or scoped.

Reveal/scope should be class/card/buff/pet-upgrade mechanics.

Elite and boss enemies may be adaptive, but must remain card-based.

Player and enemy randomness must use seeded RNG.

Player cards and enemy cards can share effect language but should not share the same reward registry type.

Pet-command visual grammar stays strict:
  orange line = card to pet command relationship.

Reward-bearing encounters can hold cards, pet upgrades, or future pets.

Pet unlock encounters should support future pet system without hardcoding one pet forever.

Starter pack must be designed after enemy card problems are defined.
```

---

## 26. Open Questions for v0.2 Discussion

These are the next decisions we need to make.

### 26.1 Should Ashbound Keeper start with Field Sense?

Recommendation: yes.

```txt
Field Sense:
  Normal enemies show category intent.
  Elites and bosses remain unknown unless revealed/scoped.
```

### 26.2 Should the first reveal card exist in starter deck, or appear as early reward?

Recommendation: early reward first. If starter has reveal immediately, player may think reveal is mandatory every fight. Let Field Sense carry tutorial readability.

### 26.3 Should rare card holder drops be chance-based or guaranteed first-time?

Recommendation：

```txt
Common/uncommon bearer: can be chance-based.
Rare/special first-time bearer: guaranteed first-time, then chance-based repeats.
Pet unlock: usually guaranteed by objective, not random chance.
```

### 26.4 Should elite/boss exact scope ever lock their action?

Recommendation: not yet. v0.3 `Scope` should reveal candidate set or current preferred action. True locking can be a later rare control archetype.

### 26.5 Do we allow no-intent combat at all?

Recommendation: yes for special encounters, but not for all normal fights. If every fight is blind, the deckbuilder becomes too reactive-luck-based.

### 26.6 How much adaptivity can an elite use before it feels unfair?

Needs playtesting. Initial rule should be: elite can adapt between cards already in hand, but cannot create perfect counters.

### 26.7 Should reward-bearing enemies show their held reward before combat?

Recommendation: depends by encounter type.

```txt
Card bearer: known / rumored / hidden all acceptable.
Pet bearer: mostly known or rumored.
Unique story reward: usually known or strongly hinted.
```

---

## 27. Current Strong Direction

Lock v0.3 around this identity：

```txt
The player is not just playing cards.
The player is reading an enemy card game through imperfect information.

Normal enemies are readable through basic class sense.
Elites and bosses are partially hidden and adaptive.
Reveal/scope is a real build axis.
Pet commands are the player’s second body on the field.
Rare cards and future pets can exist as encounter-held rewards.
```

This gives the game a stronger hook than “Slay the Spire with pets.”

It becomes：

**a companion deckbuilder about reading hidden enemy cards, commanding pets, and choosing when to spend resources on information versus action.**

---

## 28. Next Discussion Agenda

Recommended next discussion order：

```txt
1. Accept or modify Field Sense as first class passive.
2. Define first two normal enemy decks.
3. Define first elite enemy deck and adaptive rules.
4. Decide exact intent visibility rules for normal / elite / boss.
5. Then redesign starter pack as an answer-set.
6. Then define first reward pool and first rare card bearer encounter.
```

The starter pack should be designed only after steps 1–4 are clear.

---

## v0.4 Implementation Update — Reveal / Scope / Obscure Runtime Contract

v0.4 hardens the information layer that sits on top of enemy card holdings.

The accepted rule is now:

```txt
Enemy plans can exist without being fully known.
Player information effects can reveal, scope, or lose visibility into those plans.
```

### v0.4 Effect Families

The combat engine now treats these as first-class data-driven effects:

```txt
improveIntentVisibility
= Raise the known detail level by N steps, usually capped by the card.

revealIntent
= Reveal at least a specific visibility level for the current target.

scopeIntent
= Show scoped information about an enemy plan, such as candidate cards.

obscureIntent
= Lower or cap visibility, usually from enemy ash/smoke/confusion actions.
```

These effects must remain data-driven. Do not implement card-name-specific reveal logic.

### Override Modes

Intent visibility overrides now have a mode:

```txt
floor
= show at least this much information.

ceiling
= show at most this much information.

set
= force exactly this display level until expiry.
```

Older overrides without a mode are treated as `floor`.

### Scope Contract

`scopeIntent` is not the same as full reveal.

```txt
category
= broad type only.

candidateSet
= possible enemy card candidates are visible.

conditionHint
= future advanced mode for explaining adaptive choice conditions.

exactIfLocked
= exact only if the plan is locked; adaptive plans stay candidate-based.
```

A scoped adaptive enemy may still change final action inside its legal candidate set. This is fair because the player has learned the possibility space, not a guaranteed final card.

### Obscure Contract

`obscureIntent` is a legitimate enemy action. It should not erase the game into random nonsense.

Rules:

```txt
Obscure lowers information, not enemy accountability.
Obscured enemies still obey deck, hand, plan, discard, cooldown, and phase rules.
Obscure should be shown as ?, weaker category detail, or a scoped/unknown tooltip depending on view-model state.
```

### Enemy Plan Finalization

v0.4 adds explicit adaptive plan finalization.

When an enemy is adaptive, it may choose among planned candidate cards at resolution time. The selected card must come from the enemy's own candidate set. If the final selected card differs from the currently preferred plan, the engine emits:

```txt
EnemyPlanChanged
```

This event is schema v5. Older schema consumers should not receive it.

### Fairness Rule

The player may not always know the enemy's next card, but the enemy may not invent a perfect counter out of nowhere.

```txt
Unknown means hidden information.
It does not mean cheating.
```

### Presentation Contract

Phaser must not calculate reveal, scope, or obscure outcomes. It consumes view-model data:

```txt
none
unknown
category
rough
exact
scoped
```

Scoped view-models may include candidate names and candidate count, but should not expose exact amounts or effect text unless the visibility level is exact.
