係，唔好侷限一隻 Pet。我哋第一版只帶一隻，但 engine 一開始就應該當成：

TypeScript
activePetInstanceIds: PetInstanceId[]

而唔係：

TypeScript
activePetInstanceId: PetInstanceId

然後第一個 Player class 暫時：

TypeScript
maxActivePets: 1

將來另一個 Player class 可以係：

TypeScript
maxActivePets: 2

甚至有啲 class 係「多 Pet、少主角輸出」，有啲 class 係「單 Pet、深 bond、強 interaction」。呢個係好方向。你而家講清楚呢點好重要，因為如果第一日寫死 single pet，之後改會好痛。

我會建議第一步真係做 customized skills，而且做 project-based skills，放入 repo 嘅 .agents/skills。Codex 官方文件講 skills 可以放喺 repo、user、admin、system 位置；repo 位置會由 current working directory 向上掃 .agents/skills，user-level 則係 $HOME/.agents/skills。對你呢隻 game 嚟講，game architecture、Pet design、combat testing、Phaser presentation 呢啲規則應該跟 repo 走，所以先用 repo-based。私人偏好，例如「回覆我用廣東話」、「每次改 code 前先 summarize plan」，先放 user-based。
OpenAI Developers

同時，我會加一個 root AGENTS.md。原因係 AGENTS.md 係每次 Codex 開工前都會讀嘅 durable guidance，而 skills 係特定工作流先 invoke。OpenAI 官方 docs 都係咁分：AGENTS.md shape general behavior，skills package repeatable workflows，兩者係 complementary。
OpenAI Developers

下面呢份可以直接交畀 Codex。建議你用英文貼，因為 repo 文件、skill name、code convention 都會係英文，Codex 執行會穩啲。

Markdown
# Engineering Contract v0.1 — Bootstrap Codex Skills for Pet Roguelite Deckbuilder

## Objective

Create repo-scoped Codex skills and root project guidance for a browser-first, TypeScript + Vite + Phaser 4, pet-centered roguelite deckbuilder.

This task is NOT to build the game engine yet. This task is to set up the coding-agent workflow so future Codex tasks preserve the project architecture and game-design direction.

## Project Identity

The game is a pet-centered roguelite deckbuilder inspired by Slay the Spire, but its identity is different:

- Pets are persistent companions selected before a run.
- Pets are always present in combat.
- Players interact with pets through pet-command cards and class abilities.
- The first playable version supports one active pet, but the engine must be designed for multiple active pets later.
- Different future player classes may support different numbers of active pets.
- Pet upgrades should primarily upgrade the pet, its modifiers, its command card set, or its evolution path, not only individual cards.
- Roguelite progression should unlock options, evolutions, story memories, and build variety rather than only increasing numbers.
- Pet side stories are separate from the main story, but the engine must support side-story flags, pet memories, and pet-specific quests.

## Required Files

Create these files and directories:

```txt
AGENTS.md

.agents/
  skills/
    game-architecture-guard/
      SKILL.md
    pet-system-designer/
      SKILL.md
    combat-engine-test-writer/
      SKILL.md
    phaser-presentation-builder/
      SKILL.md
    content-author/
      SKILL.md
    story-event-author/
      SKILL.md

docs/
  codex-skills.md
```

Do not install production dependencies. Do not create the game engine yet. Do not scaffold Phaser yet. This task only creates guidance and skills.

Root AGENTS.md Requirements

Create AGENTS.md with these rules:

Markdown
# Project Guidance — Pet Roguelite Deckbuilder

## Working Agreement

This repository is for a browser-first TypeScript + Vite + Phaser 4 pet-centered roguelite deckbuilder.

Prefer small, typed, deterministic systems over large manager classes. Keep game rules testable without rendering.

## Architecture Rules

- `src/game-core` must never import Phaser.
- Phaser code belongs in `src/game-phaser`.
- Game rules belong in `src/game-core`.
- Phaser scenes may consume game events and animate them, but must not contain card, pet, monster, reward, or story resolution logic.
- Gameplay actions should emit typed `GameEvent` objects.
- Combat logic should be deterministic when given the same state, action, and RNG seed.
- Prefer data-driven content definitions for cards, pets, upgrades, monsters, rewards, and story events.

## Pet System Rules

- The game must support multiple active pets in the long term.
- Phase 1 may restrict the player to one active pet, but models should use arrays such as `activePetInstanceIds` or `petSlots`.
- Do not hardcode a single global pet.
- Pets are persistent companions selected before a run.
- Pets are always present in combat.
- Pet-command cards are cards that instruct or interact with pets.
- Pet upgrades should primarily modify pet behavior, command-card generation, pet modifiers, evolution paths, side-story unlocks, or combo patterns.
- Avoid permanent progression that only adds raw numbers.

## Design Rules

- Build for emergent combos through tags, statuses, triggers, and modifiers.
- Avoid card logic written as `if card.name === ...`.
- Prefer effects like `damage`, `block`, `draw`, `applyStatus`, `petAttack`, `modifyPetCommand`, and `triggerWhen`.
- Side stories should be data-driven and separate from the main story.

## Testing Expectations

- Add or update tests when modifying `game-core`.
- Test event order, not only final HP or final state.
- Use seeded RNG for random behavior.
- Do not require Phaser or a browser for core engine tests.

## First Playable Slice

The first playable slice should eventually include:

- One player class.
- One active pet: Ember Fox.
- Basic draw/hand/discard/energy.
- Normal cards and pet-command cards.
- One or two monsters.
- Damage, block, burn, draw, and end-turn logic.
- One pet upgrade reward.
- One side-story flag.
Skill 1: game-architecture-guard

Create .agents/skills/game-architecture-guard/SKILL.md:

Markdown
---
name: game-architecture-guard
description: Use when changing architecture, adding systems, moving files, creating game-core modules, or deciding boundaries between TypeScript engine logic and Phaser presentation code.
---

You are guarding the project architecture for a pet-centered roguelite deckbuilder.

Core principle: Phaser is the presentation layer. `src/game-core` is the deterministic game engine.

When this skill is active:

1. Preserve the architecture boundary.
   - Do not import Phaser from `src/game-core`.
   - Do not put card, pet, monster, reward, RNG, or story resolution logic inside Phaser scenes.
   - Phaser scenes may call game-core actions and then animate returned `GameEvent[]`.

2. Prefer these top-level areas when the repo exists:
   - `src/game-core/model`
   - `src/game-core/data`
   - `src/game-core/systems`
   - `src/game-core/events`
   - `src/game-core/testing`
   - `src/game-phaser/scenes`
   - `src/game-phaser/presenters`
   - `src/game-phaser/layout`
   - `src/game-phaser/animation`

3. Model future multi-pet support from the start.
   - Use `activePetInstanceIds`, `petSlots`, or equivalent collection-based model.
   - Phase 1 may enforce max one active pet through player/class data.
   - Do not create a model that assumes exactly one pet forever.

4. Prefer event-driven gameplay.
   - Gameplay actions should return updated state plus typed events.
   - Useful events include `CardPlayed`, `EnergySpent`, `DamageDealt`, `BlockGained`, `StatusApplied`, `PetCommanded`, `PetReacted`, `CardDrawn`, `CardMoved`, `MonsterIntentSet`, `RewardOffered`, and `StoryFlagSet`.

5. Keep systems deterministic.
   - Randomness must go through an RNG interface or seeded helper.
   - Avoid direct `Math.random()` inside game-core.

6. When changing architecture, update relevant docs or comments.
   - Prefer short docs that future agents will actually read.
   - Do not create large speculative documents.
Skill 2: pet-system-designer

Create .agents/skills/pet-system-designer/SKILL.md:

Markdown
---
name: pet-system-designer
description: Use when creating or changing pets, pet instances, pet slots, pet-command cards, pet upgrades, bond levels, evolution paths, pet modifiers, pet class interactions, or multi-pet rules.
---

You are designing the pet system for a pet-centered roguelite deckbuilder.

Core principle: Pets are persistent companions, not disposable card effects.

When this skill is active:

1. Separate these concepts:
   - `PetDefinition`: species/design identity shared by all pets of that type.
   - `PetInstance`: the player's persistent pet, including bond, evolution, memories, upgrades, and nickname.
   - `RunPetState`: temporary run-specific state such as mood, fatigue, mutation, injury, or temporary training.
   - `PetCommandCard`: a card used to command or interact with a pet during combat.

2. Support future multi-pet design.
   - Player classes may define `petSlots` or `maxActivePets`.
   - Effects should be able to target a specific pet, all pets, the leading pet, a random active pet, or pets with a tag.
   - Do not assume only one pet in effect definitions.

3. Upgrade the pet, not only cards.
   Good pet upgrades:
   - unlock new command cards
   - modify all command cards with certain tags
   - add conditional effects
   - unlock new pet reactions
   - change pet role
   - unlock side-story events or evolution nodes
   - create combo hooks

   Weak pet upgrades:
   - only `+2 damage`
   - only `+3 block`
   - only flat stat growth with no play-pattern change

4. Use tags to support combos.
   Examples:
   - `pet`
   - `fox`
   - `burn`
   - `guard`
   - `fetch`
   - `combo`
   - `retaliate`
   - `draw`
   - `discard`
   - `curse`
   - `mark`
   - `multi-pet`

5. Design around player-pet interaction.
   A future player class may:
   - bring more pets
   - enhance one pet more deeply
   - generate extra pet-command cards
   - trigger pet reactions through class skills
   - share damage or block with pets
   - rotate active pet positions

6. Pet side stories should not be hardwired into the main story.
   Use pet-specific story flags, memories, and requirements.
Skill 3: combat-engine-test-writer

Create .agents/skills/combat-engine-test-writer/SKILL.md:

Markdown
---
name: combat-engine-test-writer
description: Use when implementing or changing combat resolution, card effects, pet-command effects, status effects, triggers, energy, draw/discard, RNG, monster actions, or event ordering.
---

You are responsible for keeping the combat engine deterministic, testable, and safe to expand.

When this skill is active:

1. Tests should focus on game-core only.
   - Do not require Phaser.
   - Do not require a browser.
   - Do not test visuals here.

2. Test event order.
   Prefer assertions over event sequences such as:
   - `CardPlayed`
   - `EnergySpent`
   - `PetCommanded`
   - `DamageDealt`
   - `StatusApplied`
   - `CardMoved`

3. Test final state and emitted events.
   A good test checks both:
   - final HP/block/status/hand/discard state
   - event log order and payloads

4. Cover edge cases.
   Include relevant tests for:
   - insufficient energy
   - invalid card id
   - dead target
   - empty draw pile
   - discard reshuffle
   - repeated triggers
   - once-per-turn pet modifiers
   - multiple active pets, even if Phase 1 max is one
   - status expiration
   - enemy death during chained events

5. Randomness must be seeded.
   - Do not use direct `Math.random()`.
   - Random tests must use a deterministic RNG seed.

6. Keep tests readable.
   - Use small fixture builders.
   - Avoid giant full-run fixtures unless necessary.
Skill 4: phaser-presentation-builder

Create .agents/skills/phaser-presentation-builder/SKILL.md:

Markdown
---
name: phaser-presentation-builder
description: Use when creating or changing Phaser scenes, presenters, layout helpers, card animation, pet animation, combat visuals, UI alignment, input handling, or event-log animation playback.
---

You are building the Phaser presentation layer for a TypeScript game-core.

Core principle: Phaser renders and animates; it does not own gameplay rules.

When this skill is active:

1. Keep Phaser out of game-core.
   - Do not import game-core into random visual helpers unless needed.
   - Phaser scenes may call game-core action functions and receive `GameEvent[]`.
   - Do not resolve card effects directly in Phaser scenes.

2. Use presenters for visual objects.
   Prefer:
   - `CardPresenter`
   - `PetPresenter`
   - `MonsterPresenter`
   - `PlayerPresenter`
   - `IntentPresenter`
   - `CombatEventPlayer`

3. Use layout helpers instead of magic coordinates.
   Prefer:
   - `combat-layout.ts`
   - `hand-layout.ts`
   - `pet-layout.ts`
   - named constants for card size, hand gap, hover lift, play duration, and screen anchors

4. Animate from events.
   The visual layer should consume events such as:
   - `CardDrawn`
   - `CardMoved`
   - `CardPlayed`
   - `PetCommanded`
   - `DamageDealt`
   - `BlockGained`
   - `StatusApplied`
   - `MonsterIntentSet`

5. For Phase 1, placeholders are acceptable.
   - Use rectangles/text if assets are missing.
   - Prefer working interaction and event playback over final art.

6. Multi-pet readiness.
   - Combat layout should allow future multiple pet slots.
   - Phase 1 can render one active pet, but the layout API should not make future multi-pet impossible.

7. Keep calibration centralized.
   - Do not scatter hardcoded x/y coordinates.
   - Put alignment constants and helper functions in layout modules.
Skill 5: content-author

Create .agents/skills/content-author/SKILL.md:

Markdown
---
name: content-author
description: Use when creating or changing cards, pet-command cards, player starter decks, monsters, bosses, rewards, upgrades, relics, statuses, tags, or balance data.
---

You are authoring expandable content for a pet-centered roguelite deckbuilder.

When this skill is active:

1. Prefer data-driven definitions.
   - New cards should usually be data, not new engine branches.
   - Avoid card-name-specific logic in systems.

2. Build combo surfaces through tags, statuses, triggers, and modifiers.
   Good examples:
   - "If you played a pet-command this turn, draw 1."
   - "When a burned enemy dies, trigger the leading pet."
   - "Pet attacks apply 1 extra burn."
   - "When any active pet gains guard, gain 1 block."

   Bad examples:
   - "If the card is exactly Fox Bite, add 3 damage."
   - "If the pet is exactly Ember Fox, hardcode special combat behavior in the engine."

3. Design content around roles.
   Cards and pets can support roles such as:
   - damage
   - block
   - burn
   - draw
   - discard
   - command
   - guard
   - combo
   - setup
   - finisher
   - risk/reward

4. Pet upgrades should create choices.
   Favor:
   - new command cards
   - command-card modifiers
   - evolution branches
   - reaction triggers
   - side-story unlocks
   - combo enablers

   Use small number boosts only when they support a play-pattern change.

5. Early content should stay small.
   For Phase 1:
   - one player
   - one pet: Ember Fox
   - three pet-command cards
   - a small starter deck
   - two normal monsters
   - one mini boss
   - three pet upgrades
Skill 6: story-event-author

Create .agents/skills/story-event-author/SKILL.md:

Markdown
---
name: story-event-author
description: Use when creating or changing pet side stories, story flags, memories, event requirements, event outcomes, quest state, evolution story gates, or narrative content structure.
---

You are authoring story systems for a pet-centered roguelite deckbuilder.

Core principle: Pet side stories are separate from the main story, but may reference global world progress.

When this skill is active:

1. Separate story layers.
   - Main story: world chapters, major bosses, global mysteries, world state.
   - Pet side story: pet memories, bond events, evolution quests, pet-specific flags.
   - Run story: temporary events seen during one run.

2. Use data-driven requirements.
   Examples:
   - `petBondAtLeast`
   - `hasPetMemory`
   - `bossDefeated`
   - `chapterUnlocked`
   - `hasSeenEvent`
   - `activePetHasTag`
   - `playerClassIs`

3. Do not hardcode every pet into main story logic.
   Adding a new pet should usually add pet story data, not modify core main-story code.

4. Keep narrative payloads small in early development.
   The engine should support story flags before the game has lots of prose.

5. Pet story rewards should not always be raw power.
   Good rewards:
   - unlock memory
   - unlock evolution branch
   - unlock future event
   - unlock command card option
   - change pet mood/reaction
   - add cosmetic or dialogue variation

6. Support future ultimate evolution.
   Ultimate evolution should be represented as an unlockable state or evolution node with explicit requirements.
docs/codex-skills.md Requirements

Create docs/codex-skills.md with:

A short explanation of when to use each skill.

Example Codex prompts for future work.

Reminder that Phase 1 supports one active pet but models must support multiple pets.

Reminder that Phaser is presentation only.

Example invocation prompts:

Markdown
Use $game-architecture-guard to design the initial game-core folder structure.

Use $pet-system-designer and $content-author to define Ember Fox, its pet-command cards, and three pet upgrades.

Use $combat-engine-test-writer to implement deterministic tests for playing a pet-command card.

Use $phaser-presentation-builder to create a placeholder CombatScene that animates GameEvent objects.
Validation

After creating the files:

Show the created file tree.

Print the first 20 lines of each SKILL.md.

Confirm there are no production dependency changes.

Confirm no game engine implementation was created yet.

Confirm the guidance explicitly mentions future multi-pet support.

Non-Goals

Do not implement Phaser.
Do not implement combat.
Do not create game art.
Do not create cards beyond examples inside documentation.
Do not install npm packages.
Do not create a save system.


我會咁行：先貼呢份 contract 畀 Codex，叫佢做一個 PR / worktree。做完之後，你唔好急住開始 engine，先叫 Codex summarize loaded instructions / skills，確認佢真係見到 `.agents/skills` 同 `AGENTS.md`。官方 docs 話 Codex 會自動 detect skill changes，但如果更新無出現，就 restart Codex。:contentReference[oaicite:2]{index=2}

至於「有冇現成 preload skills 可以用」，我查到官方 `openai/skills` catalog 入面，`.system` 目前列出 `imagegen`、`openai-docs`、`plugin-creator`、`skill-creator`、`skill-installer`；README 亦寫明 `.system` skills 會喺最新 Codex 自動安裝。:contentReference[oaicite:3]{index=3} :contentReference[oaicite:4]{index=4}

我建議你實際會用到嘅現成 skills 係呢幾個：

`$skill-creator`：用嚟之後 refine 我哋自己嘅 project skills。官方建議先用 built-in creator 建 skill，亦講明 skill 係一個有 `SKILL.md` 嘅 directory，可以加 scripts、references、assets。:contentReference[oaicite:5]{index=5}

`$skill-installer`：用嚟裝 curated / experimental skills。官方 docs 同 openai/skills README 都寫可以用 `$skill-installer` 安裝 curated skills；例如 curated skill 可以直接用 name 安裝。:contentReference[oaicite:6]{index=6} :contentReference[oaicite:7]{index=7}

`$imagegen`：用嚟快速做 Pet concept、card mockup、placeholder art。呢個係 system skill 入面見到嘅，但第一階段只用作 placeholder，唔好俾 art 搶走 engine 時間。:contentReference[oaicite:8]{index=8}

`$playwright-interactive` 或 `$playwright`：之後做 Phaser/Vite畫面時非常有用。OpenAI 前端 use case 明確講 Playwright skill 可以開 browser、比較 implementation 同 screenshot、檢查 responsive layout；官方 curated list 入面亦有 `playwright-interactive` 同 `playwright`。:contentReference[oaicite:9]{index=9} :contentReference[oaicite:10]{index=10}

`$gh-fix-ci` 同 `$gh-address-comments`：有 GitHub PR / CI 之後先用。官方 curated list 有呢兩個；而家第一步未需要裝。:contentReference[oaicite:11]{index=11}

`$security-best-practices` / `$security-threat-model`：等你開始有 save file、local storage、Electron/Tauri packaging、外部 API 或 plugin integration 先用。官方 curated list 有呢兩個，但現階段唔係 priority。:contentReference[oaicite:12]{index=12}

我唔建議一開始裝太多 skills。官方 docs 講 Codex 會把 available skills metadata 放入 context，但列表有 context budget；skills 太多時 description 會被縮短，甚至部分 skills 可能唔會出現。:contentReference[oaicite:13]{index=13} 你而家最需要嘅係少而準：project skills 守架構，Playwright 守 UI，imagegen 做 placeholder，其他等有需要先加。

下一步我會建議你做完呢個 bootstrap 後，第二張 Codex ticket 就係：**建立 `src/game-core` initial model，只建 model + type + tests，不接 Phaser。** That’s where the real engine starts.
::contentReference[oaicite:14]{index=14}
