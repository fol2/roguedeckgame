import type { GameActionError } from "../model/action";
import type { CardDefinition } from "../model/card";
import type { CombatantState, CombatState } from "../model/combat";
import type { CombatantTarget, EffectDefinition, PetTarget } from "../model/effect";
import type { GameContentRegistry } from "../model/registry";
import type { CardId, CardInstanceId, CombatantId, PetInstanceId } from "../ids";
import { getCardActionProfile, targetNeedsActionTarget, type CardPlayMode, type CardTargetKind } from "./card-actions";
import { applyPetCommandCostModifiers, resolvePetCommandOwnerIds } from "./pet-modifiers";
import { createRng } from "./rng";

export type CardActionContractMode = "preview" | "submit";

export type BuildCardActionContractInput = {
  readonly cardInstanceId: CardInstanceId;
  readonly targetId?: CombatantId;
  readonly mode?: CardActionContractMode;
};

export type CardActionContract = {
  readonly cardInstanceId: CardInstanceId;
  readonly cardId?: CardId;
  readonly baseCost: number;
  readonly effectiveCost: number;
  readonly playable: boolean;
  readonly actionError?: GameActionError;
  readonly unplayableReason?: string;
  readonly targetKind: CardTargetKind;
  readonly playMode: CardPlayMode;
  readonly requiresManualTarget: boolean;
  readonly requiresActionTarget: boolean;
  readonly validEnemyTargetIds: readonly CombatantId[];
  readonly validPetTargetIds: readonly PetInstanceId[];
  readonly actorPetInstanceIds: readonly PetInstanceId[];
  readonly commandPetSlotIndex?: number;
};

const error = (code: string, message: string, path?: string): GameActionError => ({
  code,
  message,
  path
});

const unplayableReason = (actionError: GameActionError): string => {
  if (actionError.code === "invalid_phase") {
    return "Not your turn.";
  }

  if (actionError.code === "insufficient_energy") {
    return "Not enough energy.";
  }

  if (
    actionError.code === "missing_required_active_pet" ||
    actionError.code === "missing_active_pet" ||
    actionError.code === "missing_specific_pet" ||
    actionError.code === "missing_tagged_pet"
  ) {
    return "No commandable active pet.";
  }

  if (
    actionError.code === "missing_target" ||
    actionError.code === "dead_target" ||
    actionError.code === "invalid_target" ||
    actionError.code === "invalid_target_type"
  ) {
    return "No valid enemy target.";
  }

  return actionError.message;
};

const findCombatant = (state: CombatState, combatantId: CombatantId): CombatantState | undefined => {
  if (state.player.id === combatantId) {
    return state.player;
  }

  return state.monsters.find((monster) => monster.id === combatantId);
};

const validEnemyTargetIds = (state: CombatState): readonly CombatantId[] =>
  state.monsters.filter((monster) => monster.alive).map((monster) => monster.id);

const activePetInstanceIds = (state: CombatState): readonly PetInstanceId[] =>
  state.activePetInstanceIds.filter((petInstanceId) =>
    state.petInstances.some((petInstance) => petInstance.id === petInstanceId)
  );

const hasRequiredActivePet = (state: CombatState, card: CardDefinition): boolean => {
  if (!card.requiresPetDefinitionId) {
    return true;
  }

  return state.petInstances
    .filter((petInstance) => state.activePetInstanceIds.includes(petInstance.id))
    .some((petInstance) => petInstance.definitionId === card.requiresPetDefinitionId);
};

const validateCombatantTarget = (
  state: CombatState,
  target: CombatantTarget,
  targetId?: CombatantId,
  mode: CardActionContractMode = "preview"
): GameActionError | undefined => {
  if (!targetNeedsActionTarget(target)) {
    if (target.type === "target" && target.combatantId) {
      const combatant = findCombatant(state, target.combatantId);
      if (!combatant) {
        return error("invalid_target", `Target combatant '${target.combatantId}' does not exist.`, "targetId");
      }

      if (!combatant.alive) {
        return error("dead_target", `Target combatant '${target.combatantId}' is defeated.`, "targetId");
      }
    }

    return undefined;
  }

  if (!targetId) {
    return mode === "submit"
      ? error("missing_target", "This card requires a target.", "targetId")
      : undefined;
  }

  const combatant = findCombatant(state, targetId);
  if (!combatant) {
    return error("invalid_target", `Target combatant '${targetId}' does not exist.`, "targetId");
  }

  if (combatant.type !== "monster") {
    return error("invalid_target_type", "Player card targets must be alive monsters.", "targetId");
  }

  return combatant.alive
    ? undefined
    : error("dead_target", `Target combatant '${targetId}' is defeated.`, "targetId");
};

const validatePetTarget = (
  state: CombatState,
  registry: GameContentRegistry,
  petTarget: PetTarget
): GameActionError | undefined => {
  const activeIds = [...state.activePetInstanceIds];

  if (petTarget.type === "leading" || petTarget.type === "randomActive" || petTarget.type === "allActive") {
    return activeIds.length > 0
      ? undefined
      : error("missing_active_pet", "No active pet is available.", "activePetInstanceIds");
  }

  if (petTarget.type === "specific") {
    return activeIds.includes(petTarget.petInstanceId)
      ? undefined
      : error("missing_specific_pet", `Pet instance '${petTarget.petInstanceId}' is not active.`, "petTarget");
  }

  const hasTaggedPet = state.petInstances
    .filter((petInstance) => activeIds.includes(petInstance.id))
    .some((petInstance) => {
      const definition = registry.pets.find((pet) => pet.id === petInstance.definitionId);
      return definition?.tags.includes(petTarget.tag) ?? false;
    });

  return hasTaggedPet
    ? undefined
    : error("missing_tagged_pet", `No active pet has tag '${petTarget.tag}'.`, "petTarget");
};

const hasTargetEffect = (
  effectDefinition: EffectDefinition
): effectDefinition is EffectDefinition & { readonly target: CombatantTarget } =>
  "target" in effectDefinition;

const hasPetTargetEffect = (
  effectDefinition: EffectDefinition
): effectDefinition is EffectDefinition & { readonly petTarget: PetTarget } =>
  "petTarget" in effectDefinition;

const validateCardEffects = (
  state: CombatState,
  card: CardDefinition,
  targetId: CombatantId | undefined,
  registry: GameContentRegistry,
  mode: CardActionContractMode
): GameActionError | undefined => {
  const profile = getCardActionProfile(card);
  if (targetId !== undefined && !profile.requiresActionTarget) {
    return error("unexpected_card_target", "Targetless cards must not include a target id.", "targetId");
  }

  for (const effectDefinition of card.effects) {
    if (hasTargetEffect(effectDefinition)) {
      const targetError = validateCombatantTarget(state, effectDefinition.target, targetId, mode);
      if (targetError) {
        return targetError;
      }
    }

    if (hasPetTargetEffect(effectDefinition)) {
      const petError = validatePetTarget(state, registry, effectDefinition.petTarget);
      if (petError) {
        return petError;
      }
    }
  }

  return undefined;
};

const emptyContract = (
  input: BuildCardActionContractInput,
  actionError: GameActionError
): CardActionContract => ({
  cardInstanceId: input.cardInstanceId,
  baseCost: 0,
  effectiveCost: 0,
  playable: false,
  actionError,
  unplayableReason: unplayableReason(actionError),
  targetKind: "none",
  playMode: "immediate",
  requiresManualTarget: false,
  requiresActionTarget: false,
  validEnemyTargetIds: [],
  validPetTargetIds: [],
  actorPetInstanceIds: []
});

const commandPetSlotIndex = (
  state: CombatState,
  actorPetInstanceIds: readonly PetInstanceId[]
): number | undefined => {
  const actorPetInstanceId = actorPetInstanceIds[0];

  if (!actorPetInstanceId) {
    return undefined;
  }

  const slotIndex = state.activePetInstanceIds.indexOf(actorPetInstanceId);
  return slotIndex >= 0 ? slotIndex : undefined;
};

export const buildCardActionContract = (
  state: CombatState,
  input: BuildCardActionContractInput,
  registry: GameContentRegistry
): CardActionContract => {
  const mode = input.mode ?? "preview";
  const cardInstance = state.cardInstances.find((candidate) => candidate.id === input.cardInstanceId);
  if (!cardInstance) {
    return emptyContract(
      input,
      error("missing_card_instance", `Card instance '${input.cardInstanceId}' does not exist.`, "cardInstances")
    );
  }

  const card = registry.cards.find((cardDefinition) => cardDefinition.id === cardInstance.cardId);
  if (!card) {
    return emptyContract(
      input,
      error("missing_card_definition", `Card '${cardInstance.cardId}' is not registered.`, "registry.cards")
    );
  }

  const profile = getCardActionProfile(card);
  const base = {
    cardInstanceId: input.cardInstanceId,
    cardId: cardInstance.cardId,
    baseCost: card.cost,
    effectiveCost: card.cost,
    targetKind: profile.targetKind,
    playMode: profile.playMode,
    requiresManualTarget: profile.requiresManualTarget,
    requiresActionTarget: profile.requiresActionTarget,
    validEnemyTargetIds: validEnemyTargetIds(state),
    validPetTargetIds: activePetInstanceIds(state),
    actorPetInstanceIds: [] as readonly PetInstanceId[]
  };

  const actionError =
    state.phase === "won" || state.phase === "lost"
      ? error("combat_already_ended", "Cards cannot be played after combat has ended.", "phase")
      : state.phase !== "player_turn"
        ? error("invalid_phase", "Cards can only be played during the player turn.", "phase")
        : !state.hand.includes(input.cardInstanceId)
          ? error("card_not_in_hand", `Card instance '${input.cardInstanceId}' is not in hand.`, "hand")
          : undefined;

  if (actionError) {
    return {
      ...base,
      playable: false,
      actionError,
      unplayableReason: unplayableReason(actionError)
    };
  }

  if (card.type === "pet-command" && !hasRequiredActivePet(state, card)) {
    const petError = error(
      "missing_required_active_pet",
      `Card '${card.id}' requires an active pet of definition '${card.requiresPetDefinitionId}'.`,
      "activePetInstanceIds"
    );

    return {
      ...base,
      playable: false,
      actionError: petError,
      unplayableReason: unplayableReason(petError)
    };
  }

  const ownerPetResult = resolvePetCommandOwnerIds(
    state,
    registry,
    card,
    createRng(`${String(state.seed)}:${input.cardInstanceId}:card-action-contract`)
  );
  if (!ownerPetResult.ok) {
    return {
      ...base,
      playable: false,
      actionError: ownerPetResult.error,
      unplayableReason: unplayableReason(ownerPetResult.error)
    };
  }

  const costModifierResult = applyPetCommandCostModifiers(
    {
      state,
      card,
      cardInstanceId: input.cardInstanceId,
      cardId: cardInstance.cardId,
      ownerPetInstanceIds: ownerPetResult.value
    },
    registry
  );
  if (!costModifierResult.ok) {
    return {
      ...base,
      actorPetInstanceIds: ownerPetResult.value,
      playable: false,
      actionError: costModifierResult.error,
      unplayableReason: unplayableReason(costModifierResult.error)
    };
  }

  const targetError = validateCardEffects(state, card, input.targetId, registry, mode);
  if (targetError) {
    return {
      ...base,
      effectiveCost: costModifierResult.value.cost,
      actorPetInstanceIds: ownerPetResult.value,
      commandPetSlotIndex: commandPetSlotIndex(state, ownerPetResult.value),
      playable: false,
      actionError: targetError,
      unplayableReason: unplayableReason(targetError)
    };
  }

  const targetAvailabilityError = profile.requiresActionTarget && base.validEnemyTargetIds.length === 0
    ? error("missing_target", "This card requires an alive enemy target.", "targetId")
    : undefined;
  if (targetAvailabilityError) {
    return {
      ...base,
      effectiveCost: costModifierResult.value.cost,
      actorPetInstanceIds: ownerPetResult.value,
      commandPetSlotIndex: commandPetSlotIndex(state, ownerPetResult.value),
      playable: false,
      actionError: targetAvailabilityError,
      unplayableReason: unplayableReason(targetAvailabilityError)
    };
  }

  const energyError = state.energy < costModifierResult.value.cost
    ? error(
        "insufficient_energy",
        `Playing '${card.name}' requires ${costModifierResult.value.cost} energy.`,
        "energy"
      )
    : undefined;

  return {
    ...base,
    effectiveCost: costModifierResult.value.cost,
    actorPetInstanceIds: ownerPetResult.value,
    commandPetSlotIndex: commandPetSlotIndex(state, ownerPetResult.value),
    playable: energyError === undefined,
    actionError: energyError,
    unplayableReason: energyError ? unplayableReason(energyError) : undefined
  };
};
