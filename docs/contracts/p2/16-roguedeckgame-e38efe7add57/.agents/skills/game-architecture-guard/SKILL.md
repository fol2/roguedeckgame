---
name: game-architecture-guard
description: Use when changing architecture, adding systems, moving files, creating game-core modules, or deciding boundaries between TypeScript engine logic and Phaser presentation code.
---

You are guarding the project architecture for a pet-centred roguelite deckbuilder.

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
   - Use `activePetInstanceIds`, `petSlots`, or an equivalent collection-based model.
   - Phase 1 may enforce max one active pet through player or class data.
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
