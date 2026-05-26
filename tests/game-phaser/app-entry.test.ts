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
    expect(createGame).toMatch(/getFixedRenderSize/);
    expect(createGame).toMatch(/devicePixelRatio/);
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

  it("keeps a high-resolution fixed canvas scaled to the browser", async () => {
    const gameSize = await readProjectFile("src/game-phaser/layout/game-size.ts");
    const fixedStage = await readProjectFile("src/game-phaser/layout/fixed-resolution-stage.ts");
    const styles = await readProjectFile("src/app/styles.css");

    expect(gameSize).toMatch(/GAME_WIDTH = 1280/);
    expect(gameSize).toMatch(/GAME_HEIGHT = 720/);
    expect(gameSize).toMatch(/MAX_RENDER_SCALE = 4/);
    expect(gameSize).toMatch(/getFixedRenderSize/);
    expect(fixedStage).toMatch(/setGameSize\(size\.width, size\.height\)/);
    expect(fixedStage).toMatch(/setScale\(size\.renderScale\)/);
    expect(fixedStage).toMatch(/setResolution\(size\.renderScale\)/);
    expect(fixedStage).not.toMatch(/setZoom/);
    expect(styles).toMatch(/width:\s*100vw/);
    expect(styles).toMatch(/height:\s*100dvh/);
  });

  it("has a Vite config", async () => {
    const fileStatus = await stat(join(root, "vite.config.ts"));

    expect(fileStatus.isFile()).toBe(true);
  });
});
