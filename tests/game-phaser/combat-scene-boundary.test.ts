import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const scenePath = join(root, "src/game-phaser/scenes/CombatScene.ts");
const presentersRoot = join(root, "src/game-phaser/presenters");

const forbiddenResolverIdentifiers = [
  "resolveEnemyTurn",
  "claimReward",
  "applyPetStoryEvent",
  "createCombat",
  "generateCombatRewardOffer",
  "completeRunCombatNode",
  "startCombatForRunNode",
  "createRun",
  "selectRunNode",
  "claimRunPendingReward",
  "skipRunPendingReward",
  "completeRunNonCombatNode",
  "saveToSlot",
  "loadFromSlot",
  "restoreSaveSnapshot"
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

const listPresenterFiles = async (): Promise<readonly string[]> => {
  const entries = await readdir(presentersRoot, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) => join(presentersRoot, entry.name));
};

describe("Combat scene boundary", () => {
  it("creates CombatScene and imports the controller, presenters, and event player", async () => {
    expect((await stat(scenePath)).isFile()).toBe(true);
    const source = await readFile(scenePath, "utf8");

    expect(source).toMatch(/RunSandboxController/);
    expect(source).toMatch(/CardPresenter/);
    expect(source).toMatch(/CombatHudPresenter/);
    expect(source).toMatch(/EventLogPresenter/);
    expect(source).toMatch(/MonsterPresenter/);
    expect(source).toMatch(/PetPresenter/);
    expect(source).toMatch(/PlayerPresenter/);
    expect(source).toMatch(/CombatEventPlayer/);
  });

  it("keeps CombatScene free from direct game-core resolver identifiers", async () => {
    const source = await readFile(scenePath, "utf8");
    const identifiers = collectIdentifiers(scenePath, source);
    const forbidden = forbiddenResolverIdentifiers.filter((identifier) => identifiers.has(identifier));

    expect(forbidden).toEqual([]);
  });

  it("keeps presenters free from gameplay resolver imports and identifiers", async () => {
    const presenterFiles = await listPresenterFiles();

    for (const file of presenterFiles) {
      const source = await readFile(file, "utf8");
      const identifiers = collectIdentifiers(file, source);
      const forbidden = forbiddenResolverIdentifiers.filter((identifier) => identifiers.has(identifier));

      expect(forbidden, `${relative(root, file)} references gameplay resolver identifiers`).toEqual([]);
      expect(source, `${relative(root, file)} imports game-core systems`).not.toMatch(/game-core\/systems/);
    }
  });

  it("uses layout helpers from the scene and presenters", async () => {
    const sceneSource = await readFile(scenePath, "utf8");
    const cardPresenter = await readFile(join(presentersRoot, "CardPresenter.ts"), "utf8");
    const petPresenter = await readFile(join(presentersRoot, "PetPresenter.ts"), "utf8");
    const monsterPresenter = await readFile(join(presentersRoot, "MonsterPresenter.ts"), "utf8");

    expect(sceneSource).toMatch(/layout\/combat-layout/);
    expect(cardPresenter).toMatch(/layout\/hand-layout/);
    expect(petPresenter).toMatch(/layout\/pet-layout/);
    expect(monsterPresenter).toMatch(/layout\/combat-layout/);
  });

  it("avoids hard-coded coordinate clusters in CombatScene", async () => {
    const source = await readFile(scenePath, "utf8");

    expect(source).not.toMatch(/\b(1280|720|640|360|5173)\b/);
  });

  it("keeps presenter calibration in layout helpers", async () => {
    const presenterFiles = await listPresenterFiles();

    for (const file of presenterFiles) {
      const source = await readFile(file, "utf8");

      expect(source, `${relative(root, file)} has inline font size calibration`).not.toMatch(/fontSize:\s*["']\d+px["']/);
      expect(source, `${relative(root, file)} has inline wrap padding`).not.toMatch(/width:\s*[^,\n]+-\s*\d+/);
      expect(source, `${relative(root, file)} has inline two-digit text coordinates`).not.toMatch(/add\.text\([^,\n]+,\s*-?\d{2,}/);
    }
  });

  it("returns immediately after completed combat scene routing", async () => {
    const source = await readFile(scenePath, "utf8");

    expect(source).toMatch(/if \(runStatus === "reward"\) \{\r?\n\s+this\.scene\.start\(SceneKeys\.Reward\);\r?\n\s+return;\r?\n\s+\}/);
    expect(source).toMatch(/else if \(runStatus === "map_select"\) \{\r?\n\s+this\.scene\.start\(SceneKeys\.Map\);\r?\n\s+return;\r?\n\s+\}/);
    expect(source).toMatch(/else if \(runStatus === "completed" \|\| runStatus === "lost"\) \{\r?\n\s+this\.scene\.start\(SceneKeys\.Map\);\r?\n\s+return;\r?\n\s+\}/);
  });

  it("resets the input lock before scene reuse", async () => {
    const source = await readFile(scenePath, "utf8");

    expect(source).toMatch(/public create\(\): void \{\r?\n\s+this\.inputLocked = false;/);
  });
});
