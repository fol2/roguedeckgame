import type { CardDefinition } from "../model/card";
import type { CombatState } from "../model/combat";
import type { EffectDefinition, PetTarget } from "../model/effect";
import type { GameActionError } from "../model/action";
import type { GameContentRegistry } from "../model/registry";
import type { PetInstanceId } from "../ids";
import type { Rng } from "./rng";

export type PetTargetResolution =
  | { readonly ok: true; readonly petInstanceIds: readonly PetInstanceId[] }
  | { readonly ok: false; readonly error: GameActionError };

export type PetCommandOwnerResolution =
  | { readonly ok: true; readonly value: readonly PetInstanceId[] }
  | { readonly ok: false; readonly error: GameActionError };

const error = (code: string, message: string, path?: string): GameActionError => ({
  code,
  message,
  path
});

const activePetInstances = (state: CombatState) => {
  const activeIds = new Set(state.activePetInstanceIds);
  return state.petInstances.filter((petInstance) => activeIds.has(petInstance.id));
};

export const resolvePetTargets = (
  state: CombatState,
  registry: GameContentRegistry,
  petTarget: PetTarget,
  rng: Rng
): PetTargetResolution => {
  const activeIds = [...state.activePetInstanceIds];
  const activeInstances = activePetInstances(state);

  if (petTarget.type === "leading") {
    const leadingPetInstanceId = activeIds[0];
    return leadingPetInstanceId
      ? { ok: true, petInstanceIds: [leadingPetInstanceId] }
      : { ok: false, error: error("missing_active_pet", "No active pet is available.", "activePetInstanceIds") };
  }

  if (petTarget.type === "allActive") {
    return activeIds.length > 0
      ? { ok: true, petInstanceIds: activeIds }
      : { ok: false, error: error("missing_active_pet", "No active pet is available.", "activePetInstanceIds") };
  }

  if (petTarget.type === "specific") {
    return activeInstances.some((petInstance) => petInstance.id === petTarget.petInstanceId)
      ? { ok: true, petInstanceIds: [petTarget.petInstanceId] }
      : {
          ok: false,
          error: error("missing_specific_pet", `Pet instance '${petTarget.petInstanceId}' is not active.`, "petTarget.petInstanceId")
        };
  }

  if (petTarget.type === "randomActive") {
    return activeIds.length > 0
      ? { ok: true, petInstanceIds: [rng.choice(activeIds)] }
      : { ok: false, error: error("missing_active_pet", "No active pet is available.", "activePetInstanceIds") };
  }

  const matchingIds = activeInstances
    .filter((petInstance) => {
      const definition = registry.pets.find((pet) => pet.id === petInstance.definitionId);
      return definition?.tags.includes(petTarget.tag) ?? false;
    })
    .map((petInstance) => petInstance.id);

  return matchingIds.length > 0
    ? { ok: true, petInstanceIds: matchingIds }
    : { ok: false, error: error("missing_tagged_pet", `No active pet has tag '${petTarget.tag}'.`, "petTarget.tag") };
};

const firstPetTarget = (effects: readonly EffectDefinition[]): PetTarget | undefined => {
  const petEffect = effects.find((effectDefinition) => "petTarget" in effectDefinition);
  return petEffect && "petTarget" in petEffect ? petEffect.petTarget : undefined;
};

export const resolvePetCommandOwnerIds = (
  state: CombatState,
  registry: GameContentRegistry,
  card: CardDefinition,
  rng: Rng
): PetCommandOwnerResolution => {
  if (card.type !== "pet-command") {
    return { ok: true, value: [] };
  }

  const petTarget = firstPetTarget(card.effects);
  if (!petTarget && card.requiresPetDefinitionId) {
    const matchingPet = activePetInstances(state)
      .find((petInstance) => petInstance.definitionId === card.requiresPetDefinitionId);

    return matchingPet
      ? { ok: true, value: [matchingPet.id] }
      : {
          ok: false,
          error: error(
            "missing_required_active_pet",
            `Card '${card.id}' requires an active pet of definition '${card.requiresPetDefinitionId}'.`,
            "activePetInstanceIds"
          )
        };
  }

  const targetResult = resolvePetTargets(state, registry, petTarget ?? { type: "leading" }, rng);
  return targetResult.ok
    ? { ok: true, value: targetResult.petInstanceIds }
    : targetResult;
};
