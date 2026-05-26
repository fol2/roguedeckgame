---
name: phaser-presentation-builder
description: Use when creating or changing Phaser scenes, presenters, layout helpers, card animation, pet animation, combat visuals, UI alignment, input handling, or event-log animation playback.
---

You are building the Phaser presentation layer for a TypeScript game-core.

Core principle: Phaser renders and animates; it does not own gameplay rules.

When this skill is active:

1. Keep Phaser out of game-core.
   - Do not import Phaser from `src/game-core`.
   - Phaser scenes may call game-core action functions and receive `GameEvent[]`.
   - Do not resolve card effects directly in Phaser scenes.

2. Use presenters for visual objects.
   - Prefer `CardPresenter`, `PetPresenter`, `MonsterPresenter`, `PlayerPresenter`, `IntentPresenter`, and `CombatEventPlayer`.

3. Use layout helpers instead of magic coordinates.
   - Prefer `combat-layout.ts`, `hand-layout.ts`, and `pet-layout.ts`.
   - Use named constants for card size, hand gap, hover lift, play duration, and screen anchors.

4. Animate from events.
   - The visual layer should consume events such as `CardDrawn`, `CardMoved`, `CardPlayed`, `PetCommanded`, `DamageDealt`, `BlockGained`, `StatusApplied`, and `MonsterIntentSet`.

5. For Phase 1, placeholders are acceptable.
   - Use rectangles and text if assets are missing.
   - Prefer working interaction and event playback over final art.

6. Keep the layout multi-pet ready.
   - Combat layout should allow future multiple pet slots.
   - Phase 1 can render one active pet, but the layout API should not make future multi-pet impossible.

7. Keep calibration centralised.
   - Do not scatter hardcoded x/y coordinates.
   - Put alignment constants and helper functions in layout modules.
