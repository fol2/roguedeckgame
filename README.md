# Rogue Deck Game

Fantasy deck battler prototype built with React, TypeScript, and React Three Fiber.

## Run

```bash
npm install
npm run dev
```

## Verify

```bash
npm test
npm run build
```

## Engine shape

- `src/data/` contains the card, class, encounter, and asset catalogues.
- `src/engine/` contains renderer-free combat rules and deck handling.
- `src/scene/` contains the React Three Fiber scene and asset renderer boundaries.
- `src/ui/` contains the DOM combat interface.

Cards resolve through engine events, so future GLB animations, SPZ/PLY world scenes, and collider meshes can attach to stable manifest keys rather than card-specific component code.
