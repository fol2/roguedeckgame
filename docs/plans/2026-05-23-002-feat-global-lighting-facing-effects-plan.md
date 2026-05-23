---
title: "feat: Improve 3D Combat Lighting, Facing, and Effects"
type: feat
status: active
date: 2026-05-23
---

# feat: Improve 3D Combat Lighting, Facing, and Effects

## Summary

Replace the current local-light and scale-pulse presentation with a global scene lighting rig, stable actor facing, and a reusable action effect library. The goal is to make real GLB character and monster assets read naturally in combat without resizing them during actions.

---

## Problem Frame

After loading real class and monster GLB assets, the combat scene has three presentation problems: local lights make the assets look uneven, actors do not face each other, and action feedback currently changes model scale. Real authored assets should keep their proportions and use lighting, facing, motion, and separate VFX in a more production-friendly way.

---

## Assumptions

*This plan was authored without synchronous user confirmation. The items below are agent inferences that fill gaps in the input -- un-validated bets that should be reviewed before implementation proceeds.*

- "Only global light" means no actor-local point lights, no spot lights, and no card-action lights attached to individual actors.
- A soft world-wide lighting setup may use ambient, hemisphere, and Drei environment lighting; hard local point/spot lighting should be removed.
- Directional sunlight is also avoided in this pass to respect the user's preference for global lighting only.
- Actor facing should be data-driven enough to adjust per asset if a future GLB uses a different forward axis.
- Action feedback should use movement offsets and separate effect meshes/particles, not scale changes on the real GLB actor group.

---

## Requirements

- R1. Remove local point/spot-style lighting from the combat scene and actors.
- R2. Add a global lighting rig suitable for GLB assets, using scene-wide ambient/hemisphere/environment light.
- R3. Make player and enemy actors face each other in combat and preview states.
- R4. Stop scaling actor models for card/action feedback.
- R5. Add an effect library that maps animation cues to reusable visual effects and motion behaviours.
- R6. Preserve the class/monster GLB asset loading work already present on the branch.
- R7. Verify the scene still builds, tests pass, and browser smoke confirms the game renders and actions update state.

---

## Scope Boundaries

- No scene asset integration in this pass; `assets/scenes/` stays deferred.
- No full animation clip playback from GLB files yet.
- No combat rule changes beyond presentation event consumption.
- No postprocessing pipeline or custom shader authoring unless required for the minimal effect library.
- No asset optimisation or compression work for the large GLB files in this pass.

### Deferred to Follow-Up Work

- Real GLB animation clip mapping per card/action.
- Asset-specific orientation calibration UI or metadata editor.
- Scene PLY/SPZ/mesh integration and collider setup.
- Bundle-size optimisation for production asset delivery.

---

## Context & Research

### Relevant Code and Patterns

- `src/scene/GameCanvas.tsx` currently uses ambient, directional, and point lights.
- `src/scene/CombatScene.tsx` currently adds an actor-local point light and scale pulse through `groupRef.current.scale.setScalar(...)`.
- `src/scene/AssetRenderer.tsx` loads GLB assets and normalises their height; that loading work must be preserved.
- `src/data/assets.ts` already maps two class assets, three monster assets, and one boss asset to GLB sources.

### Institutional Learnings

- The project keeps simulation state in `src/engine/` and presentation in `src/scene/`; this change should stay inside the scene/presentation layer.

### External References

- Three.js examples use HemisphereLight plus DirectionalLight for broad outdoor lighting, and show that shadows need explicit directional-style lights.
- Drei `Environment` provides global environment lighting with presets, background intensity, environment intensity, and environment rotation.
- Three.js GLTF examples commonly use broad scene lighting and environment maps for PBR materials rather than attaching local lights to models.

---

## Key Technical Decisions

- Use a `GlobalLighting` scene component: centralises ambient, hemisphere, and environment lighting so the app does not scatter light choices across actor components.
- Remove actor point lights: action feedback should come from visual effects, not from light sources following actors.
- Disable hard shadow expectations for now: without directional/local lights, contact-like grounding should come from world materials and optional soft fake effects, not shadow maps.
- Add asset-facing metadata: `GameAsset` gets optional `facingRotationY` so model orientation can be corrected without changing loader code.
- Add an effect library: card cues resolve to effect definitions that can drive motion, rings, glows, and particles consistently.
- Animate actor motion without scaling: attacks can lunge, defence can brace, heal can lift slightly, and repeat/action cues can shimmer, while model scale remains stable.

---

## Open Questions

### Resolved During Planning

- Lighting direction: use global scene lighting only in this pass; remove actor point lights and avoid spot lights.
- Action feedback direction: model scale should stay constant; effects and position/rotation motion carry the action read.

### Deferred to Implementation

- Exact `facingRotationY` values: verify visually and adjust in asset metadata based on the actual GLB forward axis.
- Effect intensity values: tune through browser smoke after seeing the real assets.

---

## Implementation Units

### U1. Global Lighting Rig

**Goal:** Replace scattered local lighting with one global lighting component.

**Requirements:** R1, R2, R7

**Dependencies:** None

**Files:**
- Create: `src/scene/GlobalLighting.tsx`
- Modify: `src/scene/GameCanvas.tsx`
- Modify: `src/scene/CombatScene.tsx`

**Approach:**
- Add a scene-wide rig with ambient light, hemisphere light, and Drei `Environment`.
- Remove `pointLight` from `GameCanvas.tsx` and actor-local `pointLight` from `CombatScene.tsx`.
- Remove hard `shadows` settings where they imply unavailable local/directional shadow sources.

**Patterns to follow:**
- Drei `Environment` component for global scene lighting.
- Existing R3F scene-root pattern in `GameCanvas.tsx`.

**Test scenarios:**
- Test expectation: none -- lighting is visual, verified through build and browser smoke.

**Verification:**
- No `pointLight` or `spotLight` remains in scene code.
- App builds and renders without blank canvas.

### U2. Actor Facing Metadata and Placement

**Goal:** Make player and monster assets face each other using data-driven rotation.

**Requirements:** R3, R6, R7

**Dependencies:** U1

**Files:**
- Modify: `src/engine/types.ts`
- Modify: `src/data/assets.ts`
- Modify: `src/scene/AssetRenderer.tsx`
- Modify: `src/scene/CombatScene.tsx`
- Test: `tests/data.test.ts`

**Approach:**
- Add optional `facingRotationY` metadata to actor assets.
- Apply asset-facing rotation inside the asset renderer or actor wrapper without changing combat state.
- Split actor side placement from model orientation so player and enemies can face inward.
- Keep real GLB scaling logic unchanged except where already used for initial normalisation.

**Patterns to follow:**
- Existing asset manifest lookup and catalogue integrity tests.

**Test scenarios:**
- Happy path: every class and encounter GLB actor asset has a facing rotation value.
- Integration: class and encounter asset IDs still resolve to GLB sources after metadata changes.

**Verification:**
- Browser smoke shows player and enemy visually facing each other.

### U3. Reusable Action Effect Library

**Goal:** Add a small reusable library mapping animation cues to non-scaling actor motion and visual effects.

**Requirements:** R4, R5, R7

**Dependencies:** U2

**Files:**
- Create: `src/scene/effects/effectLibrary.ts`
- Create: `src/scene/effects/ActionEffect.tsx`
- Modify: `src/scene/CombatScene.tsx`

**Approach:**
- Define effect entries for `attack`, `super-attack`, `defend`, `shield`, `heal`, `action`, `repeat`, and `destroy`.
- Each effect can define duration, colour, actor position offset, actor rotation offset, ring/glow settings, and particle count.
- Use the latest combat event ID as a trigger key so effects replay only when a new action event arrives.
- Keep model scale fixed at `1`; apply only position/rotation offsets to the actor wrapper.

**Patterns to follow:**
- Renderer consumes engine `CombatEvent` data but does not change combat rules.

**Test scenarios:**
- Test expectation: none -- effect visuals are verified through TypeScript build and browser smoke in this pass.

**Verification:**
- `CombatScene.tsx` no longer changes actor scale for action feedback.
- Playing an attack card produces visible movement/effect without resizing the GLB.

### U4. Verification and PR Update

**Goal:** Verify the visual presentation slice and update the existing branch/PR.

**Requirements:** R6, R7

**Dependencies:** U1, U2, U3

**Files:**
- Modify: `tests/data.test.ts`
- Modify: existing PR body if needed

**Approach:**
- Run catalogue tests and production build.
- Run browser smoke through `agent-browser`: load the page, start combat, play attack, confirm enemy HP updates, and capture non-blank canvas evidence.
- Push the current branch and update the open PR rather than creating a duplicate.

**Patterns to follow:**
- Existing LFG branch/PR workflow on `codex/rogue-deck-engine-foundation`.

**Test scenarios:**
- Integration: browser smoke confirms game renders and card play still works after lighting/effect changes.

**Verification:**
- Tests pass, build passes, browser smoke passes, PR checks pass.

---

## System-Wide Impact

- **Interaction graph:** Only scene presentation changes; engine events remain the source of action cues.
- **Error propagation:** Asset metadata mistakes should surface through tests for missing GLB/facing values.
- **State lifecycle risks:** Effects should be keyed by event ID to avoid looping forever on the last cue.
- **API surface parity:** Card and combat APIs do not change.
- **Integration coverage:** Browser smoke is required because lighting/facing/effects are visual and not meaningfully covered by unit tests.
- **Unchanged invariants:** Class/monster GLB assets remain manifest-driven, and scene assets remain deferred.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Global-only lighting makes models too flat | Use hemisphere and environment intensity tuning rather than actor-local lights. |
| GLB forward axes differ by asset | Add per-asset facing metadata that can be tuned without code changes. |
| Effects become tied to specific cards | Key effects by existing animation cues, not by individual card IDs. |
| Removing scale pulse makes actions less readable | Add separate rings, glows, particles, and small position/rotation motions. |
| Large GLB assets slow visual smoke | Keep smoke focused on first encounter and avoid adding scene assets in this pass. |

---

## Documentation / Operational Notes

- The effect library should be the future extension point for card action presentation.
- Asset-facing metadata should be documented in code through clear field names rather than comments unless the meaning is not obvious.

---

## Sources & References

- Related code: `src/scene/GameCanvas.tsx`
- Related code: `src/scene/CombatScene.tsx`
- Related code: `src/scene/AssetRenderer.tsx`
- Related code: `src/data/assets.ts`
- External docs: [Three.js hemisphere lights example](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_lights_hemisphere.html)
- External docs: [Drei Environment docs](https://github.com/pmndrs/drei/blob/master/docs/staging/environment.mdx)
