import { describe, expect, it } from "vitest";
import {
  cardId,
  cardInstanceId,
  combatantId,
  encounterId,
  monsterIntentId,
  petDefinitionId,
  petInstanceId,
  petModifierId,
  playerClassId,
  rewardOfferId,
  rewardOptionId,
  runId,
  runNodeId,
  statusId,
  upgradeId,
  type GameEvent,
  type RewardOfferState
} from "../../src/game-core";
import { createStartedRunFixture } from "../../src/game-core/testing/run-fixtures";
import { createEmberFoxInstanceFixture } from "../../src/game-core/testing/fixtures";
import { formatCombatEventMessage } from "../../src/game-phaser/animation/combat-event-messages";
import { formatRunEventMessage } from "../../src/game-phaser/animation/run-event-messages";
import { createRunSandboxController } from "../../src/game-phaser/controllers/RunSandboxController";
import { buildCombatViewModel } from "../../src/game-phaser/view-models/combat-view-model";
import { buildRewardViewModel } from "../../src/game-phaser/view-models/reward-view-model";
import { buildRunViewModel } from "../../src/game-phaser/view-models/run-view-model";

const offer: RewardOfferState = {
  id: rewardOfferId("vertical-reward"),
  source: "combat",
  combatId: runId("vertical-run"),
  seed: "vertical-reward-seed",
  status: "open",
  options: [
    {
      id: rewardOptionId("vertical-reward:card:ember_spark"),
      type: "card",
      cardId: cardId("ember_spark")
    },
    {
      id: rewardOptionId("vertical-reward:upgrade:burning_fang"),
      type: "petUpgrade",
      petInstanceId: petInstanceId("ember_fox_001"),
      petDefinitionId: petDefinitionId("ember_fox"),
      upgradeId: upgradeId("burning_fang")
    }
  ]
};

describe("vertical slice view models", () => {
  it("labels elite and boss nodes and exposes reset state", () => {
    const viewModel = buildRunViewModel(createStartedRunFixture({ status: "completed" }), []);

    expect(viewModel.nodes.find((node) => node.type === "elite")).toMatchObject({
      label: "Elite"
    });
    expect(viewModel.nodes.find((node) => node.type === "boss")).toMatchObject({
      label: "Boss"
    });
    expect(viewModel.resetAvailable).toBe(true);
    expect(JSON.parse(JSON.stringify(viewModel))).toEqual(viewModel);
  });

  it("exposes combat encounter and node context", () => {
    const controller = createRunSandboxController("vertical-view-combat");
    const combatNode = controller.getRunViewModel().nodes.find((node) => node.status === "available" && node.type === "combat");

    expect(combatNode).toBeDefined();
    controller.selectMapNode(combatNode!.id);
    const viewModel = controller.getCombatViewModel();

    expect(viewModel).toMatchObject({
      runNodeType: "combat",
      encounterLabel: expect.any(String),
      continueAvailable: false,
      resetAvailable: false
    });
    expect(viewModel?.monsterIntents[0]?.description.length).toBeGreaterThan(0);
    expect(JSON.parse(JSON.stringify(viewModel))).toEqual(viewModel);
  });

  it("exposes continue for lost combat before reset is available", () => {
    const controller = createRunSandboxController("vertical-view-lost-combat");
    const combatNode = controller.getRunViewModel().nodes.find((node) => node.status === "available" && node.type === "combat");

    expect(combatNode).toBeDefined();
    controller.selectMapNode(combatNode!.id);
    const state = controller.getState();
    const viewModel = buildCombatViewModel({
      run: state.run,
      petInstances: state.petInstances,
      combat: { ...state.combat!, phase: "lost" },
      lastEvents: [{ type: "CombatEnded", outcome: "lost" }]
    });

    expect(viewModel.continueAvailable).toBe(true);
    expect(viewModel.resetAvailable).toBe(false);
  });

  it("exposes reward card details and target pet labels", () => {
    const petInstances = [createEmberFoxInstanceFixture()];
    const viewModel = buildRewardViewModel(offer, [], undefined, petInstances);

    expect(viewModel.skipAvailable).toBe(true);
    expect(viewModel.options[0]).toMatchObject({
      type: "card",
      typeLabel: "Card",
      title: "Ember Spark",
      cardCost: 1,
      description: "Deal 4 damage and apply 1 burn."
    });
    expect(viewModel.options[1]).toMatchObject({
      type: "petUpgrade",
      typeLabel: "Pet upgrade",
      title: "Burning Fang",
      targetPetLabel: "Ember (Ember Fox)"
    });
    expect(JSON.parse(JSON.stringify(viewModel))).toEqual(viewModel);
  });

  it("formats key vertical-slice event messages", () => {
    const runEvents: readonly GameEvent[] = [
      { type: "RunCreated", runId: runId("run-a"), seed: "seed-a", playerClassId: playerClassId("novice_tamer"), activePetInstanceIds: [petInstanceId("pet-a")] },
      { type: "RunNodeSelected", nodeId: runNodeId("node-a") },
      { type: "RunCombatStarted", nodeId: runNodeId("node-a"), encounterId: encounterId("encounter-a"), combatId: runId("run-a") },
      { type: "RunCombatCompleted", nodeId: runNodeId("node-a"), outcome: "won" },
      { type: "RunRewardPending", nodeId: runNodeId("node-a"), rewardOfferId: rewardOfferId("reward-a") },
      { type: "RunNodeCompleted", nodeId: runNodeId("node-a") },
      { type: "RunAdvanced", availableNodeIds: [runNodeId("node-b")] },
      { type: "RunEnded", outcome: "completed" },
      { type: "RewardOffered", rewardOfferId: rewardOfferId("reward-a"), options: [] },
      { type: "RewardSkipped", rewardOfferId: rewardOfferId("reward-a") },
      { type: "CardRewardAdded", cardId: cardId("ember_spark") },
      { type: "PetUpgradeUnlocked", petInstanceId: petInstanceId("pet-a"), upgradeId: upgradeId("burning_fang") },
      { type: "ActionRejected", code: "bad_action", message: "No.", path: "action" }
    ];
    const combatEvents: readonly GameEvent[] = [
      { type: "CombatEnded", outcome: "won" },
      { type: "MonsterIntentSet", monsterId: combatantId("monster-a"), intentId: monsterIntentId("intent-a"), intentType: "attack", description: "Attack." },
      { type: "MonsterIntentResolved", monsterId: combatantId("monster-a"), intentId: monsterIntentId("intent-a") },
      { type: "DamageDealt", sourceId: combatantId("monster-a"), targetId: combatantId("player"), amount: 4, blocked: 0 },
      { type: "BlockGained", targetId: combatantId("player"), amount: 3, total: 3 },
      { type: "StatusApplied", targetId: combatantId("player"), statusId: statusId("burn"), stacks: 1 },
      { type: "StatusTicked", targetId: combatantId("player"), statusId: statusId("burn"), stacksBefore: 1, stacksAfter: 0, amount: 1 },
      { type: "PetModifierActivated", petInstanceId: petInstanceId("pet-a"), upgradeId: upgradeId("burning_fang"), modifierId: petModifierId("burning_fang:burn_bonus"), reason: "effectAmount" },
      { type: "CardCostModified", cardInstanceId: cardInstanceId("card-a"), cardId: cardId("fox_bite"), originalCost: 1, modifiedCost: 0, modifierId: petModifierId("warm_bond:cost"), petInstanceId: petInstanceId("pet-a") }
    ];

    expect(runEvents.map(formatRunEventMessage).every((message) => !message.startsWith("Event:"))).toBe(true);
    expect(combatEvents.map(formatCombatEventMessage).every((message) => !message.startsWith("Event:"))).toBe(true);
  });
});
