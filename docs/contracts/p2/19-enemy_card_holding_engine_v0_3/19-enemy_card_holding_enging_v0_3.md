做完。呢次我先核對咗 GitHub 同你最新 ZIP：GitHub `main` 同 ZIP commit `3b2b837452f113f869cb87205589335b960a7450` 係 identical，`ahead_by: 0 / behind_by: 0`，所以我用你上傳嘅 ZIP 做基準改，無直接推 remote。

下載：

[Download v0.3 combined patch](sandbox:/mnt/data/enemy_card_holding_engine_v0_3.patch)
[Download Combat Card Game Rules v0.3](sandbox:/mnt/data/combat_card_game_rules_v0_3.md)
[Download Combat Content Foundation v0.3](sandbox:/mnt/data/combat_content_foundation_v0_3.md)

呢個 patch 已經用乾淨解壓嘅 ZIP 做過：

```txt
git apply --check /mnt/data/enemy_card_holding_engine_v0_3.patch
```

結果係 pass，可以 clean apply。

今次 v0.3 我做嘅核心係：**Enemy Card Holding Engine**。

即係敵人而家唔再只係「有 intentPool 然後抽一個 ability」咁簡單。佢開始真正有自己嘅 card-like holdings：

```txt
enemy draw pile
enemy hand
enemy planned cards
enemy discard pile
enemy exhaust pile
handSize
planSlots
planMode
candidate cards for adaptive enemies
```

呢個方向係跟返我哋前面定落嘅大規則：combat 係 two-sided card game；敵人有 cards / hand / plan / discard，但 UI 上仍然係 enemy sprite + Intent information layer，而唔係將敵人畫成 battlefield cards。呢點同現有 architecture、UI contract、combat rules、content foundation 都一致：game-core 要 deterministic/event-driven，Phaser 唔持有 gameplay rules；enemy presentation 仍然係 sprites/intents；Intent visibility 係 information mechanic；first content 係 Ashbound Keeper + Ember Fox + Ashwood Trail。   

具體落地內容：

```txt
1. Combat model 加入 EnemyPlanMode
   locked / adaptive / charging / scriptedPhase

2. PlannedMonsterAbility 開始可連到 enemy card instance
   cardInstanceId
   planMode

3. Monster card state 正式有 holdings
   drawPile / hand / planned / discardPile / exhaustPile

4. createCombat 會建立敵人卡牌狀態
   由 monster.cardGame.deck 建立 instance
   seeded shuffle
   draw up to handSize
   create plan from hand

5. enemy turn 會 finalize plan
   adaptive enemies 可以喺 candidate set 入面決定真正行動
   resolved card 會進 discard/exhaust

6. 新增 enemy-card lifecycle events
   EnemyDeckShuffled
   EnemyCardMoved
   EnemyPlanCreated
   EnemyPlanChanged
   EnemyPlanFinalized
   EnemyCardResolved

7. GameEvent schema 升到 v5
   兼容舊 projection / trace replay

8. validation 加強
   monster.cardGame metadata 會驗證 deck references、copies、handSize、planSlots、planMode、visibility、adaptiveRuleIds 等

9. combat view-model 加入 enemyCardHoldings debug/presentation data
   UI 可以見到 draw/hand/planned/discard/exhaust count
   但這不代表敵人卡要直接顯示在 battlefield

10. docs 升到 v0.3
   combat_card_game_rules.md 加 Enemy Card Holding Engine contract
   combat_content_foundation.md 加 first-map cardGame runtime contract
```

我亦保留咗 legacy fallback。即係如果某隻舊 monster 未有 `cardGame` metadata，仍然可以行原本 intent flow。呢個好重要，因為唔應該為咗 0.3 一刀切整爛舊 fixtures / traces / tests。

Adaptive enemy 方面，今次唔係做「敵人作弊式 counter」。佢只可以根據自己 hand / candidate set / adaptive rule 決定。已加入幾個初步 rule hook，例如：

```txt
prefer_attack_if_player_low_block
prefer_guard_if_player_overblocks
prefer_charge_when_safe
prefer_shelter_when_burning
phase_after_half_hp
```

呢啲係 engine 層能力，唔係話每個敵人都要用。Normal enemies 仍然應該主要係 `locked`；elite / boss 先應該開始 adaptive。呢點係 0.2 / 0.3 規則嘅核心公平線。

Validation 結果：

```txt
git apply --check
PASS

npm run typecheck
PASS

npm run build
PASS

npm run build:cli
PASS

npm run sim:smoke -- --max-steps 500
PASS
Runs: 3
Failures: 0
Event schema: 5
Trace schema: 5
Content version: ashwood-trail-content-foundation-v3
Registry fingerprint: fnv1a32:9ec4d8b3
```

測試方面我逐個 test file / 分批跑晒，全部 pass。總數大約係：

```txt
839 tests passed
```

有一個要老實講清楚：在呢個 sandbox 入面，單次 `npm test` 跑全 suite 時，畫面上所有可見 tests 都已經跑完並顯示 pass，但 Vitest runner 沒有喺 timeout 前乾淨退出。所以我唔會聲稱「單次 npm test command cleanly exited」。我改用分批方式跑完所有 test files，確認每個 test file 本身都 pass。呢個比較可信。

Patch 大約 1.5MB，主要因為包括：

```txt
event schema v5
enemy holding engine
validation expansion
combat view-model updates
trace update
test updates
docs v0.3
```

今次我刻意無做一件事：**無將敵人卡牌直接畫到 UI 上。**
原因係呢個同我哋嘅 UI contract 會衝突。敵人用卡係 core rule；玩家睇到嘅係 Intent、?、category、scope/candidate info。敵人仍然係 sprite，不係卡牌。呢點要守住，否則 UI 會好快變亂，亦會削弱玩家手牌嘅視覺地位。

我建議下一個 v0.4 做其中一條線：

```txt
Option A: Reveal / Scope System v0.4
真正做 revealIntent、scopeIntent、obscureIntent，令 Read the Ash / Ash Rewrite / Soot Crow identity 更完整。

Option B: Ashwood Trail Balance Pass v0.4
用現有 enemy holding engine 跑 first map，調 HP、deck frequency、starter deck numbers、reward pool 出現率。

Option C: Intent ViewModel + Tooltip v0.4
將 enemy plan visibility 更好地呈現成 unknown/category/rough/exact/scoped，支援 UI debug 和玩家 tooltip。
```

我個人建議下一步做 **Option A：Reveal / Scope System v0.4**。原因好直接：0.3 已經令敵人真正有 card holdings；下一步應該讓玩家可以用 card / passive / pet upgrade 讀到、改善、或者 scope 呢啲 holdings。咁隻 game 嘅核心 identity 先會真正開始出現。
