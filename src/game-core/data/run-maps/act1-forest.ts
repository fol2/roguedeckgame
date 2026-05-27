import { encounterId, runMapId, runNodeId, runTemplateId } from "../../ids";
import type { RunMapTemplateDefinition } from "../../model/run-map";

export const act1ForestRunMapTemplate: RunMapTemplateDefinition = {
  id: runTemplateId("act1_forest"),
  name: "Ashwood Trail",
  mapId: runMapId("act1_forest_map"),
  actId: "act1_forest",
  nodes: [
    {
      id: runNodeId("act1_forest_0_combat_a"),
      type: "combat",
      layer: 0,
      encounterIds: [encounterId("training_slime_encounter"), encounterId("ash_mite_encounter")],
      nextNodeIds: [runNodeId("act1_forest_1_combat_a"), runNodeId("act1_forest_1_event_a")],
      authoring: { budgetMin: 1, budgetMax: 2 }
    },
    {
      id: runNodeId("act1_forest_0_combat_b"),
      type: "combat",
      layer: 0,
      encounterIds: [encounterId("ash_mite_encounter"), encounterId("training_slime_encounter")],
      nextNodeIds: [runNodeId("act1_forest_1_combat_a"), runNodeId("act1_forest_1_event_a")],
      authoring: { budgetMin: 1, budgetMax: 2 }
    },
    {
      id: runNodeId("act1_forest_1_combat_a"),
      type: "combat",
      layer: 1,
      encounterIds: [encounterId("forest_duo_encounter"), encounterId("soot_crow_encounter")],
      nextNodeIds: [runNodeId("act1_forest_2_combat_a"), runNodeId("act1_forest_2_rest_a")],
      authoring: { budgetMin: 2, budgetMax: 4 }
    },
    {
      id: runNodeId("act1_forest_1_event_a"),
      type: "event",
      layer: 1,
      nextNodeIds: [runNodeId("act1_forest_2_combat_a"), runNodeId("act1_forest_2_rest_a")],
      authoring: { notes: "Story, shrine, or field-journal event slot." }
    },
    {
      id: runNodeId("act1_forest_2_combat_a"),
      type: "combat",
      layer: 2,
      encounterIds: [encounterId("root_husk_encounter"), encounterId("crow_mite_encounter")],
      nextNodeIds: [runNodeId("act1_forest_3_rest_a"), runNodeId("act1_forest_3_rare_a")],
      authoring: { budgetMin: 3, budgetMax: 4 }
    },
    {
      id: runNodeId("act1_forest_2_rest_a"),
      type: "rest",
      layer: 2,
      nextNodeIds: [runNodeId("act1_forest_3_elite_a"), runNodeId("act1_forest_3_rare_a")],
      authoring: { notes: "Recovery before elite or rare card bearer." }
    },
    {
      id: runNodeId("act1_forest_3_rest_a"),
      type: "rest",
      layer: 3,
      nextNodeIds: [runNodeId("act1_forest_4_elite_a")],
      authoring: { notes: "Recovery before the late elite." }
    },
    {
      id: runNodeId("act1_forest_3_elite_a"),
      type: "elite",
      layer: 3,
      encounterIds: [encounterId("forest_elite_placeholder")],
      nextNodeIds: [runNodeId("act1_forest_4_boss_a")],
      authoring: { budgetMin: 5, budgetMax: 5 }
    },
    {
      id: runNodeId("act1_forest_3_rare_a"),
      type: "elite",
      layer: 3,
      encounterIds: [encounterId("cinder_scribe_encounter")],
      nextNodeIds: [runNodeId("act1_forest_4_boss_a")],
      authoring: { budgetMin: 5, budgetMax: 5 }
    },
    {
      id: runNodeId("act1_forest_4_elite_a"),
      type: "elite",
      layer: 4,
      encounterIds: [encounterId("forest_elite_placeholder")],
      nextNodeIds: [runNodeId("act1_forest_4_boss_a")],
      authoring: { budgetMin: 5, budgetMax: 5 }
    },
    {
      id: runNodeId("act1_forest_4_boss_a"),
      type: "boss",
      layer: 5,
      encounterIds: [encounterId("forest_boss_placeholder")],
      nextNodeIds: [],
      authoring: { budgetMin: 8, budgetMax: 8 }
    }
  ]
};

export const runMapTemplates = [act1ForestRunMapTemplate] as const;
