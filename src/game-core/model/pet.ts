import type {
  CardId,
  EvolutionNodeId,
  PetDefinitionId,
  PetInstanceId,
  PetMemoryId,
  PetModifierId,
  StoryEventId,
  StoryFlagId,
  UpgradeId
} from "../ids";
import type { CardType } from "./card";
import type { EffectDefinition, PetTarget } from "./effect";
import type { StatusId } from "../ids";
import type { StoryRequirement } from "./story";

export type PetMood = "calm" | "excited" | "tired" | "in_danger" | "corrupted";

export type PetCommandCardUnlock = {
  readonly cardId: CardId;
  readonly requirement?: StoryRequirement;
};

export type CardSelector = {
  readonly cardType?: CardType;
  readonly requiresPetDefinitionId?: PetDefinitionId;
  readonly tagsAny?: readonly string[];
  readonly tagsAll?: readonly string[];
};

export type PetModifierLimit = {
  readonly type: "oncePerCombat" | "oncePerTurn";
};

export type ModifyPetCommandCostRule = {
  readonly type: "modifyPetCommandCost";
  readonly selector: CardSelector;
  readonly amount: number;
  readonly minCost?: number;
  readonly limit?: PetModifierLimit;
};

export type ModifyPetCommandEffectAmountRule = {
  readonly type: "modifyPetCommandEffectAmount";
  readonly selector: CardSelector;
  readonly effectType: "petAttack" | "applyStatus";
  readonly statusId?: StatusId;
  readonly amount: number;
};

export type TriggerOnEnemyDefeatedWithStatusRule = {
  readonly type: "triggerOnEnemyDefeatedWithStatus";
  readonly requiredStatusId: StatusId;
  readonly effects: readonly EffectDefinition[];
  readonly limit?: PetModifierLimit;
};

export type PetModifierRule =
  | ModifyPetCommandCostRule
  | ModifyPetCommandEffectAmountRule
  | TriggerOnEnemyDefeatedWithStatusRule;

export type PetModifierDefinition = {
  readonly id: PetModifierId;
  readonly name: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly rules: readonly PetModifierRule[];
};

export type EvolutionNode = {
  readonly id: EvolutionNodeId;
  readonly name: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly requirements: readonly StoryRequirement[];
  readonly unlocks: readonly PetCommandCardUnlock[];
};

export type PetDefinition = {
  readonly id: PetDefinitionId;
  readonly name: string;
  readonly species: string;
  readonly tags: readonly string[];
  readonly baseCommandCardIds: readonly CardId[];
  readonly evolutionTree: readonly EvolutionNode[];
  readonly sideStoryId?: StoryEventId;
};

export type PetInstance = {
  readonly id: PetInstanceId;
  readonly definitionId: PetDefinitionId;
  readonly nickname: string;
  readonly bondLevel: number;
  readonly bondXp: number;
  readonly unlockedUpgradeIds: readonly UpgradeId[];
  readonly chosenEvolutionNodeIds: readonly EvolutionNodeId[];
  readonly unlockedMemoryIds: readonly PetMemoryId[];
  readonly storyFlags: readonly StoryFlagId[];
};

export type RunPetState = {
  readonly petInstanceId: PetInstanceId;
  readonly mood: PetMood;
  readonly activeModifierIds: readonly PetModifierId[];
  readonly temporaryModifierIds: readonly PetModifierId[];
  readonly usedModifierIdsThisCombat: readonly PetModifierId[];
  readonly usedModifierIdsThisTurn: readonly PetModifierId[];
  readonly fatigue: number;
};

export type PetSlot = {
  readonly index: number;
  readonly acceptsTags?: readonly string[];
  readonly assignedPetInstanceIds?: readonly PetInstanceId[];
};

export type PetUpgradeDefinition = {
  readonly id: UpgradeId;
  readonly petDefinitionId: PetDefinitionId;
  readonly name: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly modifiers: readonly PetModifierDefinition[];
  readonly unlocks?: readonly PetCommandCardUnlock[];
  readonly storyFlagUnlocks?: readonly StoryFlagId[];
};

export type PetEffectPreview = {
  readonly petTarget: PetTarget;
  readonly effects: readonly EffectDefinition[];
};
