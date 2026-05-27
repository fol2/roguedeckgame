import { readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const sceneFiles = [
  "src/game-phaser/scenes/CombatScene.ts",
  "src/game-phaser/scenes/MapScene.ts",
  "src/game-phaser/scenes/RewardScene.ts"
];

const mutatingControllerMethods = {
  selectMapNode: { expectedArgs: 3, revisionArgIndex: 1, requestArgIndex: 2 },
  playHandCard: { expectedArgs: 4, revisionArgIndex: 2, requestArgIndex: 3 },
  endTurn: { expectedArgs: 2, revisionArgIndex: 0, requestArgIndex: 1 },
  completeCombatIfEnded: { expectedArgs: 2, revisionArgIndex: 0, requestArgIndex: 1 },
  claimRewardOption: { expectedArgs: 3, revisionArgIndex: 1, requestArgIndex: 2 },
  skipReward: { expectedArgs: 2, revisionArgIndex: 0, requestArgIndex: 1 },
  completeNonCombatNode: { expectedArgs: 2, revisionArgIndex: 0, requestArgIndex: 1 }
} as const;

type MutatingControllerMethod = keyof typeof mutatingControllerMethods;

const isMutatingControllerMethod = (name: string): name is MutatingControllerMethod =>
  name in mutatingControllerMethods;

const isExplicitlyMissingArgument = (node: ts.Expression | undefined): boolean =>
  node === undefined || (ts.isIdentifier(node) && node.text === "undefined");

describe("Phaser scene submit contract", () => {
  it("passes revision and request id to every production mutating controller call", async () => {
    const violations: string[] = [];

    for (const file of sceneFiles) {
      const absolutePath = join(root, file);
      const source = await readFile(absolutePath, "utf8");
      const sourceFile = ts.createSourceFile(absolutePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

      const visit = (node: ts.Node): void => {
        if (
          ts.isCallExpression(node) &&
          ts.isPropertyAccessExpression(node.expression) &&
          isMutatingControllerMethod(node.expression.name.text)
        ) {
          const method = node.expression.name.text;
          const contract = mutatingControllerMethods[method];
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
          const revisionArg = node.arguments[contract.revisionArgIndex];
          const requestArg = node.arguments[contract.requestArgIndex];

          if (
            node.arguments.length < contract.expectedArgs ||
            isExplicitlyMissingArgument(revisionArg) ||
            isExplicitlyMissingArgument(requestArg)
          ) {
            violations.push(`${relative(root, absolutePath)}:${line} ${method} missing revision/request id`);
          }
        }

        ts.forEachChild(node, visit);
      };

      visit(sourceFile);
    }

    expect(violations).toEqual([]);
  });
});
