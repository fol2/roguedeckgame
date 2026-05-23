---
title: "feat: Optimise Runtime GLB Assets"
type: feat
status: active
date: 2026-05-23
---

# feat: Optimise Runtime GLB Assets

## Summary

Create a clean runtime asset delivery path for the class and monster GLB files. The branch must avoid merging raw high-polygon GLB history, carry forward the current 3D presentation work, and ship optimised browser-ready GLB files that load without adding Draco, Meshopt, or KTX2 decoder requirements.

---

## Problem Frame

The current class and monster GLB files are raw exports: the two class assets are around 27-28 MB each and roughly 495k-500k triangles each, while the monster and boss assets are around 88-98 MB each and roughly 1.49M-1.50M triangles each. PR #2 already contains those raw binaries in its commit history, so adding smaller files on top of that PR would still merge the large blobs. The fix needs a clean branch from `origin/main` with only optimised runtime assets committed.

---

## Assumptions

*This plan was authored without synchronous user confirmation. The items below are agent inferences that fill gaps in the input -- un-validated bets that should be reviewed before implementation proceeds.*

- The source/raw GLB files can be used locally as input, but should not be committed on the new branch.
- Browser runtime compatibility is more important than maximum compression for this pass.
- Geometry simplification and texture resizing/compression are acceptable for the current prototype assets.
- Draco, Meshopt, and KTX2/BasisU compression should be deferred until the loader is explicitly configured and tested for those decoder paths.
- `assets/scenes/` and `assets/monsters/images/` remain out of scope for this pass.

---

## Requirements

- R1. Create a new clean branch from `origin/main` so raw GLB history from PR #2 is not carried forward.
- R2. Preserve the existing 3D class/monster asset loading, global lighting, actor-facing, and action-effect code from PR #2.
- R3. Add a repeatable asset optimisation path using glTF Transform.
- R4. Produce optimised runtime GLB files for the two class assets, three monster assets, and one boss asset.
- R5. Avoid Draco, Meshopt, and KTX2/BasisU output in this pass unless matching Three.js loader decoder support is added and verified.
- R6. Keep raw/source assets out of git and document or encode where future raw inputs should live.
- R7. Verify file size, triangle count, tests, production build, and browser smoke.

---

## Scope Boundaries

- No scene PLY/SPZ/mesh integration in this pass.
- No collider generation or physics collision proxies in this pass.
- No GLB animation clip mapping.
- No manual Blender/DCC retopology; optimisation is automated from the provided GLB files.
- No Draco, Meshopt, or KTX2/BasisU runtime decoder integration in this pass.
- No changes to card/combat rules.

### Deferred to Follow-Up Work

- Artist-authored low-poly or mid-poly source assets.
- Asset-specific LODs and collision proxy meshes.
- Draco/Meshopt/KTX2 compression after loader support and decode-time budgets are tested.
- Scene asset optimisation and collider import for `assets/scenes/`.

---

## Context & Research

### Relevant Code and Patterns

- `src/data/assets.ts` maps class and encounter assets to GLB URLs.
- `src/scene/AssetRenderer.tsx` loads GLB assets and normalises their visual height.
- `src/scene/CombatScene.tsx`, `src/scene/GlobalLighting.tsx`, and `src/scene/effects/*` contain the presentation work that should be preserved without raw GLB history.
- `tests/data.test.ts` is the current catalogue integrity test boundary.
- `.gitignore` already excludes build and local TypeScript artefacts; it should also exclude local raw asset inputs.

### External References

- glTF Transform CLI supports `inspect`, `dedup`, `prune`, `weld`, `simplify`, `resize`, and `webp` as individual commands.
- glTF Transform documentation recommends welding before simplification for better geometry reduction.
- Three.js `GLTFLoader` requires explicit decoder configuration for Draco, Meshopt, and KTX2-compressed assets.
- WebP texture output uses browser-native image support rather than a custom mesh or texture decoder.

---

## Key Technical Decisions

- Start from `origin/main` on a new branch: this avoids raw binary history from PR #2 and makes the new PR safe to merge.
- Reapply the current asset-loading and presentation code without raw GLB files: the new PR supersedes PR #2 rather than layering on top of it.
- Add `@gltf-transform/cli` as a development dependency and an optimisation script: future asset refreshes should be reproducible rather than ad hoc.
- Use an automated no-decoder pipeline first: `dedup`, `prune`, `weld`, `simplify`, `resize`, and WebP texture conversion reduce runtime payload without requiring loader changes.
- Store raw inputs outside committed runtime paths: local source assets can live under an ignored raw-assets directory or temporary directory, while committed files under `assets/class/` and `assets/monsters/` are runtime-ready outputs.

---

## Open Questions

### Resolved During Planning

- Best format to commit now: optimised GLB, because it matches the existing React Three Fiber/Three.js loader.
- Whether one scene needs PLY/SPZ/collider mesh together: not part of this pass; class and monster GLB optimisation is the target.
- Whether to use mesh compression immediately: defer, because Draco/Meshopt require loader decoder configuration and extra browser validation.

### Deferred to Implementation

- Exact simplification ratios per asset: tune from `inspect` results and runtime visual smoke.
- Whether WebP texture output is enough on its own or needs a later KTX2 pass for GPU memory.

---

## Implementation Units

### U1. Clean Branch and Presentation Carry-Forward

**Goal:** Build the new work on a clean branch while preserving the current GLB loading, lighting, facing, and effects code.

**Requirements:** R1, R2, R7

**Dependencies:** None

**Files:**
- Modify: `.gitignore`
- Modify: `src/data/assets.ts`
- Modify: `src/engine/types.ts`
- Modify: `src/scene/AssetRenderer.tsx`
- Modify: `src/scene/CombatScene.tsx`
- Modify: `src/scene/GameCanvas.tsx`
- Modify: `src/scene/WorldScene.tsx`
- Create: `src/scene/GlobalLighting.tsx`
- Create: `src/scene/effects/ActionEffect.tsx`
- Create: `src/scene/effects/effectLibrary.ts`
- Modify: `tests/data.test.ts`

**Approach:**
- Save local raw GLB inputs outside the git branch.
- Generate a code-only patch from the previous presentation branch, excluding raw class and monster GLB files.
- Create a new branch from `origin/main`.
- Apply the code-only patch and keep out-of-scope scene/image files untracked.

**Patterns to follow:**
- Existing asset manifest and scene component split from PR #2.
- Existing test style in `tests/data.test.ts`.

**Test scenarios:**
- Catalogue test still confirms class and encounter assets resolve to GLB URLs.
- Static search confirms no point/spot lighting or actor scale pulse regressed from the previous presentation work.

**Verification:**
- `git log` for the new branch does not include the raw-asset commit from PR #2.
- `git diff --name-status origin/main...HEAD` shows optimised GLB additions only after U3.

### U2. Repeatable GLB Optimisation Script

**Goal:** Add a reproducible pipeline for optimising raw class and monster GLB inputs into runtime GLB outputs.

**Requirements:** R3, R5, R6, R7

**Dependencies:** U1

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `scripts/optimise-gltf-assets.mjs`
- Modify: `.gitignore`

**Approach:**
- Add `@gltf-transform/cli` as a dev dependency.
- Add an npm script that reads raw inputs from an ignored source directory or an environment-supplied source directory.
- Encode per-asset simplification targets and texture-size targets in the script.
- Use commands that do not require custom runtime decoder configuration: `dedup`, `prune`, `weld`, `simplify`, `resize`, and `webp`.

**Patterns to follow:**
- Existing npm script style in `package.json`.

**Test scenarios:**
- Missing raw source directory exits with a clear non-zero error.
- A full run writes all six runtime GLB outputs.
- Re-running the script overwrites runtime outputs deterministically.

**Verification:**
- `npm run assets:optimise -- --source <raw-source-dir>` completes.
- The output `inspect` report contains no Draco, Meshopt, or KTX2 required extensions.

### U3. Optimised Runtime Asset Outputs

**Goal:** Commit the optimised class, monster, and boss GLB files under the runtime asset paths.

**Requirements:** R4, R5, R7

**Dependencies:** U2

**Files:**
- Create: `assets/class/actor-iron-warden.glb`
- Create: `assets/class/actor-spellblade.glb`
- Create: `assets/monsters/boss-obsidian-drake.glb`
- Create: `assets/monsters/monster-ashen-goblin.glb`
- Create: `assets/monsters/monster-crystal-wolf.glb`
- Create: `assets/monsters/monster-mire-shaman.glb`

**Approach:**
- Use the optimisation script to generate committed runtime outputs.
- Inspect before/after file size and triangle count.
- Tune class, monster, and boss simplification ratios separately if needed.

**Patterns to follow:**
- Existing asset filenames and manifest IDs.

**Test scenarios:**
- Every manifest entry points to an existing committed GLB.
- Output triangle counts are materially lower than raw inputs.
- Output file sizes are materially lower than raw inputs.

**Verification:**
- `du -h assets/class/*.glb assets/monsters/*.glb` shows reduced payloads.
- `npx gltf-transform inspect` confirms reduced primitive counts and no decoder-only compression.

### U4. Build, Browser Smoke, PR, and CI

**Goal:** Prove the optimised asset branch works in the browser and publish it as the merge candidate.

**Requirements:** R2, R7

**Dependencies:** U1, U2, U3

**Files:**
- Modify: PR body for the new branch.

**Approach:**
- Run unit tests and production build.
- Start the local Vite app and run browser smoke: load game, choose a class, start combat, play an attack card, confirm state updates and non-blank 3D render.
- Open a new PR and mark PR #2 as superseded in the new PR body.
- Watch CI and fix failures within the LFG loop.

**Patterns to follow:**
- Previous LFG browser smoke flow.
- Existing GitHub PR workflow for this repository.

**Test scenarios:**
- Browser renders a non-blank 3D scene with optimised assets.
- Starting combat and playing a card still updates enemy HP/log state.
- Build output includes the optimised GLB assets, not raw GLB history.

**Verification:**
- `npm test`
- `npm run build`
- Browser smoke via the in-app browser.
- `gh pr checks --watch`

---

## Final Handoff Criteria

- New clean branch pushed with a PR opened.
- PR body includes before/after asset-size and primitive-count evidence.
- PR #2 is clearly superseded and should not be merged.
- Tests, build, browser smoke, and CI status are reported truthfully.
- Residual actionable work is either none or durably recorded.
