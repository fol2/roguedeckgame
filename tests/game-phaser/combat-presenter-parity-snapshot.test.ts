import { describe, expect, it, vi } from "vitest";
import { combatantId, type CombatantId } from "../../src/game-core";
import { CombatHudPresenter } from "../../src/game-phaser/presenters/CombatHudPresenter";
import { MonsterPresenter } from "../../src/game-phaser/presenters/MonsterPresenter";
import type { CombatViewModel, CombatantViewModel } from "../../src/game-phaser/view-models/combat-view-model";

type Handler = (...args: unknown[]) => void;

const createChainableObject = <T extends Record<string, unknown>>(shape: T) => {
  const object = {
    ...shape,
    children: [] as unknown[],
    handlers: {} as Record<string, Handler[]>,
    add: (child: unknown) => {
      object.children.push(child);
      return object;
    },
    disableInteractive: () => object,
    on: (event: string, handler: Handler) => {
      object.handlers[event] = [...(object.handlers[event] ?? []), handler];
      return object;
    },
    removeAll: () => {
      object.children = [];
      return object;
    },
    removeAllListeners: () => object,
    setInteractive: () => object,
    setLineWidth: () => object,
    setOrigin: () => object,
    setSize: () => object,
    setStrokeStyle: () => object
  };

  return object;
};

const createSceneStub = (rewriteText: (text: string) => string = (text) => text) => {
  const created: unknown[] = [];
  const track = <T extends Record<string, unknown>>(object: T): T => {
    created.push(object);
    return object;
  };
  const scene = {
    created,
    add: {
      container: (x = 0, y = 0) => track(createChainableObject({ kind: "container", x, y })),
      circle: (x = 0, y = 0) => track(createChainableObject({ kind: "circle", x, y })),
      ellipse: (x = 0, y = 0) => track(createChainableObject({ kind: "ellipse", x, y })),
      line: (x = 0, y = 0) => track(createChainableObject({ kind: "line", x, y })),
      rectangle: (x = 0, y = 0) => track(createChainableObject({ kind: "rectangle", x, y })),
      triangle: (x = 0, y = 0) => track(createChainableObject({ kind: "triangle", x, y })),
      text: (x = 0, y = 0, text = "") => track(createChainableObject({ kind: "text", x, y, text: rewriteText(text) }))
    }
  };

  return scene as never;
};

const createCombatant = (
  id: CombatantId,
  type: CombatantViewModel["type"],
  hp: number,
  maxHp: number,
  block: number
): CombatantViewModel => ({
  id,
  name: type === "player" ? "Keeper" : "Training Slime",
  type,
  hp,
  maxHp,
  block,
  statuses: [],
  alive: true,
  tooltip: { title: "Combatant", body: "" },
  detail: { title: "Combatant", lines: [] }
});

const createCombatViewModel = (): CombatViewModel => ({
  revision: 1,
  phase: "player_turn",
  encounterLabel: "Training",
  turnNumber: 1,
  energy: 3,
  maxEnergy: 3,
  player: createCombatant(combatantId("player"), "player", 70, 70, 0),
  pets: [],
  monsters: [createCombatant(combatantId("monster"), "monster", 12, 12, 0)],
  monsterIntents: [{
    monsterId: combatantId("monster"),
    intentId: "training_slime_attack" as CombatViewModel["monsterIntents"][number]["intentId"],
    abilityId: "training_slime_attack" as CombatViewModel["monsterIntents"][number]["abilityId"],
    type: "attack",
    label: "attack",
    description: "Attack the Keeper.",
    visibilityLevel: "exact",
    targetHint: "keeper",
    amount: 6,
    tooltip: { title: "Clumsy Strike", body: "Attack the Keeper." },
    detail: {
      title: "Clumsy Strike",
      subtitle: "Training Slime · attack planned card",
      lines: ["Attack the Keeper."],
      footer: "Monster planned card detail."
    },
    plannedAction: {
      source: "plannedAbility",
      revealPolicy: "exact",
      title: "Clumsy Strike",
      subtitle: "attack planned card",
      abilityId: "training_slime_attack" as CombatViewModel["monsterIntents"][number]["abilityId"],
      intentId: "training_slime_attack" as CombatViewModel["monsterIntents"][number]["intentId"],
      intentType: "attack",
      tags: ["attack"],
      effectLines: ["Damage 6 to target."]
    }
  }],
  hand: [],
  drawPile: { label: "Draw", count: 4, tooltip: { title: "Draw", body: "" }, detail: { title: "Draw", lines: [] } },
  discardPile: { label: "Discard", count: 1, tooltip: { title: "Discard", body: "" }, detail: { title: "Discard", lines: [] } },
  continueAvailable: false,
  resetAvailable: false,
  eventMessages: [],
  uiWarnings: [],
  uiCaps: {
    maxHandCards: 10,
    maxEnemies: 3,
    maxPetSlots: 3,
    maxEnemyVisibleStatuses: 4,
    maxPlayerVisibleStatuses: 5,
    maxPetVisibleStatuses: 3,
    maxCardVisibleTags: 4
  }
});

describe("combat presenter parity snapshots", () => {
  it("reads HUD pile and player diagnostics from rendered text labels", () => {
    const scene = createSceneStub((text) => {
      if (text === "4") {
        return "9";
      }
      if (text === "HP 70/70") {
        return "HP 69/70";
      }
      if (text === "Block 0") {
        return "Block 4";
      }

      return text;
    });
    const presenter = new CombatHudPresenter(scene, vi.fn());

    presenter.render(createCombatViewModel(), false);

    expect(presenter.getParitySnapshot()).toEqual(expect.objectContaining({
      piles: { draw: 9, discard: 1 },
      player: {
        id: "player",
        hp: 69,
        maxHp: 70,
        block: 4
      }
    }));
  });

  it("reads monster HP and block diagnostics from rendered text labels", () => {
    const scene = createSceneStub((text) =>
      text === "HP 12/12  B0" ? "HP 9/12  B2" : text
    );
    const presenter = new MonsterPresenter(scene);
    const viewModel = createCombatViewModel();

    presenter.render(viewModel.monsters, viewModel.monsterIntents);

    expect(presenter.getParitySnapshot()).toEqual([{
      id: "monster",
      hp: 9,
      maxHp: 12,
      block: 2
    }]);
  });

  it("renders monster intent metadata as a planned action card", () => {
    const scene = createSceneStub();
    const presenter = new MonsterPresenter(scene);
    const viewModel = createCombatViewModel();

    presenter.render(viewModel.monsters, viewModel.monsterIntents);

    const created = (scene as unknown as { readonly created: readonly { readonly kind: string; readonly text?: string }[] }).created;
    expect(created).toContainEqual(expect.objectContaining({
      kind: "text",
      text: "Clumsy Strike"
    }));
    expect(created).toContainEqual(expect.objectContaining({
      kind: "text",
      text: "ATK"
    }));
  });

  it("keeps long planned action titles inside the monster card label", () => {
    const scene = createSceneStub();
    const presenter = new MonsterPresenter(scene);
    const viewModel = createCombatViewModel();
    const monsterIntent = viewModel.monsterIntents[0]!;

    presenter.render(viewModel.monsters, [{
      ...monsterIntent,
      plannedAction: {
        ...monsterIntent.plannedAction,
        title: "Very Long Monster Planned Action"
      }
    }]);

    const created = (scene as unknown as { readonly created: readonly { readonly kind: string; readonly text?: string }[] }).created;
    expect(created).toContainEqual(expect.objectContaining({
      kind: "text",
      text: "Very Long Monst..."
    }));
  });
});
