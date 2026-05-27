import type { EncounterDefinition } from "../model/encounter";
import type { GameContentRegistry } from "../model/registry";
import type { RunMapTemplateDefinition } from "../model/run-map";
import type { SimulationAggregateReport } from "./analysis";

export type EncounterAuthoringSummary = {
  readonly id: string;
  readonly type: EncounterDefinition["type"];
  readonly difficultyBand?: string;
  readonly budget?: number;
  readonly monsterCount: number;
  readonly monsterRoles: readonly string[];
  readonly monsterGroups: readonly {
    readonly id: string;
    readonly monsterIds: readonly string[];
    readonly roles: readonly string[];
    readonly minCount?: number;
    readonly maxCount?: number;
  }[];
  readonly rewardPoolId?: string;
};

export type RunNodeAuthoringSummary = {
  readonly id: string;
  readonly type: string;
  readonly layer: number;
  readonly encounterIds: readonly string[];
  readonly budgetMin?: number;
  readonly budgetMax?: number;
};

export type RunMapAuthoringSummary = {
  readonly id: string;
  readonly actId?: string;
  readonly nodeCount: number;
  readonly combatNodeCount: number;
  readonly budgetedNodeCount: number;
  readonly nodes: readonly RunNodeAuthoringSummary[];
};

export type LevelAuthoringReport = {
  readonly encounters: readonly EncounterAuthoringSummary[];
  readonly runMapTemplates: readonly RunMapAuthoringSummary[];
  readonly encounterBudgetsByType: Readonly<Record<string, number>>;
};

export type LevelSimulationAuthoringSummary = {
  readonly completionRate: number;
  readonly encounterBudgetsByType: Readonly<Record<string, number>>;
  readonly averageEncounterBudget: number;
  readonly budgetedEncounterCount: number;
};

const sortedById = <T extends { readonly id: string }>(values: readonly T[]): readonly T[] =>
  [...values].sort((left, right) => left.id.localeCompare(right.id));

const encounterSummary = (encounter: EncounterDefinition): EncounterAuthoringSummary => ({
  id: encounter.id,
  type: encounter.type,
  difficultyBand: encounter.authoring?.difficultyBand,
  budget: encounter.authoring?.budget,
  monsterCount: encounter.monsterIds.length,
  monsterRoles: [...(encounter.authoring?.monsterRoles ?? [])].sort((left, right) => left.localeCompare(right)),
  monsterGroups: [...(encounter.authoring?.monsterGroups ?? [])]
    .map((group) => ({
      id: group.id,
      monsterIds: [...group.monsterIds].sort((left, right) => left.localeCompare(right)),
      roles: [...group.roles].sort((left, right) => left.localeCompare(right)),
      minCount: group.minCount,
      maxCount: group.maxCount
    }))
    .sort((left, right) => left.id.localeCompare(right.id)),
  rewardPoolId: encounter.authoring?.rewardPoolId
});

const runMapSummary = (template: RunMapTemplateDefinition): RunMapAuthoringSummary => {
  const nodes = sortedById(template.nodes.map((node) => ({
    id: node.id,
    type: node.type,
    layer: node.layer,
    encounterIds: [...(node.encounterIds ?? [])].sort((left, right) => left.localeCompare(right)),
    budgetMin: node.authoring?.budgetMin,
    budgetMax: node.authoring?.budgetMax
  })));

  return {
    id: template.id,
    actId: template.actId,
    nodeCount: template.nodes.length,
    combatNodeCount: template.nodes.filter((node) => node.type === "combat" || node.type === "elite" || node.type === "boss").length,
    budgetedNodeCount: template.nodes.filter((node) => node.authoring?.budgetMin !== undefined || node.authoring?.budgetMax !== undefined).length,
    nodes
  };
};

export const buildLevelAuthoringReport = (registry: GameContentRegistry): LevelAuthoringReport => {
  const encounters = sortedById(registry.encounters.map(encounterSummary));
  const encounterBudgetsByType = encounters.reduce<Record<string, number>>((budgets, encounter) => ({
    ...budgets,
    [encounter.type]: (budgets[encounter.type] ?? 0) + (encounter.budget ?? 0)
  }), {});

  return {
    encounters,
    runMapTemplates: sortedById(registry.runMapTemplates.map(runMapSummary)),
    encounterBudgetsByType
  };
};

export const buildLevelSimulationAuthoringSummary = (
  registry: GameContentRegistry,
  simulationReport: Pick<SimulationAggregateReport, "completionRate">
): LevelSimulationAuthoringSummary => {
  const report = buildLevelAuthoringReport(registry);
  const budgetedEncounters = report.encounters.filter((encounter) => encounter.budget !== undefined);
  const totalBudget = budgetedEncounters.reduce((total, encounter) => total + (encounter.budget ?? 0), 0);

  return {
    completionRate: simulationReport.completionRate,
    encounterBudgetsByType: report.encounterBudgetsByType,
    averageEncounterBudget: budgetedEncounters.length === 0 ? 0 : totalBudget / budgetedEncounters.length,
    budgetedEncounterCount: budgetedEncounters.length
  };
};
