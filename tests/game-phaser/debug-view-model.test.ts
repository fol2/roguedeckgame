import { describe, expect, it } from "vitest";
import { cardInstanceId, currentRuntimeMetadata, type RunState } from "../../src/game-core";
import { createRunSandboxController } from "../../src/game-phaser/controllers/RunSandboxController";
import { buildCombatDebugViewModel } from "../../src/game-phaser/view-models/debug-view-model";

describe("Combat debug view model", () => {
  it("builds serializable run and combat diagnostics without mutating state", () => {
    const controller = createRunSandboxController("debug-view-model");
    const combatNode = controller.getState().run.map?.nodes.find((node) => node.type === "combat" && node.status === "available");

    expect(combatNode).toBeDefined();
    controller.selectMapNode(combatNode!.id);
    const before = JSON.stringify(controller.getState());
    const viewModel = controller.getCombatDebugViewModel({
      selectedCardId: cardInstanceId("debug-card"),
      selectedCardRevision: 3,
      dragState: "dragging",
      inputLocked: true,
      inputLockReason: "playback",
      pendingRequestId: "request-1"
    }, [{
      eventType: "DamageDealt",
      policy: "animated",
      visualRoute: "fx",
      startedAt: 10,
      endedAt: 20,
      durationMs: 10,
      outcome: "completed",
      fallbackUsed: false
    }]);

    expect(viewModel.runtimeMetadata).toEqual(currentRuntimeMetadata);
    expect(viewModel.run.status).toBe("combat");
    expect(viewModel.combat).toMatchObject({
      present: true,
      phase: "player_turn",
      revision: expect.any(Number),
      energy: expect.any(Number)
    });
    expect(viewModel.input).toMatchObject({
      selectedCardId: "debug-card",
      selectedCardRevision: 3,
      dragState: "dragging",
      inputLocked: true,
      inputLockReason: "playback",
      pendingRequestId: "request-1"
    });
    expect(viewModel.hand.length).toBeGreaterThan(0);
    expect(viewModel.monsters.length).toBeGreaterThan(0);
    expect(viewModel.plannedMonsterAbilities.length).toBeGreaterThan(0);
    expect(viewModel.playbackObservations).toMatchObject([{
      eventType: "DamageDealt",
      policy: "animated",
      visualRoute: "fx",
      outcome: "completed"
    }]);
    expect(viewModel.parityDiagnostics).toEqual([]);
    expect(JSON.parse(JSON.stringify(viewModel))).toEqual(viewModel);
    expect(JSON.stringify(controller.getState())).toBe(before);
  });

  it("returns useful diagnostics when combat is missing", () => {
    const controller = createRunSandboxController("debug-view-model-map");
    const viewModel = controller.getCombatDebugViewModel();

    expect(viewModel.run.status).toBe("map_select");
    expect(viewModel.combat).toEqual({ present: false });
    expect(viewModel.hand).toEqual([]);
    expect(viewModel.monsters).toEqual([]);
    expect(viewModel.piles).toEqual({ draw: 0, discard: 0 });
    expect(viewModel.latestEvents.map((event) => event.type)).toContain("RunCreated");
  });

  it("can represent map, reward, completed, and lost run states without combat", () => {
    const controller = createRunSandboxController("debug-view-model-run-states");
    const state = controller.getState();

    for (const status of ["map_select", "reward", "completed", "lost"] as const) {
      const viewModel = buildCombatDebugViewModel({
        ...state,
        combat: undefined,
        run: {
          ...state.run,
          status
        } as RunState
      }, undefined);

      expect(viewModel.run.status).toBe(status);
      expect(viewModel.combat.present).toBe(false);
      expect(JSON.parse(JSON.stringify(viewModel))).toEqual(viewModel);
    }
  });

  it("updates revision, latest events, and pending request diagnostics after card play", () => {
    const controller = createRunSandboxController("debug-view-model-actions");
    const combatNode = controller.getState().run.map?.nodes.find((node) => node.type === "combat" && node.status === "available");
    controller.selectMapNode(combatNode!.id);
    const before = controller.getCombatDebugViewModel();
    const card = controller.getCombatViewModel()!.hand.find((candidate) => candidate.playable)!;
    const targetId = card.requiresManualTarget ? card.validTargetIds[0] : undefined;

    controller.playHandCard(card.cardInstanceId, targetId, before.combat.revision, "debug-play-card");

    const after = controller.getCombatDebugViewModel({
      dragState: "idle",
      inputLocked: false,
      pendingRequestId: "debug-play-card"
    });

    expect(after.combat.revision).toBeGreaterThan(before.combat.revision ?? 0);
    expect(after.latestEvents.map((event) => event.type)).toContain("CardPlayed");
    expect(after.input.pendingRequestId).toBe("debug-play-card");
  });
});
