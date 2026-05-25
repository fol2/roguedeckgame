import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createCombatSandboxController } from "../../src/game-phaser/controllers/CombatSandboxController";
import { buildCombatViewModel } from "../../src/game-phaser/view-models/combat-view-model";

const root = process.cwd();

describe("Combat view model", () => {
  it("maps core combat state to serializable display data", () => {
    const controller = createCombatSandboxController("view-model-map");
    const viewModel = buildCombatViewModel(controller.getState());

    expect(viewModel.player).toMatchObject({
      name: "Novice Tamer",
      type: "player",
      alive: true
    });
    expect(viewModel.pets[0]).toMatchObject({
      name: "Ember Fox",
      nickname: "Ember"
    });
    expect(viewModel.monsters[0]?.type).toBe("monster");
    expect(JSON.parse(JSON.stringify(viewModel))).toEqual(viewModel);
  });

  it("includes hand card labels, costs, draw count, and discard count", () => {
    const viewModel = createCombatSandboxController("view-model-hand").getViewModel();
    const card = viewModel.hand[0];

    expect(card?.name).toEqual(expect.any(String));
    expect(card?.description.length).toBeGreaterThan(0);
    expect(card?.cost).toEqual(expect.any(Number));
    expect(viewModel.drawPileCount + viewModel.discardPileCount + viewModel.hand.length).toBeGreaterThan(0);
  });

  it("includes monster intent labels", () => {
    const viewModel = createCombatSandboxController("view-model-intents").getViewModel();

    expect(viewModel.monsterIntents[0]?.label).toEqual(expect.any(String));
    expect(viewModel.monsterIntents[0]?.description.length).toBeGreaterThan(0);
  });

  it("represents won and lost phases", () => {
    const controller = createCombatSandboxController("view-model-ended");
    const baseState = controller.getState();
    const won = buildCombatViewModel({
      ...baseState,
      combat: { ...baseState.combat, phase: "won" },
      lastEvents: [{ type: "CombatEnded", outcome: "won" }]
    });
    const lost = buildCombatViewModel({
      ...baseState,
      combat: { ...baseState.combat, phase: "lost" },
      lastEvents: [{ type: "CombatEnded", outcome: "lost" }]
    });

    expect(won.phase).toBe("won");
    expect(won.eventMessages).toContain("Combat won.");
    expect(lost.phase).toBe("lost");
    expect(lost.eventMessages).toContain("Combat lost.");
  });

  it("keeps view-model files free from Phaser imports", async () => {
    const source = await readFile(
      join(root, "src/game-phaser/view-models/combat-view-model.ts"),
      "utf8"
    );

    expect(source).not.toMatch(/from\s+["']phaser(?:\/[^"']*)?["']/);
  });
});
