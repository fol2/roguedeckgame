import { describe, expect, it } from "vitest";
import { formatCountSummary, formatRateSummary } from "../../src/game-cli/report-format";
import { currentRuntimeMetadata } from "../../src/game-core";
import {
  buildBalanceDashboardViewModel,
  type SimulationAggregateReport
} from "../../src/game-core/testing";

describe("CLI report formatting", () => {
  it("formats reward pick rates as percentages instead of raw counts", () => {
    expect(formatRateSummary("  Reward pick rates", {
      petUpgrade: 1,
      card: 0.6227180527383367
    })).toBe("  Reward pick rates: petUpgrade=100.0%, card=62.3%");
  });

  it("formats encounter loss count summaries", () => {
    expect(formatCountSummary("  Encounters lost", {
      forest_boss_placeholder: 107
    })).toBe("  Encounters lost: forest_boss_placeholder=107");
  });

  it("keeps CLI reward and ability summaries aligned with dashboard entries", () => {
    const report: SimulationAggregateReport = {
      totalRuns: 1,
      completedRuns: 1,
      lostRuns: 0,
      failedRuns: 0,
      otherTerminalRuns: 0,
      completionRate: 1,
      lossRate: 0,
      failureRate: 0,
      minSteps: 1,
      maxSteps: 1,
      averageSteps: 1,
      acceptedActions: 1,
      rejectedActions: 0,
      invalidInjectedActions: 0,
      invalidRejectedActions: 0,
      invalidAcceptedActions: 0,
      combatsStarted: 1,
      combatsWon: 1,
      combatsLost: 0,
      rewardsOffered: 1,
      rewardsSelected: 1,
      rewardsSkipped: 0,
      cardRewardsAdded: 0,
      petUpgradesUnlocked: 1,
      storyEventsCompleted: 0,
      averageFinalRunHp: 60,
      averageCompletedFinalRunHp: 60,
      minCompletedFinalRunHp: 60,
      maxCompletedFinalRunHp: 60,
      totalDamageToPlayer: 4,
      totalDamageToMonsters: 20,
      totalDamageBlocked: 0,
      totalBlockGainedByPlayer: 0,
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
        monsterAbilityPlaysByAbilityId: { ash_mite_burn: 2 },
        statusesAppliedByStatusId: {},
        statusesAppliedToPlayerByStatusId: {},
        statusesAppliedToMonstersByStatusId: {},
        statusesBlockedByStatusId: {},
        statusesCleansedByStatusId: {},
        statusesConsumedByStatusId: {},
        statusesExpiredByStatusId: {},
        statusTicksByStatusId: {},
        encountersStartedById: {},
        encountersWonById: {},
        encountersLostById: {},
        runPathsByNodeIds: {},
        totalDamageToPlayerByEncounterId: {},
        totalDamageToMonstersByEncounterId: {},
        rewardOffersByType: { card: 1, petUpgrade: 1 },
        rewardSelectionRatesByType: { card: 0, petUpgrade: 1 }
      },
      traces: []
    };
    const dashboard = buildBalanceDashboardViewModel(report, [], currentRuntimeMetadata);

    expect(formatRateSummary("  Reward pick rates", report.balance!.rewardSelectionRatesByType))
      .toBe(`  Reward pick rates: ${dashboard.sections.rewardPickRates.map((entry) => `${entry.id}=${entry.valueLabel}`).join(", ")}`);
    expect(formatCountSummary("  Monster ability plays", report.balance!.monsterAbilityPlaysByAbilityId))
      .toBe(`  Monster ability plays: ${dashboard.sections.monsterAbilityFrequency.map((entry) => `${entry.id}=${entry.valueLabel}`).join(", ")}`);
  });
});
