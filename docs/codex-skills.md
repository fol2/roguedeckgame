# Codex Skills

This repo uses project-scoped Codex skills in `.agents/skills/` to keep future work aligned with the pet-centred roguelite deckbuilder architecture.

Phase 1 may support only one active pet, but models and layouts must remain ready for multiple active pets. Phaser is the presentation layer only; deterministic gameplay rules belong in `src/game-core`.

## Skill Guide

- `$game-architecture-guard`: Use when designing or changing module boundaries, game-core structure, event flows, deterministic systems, or Phaser integration points.
- `$pet-system-designer`: Use when modelling pet definitions, pet instances, pet slots, command cards, upgrades, bond, evolution, or multi-pet rules.
- `$combat-engine-test-writer`: Use when changing combat resolution, card effects, pet-command effects, status effects, energy, draw/discard, RNG, monster actions, or event ordering.
- `$phaser-presentation-builder`: Use when building Phaser scenes, presenters, layouts, input handling, combat visuals, card animation, pet animation, or event playback.
- `$content-author`: Use when creating cards, pet-command cards, starter decks, monsters, bosses, rewards, upgrades, relics, statuses, tags, or balance data.
- `$story-event-author`: Use when creating pet side stories, story flags, memories, event requirements, quest state, evolution gates, or narrative content structure.

## Example Prompts

```text
Use $game-architecture-guard to design the initial game-core folder structure.
```

```text
Use $pet-system-designer and $content-author to define Ember Fox, its pet-command cards, and three pet upgrades.
```

```text
Use $combat-engine-test-writer to implement deterministic tests for playing a pet-command card.
```

```text
Use $phaser-presentation-builder to create a placeholder CombatScene that animates GameEvent objects.
```

```text
Use $story-event-author to define the first Ember Fox side-story flag and memory unlock requirements.
```

## Reminders

- Do not import Phaser from `src/game-core`.
- Do not put card, pet, monster, reward, RNG, or story resolution logic inside Phaser scenes.
- Use typed `GameEvent` objects so the visual layer can animate deterministic engine output.
- Use arrays such as `activePetInstanceIds` or `petSlots` even when Phase 1 restricts `maxActivePets` to 1.
- Prefer data-driven definitions and tags over card-name-specific logic.
