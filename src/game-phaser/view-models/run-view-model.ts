import {
  starterRegistry,
  type GameContentRegistry,
  type GameEvent,
  type RunId,
  type RunNodeId,
  type RunNodeStatus,
  type RunNodeType,
  type RunState,
  type RunStatus,
  type RuntimeMetadata,
  createRuntimeMetadata
} from "../../game-core";
import { formatRunEventMessage } from "../animation/run-event-messages";

export type RunNodeViewModel = {
  readonly id: RunNodeId;
  readonly type: RunNodeType;
  readonly layer: number;
  readonly status: RunNodeStatus;
  readonly label: string;
  readonly nextNodeIds: readonly RunNodeId[];
};

export type RunViewModel = {
  readonly runId: RunId;
  readonly status: RunStatus;
  readonly seed: string | number;
  readonly deckCount: number;
  readonly activePetCount: number;
  readonly nodes: readonly RunNodeViewModel[];
  readonly currentNodeId?: RunNodeId;
  readonly currentNodeType?: RunNodeType;
  readonly resetAvailable: boolean;
  readonly eventMessages: readonly string[];
  readonly runtimeMetadata: RuntimeMetadata;
};

const nodeTypeLabel = (type: RunNodeType): string => {
  switch (type) {
    case "combat":
      return "Combat";
    case "elite":
      return "Elite";
    case "rest":
      return "Rest";
    case "event":
      return "Event";
    case "boss":
      return "Boss";
  }
};

export const buildRunViewModel = (
  run: RunState,
  events: readonly GameEvent[],
  _registry: GameContentRegistry = starterRegistry
): RunViewModel => {
  const currentNode = run.map?.nodes.find((node) => node.id === run.map?.currentNodeId);

  return {
    runId: run.id,
    status: run.status,
    seed: run.seed,
    deckCount: run.deckCardIds.length,
    activePetCount: run.activePetInstanceIds.length,
    nodes: run.map?.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      layer: node.layer,
      status: node.status,
      label: nodeTypeLabel(node.type),
      nextNodeIds: node.nextNodeIds
    })) ?? [],
    currentNodeId: run.map?.currentNodeId,
    currentNodeType: currentNode?.type,
    resetAvailable: run.status === "completed" || run.status === "lost",
    eventMessages: events.map(formatRunEventMessage),
    runtimeMetadata: createRuntimeMetadata(_registry)
  };
};
