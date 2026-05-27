import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { findNestedRepoArchiveEntries } from "../../scripts/create-review-zip.mjs";

const listFiles = (root, current = root) => {
  const entries = readdirSync(current, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const path = join(current, entry.name);

    if (entry.isDirectory()) {
      return listFiles(root, path);
    }

    return statSync(path).isFile() ? [relative(root, path)] : [];
  });
};

describe("review ZIP nested archive guard", () => {
  it("rejects repo-shaped contract snapshots under docs/contracts", () => {
    const entries = [
      "roguedeckgame-abc123/docs/contracts/p2/16-roguedeckgame-e38efe7add57/src/game-core/index.ts",
      "roguedeckgame-abc123/docs/contracts/p2/16-roguedeckgame-e38efe7add57/tests/game-core/run.test.ts",
      "roguedeckgame-abc123/docs/contracts/p2/16-roguedeckgame-e38efe7add57/.github/workflows/ci.yml",
      "roguedeckgame-abc123/docs/contracts/p2/16-roguedeckgame-e38efe7add57/package.json",
      "docs/contracts/p2/16-roguedeckgame-e38efe7add57/src/game-core/index.ts",
      "roguedeckgame-abc123/src/game-core/index.ts"
    ].join("\n");

    expect(findNestedRepoArchiveEntries(entries)).toEqual([
      "roguedeckgame-abc123/docs/contracts/p2/16-roguedeckgame-e38efe7add57/src/game-core/index.ts",
      "roguedeckgame-abc123/docs/contracts/p2/16-roguedeckgame-e38efe7add57/tests/game-core/run.test.ts",
      "roguedeckgame-abc123/docs/contracts/p2/16-roguedeckgame-e38efe7add57/.github/workflows/ci.yml",
      "roguedeckgame-abc123/docs/contracts/p2/16-roguedeckgame-e38efe7add57/package.json",
      "docs/contracts/p2/16-roguedeckgame-e38efe7add57/src/game-core/index.ts"
    ]);
  });

  it("allows normal repo source entries and contract reports", () => {
    const entries = [
      "roguedeckgame-abc123/src/game-core/index.ts",
      "roguedeckgame-abc123/tests/game-core/run.test.ts",
      "roguedeckgame-abc123/docs/contracts/p2/16-roguedeckgame-e38efe7add57/completion-report.md",
      "roguedeckgame-abc123/docs/contracts/p2/16-roguedeckgame-e38efe7add57/preview.png"
    ].join("\n");

    expect(findNestedRepoArchiveEntries(entries)).toEqual([]);
  });

  it("keeps tracked contract docs free of nested repo-shaped snapshots", () => {
    const contractEntries = listFiles(process.cwd(), join(process.cwd(), "docs/contracts"))
      .map((entry) => entry.replaceAll("\\", "/"))
      .join("\n");

    expect(findNestedRepoArchiveEntries(contractEntries)).toEqual([]);
  });
});
