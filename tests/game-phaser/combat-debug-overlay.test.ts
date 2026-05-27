import { describe, expect, it, vi } from "vitest";
import { currentRuntimeMetadata } from "../../src/game-core";
import { CombatDebugOverlayPresenter } from "../../src/game-phaser/presenters/CombatDebugOverlayPresenter";
import type { CombatDebugViewModel } from "../../src/game-phaser/view-models/debug-view-model";

type TextRecord = {
  readonly text: string;
};

const createSceneStub = () => {
  const records = {
    texts: [] as TextRecord[],
    panelInteractive: false,
    visible: undefined as boolean | undefined
  };
  const container = {
    add: vi.fn(),
    removeAll: vi.fn(),
    setDepth: () => container,
    setSize: () => container,
    setVisible: (visible: boolean) => {
      records.visible = visible;
      return container;
    }
  };
  const scene = {
    add: {
      container: () => container,
      rectangle: () => ({
        setOrigin: () => ({
          setStrokeStyle: () => ({
            setInteractive: () => {
              records.panelInteractive = true;
            }
          })
        })
      }),
      text: (_x: number, _y: number, text: string) => {
        records.texts.push({ text });
        return {};
      }
    }
  };

  return { scene: scene as never, records };
};

const createDebugViewModel = (): CombatDebugViewModel => ({
  runtimeMetadata: currentRuntimeMetadata,
  run: {
    runId: "run-1",
    seed: "debug-seed",
    status: "combat",
    currentNodeId: "node-1",
    currentNodeType: "combat"
  },
  combat: {
    present: true,
    phase: "player_turn",
    turnNumber: 1,
    revision: 2,
    energy: 3,
    maxEnergy: 3
  },
  input: {
    dragState: "idle",
    inputLocked: false,
    pendingRequestId: "none"
  },
  player: { hp: 70, maxHp: 70, block: 0 },
  hand: [],
  piles: { draw: 5, discard: 0 },
  pets: [{ petInstanceId: "pet-1", slotIndex: 0, name: "Ember Fox", nickname: "Ember" }],
  monsters: [{ id: "monster-1", name: "Training Slime", hp: 12, maxHp: 12, block: 0, alive: true }],
  plannedMonsterAbilities: [{ monsterCombatantId: "monster-1", intentId: "intent-1", abilityId: "slime_attack" }],
  latestEvents: [{ type: "CombatStarted", message: "Combat started." }],
  uiWarnings: []
});

describe("Combat debug overlay presenter", () => {
  it("stays hidden by default", () => {
    const { scene, records } = createSceneStub();
    const presenter = new CombatDebugOverlayPresenter(scene);

    presenter.render(createDebugViewModel(), false);

    expect(records.visible).toBe(false);
    expect(records.texts).toEqual([]);
  });

  it("renders compact runtime, combat, input, pile, and event diagnostics when visible", () => {
    const { scene, records } = createSceneStub();
    const presenter = new CombatDebugOverlayPresenter(scene);

    presenter.render(createDebugViewModel(), true);

    const text = records.texts.map((record) => record.text).join("\n");
    expect(records.visible).toBe(true);
    expect(records.panelInteractive).toBe(true);
    expect(text).toContain("Combat Debug");
    expect(text).toContain(`Runtime: ${currentRuntimeMetadata.packageName}@${currentRuntimeMetadata.packageVersion}`);
    expect(text).toContain("Combat: player_turn turn=1 rev=2");
    expect(text).toContain("Request: none");
    expect(text).toContain("Piles: draw=5 discard=0 hand=0");
    expect(text).toContain("Events: CombatStarted");
  });
});
