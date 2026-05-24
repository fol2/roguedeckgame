import type {
  EvolutionNodeId,
  PetMemoryId,
  PetDefinitionId,
  PlayerClassId,
  StoryEventId,
  StoryFlagId,
  UpgradeId
} from "../ids";

export type StoryRequirement =
  | { readonly type: "petBondAtLeast"; readonly bondLevel: number }
  | { readonly type: "hasPetMemory"; readonly memoryId: PetMemoryId }
  | { readonly type: "bossDefeated"; readonly bossId: string }
  | { readonly type: "chapterUnlocked"; readonly chapterId: string }
  | { readonly type: "hasSeenEvent"; readonly eventId: StoryEventId }
  | { readonly type: "activePetHasTag"; readonly tag: string }
  | { readonly type: "playerClassIs"; readonly playerClassId: PlayerClassId };

export type StoryOutcome =
  | { readonly type: "setStoryFlag"; readonly flagId: StoryFlagId }
  | { readonly type: "unlockPetMemory"; readonly memoryId: PetMemoryId }
  | { readonly type: "unlockPetUpgrade"; readonly upgradeId: UpgradeId }
  | { readonly type: "unlockEvolutionNode"; readonly evolutionNodeId: EvolutionNodeId }
  | { readonly type: "addBondXp"; readonly amount: number };

export type StoryEventDefinition = {
  readonly id: StoryEventId;
  readonly title: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly requirements: readonly StoryRequirement[];
  readonly outcomes: readonly StoryOutcome[];
};

export type PetSideStoryDefinition = {
  readonly id: StoryEventId;
  readonly petDefinitionId: PetDefinitionId;
  readonly memoryIds: readonly PetMemoryId[];
  readonly storyFlagIds: readonly StoryFlagId[];
  readonly events: readonly StoryEventDefinition[];
};
