import type { RuntimeMetadata } from "../model/runtime-metadata";
import {
  sortedCountEntries,
  type CountMap,
  type RateMap,
  type SimulationAggregateReport,
  type SimulationHealthIssue
} from "./analysis";

export type BalanceDashboardMetric = {
  readonly label: string;
  readonly value: string;
};

export type BalanceDashboardEntry = {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly valueLabel: string;
};

export type BalanceDashboardEncounterEntry = BalanceDashboardEntry & {
  readonly started: number;
  readonly won: number;
  readonly lost: number;
  readonly winRate: number;
};

export type BalanceDashboardDamageEntry = BalanceDashboardEntry & {
  readonly playerDamage: number;
  readonly monsterDamage: number;
};

export type BalanceDashboardViewModel = {
  readonly runtimeMetadata: RuntimeMetadata;
  readonly contentVersion?: string;
  readonly summary: readonly BalanceDashboardMetric[];
  readonly healthIssues: readonly SimulationHealthIssue[];
  readonly sections: {
    readonly encounterOutcomes: readonly BalanceDashboardEncounterEntry[];
    readonly damageByEncounter: readonly BalanceDashboardDamageEntry[];
    readonly rewardPickRates: readonly BalanceDashboardEntry[];
    readonly monsterAbilityFrequency: readonly BalanceDashboardEntry[];
    readonly runPaths: readonly BalanceDashboardEntry[];
  };
};

export const formatBalancePercent = (value: number): string =>
  `${(Math.max(0, Math.min(1, value)) * 100).toFixed(1)}%`;

const formatNumber = (value: number): string =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

const countEntries = (counts: CountMap, limit = 6): readonly BalanceDashboardEntry[] =>
  sortedCountEntries(counts, limit).map(([id, value]) => ({
    id,
    label: id,
    value,
    valueLabel: formatNumber(value)
  }));

const rateEntries = (rates: RateMap, limit = 6): readonly BalanceDashboardEntry[] =>
  sortedCountEntries(rates, limit).map(([id, value]) => ({
    id,
    label: id,
    value,
    valueLabel: formatBalancePercent(value)
  }));

const buildEncounterOutcomes = (
  report: SimulationAggregateReport,
  limit = 6
): readonly BalanceDashboardEncounterEntry[] => {
  const balance = report.balance;
  const ids = new Set([
    ...Object.keys(balance?.encountersStartedById ?? {}),
    ...Object.keys(balance?.encountersWonById ?? {}),
    ...Object.keys(balance?.encountersLostById ?? {})
  ]);

  return [...ids]
    .map((id) => {
      const started = balance?.encountersStartedById[id] ?? 0;
      const won = balance?.encountersWonById[id] ?? 0;
      const lost = balance?.encountersLostById[id] ?? 0;
      const winRate = started === 0 ? 0 : won / started;

      return {
        id,
        label: id,
        value: started,
        valueLabel: `${formatBalancePercent(winRate)} win, ${lost} lost`,
        started,
        won,
        lost,
        winRate
      };
    })
    .sort((left, right) => right.started - left.started || left.id.localeCompare(right.id, "en-GB"))
    .slice(0, limit);
};

const buildDamageByEncounter = (
  report: SimulationAggregateReport,
  limit = 6
): readonly BalanceDashboardDamageEntry[] => {
  const balance = report.balance;
  const ids = new Set([
    ...Object.keys(balance?.totalDamageToPlayerByEncounterId ?? {}),
    ...Object.keys(balance?.totalDamageToMonstersByEncounterId ?? {})
  ]);

  return [...ids]
    .map((id) => {
      const playerDamage = balance?.totalDamageToPlayerByEncounterId[id] ?? 0;
      const monsterDamage = balance?.totalDamageToMonstersByEncounterId[id] ?? 0;

      return {
        id,
        label: id,
        value: playerDamage + monsterDamage,
        valueLabel: `to player ${formatNumber(playerDamage)}, to monsters ${formatNumber(monsterDamage)}`,
        playerDamage,
        monsterDamage
      };
    })
    .sort((left, right) => right.value - left.value || left.id.localeCompare(right.id, "en-GB"))
    .slice(0, limit);
};

export const buildBalanceDashboardViewModel = (
  report: SimulationAggregateReport,
  healthIssues: readonly SimulationHealthIssue[],
  runtimeMetadata: RuntimeMetadata,
  contentVersion?: string
): BalanceDashboardViewModel => ({
  runtimeMetadata,
  contentVersion,
  summary: [
    { label: "Runs", value: String(report.totalRuns) },
    { label: "Completion rate", value: formatBalancePercent(report.completionRate) },
    { label: "Loss rate", value: formatBalancePercent(report.lossRate) },
    { label: "Failure rate", value: formatBalancePercent(report.failureRate) },
    { label: "Avg final HP", value: formatNumber(report.averageFinalRunHp) },
    { label: "Avg completed HP", value: formatNumber(report.averageCompletedFinalRunHp) },
    { label: "Damage to player", value: formatNumber(report.totalDamageToPlayer) },
    { label: "Damage to monsters", value: formatNumber(report.totalDamageToMonsters) },
    { label: "Rewards selected", value: String(report.rewardsSelected) }
  ],
  healthIssues,
  sections: {
    encounterOutcomes: buildEncounterOutcomes(report),
    damageByEncounter: buildDamageByEncounter(report),
    rewardPickRates: rateEntries(report.balance?.rewardSelectionRatesByType ?? {}),
    monsterAbilityFrequency: countEntries(report.balance?.monsterAbilityPlaysByAbilityId ?? {}),
    runPaths: countEntries(report.balance?.runPathsByNodeIds ?? {}, 4)
  }
});
