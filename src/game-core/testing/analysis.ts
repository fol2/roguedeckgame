import type { AgentAction, AgentTraceMode } from "./agent-actions";
import type { AgentTrace } from "./trace";
import type { RunStatus } from "../model/run";

export type CountMap = Readonly<Record<string, number>>;
export type RateMap = Readonly<Record<string, number>>;

export type SimulationBalanceMetrics = {
  readonly monsterAbilityPlansByAbilityId: CountMap;
  readonly monsterAbilityPlaysByAbilityId: CountMap;
  readonly statusesAppliedByStatusId: CountMap;
  readonly statusesAppliedToPlayerByStatusId: CountMap;
  readonly statusesAppliedToMonstersByStatusId: CountMap;
  readonly statusesBlockedByStatusId: CountMap;
  readonly statusesCleansedByStatusId: CountMap;
  readonly statusesConsumedByStatusId: CountMap;
  readonly statusesExpiredByStatusId: CountMap;
  readonly statusTicksByStatusId: CountMap;
  readonly encountersStartedById: CountMap;
  readonly encountersWonById: CountMap;
  readonly encountersLostById: CountMap;
  readonly runPathsByNodeIds: CountMap;
  readonly totalDamageToPlayerByEncounterId: CountMap;
  readonly totalDamageToMonstersByEncounterId: CountMap;
  readonly rewardOffersByType: CountMap;
  readonly rewardSelectionRatesByType: RateMap;
};

export type AgentTraceMetrics = {
  readonly seed: string | number;
  readonly mode: AgentTraceMode;
  readonly finalStatus?: RunStatus;
  readonly failureCode?: string;
  readonly steps: number;
  readonly acceptedActions: number;
  readonly rejectedActions: number;
  readonly invalidInjectedActions: number;
  readonly invalidRejectedActions: number;
  readonly invalidAcceptedActions: number;
  readonly maxTurnNumber: number;
  readonly combatsStarted: number;
  readonly combatsWon: number;
  readonly combatsLost: number;
  readonly rewardsOffered: number;
  readonly rewardsSelected: number;
  readonly rewardsSkipped: number;
  readonly cardRewardsAdded: number;
  readonly petUpgradesUnlocked: number;
  readonly storyEventsCompleted: number;
  readonly startingRunHp?: number;
  readonly startingRunMaxHp?: number;
  readonly finalRunHp?: number;
  readonly finalRunMaxHp?: number;
  readonly totalDamageToPlayer: number;
  readonly totalDamageToMonsters: number;
  readonly totalDamageBlocked: number;
  readonly totalBlockGainedByPlayer: number;
  readonly totalBlockGainedByMonsters: number;
  readonly actionCounts: CountMap;
  readonly eventCounts: CountMap;
  readonly selectedNodesById: CountMap;
  readonly cardPlaysByCardId: CountMap;
  readonly cardRewardsByCardId: CountMap;
  readonly petUpgradesByUpgradeId: CountMap;
  readonly rewardSelectionsByType: CountMap;
  readonly balance?: SimulationBalanceMetrics;
};

export type SimulationAggregateReport = {
  readonly totalRuns: number;
  readonly completedRuns: number;
  readonly lostRuns: number;
  readonly failedRuns: number;
  readonly otherTerminalRuns: number;
  readonly completionRate: number;
  readonly lossRate: number;
  readonly failureRate: number;
  readonly minSteps: number;
  readonly maxSteps: number;
  readonly averageSteps: number;
  readonly acceptedActions: number;
  readonly rejectedActions: number;
  readonly invalidInjectedActions: number;
  readonly invalidRejectedActions: number;
  readonly invalidAcceptedActions: number;
  readonly combatsStarted: number;
  readonly combatsWon: number;
  readonly combatsLost: number;
  readonly rewardsOffered: number;
  readonly rewardsSelected: number;
  readonly rewardsSkipped: number;
  readonly cardRewardsAdded: number;
  readonly petUpgradesUnlocked: number;
  readonly storyEventsCompleted: number;
  readonly averageFinalRunHp: number;
  readonly averageCompletedFinalRunHp: number;
  readonly minCompletedFinalRunHp: number;
  readonly maxCompletedFinalRunHp: number;
  readonly totalDamageToPlayer: number;
  readonly totalDamageToMonsters: number;
  readonly totalDamageBlocked: number;
  readonly totalBlockGainedByPlayer: number;
  readonly totalBlockGainedByMonsters: number;
  readonly actionCounts: CountMap;
  readonly eventCounts: CountMap;
  readonly selectedNodesById: CountMap;
  readonly cardPlaysByCardId: CountMap;
  readonly cardRewardsByCardId: CountMap;
  readonly petUpgradesByUpgradeId: CountMap;
  readonly rewardSelectionsByType: CountMap;
  readonly balance?: SimulationBalanceMetrics;
  readonly traces: readonly AgentTraceMetrics[];
};

export type SimulationHealthIssue = {
  readonly severity: "error" | "warning";
  readonly code: string;
  readonly message: string;
};

export type SimulationHealthOptions = {
  readonly requireCompletedRun?: boolean;
  readonly requireInvalidRejections?: boolean;
  readonly warnIfNoLosses?: boolean;
  readonly warnIfNoRewards?: boolean;
  readonly warnIfNoPetUpgrades?: boolean;
  readonly warnIfNoPlayerDamage?: boolean;
  readonly warnIfNoMonsterDamage?: boolean;
  readonly highCompletionRateWarning?: number;
  readonly lowCompletionRateWarning?: number;
  readonly minCompletionRateError?: number;
  readonly maxCompletionRateError?: number;
};

const emptyCountMap = (): Record<string, number> => ({});

const increment = (counts: Record<string, number>, key: string | number | undefined, amount = 1): void => {
  if (key === undefined) {
    return;
  }
  const stringKey = String(key);
  counts[stringKey] = (counts[stringKey] ?? 0) + amount;
};

const mergeCounts = (target: Record<string, number>, source: CountMap): void => {
  for (const [key, value] of Object.entries(source)) {
    increment(target, key, value);
  }
};

const buildRates = (numerators: CountMap, denominators: CountMap): CountMap => {
  const keys = new Set([...Object.keys(numerators), ...Object.keys(denominators)]);
  const rates: Record<string, number> = {};
  for (const key of keys) {
    rates[key] = safeAverage(numerators[key] ?? 0, denominators[key] ?? 0);
  }
  return rates;
};

const actionKey = (action: AgentAction): string => {
  if (action.type === "playCard") {
    return action.targetId ? "playCard:targeted" : "playCard:targetless";
  }
  return action.type;
};

const isPlayerCombatant = (combatantId: string): boolean => combatantId === "player" || combatantId.startsWith("player:");
const isMonsterCombatant = (combatantId: string): boolean => combatantId.startsWith("monster:");
const safeAverage = (sum: number, count: number): number => count === 0 ? 0 : sum / count;

export const analyzeAgentTrace = (trace: AgentTrace): AgentTraceMetrics => {
  const actionCounts = emptyCountMap();
  const eventCounts = emptyCountMap();
  const selectedNodesById = emptyCountMap();
  const cardPlaysByCardId = emptyCountMap();
  const monsterAbilityPlansByAbilityId = emptyCountMap();
  const monsterAbilityPlaysByAbilityId = emptyCountMap();
  const statusesAppliedByStatusId = emptyCountMap();
  const statusesAppliedToPlayerByStatusId = emptyCountMap();
  const statusesAppliedToMonstersByStatusId = emptyCountMap();
  const statusesBlockedByStatusId = emptyCountMap();
  const statusesCleansedByStatusId = emptyCountMap();
  const statusesConsumedByStatusId = emptyCountMap();
  const statusesExpiredByStatusId = emptyCountMap();
  const statusTicksByStatusId = emptyCountMap();
  const encountersStartedById = emptyCountMap();
  const encountersWonById = emptyCountMap();
  const encountersLostById = emptyCountMap();
  const selectedRunNodePath: string[] = [];
  const totalDamageToPlayerByEncounterId = emptyCountMap();
  const totalDamageToMonstersByEncounterId = emptyCountMap();
  const cardRewardsByCardId = emptyCountMap();
  const rewardOffersByType = emptyCountMap();
  const petUpgradesByUpgradeId = emptyCountMap();
  const rewardSelectionsByType = emptyCountMap();

  let acceptedActions = 0;
  let rejectedActions = 0;
  let invalidInjectedActions = 0;
  let invalidRejectedActions = 0;
  let invalidAcceptedActions = 0;
  let maxTurnNumber = 0;
  let combatsStarted = 0;
  let combatsWon = 0;
  let combatsLost = 0;
  let rewardsOffered = 0;
  let rewardsSelected = 0;
  let rewardsSkipped = 0;
  let cardRewardsAdded = 0;
  let petUpgradesUnlocked = 0;
  let storyEventsCompleted = 0;
  let startingRunHp: number | undefined;
  let startingRunMaxHp: number | undefined;
  let runHp: number | undefined;
  let runMaxHp: number | undefined;
  let totalDamageToPlayer = 0;
  let totalDamageToMonsters = 0;
  let totalDamageBlocked = 0;
  let totalBlockGainedByPlayer = 0;
  let totalBlockGainedByMonsters = 0;
  let activeEncounterId: string | undefined;

  for (const step of trace.steps) {
    increment(actionCounts, actionKey(step.action));
    if (step.ok) {
      acceptedActions += 1;
    } else {
      rejectedActions += 1;
    }
    if (step.source === "invalid-injected") {
      invalidInjectedActions += 1;
      if (step.ok) {
        invalidAcceptedActions += 1;
      } else {
        invalidRejectedActions += 1;
      }
    }

    for (const event of step.events) {
      increment(eventCounts, event.type);
      if (event.type === "RunCreated") {
        startingRunHp = event.playerHp;
        startingRunMaxHp = event.playerMaxHp;
        runHp = event.playerHp;
        runMaxHp = event.playerMaxHp;
      } else if (event.type === "RunNodeSelected") {
        increment(selectedNodesById, event.nodeId);
        selectedRunNodePath.push(String(event.nodeId));
      } else if (event.type === "RunCombatStarted") {
        activeEncounterId = String(event.encounterId);
        increment(encountersStartedById, activeEncounterId);
      } else if (event.type === "CombatStarted") {
        combatsStarted += event.type === "CombatStarted" ? 1 : 0;
      } else if (event.type === "RunCombatCompleted" || event.type === "CombatEnded") {
        if (event.type === "RunCombatCompleted") {
          runHp = event.playerHp;
          runMaxHp = event.playerMaxHp;
        }
        if (event.outcome === "won") {
          combatsWon += event.type === "CombatEnded" ? 1 : 0;
          if (event.type === "CombatEnded") {
            increment(encountersWonById, activeEncounterId);
          }
        } else {
          combatsLost += event.type === "CombatEnded" ? 1 : 0;
          if (event.type === "CombatEnded") {
            increment(encountersLostById, activeEncounterId);
          }
        }
        if (event.type === "RunCombatCompleted") {
          activeEncounterId = undefined;
        }
      } else if (event.type === "RunPlayerHealed") {
        runHp = event.hpAfter;
        runMaxHp = event.maxHp;
      } else if (event.type === "RunEnded" && event.outcome === "lost") {
        runHp = 0;
      } else if (event.type === "TurnStarted") {
        maxTurnNumber = Math.max(maxTurnNumber, event.turnNumber);
      } else if (event.type === "RewardOffered") {
        rewardsOffered += 1;
        new Set(event.options.map((option) => option.type)).forEach((rewardType) =>
          increment(rewardOffersByType, rewardType)
        );
      } else if (event.type === "RewardSelected") {
        rewardsSelected += 1;
        increment(rewardSelectionsByType, event.rewardType);
      } else if (event.type === "RewardSkipped") {
        rewardsSkipped += 1;
      } else if (event.type === "CardRewardAdded") {
        cardRewardsAdded += 1;
        increment(cardRewardsByCardId, event.cardId);
      } else if (event.type === "PetUpgradeUnlocked") {
        petUpgradesUnlocked += 1;
        increment(petUpgradesByUpgradeId, event.upgradeId);
      } else if (event.type === "PetStoryEventCompleted") {
        storyEventsCompleted += 1;
      } else if (event.type === "CardPlayed") {
        increment(cardPlaysByCardId, event.cardId);
      } else if (event.type === "MonsterAbilityPlanned") {
        increment(monsterAbilityPlansByAbilityId, event.abilityId);
      } else if (event.type === "MonsterAbilityPlayed") {
        increment(monsterAbilityPlaysByAbilityId, event.abilityId);
      } else if (event.type === "StatusApplied") {
        increment(statusesAppliedByStatusId, event.statusId);
        if (isPlayerCombatant(event.targetId)) {
          increment(statusesAppliedToPlayerByStatusId, event.statusId);
        } else if (isMonsterCombatant(event.targetId)) {
          increment(statusesAppliedToMonstersByStatusId, event.statusId);
        }
      } else if (event.type === "StatusApplicationBlocked") {
        increment(statusesBlockedByStatusId, event.statusId);
      } else if (event.type === "StatusCleansed") {
        increment(statusesCleansedByStatusId, event.statusId);
      } else if (event.type === "StatusConsumed") {
        increment(statusesConsumedByStatusId, event.statusId);
      } else if (event.type === "StatusExpired") {
        increment(statusesExpiredByStatusId, event.statusId);
      } else if (event.type === "StatusTicked") {
        increment(statusTicksByStatusId, event.statusId);
      } else if (event.type === "DamageDealt") {
        totalDamageBlocked += event.blocked;
        if (isPlayerCombatant(event.targetId)) {
          totalDamageToPlayer += event.amount;
          increment(totalDamageToPlayerByEncounterId, activeEncounterId, event.amount);
          runHp = runHp === undefined ? undefined : Math.max(0, runHp - event.amount);
        } else if (isMonsterCombatant(event.targetId)) {
          totalDamageToMonsters += event.amount;
          increment(totalDamageToMonstersByEncounterId, activeEncounterId, event.amount);
        }
      } else if (event.type === "BlockGained") {
        if (isPlayerCombatant(event.targetId)) {
          totalBlockGainedByPlayer += event.amount;
        } else if (isMonsterCombatant(event.targetId)) {
          totalBlockGainedByMonsters += event.amount;
        }
      }
    }
  }

  return {
    seed: trace.seed,
    mode: trace.mode,
    finalStatus: trace.finalStatus,
    failureCode: trace.failure?.code,
    steps: trace.steps.length,
    acceptedActions,
    rejectedActions,
    invalidInjectedActions,
    invalidRejectedActions,
    invalidAcceptedActions,
    maxTurnNumber,
    combatsStarted,
    combatsWon,
    combatsLost,
    rewardsOffered,
    rewardsSelected,
    rewardsSkipped,
    cardRewardsAdded,
    petUpgradesUnlocked,
    storyEventsCompleted,
    startingRunHp,
    startingRunMaxHp,
    finalRunHp: trace.finalStatus === "lost" ? 0 : runHp,
    finalRunMaxHp: runMaxHp,
    totalDamageToPlayer,
    totalDamageToMonsters,
    totalDamageBlocked,
    totalBlockGainedByPlayer,
    totalBlockGainedByMonsters,
    actionCounts,
    eventCounts,
    selectedNodesById,
    cardPlaysByCardId,
    cardRewardsByCardId,
    petUpgradesByUpgradeId,
    rewardSelectionsByType,
    balance: {
      monsterAbilityPlansByAbilityId,
      monsterAbilityPlaysByAbilityId,
      statusesAppliedByStatusId,
      statusesAppliedToPlayerByStatusId,
      statusesAppliedToMonstersByStatusId,
      statusesBlockedByStatusId,
      statusesCleansedByStatusId,
      statusesConsumedByStatusId,
      statusesExpiredByStatusId,
      statusTicksByStatusId,
      encountersStartedById,
      encountersWonById,
      encountersLostById,
      runPathsByNodeIds: selectedRunNodePath.length === 0 ? {} : { [selectedRunNodePath.join(" > ")]: 1 },
      totalDamageToPlayerByEncounterId,
      totalDamageToMonstersByEncounterId,
      rewardOffersByType,
      rewardSelectionRatesByType: buildRates(rewardSelectionsByType, rewardOffersByType)
    }
  };
};

export const analyzeAgentTraces = (traces: readonly AgentTrace[]): SimulationAggregateReport => {
  const metrics = traces.map(analyzeAgentTrace);
  const actionCounts = emptyCountMap();
  const eventCounts = emptyCountMap();
  const selectedNodesById = emptyCountMap();
  const cardPlaysByCardId = emptyCountMap();
  const monsterAbilityPlansByAbilityId = emptyCountMap();
  const monsterAbilityPlaysByAbilityId = emptyCountMap();
  const statusesAppliedByStatusId = emptyCountMap();
  const statusesAppliedToPlayerByStatusId = emptyCountMap();
  const statusesAppliedToMonstersByStatusId = emptyCountMap();
  const statusesBlockedByStatusId = emptyCountMap();
  const statusesCleansedByStatusId = emptyCountMap();
  const statusesConsumedByStatusId = emptyCountMap();
  const statusesExpiredByStatusId = emptyCountMap();
  const statusTicksByStatusId = emptyCountMap();
  const encountersStartedById = emptyCountMap();
  const encountersWonById = emptyCountMap();
  const encountersLostById = emptyCountMap();
  const runPathsByNodeIds = emptyCountMap();
  const totalDamageToPlayerByEncounterId = emptyCountMap();
  const totalDamageToMonstersByEncounterId = emptyCountMap();
  const cardRewardsByCardId = emptyCountMap();
  const rewardOffersByType = emptyCountMap();
  const petUpgradesByUpgradeId = emptyCountMap();
  const rewardSelectionsByType = emptyCountMap();

  for (const metric of metrics) {
    mergeCounts(actionCounts, metric.actionCounts);
    mergeCounts(eventCounts, metric.eventCounts);
    mergeCounts(selectedNodesById, metric.selectedNodesById);
    mergeCounts(cardPlaysByCardId, metric.cardPlaysByCardId);
    mergeCounts(monsterAbilityPlansByAbilityId, metric.balance?.monsterAbilityPlansByAbilityId ?? {});
    mergeCounts(monsterAbilityPlaysByAbilityId, metric.balance?.monsterAbilityPlaysByAbilityId ?? {});
    mergeCounts(statusesAppliedByStatusId, metric.balance?.statusesAppliedByStatusId ?? {});
    mergeCounts(statusesAppliedToPlayerByStatusId, metric.balance?.statusesAppliedToPlayerByStatusId ?? {});
    mergeCounts(statusesAppliedToMonstersByStatusId, metric.balance?.statusesAppliedToMonstersByStatusId ?? {});
    mergeCounts(statusesBlockedByStatusId, metric.balance?.statusesBlockedByStatusId ?? {});
    mergeCounts(statusesCleansedByStatusId, metric.balance?.statusesCleansedByStatusId ?? {});
    mergeCounts(statusesConsumedByStatusId, metric.balance?.statusesConsumedByStatusId ?? {});
    mergeCounts(statusesExpiredByStatusId, metric.balance?.statusesExpiredByStatusId ?? {});
    mergeCounts(statusTicksByStatusId, metric.balance?.statusTicksByStatusId ?? {});
    mergeCounts(encountersStartedById, metric.balance?.encountersStartedById ?? {});
    mergeCounts(encountersWonById, metric.balance?.encountersWonById ?? {});
    mergeCounts(encountersLostById, metric.balance?.encountersLostById ?? {});
    mergeCounts(runPathsByNodeIds, metric.balance?.runPathsByNodeIds ?? {});
    mergeCounts(totalDamageToPlayerByEncounterId, metric.balance?.totalDamageToPlayerByEncounterId ?? {});
    mergeCounts(totalDamageToMonstersByEncounterId, metric.balance?.totalDamageToMonstersByEncounterId ?? {});
    mergeCounts(cardRewardsByCardId, metric.cardRewardsByCardId);
    mergeCounts(rewardOffersByType, metric.balance?.rewardOffersByType ?? {});
    mergeCounts(petUpgradesByUpgradeId, metric.petUpgradesByUpgradeId);
    mergeCounts(rewardSelectionsByType, metric.rewardSelectionsByType);
  }

  const totalRuns = metrics.length;
  const completedRuns = metrics.filter((metric) => metric.finalStatus === "completed" && !metric.failureCode).length;
  const lostRuns = metrics.filter((metric) => metric.finalStatus === "lost" && !metric.failureCode).length;
  const failedRuns = metrics.filter((metric) => metric.failureCode).length;
  const otherTerminalRuns = Math.max(0, totalRuns - completedRuns - lostRuns - failedRuns);
  const stepValues = metrics.map((metric) => metric.steps);
  const totalSteps = stepValues.reduce((sum, value) => sum + value, 0);
  const finalHpValues = metrics.map((metric) => metric.finalRunHp).filter((value): value is number => value !== undefined);
  const completedFinalHpValues = metrics
    .filter((metric) => metric.finalStatus === "completed" && !metric.failureCode)
    .map((metric) => metric.finalRunHp)
    .filter((value): value is number => value !== undefined);

  return {
    totalRuns,
    completedRuns,
    lostRuns,
    failedRuns,
    otherTerminalRuns,
    completionRate: safeAverage(completedRuns, totalRuns),
    lossRate: safeAverage(lostRuns, totalRuns),
    failureRate: safeAverage(failedRuns, totalRuns),
    minSteps: stepValues.length > 0 ? Math.min(...stepValues) : 0,
    maxSteps: stepValues.length > 0 ? Math.max(...stepValues) : 0,
    averageSteps: safeAverage(totalSteps, totalRuns),
    acceptedActions: metrics.reduce((sum, metric) => sum + metric.acceptedActions, 0),
    rejectedActions: metrics.reduce((sum, metric) => sum + metric.rejectedActions, 0),
    invalidInjectedActions: metrics.reduce((sum, metric) => sum + metric.invalidInjectedActions, 0),
    invalidRejectedActions: metrics.reduce((sum, metric) => sum + metric.invalidRejectedActions, 0),
    invalidAcceptedActions: metrics.reduce((sum, metric) => sum + metric.invalidAcceptedActions, 0),
    combatsStarted: metrics.reduce((sum, metric) => sum + metric.combatsStarted, 0),
    combatsWon: metrics.reduce((sum, metric) => sum + metric.combatsWon, 0),
    combatsLost: metrics.reduce((sum, metric) => sum + metric.combatsLost, 0),
    rewardsOffered: metrics.reduce((sum, metric) => sum + metric.rewardsOffered, 0),
    rewardsSelected: metrics.reduce((sum, metric) => sum + metric.rewardsSelected, 0),
    rewardsSkipped: metrics.reduce((sum, metric) => sum + metric.rewardsSkipped, 0),
    cardRewardsAdded: metrics.reduce((sum, metric) => sum + metric.cardRewardsAdded, 0),
    petUpgradesUnlocked: metrics.reduce((sum, metric) => sum + metric.petUpgradesUnlocked, 0),
    storyEventsCompleted: metrics.reduce((sum, metric) => sum + metric.storyEventsCompleted, 0),
    averageFinalRunHp: safeAverage(finalHpValues.reduce((sum, value) => sum + value, 0), finalHpValues.length),
    averageCompletedFinalRunHp: safeAverage(completedFinalHpValues.reduce((sum, value) => sum + value, 0), completedFinalHpValues.length),
    minCompletedFinalRunHp: completedFinalHpValues.length > 0 ? Math.min(...completedFinalHpValues) : 0,
    maxCompletedFinalRunHp: completedFinalHpValues.length > 0 ? Math.max(...completedFinalHpValues) : 0,
    totalDamageToPlayer: metrics.reduce((sum, metric) => sum + metric.totalDamageToPlayer, 0),
    totalDamageToMonsters: metrics.reduce((sum, metric) => sum + metric.totalDamageToMonsters, 0),
    totalDamageBlocked: metrics.reduce((sum, metric) => sum + metric.totalDamageBlocked, 0),
    totalBlockGainedByPlayer: metrics.reduce((sum, metric) => sum + metric.totalBlockGainedByPlayer, 0),
    totalBlockGainedByMonsters: metrics.reduce((sum, metric) => sum + metric.totalBlockGainedByMonsters, 0),
    actionCounts,
    eventCounts,
    selectedNodesById,
    cardPlaysByCardId,
    cardRewardsByCardId,
    petUpgradesByUpgradeId,
    rewardSelectionsByType,
    balance: {
      monsterAbilityPlansByAbilityId,
      monsterAbilityPlaysByAbilityId,
      statusesAppliedByStatusId,
      statusesAppliedToPlayerByStatusId,
      statusesAppliedToMonstersByStatusId,
      statusesBlockedByStatusId,
      statusesCleansedByStatusId,
      statusesConsumedByStatusId,
      statusesExpiredByStatusId,
      statusTicksByStatusId,
      encountersStartedById,
      encountersWonById,
      encountersLostById,
      runPathsByNodeIds,
      totalDamageToPlayerByEncounterId,
      totalDamageToMonstersByEncounterId,
      rewardOffersByType,
      rewardSelectionRatesByType: buildRates(rewardSelectionsByType, rewardOffersByType)
    },
    traces: metrics
  };
};

export const checkSimulationHealth = (
  report: SimulationAggregateReport,
  options: SimulationHealthOptions = {}
): readonly SimulationHealthIssue[] => {
  const issues: SimulationHealthIssue[] = [];
  const requireCompletedRun = options.requireCompletedRun ?? true;
  const requireInvalidRejections = options.requireInvalidRejections ?? report.invalidInjectedActions > 0;
  const warnIfNoLosses = options.warnIfNoLosses ?? report.totalRuns >= 20;
  const warnIfNoRewards = options.warnIfNoRewards ?? true;
  const warnIfNoPetUpgrades = options.warnIfNoPetUpgrades ?? true;
  const warnIfNoPlayerDamage = options.warnIfNoPlayerDamage ?? true;
  const warnIfNoMonsterDamage = options.warnIfNoMonsterDamage ?? true;
  const highCompletionRateWarning = options.highCompletionRateWarning ?? 0.95;
  const lowCompletionRateWarning = options.lowCompletionRateWarning ?? 0.05;

  if (report.failedRuns > 0 || report.invalidAcceptedActions > 0) {
    issues.push({
      severity: "error",
      code: "simulation_failures_present",
      message: `Simulation has ${report.failedRuns} failing traces and ${report.invalidAcceptedActions} accepted invalid actions.`
    });
  }

  if (requireCompletedRun && report.completedRuns === 0) {
    issues.push({
      severity: "error",
      code: "no_completed_runs",
      message: "No sampled run reached completed. This can indicate an underpowered policy/content loop or a stuck game flow."
    });
  }

  if (requireInvalidRejections && report.invalidRejectedActions === 0) {
    issues.push({
      severity: "error",
      code: "invalid_injection_not_exercised",
      message: "Invalid-action injection did not produce any safe rejection. The fuzz sample is not exercising validation paths."
    });
  }

  if (options.minCompletionRateError !== undefined && report.totalRuns > 0 && report.completionRate < options.minCompletionRateError) {
    issues.push({
      severity: "error",
      code: "completion_rate_below_balance_target",
      message: `Completion rate ${(report.completionRate * 100).toFixed(1)}% is below the configured balance target minimum ${(options.minCompletionRateError * 100).toFixed(1)}%.`
    });
  }

  if (options.maxCompletionRateError !== undefined && report.totalRuns > 0 && report.completionRate > options.maxCompletionRateError) {
    issues.push({
      severity: "error",
      code: "completion_rate_above_balance_target",
      message: `Completion rate ${(report.completionRate * 100).toFixed(1)}% is above the configured balance target maximum ${(options.maxCompletionRateError * 100).toFixed(1)}%.`
    });
  }

  if (warnIfNoLosses && report.lostRuns === 0 && report.completedRuns > 0) {
    issues.push({
      severity: "warning",
      code: "no_losses_observed",
      message: "No sampled run was lost. This may be fine for smoke policy, but random fuzz with many runs can indicate early content is too forgiving."
    });
  }

  if (report.totalRuns >= 20 && report.completionRate >= highCompletionRateWarning) {
    issues.push({
      severity: "warning",
      code: "high_completion_rate",
      message: `Completion rate ${(report.completionRate * 100).toFixed(1)}% is high for a broad random/fuzz sample.`
    });
  }

  if (report.totalRuns >= 20 && report.completionRate <= lowCompletionRateWarning) {
    issues.push({
      severity: "warning",
      code: "low_completion_rate",
      message: `Completion rate ${(report.completionRate * 100).toFixed(1)}% is low. Check for underpowered player choices, overpowered monsters, or random-policy dead ends.`
    });
  }

  if (warnIfNoRewards && report.rewardsOffered === 0) {
    issues.push({
      severity: "warning",
      code: "no_rewards_seen",
      message: "No rewards were offered in the sample, so reward flow was not meaningfully covered."
    });
  }

  if (warnIfNoPetUpgrades && report.petUpgradesUnlocked === 0) {
    issues.push({
      severity: "warning",
      code: "no_pet_upgrades_unlocked",
      message: "No pet upgrade was unlocked in the sample. Pet-upgrade balance and modifier coverage are missing."
    });
  }

  if (warnIfNoPlayerDamage && report.totalDamageToPlayer === 0 && report.combatsStarted > 0) {
    issues.push({
      severity: "warning",
      code: "no_player_damage_seen",
      message: "Combat occurred, but the player took no post-block damage. Check enemy-turn coverage and defensive overpower."
    });
  }

  if (warnIfNoMonsterDamage && report.totalDamageToMonsters === 0 && report.combatsStarted > 0) {
    issues.push({
      severity: "warning",
      code: "no_monster_damage_seen",
      message: "Combat occurred, but monsters took no damage. This usually indicates a broken action policy or combat resolution."
    });
  }

  return issues;
};

export const sortedCountEntries = (counts: CountMap, limit = 8): readonly (readonly [string, number])[] =>
  Object.entries(counts).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "en-GB")).slice(0, limit);
