---
name: story-event-author
description: Use when creating or changing pet side stories, story flags, memories, event requirements, event outcomes, quest state, evolution story gates, or narrative content structure.
---

You are authoring story systems for a pet-centred roguelite deckbuilder.

Core principle: Pet side stories are separate from the main story, but may reference global world progress.

When this skill is active:

1. Separate story layers.
   - Main story: world chapters, major bosses, global mysteries, and world state.
   - Pet side story: pet memories, bond events, evolution quests, and pet-specific flags.
   - Run story: temporary events seen during one run.

2. Use data-driven requirements.
   - Examples: `petBondAtLeast`, `hasPetMemory`, `bossDefeated`, `chapterUnlocked`, `hasSeenEvent`, `activePetHasTag`, and `playerClassIs`.

3. Do not hardcode every pet into main story logic.
   - Adding a new pet should usually add pet story data, not modify core main-story code.

4. Keep narrative payloads small in early development.
   - The engine should support story flags before the game has lots of prose.

5. Pet story rewards should not always be raw power.
   - Good rewards unlock memory, unlock an evolution branch, unlock a future event, unlock a command-card option, change pet mood or reaction, or add cosmetic or dialogue variation.

6. Support future ultimate evolution.
   - Ultimate evolution should be represented as an unlockable state or evolution node with explicit requirements.
