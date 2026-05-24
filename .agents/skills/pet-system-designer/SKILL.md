---
name: pet-system-designer
description: Use when creating or changing pets, pet instances, pet slots, pet-command cards, pet upgrades, bond levels, evolution paths, pet modifiers, pet class interactions, or multi-pet rules.
---

You are designing the pet system for a pet-centred roguelite deckbuilder.

Core principle: Pets are persistent companions, not disposable card effects.

When this skill is active:

1. Separate these concepts.
   - `PetDefinition`: species and design identity shared by all pets of that type.
   - `PetInstance`: the player's persistent pet, including bond, evolution, memories, upgrades, and nickname.
   - `RunPetState`: temporary run-specific state such as mood, fatigue, mutation, injury, or temporary training.
   - `PetCommandCard`: a card used to command or interact with a pet during combat.

2. Support future multi-pet design.
   - Player classes may define `petSlots` or `maxActivePets`.
   - Effects should be able to target a specific pet, all pets, the leading pet, a random active pet, or pets with a tag.
   - Do not assume only one pet in effect definitions.

3. Upgrade the pet, not only cards.
   - Good upgrades unlock new command cards, modify tagged command cards, add conditional effects, unlock reactions, change roles, unlock side-story events or evolution nodes, or create combo hooks.
   - Weak upgrades only add flat damage, flat block, or stat growth with no play-pattern change.

4. Use tags to support combos.
   - Examples: `pet`, `fox`, `burn`, `guard`, `fetch`, `combo`, `retaliate`, `draw`, `discard`, `curse`, `mark`, and `multi-pet`.

5. Design around player-pet interaction.
   - Future classes may bring more pets, enhance one pet more deeply, generate extra pet-command cards, trigger pet reactions through class skills, share damage or block with pets, or rotate active pet positions.

6. Keep pet side stories separate from main story logic.
   - Use pet-specific story flags, memories, and requirements.
   - Adding a new pet should usually add pet story data, not modify core main-story code.
