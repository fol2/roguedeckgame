import { describe, expect, it } from "vitest";
import {
  AGENT_TRACE_SCHEMA_VERSION,
  analyzeAgentTrace,
  analyzeAgentTraces,
  cardId,
  checkSimulationHealth,
  combatantId,
  encounterId,
  monsterAbilityId,
  monsterIntentId,
  petDefinitionId,
  petInstanceId,
  rewardOfferId,
  rewardOptionId,
  runFuzzSimulation,
  runId,
  runNodeId,
  runSmokeSimulation,
  statusId,
  upgradeId,
  type AgentTrace,
  type AgentTraceMetrics,
  type SimulationAggregateReport
} from "../../src/game-core";

describe("simulation analysis", () => {
  it("summarizes smoke traces into engine-flow and balance metrics", () => {
    const result = runSmokeSimulation({ seed: "sim", maxSteps: 500 });
    const report = analyzeAgentTraces(result.traces);

    expect(result.ok).toBe(true);
    expect(report.totalRuns).toBe(result.traces.length);
    expect(report.completedRuns).toBeGreaterThan(0);
    expect(report.combatsStarted).toBeGreaterThan(0);
    expect(report.rewardsOffered).toBeGreaterThan(0);
    expect(report.totalDamageToMonsters).toBeGreaterThan(0);
    expect(Object.keys(report.cardPlaysByCardId).length).toBeGreaterThan(0);
    expect(Object.keys(report.balance?.monsterAbilityPlansByAbilityId ?? {}).length).toBeGreaterThan(0);
    expect(Object.keys(report.balance?.monsterAbilityPlaysByAbilityId ?? {}).length).toBeGreaterThan(0);
    expect(Object.keys(report.balance?.encountersStartedById ?? {}).length).toBeGreaterThan(0);
    expect(Object.keys(report.balance?.encountersWonById ?? {}).length).toBeGreaterThan(0);
    expect(Object.keys(report.balance?.totalDamageToMonstersByEncounterId ?? {}).length).toBeGreaterThan(0);
    expect(Object.keys(report.balance?.rewardOffersByType ?? {}).length).toBeGreaterThan(0);
    expect(report.balance?.rewardSelectionRatesByType.petUpgrade).toBeGreaterThan(0);
  });

  it("aggregates ability, status, reward, and encounter balance dimensions from events", () => {
    const trace: AgentTrace = {
      schemaVersion: AGENT_TRACE_SCHEMA_VERSION,
      seed: "synthetic-balance",
      mode: "smoke",
      finalStatus: "completed",
      steps: [{
        step: 0,
        action: { type: "endTurn" },
        source: "policy",
        ok: true,
        errors: [],
        stateHashAfter: "hash",
        events: [
          {
            type: "RunCombatStarted",
            nodeId: runNodeId("node_1"),
            encounterId: encounterId("encounter_1"),
            combatId: runId("combat_1")
          },
          { type: "CombatStarted", combatId: "combat_1", seed: "synthetic-balance" },
          {
            type: "MonsterAbilityPlanned",
            monsterId: combatantId("monster:ash_mite:0"),
            abilityId: monsterAbilityId("ash_mite_burn"),
            intentId: monsterIntentId("ash_mite_burn"),
            intentType: "debuff",
            description: "Apply burn."
          },
          {
            type: "MonsterAbilityPlayed",
            monsterId: combatantId("monster:ash_mite:0"),
            abilityId: monsterAbilityId("ash_mite_burn"),
            intentId: monsterIntentId("ash_mite_burn")
          },
          { type: "StatusApplied", targetId: combatantId("player"), statusId: statusId("burn"), stacks: 1 },
          { type: "StatusApplied", targetId: combatantId("monster:ash_mite:0"), statusId: statusId("burn"), stacks: 1 },
          { type: "StatusApplicationBlocked", targetId: combatantId("player"), statusId: statusId("burn"), blockedByStatusId: statusId("ember_ward") },
          { type: "StatusTicked", targetId: combatantId("player"), statusId: statusId("burn"), stacksBefore: 1, stacksAfter: 0, amount: 1 },
          { type: "StatusCleansed", targetId: combatantId("monster:ash_mite:0"), statusId: statusId("burn"), stacksRemoved: 1, remainingStacks: 0 },
          { type: "StatusConsumed", targetId: combatantId("player"), statusId: statusId("burn"), stacksConsumed: 1, remainingStacks: 0 },
          { type: "StatusExpired", targetId: combatantId("player"), statusId: statusId("burn") },
          { type: "DamageDealt", sourceId: combatantId("player"), targetId: combatantId("monster:ash_mite:0"), amount: 7, blocked: 0 },
          { type: "DamageDealt", sourceId: combatantId("monster:ash_mite:0"), targetId: combatantId("player"), amount: 2, blocked: 1 },
          { type: "RunNodeSelected", nodeId: runNodeId("node_1") },
          { type: "RunNodeSelected", nodeId: runNodeId("node_2") },
          { type: "CombatEnded", outcome: "won" },
          {
            type: "RewardOffered",
            rewardOfferId: rewardOfferId("offer_1"),
            options: [
              { id: rewardOptionId("option_card"), type: "card", cardId: cardId("strike") },
              { id: rewardOptionId("option_card_2"), type: "card", cardId: cardId("defend") },
              {
                id: rewardOptionId("option_upgrade"),
                type: "petUpgrade",
                petInstanceId: petInstanceId("ember_fox_001"),
                petDefinitionId: petDefinitionId("ember_fox"),
                upgradeId: upgradeId("warm_bond")
              }
            ]
          },
          {
            type: "RewardSelected",
            rewardOfferId: rewardOfferId("offer_1"),
            rewardOptionId: rewardOptionId("option_upgrade"),
            rewardType: "petUpgrade"
          }
        ]
      }]
    };
    const report = analyzeAgentTraces([trace]);

    expect(report.balance?.monsterAbilityPlansByAbilityId).toEqual({ ash_mite_burn: 1 });
    expect(report.balance?.monsterAbilityPlaysByAbilityId).toEqual({ ash_mite_burn: 1 });
    expect(report.balance?.statusesAppliedByStatusId).toEqual({ burn: 2 });
    expect(report.balance?.statusesAppliedToPlayerByStatusId).toEqual({ burn: 1 });
    expect(report.balance?.statusesAppliedToMonstersByStatusId).toEqual({ burn: 1 });
    expect(report.balance?.statusesBlockedByStatusId).toEqual({ burn: 1 });
    expect(report.balance?.statusesCleansedByStatusId).toEqual({ burn: 1 });
    expect(report.balance?.statusesConsumedByStatusId).toEqual({ burn: 1 });
    expect(report.balance?.statusesExpiredByStatusId).toEqual({ burn: 1 });
    expect(report.balance?.statusTicksByStatusId).toEqual({ burn: 1 });
    expect(report.balance?.encountersStartedById).toEqual({ encounter_1: 1 });
    expect(report.balance?.encountersWonById).toEqual({ encounter_1: 1 });
    expect(report.balance?.runPathsByNodeIds).toEqual({ "node_1 > node_2": 1 });
    expect(report.balance?.totalDamageToPlayerByEncounterId).toEqual({ encounter_1: 2 });
    expect(report.balance?.totalDamageToMonstersByEncounterId).toEqual({ encounter_1: 7 });
    expect(report.balance?.rewardOffersByType).toEqual({ card: 1, petUpgrade: 1 });
    expect(report.balance?.rewardSelectionRatesByType).toEqual({ card: 0, petUpgrade: 1 });
  });

  it("tracks invalid-action rejection coverage in fuzz traces", () => {
    const result = runFuzzSimulation({ seed: "analysis-fuzz", runs: 6, maxSteps: 160, invalidActionRate: 0.3 });
    const report = analyzeAgentTraces(result.traces);
    const health = checkSimulationHealth(report, {
      requireCompletedRun: false,
      requireInvalidRejections: true,
      warnIfNoLosses: false,
      warnIfNoRewards: false,
      warnIfNoPetUpgrades: false,
      warnIfNoPlayerDamage: false,
      warnIfNoMonsterDamage: false
    });

    expect(result.ok).toBe(true);
    expect(report.invalidInjectedActions).toBeGreaterThan(0);
    expect(report.invalidRejectedActions).toBe(report.invalidInjectedActions);
    expect(health.filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("emits health issues for samples that never complete or exercise invalid validation", () => {
    const result = runFuzzSimulation({ seed: "analysis-underpowered", runs: 1, maxSteps: 1, invalidActionRate: 0 });
    const report = analyzeAgentTraces(result.traces);
    const issues = checkSimulationHealth(report, {
      requireCompletedRun: true,
      requireInvalidRejections: true,
      warnIfNoLosses: false,
      warnIfNoRewards: false,
      warnIfNoPetUpgrades: false,
      warnIfNoPlayerDamage: false,
      warnIfNoMonsterDamage: false
    });

    expect(issues.map((issue) => issue.code)).toContain("simulation_failures_present");
    expect(issues.map((issue) => issue.code)).toContain("no_completed_runs");
    expect(issues.map((issue) => issue.code)).toContain("invalid_injection_not_exercised");
  });



  it("tracks persistent run HP metrics across analyzed traces", () => {
    const result = runFuzzSimulation({ seed: "analysis-hp", runs: 12, maxSteps: 300, invalidActionRate: 0 });
    const report = analyzeAgentTraces(result.traces);

    expect(result.ok).toBe(true);
    expect(report.averageFinalRunHp).toBeGreaterThanOrEqual(0);
    expect(report.traces.every((trace) => trace.startingRunHp === undefined || trace.startingRunHp > 0)).toBe(true);
    if (report.completedRuns > 0) {
      expect(report.averageCompletedFinalRunHp).toBeGreaterThan(0);
      expect(report.maxCompletedFinalRunHp).toBeGreaterThanOrEqual(report.minCompletedFinalRunHp);
    }
  });

  it("can enforce explicit completion-rate balance gates", () => {
    const result = runFuzzSimulation({ seed: "analysis-balance-gate", runs: 6, maxSteps: 300, invalidActionRate: 0 });
    const report = analyzeAgentTraces(result.traces);
    const tooHigh = checkSimulationHealth(
      { ...report, completionRate: 1, completedRuns: report.totalRuns, lostRuns: 0 },
      {
        requireCompletedRun: false,
        requireInvalidRejections: false,
        warnIfNoLosses: false,
        warnIfNoRewards: false,
        warnIfNoPetUpgrades: false,
        warnIfNoPlayerDamage: false,
        warnIfNoMonsterDamage: false,
        maxCompletionRateError: 0.6
      }
    );
    const tooLow = checkSimulationHealth(
      { ...report, completionRate: 0, completedRuns: 0, lostRuns: report.totalRuns },
      {
        requireCompletedRun: false,
        requireInvalidRejections: false,
        warnIfNoLosses: false,
        warnIfNoRewards: false,
        warnIfNoPetUpgrades: false,
        warnIfNoPlayerDamage: false,
        warnIfNoMonsterDamage: false,
        minCompletionRateError: 0.45
      }
    );

    expect(tooHigh.map((issue) => issue.code)).toContain("completion_rate_above_balance_target");
    expect(tooLow.map((issue) => issue.code)).toContain("completion_rate_below_balance_target");
  });

  it("can analyze an individual trace", () => {
    const result = runSmokeSimulation({ seed: "analysis-single", maxSteps: 500 });
    const metric = analyzeAgentTrace(result.traces[0]);

    expect(metric.steps).toBe(result.traces[0].steps.length);
    expect(metric.acceptedActions).toBeGreaterThan(0);
    expect(metric.rejectedActions).toBe(0);
    expect(Object.keys(metric.balance?.monsterAbilityPlansByAbilityId ?? {}).length).toBeGreaterThan(0);
  });

  it("keeps old-shape exported analysis report fixtures assignable", () => {
    const oldTraceMetrics: AgentTraceMetrics = {
      seed: "old-shape",
      mode: "smoke",
      steps: 0,
      acceptedActions: 0,
      rejectedActions: 0,
      invalidInjectedActions: 0,
      invalidRejectedActions: 0,
      invalidAcceptedActions: 0,
      maxTurnNumber: 0,
      combatsStarted: 0,
      combatsWon: 0,
      combatsLost: 0,
      rewardsOffered: 0,
      rewardsSelected: 0,
      rewardsSkipped: 0,
      cardRewardsAdded: 0,
      petUpgradesUnlocked: 0,
      storyEventsCompleted: 0,
      totalDamageToPlayer: 0,
      totalDamageToMonsters: 0,
      totalDamageBlocked: 0,
      totalBlockGainedByPlayer: 0,
      totalBlockGainedByMonsters: 0,
      actionCounts: {},
      eventCounts: {},
      selectedNodesById: {},
      cardPlaysByCardId: {},
      cardRewardsByCardId: {},
      petUpgradesByUpgradeId: {},
      rewardSelectionsByType: {}
    };
    const oldReport: SimulationAggregateReport = {
      totalRuns: 1,
      completedRuns: 0,
      lostRuns: 0,
      failedRuns: 0,
      otherTerminalRuns: 1,
      completionRate: 0,
      lossRate: 0,
      failureRate: 0,
      minSteps: 0,
      maxSteps: 0,
      averageSteps: 0,
      acceptedActions: 0,
      rejectedActions: 0,
      invalidInjectedActions: 0,
      invalidRejectedActions: 0,
      invalidAcceptedActions: 0,
      combatsStarted: 0,
      combatsWon: 0,
      combatsLost: 0,
      rewardsOffered: 0,
      rewardsSelected: 0,
      rewardsSkipped: 0,
      cardRewardsAdded: 0,
      petUpgradesUnlocked: 0,
      storyEventsCompleted: 0,
      averageFinalRunHp: 0,
      averageCompletedFinalRunHp: 0,
      minCompletedFinalRunHp: 0,
      maxCompletedFinalRunHp: 0,
      totalDamageToPlayer: 0,
      totalDamageToMonsters: 0,
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
      traces: [oldTraceMetrics]
    };

    expect(oldReport.balance).toBeUndefined();
  });
});
