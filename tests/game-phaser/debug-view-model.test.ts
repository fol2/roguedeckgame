import { describe, expect, it } from "vitest";
import {
  cardInstanceId,
  createMultiPetProofPetInstances,
  createMultiPetProofRegistry,
  currentRuntimeMetadata,
  MULTI_PET_PROOF_ACTIVE_PET_INSTANCE_IDS,
  starterRegistry,
  type RunState
} from "../../src/game-core";
import {
  createRunSandboxController
} from "../../src/game-phaser/controllers/RunSandboxController";
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
      pendingRequestId: "request-1",
      lastRequestId: "request-1",
      expectedRevision: 3
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
      pendingRequestId: "request-1",
      lastRequestId: "request-1",
      expectedRevision: 3
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
    expect(viewModel.latestActionRejection).toBeUndefined();
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

  it("exposes two active pet slots and command routing in debug diagnostics", () => {
    const controller = createRunSandboxController({
      seed: "debug-view-model-multi-pet",
      registry: createMultiPetProofRegistry(),
      petInstances: createMultiPetProofPetInstances(),
      activePetInstanceIds: MULTI_PET_PROOF_ACTIVE_PET_INSTANCE_IDS
    });
    const combatNode = controller.getState().run.map?.nodes.find((node) => node.type === "combat" && node.status === "available");

    controller.selectMapNode(combatNode!.id);

    const combat = controller.getCombatViewModel()!;
    const debug = controller.getCombatDebugViewModel();
    const petCommand = combat.hand.find((card) => card.isPetCommand);

    expect(debug.pets.map((pet) => [pet.slotIndex, pet.nickname, pet.petInstanceId])).toEqual([
      [0, "Ember", "ember_fox_001"],
      [1, "Cinder", "ember_fox_002"]
    ]);
    expect(debug.uiWarnings).toEqual([]);
    expect(petCommand?.commandPetSlotIndex).toBe(0);
  });

  it("uses injected registry card metadata when routing sandbox card play", () => {
    const registry = {
      ...starterRegistry,
      cards: starterRegistry.cards.map((card) =>
        card.id === "focus"
          ? {
              ...card,
              type: "attack" as const,
              effects: [
                {
                  type: "damage" as const,
                  amount: 1,
                  target: { type: "target" as const }
                }
              ]
            }
          : card
      )
    };
    const controller = createRunSandboxController({
      seed: "debug-view-model-injected-card-metadata",
      registry
    });
    const combatNode = controller.getState().run.map?.nodes.find((node) => node.type === "combat" && node.status === "available");
    controller.selectMapNode(combatNode!.id);
    const viewModel = controller.getCombatViewModel()!;
    const focus = viewModel.hand.find((card) => card.cardId === "focus");

    expect(focus).toBeDefined();
    expect(focus?.requiresManualTarget).toBe(true);

    const result = controller.playHandCard(focus!.cardInstanceId, undefined, viewModel.revision, "injected-focus");

    expect(result.ok).toBe(true);
    expect(result.events.map((event) => event.type)).toContain("DamageDealt");
  });

  it("surfaces stale and duplicate request rejections for the debug overlay", () => {
    const controller = createRunSandboxController("debug-view-model-rejection");
    const combatNode = controller.getState().run.map?.nodes.find((node) => node.type === "combat" && node.status === "available");
    controller.selectMapNode(combatNode!.id);
    const staleRevision = controller.getCombatViewModel()!.revision;

    controller.endTurn(staleRevision, "debug-stale-first");
    controller.endTurn(staleRevision, "debug-stale-second");

    const stale = controller.getCombatDebugViewModel({
      dragState: "idle",
      inputLocked: false,
      lastRequestId: "debug-stale-second",
      expectedRevision: staleRevision
    });

    expect(stale.latestActionRejection).toMatchObject({
      code: "stale_combat_revision",
      path: "combat.revision"
    });

    controller.endTurn(controller.getCombatViewModel()!.revision, "debug-stale-second");
    const duplicate = controller.getCombatDebugViewModel({
      dragState: "idle",
      inputLocked: false,
      lastRequestId: "debug-stale-second"
    });

    expect(duplicate.latestActionRejection).toMatchObject({
      code: "duplicate_request",
      path: "requestId"
    });
  });
});
