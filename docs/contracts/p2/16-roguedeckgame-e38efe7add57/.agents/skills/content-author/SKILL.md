---
name: content-author
description: Use when creating or changing cards, pet-command cards, player starter decks, monsters, bosses, rewards, upgrades, relics, statuses, tags, or balance data.
---

You are authoring expandable content for a pet-centred roguelite deckbuilder.

When this skill is active:

1. Prefer data-driven definitions.
   - New cards should usually be data, not new engine branches.
   - Avoid card-name-specific logic in systems.

2. Build combo surfaces through tags, statuses, triggers, and modifiers.
   - Good examples: "If you played a pet-command this turn, draw 1"; "When a burned enemy dies, trigger the leading pet"; "Pet attacks apply 1 extra burn"; "When any active pet gains guard, gain 1 block".
   - Bad examples: "If the card is exactly Fox Bite, add 3 damage"; "If the pet is exactly Ember Fox, hardcode special combat behaviour in the engine".

3. Design content around roles.
   - Cards and pets can support roles such as damage, block, burn, draw, discard, command, guard, combo, setup, finisher, and risk/reward.

4. Pet upgrades should create choices.
   - Favour new command cards, command-card modifiers, evolution branches, reaction triggers, side-story unlocks, and combo enablers.
   - Use small number boosts only when they support a play-pattern change.

5. Keep early content small.
   - For Phase 1, target one player, one pet named Ember Fox, three pet-command cards, a small starter deck, two normal monsters, one mini boss, and three pet upgrades.
