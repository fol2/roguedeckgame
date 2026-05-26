import type {
  CombatDetailCopyViewModel,
  CombatPileViewModel,
  CombatTooltipCopyViewModel
} from "./combat-view-model";

const getPileTooltip = (label: string, count: number): CombatTooltipCopyViewModel => ({
  title: label,
  body: `${count} card(s). Full pile inspection is deferred for Phase 1.`
});

const getPileDetail = (label: string, count: number): CombatDetailCopyViewModel => ({
  title: label,
  subtitle: "Pile count",
  lines: [`Cards: ${count}`, "Full pile inspection is deferred for Phase 1."],
  footer: "Pile detail."
});

export const buildCombatPileViewModel = (
  label: string,
  count: number
): CombatPileViewModel => ({
  label,
  count,
  tooltip: getPileTooltip(label, count),
  detail: getPileDetail(label, count)
});
