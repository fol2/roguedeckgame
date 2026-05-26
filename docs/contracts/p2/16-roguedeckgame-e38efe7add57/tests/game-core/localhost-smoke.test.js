import { createServer } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import {
  claimReward,
  completeRunCombatNode,
  createCombat,
  createRun,
  createRng,
  createSaveSnapshot,
  evaluatePetSideStories,
  generateCombatRewardOffer,
  parseSaveSnapshot,
  playerClassId,
  playCard,
  restoreSaveSnapshot,
  selectRunNode,
  serializeSaveSnapshot,
  skipRunPendingReward,
  startCombatForRunNode,
  starterRegistry,
  upgradeId,
  validateRegistry
} from "../../src/game-core";
import {
  createOpenRewardOfferFixture,
  createPetUpgradeRewardOptionFixture,
  createRewardPetInstancesFixture,
  createRewardRunFixture,
  createWonCombatFixture
} from "../../src/game-core/testing/reward-fixtures";
import { cardInstanceId, combatantId, monsterId } from "../../src/game-core";
import { createHandTunedCombatFixture } from "../../src/game-core/testing/combat-fixtures";

let server;

const closeServer = async () => {
  if (!server) {
    return;
  }

  const serverToClose = server;
  server = undefined;

  await new Promise((resolve, reject) => {
    serverToClose.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
};

describe("localhost smoke", () => {
  afterEach(async () => {
    await closeServer();
  });

  it("serves registry validation evidence over localhost", async () => {
    server = createServer((request, response) => {
      if (request.url !== "/health") {
        response.statusCode = 404;
        response.end();
        return;
      }

      const validation = validateRegistry(starterRegistry);
      const run = createRewardRunFixture();
      const petInstances = createRewardPetInstancesFixture();
      const createdRun = createRun({
        seed: "localhost-smoke-run",
        playerClassId: playerClassId("novice_tamer"),
        activePetInstanceIds: [petInstances[0].id],
        petInstances,
        registry: starterRegistry
      });
      const firstRunNode = createdRun.state.map?.nodes.find((node) => node.status === "available" && node.type === "combat");
      const selectedRunNode = firstRunNode ? selectRunNode(createdRun.state, firstRunNode.id) : undefined;
      const runCombat = selectedRunNode
        ? startCombatForRunNode({
            run: selectedRunNode.state,
            registry: starterRegistry,
            petInstances,
            seed: "localhost-smoke-run-combat"
          })
        : undefined;
      const wonRunCombat = runCombat
        ? {
            ...runCombat.state,
            phase: "won",
            monsters: runCombat.state.monsters.map((monster) => ({ ...monster, hp: 0, alive: false })),
            monsterIntents: []
          }
        : undefined;
      const storyProgress = evaluatePetSideStories({
        run: selectedRunNode?.state ?? createdRun.state,
        petInstances,
        registry: starterRegistry,
        context: {
          trigger: "nodeCompleted",
          run: selectedRunNode?.state ?? createdRun.state,
          completedNodeType: "combat"
        }
      });
      const completedRunCombat = selectedRunNode && wonRunCombat
        ? completeRunCombatNode({
            run: selectedRunNode.state,
            combat: wonRunCombat,
            registry: starterRegistry,
            petInstances: storyProgress.state.petInstances,
            rewardSeed: "localhost-smoke-run-reward"
          })
        : undefined;
      const settledRunReward = completedRunCombat
        ? skipRunPendingReward({ run: completedRunCombat.state, petInstances: storyProgress.state.petInstances })
        : undefined;
      const storySnapshot = createSaveSnapshot({
        profileId: "localhost-smoke-profile",
        activeRun: completedRunCombat?.state,
        petInstances: storyProgress.state.petInstances,
        now: "2026-05-25T00:00:00.000Z"
      });
      const storySerialized = serializeSaveSnapshot(storySnapshot.state);
      const storyRestored = restoreSaveSnapshot(parseSaveSnapshot(storySerialized.state).state);
      const reward = generateCombatRewardOffer({
        combat: createWonCombatFixture(),
        run,
        registry: starterRegistry,
        petInstances,
        seed: "localhost-smoke-reward"
      });
      const cardOption = reward.state.options.find((option) => option.type === "card");
      const claim = cardOption
        ? claimReward({
            rewardOffer: reward.state,
            selectedOptionId: cardOption.id,
            run,
            petInstances,
            registry: starterRegistry
          })
        : undefined;
      const upgradeOption = createPetUpgradeRewardOptionFixture({
        upgradeId: upgradeId("burning_fang")
      });
      const upgradeClaim = claimReward({
        rewardOffer: createOpenRewardOfferFixture([upgradeOption]),
        selectedOptionId: upgradeOption.id,
        run,
        petInstances,
        registry: starterRegistry
      });
      const combat = createCombat({
        run: upgradeClaim.state.run,
        registry: starterRegistry,
        petInstances: upgradeClaim.state.petInstances,
        monsterIds: [monsterId("training_slime")],
        seed: "localhost-smoke-modifier",
        openingHandSize: 0
      });
      const modifierState = {
        ...createHandTunedCombatFixture(),
        activePetInstanceIds: combat.state.activePetInstanceIds,
        petInstances: combat.state.petInstances,
        runPetStates: combat.state.runPetStates
      };
      const modifierPlay = playCard(
        modifierState,
        {
          type: "playCard",
          cardInstanceId: cardInstanceId("fox_bite:1"),
          targetId: combatantId("monster:training_slime:0")
        },
        starterRegistry,
        createRng("localhost-smoke-bite")
      );

      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          ok: validation.errors.length === 0,
          cards: starterRegistry.cards.length,
          pets: starterRegistry.pets.map((pet) => pet.id),
          players: starterRegistry.players.map((player) => player.id),
          reward: {
            ok: reward.ok,
            status: reward.state.status,
            options: reward.state.options.length,
            claimOk: claim?.ok ?? false,
            claimedDeckCards: claim?.state.run.deckCardIds.length ?? run.deckCardIds.length
          },
          runLifecycle: {
            createdOk: createdRun.ok,
            initialAvailableLayers: createdRun.state.map?.nodes
              .filter((node) => node.status === "available")
              .map((node) => node.layer),
            selectedOk: selectedRunNode?.ok ?? false,
            combatOk: runCombat?.ok ?? false,
            completedStatus: completedRunCombat?.state.status,
            pendingRewardStatus: completedRunCombat?.state.pendingRewardOffer?.status,
            settledOk: settledRunReward?.ok ?? false,
            advancedStatus: settledRunReward?.state.run.status,
            availableAfterSettlement: settledRunReward?.state.run.map?.nodes
              .filter((node) => node.status === "available")
              .map((node) => node.id)
          },
          storySave: {
            storyOk: storyProgress.ok,
            memoryIds: storyProgress.state.petInstances[0]?.unlockedMemoryIds ?? [],
            storyFlags: storyProgress.state.petInstances[0]?.storyFlags ?? [],
            upgrades: storyProgress.state.petInstances[0]?.unlockedUpgradeIds ?? [],
            snapshotOk: storySnapshot.ok,
            serializedOk: storySerialized.ok,
            restoredOk: storyRestored.ok,
            restoredRunStatus: storyRestored.state.activeRun?.status,
            restoredPendingRewardStatus: storyRestored.state.activeRun?.pendingRewardOffer?.status
          },
          modifier: {
            upgradeClaimOk: upgradeClaim.ok,
            combatOk: combat.ok,
            activeModifierIds: combat.state.runPetStates[0]?.activeModifierIds ?? [],
            playOk: modifierPlay.ok,
            monsterHp: modifierPlay.state.monsters[0]?.hp,
            burnStacks: modifierPlay.state.monsters[0]?.statuses.find((status) => status.statusId === "burn")?.stacks
          },
          errors: validation.errors
        })
      );
    });

    await new Promise((resolve, reject) => {
      server?.once("error", reject);
      server?.listen(0, "127.0.0.1", resolve);
    });

    const address = server.address();

    if (!address || typeof address === "string") {
      throw new Error("Expected localhost server to bind to a TCP port");
    }

    const response = await fetch(`http://127.0.0.1:${address.port}/health`);
    const payload = await response.json();

    console.info(`localhost smoke URL: http://127.0.0.1:${address.port}/health`);

    expect(response.ok).toBe(true);
    expect(payload).toMatchObject({
      ok: true,
      cards: 12,
      pets: ["ember_fox"],
      players: ["novice_tamer"],
      reward: {
        ok: true,
        status: "open",
        options: 4,
        claimOk: true,
        claimedDeckCards: 4
      },
      runLifecycle: {
        createdOk: true,
        initialAvailableLayers: [0, 0],
        selectedOk: true,
        combatOk: true,
        completedStatus: "reward",
        pendingRewardStatus: "open",
        settledOk: true,
        advancedStatus: "map_select"
      },
      storySave: {
        storyOk: true,
        memoryIds: ["ember_fox_memory_burned_orchard"],
        storyFlags: ["ember_fox_memory_01_unlocked"],
        upgrades: ["warm_bond"],
        snapshotOk: true,
        serializedOk: true,
        restoredOk: true,
        restoredRunStatus: "reward",
        restoredPendingRewardStatus: "open"
      },
      modifier: {
        upgradeClaimOk: true,
        combatOk: true,
        activeModifierIds: ["burning_fang_modifier"],
        playOk: true,
        monsterHp: 15,
        burnStacks: 3
      },
      errors: []
    });
  });
});
