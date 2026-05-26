import { runMapId, runTemplateId } from "../ids";
import type { GameActionError, GameActionResult } from "../model/action";
import type { GameEvent } from "../model/event";
import type {
  RunMapState,
  RunMapTemplateDefinition,
  RunNodeState,
  RunNodeStatus
} from "../model/run-map";
import { createRng } from "./rng";

export type GenerateRunMapInput = {
  readonly seed: string | number;
  readonly template?: RunMapTemplateDefinition;
};

const error = (code: string, message: string, path?: string): GameActionError => ({
  code,
  message,
  path
});

const rejectedEvent = (actionError: GameActionError): GameEvent => ({
  type: "ActionRejected",
  code: actionError.code,
  message: actionError.message,
  path: actionError.path
});

const createRejectedMap = (input: GenerateRunMapInput): RunMapState => ({
  id: runMapId(`run-map:rejected:${String(input.seed)}`),
  templateId: input.template?.id ?? runTemplateId("missing_run_map_template"),
  seed: input.seed,
  nodes: []
});

const reject = (
  input: GenerateRunMapInput,
  actionError: GameActionError
): GameActionResult<RunMapState> => ({
  ok: false,
  state: createRejectedMap(input),
  events: [rejectedEvent(actionError)],
  errors: [actionError]
});

export const generateRunMap = (
  input: GenerateRunMapInput
): GameActionResult<RunMapState> => {
  const { seed, template } = input;

  if (!template) {
    return reject(input, error("missing_run_map_template", "Run map template is missing.", "template"));
  }

  if (template.nodes.length === 0) {
    return reject(
      input,
      error("empty_run_map_template", `Run map template '${template.id}' has no nodes.`, "template.nodes")
    );
  }

  const rng = createRng(`${template.id}:${String(seed)}`);
  const firstLayer = Math.min(...template.nodes.map((node) => node.layer));
  const previousByNodeId = new Map<string, RunNodeState["previousNodeIds"]>();

  for (const node of template.nodes) {
    previousByNodeId.set(node.id, []);
  }

  for (const node of template.nodes) {
    for (const nextNodeId of node.nextNodeIds) {
      const previousNodeIds = previousByNodeId.get(nextNodeId) ?? [];
      previousByNodeId.set(nextNodeId, [...previousNodeIds, node.id]);
    }
  }

  const nodes: readonly RunNodeState[] = template.nodes.map((node) => {
    const status: RunNodeStatus = node.layer === firstLayer ? "available" : "locked";
    const encounterId = node.encounterIds && node.encounterIds.length > 0
      ? rng.choice(node.encounterIds)
      : undefined;

    return {
      id: node.id,
      type: node.type,
      layer: node.layer,
      status,
      encounterId,
      nextNodeIds: [...node.nextNodeIds],
      previousNodeIds: [...(previousByNodeId.get(node.id) ?? [])]
    };
  });

  const state: RunMapState = {
    id: template.mapId,
    templateId: template.id,
    seed,
    nodes
  };
  const events: readonly GameEvent[] = [
    { type: "RunMapGenerated", runMapId: state.id, nodeCount: state.nodes.length },
    ...state.nodes
      .filter((node) => node.status === "available")
      .map((node): GameEvent => ({ type: "RunNodeAvailable", nodeId: node.id }))
  ];

  return { ok: true, state, events, errors: [] };
};
