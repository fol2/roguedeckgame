import { describe, expect, it } from "vitest";
import {
  createRun,
  createSaveSnapshot,
  cardId,
  evolutionNodeId,
  UNKNOWN_SAVE_CONTENT_VERSION,
  petMemoryId,
  parseSaveSnapshot,
  playerClassId,
  restoreSaveSnapshot,
  selectRunNode,
  serializeSaveSnapshot,
  starterRegistry,
  storyEventId,
  storyFlagId,
  upgradeId,
  validateSaveSnapshot,
  validateSaveSnapshotContent
} from "../../src/game-core";
import { createEmberFoxInstanceFixture } from "../../src/game-core/testing/fixtures";
import { createSaveSnapshotFixture } from "../../src/game-core/testing/save-fixtures";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe("save snapshots", () => {
  const createActiveMapFixture = () => {
    const petInstances = [createEmberFoxInstanceFixture()];
    const run = createRun({
      seed: "save-snapshot-map",
      playerClassId: playerClassId("novice_tamer"),
      activePetInstanceIds: [petInstances[0].id],
      petInstances,
      registry: starterRegistry
    }).state;
    const firstNode = run.map!.nodes.find((node) => node.status === "available" && node.type === "combat")!;

    return selectRunNode(run, firstNode.id).state.map!;
  };

  it("creates, serializes, parses, and restores plain data", () => {
    const snapshot = createSaveSnapshot({
      profileId: "profile_a",
      registry: starterRegistry,
      activeRun: createSaveSnapshotFixture().activeRun,
      petInstances: [createEmberFoxInstanceFixture()],
      now: "2026-05-25T00:00:00.000Z"
    });
    const serialized = serializeSaveSnapshot(snapshot.state);
    const parsed = parseSaveSnapshot(serialized.state);
    const restored = restoreSaveSnapshot(parsed.state);

    expect(snapshot.ok).toBe(true);
    expect(serialized.ok).toBe(true);
    expect(parsed.ok).toBe(true);
    expect(restored.ok).toBe(true);
    expect(snapshot.state.contentVersion).toBe(starterRegistry.contentVersion);
    expect(restored.state).toEqual({
      activeRun: snapshot.state.activeRun,
      petInstances: snapshot.state.petInstances,
      globalStoryFlags: []
    });
    expect(JSON.parse(serialized.state)).toEqual(snapshot.state);
  });

  it("normalises legacy saves without content version metadata", () => {
    const legacySnapshot = clone(createSaveSnapshotFixture()) as Record<string, unknown>;
    delete legacySnapshot.contentVersion;

    const validation = validateSaveSnapshot(legacySnapshot);

    expect(validation.ok).toBe(true);
    expect(validation.state.contentVersion).toBe(UNKNOWN_SAVE_CONTENT_VERSION);
    expect(restoreSaveSnapshot(validation.state, starterRegistry).ok).toBe(true);
  });

  it("validates save references against a content registry when requested", () => {
    const snapshot = createSaveSnapshotFixture();
    const missingDeckCard = {
      ...snapshot,
      activeRun: {
        ...snapshot.activeRun!,
        deckCardIds: [cardId("missing_card")]
      }
    };

    expect(validateSaveSnapshot(missingDeckCard).ok).toBe(true);
    expect(validateSaveSnapshotContent(missingDeckCard, starterRegistry)).toMatchObject({
      ok: false,
      errors: [{ code: "unknown_save_content_reference", path: "activeRun.deckCardIds[0]" }]
    });
    expect(restoreSaveSnapshot(missingDeckCard, starterRegistry)).toMatchObject({
      ok: false,
      errors: [{ code: "unknown_save_content_reference" }]
    });
  });

  it("rejects saves from incompatible content versions when content validation is requested", () => {
    const snapshot = createSaveSnapshotFixture({ contentVersion: "future-content-v99" });

    expect(validateSaveSnapshot(snapshot).ok).toBe(true);
    expect(validateSaveSnapshotContent(snapshot, starterRegistry)).toMatchObject({
      ok: false,
      errors: [{ code: "incompatible_save_content_version", path: "contentVersion" }]
    });
  });

  it("returns ok false for invalid JSON, unsupported version, and missing fields", () => {
    expect(parseSaveSnapshot("{").ok).toBe(false);
    expect(validateSaveSnapshot({ ...createSaveSnapshotFixture(), schemaVersion: 999 }).errors[0].code)
      .toBe("unsupported_save_schema_version");
    expect(validateSaveSnapshot({ ...createSaveSnapshotFixture(), profileId: "" }).ok).toBe(false);
    expect(() => restoreSaveSnapshot(null as unknown as ReturnType<typeof createSaveSnapshotFixture>)).not.toThrow();
    expect(restoreSaveSnapshot(null as unknown as ReturnType<typeof createSaveSnapshotFixture>).ok).toBe(false);
  });

  it("returns ok false for invalid active run and pet instance shapes", () => {
    expect(validateSaveSnapshot({
      ...createSaveSnapshotFixture(),
      activeRun: { id: "run_without_required_fields" }
    }).errors[0].code).toBe("invalid_save_active_run");

    expect(validateSaveSnapshot({
      ...createSaveSnapshotFixture(),
      petInstances: [{ ...createEmberFoxInstanceFixture(), storyFlags: "bad" }]
    }).errors[0].code).toBe("invalid_save_pet_instance");

    expect(validateSaveSnapshot({
      ...createSaveSnapshotFixture(),
      petInstances: [createEmberFoxInstanceFixture(), createEmberFoxInstanceFixture()]
    }).errors[0].code).toBe("invalid_save_pet_instance");
  });

  it("createSaveSnapshot validates malformed input before normalising", () => {
    expect(() => createSaveSnapshot(null as unknown as Parameters<typeof createSaveSnapshot>[0])).not.toThrow();
    expect(createSaveSnapshot(null as unknown as Parameters<typeof createSaveSnapshot>[0]).ok).toBe(false);
    expect(() => createSaveSnapshot(undefined as unknown as Parameters<typeof createSaveSnapshot>[0])).not.toThrow();
    expect(createSaveSnapshot(undefined as unknown as Parameters<typeof createSaveSnapshot>[0]).ok).toBe(false);

    expect(() => createSaveSnapshot({
      profileId: "bad_profile",
      petInstances: "bad" as unknown as ReturnType<typeof createEmberFoxInstanceFixture>[],
      now: "2026-05-25T00:00:00.000Z"
    })).not.toThrow();
    expect(createSaveSnapshot({
      profileId: "bad_profile",
      petInstances: "bad" as unknown as ReturnType<typeof createEmberFoxInstanceFixture>[],
      now: "2026-05-25T00:00:00.000Z"
    }).ok).toBe(false);

    expect(createSaveSnapshot({
      profileId: "bad_profile",
      petInstances: [
        {
          ...createEmberFoxInstanceFixture(),
          storyFlags: "bad"
        } as unknown as ReturnType<typeof createEmberFoxInstanceFixture>
      ],
      now: "2026-05-25T00:00:00.000Z"
    }).ok).toBe(false);

    expect(createSaveSnapshot({
      profileId: "bad_profile",
      petInstances: [createEmberFoxInstanceFixture()],
      globalStoryFlags: "bad" as unknown as ReturnType<typeof createSaveSnapshotFixture>["globalStoryFlags"],
      now: "2026-05-25T00:00:00.000Z"
    }).ok).toBe(false);
  });

  it("returns ok false for duplicate pet progress ids", () => {
    const duplicateProgressPet = createEmberFoxInstanceFixture({
      unlockedUpgradeIds: [upgradeId("warm_bond"), upgradeId("warm_bond")],
      chosenEvolutionNodeIds: [evolutionNodeId("ember_fox_kindled_path"), evolutionNodeId("ember_fox_kindled_path")],
      unlockedEvolutionNodeIds: [evolutionNodeId("ember_fox_kindled_path"), evolutionNodeId("ember_fox_kindled_path")],
      unlockedMemoryIds: [petMemoryId("ember_fox_memory_burned_orchard"), petMemoryId("ember_fox_memory_burned_orchard")],
      storyFlags: [storyFlagId("ember_fox_memory_01_unlocked"), storyFlagId("ember_fox_memory_01_unlocked")],
      seenStoryEventIds: [storyEventId("ember_fox_side_story"), storyEventId("ember_fox_side_story")]
    });

    for (const field of [
      "unlockedUpgradeIds",
      "chosenEvolutionNodeIds",
      "unlockedEvolutionNodeIds",
      "unlockedMemoryIds",
      "storyFlags",
      "seenStoryEventIds"
    ] as const) {
      expect(validateSaveSnapshot({
        ...createSaveSnapshotFixture(),
        petInstances: [
          {
            ...createEmberFoxInstanceFixture(),
            [field]: duplicateProgressPet[field]
          }
        ]
      }).errors[0].code).toBe("invalid_save_pet_instance");
    }
  });

  it("returns ok false when active run pet references are not restorable", () => {
    const snapshot = createSaveSnapshotFixture();

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: { ...snapshot.activeRun!, activePetInstanceIds: [] }
    }).errors[0].code).toBe("invalid_save_active_run");

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: {
        ...snapshot.activeRun!,
        activePetInstanceIds: [snapshot.petInstances[0].id, snapshot.petInstances[0].id]
      }
    }).errors[0].code).toBe("invalid_save_active_run");

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: { ...snapshot.activeRun!, activePetInstanceIds: ["missing_pet"] }
    }).errors[0].code).toBe("invalid_save_active_run");
  });

  it("returns ok false when saved persistent run HP is outside valid bounds", () => {
    const snapshot = createSaveSnapshotFixture();

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: { ...snapshot.activeRun!, playerHp: -1 }
    }).errors[0]).toMatchObject({
      code: "invalid_save_active_run",
      path: "activeRun.playerHp"
    });

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: { ...snapshot.activeRun!, playerHp: 71, playerMaxHp: 70 }
    }).errors[0]).toMatchObject({
      code: "invalid_save_active_run",
      path: "activeRun.playerHp"
    });

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: { ...snapshot.activeRun!, status: "lost", playerHp: 1 }
    }).errors[0]).toMatchObject({
      code: "invalid_save_active_run",
      path: "activeRun.playerHp"
    });
  });

  it("backfills legacy v1 active runs that predate persistent run HP", () => {
    const snapshot = clone(createSaveSnapshotFixture());
    const legacyRun = snapshot.activeRun as unknown as Record<string, unknown>;
    delete legacyRun.playerHp;
    delete legacyRun.playerMaxHp;

    const result = validateSaveSnapshot(snapshot);

    expect(result.ok).toBe(true);
    expect(result.state.activeRun?.playerHp).toBe(starterRegistry.players[0].maxHp);
    expect(result.state.activeRun?.playerMaxHp).toBe(starterRegistry.players[0].maxHp);
  });

  it("returns ok false for saved pet-upgrade reward options that do not match saved pets", () => {
    const snapshot = createSaveSnapshotFixture();
    const activeMap = createActiveMapFixture();
    const rewardRun = {
      ...snapshot.activeRun!,
      status: "reward" as const,
      map: activeMap,
      pendingRewardOffer: {
        id: "reward_fixture",
        source: "combat" as const,
        combatId: snapshot.activeRun!.id,
        seed: "reward-seed",
        status: "open" as const,
        options: [
          {
            id: "reward_fixture:petUpgrade:missing_pet:warm_bond",
            type: "petUpgrade" as const,
            petInstanceId: "missing_pet",
            petDefinitionId: snapshot.petInstances[0].definitionId,
            upgradeId: "warm_bond"
          }
        ]
      }
    };

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: rewardRun
    }).errors[0].code).toBe("invalid_save_reward_option");

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: {
        ...rewardRun,
        pendingRewardOffer: {
          ...rewardRun.pendingRewardOffer,
          options: [
            {
              ...rewardRun.pendingRewardOffer.options[0],
              petInstanceId: snapshot.petInstances[0].id,
              petDefinitionId: "wrong_pet_definition"
            }
          ]
        }
      }
    }).errors[0].code).toBe("invalid_save_reward_option");

    expect(validateSaveSnapshot({
      ...snapshot,
      petInstances: [
        createEmberFoxInstanceFixture({
          unlockedUpgradeIds: [upgradeId("warm_bond")]
        })
      ],
      activeRun: {
        ...rewardRun,
        pendingRewardOffer: {
          ...rewardRun.pendingRewardOffer,
          options: [
            {
              ...rewardRun.pendingRewardOffer.options[0],
              petInstanceId: snapshot.petInstances[0].id,
              upgradeId: upgradeId("warm_bond")
            }
          ]
        }
      }
    }).errors[0].code).toBe("invalid_save_reward_option");
  });

  it("returns ok false for invalid nested run map and reward offer shapes", () => {
    const snapshot = createSaveSnapshotFixture();

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: {
        ...snapshot.activeRun!,
        map: { ...snapshot.activeRun!.map, nodes: "bad" }
      }
    }).errors[0].code).toBe("invalid_save_run_map");

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: {
        ...snapshot.activeRun!,
        status: "reward",
        pendingRewardOffer: {}
      }
    }).errors[0].code).toBe("invalid_save_reward_offer");

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: {
        ...snapshot.activeRun!,
        status: "reward",
        pendingRewardOffer: undefined
      }
    }).errors[0].code).toBe("invalid_save_active_run");

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: {
        ...snapshot.activeRun!,
        status: "reward",
        map: createActiveMapFixture(),
        pendingRewardOffer: {
          id: "reward_fixture",
          source: "combat",
          combatId: snapshot.activeRun!.id,
          seed: "reward-seed",
          status: "open",
          options: [
            { id: "duplicate_option", type: "card", cardId: "strike" },
            { id: "duplicate_option", type: "card", cardId: "guard" }
          ]
        }
      }
    }).errors[0].code).toBe("invalid_save_reward_offer");

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: {
        ...snapshot.activeRun!,
        status: "reward",
        map: createActiveMapFixture(),
        pendingRewardOffer: {
          id: "reward_fixture",
          source: "combat",
          combatId: snapshot.activeRun!.id,
          seed: "reward-seed",
          status: "open",
          options: [],
          selectedOptionId: "selected_option"
        }
      }
    }).errors[0].code).toBe("invalid_save_reward_offer");
  });

  it("returns ok false for stale or mismatched pending reward offers", () => {
    const snapshot = createSaveSnapshotFixture();
    const activeMap = createActiveMapFixture();
    const rewardOffer = {
      id: "reward_fixture",
      source: "combat" as const,
      combatId: snapshot.activeRun!.id,
      seed: "reward-seed",
      status: "open" as const,
      options: []
    };

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: {
        ...snapshot.activeRun!,
        status: "map_select",
        pendingRewardOffer: { ...rewardOffer, status: "claimed" as const }
      }
    }).errors[0].code).toBe("invalid_save_active_run");

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: {
        ...snapshot.activeRun!,
        status: "map_select",
        map: {
          ...snapshot.activeRun!.map!,
          currentNodeId: snapshot.activeRun!.map!.nodes[0].id
        }
      }
    }).errors[0].code).toBe("invalid_save_active_run");

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: {
        ...snapshot.activeRun!,
        status: "combat",
        map: {
          ...activeMap,
          currentNodeId: activeMap.nodes.find((node) => node.id !== activeMap.currentNodeId)!.id
        }
      }
    }).errors[0].code).toBe("invalid_save_active_run");

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: {
        ...snapshot.activeRun!,
        status: "reward",
        map: activeMap,
        pendingRewardOffer: { ...rewardOffer, combatId: "other_run" }
      }
    }).errors[0].code).toBe("invalid_save_active_run");
  });

  it("returns ok false for resumable run statuses without valid map state", () => {
    const snapshot = createSaveSnapshotFixture();
    const activeMap = createActiveMapFixture();

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: { ...snapshot.activeRun!, status: "map_select", map: undefined }
    }).errors[0].code).toBe("invalid_save_active_run");

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: { ...snapshot.activeRun!, status: "combat", map: undefined }
    }).errors[0].code).toBe("invalid_save_active_run");

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: {
        ...snapshot.activeRun!,
        status: "combat",
        map: {
          ...activeMap,
          nodes: activeMap.nodes.map((node) => ({ ...node, status: "completed" as const }))
        }
      }
    }).errors[0].code).toBe("invalid_save_active_run");

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: {
        ...snapshot.activeRun!,
        status: "map_select",
        map: activeMap
      }
    }).errors[0].code).toBe("invalid_save_active_run");

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: {
        ...snapshot.activeRun!,
        status: "combat",
        map: {
          ...activeMap,
          nodes: activeMap.nodes.map((node, index) =>
            index === 3 ? { ...node, status: "active" as const } : node
          )
        }
      }
    }).errors[0].code).toBe("invalid_save_active_run");

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: {
        ...snapshot.activeRun!,
        status: "reward",
        map: {
          ...activeMap,
          nodes: activeMap.nodes.map((node, index) =>
            index === 3 ? { ...node, status: "active" as const } : node
          )
        },
        pendingRewardOffer: {
          id: "reward_fixture",
          source: "combat",
          combatId: snapshot.activeRun!.id,
          seed: "reward-seed",
          status: "open",
          options: []
        }
      }
    }).errors[0].code).toBe("invalid_save_active_run");

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: {
        ...snapshot.activeRun!,
        status: "reward",
        map: {
          ...activeMap,
          currentNodeId: activeMap.nodes.find((node) => node.id !== activeMap.currentNodeId)!.id
        },
        pendingRewardOffer: {
          id: "reward_fixture",
          source: "combat",
          combatId: snapshot.activeRun!.id,
          seed: "reward-seed",
          status: "open",
          options: []
        }
      }
    }).errors[0].code).toBe("invalid_save_active_run");
  });

  it("returns ok false for duplicate run map nodes and missing edge references", () => {
    const snapshot = createSaveSnapshotFixture();
    const activeMap = createActiveMapFixture();

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: {
        ...snapshot.activeRun!,
        map: {
          ...activeMap,
          nodes: [
            activeMap.nodes[0],
            { ...activeMap.nodes[1], id: activeMap.nodes[0].id }
          ]
        }
      }
    }).errors[0].code).toBe("invalid_save_run_map_node");

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: {
        ...snapshot.activeRun!,
        map: {
          ...activeMap,
          nodes: activeMap.nodes.map((node, index) =>
            index === 0 ? { ...node, nextNodeIds: ["missing_node"] } : node
          )
        }
      }
    }).errors[0].code).toBe("invalid_save_run_map_node");

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: {
        ...snapshot.activeRun!,
        map: {
          ...activeMap,
          nodes: activeMap.nodes.map((node, index) =>
            index === 1 ? { ...node, previousNodeIds: ["missing_node"] } : node
          )
        }
      }
    }).errors[0].code).toBe("invalid_save_run_map_node");

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: {
        ...snapshot.activeRun!,
        map: {
          ...activeMap,
          nodes: activeMap.nodes.map((node, index) =>
            index === 0
              ? { ...node, nextNodeIds: [node.nextNodeIds[0], node.nextNodeIds[0]] }
              : node
          )
        }
      }
    }).errors[0].code).toBe("invalid_save_run_map_node");
  });

  it("returns ok false for non-reciprocal run map edges", () => {
    const snapshot = createSaveSnapshotFixture();
    const activeMap = createActiveMapFixture();
    const sourceNode = activeMap.nodes.find((node) => node.nextNodeIds.length > 0)!;
    const targetNodeId = sourceNode.nextNodeIds[0];
    const unrelatedPreviousNode = activeMap.nodes.find((node) =>
      node.id !== sourceNode.id &&
      !sourceNode.nextNodeIds.includes(node.id)
    )!;

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: {
        ...snapshot.activeRun!,
        map: {
          ...activeMap,
          nodes: activeMap.nodes.map((node) =>
            node.id === targetNodeId
              ? { ...node, previousNodeIds: node.previousNodeIds.filter((nodeId) => nodeId !== sourceNode.id) }
              : node
          )
        }
      }
    }).errors[0].code).toBe("invalid_save_run_map_node");

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: {
        ...snapshot.activeRun!,
        map: {
          ...activeMap,
          nodes: activeMap.nodes.map((node) =>
            node.id === unrelatedPreviousNode.id
              ? { ...node, previousNodeIds: [...node.previousNodeIds, sourceNode.id] }
              : node
          )
        }
      }
    }).errors[0].code).toBe("invalid_save_run_map_node");
  });

  it("returns ok false for combat map nodes without encounter ids", () => {
    const snapshot = createSaveSnapshotFixture();
    const activeMap = createActiveMapFixture();

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: {
        ...snapshot.activeRun!,
        status: "combat",
        map: {
          ...activeMap,
          nodes: activeMap.nodes.map((node) =>
            node.status === "active" ? { ...node, encounterId: undefined } : node
          )
        }
      }
    }).errors[0].code).toBe("invalid_save_run_map_node");

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: {
        ...snapshot.activeRun!,
        status: "map_select",
        map: {
          ...snapshot.activeRun!.map!,
          nodes: snapshot.activeRun!.map!.nodes.map((node) =>
            node.status === "available" && node.type === "combat"
              ? { ...node, encounterId: undefined }
              : node
          )
        }
      }
    }).errors[0].code).toBe("invalid_save_run_map_node");
  });

  it("returns ok false for reward runs without an active reward node", () => {
    const snapshot = createSaveSnapshotFixture();
    const activeMap = createActiveMapFixture();
    const mapWithoutActiveRewardNode = {
      ...activeMap,
      nodes: activeMap.nodes.map((node) => ({ ...node, status: "completed" as const }))
    };

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: {
        ...snapshot.activeRun!,
        status: "reward",
        map: undefined,
        pendingRewardOffer: {
          id: "reward_fixture",
          source: "combat",
          combatId: snapshot.activeRun!.id,
          seed: "reward-seed",
          status: "open",
          options: []
        }
      }
    }).errors[0].code).toBe("invalid_save_active_run");

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: {
        ...snapshot.activeRun!,
        status: "reward",
        map: mapWithoutActiveRewardNode,
        pendingRewardOffer: {
          id: "reward_fixture",
          source: "combat",
          combatId: snapshot.activeRun!.id,
          seed: "reward-seed",
          status: "open",
          options: []
        }
      }
    }).errors[0].code).toBe("invalid_save_active_run");
  });

  it("returns ok false for non-finite numeric seeds", () => {
    const snapshot = createSaveSnapshotFixture();
    const activeMap = createActiveMapFixture();

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: { ...snapshot.activeRun!, seed: Number.NaN }
    }).ok).toBe(false);

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: {
        ...snapshot.activeRun!,
        map: { ...snapshot.activeRun!.map!, seed: Number.POSITIVE_INFINITY }
      }
    }).ok).toBe(false);

    expect(validateSaveSnapshot({
      ...snapshot,
      activeRun: {
        ...snapshot.activeRun!,
        status: "reward",
        map: {
          ...activeMap,
          nodes: activeMap.nodes.map((node, index) => ({
            ...node,
            status: index === 0 ? "active" as const : node.status
          }))
        },
        pendingRewardOffer: {
          id: "reward_fixture",
          source: "combat",
          combatId: snapshot.activeRun!.id,
          seed: Number.NEGATIVE_INFINITY,
          status: "open",
          options: []
        }
      }
    }).ok).toBe(false);
  });

  it("does not mutate inputs and rejects functions", () => {
    const snapshot = createSaveSnapshotFixture();
    const before = clone(snapshot);
    const serialized = serializeSaveSnapshot(snapshot);

    expect(snapshot).toEqual(before);
    expect(serialized.ok).toBe(true);
    expect(validateSaveSnapshot({ ...snapshot, extra: () => undefined }).ok).toBe(false);
  });

  it("returns a canonical save snapshot without unknown JSON fields", () => {
    const snapshot = { ...createSaveSnapshotFixture(), uiSettings: { scale: 2 } };
    const validation = validateSaveSnapshot(snapshot);

    expect(validation.ok).toBe(true);
    expect("uiSettings" in validation.state).toBe(false);
  });

  it("returns ok false for non-JSON-serializable snapshot data instead of throwing", () => {
    const snapshot = {
      ...createSaveSnapshotFixture(),
      extra: BigInt(1)
    };
    const circular = createSaveSnapshotFixture() as unknown as Record<string, unknown>;
    circular.self = circular;

    expect(() => validateSaveSnapshot(snapshot)).not.toThrow();
    expect(validateSaveSnapshot(snapshot).ok).toBe(false);
    expect(() => serializeSaveSnapshot(snapshot as unknown as ReturnType<typeof createSaveSnapshotFixture>)).not.toThrow();
    expect(serializeSaveSnapshot(snapshot as unknown as ReturnType<typeof createSaveSnapshotFixture>).ok).toBe(false);
    expect(validateSaveSnapshot(circular).ok).toBe(false);
  });
});
