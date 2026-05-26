import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const scenePath = join(root, "src/game-phaser/scenes/RewardScene.ts");

const normaliseLineEndings = (source: string): string => source.replace(/\r\n/g, "\n");

const readSource = async (path: string): Promise<string> =>
  normaliseLineEndings(await readFile(path, "utf8"));

const forbiddenResolverIdentifiers = [
  "playCard",
  "resolveEnemyTurn",
  "claimRunPendingReward",
  "completeRunCombatNode",
  "startCombatForRunNode",
  "createRun",
  "selectRunNode",
  "skipRunPendingReward",
  "completeRunNonCombatNode"
];

const collectIdentifiers = (file: string, source: string): ReadonlySet<string> => {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
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

const collectModuleSpecifiers = (file: string, source: string): readonly string[] => {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const moduleSpecifiers: string[] = [];

  const visit = (node: ts.Node): void => {
    if (
      ts.isImportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      moduleSpecifiers.push(node.moduleSpecifier.text);
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return moduleSpecifiers;
};

describe("Reward scene boundary", () => {
  it("creates RewardScene and imports controller, presenters, and layout", async () => {
    expect((await stat(scenePath)).isFile()).toBe(true);
    const source = await readSource(scenePath);

    expect(source).toMatch(/getRunSandboxController/);
    expect(source).toMatch(/RewardOptionPresenter/);
    expect(source).toMatch(/RunHudPresenter/);
    expect(source).toMatch(/layout\/reward-layout/);
  });

  it("imports only Phaser, scene keys, controller, view model, presenters, and layout", async () => {
    const source = await readSource(scenePath);
    const moduleSpecifiers = collectModuleSpecifiers(scenePath, source);

    expect(moduleSpecifiers).toEqual([
      "phaser",
      "../view-models/reward-view-model",
      "../controllers/run-sandbox-singleton",
      "../presenters/EventLogPresenter",
      "../presenters/RewardOptionPresenter",
      "../presenters/RunHudPresenter",
      "../layout/reward-layout",
      "../layout/fixed-resolution-stage",
      "./SceneKeys"
    ]);
    expect(moduleSpecifiers.some((specifier) => specifier.includes("game-core"))).toBe(false);
  });

  it("keeps RewardScene free from direct game-core resolver identifiers", async () => {
    const source = await readSource(scenePath);
    const identifiers = collectIdentifiers(scenePath, source);
    const forbidden = forbiddenResolverIdentifiers.filter((identifier) => identifiers.has(identifier));

    expect(forbidden).toEqual([]);
  });

  it("uses reward and run layout helpers without hard-coded game-size coordinates", async () => {
    const source = await readSource(scenePath);

    expect(source).toMatch(/layout\/reward-layout/);
    expect(source).not.toMatch(/\b(1280|720|640|360)\b/);
  });

  it("resets input locks before scene reuse and reward routing", async () => {
    const source = await readSource(scenePath);

    expect(source).toMatch(/public create\(\): void \{\n\s+this\.inputLocked = false;/);
    expect(source).toMatch(/private routeAfterReward\(\): void \{\n\s+this\.inputLocked = false;/);
  });
});
