我 validate 咗你三個 passes，亦做咗一輪 hardening/refactor。整體 verdict：**三個 pass 大方向係 valid，可以繼續落去；但仍然唔應該話 combat UI 已經 polish-finished。** 而家比較準確嘅狀態係：combat UI/UX 已經由 prototype 疊功能，進入到「可被測試、可被 asset contract 支撐、可再 polish」嘅階段。

已整理好 hardened review zip：

[Download hardened review ZIP](sandbox:/mnt/data/combat-ui-ux-polish-hardened-review.zip)

另外我亦輸出咗 patch，方便你或者 agent 快速睇我改咗乜：

[Download hardening patch](sandbox:/mnt/data/combat-ui-ux-hardening.patch)

Validation 結果如下：

```txt
npm ci                         PASS
npm run typecheck              PASS
npm run test:core              PASS — 60 files / 557 tests
npm run test:phaser            PASS — 46 files / 264 tests
npm run test:cli               PASS — 4 files / 19 tests
targeted regression tests      PASS — 3 files / 31 tests
npm run build                  PASS
npm run build:cli              PASS
npm run zip:review             PASS
zip -T review zip              PASS
```

有一點我要講清楚：`npm test -- --reporter=dot` 呢個 all-in-one run 喺 sandbox 入面仍然去到 300 秒 timeout，冇正常出 summary。分 suite 跑就全部 pass，所以我暫時判斷唔係 combat gameplay/UI regression，而係 test runner / worker / long all-suite process 問題。為咗實用，我保留 `npm test` 原本行為，另外加咗：

```json
"test:core": "vitest run tests/game-core --reporter=dot",
"test:phaser": "vitest run tests/game-phaser --reporter=dot",
"test:cli": "vitest run tests/game-cli tests/scripts --reporter=dot"
```

之後 CI 可以考慮用 split suites，會比一個巨型 `npm test` 穩定得多。

我對三個 pass 嘅 validation：

**Pass 1 — Interaction refactor：基本合格。**
`CombatScene.ts` 而家已經瘦到只係 export `CombatSceneOrchestrator`，interaction state、selection、overlay、input lock、keyboard、request tracking、command line state、drop target resolver 都已經拆出 module。呢個符合我哋之前講嘅方向：Phaser scene 不應該繼續攬晒 gameplay-adjacent UI state。呢點亦符合 architecture contract：game-core 係 deterministic rule engine，Phaser 只係 presentation / input / animation layer，唔應該擁有 combat rules。

但我要直接講：**`combat-scene-orchestrator.ts` 仍然太大，約 1198 lines。**
呢個已經比原本 CombatScene 好，但佢而家係「Scene 已拆名」，唔係「orchestration 已完全分層」。下一個真 refactor 應該係將 `CombatSceneOrchestrator` 再拆：

```txt
CombatSceneBootstrapper
CombatSceneRenderCoordinator
CombatSceneOverlayCoordinator
CombatScenePlaybackCoordinator
CombatSceneDebugCoordinator
```

今次我冇硬拆呢一步，因為風險會比較高，而且你而家最需要先穩住 validation gate。

**Pass 2 — Visual grammar polish：方向 valid，我修咗一個重要 copy bug。**
Contract 入面講得好清楚：enemy cards 可以係 core rule，但 battlefield UI 唔應該將敵人畫成 cards；玩家睇到嘅係 Intent information layer。 同時 combat card rules 亦明確分開 `Enemy Card`、`Enemy Plan`、`Intent`：enemy 內部有 card / plan，但 UI 顯示嘅係玩家可見資訊版本。

我發現 view model player-facing copy 仲有幾個位置寫：

```txt
Scoped planned card
Rough planned card
Category planned card
Hidden planned card
```

呢個對玩家係錯語言，會令佢以為敵人頭頂係「敵人卡牌 UI」。我已改成：

```txt
Scoped enemy intent
Rough enemy intent
Category enemy intent
Hidden enemy intent
```

並加咗 regression test，確保 partial / hidden intent copy 唔再出現 `planned card`。

呢個修正唔大，但好重要。因為你隻 game 嘅 UI grammar 要守死：**enemy internal card system 係 core truth；enemy intent token 先係 combat UI truth。**

**Pass 3 — Asset-ready foundation：基本 valid。**
Repo 入面已經有：

```txt
docs/contracts/combat-ui-asset-manifest-v0.1.md
src/game-phaser/assets/combat-asset-keys.ts
src/game-phaser/assets/combat-fallback-assets.ts
tests/game-phaser/combat-asset-keys.test.ts
tests/game-phaser/combat-fallback-assets.test.ts
tests/game-phaser/combat-asset-manifest.test.ts
```

Phaser suite 全 pass。呢個符合 design direction：cards、HUD、icons、frames、VFX 應該係 modular assets + code-rendered text/numbers，而唔係 baked full UI screenshots。

我冇見到需要即刻大改 asset manifest。下一步唔係加更多 asset keys，而係要用 actual combat preview 去驗證每個 key 嘅 fallback / hitbox / scale 是否合理。

我今次做嘅 hardening/refactor 有四類：

第一，**修正 enemy intent player-facing copy**。
改動檔案：

```txt
src/game-phaser/view-models/combat-view-model.ts
tests/game-phaser/combat-view-model.test.ts
```

新增 test 覆蓋 `none / unknown / category / rough / scoped` visibility，確保 UI copy 唔再講 planned card。

第二，**硬化 CLI smoke tests 嘅 transient build 問題**。
原本 `scripts/run-cli-entry.mjs` 每次 CLI smoke test 都會起一個 temp Vite build。如果 Vitest worker parallel 起多個 CLI tests，就有機會同時 build，令 5s timeout 好易爆。
我改成 deterministic cache + lock：

```txt
node_modules/.cache/roguedeckgame-cli-entry/<hash>
```

hash 來源包括：

```txt
package.json
package-lock.json
tsconfig.json
vite.cli.config.ts
src/game-cli
src/game-core
```

第一個 process build，其他 process 等 cache ready。lock 有 stale timeout，避免 crash 後永遠卡住。

第三，**review zip script 現在支援 no-git extracted review zip。**
你畀我嘅 zip 解開之後冇 `.git`，原本 `npm run zip:review` 會直接 fail：

```txt
git rev-parse --show-toplevel failed
```

我加咗 filesystem fallback。當 repo metadata 不存在時，會 archive current working tree，但排除：

```txt
.git
node_modules
dist
dist-cli
coverage
.vite
.vitest
*.zip
docs/contracts/p1
docs/contracts/p1.5
docs/contracts/p2
archive
docs/evidence
```

並保留原本 nested repo archive guard。呢個係實用硬化，因為之後你俾 agent / reviewer 一個 review zip，佢哋解開後都應該可以再產生 clean review zip。

第四，**validation scripts 更清楚。**
我保留原本 `npm test`，另外加 suite scripts：

```txt
npm run test:core
npm run test:phaser
npm run test:cli
```

呢個令 validation 更可控，亦方便 agent 下一次改 combat UI 時只跑 phaser suite + targeted suite，唔需要每次等 full all-in-one runner。

我改動嘅檔案清單：

```txt
package.json
vitest.config.ts
scripts/run-cli-entry.mjs
scripts/create-review-zip.mjs
src/game-phaser/view-models/combat-view-model.ts
tests/game-phaser/combat-view-model.test.ts
tests/game-cli/version.test.ts
tests/scripts/create-review-zip.test.js
```

我覺得下一步應該咁做：

**下一個 ticket 唔好再叫 UI polish。叫：CombatSceneOrchestrator Split Pass。**
原因好簡單：Pass 1 已經將 `CombatScene.ts` 清走，但 `CombatSceneOrchestrator` 仍然係一個 1198-line hub。之後任何 visual polish、tooltip polish、animation polish，都會繼續塞入 orchestrator。再拖落去就會返返去之前個問題。

建議下一個 agent contract 聚焦：

```txt
CombatSceneOrchestrator Split Pass

Goals:
- no gameplay behavior changes
- no new visuals
- no asset changes
- split render, overlay, playback, debug, bootstrap responsibilities
- keep all existing tests passing
- add tests only where extracted pure helpers need coverage
```

我會守住一個原則：**而家 combat UI/UX 方向係啱，但未到應該狂加新 animation 嘅時候。**
先拆 orchestrator，再做 visual preview tuning。否则你會好快又返到「功能做到，但 UI state 亂、animation 互相打架」嗰個局面。
