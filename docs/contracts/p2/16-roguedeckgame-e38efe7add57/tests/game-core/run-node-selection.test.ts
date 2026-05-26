import { describe, expect, it } from "vitest";
import {
  completeRunNonCombatNode,
  runNodeId,
  selectRunNode
} from "../../src/game-core";
import { createStartedRunFixture } from "../../src/game-core/testing/run-fixtures";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe("run node selection", () => {
  it("selects an available combat node and moves the run into combat", () => {
    const run = createStartedRunFixture();
    const node = run.map!.nodes.find((candidate) => candidate.status === "available" && candidate.type === "combat")!;
    const result = selectRunNode(run, node.id);

    expect(result.ok).toBe(true);
    expect(result.state.status).toBe("combat");
    expect(result.state.map!.nodes.find((candidate) => candidate.id === node.id)?.status).toBe("active");
    expect(result.events.map((event) => event.type)).toEqual(["RunNodeSelected"]);
  });

  it("rejects locked node selection without mutating the run", () => {
    const run = createStartedRunFixture();
    const before = clone(run);
    const lockedNode = run.map!.nodes.find((node) => node.status === "locked")!;
    const result = selectRunNode(run, lockedNode.id);

    expect(result.ok).toBe(false);
    expect(result.state).toBe(run);
    expect(clone(run)).toEqual(before);
    expect(result.errors.map((error) => error.code)).toEqual(["run_node_not_available"]);
  });

  it("rejects missing node selection", () => {
    const result = selectRunNode(createStartedRunFixture(), runNodeId("missing_node"));

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toEqual(["missing_run_node"]);
  });

  it("rejects node selection outside map_select", () => {
    const run = createStartedRunFixture({ status: "reward" });
    const node = run.map!.nodes.find((candidate) => candidate.status === "available")!;
    const result = selectRunNode(run, node.id);

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toEqual(["invalid_run_status"]);
  });

  it("locks other available choices in the selected layer", () => {
    const run = createStartedRunFixture();
    const node = run.map!.nodes.find((candidate) => candidate.status === "available")!;
    const result = selectRunNode(run, node.id);

    expect(
      result.state.map!.nodes
        .filter((candidate) => candidate.layer === node.layer && candidate.id !== node.id)
        .map((candidate) => candidate.status)
    ).toEqual(["locked"]);
  });

  it("can structurally complete event and rest placeholder nodes", () => {
    const run = createStartedRunFixture();
    const eventNode = run.map!.nodes.find((node) => node.type === "event")!;
    const selectableRun = {
      ...run,
      status: "map_select" as const,
      map: {
        ...run.map!,
        nodes: run.map!.nodes.map((node) =>
          node.id === eventNode.id ? { ...node, status: "available" as const } : node
        )
      }
    };
    const selected = selectRunNode(selectableRun, eventNode.id);
    const completed = completeRunNonCombatNode(selected.state);

    expect(selected.ok).toBe(true);
    expect(completed.ok).toBe(true);
    expect(completed.state.map!.nodes.find((node) => node.id === eventNode.id)?.status).toBe("completed");
    expect(completed.events.map((event) => event.type)).toEqual(["RunNodeCompleted", "RunAdvanced"]);
  });

  it("can structurally complete a rest placeholder node", () => {
    const run = createStartedRunFixture();
    const restNode = run.map!.nodes.find((node) => node.type === "rest")!;
    const selectedRun = {
      ...run,
      status: "map_select" as const,
      map: {
        ...run.map!,
        nodes: run.map!.nodes.map((node) =>
          node.id === restNode.id ? { ...node, status: "available" as const } : node
        )
      }
    };
    const selected = selectRunNode(selectedRun, restNode.id);
    const completed = completeRunNonCombatNode(selected.state);

    expect(selected.ok).toBe(true);
    expect(completed.ok).toBe(true);
    expect(completed.state.map!.nodes.find((node) => node.id === restNode.id)?.status).toBe("completed");
  });
});
