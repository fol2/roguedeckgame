# P4-25 Combat Asset Batch 01 Evidence

- `preview-combat-batch-01.png`: production preview browser smoke after selecting a combat node, with a hovered hand card to prove card asset composition/readability.
- `preview-combat-batch-01-cdp-smoke.json`: Chrome DevTools Protocol smoke evidence, including `assets/combat` response counts and browser console status.
- `runtime-asset-gallery.png`: browser-rendered gallery of every Batch 01 registry asset from `vite preview`.
- `runtime-asset-gallery.json`: one-by-one browser decode/render results for every Batch 01 registry asset.
- `runtime-card-integration-dev.png`: Vite dev combat preview proving the approved image-generation card frames, rarity overlays, and card-specific layout metrics render in the live Phaser combat scene.
- `runtime-card-integration-preview-map.png`: Vite preview production-build smoke for the default run-map route.
- `runtime-card-integration-preview-combat-preview-param.png`: Vite preview proof that `combatPreview=1` is intentionally ignored outside dev mode.
- `runtime-card-integration-validation.json`: dimensions and alpha summary for the 11 promoted image-generation runtime assets.
- `asset-png-validation.json`: runtime PNG count, dimensions, RGBA mode, and transparency validation.
- `validation/runtime-integration-*.log`: captured typecheck, Phaser test, and production build output for the runtime integration pass.
- `validation/runtime-integration-test-all.log`: full repo Vitest pass after reducing card tag slots to three.
- `validation/vite-*-runtime-integration*.log`: local Vite server logs used for browser smoke evidence.
