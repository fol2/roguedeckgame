import { encounterId, runMapId, runNodeId, runTemplateId } from "../../ids";
import type { RunMapTemplateDefinition } from "../../model/run-map";

export const act1ForestRunMapTemplate: RunMapTemplateDefinition = {
  id: runTemplateId("act1_forest"),
  name: "Act 1 - Forest",
  mapId: runMapId("act1_forest_map"),
  nodes: [
    {
      id: runNodeId("act1_forest_0_combat_a"),
      type: "combat",
      layer: 0,
      encounterIds: [encounterId("training_slime_encounter"), encounterId("ash_mite_encounter")],
      nextNodeIds: [runNodeId("act1_forest_1_combat_a"), runNodeId("act1_forest_1_event_a")]
    },
    {
      id: runNodeId("act1_forest_0_combat_b"),
      type: "combat",
      layer: 0,
      encounterIds: [encounterId("ash_mite_encounter"), encounterId("training_slime_encounter")],
      nextNodeIds: [runNodeId("act1_forest_1_combat_a"), runNodeId("act1_forest_1_event_a")]
    },
    {
      id: runNodeId("act1_forest_1_combat_a"),
      type: "combat",
      layer: 1,
      encounterIds: [encounterId("forest_duo_encounter"), encounterId("training_slime_encounter")],
      nextNodeIds: [runNodeId("act1_forest_2_rest_a")]
    },
    {
      id: runNodeId("act1_forest_1_event_a"),
      type: "event",
      layer: 1,
      nextNodeIds: [runNodeId("act1_forest_2_rest_a")]
    },
    {
      id: runNodeId("act1_forest_2_rest_a"),
      type: "rest",
      layer: 2,
      nextNodeIds: [runNodeId("act1_forest_3_elite_a")]
    },
    {
      id: runNodeId("act1_forest_3_elite_a"),
      type: "elite",
      layer: 3,
      encounterIds: [encounterId("forest_elite_placeholder")],
      nextNodeIds: [runNodeId("act1_forest_4_boss_a")]
    },
    {
      id: runNodeId("act1_forest_4_boss_a"),
      type: "boss",
      layer: 4,
      encounterIds: [encounterId("forest_boss_placeholder")],
      nextNodeIds: []
    }
  ]
};

export const runMapTemplates = [act1ForestRunMapTemplate] as const;
