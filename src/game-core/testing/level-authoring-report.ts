import type { EncounterDefinition } from "../model/encounter";
import type { GameContentRegistry } from "../model/registry";
import type { RunMapTemplateDefinition } from "../model/run-map";
import type { SimulationAggregateReport } from "./analysis";

export type EncounterAuthoringSummary = {
  readonly id: string;
  readonly type: EncounterDefinition["type"];
  readonly name: string;
  readonly difficultyBand?: string;
  readonly budget?: number;
  readonly monsterCount: number;
  readonly monsterIds: readonly string[];
  readonly monsters: readonly {
    readonly id: string;
    readonly name: string;
    readonly roles: readonly string[];
    readonly tags: readonly string[];
  }[];
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
  readonly nextNodeIds: readonly string[];
  readonly budgetMin?: number;
  readonly budgetMax?: number;
  readonly notes?: string;
  readonly meaning: string;
  readonly encounters: readonly EncounterAuthoringSummary[];
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

const nodeMeaning = (type: string, notes?: string): string => {
  if (notes) {
    return notes;
  }

  switch (type) {
    case "combat":
      return "Starts one of the listed combat encounters.";
    case "elite":
      return "Starts an elite encounter and uses elite reward authoring.";
    case "boss":
      return "Starts the boss encounter and can end the run.";
    case "rest":
      return "Completes a non-combat recovery placeholder.";
    case "event":
      return "Completes a non-combat story or resource event placeholder.";
    default:
      return "Unknown run node type.";
  }
};

const monsterRolesForEncounter = (
  encounter: EncounterDefinition,
  monsterId: EncounterDefinition["monsterIds"][number]
): readonly string[] => {
  const groupedRoles = (encounter.authoring?.monsterGroups ?? [])
    .filter((group) => group.monsterIds.includes(monsterId))
    .flatMap((group) => group.roles);

  const roles = groupedRoles.length > 0
    ? groupedRoles
    : encounter.authoring?.monsterRoles ?? [];

  return [...new Set(roles)].sort((left, right) => left.localeCompare(right));
};

const encounterSummary = (
  encounter: EncounterDefinition,
  registry: GameContentRegistry
): EncounterAuthoringSummary => ({
  id: encounter.id,
  type: encounter.type,
  name: encounter.name,
  difficultyBand: encounter.authoring?.difficultyBand,
  budget: encounter.authoring?.budget,
  monsterCount: encounter.monsterIds.length,
  monsterIds: [...encounter.monsterIds].sort((left, right) => left.localeCompare(right)),
  monsters: [...encounter.monsterIds]
    .map((monsterId) => {
      const monster = registry.monsters.find((candidate) => candidate.id === monsterId);

      return {
        id: monsterId,
        name: monster?.name ?? String(monsterId),
        roles: monsterRolesForEncounter(encounter, monsterId),
        tags: [...(monster?.tags ?? [])].sort((left, right) => left.localeCompare(right))
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id)),
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

const runMapSummary = (
  template: RunMapTemplateDefinition,
  registry: GameContentRegistry
): RunMapAuthoringSummary => {
  const nodes = sortedById(template.nodes.map((node) => ({
    id: node.id,
    type: node.type,
    layer: node.layer,
    encounterIds: [...(node.encounterIds ?? [])].sort((left, right) => left.localeCompare(right)),
    nextNodeIds: [...node.nextNodeIds].sort((left, right) => left.localeCompare(right)),
    budgetMin: node.authoring?.budgetMin,
    budgetMax: node.authoring?.budgetMax,
    notes: node.authoring?.notes,
    meaning: nodeMeaning(node.type, node.authoring?.notes),
    encounters: sortedById(
      (node.encounterIds ?? [])
        .map((encounterId) => registry.encounters.find((encounter) => encounter.id === encounterId))
        .filter((encounter): encounter is EncounterDefinition => encounter !== undefined)
        .map((encounter) => encounterSummary(encounter, registry))
    )
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
  const encounters = sortedById(registry.encounters.map((encounter) => encounterSummary(encounter, registry)));
  const encounterBudgetsByType = encounters.reduce<Record<string, number>>((budgets, encounter) => ({
    ...budgets,
    [encounter.type]: (budgets[encounter.type] ?? 0) + (encounter.budget ?? 0)
  }), {});

  return {
    encounters,
    runMapTemplates: sortedById(registry.runMapTemplates.map((template) => runMapSummary(template, registry))),
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
