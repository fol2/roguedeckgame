import type { AgentAction, AgentTraceMode } from "./agent-actions";
import type { AgentTrace } from "./trace";
import type { RunStatus } from "../model/run";

export type CountMap = Readonly<Record<string, number>>;

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

const actionKey = (action: AgentAction): string => {
  if (action.type === "playCard") {
    return action.targetId ? "playCard:targeted" : "playCard:targetless";
  }
  return action.type;
};

const isPlayerCombatant = (combatantId: string): boolean => combatantId === "player" || combatantId.startsWith("player:");
const isMonsterCombatant = (combatantId: string): boolean => combatantId.startsWith("monster:");

export const analyzeAgentTrace = (trace: AgentTrace): AgentTraceMetrics => {
  const actionCounts = emptyCountMap();
  const eventCounts = emptyCountMap();
  const selectedNodesById = emptyCountMap();
  const cardPlaysByCardId = emptyCountMap();
  const cardRewardsByCardId = emptyCountMap();
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
  let totalDamageToPlayer = 0;
  let totalDamageToMonsters = 0;
  let totalDamageBlocked = 0;
  let totalBlockGainedByPlayer = 0;
  let totalBlockGainedByMonsters = 0;

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
      if (event.type === "RunNodeSelected") {
        increment(selectedNodesById, event.nodeId);
      } else if (event.type === "RunCombatStarted" || event.type === "CombatStarted") {
        combatsStarted += event.type === "CombatStarted" ? 1 : 0;
      } else if (event.type === "RunCombatCompleted" || event.type === "CombatEnded") {
        if (event.outcome === "won") {
          combatsWon += event.type === "CombatEnded" ? 1 : 0;
        } else {
          combatsLost += event.type === "CombatEnded" ? 1 : 0;
        }
      } else if (event.type === "TurnStarted") {
        maxTurnNumber = Math.max(maxTurnNumber, event.turnNumber);
      } else if (event.type === "RewardOffered") {
        rewardsOffered += 1;
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
      } else if (event.type === "DamageDealt") {
        totalDamageBlocked += event.blocked;
        if (isPlayerCombatant(event.targetId)) {
          totalDamageToPlayer += event.amount;
        } else if (isMonsterCombatant(event.targetId)) {
          totalDamageToMonsters += event.amount;
        }
      } else if (event.type === "StatusTicked" && event.amount !== undefined) {
        if (isPlayerCombatant(event.targetId)) {
          totalDamageToPlayer += event.amount;
        } else if (isMonsterCombatant(event.targetId)) {
          totalDamageToMonsters += event.amount;
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
    rewardSelectionsByType
  };
};

const safeAverage = (sum: number, count: number): number => count === 0 ? 0 : sum / count;

export const analyzeAgentTraces = (traces: readonly AgentTrace[]): SimulationAggregateReport => {
  const metrics = traces.map(analyzeAgentTrace);
  const actionCounts = emptyCountMap();
  const eventCounts = emptyCountMap();
  const selectedNodesById = emptyCountMap();
  const cardPlaysByCardId = emptyCountMap();
  const cardRewardsByCardId = emptyCountMap();
  const petUpgradesByUpgradeId = emptyCountMap();
  const rewardSelectionsByType = emptyCountMap();

  for (const metric of metrics) {
    mergeCounts(actionCounts, metric.actionCounts);
    mergeCounts(eventCounts, metric.eventCounts);
    mergeCounts(selectedNodesById, metric.selectedNodesById);
    mergeCounts(cardPlaysByCardId, metric.cardPlaysByCardId);
    mergeCounts(cardRewardsByCardId, metric.cardRewardsByCardId);
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
