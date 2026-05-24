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
import type { EffectDefinition, PetTarget } from "./effect";
import type { StoryRequirement } from "./story";

export type PetMood = "calm" | "excited" | "tired" | "in_danger" | "corrupted";

export type PetCommandCardUnlock = {
  readonly cardId: CardId;
  readonly requirement?: StoryRequirement;
};

export type PetModifierDefinition = {
  readonly id: PetModifierId;
  readonly name: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly effects?: readonly EffectDefinition[];
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
  readonly temporaryModifierIds: readonly PetModifierId[];
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
