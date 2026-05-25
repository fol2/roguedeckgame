import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const entry = process.argv[2];
const forwardedArgs = process.argv.slice(3);
const validEntries = new Set(["game-cli", "simulate-runs"]);

if (!validEntries.has(entry)) {
  console.error("Usage: node scripts/run-cli-entry.mjs <game-cli|simulate-runs> [args...]");
  process.exit(1);
}

const outDir = mkdtempSync(join(tmpdir(), `roguedeckgame-${entry}-`));
const viteBin = resolve("node_modules", "vite", "bin", "vite.js");

const build = spawnSync(
  process.execPath,
  [viteBin, "build", "--config", "vite.cli.config.ts", "--logLevel", "silent", "--outDir", outDir],
  { stdio: "inherit", shell: false }
);

if (build.status !== 0) {
  rmSync(outDir, { recursive: true, force: true });
  process.exit(build.status ?? 1);
}

const run = spawnSync(
  process.execPath,
  [join(outDir, `${entry}.mjs`), ...forwardedArgs],
  { stdio: "inherit", shell: false }
);

rmSync(outDir, { recursive: true, force: true });
process.exit(run.status ?? 1);
