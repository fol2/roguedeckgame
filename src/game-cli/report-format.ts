import { sortedCountEntries, type CountMap, type RateMap } from "../game-core/testing/analysis";

const percent = (value: number): string => `${(Math.max(0, Math.min(1, value)) * 100).toFixed(1)}%`;

export const formatCountSummary = (label: string, counts: CountMap, limit = 6): string => {
  const entries = sortedCountEntries(counts, limit);
  if (entries.length === 0) {
    return `${label}: none`;
  }
  return `${label}: ${entries.map(([key, value]) => `${key}=${value}`).join(", ")}`;
};

export const formatRateSummary = (label: string, rates: RateMap, limit = 6): string => {
  const entries = sortedCountEntries(rates, limit);
  if (entries.length === 0) {
    return `${label}: none`;
  }
  return `${label}: ${entries.map(([key, value]) => `${key}=${percent(value)}`).join(", ")}`;
};
