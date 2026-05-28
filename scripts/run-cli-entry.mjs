import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";

const entry = process.argv[2];
const forwardedArgs = process.argv.slice(3);
const validEntries = new Set(["game-cli", "simulate-runs"]);

if (!validEntries.has(entry)) {
  console.error("Usage: node scripts/run-cli-entry.mjs <game-cli|simulate-runs> [args...]");
  process.exit(1);
}

const viteBin = resolve("node_modules", "vite", "bin", "vite.js");
const cacheRoot = resolve("node_modules", ".cache", "roguedeckgame-cli-entry");
const lockPollMs = 50;
const staleLockMs = 60_000;

const sleepSync = (ms) => {
  const buffer = new SharedArrayBuffer(4);
  Atomics.wait(new Int32Array(buffer), 0, 0, ms);
};

const collectFiles = (root, files = []) => {
  if (!existsSync(root)) {
    return files;
  }

  const stat = statSync(root);
  if (stat.isFile()) {
    files.push(root);
    return files;
  }

  for (const name of readdirSync(root).sort()) {
    const path = join(root, name);
    const childStat = statSync(path);
    if (childStat.isDirectory()) {
      if (name === "node_modules" || name === "dist" || name === "dist-cli" || name === ".git") {
        continue;
      }
      collectFiles(path, files);
    } else if (/\.(ts|js|json|mjs|cjs)$/.test(name)) {
      files.push(path);
    }
  }

  return files;
};

const hashCliInputs = () => {
  const hash = createHash("sha256");
  const roots = [
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "vite.cli.config.ts",
    "src/game-cli",
    "src/game-core"
  ];
  const files = roots.flatMap((root) => collectFiles(resolve(root))).sort();

  for (const file of files) {
    hash.update(relative(process.cwd(), file));
    hash.update("\0");
    hash.update(readFileSync(file));
    hash.update("\0");
  }

  return hash.digest("hex").slice(0, 16);
};

const cacheKey = hashCliInputs();
const outDir = join(cacheRoot, cacheKey);
const lockDir = `${outDir}.lock`;
const lockOwnerPath = join(lockDir, "owner.json");
const markerPath = join(outDir, ".complete.json");

const isCacheReady = () =>
  existsSync(markerPath) &&
  existsSync(join(outDir, "game-cli.mjs")) &&
  existsSync(join(outDir, "simulate-runs.mjs"));

const lockToken = randomUUID();

const isProcessAlive = (pid) => {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return Boolean(error && error.code === "EPERM");
  }
};

const readLockOwner = () => {
  if (!existsSync(lockOwnerPath)) {
    return undefined;
  }

  try {
    return JSON.parse(readFileSync(lockOwnerPath, "utf8"));
  } catch {
    return undefined;
  }
};

const writeLockOwner = () => {
  writeFileSync(lockOwnerPath, JSON.stringify({
    pid: process.pid,
    token: lockToken,
    cacheKey,
    createdAt: new Date().toISOString()
  }, null, 2));
};

const releaseBuildLock = () => {
  const owner = readLockOwner();
  if (owner?.token === lockToken && owner?.pid === process.pid) {
    rmSync(lockDir, { recursive: true, force: true });
  }
};

const removeStaleLock = () => {
  if (!existsSync(lockDir)) {
    return false;
  }

  const ageMs = Date.now() - statSync(lockDir).mtimeMs;
  const owner = readLockOwner();
  if (owner && isProcessAlive(owner.pid)) {
    return false;
  }

  if (ageMs < staleLockMs) {
    return false;
  }

  rmSync(lockDir, { recursive: true, force: true });
  return true;
};

const acquireBuildLock = () => {
  mkdirSync(cacheRoot, { recursive: true });

  while (true) {
    if (isCacheReady()) {
      return false;
    }

    try {
      mkdirSync(lockDir);
      writeLockOwner();
      return true;
    } catch (error) {
      if (!error || error.code !== "EEXIST") {
        throw error;
      }
      removeStaleLock();
      if (isCacheReady()) {
        return false;
      }
      sleepSync(lockPollMs);
    }
  }
};

const ensureCachedCliBuild = () => {
  const hasLock = acquireBuildLock();
  if (!hasLock) {
    return 0;
  }

  const tmpOutDir = `${outDir}.tmp-${process.pid}-${Date.now()}`;
  try {
    if (isCacheReady()) {
      return 0;
    }

    rmSync(tmpOutDir, { recursive: true, force: true });
    const build = spawnSync(
      process.execPath,
      [viteBin, "build", "--config", "vite.cli.config.ts", "--logLevel", "silent", "--outDir", tmpOutDir],
      { stdio: "inherit", shell: false }
    );

    if (build.status !== 0) {
      return build.status ?? 1;
    }

    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(dirname(outDir), { recursive: true });
    renameSync(tmpOutDir, outDir);
    writeFileSync(markerPath, JSON.stringify({ cacheKey, createdAt: new Date().toISOString() }, null, 2));
    return 0;
  } finally {
    rmSync(tmpOutDir, { recursive: true, force: true });
    releaseBuildLock();
  }
};

const buildStatus = ensureCachedCliBuild();
if (buildStatus !== 0) {
  process.exit(buildStatus);
}

const run = spawnSync(process.execPath, [join(outDir, `${entry}.mjs`), ...forwardedArgs], {
  stdio: "inherit",
  shell: false
});

process.exit(run.status ?? 1);
