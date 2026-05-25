# Engineering Contract v1.2 — Phase 1 Closeout Patch

## Objective

Close Phase 1 by fixing validation and reporting drift discovered after Ticket 11, without adding new gameplay features.

This is a hardening patch only. It must make the repository and generated review ZIP validate consistently across environments, especially when files are extracted with CRLF line endings.

## Current Baseline

Latest observed pushed commit:

```txt
480f996bf34ecaf81e52bd3d25c0180570f43014
```

Current functional state:

- Ticket 0 through Ticket 11 are implemented.
- Ticket 11 adds first elite / boss vertical-slice content and Phaser placeholder polish.
- GitHub completion report claims `npm test` passed as 49 files / 394 tests.
- The review ZIP named `roguedeckgame-review-480f996bf34e.zip` extracts successfully, but exact ZIP validation exposed CRLF-sensitive boundary tests.

## Discovered Gap

When validating the uploaded review ZIP in a clean environment:

```txt
npm ci: passed
npm run typecheck: passed
npm test: failed
```

Failure details:

- 49 test files were discovered.
- 395 tests were discovered.
- 5 tests failed.
- Failures were in static Phaser boundary tests.
- The failures were caused by regex assertions expecting `\n` only, while the ZIP extracted source files contained CRLF line endings.
- After normalizing text files from CRLF to LF, the same ZIP passed all tests: 49 files / 395 tests.

This means the implementation is functionally complete, but the review artifact is not fully portable and the completion report is stale.

## Scope

Patch only these areas:

1. Make static source boundary tests line-ending agnostic.
2. Add repository-level line-ending policy to prevent future drift.
3. Update completion report / closeout evidence for Ticket 11.
4. Regenerate review ZIP from clean HEAD.
5. Confirm exact ZIP validation passes without manual normalization.

## Required File Changes

Expected files to update or add:

```txt
.gitattributes

tests/game-phaser/combat-scene-boundary.test.ts
tests/game-phaser/map-scene-boundary.test.ts
tests/game-phaser/reward-scene-boundary.test.ts

// optional, only if the same pattern exists elsewhere
tests/**/*.test.ts

docs/contracts/11-first-boss-vertical-slice-polish-completion-report.md
docs/contracts/phase1-closeout-patch-completion-report.md
```

Do not touch core gameplay systems unless required by a failing test unrelated to line endings.

## Required Fixes

### 1. Normalize raw-source test input

For any test that reads a source file and asserts multi-line text, normalize line endings before regex checks.

Preferred helper:

```ts
const normaliseLineEndings = (source: string): string => source.replace(/\r\n/g, "\n");
```

Use it immediately after `readFile` in the affected tests.

Alternative acceptable fix:

```ts
/\r?\n/
```

But prefer normalizing source once because it keeps assertions readable.

### 2. Add `.gitattributes`

Add or update `.gitattributes` to keep text files stable.

Recommended baseline:

```gitattributes
* text=auto eol=lf

*.ts text eol=lf
*.tsx text eol=lf
*.js text eol=lf
*.mjs text eol=lf
*.json text eol=lf
*.md text eol=lf
*.html text eol=lf
*.css text eol=lf
*.yml text eol=lf
*.yaml text eol=lf
```

Do not add platform-specific binary rules unless needed.

### 3. Update Ticket 11 completion report

Update `docs/contracts/11-first-boss-vertical-slice-polish-completion-report.md` so it reflects the final pushed closeout state.

It should mention:

- final pushed SHA
- review ZIP path
- exact final test count
- line-ending robustness fix
- `npm test` passes from clean checkout / extracted review ZIP
- `git diff --check` passes
- contract copy compare passes
- `npm run build` passes
- `npm audit --audit-level=moderate` passes
- production dependency remains only `phaser@4.1.0`

### 4. Add Phase 1 closeout report

Create:

```txt
docs/contracts/phase1-closeout-patch-completion-report.md
```

It should briefly confirm:

- Ticket 0-11 are complete.
- The only closeout patch was test/report portability hardening.
- No new gameplay feature was added.
- Review ZIP validates without manual normalization.
- Phase 1 is ready to archive as complete.

## Verification Commands

Run from clean repository checkout:

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run smoke:localhost
npm audit --audit-level=moderate
git diff --check
git diff --no-index docs/contracts/11-first-boss-vertical-slice-polish-contract.md docs/contracts/11-first-boss-vertical-slice-polish.md
npm ls phaser vite --depth=0
npm ls --depth=0 --omit=dev
npm run zip:review
```

Then validate the generated ZIP artifact separately:

```bash
rm -rf /tmp/roguedeckgame-review
mkdir -p /tmp/roguedeckgame-review
unzip -q <generated-review-zip> -d /tmp/roguedeckgame-review
cd /tmp/roguedeckgame-review/<extracted-folder>
npm ci
npm run typecheck
npm test
npm run build
npm run smoke:localhost
npm audit --audit-level=moderate
```

The ZIP validation must pass without running any line-ending normalization script.

## Expected Validation Output

Report:

1. Final pushed commit SHA.
2. Generated review ZIP path.
3. Whether exact ZIP validation passed.
4. `npm test` final file/test count.
5. `npm run build` result.
6. `npm audit --audit-level=moderate` result.
7. Production dependency result.
8. Confirmation that no gameplay features were added.
9. Confirmation that `src/game-core` still has no Phaser, app, presentation, browser storage, or direct `Math.random()` references.
10. Confirmation that Phase 1 is ready to mark complete.

## Non-Goals

Do not add Phase 2 features.
Do not add new cards, pets, monsters, bosses, rewards, map nodes, save features, or story content.
Do not add final art, audio, or visual polish.
Do not refactor the game-core architecture.
Do not add dependencies.
Do not add browser automation.
Do not change gameplay balance.

## Acceptance Criteria

Phase 1 closeout is green only when:

- Clean repo validation passes.
- Generated ZIP validation passes without manual line-ending normalization.
- Ticket 11 report matches final reality.
- No new gameplay scope was introduced.
