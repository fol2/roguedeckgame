import {
  petInstanceId,
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
  const errors = [...validation.errors];
  const mapNodeCount = starterRegistry.runMapTemplates[0]?.nodes.length;

  return {
    ok: errors.length === 0,
    title: "Pet Roguelite Deckbuilder",
    registryErrorCount: validation.errors.length,
    runStatus: "debug-static",
    mapNodeCount,
    activePetCount: activePetInstanceIds.length,
    messages: errors.length > 0
      ? errors.map((error) => `${error.code}: ${error.message}`)
      : [
          "Phaser is rendering serializable registry smoke data.",
          "Gameplay rules remain inside src/game-core."
        ]
  };
};
