---
status: active
created: 2026-05-24
type: docs
origin: docs/contracts/0-skills.md
---

# Bootstrap Codex Skills And Project Guidance

## Problem Frame

The repository has been archived down to a fresh `archive/` root and needs durable guidance before new game work starts. The contract in `docs/contracts/0-skills.md` requires repo-scoped Codex skills, root project guidance, and a short usage document. This task must not build the game engine, scaffold Phaser, install dependencies, or create production code.

## Scope

Implement the documentation and skill bootstrap only:

- Add root `AGENTS.md` with project-wide guidance for a browser-first TypeScript, Vite, Phaser 4 pet roguelite deckbuilder.
- Add six repo-scoped skills under `.agents/skills/`.
- Add `docs/codex-skills.md` with practical skill usage guidance and example prompts.
- Keep `docs/contracts/0-skills.md` as the source contract.

Out of scope:

- No Phaser scaffold.
- No combat or `src/game-core` implementation.
- No npm dependency or lockfile changes.
- No save system.
- No game art or asset generation.

## Key Decisions

- Use repo-scoped skills in `.agents/skills/` so the guidance follows this game repo.
- Keep each `SKILL.md` concise and triggerable from its YAML description.
- Preserve the core architecture boundary: `src/game-core` is deterministic game logic; `src/game-phaser` is presentation.
- Model Phase 1 as one active pet while keeping all guidance multi-pet ready through arrays such as `activePetInstanceIds` or `petSlots`.

## Implementation Units

1. Root project guidance
   - Files: `AGENTS.md`
   - Content: working agreement, architecture rules, pet system rules, design rules, testing expectations, first playable slice.

2. Repo-scoped Codex skills
   - Files:
     - `.agents/skills/game-architecture-guard/SKILL.md`
     - `.agents/skills/pet-system-designer/SKILL.md`
     - `.agents/skills/combat-engine-test-writer/SKILL.md`
     - `.agents/skills/phaser-presentation-builder/SKILL.md`
     - `.agents/skills/content-author/SKILL.md`
     - `.agents/skills/story-event-author/SKILL.md`
   - Content: contract-provided skill frontmatter and concise workflow guidance.

3. Skill usage documentation
   - Files: `docs/codex-skills.md`
   - Content: when to use each skill, example prompts, reminders that Phaser is presentation only and Phase 1 remains multi-pet ready.

## Verification

- Show the created file tree for `AGENTS.md`, `.agents/skills/`, and docs.
- Print the first 20 lines of each `SKILL.md`.
- Confirm no production dependency changes.
- Confirm no game engine implementation was created.
- Confirm the guidance explicitly mentions future multi-pet support.
