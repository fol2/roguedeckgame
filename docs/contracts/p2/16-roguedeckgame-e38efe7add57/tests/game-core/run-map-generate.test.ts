import { describe, expect, it } from "vitest";
import {
  generateRunMap,
  starterRegistry
} from "../../src/game-core";
import { act1ForestRunMapTemplate } from "../../src/game-core/data/run-maps/act1-forest";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const reachableNodeIds = (startIds: readonly string[], nodes: readonly { readonly id: string; readonly nextNodeIds: readonly string[] }[]) => {
  const reachable = new Set(startIds);
  let changed = true;

  while (changed) {
    changed = false;
    for (const node of nodes) {
      if (!reachable.has(node.id)) {
        continue;
      }

      for (const nextNodeId of node.nextNodeIds) {
        if (!reachable.has(nextNodeId)) {
          reachable.add(nextNodeId);
          changed = true;
        }
      }
    }
  }

  return reachable;
};

describe("run map generation", () => {
  it("generates the same map for the same seed and template", () => {
    const first = generateRunMap({ seed: "forest-seed", template: act1ForestRunMapTemplate });
    const second = generateRunMap({ seed: "forest-seed", template: act1ForestRunMapTemplate });

    expect(first.ok).toBe(true);
    expect(second.state).toEqual(first.state);
  });

  it("can change seeded encounter assignment for different seeds", () => {
    const first = generateRunMap({ seed: "seed-a", template: act1ForestRunMapTemplate });
    const second = generateRunMap({ seed: "seed-e", template: act1ForestRunMapTemplate });

    expect(first.state.nodes.map((node) => node.encounterId)).not.toEqual(
      second.state.nodes.map((node) => node.encounterId)
    );
  });

  it("keeps node ids unique", () => {
    const result = generateRunMap({ seed: "unique", template: act1ForestRunMapTemplate });
    const ids = result.state.nodes.map((node) => node.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("marks first-layer nodes as the initial available nodes", () => {
    const result = generateRunMap({ seed: "first-layer", template: act1ForestRunMapTemplate });
    const firstLayer = Math.min(...result.state.nodes.map((node) => node.layer));

    expect(result.state.nodes.filter((node) => node.status === "available").map((node) => node.layer)).toEqual([
      firstLayer,
      firstLayer
    ]);
  });

  it("generates an acyclic layered graph", () => {
    const result = generateRunMap({ seed: "acyclic", template: act1ForestRunMapTemplate });

    for (const node of result.state.nodes) {
      for (const nextNodeId of node.nextNodeIds) {
        const nextNode = result.state.nodes.find((candidate) => candidate.id === nextNodeId);
        expect(nextNode?.layer).toBeGreaterThan(node.layer);
      }
    }
  });

  it("contains a reachable boss node", () => {
    const result = generateRunMap({ seed: "boss", template: act1ForestRunMapTemplate });
    const firstLayerIds = result.state.nodes
      .filter((node) => node.layer === Math.min(...result.state.nodes.map((candidate) => candidate.layer)))
      .map((node) => node.id);
    const reachable = reachableNodeIds(firstLayerIds, result.state.nodes);
    const bossNode = result.state.nodes.find((node) => node.type === "boss");

    expect(bossNode).toBeDefined();
    expect(reachable.has(bossNode!.id)).toBe(true);
  });

  it("connects all non-final nodes forward and all non-first-layer nodes backward", () => {
    const result = generateRunMap({ seed: "connections", template: act1ForestRunMapTemplate });
    const firstLayer = Math.min(...result.state.nodes.map((node) => node.layer));

    for (const node of result.state.nodes) {
      if (node.type !== "boss") {
        expect(node.nextNodeIds.length).toBeGreaterThan(0);
      }

      if (node.layer !== firstLayer) {
        expect(node.previousNodeIds.length).toBeGreaterThan(0);
      }
    }
  });

  it("emits serializable map generation events", () => {
    const result = generateRunMap({ seed: "events", template: act1ForestRunMapTemplate });

    expect(JSON.parse(JSON.stringify(result.events))).toEqual(result.events);
    expect(result.events.map((event) => event.type)).toEqual([
      "RunMapGenerated",
      "RunNodeAvailable",
      "RunNodeAvailable"
    ]);
  });

  it("does not mutate template data", () => {
    const before = clone(act1ForestRunMapTemplate);

    generateRunMap({ seed: "mutation", template: act1ForestRunMapTemplate });

    expect(clone(act1ForestRunMapTemplate)).toEqual(before);
  });

  it("starter registry validates the generated starter map", () => {
    const result = generateRunMap({ seed: "registry-template", template: starterRegistry.runMapTemplates[0] });

    expect(result.ok).toBe(true);
    expect(result.state.templateId).toBe(starterRegistry.runMapTemplates[0].id);
  });
});
