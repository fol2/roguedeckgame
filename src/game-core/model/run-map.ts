import type { EncounterId, RunMapId, RunNodeId, RunTemplateId } from "../ids";

export type RunNodeType = "combat" | "elite" | "rest" | "event" | "boss";
export type RunNodeStatus = "locked" | "available" | "active" | "completed" | "skipped";

export type RunNodeState = {
  readonly id: RunNodeId;
  readonly type: RunNodeType;
  readonly layer: number;
  readonly status: RunNodeStatus;
  readonly encounterId?: EncounterId;
  readonly nextNodeIds: readonly RunNodeId[];
  readonly previousNodeIds: readonly RunNodeId[];
};

export type RunMapState = {
  readonly id: RunMapId;
  readonly templateId: RunTemplateId;
  readonly seed: string | number;
  readonly nodes: readonly RunNodeState[];
  readonly currentNodeId?: RunNodeId;
};

export type RunMapTemplateNodeDefinition = {
  readonly id: RunNodeId;
  readonly type: RunNodeType;
  readonly layer: number;
  readonly encounterIds?: readonly EncounterId[];
  readonly nextNodeIds: readonly RunNodeId[];
  readonly authoring?: {
    readonly budgetMin?: number;
    readonly budgetMax?: number;
    readonly notes?: string;
  };
};

export type RunMapTemplateDefinition = {
  readonly id: RunTemplateId;
  readonly name: string;
  readonly mapId: RunMapId;
  readonly actId?: string;
  readonly nodes: readonly RunMapTemplateNodeDefinition[];
};
