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
  playbackObservations: [{
    eventType: "CombatStarted",
    policy: "logOnly",
    visualRoute: "log",
    startedAt: 1,
    endedAt: 2,
    durationMs: 1,
    outcome: "completed",
    fallbackUsed: false
  }, {
    eventType: "CardPlayed",
    policy: "animated",
    visualRoute: "fx",
    startedAt: 3,
    endedAt: 5,
    durationMs: 2,
    outcome: "recovered",
    fallbackUsed: true,
    warningCode: "missing_card_point",
    errorSummary: "CardPlayed used hand fallback"
  }, {
    eventType: "EnergySpent",
    policy: "animated",
    visualRoute: "fx",
    startedAt: 6,
    endedAt: 7,
    durationMs: 1,
    outcome: "completed",
    fallbackUsed: false
  }, {
    eventType: "DamageDealt",
    policy: "animated",
    visualRoute: "fx",
    startedAt: 8,
    endedAt: 9,
    durationMs: 1,
    outcome: "completed",
    fallbackUsed: false
  }, {
    eventType: "CardMoved",
    policy: "stateSyncOnly",
    visualRoute: "cardMovement",
    startedAt: 10,
    endedAt: 11,
    durationMs: 1,
    outcome: "completed",
    fallbackUsed: false
  }],
  uiWarnings: []
});

const createSuccessfulPlaybackObservation = (index: number): CombatDebugViewModel["playbackObservations"][number] => ({
  eventType: `Event${index}`,
  policy: "logOnly",
  visualRoute: "log",
  startedAt: 10 + index,
  endedAt: 11 + index,
  durationMs: 1,
  outcome: "completed",
  fallbackUsed: false
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
    expect(text).toContain("Playback: CardPlayed animated/fx recovered");
    expect(text).toContain("Playback recent: EnergySpent ok, DamageDealt ok");
    expect(text).toContain("Playback time: start=3 end=5 dur=2");
    expect(text).toContain("Playback fallback: fallback=yes warn=missing_card_point");
    expect(text).toContain("Playback error: CardPlayed used hand fallback");
  });

  it("highlights an older fallback from the full retained playback window", () => {
    const { scene, records } = createSceneStub();
    const presenter = new CombatDebugOverlayPresenter(scene);
    const viewModel = {
      ...createDebugViewModel(),
      playbackObservations: [
        {
          eventType: "FutureEvent",
          policy: "unknown",
          visualRoute: "none",
          startedAt: 1,
          endedAt: 2,
          durationMs: 1,
          outcome: "skippedUnknown",
          fallbackUsed: true,
          warningCode: "unknown_event",
          errorSummary: "Event was not recognised."
        },
        ...Array.from({ length: 10 }, (_unused, index) => createSuccessfulPlaybackObservation(index))
      ]
    } satisfies CombatDebugViewModel;

    presenter.render(viewModel, true);

    const text = records.texts.map((record) => record.text).join("\n");
    expect(text).toContain("Playback: FutureEvent unknown/none skippedUnknown");
    expect(text).toContain("Playback fallback: fallback=yes warn=unknown_event");
    expect(text).toContain("Playback error: Event was not recognised.");
    expect(text).toContain("Playback recent: Event7 ok, Event8 ok, Event9 ok");
  });
});
