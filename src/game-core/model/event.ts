import type {
  CardId,
  CardInstanceId,
  CombatantId,
  EvolutionNodeId,
  MonsterIntentId,
  EncounterId,
  PetModifierId,
  PetInstanceId,
  PetMemoryId,
  PlayerClassId,
  RewardOfferId,
  RewardOptionId,
  RunId,
  RunMapId,
  RunNodeId,
  StoryEventId,
  StatusId,
  StoryFlagId,
  UpgradeId
} from "../ids";
import type { MonsterIntentType } from "./monster";
import type { RewardOption } from "./reward";

export type CardPile = "draw" | "hand" | "discard" | "exhaust";

export type GameEvent =
  | {
      readonly type: "RunCreated";
      readonly runId: RunId;
      readonly seed: string | number;
      readonly playerClassId: PlayerClassId;
      readonly activePetInstanceIds: readonly PetInstanceId[];
    }
  | { readonly type: "RunMapGenerated"; readonly runMapId: RunMapId; readonly nodeCount: number }
  | { readonly type: "RunNodeAvailable"; readonly nodeId: RunNodeId }
  | { readonly type: "RunNodeSelected"; readonly nodeId: RunNodeId }
  | {
      readonly type: "RunCombatStarted";
      readonly nodeId: RunNodeId;
      readonly encounterId: EncounterId;
      readonly combatId: RunId;
    }
  | { readonly type: "RunCombatCompleted"; readonly nodeId: RunNodeId; readonly outcome: "won" | "lost" }
  | { readonly type: "RunRewardPending"; readonly nodeId: RunNodeId; readonly rewardOfferId: RewardOfferId }
  | { readonly type: "RunNodeCompleted"; readonly nodeId: RunNodeId }
  | { readonly type: "RunAdvanced"; readonly availableNodeIds: readonly RunNodeId[] }
  | { readonly type: "RunEnded"; readonly outcome: "completed" | "lost" }
  | { readonly type: "CombatStarted"; readonly combatId: string; readonly seed: string | number }
  | { readonly type: "TurnStarted"; readonly turnNumber: number; readonly actorId: CombatantId }
  | { readonly type: "TurnEnded"; readonly turnNumber: number; readonly actorId: CombatantId }
  | {
      readonly type: "MonsterIntentSet";
      readonly monsterId: CombatantId;
      readonly intentId: MonsterIntentId;
      readonly intentType: MonsterIntentType;
      readonly description: string;
    }
  | {
      readonly type: "MonsterIntentResolved";
      readonly monsterId: CombatantId;
      readonly intentId: MonsterIntentId;
    }
  | {
      readonly type: "CardPlayed";
      readonly cardInstanceId: CardInstanceId;
      readonly cardId: CardId;
      readonly sourceId: CombatantId;
    }
  | { readonly type: "EnergySpent"; readonly amount: number; readonly remaining: number }
  | {
      readonly type: "CardCostModified";
      readonly cardInstanceId: CardInstanceId;
      readonly cardId: CardId;
      readonly originalCost: number;
      readonly modifiedCost: number;
      readonly modifierId: PetModifierId;
      readonly petInstanceId: PetInstanceId;
    }
  | { readonly type: "CardDrawn"; readonly cardInstanceId: CardInstanceId; readonly cardId: CardId }
  | {
      readonly type: "CardMoved";
      readonly cardInstanceId: CardInstanceId;
      readonly cardId: CardId;
      readonly from: CardPile;
      readonly to: CardPile;
    }
  | {
      readonly type: "DamageDealt";
      readonly sourceId: CombatantId;
      readonly targetId: CombatantId;
      readonly amount: number;
      readonly blocked: number;
    }
  | { readonly type: "BlockGained"; readonly targetId: CombatantId; readonly amount: number; readonly total: number }
  | { readonly type: "StatusApplied"; readonly targetId: CombatantId; readonly statusId: StatusId; readonly stacks: number }
  | {
      readonly type: "StatusTicked";
      readonly targetId: CombatantId;
      readonly statusId: StatusId;
      readonly stacksBefore: number;
      readonly stacksAfter: number;
      readonly amount?: number;
    }
  | { readonly type: "StatusExpired"; readonly targetId: CombatantId; readonly statusId: StatusId }
  | {
      readonly type: "PetCommanded";
      readonly petInstanceId: PetInstanceId;
      readonly cardInstanceId: CardInstanceId;
      readonly cardId: CardId;
    }
  | {
      readonly type: "PetModifierActivated";
      readonly petInstanceId: PetInstanceId;
      readonly upgradeId: UpgradeId;
      readonly modifierId: PetModifierId;
      readonly reason: "cardCost" | "effectAmount" | "enemyDefeatedWithStatus";
    }
  | {
      readonly type: "PetModifierConsumed";
      readonly petInstanceId: PetInstanceId;
      readonly modifierId: PetModifierId;
      readonly scope: "turn" | "combat";
    }
  | { readonly type: "PetReacted"; readonly petInstanceId: PetInstanceId; readonly reaction: string }
  | { readonly type: "DeckShuffled"; readonly from: CardPile | "deck"; readonly to: CardPile; readonly count: number }
  | { readonly type: "ActionRejected"; readonly code: string; readonly message: string; readonly path?: string }
  | { readonly type: "CombatantDefeated"; readonly combatantId: CombatantId }
  | { readonly type: "CombatEnded"; readonly outcome: "won" | "lost" }
  | {
      readonly type: "RewardOffered";
      readonly rewardOfferId: RewardOfferId;
      readonly options: readonly RewardOption[];
    }
  | {
      readonly type: "RewardSelected";
      readonly rewardOfferId: RewardOfferId;
      readonly rewardOptionId: RewardOptionId;
      readonly rewardType: RewardOption["type"];
    }
  | { readonly type: "RewardSkipped"; readonly rewardOfferId: RewardOfferId }
  | { readonly type: "CardRewardAdded"; readonly cardId: CardId }
  | { readonly type: "PetUpgradeUnlocked"; readonly petInstanceId: PetInstanceId; readonly upgradeId: UpgradeId }
  | { readonly type: "StoryFlagSet"; readonly flagId: StoryFlagId }
  | { readonly type: "PetStoryEventCompleted"; readonly petInstanceId: PetInstanceId; readonly storyEventId: StoryEventId }
  | { readonly type: "PetMemoryUnlocked"; readonly petInstanceId: PetInstanceId; readonly memoryId: PetMemoryId }
  | { readonly type: "PetBondXpAdded"; readonly petInstanceId: PetInstanceId; readonly amount: number; readonly total: number }
  | { readonly type: "PetStoryFlagSet"; readonly petInstanceId: PetInstanceId; readonly flagId: StoryFlagId }
  | { readonly type: "PetEvolutionNodeUnlocked"; readonly petInstanceId: PetInstanceId; readonly evolutionNodeId: EvolutionNodeId }
  | { readonly type: "StoryEventSeen"; readonly petInstanceId: PetInstanceId; readonly storyEventId: StoryEventId }
  | {
      readonly type: "SaveSnapshotCreated";
      readonly profileId: string;
      readonly schemaVersion: number;
      readonly hasActiveRun: boolean;
    }
  | { readonly type: "SaveSlotWritten"; readonly slotId: string; readonly updatedAt: string; readonly schemaVersion: number }
  | { readonly type: "SaveSlotLoaded"; readonly slotId: string; readonly updatedAt: string; readonly schemaVersion: number }
  | { readonly type: "SaveSlotDeleted"; readonly slotId: string }
  | { readonly type: "ValidationWarning"; readonly code: string; readonly message: string };
