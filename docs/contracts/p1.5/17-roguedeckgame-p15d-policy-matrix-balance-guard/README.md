# Phase 1.5d Policy Matrix Balance Guard Patch

This package validates `roguedeckgame-review-e38efe7add57.zip` and adds a small engine-only balance harness improvement.

Apply from the repository root:

```bash
patch -p1 < phase-1.5d-policy-matrix.patch
npm ci
npm run typecheck
npm test
npm run build
npm run build:cli
npm run sim:balance
npm run sim:matrix
```

New useful commands:

```bash
npm run sim:matrix
npm run sim:analyze -- --policy greedyDamage --invalid-action-rate 0
npm run sim:analyze -- --policy defensive --invalid-action-rate 0
```

The patch does not add UI/UX, Playwright, art, animation, dependencies, or gameplay content. It adds policy profiles and matrix reporting so balance can be discussed before and after Phase 2 implementation.
