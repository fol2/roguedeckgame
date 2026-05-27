import { describe, expect, it } from "vitest";
import { formatCountSummary, formatRateSummary } from "../../src/game-cli/report-format";

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
});
