import {
  createRun,
  petInstanceId,
  playerClassId,
  starterRegistry,
  validateRegistry,
  type PetInstance
} from "../../game-core";

export type CoreSmokeViewModel = {
  readonly ok: boolean;
  readonly title: string;
  readonly registryErrorCount: number;
  readonly runStatus?: string;
  readonly mapNodeCount?: number;
  readonly activePetCount?: number;
  readonly messages: readonly string[];
};

const createSmokePetInstances = (): readonly PetInstance[] => {
  const emberFox = starterRegistry.pets.find((pet) => pet.id === "ember_fox");

  if (!emberFox) {
    return [];
  }

  return [
    {
      id: petInstanceId("smoke:ember_fox"),
      definitionId: emberFox.id,
      nickname: "Ember",
      bondLevel: 1,
      bondXp: 0,
      unlockedUpgradeIds: [],
      chosenEvolutionNodeIds: [],
      unlockedMemoryIds: [],
      storyFlags: []
    }
  ];
};

export const buildCoreSmokeViewModel = (): CoreSmokeViewModel => {
  const validation = validateRegistry(starterRegistry);
  const petInstances = createSmokePetInstances();
  const activePetInstanceIds = petInstances.map((pet) => pet.id);
  const run = createRun({
    seed: "phaser-core-smoke",
    playerClassId: playerClassId("novice_tamer"),
    activePetInstanceIds,
    petInstances,
    registry: starterRegistry
  });
  const errors = [...validation.errors, ...run.errors];
  const mapNodeCount = run.state.map?.nodes.length;

  return {
    ok: errors.length === 0 && run.ok,
    title: "Pet Roguelite Deckbuilder",
    registryErrorCount: validation.errors.length,
    runStatus: run.state.status,
    mapNodeCount,
    activePetCount: run.state.activePetInstanceIds.length,
    messages: errors.length > 0
      ? errors.map((error) => `${error.code}: ${error.message}`)
      : [
          "Phaser is rendering a serializable core smoke result.",
          "Gameplay rules remain inside src/game-core."
        ]
  };
};
