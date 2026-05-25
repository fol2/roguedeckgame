import { describe, expect, it } from "vitest";
import {
  createRun,
  encounterId,
  petDefinitionId,
  petInstanceId,
  playerClassId,
  runNodeId,
  runTemplateId,
  starterRegistry,
  validateRegistry
} from "../../src/game-core";
import { createEmberFoxInstanceFixture } from "../../src/game-core/testing/fixtures";
import {
  createLinearInvalidRunMapTemplateFixture,
  createRegistryWithMissingEncounterMonsterFixture,
  createTwoPetRegistryFixture
} from "../../src/game-core/testing/run-fixtures";
import { createSecondEmberFoxInstanceFixture } from "../../src/game-core/testing/combat-fixtures";

describe("run validation", () => {
  it("creates a run with starting deck and ordered creation events", () => {
    const result = createRun({
      seed: "ordered-create",
      playerClassId: playerClassId("novice_tamer"),
      activePetInstanceIds: [petInstanceId("ember_fox_001")],
      petInstances: [createEmberFoxInstanceFixture()],
      registry: starterRegistry
    });

    expect(result.ok).toBe(true);
    expect(result.state.deckCardIds).toEqual(starterRegistry.players[0].startingDeckCardIds);
    expect(result.events.map((event) => event.type)).toEqual([
      "RunCreated",
      "RunMapGenerated",
      "RunNodeAvailable",
      "RunNodeAvailable"
    ]);
  });

  it("validates the starter registry with encounters and map templates", () => {
    expect(validateRegistry(starterRegistry).errors).toEqual([]);
  });

  it("reports duplicate encounter ids", () => {
    const duplicate = starterRegistry.encounters[0];
    const result = validateRegistry({
      ...starterRegistry,
      encounters: [...starterRegistry.encounters, duplicate]
    });

    expect(result.errors.map((error) => error.code)).toContain("duplicate_id");
  });

  it("reports encounter monster ids that do not exist", () => {
    const result = validateRegistry(createRegistryWithMissingEncounterMonsterFixture());

    expect(result.errors.map((error) => error.code)).toContain("missing_encounter_monster");
  });

  it("reports encounters with empty monster ids", () => {
    const result = validateRegistry({
      ...starterRegistry,
      encounters: [
        ...starterRegistry.encounters,
        {
          id: encounterId("empty_encounter"),
          type: "combat",
          name: "Empty Encounter",
          monsterIds: [],
          tags: []
        }
      ]
    });

    expect(result.errors.map((error) => error.code)).toContain("missing_encounter_monster");
  });

  it("reports malformed encounter entries without throwing", () => {
    const malformedRegistry = {
      ...starterRegistry,
      encounters: [
        null,
        {
          id: 123,
          type: "combat",
          name: "Bad Encounter",
          monsterIds: "not-an-array",
          tags: []
        }
      ]
    } as never;

    expect(() => validateRegistry(malformedRegistry)).not.toThrow();
    expect(validateRegistry(malformedRegistry).errors.map((error) => error.code)).toEqual(
      expect.arrayContaining(["invalid_encounter", "invalid_encounter_id", "missing_encounter_monster"])
    );
  });

  it("reports top-level malformed encounters without throwing", () => {
    const malformedRegistry = {
      ...starterRegistry,
      encounters: null
    } as never;

    expect(() => validateRegistry(malformedRegistry)).not.toThrow();
    expect(validateRegistry(malformedRegistry).errors.map((error) => error.code)).toContain(
      "invalid_encounters"
    );
  });

  it("reports combat nodes with missing encounter ids", () => {
    const template = createLinearInvalidRunMapTemplateFixture();
    const result = validateRegistry({ ...starterRegistry, runMapTemplates: [template] });

    expect(result.errors.map((error) => error.code)).toContain("missing_run_node_encounter");
  });

  it("reports connections to missing nodes", () => {
    const template = {
      ...starterRegistry.runMapTemplates[0],
      nodes: starterRegistry.runMapTemplates[0].nodes.map((node, index) =>
        index === 0 ? { ...node, nextNodeIds: [runNodeId("missing_node")] } : node
      )
    };
    const result = validateRegistry({ ...starterRegistry, runMapTemplates: [template] });

    expect(result.errors.map((error) => error.code)).toContain("missing_run_node_connection");
  });

  it("reports backward or same-layer connections", () => {
    const template = {
      ...starterRegistry.runMapTemplates[0],
      nodes: starterRegistry.runMapTemplates[0].nodes.map((node, index) =>
        index === 1 ? { ...node, nextNodeIds: [runNodeId("act1_forest_0_combat_a")] } : node
      )
    };
    const result = validateRegistry({ ...starterRegistry, runMapTemplates: [template] });

    expect(result.errors.map((error) => error.code)).toContain("invalid_run_node_layer_connection");
  });

  it("reports a missing boss node", () => {
    const template = {
      ...starterRegistry.runMapTemplates[0],
      nodes: starterRegistry.runMapTemplates[0].nodes.filter((node) => node.type !== "boss")
    };
    const result = validateRegistry({ ...starterRegistry, runMapTemplates: [template] });

    expect(result.errors.map((error) => error.code)).toContain("missing_run_map_boss_node");
  });

  it("reports malformed run map template data without throwing", () => {
    const malformedRegistry = {
      ...starterRegistry,
      runMapTemplates: [
        {
          id: runTemplateId("malformed_map"),
          name: "Malformed Map",
          mapId: starterRegistry.runMapTemplates[0].mapId,
          nodes: "not-an-array"
        } as never
      ]
    };

    expect(() => validateRegistry(malformedRegistry)).not.toThrow();
    expect(validateRegistry(malformedRegistry).errors.map((error) => error.code)).toContain(
      "invalid_run_map_template_nodes"
    );
  });

  it("reports top-level malformed run map templates without throwing", () => {
    const malformedRegistry = {
      ...starterRegistry,
      runMapTemplates: null
    } as never;

    expect(() => validateRegistry(malformedRegistry)).not.toThrow();
    expect(validateRegistry(malformedRegistry).errors.map((error) => error.code)).toContain(
      "invalid_run_map_templates"
    );
  });

  it("reports malformed run map node data without throwing", () => {
    const malformedRegistry = {
      ...starterRegistry,
      runMapTemplates: [
        {
          ...starterRegistry.runMapTemplates[0],
          nodes: [
            null,
            {
              id: runNodeId("bad_node"),
              type: "combat",
              layer: 0,
              encounterIds: "not-an-array",
              nextNodeIds: "not-an-array"
            }
          ]
        } as never
      ]
    };

    expect(() => validateRegistry(malformedRegistry)).not.toThrow();
    expect(validateRegistry(malformedRegistry).errors.map((error) => error.code)).toEqual(
      expect.arrayContaining(["invalid_run_map_node", "invalid_run_node_connections", "invalid_run_node_encounters"])
    );
  });

  it("rejects missing player class at run creation", () => {
    const result = createRun({
      seed: "missing-player",
      playerClassId: playerClassId("missing_player"),
      activePetInstanceIds: [petInstanceId("ember_fox_001")],
      petInstances: [createEmberFoxInstanceFixture()],
      registry: starterRegistry
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toEqual(["missing_player_class"]);
  });

  it("rejects missing map template at run creation", () => {
    const result = createRun({
      seed: "missing-template",
      playerClassId: playerClassId("novice_tamer"),
      activePetInstanceIds: [petInstanceId("ember_fox_001")],
      petInstances: [createEmberFoxInstanceFixture()],
      registry: starterRegistry,
      runTemplateId: runTemplateId("missing_template")
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toEqual(["missing_run_map_template"]);
  });

  it("rejects a missing active pet instance", () => {
    const result = createRun({
      seed: "missing-pet",
      playerClassId: playerClassId("novice_tamer"),
      activePetInstanceIds: [petInstanceId("missing_pet")],
      petInstances: [createEmberFoxInstanceFixture()],
      registry: starterRegistry
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toEqual(["missing_active_pet_instance"]);
  });

  it("rejects active pet instances with missing pet definitions", () => {
    const result = createRun({
      seed: "missing-pet-definition",
      playerClassId: playerClassId("novice_tamer"),
      activePetInstanceIds: [petInstanceId("ember_fox_001")],
      petInstances: [createEmberFoxInstanceFixture({ definitionId: petDefinitionId("missing_pet_definition") })],
      registry: starterRegistry
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toEqual(["missing_active_pet_definition"]);
  });

  it("rejects too many active pets for Novice Tamer", () => {
    const result = createRun({
      seed: "too-many",
      playerClassId: playerClassId("novice_tamer"),
      activePetInstanceIds: [petInstanceId("ember_fox_001"), petInstanceId("ember_fox_002")],
      petInstances: [createEmberFoxInstanceFixture(), createSecondEmberFoxInstanceFixture()],
      registry: starterRegistry
    });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toEqual(["too_many_active_pets"]);
  });

  it("creates a two-pet run through test-only player-class data", () => {
    const registry = createTwoPetRegistryFixture();
    const result = createRun({
      seed: "two-pet",
      playerClassId: playerClassId("two_pet_tamer"),
      activePetInstanceIds: [petInstanceId("ember_fox_001"), petInstanceId("ember_fox_002")],
      petInstances: [createEmberFoxInstanceFixture(), createSecondEmberFoxInstanceFixture()],
      registry
    });

    expect(result.ok).toBe(true);
    expect(result.state.activePetInstanceIds).toEqual([petInstanceId("ember_fox_001"), petInstanceId("ember_fox_002")]);
    expect(result.state.status).toBe("map_select");
  });

  it("reports unknown encounter types", () => {
    const result = validateRegistry({
      ...starterRegistry,
      encounters: [
        ...starterRegistry.encounters,
        {
          id: encounterId("unknown_type_encounter"),
          type: "unknown",
          name: "Unknown",
          monsterIds: [],
          tags: []
        } as never
      ]
    });

    expect(result.errors.map((error) => error.code)).toContain("unknown_encounter_type");
  });
});
