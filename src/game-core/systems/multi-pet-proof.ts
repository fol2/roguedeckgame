import {
  petDefinitionId,
  petInstanceId,
  playerClassId,
  type PetInstanceId
} from "../ids";
import { starterRegistry } from "../data/registry";
import type { PetInstance } from "../model/pet";
import type { GameContentRegistry } from "../model/registry";

export const MULTI_PET_PROOF_ACTIVE_PET_INSTANCE_IDS = [
  petInstanceId("ember_fox_001"),
  petInstanceId("ember_fox_002")
] as const satisfies readonly PetInstanceId[];

export const createMultiPetProofPetInstances = (): readonly PetInstance[] => [
  {
    id: MULTI_PET_PROOF_ACTIVE_PET_INSTANCE_IDS[0],
    definitionId: petDefinitionId("ember_fox"),
    nickname: "Ember",
    bondLevel: 1,
    bondXp: 0,
    unlockedUpgradeIds: [],
    chosenEvolutionNodeIds: [],
    unlockedMemoryIds: [],
    storyFlags: []
  },
  {
    id: MULTI_PET_PROOF_ACTIVE_PET_INSTANCE_IDS[1],
    definitionId: petDefinitionId("ember_fox"),
    nickname: "Cinder",
    bondLevel: 1,
    bondXp: 0,
    unlockedUpgradeIds: [],
    chosenEvolutionNodeIds: [],
    unlockedMemoryIds: [],
    storyFlags: []
  }
];

export const createMultiPetProofRegistry = (
  registry: GameContentRegistry = starterRegistry
): GameContentRegistry => ({
  ...registry,
  players: registry.players.map((player) =>
    player.id === playerClassId("novice_tamer")
      ? {
          ...player,
          maxActivePets: Math.max(player.maxActivePets, 2),
          petSlotCount: Math.max(player.petSlotCount, 2),
          classTags: player.classTags.includes("multi-pet")
            ? player.classTags
            : [...player.classTags, "multi-pet"]
        }
      : player
  )
});
