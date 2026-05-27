import {
  createMultiPetProofPetInstances,
  createMultiPetProofRegistry,
  MULTI_PET_PROOF_ACTIVE_PET_INSTANCE_IDS
} from "../game-core";
import { prepareRunSandboxCombatPreview } from "../game-phaser/controllers/run-sandbox-singleton";

const isDevelopmentCombatPreviewRoute = (location: Location): boolean => {
  if (!import.meta.env.DEV) {
    return false;
  }

  return new URLSearchParams(location.search).get("combatPreview") === "1";
};

export const prepareDevelopmentCombatPreview = (location: Location): void => {
  if (!isDevelopmentCombatPreviewRoute(location)) {
    return;
  }

  const params = new URLSearchParams(location.search);
  const multiPetProof = params.get("multiPetProof") === "1" || params.get("phase12") === "multi-pet";

  prepareRunSandboxCombatPreview({
    mode: multiPetProof ? "multi-pet-proof" : "default",
    controllerConfig: multiPetProof
      ? {
          seed: "phase12-multi-pet-preview",
          registry: createMultiPetProofRegistry(),
          petInstances: createMultiPetProofPetInstances(),
          activePetInstanceIds: MULTI_PET_PROOF_ACTIVE_PET_INSTANCE_IDS
        }
      : undefined
  });
};
