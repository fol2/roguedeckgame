係，要繼續 hardening / refactor。你今次嘅直覺係啱：**而家比上一輪好好多，但仲未到「solid enough to continue feature development」**。我唔會建議而家加新 gameplay、新 pet、新 map、新 card set。下一步應該專注令 validation gate、controller mutation path、workbench truth、同大檔案結構穩晒。

我今次無改 code，只做 clean ZIP validation 同 review。

Project contract 本身都支持你呢個方向：core 要保持 deterministic、Phaser / browser / app shell 唔可以滲入 `src/game-core`，而 clean review ZIP 要可以 validation；呢個係 architecture law。 Combat UI contract 亦明確要求 revision、duplicate-submit prevention、event playback failure safety、fallback safety，而唔係只要 happy path 跑得就算。 Combat rules 而家又已經提升到「two-sided card game」：敵人都有 card holdings / plan / intent visibility，所以測試同 workbench 必須更嚴謹，唔可以再當 monster intent 係簡單 scripted action。 Content contract 亦寫明 no single-pet assumption、no direct `Math.random()`、enemy cards not rendered as battlefield cards、orange command line 只代表 card-to-pet command。

Validation 結果如下。

`npm ci` pass，0 vulnerabilities。

`npm run typecheck` pass。

`npm run build` pass。

`npm run build:cli` pass。

`npm run sim:smoke -- --analyze` pass。3/3 completed，0 failures，content dependency references 193，missing 0，warnings 0，health no issues。Runtime metadata 顯示 content version 係 `ashwood-trail-content-foundation-v2`，registry fingerprint 係 `fnv1a32:bc9df23e`。

`npm run sim:balance` pass。200 fuzz runs，completion 51.5%，喺 45–60% balance target 入面，0 failures，health no issues。

`npm audit --audit-level=moderate` pass，0 vulnerabilities。

但兩個重要 gate 仍然唔得。

第一，**default `npm test` 唔可靠**。我喺 clean extracted ZIP 直接跑 `npm test -- --reporter=dot`，10 分鐘都未完成，無成功 summary。呢個係 P0。分開跑就好好多：`tests/game-cli` pass，15 tests；`tests/game-core` pass，60 files / 557 tests；`tests/game-phaser` 用 `--no-file-parallelism` pass，46 files / 263 tests；`tests/scripts` pass，1 file / 3 tests。即係 test 內容大多係綠，但 default command 本身唔係可信 validation gate。呢個正正係「唔 robust」嘅核心證據。

第二，**`npm run test:integration` fail**。CLI integration 3 tests pass，但 Vite preview localhost test fail，因為 Chrome / Chromium 喺 root container 入面無 `--no-sandbox` 起唔到：`Running as root without --no-sandbox is not supported`。呢個未必代表 CI 一定 fail，但代表 clean review validation 唔 robust。Integration test 要 either 自動處理 root/no-sandbox、或者檢測 browser availability 後明確 skip with reason，唔應該爆成 hard failure。

好消息係，今次確實修咗幾樣之前我擔心嘅嘢。

Review ZIP 冇再包含 nested repo archive pollution。我檢查 `docs/contracts` 入面無 nested `src/`、`tests/`、`.github/`、`package.json`。`scripts/create-review-zip.mjs` 亦有 nested repo archive guard。呢個係進步。

Deck registry 已經 first-class 起步。有 `DeckDefinition / StarterDeckDefinition`，`novice_tamer_starter`，player class 用 `startingDeckId` 指去 starter deck，Workbench 有 Deck view，會顯示 deck size、pet-command count、rarity mix、tag distribution、where-used by player class。呢個方向係啱。

Level / Run Map viewer 亦有明顯進步。Workbench detail panel 已經有 `Level viewer`，每個 node 會列 node id、type、layer、next nodes、encounter ids、expanded encounters、monster names / roles / tags、difficulty bands、budget、reward pool、broken references。呢個已經唔係以前純 JSON browser。

Enemy card system 亦唔係空殼。我見到 `CombatMonsterCardState`、enemy card instance id、draw / hand / planned / discard / exhaust zones、plan mode、intent visibility levels，monster definitions 亦有 `cardGame`。呢個開始對齊「敵人都有牌」嘅 combat rule。

Architecture boundary scan 暫時乾淨。我掃 `src/game-core`，未見 Phaser import、game-phaser/app import、browser global/localStorage/sessionStorage、或者 direct `Math.random()` gameplay usage。呢點值得保留。

但以下問題我會當下一輪 hardening/refactor 主線。

**P0：修 default test gate。**
唔可以接受「分開跑 pass，但 `npm test` 10 分鐘無結果」。下一輪要將 default `npm test` 改成可靠 orchestrated lane。最實際做法係唔好用一個 Vitest process 食晒 110 files；改成 script 分 batch 跑，例如 `test:cli`、`test:core`、`test:phaser`、`test:scripts`，而 default `npm test` 串行跑呢幾個。因為我實測分開跑係可完成，而且加埋大概一分鐘級別；單一 default run 反而卡住。

**P0：修 integration browser gate。**
`tests-integration/localhost/vite-preview.integration.test.ts` 啟動 Chrome 時應該喺 Linux root 環境自動加 `--no-sandbox`，或者將 browser smoke 改成 explicit browser-available lane。最好係：HTTP asset smoke 必跑；real browser DOM smoke 如果無可用 browser 或 root sandbox 不支援，就 clean skip with diagnostic，而唔係 hang / fail。否則 review ZIP 喺 container、CI、dev machine 之間會一直不穩。

**P0：mutation API 仲未夠硬。**
`RunSandboxController` 入面 `playHandCard`、`endTurn`、`completeCombatIfEnded` 已經 require `requestId`，但 `selectMapNode`、`claimRewardOption`、`skipReward`、`completeNonCombatNode` 仍然接受 optional `requestId` / `expectedRevision`。Production scenes 目前有傳 request id，呢個好；但 controller API 本身仍然容許 silent unsafe mutation。`prepareRunSandboxCombatPreview()`、`CombatSandboxController`、好多 tests 都仲直接 `selectMapNode(node.id)`。下一步應該分清楚：production mutation methods 必須 require request id + revision；test/preview 用 explicit helper，例如 `selectMapNodeForTest()` 或 `unsafeSelectMapNodeForPreview()`，唔好同 production path 混埋。

**P1：大檔案 refactor 仲未完成，只係轉移咗重量。**
`CombatScene.ts` 可能變薄咗，但重量搬咗去 `combat-scene-orchestrator.ts`，而家大約 1198 行。`combat-view-model.ts` 大約 1180 行。`validation.ts` 大約 2837 行，呢個係最大風險。`save.ts` 大約 1234 行，`content-workbench.ts` 大約 789 行，`RunSandboxController.ts` 大約 634 行。呢啲唔係即刻 bug，但係 hardening 階段唔拆，之後會越嚟越難安全改。

**P1：Workbench viewer 有咗，但 event/rest truth 仲係 placeholder。**
Combat / elite / boss node 已經可以 answer「踩呢個 node 會遇到邊啲 encounter / monster / reward pool」。但 event/rest node 仲多數係「Completes a non-combat story or resource event placeholder」。下一步要做 `NodeOutcomePreview` 或 `RunNodeActionContract`，令 workbench 對每個 node 都可以講清楚：踩落去會 call 邊個 lifecycle path、會出 combat / reward / story event / heal / memory / flag / run completion，唔係只靠 notes。

**P1：Deck registry 仲有 duplicate source of truth。**
`PlayerClassDefinition` 仍然保留 `startingDeckCardIds`，同 `startingDeckId` 指向嘅 deck card list 重複。Validation 已經有 drift-prevention，要求兩邊 match，呢個係好嘅 transitional guard。但長遠應該移除或正式標記 compatibility-only，否則 authoring 時永遠有兩個地方可以改 deck。

**P1：enemy card system 要收斂 source of truth。**
而家已有 `monsterCardStates`，但仍有 `plannedMonsterAbilities` 同 old `intentPool` compatibility path。可以接受作過渡，但下一輪應該明確定義：Phase 1 content 全部 monster 必須有 `cardGame`；`plannedMonsterAbilities` 只係 derived projection for UI/debug/event compatibility，唔係第二套 truth。要加 invariant：enemy planned ability 必須由 enemy card state 推導到，唔可以兩邊 drift。

**P2：Workbench balance dashboard 已經 lazy，但仍應該抽離。**
`content-workbench.ts` 仲直接 import `runFuzzSimulation`、`analyzeAgentTraces`、`checkSimulationHealth`。雖然而家係 idle 後先跑，但 UI module 同 simulation engine coupling 太重。下一步應該搬去 `content-workbench-balance-dashboard.ts` 或 app-side report service，UI 只 consume injected report builder。

我建議下一張 ticket 叫：

```md
Use $game-architecture-guard, $combat-engine-test-writer, $phaser-presentation-builder, $content-author, and $pet-system-designer.

Implement Phase 17 — Reliability Gate + Mutation API Hardening + Structural Refactor.

Primary goal:
Do not add new gameplay content. Make the current game robust enough that future development can trust the gate, controller paths, workbench truth, and large-module boundaries.

Required validation from a clean review ZIP extraction:
- npm ci
- npm run typecheck
- npm test
- npm run build
- npm run build:cli
- npm run test:integration
- npm run sim:smoke -- --analyze
- npm run sim:balance
- npm audit --audit-level=moderate

Hard requirements:

1. Fix default npm test.
   Current issue:
   - Partitioned test directories pass.
   - Default `npm test` does not complete reliably from clean ZIP.
   Required:
   - `npm test` must complete with a green summary under default script.
   - Do not require manual partitioning.
   - Acceptable implementation:
     - make `npm test` an orchestrated script that runs:
       - npm run test:cli
       - npm run test:core
       - npm run test:phaser
       - npm run test:scripts
     - keep each batch bounded and deterministic.
   - Keep total runtime reasonable.
   - Do not hide failing tests.

2. Fix integration browser robustness.
   Current issue:
   - Vite preview integration test fails in root Linux container because Chrome needs `--no-sandbox`.
   Required:
   - Add `--no-sandbox` automatically when `process.getuid?.() === 0` on Linux, or
   - split HTTP preview smoke from real browser DOM smoke and cleanly skip browser smoke only when browser environment is unsupported.
   - The integration result must be explicit, not a 10–30s opaque Chrome DevTools timeout.

3. Harden production mutation APIs.
   Current issue:
   - `selectMapNode`, `claimRewardOption`, `skipReward`, and `completeNonCombatNode` still accept optional request ids/revisions.
   Required:
   - Production-facing mutating controller methods must require:
     - expectedRevision
     - requestId
   - Keep test helpers ergonomic by creating explicit test/preview helpers, for example:
     - `selectMapNodeForTest`
     - `completeNonCombatNodeForTest`
     - `prepareRunSandboxCombatPreview` with internal generated request ids
   - Do not allow production scenes to call mutating methods without request id + revision.
   - Add source/static tests for MapScene, RewardScene, CombatScene, and preview helpers.

4. Split `RunSandboxController`.
   Current issue:
   - Controller is still too broad.
   Required split:
   - request/revision guard
   - map bridge
   - combat bridge
   - reward bridge
   - non-combat/story bridge
   - trace recorder
   - controller composition shell
   Preserve behavior and tests.

5. Split validation.ts.
   Current issue:
   - `src/game-core/systems/validation.ts` is too large and risky.
   Required split:
   - validation/cards
   - validation/decks
   - validation/players
   - validation/pets
   - validation/monsters
   - validation/enemy-card-game
   - validation/encounters
   - validation/run-maps
   - validation/rewards
   - validation/story
   - validation/cross-references
   Keep exported validation API stable.

6. Split combat view model.
   Current issue:
   - `combat-view-model.ts` is too large.
   Required split:
   - card view model builder
   - intent visibility / planned action builder
   - combatant status view builder
   - pet view builder
   - debug/detail text helpers
   - top-level composition only in `combat-view-model.ts`
   Preserve no-Phaser rule.

7. Split combat-scene-orchestrator.
   Current issue:
   - `combat-scene-orchestrator.ts` became the new god object after thinning CombatScene.
   Required split:
   - action submission handler
   - playback coordinator
   - detail/tooltip coordinator
   - keyboard/selection coordinator
   - debug/parity coordinator
   Keep CombatScene thin and keep gameplay rules out of Phaser.

8. Strengthen Level / Run Map Workbench truth.
   Current issue:
   - Combat nodes are now visible, but event/rest outcomes are still placeholder-like.
   Required:
   - Add a `RunNodeOutcomePreview` or `RunNodeActionContract`.
   - Workbench should show, for every node:
     - what lifecycle action happens when selected
     - whether combat starts
     - possible encounter ids
     - possible monster names/roles
     - reward pool
     - whether reward is generated
     - event/story id if present
     - pet memory/story flag outcomes if present
     - rest/heal/resource outcome if present
     - boss/run-complete behavior
   - Add tests proving workbench answers:
     - what happens if I step on this node?
     - which enemies can appear here?
     - what reward pool is used?
     - what story/event/rest outcome happens?
     - which refs are broken?

9. Finish Deck Registry cleanup.
   Required:
   - Keep starter deck registry as authoring source.
   - Either remove `startingDeckCardIds` from player class data or mark it compatibility-only.
   - Keep a drift-prevention test while compatibility remains.
   - Workbench should clearly show source of truth and warn if compatibility data exists.

10. Consolidate enemy card game truth.
   Required:
   - All first-slice monsters must use `cardGame`.
   - Add invariant tests that planned monster abilities are derived from monster card state.
   - Prevent drift between `monsterCardStates`, `plannedMonsterAbilities`, and `monsterIntents`.
   - Make fallback non-card monster intent path explicit legacy/test-only unless intentionally supported.

Non-goals:
- Do not add new cards except tiny fixtures needed for tests.
- Do not add a second pet.
- Do not add pet HP.
- Do not add enemy pet targeting.
- Do not add a write editor.
- Do not weaken architecture boundary tests.
- Do not reintroduce nested repo archives into review ZIPs.
```

我會畀一個好直接嘅判斷：**係，繼續 hardening/refactor，而且係必要。**

今次功能面其實有進步：deck registry、level viewer、enemy card state、workbench detail 都起咗。但一個 project 只要 `npm test` default 唔穩、integration test 對環境脆弱、mutation APIs 仲容許 unsafe optional request id，就唔應該話自己 robust。下一輪應該係「boring but essential」：先令所有 gate 一鍵可信，再拆大檔案，再收緊 controller contracts。完成呢輪之後，先值得繼續做新 gameplay。
