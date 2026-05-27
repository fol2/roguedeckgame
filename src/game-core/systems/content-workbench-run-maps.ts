import type { EncounterDefinition } from "../model/encounter";
import type { RunMapTemplateDefinition } from "../model/run-map";
import type { buildLevelAuthoringReport } from "../testing/level-authoring-report";

export type ContentWorkbenchRunMapItem = {
  readonly id: string;
  readonly name: string;
  readonly actId?: string;
  readonly nodeCount: number;
  readonly combatNodeCount: number;
  readonly budgetedNodeCount: number;
  readonly nodes: readonly {
    readonly id: string;
    readonly type: string;
    readonly layer: number;
    readonly encounterIds: readonly string[];
    readonly nextNodeIds: readonly string[];
    readonly budgetMin?: number;
    readonly budgetMax?: number;
    readonly notes?: string;
    readonly meaning: string;
    readonly encounters: readonly {
      readonly id: string;
      readonly type: EncounterDefinition["type"];
      readonly name: string;
      readonly monsterIds: readonly string[];
      readonly monsters: readonly {
        readonly id: string;
        readonly name: string;
        readonly roles: readonly string[];
        readonly tags: readonly string[];
      }[];
      readonly monsterRoles: readonly string[];
      readonly difficultyBand?: string;
      readonly rewardPoolId?: string;
      readonly budget?: number;
      readonly monsterGroups: readonly {
        readonly id: string;
        readonly monsterIds: readonly string[];
        readonly roles: readonly string[];
        readonly minCount?: number;
        readonly maxCount?: number;
      }[];
    }[];
  }[];
};

export const mapRunMapWorkbenchItem = (
  template: RunMapTemplateDefinition,
  levelReport: ReturnType<typeof buildLevelAuthoringReport>
): ContentWorkbenchRunMapItem => ({
  id: template.id,
  name: template.name,
  actId: template.actId,
  nodeCount: template.nodes.length,
  combatNodeCount: template.nodes.filter((node) => node.type === "combat" || node.type === "elite" || node.type === "boss").length,
  budgetedNodeCount: template.nodes.filter((node) => node.authoring?.budgetMin !== undefined || node.authoring?.budgetMax !== undefined).length,
  nodes: levelReport.runMapTemplates.find((runMap) => runMap.id === template.id)?.nodes ?? []
});
