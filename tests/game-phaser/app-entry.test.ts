import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const readProjectFile = (path: string): Promise<string> => readFile(join(root, path), "utf8");

describe("Vite app entry", () => {
  it("loads the TypeScript app entry from index.html", async () => {
    const index = await readProjectFile("index.html");

    expect(index).toContain('<div id="game-root"></div>');
    expect(index).toMatch(/<script\s+type="module"\s+src="\/src\/app\/main\.ts"><\/script>/);
    expect(index).not.toMatch(/https?:\/\//);
  });

  it("creates Phaser through the app factory", async () => {
    const createGame = await readProjectFile("src/app/create-game.ts");

    expect(createGame).toMatch(/from\s+["']phaser["']/);
    expect(createGame).toMatch(/new Game\(/);
    expect(createGame).toMatch(/BootScene/);
    expect(createGame).toMatch(/CoreSmokeScene/);
    expect(createGame).toMatch(/MapScene/);
    expect(createGame).toMatch(/CombatScene/);
    expect(createGame).toMatch(/RewardScene/);
  });

  it("imports styles and handles the app mount in main.ts", async () => {
    const main = await readProjectFile("src/app/main.ts");

    expect(main).toContain('import "./styles.css";');
    expect(main).toMatch(/querySelector<HTMLElement>\(["']#game-root["']\)/);
    expect(main).toContain("Unable to start game");
  });

  it("has a Vite config", async () => {
    const fileStatus = await stat(join(root, "vite.config.ts"));

    expect(fileStatus.isFile()).toBe(true);
  });
});
