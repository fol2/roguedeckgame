import type {
  EvolutionNodeId,
  PetMemoryId,
  PetDefinitionId,
  PlayerClassId,
  StoryEventId,
  StoryFlagId,
  UpgradeId
} from "../ids";
import type { RunStatus, RunState } from "./run";
import type { RunNodeType } from "./run-map";

export type StoryTrigger =
  | "manual"
  | "runCreated"
  | "combatWon"
  | "nodeCompleted"
  | "runCompleted";

export type StoryRequirement =
  | { readonly type: "petBondAtLeast"; readonly bondLevel: number }
  | { readonly type: "hasPetMemory"; readonly memoryId: PetMemoryId }
  | { readonly type: "bossDefeated"; readonly bossId: string }
  | { readonly type: "chapterUnlocked"; readonly chapterId: string }
  | { readonly type: "hasSeenEvent"; readonly eventId: StoryEventId }
  | { readonly type: "activePetHasTag"; readonly tag: string }
  | { readonly type: "playerClassIs"; readonly playerClassId: PlayerClassId }
  | { readonly type: "hasPetStoryFlag"; readonly flagId: StoryFlagId }
  | { readonly type: "lacksPetStoryFlag"; readonly flagId: StoryFlagId }
  | { readonly type: "runStatusIs"; readonly status: RunStatus }
  | { readonly type: "completedRunNodeType"; readonly nodeType: RunNodeType };

export type StoryOutcome =
  | { readonly type: "setStoryFlag"; readonly flagId: StoryFlagId }
  | { readonly type: "unlockPetMemory"; readonly memoryId: PetMemoryId }
  | { readonly type: "unlockPetUpgrade"; readonly upgradeId: UpgradeId }
  | { readonly type: "unlockEvolutionNode"; readonly evolutionNodeId: EvolutionNodeId }
  | { readonly type: "addBondXp"; readonly amount: number }
  | { readonly type: "markStoryEventSeen"; readonly eventId: StoryEventId };

export type StoryEventDefinition = {
  readonly id: StoryEventId;
  readonly title: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly trigger?: StoryTrigger;
  readonly repeatable?: boolean;
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

export type PetStoryContext = {
  readonly trigger: StoryTrigger;
  readonly run?: RunState;
  readonly completedNodeType?: RunNodeType;
  readonly combatOutcome?: "won" | "lost";
  readonly globalStoryFlags?: readonly StoryFlagId[];
};
