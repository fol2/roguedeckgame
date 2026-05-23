import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = resolveSourceDir();
const workDir = mkdtempSync(path.join(tmpdir(), "roguedeck-gltf-"));
const gltfTransform = path.join(
  repoRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "gltf-transform.cmd" : "gltf-transform",
);

const assets = [
  {
    id: "actor-iron-warden",
    relativePath: "class/actor-iron-warden.glb",
    outputPath: "assets/class/actor-iron-warden.glb",
    ratio: "0.16",
    error: "0.008",
    textureSize: "1024",
  },
  {
    id: "actor-spellblade",
    relativePath: "class/actor-spellblade.glb",
    outputPath: "assets/class/actor-spellblade.glb",
    ratio: "0.16",
    error: "0.008",
    textureSize: "1024",
  },
  {
    id: "boss-obsidian-drake",
    relativePath: "monsters/boss-obsidian-drake.glb",
    outputPath: "assets/monsters/boss-obsidian-drake.glb",
    ratio: "0.10",
    error: "0.012",
    textureSize: "1024",
  },
  {
    id: "monster-ashen-goblin",
    relativePath: "monsters/monster-ashen-goblin.glb",
    outputPath: "assets/monsters/monster-ashen-goblin.glb",
    ratio: "0.07",
    error: "0.014",
    textureSize: "1024",
  },
  {
    id: "monster-crystal-wolf",
    relativePath: "monsters/monster-crystal-wolf.glb",
    outputPath: "assets/monsters/monster-crystal-wolf.glb",
    ratio: "0.07",
    error: "0.014",
    textureSize: "1024",
  },
  {
    id: "monster-mire-shaman",
    relativePath: "monsters/monster-mire-shaman.glb",
    outputPath: "assets/monsters/monster-mire-shaman.glb",
    ratio: "0.07",
    error: "0.014",
    textureSize: "1024",
  },
];

try {
  assertReady();

  for (const asset of assets) {
    optimiseAsset(asset);
  }
} finally {
  rmSync(workDir, { recursive: true, force: true });
}

function resolveSourceDir() {
  const sourceFlagIndex = process.argv.indexOf("--source");

  if (sourceFlagIndex !== -1) {
    const value = process.argv[sourceFlagIndex + 1];

    if (!value || value.startsWith("--")) {
      throw new Error("Missing value for --source.");
    }

    return path.resolve(value);
  }

  if (process.env.ROGUEDECK_RAW_ASSETS_DIR) {
    return path.resolve(process.env.ROGUEDECK_RAW_ASSETS_DIR);
  }

  return path.join(repoRoot, "assets", "raw");
}

function assertReady() {
  if (!existsSync(gltfTransform)) {
    throw new Error("Missing glTF Transform CLI. Run `npm install` first.");
  }

  if (!existsSync(sourceDir)) {
    throw new Error(
      `Missing raw asset source directory: ${sourceDir}. Pass --source <dir> or set ROGUEDECK_RAW_ASSETS_DIR.`,
    );
  }
}

function optimiseAsset(asset) {
  const inputPath = path.join(sourceDir, asset.relativePath);
  const outputPath = path.join(repoRoot, asset.outputPath);
  const outputDir = path.dirname(outputPath);

  if (!existsSync(inputPath)) {
    throw new Error(`Missing raw GLB for ${asset.id}: ${inputPath}`);
  }

  mkdirSync(outputDir, { recursive: true });

  const stepPaths = {
    deduped: path.join(workDir, `${asset.id}-01-dedup.glb`),
    pruned: path.join(workDir, `${asset.id}-02-prune.glb`),
    welded: path.join(workDir, `${asset.id}-03-weld.glb`),
    simplified: path.join(workDir, `${asset.id}-04-simplify.glb`),
    resized: path.join(workDir, `${asset.id}-05-resize.glb`),
    webp: path.join(workDir, `${asset.id}-06-webp.glb`),
  };

  run("dedup", inputPath, stepPaths.deduped);
  run("prune", stepPaths.deduped, stepPaths.pruned);
  run("weld", stepPaths.pruned, stepPaths.welded);
  run("simplify", stepPaths.welded, stepPaths.simplified, "--ratio", asset.ratio, "--error", asset.error);
  run("resize", stepPaths.simplified, stepPaths.resized, "--width", asset.textureSize, "--height", asset.textureSize);
  run("webp", stepPaths.resized, stepPaths.webp, "--quality", "82", "--effort", "4");
  run("prune", stepPaths.webp, outputPath);
}

function run(command, inputPath, outputPath, ...args) {
  console.log(`gltf-transform ${command} ${path.relative(repoRoot, inputPath)} -> ${path.relative(repoRoot, outputPath)}`);

  const result = spawnSync(gltfTransform, [command, inputPath, outputPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`glTF Transform command failed: ${command}`);
  }
}
