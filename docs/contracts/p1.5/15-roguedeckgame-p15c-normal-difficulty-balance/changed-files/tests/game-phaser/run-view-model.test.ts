import { describe, expect, it } from "vitest";
import {
  runId,
  runMapId,
  runNodeId,
  cardId,
  petInstanceId,
  playerClassId,
  runTemplateId,
  type RunState
} from "../../src/game-core";
import { buildRunViewModel } from "../../src/game-phaser/view-models/run-view-model";

const createRun = (): RunState => ({
  id: runId("run-view"),
  seed: "run-view-seed",
  playerClassId: playerClassId("novice_tamer"),
  activePetInstanceIds: [petInstanceId("pet-a")],
  status: "map_select",
  playerHp: 70,
  playerMaxHp: 70,
  map: {
    id: runMapId("map-view"),
    templateId: runTemplateId("template-view"),
    seed: "map-seed",
    currentNodeId: runNodeId("node-a"),
    nodes: [
      {
        id: runNodeId("node-a"),
        type: "combat",
        layer: 0,
        status: "active",
        previousNodeIds: [],
        nextNodeIds: [runNodeId("node-b")]
      },
      {
        id: runNodeId("node-b"),
        type: "event",
        layer: 1,
        status: "locked",
        previousNodeIds: [runNodeId("node-a")],
        nextNodeIds: []
      }
    ]
  },
  deckCardIds: [cardId("strike"), cardId("defend")],
  runFlags: [],
  storyFlags: []
});

describe("Run view model", () => {
  it("builds a serializable run view model with node statuses", () => {
    const viewModel = buildRunViewModel(createRun(), [
      { type: "RunNodeSelected", nodeId: runNodeId("node-a") }
    ]);

    expect(viewModel.runId).toBe("run-view");
    expect(viewModel.deckCount).toBe(2);
    expect(viewModel.activePetCount).toBe(1);
    expect(viewModel.currentNodeId).toBe("node-a");
    expect(viewModel.nodes.map((node) => node.status)).toEqual(["active", "locked"]);
    expect(viewModel.eventMessages).toEqual(["Node selected: node-a"]);
    expect(JSON.parse(JSON.stringify(viewModel))).toEqual(viewModel);
  });

  it("handles a missing map gracefully", () => {
    const run = { ...createRun(), map: undefined };
    const viewModel = buildRunViewModel(run, [
      { type: "ActionRejected", code: "missing_run_map", message: "Run has no map.", path: "run.map" }
    ]);

    expect(viewModel.nodes).toEqual([]);
    expect(viewModel.currentNodeId).toBeUndefined();
    expect(viewModel.eventMessages[0]).toContain("Rejected:");
  });
});
