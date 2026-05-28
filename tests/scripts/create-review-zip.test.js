import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  findNestedRepoArchiveEntries,
  listZipEntries,
  shouldExcludeFilesystemReviewPath,
  shouldIncludeFilesystemReviewPath
} from "../../scripts/create-review-zip.mjs";

const reviewZipScriptPath = fileURLToPath(new URL("../../scripts/create-review-zip.mjs", import.meta.url));

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

  it("excludes dependency, build, zip, and archived contract paths in filesystem fallback mode", () => {
    expect(shouldExcludeFilesystemReviewPath("node_modules/vitest/index.js")).toBe(true);
    expect(shouldExcludeFilesystemReviewPath("dist/assets/index.js")).toBe(true);
    expect(shouldExcludeFilesystemReviewPath("dist-cli/game-cli.mjs")).toBe(true);
    expect(shouldExcludeFilesystemReviewPath("docs/contracts/p2/snapshot/src/game-core/index.ts")).toBe(true);
    expect(shouldExcludeFilesystemReviewPath(".env.local")).toBe(true);
    expect(shouldExcludeFilesystemReviewPath(".npmrc")).toBe(true);
    expect(shouldExcludeFilesystemReviewPath("debug.log")).toBe(true);
    expect(shouldExcludeFilesystemReviewPath("docs/private/client.key")).toBe(true);
    expect(shouldExcludeFilesystemReviewPath("scripts/credentials.json")).toBe(true);
    expect(shouldExcludeFilesystemReviewPath("src/local-token.pem")).toBe(true);
    expect(shouldExcludeFilesystemReviewPath("roguedeckgame-review-old.zip")).toBe(true);
    expect(shouldExcludeFilesystemReviewPath("src/game-phaser/scenes/CombatScene.ts")).toBe(false);
    expect(shouldExcludeFilesystemReviewPath("docs/contracts/combat-ui-asset-manifest-v0.1.md")).toBe(false);
  });

  it("only includes tracked-shape source, test, script, doc, and config paths in filesystem fallback mode", () => {
    expect(shouldIncludeFilesystemReviewPath("package.json")).toBe(true);
    expect(shouldIncludeFilesystemReviewPath("src/game-core/index.ts")).toBe(true);
    expect(shouldIncludeFilesystemReviewPath("tests/game-core/combat-turn.test.ts")).toBe(true);
    expect(shouldIncludeFilesystemReviewPath("tests-integration/localhost/vite-preview.integration.test.ts")).toBe(true);
    expect(shouldIncludeFilesystemReviewPath("docs/contracts/combat-ui-asset-manifest-v0.1.md")).toBe(true);
    expect(shouldIncludeFilesystemReviewPath("src/game-core/content.json")).toBe(true);
    expect(shouldIncludeFilesystemReviewPath(".env.local")).toBe(false);
    expect(shouldIncludeFilesystemReviewPath("notes.txt")).toBe(false);
    expect(shouldIncludeFilesystemReviewPath("src/local-token.pem")).toBe(false);
    expect(shouldIncludeFilesystemReviewPath("coverage/index.html")).toBe(false);
  });

  it("creates a no-git fallback ZIP without local, sensitive, or archived contract files", () => {
    const tempRoot = join(tmpdir(), `roguedeckgame-review-fallback-${process.pid}-${Date.now()}`);
    const projectRoot = join(tempRoot, "review-fixture");

    try {
      mkdirSync(join(projectRoot, "src/game-core"), { recursive: true });
      mkdirSync(join(projectRoot, "src/secrets"), { recursive: true });
      mkdirSync(join(projectRoot, "scripts"), { recursive: true });
      mkdirSync(join(projectRoot, "docs/private"), { recursive: true });
      mkdirSync(join(projectRoot, "docs/contracts/p2/snapshot/src"), { recursive: true });
      mkdirSync(join(projectRoot, "docs/contracts"), { recursive: true });
      writeFileSync(join(projectRoot, "package.json"), "{\"name\":\"review-fixture\"}\n");
      writeFileSync(join(projectRoot, "src/game-core/index.ts"), "export const ok = true;\n");
      writeFileSync(join(projectRoot, "docs/contracts/combat-ui-asset-manifest-v0.1.md"), "# Manifest\n");
      writeFileSync(join(projectRoot, "docs/contracts/p2/snapshot/package.json"), "{}\n");
      writeFileSync(join(projectRoot, ".env.local"), "TOKEN=do-not-archive\n");
      writeFileSync(join(projectRoot, ".npmrc"), "//registry.example/:_authToken=do-not-archive\n");
      writeFileSync(join(projectRoot, "debug.log"), "local log\n");
      writeFileSync(join(projectRoot, "notes.txt"), "local scratch\n");
      writeFileSync(join(projectRoot, "docs/private/client.key"), "do-not-archive\n");
      writeFileSync(join(projectRoot, "scripts/credentials.json"), "{}\n");
      writeFileSync(join(projectRoot, "src/local-token.pem"), "do-not-archive\n");
      writeFileSync(join(projectRoot, "src/secrets/service-account.json"), "{}\n");

      const result = spawnSync(process.execPath, [reviewZipScriptPath], {
        cwd: projectRoot,
        encoding: "utf8",
        shell: false
      });

      expect(result.status, result.stderr || result.stdout).toBe(0);
      const outputPath = join(dirname(projectRoot), "review-fixture-review-working-tree.zip");
      const entries = listZipEntries(outputPath).join("\n");

      expect(entries).toContain("review-fixture-working-tree/package.json");
      expect(entries).toContain("review-fixture-working-tree/src/game-core/index.ts");
      expect(entries).toContain("review-fixture-working-tree/docs/contracts/combat-ui-asset-manifest-v0.1.md");
      expect(entries).not.toContain(".env.local");
      expect(entries).not.toContain(".npmrc");
      expect(entries).not.toContain("debug.log");
      expect(entries).not.toContain("notes.txt");
      expect(entries).not.toContain("client.key");
      expect(entries).not.toContain("credentials.json");
      expect(entries).not.toContain("local-token.pem");
      expect(entries).not.toContain("service-account.json");
      expect(entries).not.toContain("docs/contracts/p2/");
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

});
