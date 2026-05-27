import { describe, expect, it } from "vitest";
import {
  encounterId,
  monsterId,
  starterRegistry,
  validateLevelAuthoringRegistry
} from "../../src/game-core";
import {
  buildLevelAuthoringReport,
  buildLevelSimulationAuthoringSummary
} from "../../src/game-core/testing";

const errorCodes = (result: ReturnType<typeof validateLevelAuthoringRegistry>): readonly string[] =>
  result.errors.map((error) => error.code);

describe("level authoring report", () => {
  it("summarises encounter budgets and run-map node authoring metadata deterministically", () => {
    const first = buildLevelAuthoringReport(starterRegistry);
    const second = buildLevelAuthoringReport(starterRegistry);

    expect(first).toEqual(second);
    expect(first.encounters.map((encounter) => encounter.id)).toEqual([
      "ash_mite_encounter",
      "forest_boss_placeholder",
      "forest_duo_encounter",
      "forest_elite_placeholder",
      "training_slime_encounter"
    ]);
    expect(first.encounterBudgetsByType).toEqual({
      boss: 8,
      combat: 6,
      elite: 5
    });
    expect(first.encounters[0]).toMatchObject({
      id: "ash_mite_encounter",
      name: "Ash Mite",
      rewardPoolId: "normal",
      monsterIds: ["ash_mite"],
      monsters: [expect.objectContaining({
        id: "ash_mite",
        name: "Ash Mite",
        roles: ["attack", "burn"]
      })],
      monsterGroups: [{
        id: "ash_mite_group",
        maxCount: 1,
        minCount: 1,
        monsterIds: ["ash_mite"],
        roles: ["attack", "burn"]
      }]
    });
    expect(first.encounters[2]).toMatchObject({
      id: "forest_duo_encounter",
      monsters: [
        expect.objectContaining({ id: "ash_mite", roles: ["attack", "burn"] }),
        expect.objectContaining({ id: "training_slime", roles: ["block", "frontline"] })
      ]
    });
    expect(first.runMapTemplates[0]).toMatchObject({
      id: "act1_forest",
      actId: "act1_forest",
      nodeCount: 7,
      combatNodeCount: 5,
      budgetedNodeCount: 5
    });
    expect(first.runMapTemplates[0].nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "act1_forest_0_combat_a",
        type: "combat",
        encounterIds: ["ash_mite_encounter", "training_slime_encounter"],
        nextNodeIds: ["act1_forest_1_combat_a", "act1_forest_1_event_a"],
        meaning: "Starts one of the listed combat encounters.",
        encounters: expect.arrayContaining([
          expect.objectContaining({
            name: "Ash Mite",
            rewardPoolId: "normal",
            monsters: [expect.objectContaining({ name: "Ash Mite" })]
          })
        ])
      }),
      expect.objectContaining({
        id: "act1_forest_3_elite_a",
        type: "elite",
        encounters: [expect.objectContaining({
          name: "Charred Stag",
          rewardPoolId: "elite",
          monsters: [expect.objectContaining({ id: "charred_stag", name: "Charred Stag" })]
        })]
      }),
      expect.objectContaining({
        id: "act1_forest_4_boss_a",
        type: "boss",
        encounters: [expect.objectContaining({
          name: "Forest Warden",
          rewardPoolId: "boss",
          monsters: [expect.objectContaining({ id: "forest_warden", name: "Forest Warden" })]
        })]
      })
    ]));
  });

  it("validates starter encounter and run-map authoring metadata", () => {
    expect(validateLevelAuthoringRegistry(starterRegistry).errors).toEqual([]);
  });

  it("reports malformed encounter authoring metadata", () => {
    const result = validateLevelAuthoringRegistry({
      ...starterRegistry,
      encounters: [
        {
          ...starterRegistry.encounters[0],
          authoring: {
            difficultyBand: "unknown",
            budget: -1,
            monsterRoles: []
          } as never
        }
      ]
    });

    expect(result.errors.map((error) => error.code)).toContain("invalid_encounter_authoring");
  });

  it("requires act metadata on encounter authoring used by playable run nodes", () => {
    const result = validateLevelAuthoringRegistry({
      ...starterRegistry,
      encounters: starterRegistry.encounters.map((encounter, index) =>
        index === 0
          ? {
              ...encounter,
              authoring: {
                ...encounter.authoring,
                actId: undefined
              }
            }
          : encounter
      )
    } as never);

    expect(result.errors).toContainEqual(expect.objectContaining({
      code: "invalid_encounter_authoring",
      path: "encounters[0].authoring.actId"
    }));
  });

  it("does not cascade cross-act mismatch when encounter act metadata is malformed", () => {
    const result = validateLevelAuthoringRegistry({
      ...starterRegistry,
      encounters: starterRegistry.encounters.map((encounter, index) =>
        index === 0
          ? {
              ...encounter,
              authoring: {
                ...encounter.authoring,
                actId: ""
              }
            }
          : encounter
      )
    } as never);

    expect(result.errors).toContainEqual(expect.objectContaining({
      code: "invalid_encounter_authoring",
      path: "encounters[0].authoring.actId"
    }));
    expect(errorCodes(result)).not.toContain("run_node_encounter_act_mismatch");
  });

  it("reports missing authoring on encounters used by playable run nodes", () => {
    const result = validateLevelAuthoringRegistry({
      ...starterRegistry,
      encounters: starterRegistry.encounters.map((encounter, index) =>
        index === 0
          ? {
              ...encounter,
              authoring: undefined
            }
          : encounter
      )
    } as never);

    expect(errorCodes(result)).toContain("missing_encounter_authoring");
  });

  it("reports reward-pool references that are not registered", () => {
    const result = validateLevelAuthoringRegistry({
      ...starterRegistry,
      encounters: starterRegistry.encounters.map((encounter, index) =>
        index === 0
          ? {
              ...encounter,
              authoring: {
                ...encounter.authoring,
                rewardPoolId: "missing_pool"
              }
            }
          : encounter
      )
    } as never);

    expect(errorCodes(result)).toContain("missing_encounter_reward_pool");
  });

  it("validates reward-pool definitions as authoring content", () => {
    const result = validateLevelAuthoringRegistry({
      ...starterRegistry,
      rewardPools: [{
        id: "normal",
        name: "",
        rewardTypes: ["unknown"],
        tags: "not-an-array"
      }]
    } as never);

    expect(errorCodes(result)).toContain("invalid_reward_pool");
  });

  it("validates monster-group composition for encounter authoring", () => {
    const result = validateLevelAuthoringRegistry({
      ...starterRegistry,
      encounters: starterRegistry.encounters.map((encounter, index) =>
        index === 0
          ? {
              ...encounter,
              authoring: {
                ...encounter.authoring,
                monsterGroups: [{
                  id: "bad_group",
                  monsterIds: [monsterId("missing_monster")],
                  roles: ["missing"],
                  minCount: 1,
                  maxCount: 1
                }]
              }
            }
          : encounter
      )
    } as never);

    expect(errorCodes(result)).toContain("missing_encounter_group_monster");
    expect(errorCodes(result)).toContain("encounter_monster_group_mismatch");
  });

  it("rejects monster-group count ranges larger than the listed monster pool", () => {
    const result = validateLevelAuthoringRegistry({
      ...starterRegistry,
      encounters: starterRegistry.encounters.map((encounter, index) =>
        index === 0
          ? {
              ...encounter,
              authoring: {
                ...encounter.authoring,
                monsterGroups: [{
                  id: "oversized_group",
                  monsterIds: [monsterId("training_slime")],
                  roles: ["training"],
                  minCount: 1,
                  maxCount: 2
                }]
              }
            }
          : encounter
      )
    } as never);

    expect(result.errors).toContainEqual(expect.objectContaining({
      code: "invalid_encounter_monster_group",
      path: "encounters[0].authoring.monsterGroups[0].maxCount"
    }));
  });

  it("rejects duplicate monster-group ids within an encounter", () => {
    const result = validateLevelAuthoringRegistry({
      ...starterRegistry,
      encounters: starterRegistry.encounters.map((encounter, index) =>
        index === 2
          ? {
              ...encounter,
              authoring: {
                ...encounter.authoring,
                monsterGroups: [
                  {
                    id: "duplicate_group",
                    monsterIds: [monsterId("training_slime")],
                    roles: ["training"],
                    minCount: 1,
                    maxCount: 1
                  },
                  {
                    id: "duplicate_group",
                    monsterIds: [monsterId("ash_mite")],
                    roles: ["burn"],
                    minCount: 1,
                    maxCount: 1
                  }
                ]
              }
            }
          : encounter
      )
    } as never);

    expect(result.errors).toContainEqual(expect.objectContaining({
      code: "duplicate_encounter_monster_group",
      path: "encounters[2].authoring.monsterGroups[1].id"
    }));
  });

  it("validates monster-group coverage on authored encounters before a map references them", () => {
    const result = validateLevelAuthoringRegistry({
      ...starterRegistry,
      encounters: [
        ...starterRegistry.encounters,
        {
          ...starterRegistry.encounters[2],
          id: encounterId("unreferenced_authored_duo"),
          authoring: {
            ...starterRegistry.encounters[2].authoring,
            monsterGroups: [{
              id: "partial_unreferenced_group",
              monsterIds: [monsterId("training_slime")],
              roles: ["training"],
              minCount: 1,
              maxCount: 1
            }]
          }
        }
      ]
    } as never);

    expect(result.errors).toContainEqual(expect.objectContaining({
      code: "encounter_monster_group_mismatch",
      path: "encounters[5].authoring.monsterGroups"
    }));
  });

  it("reports run-node encounter budgets outside node budget bands", () => {
    const template = {
      ...starterRegistry.runMapTemplates[0],
      nodes: starterRegistry.runMapTemplates[0].nodes.map((node, index) =>
        index === 0
          ? {
              ...node,
              encounterIds: [encounterId("forest_duo_encounter")],
              authoring: { budgetMin: 1, budgetMax: 1 }
            }
          : node
      )
    };
    const result = validateLevelAuthoringRegistry({
      ...starterRegistry,
      runMapTemplates: [template]
    });

    expect(result.errors).toContainEqual(expect.objectContaining({
      code: "run_node_encounter_budget_mismatch",
      path: "runMapTemplates[0].nodes[0].encounterIds[0]"
    }));
  });

  it("reports malformed run-node authoring budget ranges", () => {
    const template = {
      ...starterRegistry.runMapTemplates[0],
      nodes: starterRegistry.runMapTemplates[0].nodes.map((node, index) =>
        index === 0
          ? {
              ...node,
              authoring: { budgetMin: 3, budgetMax: 1 }
            }
          : node
      )
    };
    const result = validateLevelAuthoringRegistry({
      ...starterRegistry,
      runMapTemplates: [template]
    });

    expect(result.errors).toContainEqual(expect.objectContaining({
      code: "invalid_run_node_authoring",
      path: "runMapTemplates[0].nodes[0].authoring.budgetMin"
    }));
    expect(errorCodes(result)).not.toContain("run_node_encounter_budget_mismatch");
  });

  it("requires combat nodes to define authoring budget metadata", () => {
    const template = {
      ...starterRegistry.runMapTemplates[0],
      nodes: starterRegistry.runMapTemplates[0].nodes.map((node, index) => {
        if (index !== 0) {
          return node;
        }

        const { authoring: _authoring, ...nodeWithoutAuthoring } = node;
        return nodeWithoutAuthoring;
      })
    };
    const result = validateLevelAuthoringRegistry({
      ...starterRegistry,
      runMapTemplates: [template]
    });

    expect(errorCodes(result)).toContain("missing_run_node_authoring");
  });

  it("requires combat node authoring to carry a complete budget range", () => {
    const template = {
      ...starterRegistry.runMapTemplates[0],
      nodes: starterRegistry.runMapTemplates[0].nodes.map((node, index) =>
        index === 0
          ? {
              ...node,
              authoring: { notes: "Missing explicit budget range." }
            }
          : node
      )
    };
    const result = validateLevelAuthoringRegistry({
      ...starterRegistry,
      runMapTemplates: [template]
    });

    expect(errorCodes(result)).toContain("missing_run_node_budget");
  });

  it("reports malformed run-map act metadata", () => {
    const result = validateLevelAuthoringRegistry({
      ...starterRegistry,
      runMapTemplates: [{
        ...starterRegistry.runMapTemplates[0],
        actId: ""
      }]
    } as never);

    expect(errorCodes(result)).toContain("invalid_run_map_template_act");
    expect(errorCodes(result)).not.toContain("run_node_encounter_act_mismatch");
  });

  it("requires act metadata on run maps with combat authoring nodes", () => {
    const template = {
      ...starterRegistry.runMapTemplates[0],
      actId: undefined
    };
    const result = validateLevelAuthoringRegistry({
      ...starterRegistry,
      runMapTemplates: [template]
    });

    expect(result.errors).toContainEqual(expect.objectContaining({
      code: "invalid_run_map_template_act",
      path: "runMapTemplates[0].actId"
    }));
  });

  it("reports encounters from another act on a run-map node", () => {
    const result = validateLevelAuthoringRegistry({
      ...starterRegistry,
      encounters: starterRegistry.encounters.map((encounter, index) =>
        index === 0
          ? {
              ...encounter,
              authoring: {
                ...encounter.authoring,
                actId: "act2_caves"
              }
            }
          : encounter
      )
    } as never);

    expect(result.errors).toContainEqual(expect.objectContaining({
      code: "run_node_encounter_act_mismatch",
      path: "runMapTemplates[0].nodes[0].encounterIds[0]"
    }));
  });

  it("surfaces encounter budget context beside simulation completion rate", () => {
    expect(buildLevelSimulationAuthoringSummary(starterRegistry, { completionRate: 0.75 })).toMatchObject({
      completionRate: 0.75,
      averageEncounterBudget: 3.8,
      budgetedEncounterCount: 5,
      encounterBudgetsByType: {
        boss: 8,
        combat: 6,
        elite: 5
      }
    });
  });
});
