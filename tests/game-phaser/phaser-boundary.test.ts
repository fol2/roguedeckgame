import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const sourceRoot = join(root, "src");
const gameCoreRoot = join(sourceRoot, "game-core");
const gamePhaserRoot = join(sourceRoot, "game-phaser");
const sceneRoot = join(gamePhaserRoot, "scenes");
const coreSmokePath = join(gamePhaserRoot, "debug", "core-smoke.ts");

const listTypeScriptFiles = async (directory: string): Promise<readonly string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return listTypeScriptFiles(entryPath);
    }

    return entry.name.endsWith(".ts") ? [entryPath] : [];
  }));

  return files.flat();
};

const readSourceFiles = async (directory: string): Promise<ReadonlyMap<string, string>> => {
  const files = await listTypeScriptFiles(directory);
  const pairs = await Promise.all(files.map(async (file) => [
    file,
    await readFile(file, "utf8")
  ] as const));

  return new Map(pairs);
};

const relativeFile = (file: string): string => relative(root, file);

const parseSource = (file: string, source: string): ts.SourceFile =>
  ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

const isStringLiteral = (node: ts.Node): node is ts.StringLiteral =>
  ts.isStringLiteral(node);

const collectModuleSpecifiers = (file: string, source: string): readonly string[] => {
  const sourceFile = parseSource(file, source);
  const moduleSpecifiers: string[] = [];

  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      isStringLiteral(node.moduleSpecifier)
    ) {
      moduleSpecifiers.push(node.moduleSpecifier.text);
    }

    if (ts.isCallExpression(node)) {
      const [firstArgument] = node.arguments;

      if (
        firstArgument &&
        isStringLiteral(firstArgument) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) && node.expression.text === "require"))
      ) {
        moduleSpecifiers.push(firstArgument.text);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return moduleSpecifiers;
};

const collectIdentifiers = (file: string, source: string): ReadonlySet<string> => {
  const sourceFile = parseSource(file, source);
  const identifiers = new Set<string>();

  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node)) {
      identifiers.add(node.text);
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return identifiers;
};

const isForbiddenCoreModule = (moduleSpecifier: string): boolean =>
  moduleSpecifier === "phaser" ||
  moduleSpecifier.startsWith("phaser/") ||
  moduleSpecifier.includes("game-phaser") ||
  moduleSpecifier === "../app" ||
  moduleSpecifier === "../../app" ||
  moduleSpecifier === "../../../app" ||
  moduleSpecifier.includes("/app/");

describe("Phaser architecture boundary", () => {
  it("keeps Phaser and presentation imports out of game-core", async () => {
    const sources = await readSourceFiles(gameCoreRoot);

    for (const [file, source] of sources) {
      const forbiddenSpecifiers = collectModuleSpecifiers(file, source).filter(isForbiddenCoreModule);

      expect(forbiddenSpecifiers, `${relativeFile(file)} imports presentation/browser modules`).toEqual([]);
    }
  });

  it("keeps browser globals and storage out of game-core", async () => {
    const sources = await readSourceFiles(gameCoreRoot);
    const forbiddenGlobals = /\b(window|document|localStorage|sessionStorage)\b/;

    for (const [file, source] of sources) {
      expect(source, `${relativeFile(file)} references browser APIs`).not.toMatch(forbiddenGlobals);
    }
  });

  it("creates the required Phaser presentation files", async () => {
    const requiredFiles = [
      "scenes/SceneKeys.ts",
      "scenes/BootScene.ts",
      "scenes/CoreSmokeScene.ts",
      "layout/game-size.ts",
      "debug/core-smoke.ts"
    ];

    for (const file of requiredFiles) {
      const fileStatus = await stat(join(gamePhaserRoot, file));

      expect(fileStatus.isFile(), file).toBe(true);
    }
  });

  it("keeps scene files free of gameplay resolver calls", async () => {
    const sceneSources = await readSourceFiles(sceneRoot);
    const forbiddenResolverIdentifiers = [
      "playCard",
      "resolveEnemyTurn",
      "claimReward",
      "applyPetStoryEvent",
      "createCombat",
      "generateCombatRewardOffer",
      "completeRunCombatNode",
      "startCombatForRunNode",
      "createRun",
      "selectRunNode",
      "skipRunPendingReward",
      "saveToSlot",
      "loadFromSlot",
      "restoreSaveSnapshot"
    ];

    for (const [file, source] of sceneSources) {
      const identifiers = collectIdentifiers(file, source);
      const forbiddenIdentifiers = forbiddenResolverIdentifiers.filter((identifier) => identifiers.has(identifier));

      expect(forbiddenIdentifiers, `${relativeFile(file)} references gameplay resolver identifiers`).toEqual([]);
    }
  });

  it("keeps the core smoke helper pure from Phaser imports", async () => {
    const source = await readFile(coreSmokePath, "utf8");
    const phaserSpecifiers = collectModuleSpecifiers(coreSmokePath, source)
      .filter((specifier) => specifier === "phaser" || specifier.startsWith("phaser/"));

    expect(phaserSpecifiers).toEqual([]);
    expect(source).toMatch(/from\s+["']\.\.\/\.\.\/game-core["']/);
  });

  it("uses central layout constants in scenes", async () => {
    const coreSmokeScene = await readFile(join(sceneRoot, "CoreSmokeScene.ts"), "utf8");

    expect(coreSmokeScene).toMatch(/from\s+["']\.\.\/layout\/game-size["']/);
    expect(coreSmokeScene).not.toMatch(/\b(1280|720|640|360)\b/);
  });
});
