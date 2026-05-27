import { describe, expect, it } from "vitest";
import {
  cardInstanceId,
  combatantId,
  createAgentRunDriver,
  createMultiPetProofPetInstances,
  createMultiPetProofRegistry,
  createRng,
  createRun,
  createSaveSnapshot,
  deterministicSmokePolicy,
  MULTI_PET_PROOF_ACTIVE_PET_INSTANCE_IDS,
  parseSaveSnapshot,
  playCard,
  playerClassId,
  restoreSaveSnapshot,
  selectRunNode,
  serializeSaveSnapshot,
  startCombatForRunNode,
  starterRegistry
} from "../../src/game-core";
import { createHandTunedCombatFixture } from "../../src/game-core/testing/combat-fixtures";

const targetId = combatantId("monster:training_slime:0");

describe("multi-pet readiness proof", () => {
  it("creates a deterministic two-pet combat with run pet state for each active slot", () => {
    const registry = createMultiPetProofRegistry();
    const petInstances = createMultiPetProofPetInstances();
    const runResult = createRun({
      seed: "phase12-two-pet-run",
      playerClassId: playerClassId("novice_tamer"),
      activePetInstanceIds: MULTI_PET_PROOF_ACTIVE_PET_INSTANCE_IDS,
      petInstances,
      registry
    });

    expect(runResult.ok).toBe(true);
    expect(runResult.events.find((event) => event.type === "RunCreated")).toMatchObject({
      activePetInstanceIds: MULTI_PET_PROOF_ACTIVE_PET_INSTANCE_IDS
    });

    const combatNode = runResult.state.map?.nodes.find((node) => node.status === "available" && node.type === "combat");
    expect(combatNode).toBeDefined();

    const selected = selectRunNode(runResult.state, combatNode!.id);
    const combat = startCombatForRunNode({
      run: selected.state,
      registry,
      petInstances,
      seed: "phase12-two-pet-combat"
    });

    expect(combat.ok).toBe(true);
    expect(combat.state.activePetInstanceIds).toEqual(MULTI_PET_PROOF_ACTIVE_PET_INSTANCE_IDS);
    expect(combat.state.petInstances.map((pet) => pet.nickname)).toEqual(["Ember", "Cinder"]);
    expect(combat.state.runPetStates.map((pet) => pet.petInstanceId)).toEqual(MULTI_PET_PROOF_ACTIVE_PET_INSTANCE_IDS);
  });

  it("routes an all-active pet command once per active pet in slot order", () => {
    const registry = {
      ...starterRegistry,
      cards: starterRegistry.cards.map((card) =>
        card.id === "fox_bite"
          ? {
              ...card,
              effects: [
                {
                  type: "petAttack" as const,
                  petTarget: { type: "allActive" as const },
                  amount: 2,
                  target: { type: "target" as const }
                }
              ]
            }
          : card
      )
    };
    const state = {
      ...createHandTunedCombatFixture(),
      activePetInstanceIds: MULTI_PET_PROOF_ACTIVE_PET_INSTANCE_IDS,
      petInstances: createMultiPetProofPetInstances(),
      runPetStates: createMultiPetProofPetInstances().map((pet) => ({
        petInstanceId: pet.id,
        mood: "calm" as const,
        activeModifierIds: [],
        temporaryModifierIds: [],
        usedModifierIdsThisCombat: [],
        usedModifierIdsThisTurn: [],
        fatigue: 0
      }))
    };
    const result = playCard(
      state,
      { type: "playCard", cardInstanceId: cardInstanceId("fox_bite:1"), targetId },
      registry,
      createRng("phase12-all-active-command")
    );

    expect(result.ok).toBe(true);
    expect(result.events.filter((event) => event.type === "PetCommanded")).toEqual([
      {
        type: "PetCommanded",
        petInstanceId: MULTI_PET_PROOF_ACTIVE_PET_INSTANCE_IDS[0],
        cardInstanceId: cardInstanceId("fox_bite:1"),
        cardId: "fox_bite"
      },
      {
        type: "PetCommanded",
        petInstanceId: MULTI_PET_PROOF_ACTIVE_PET_INSTANCE_IDS[1],
        cardInstanceId: cardInstanceId("fox_bite:1"),
        cardId: "fox_bite"
      }
    ]);
    expect(result.state.monsters[0].hp).toBe(18);
  });

  it("round-trips a two-pet active run through save snapshot restore", () => {
    const registry = createMultiPetProofRegistry();
    const petInstances = createMultiPetProofPetInstances();
    const run = createRun({
      seed: "phase12-two-pet-save",
      playerClassId: playerClassId("novice_tamer"),
      activePetInstanceIds: MULTI_PET_PROOF_ACTIVE_PET_INSTANCE_IDS,
      petInstances,
      registry
    }).state;
    const snapshot = createSaveSnapshot({
      profileId: "phase12_multi_pet",
      registry,
      activeRun: run,
      petInstances,
      now: "2026-05-27T00:00:00.000Z"
    });
    const serialized = serializeSaveSnapshot(snapshot.state);
    const parsed = parseSaveSnapshot(serialized.state, registry);
    const restored = restoreSaveSnapshot(parsed.state, registry);

    expect(snapshot.ok).toBe(true);
    expect(serialized.ok).toBe(true);
    expect(parsed.ok).toBe(true);
    expect(restored.ok).toBe(true);
    expect(restored.state.activeRun?.activePetInstanceIds).toEqual(MULTI_PET_PROOF_ACTIVE_PET_INSTANCE_IDS);
    expect(restored.state.petInstances.map((pet) => pet.nickname)).toEqual(["Ember", "Cinder"]);
  });

  it("can enter combat through the agent driver with two active pets", () => {
    const driver = createAgentRunDriver({
      seed: "phase12-two-pet-driver",
      registry: createMultiPetProofRegistry(),
      petInstances: createMultiPetProofPetInstances(),
      activePetInstanceIds: MULTI_PET_PROOF_ACTIVE_PET_INSTANCE_IDS
    });
    const action = deterministicSmokePolicy(driver.getSnapshot());

    expect(action).toMatchObject({ type: "selectMapNode" });

    const result = driver.applyAction(action!, "policy");

    expect(result.ok).toBe(true);
    expect(driver.getSnapshot().combat?.activePetInstanceIds).toEqual(MULTI_PET_PROOF_ACTIVE_PET_INSTANCE_IDS);
    expect(driver.getSnapshot().combat?.runPetStates.map((pet) => pet.petInstanceId)).toEqual(MULTI_PET_PROOF_ACTIVE_PET_INSTANCE_IDS);
  });
});
