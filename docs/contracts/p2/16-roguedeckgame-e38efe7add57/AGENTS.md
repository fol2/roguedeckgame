# Project Guidance - Pet Roguelite Deckbuilder

## Working Agreement

This repository is for a browser-first TypeScript + Vite + Phaser 4 pet-centred roguelite deckbuilder.

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
- Pet upgrades should primarily modify pet behaviour, command-card generation, pet modifiers, evolution paths, side-story unlocks, or combo patterns.
- Avoid permanent progression that only adds raw numbers.

## Design Rules

- Build for emergent combos through tags, statuses, triggers, and modifiers.
- Avoid card logic written as `if card.name === ...`.
- Prefer effects like `damage`, `block`, `draw`, `applyStatus`, `petAttack`, `modifyPetCommand`, and `triggerWhen`.
- Side stories should be data-driven and separate from the main story.

## Testing Expectations

- Add or update tests when modifying `game-core`.
- Test event order, not only final HP or final state.
- Use seeded RNG for random behaviour.
- Do not require Phaser or a browser for core engine tests.

## First Playable Slice

The first playable slice should eventually include:

- One player class.
- One active pet: Ember Fox.
- Basic draw, hand, discard, and energy.
- Normal cards and pet-command cards.
- One or two monsters.
- Damage, block, burn, draw, and end-turn logic.
- One pet upgrade reward.
- One side-story flag.
