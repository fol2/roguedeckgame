import { describe, expect, it } from "vitest";
import { currentRuntimeMetadata } from "../../src/game-core";
import {
  buildBalanceDashboardViewModel,
  type SimulationAggregateReport
} from "../../src/game-core/testing";

const report: SimulationAggregateReport = {
  totalRuns: 4,
  completedRuns: 3,
  lostRuns: 1,
  failedRuns: 0,
  otherTerminalRuns: 0,
  completionRate: 0.75,
  lossRate: 0.25,
  failureRate: 0,
  minSteps: 10,
  maxSteps: 40,
  averageSteps: 22,
  acceptedActions: 80,
  rejectedActions: 0,
  invalidInjectedActions: 0,
  invalidRejectedActions: 0,
  invalidAcceptedActions: 0,
  combatsStarted: 8,
  combatsWon: 7,
  combatsLost: 1,
  rewardsOffered: 6,
  rewardsSelected: 5,
  rewardsSkipped: 1,
  cardRewardsAdded: 3,
  petUpgradesUnlocked: 2,
  storyEventsCompleted: 0,
  averageFinalRunHp: 44.5,
  averageCompletedFinalRunHp: 52,
  minCompletedFinalRunHp: 38,
  maxCompletedFinalRunHp: 66,
  totalDamageToPlayer: 42,
  totalDamageToMonsters: 180,
  totalDamageBlocked: 18,
  totalBlockGainedByPlayer: 55,
  totalBlockGainedByMonsters: 0,
  actionCounts: {},
  eventCounts: {},
  selectedNodesById: {},
  cardPlaysByCardId: {},
  cardRewardsByCardId: {},
  petUpgradesByUpgradeId: {},
  rewardSelectionsByType: {},
  balance: {
    monsterAbilityPlansByAbilityId: {},
    monsterAbilityPlaysByAbilityId: { ash_mite_burn: 5, training_slime_attack: 2 },
    statusesAppliedByStatusId: {},
    statusesAppliedToPlayerByStatusId: {},
    statusesAppliedToMonstersByStatusId: {},
    statusesBlockedByStatusId: {},
    statusesCleansedByStatusId: {},
    statusesConsumedByStatusId: {},
    statusesExpiredByStatusId: {},
    statusTicksByStatusId: {},
    encountersStartedById: { ash_mite_encounter: 4, forest_duo_encounter: 2 },
    encountersWonById: { ash_mite_encounter: 3, forest_duo_encounter: 2 },
    encountersLostById: { ash_mite_encounter: 1 },
    runPathsByNodeIds: { "node_a > node_b": 3, "node_a > node_c": 1 },
    totalDamageToPlayerByEncounterId: { ash_mite_encounter: 30, forest_duo_encounter: 12 },
    totalDamageToMonstersByEncounterId: { ash_mite_encounter: 90, forest_duo_encounter: 90 },
    rewardOffersByType: { card: 4, petUpgrade: 2 },
    rewardSelectionRatesByType: { card: 0.5, petUpgrade: 1 }
  },
  traces: []
};

describe("balance dashboard view model", () => {
  it("projects simulation aggregate reports into dashboard sections", () => {
    const dashboard = buildBalanceDashboardViewModel(report, [], currentRuntimeMetadata, "starter-act1-forest-v1");

    expect(dashboard.summary).toContainEqual({ label: "Completion rate", value: "75.0%" });
    expect(dashboard.summary).toContainEqual({ label: "Avg final HP", value: "44.5" });
    expect(dashboard.summary).toContainEqual({ label: "Damage to player", value: "42" });
    expect(dashboard.summary).toContainEqual({ label: "Damage to monsters", value: "180" });
    expect(dashboard.sections.encounterOutcomes[0]).toMatchObject({
      id: "ash_mite_encounter",
      started: 4,
      won: 3,
      lost: 1,
      valueLabel: "75.0% win, 1 lost"
    });
    expect(dashboard.sections.damageByEncounter[0]).toMatchObject({
      id: "ash_mite_encounter",
      valueLabel: "to player 30, to monsters 90"
    });
    expect(dashboard.sections.rewardPickRates.map((entry) => [entry.id, entry.valueLabel])).toEqual([
      ["petUpgrade", "100.0%"],
      ["card", "50.0%"]
    ]);
    expect(dashboard.sections.monsterAbilityFrequency[0]).toMatchObject({
      id: "ash_mite_burn",
      valueLabel: "5"
    });
    expect(dashboard.sections.runPaths[0]).toMatchObject({
      id: "node_a > node_b",
      valueLabel: "3"
    });
  });

  it("carries simulation health issues into the dashboard", () => {
    const dashboard = buildBalanceDashboardViewModel(report, [{
      severity: "warning",
      code: "high_completion_rate",
      message: "Completion rate is high."
    }], currentRuntimeMetadata);

    expect(dashboard.healthIssues).toEqual([{
      severity: "warning",
      code: "high_completion_rate",
      message: "Completion rate is high."
    }]);
  });
});
