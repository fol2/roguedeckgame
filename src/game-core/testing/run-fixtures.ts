import {
  cardId,
  encounterId,
  monsterId,
  petDefinitionId,
  petInstanceId,
  playerClassId,
  runNodeId,
  runTemplateId
} from "../ids";
import { starterRegistry } from "../data/registry";
import type { GameContentRegistry } from "../model/registry";
import type { RunState } from "../model/run";
import type { RunMapTemplateDefinition } from "../model/run-map";
import { createRun } from "../systems/run-lifecycle";
import { createEmberFoxInstanceFixture } from "./fixtures";

export const createStartedRunFixture = (overrides: Partial<RunState> = {}): RunState => {
  const result = createRun({
    seed: "run-fixture",
    playerClassId: playerClassId("novice_tamer"),
    activePetInstanceIds: [petInstanceId("ember_fox_001")],
    petInstances: [createEmberFoxInstanceFixture()],
    registry: starterRegistry
  });

  if (!result.ok) {
    throw new Error(result.errors[0]?.message ?? "Could not create run fixture.");
  }

  return { ...result.state, ...overrides };
};

export const createTwoPetRegistryFixture = (): GameContentRegistry => ({
  ...starterRegistry,
  players: [
    ...starterRegistry.players,
    {
      id: playerClassId("two_pet_tamer"),
      name: "Two Pet Tamer",
      startingDeckCardIds: [cardId("strike"), cardId("defend"), cardId("fox_bite")],
      startingRelicIds: [],
      maxActivePets: 2,
      petSlotCount: 2,
      classTags: ["test", "pet"]
    }
  ]
});

export const createLinearInvalidRunMapTemplateFixture = (): RunMapTemplateDefinition => ({
  id: runTemplateId("invalid_linear"),
  name: "Invalid Linear",
  mapId: starterRegistry.runMapTemplates[0].mapId,
  nodes: [
    {
      id: runNodeId("invalid_0"),
      type: "combat",
      layer: 0,
      encounterIds: [encounterId("training_slime_encounter")],
      nextNodeIds: [runNodeId("invalid_1")]
    },
    {
      id: runNodeId("invalid_1"),
      type: "combat",
      layer: 1,
      encounterIds: [encounterId("missing_encounter")],
      nextNodeIds: []
    }
  ]
});

export const createRegistryWithMissingEncounterMonsterFixture = (): GameContentRegistry => ({
  ...starterRegistry,
  encounters: [
    ...starterRegistry.encounters,
    {
      id: encounterId("broken_encounter"),
      type: "combat",
      name: "Broken Encounter",
      monsterIds: [monsterId("missing_monster")],
      tags: ["test"]
    }
  ]
});
