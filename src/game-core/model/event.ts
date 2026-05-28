import type {
  CardId,
  CardInstanceId,
  CombatantId,
  EnemyCardInstanceId,
  EvolutionNodeId,
  MonsterAbilityId,
  MonsterIntentId,
  EncounterId,
  PetModifierId,
  PetInstanceId,
  PetMemoryId,
  PlayerClassId,
  PlayerClassModifierId,
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
import type {
  IntentVisibilityExpiry,
  IntentVisibilityLevel,
  IntentVisibilityOverrideMode,
  IntentVisibilitySource,
  MonsterCardZone,
  ScopeIntentDepth
} from "./combat";
import type { EnemyPlanMode } from "./monster";
import type { MonsterIntentType } from "./monster";
import type { RewardOption } from "./reward";

export type CardPile = "draw" | "hand" | "discard" | "exhaust";

export const GAME_EVENT_LEGACY_SCHEMA_VERSION = 1;
export const GAME_EVENT_PREVIOUS_SCHEMA_VERSION = 4;
export const GAME_EVENT_SCHEMA_VERSION = 5;

export type GameEventSchemaVersion =
  | typeof GAME_EVENT_LEGACY_SCHEMA_VERSION
  | typeof GAME_EVENT_PREVIOUS_SCHEMA_VERSION
  | typeof GAME_EVENT_SCHEMA_VERSION;

export type GameEvent =
  | {
      readonly type: "RunCreated";
      readonly runId: RunId;
      readonly seed: string | number;
      readonly playerClassId: PlayerClassId;
      readonly activePetInstanceIds: readonly PetInstanceId[];
      readonly playerHp: number;
      readonly playerMaxHp: number;
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
  | {
      readonly type: "RunCombatCompleted";
      readonly nodeId: RunNodeId;
      readonly outcome: "won" | "lost";
      readonly playerHp: number;
      readonly playerMaxHp: number;
    }
  | {
      readonly type: "RunPlayerHealed";
      readonly nodeId: RunNodeId;
      readonly amount: number;
      readonly hpBefore: number;
      readonly hpAfter: number;
      readonly maxHp: number;
    }
  | { readonly type: "RunRewardPending"; readonly nodeId: RunNodeId; readonly rewardOfferId: RewardOfferId }
  | { readonly type: "RunNodeCompleted"; readonly nodeId: RunNodeId }
  | { readonly type: "RunAdvanced"; readonly availableNodeIds: readonly RunNodeId[] }
  | { readonly type: "RunEnded"; readonly outcome: "completed" | "lost" }
  | { readonly type: "CombatStarted"; readonly combatId: string; readonly seed: string | number }
  | { readonly type: "TurnStarted"; readonly turnNumber: number; readonly actorId: CombatantId }
  | { readonly type: "TurnEnded"; readonly turnNumber: number; readonly actorId: CombatantId }
  | {
      readonly type: "MonsterAbilityPlanned";
      readonly monsterId: CombatantId;
      readonly abilityId: MonsterAbilityId;
      readonly intentId: MonsterIntentId;
      readonly intentType: MonsterIntentType;
      readonly description: string;
    }
  | {
      readonly type: "MonsterIntentSet";
      readonly monsterId: CombatantId;
      readonly intentId: MonsterIntentId;
      readonly intentType: MonsterIntentType;
      readonly description: string;
    }
  | {
      readonly type: "EnemyDeckShuffled";
      readonly monsterId: CombatantId;
      readonly from: Extract<MonsterCardZone, "discard">;
      readonly to: Extract<MonsterCardZone, "draw">;
      readonly count: number;
    }
  | {
      readonly type: "EnemyCardMoved";
      readonly monsterId: CombatantId;
      readonly cardInstanceId: EnemyCardInstanceId;
      readonly abilityId: MonsterAbilityId;
      readonly from: MonsterCardZone;
      readonly to: MonsterCardZone;
    }
  | {
      readonly type: "EnemyPlanCreated";
      readonly monsterId: CombatantId;
      readonly abilityId: MonsterAbilityId;
      readonly intentId: MonsterIntentId;
      readonly cardInstanceId: EnemyCardInstanceId;
      readonly candidateCardInstanceIds: readonly EnemyCardInstanceId[];
      readonly planMode: EnemyPlanMode;
    }
  | {
      readonly type: "EnemyIntentVisibilityChanged";
      readonly monsterId: CombatantId;
      readonly level: IntentVisibilityLevel;
      readonly source: IntentVisibilitySource;
      readonly expires: IntentVisibilityExpiry;
      readonly previousLevel?: IntentVisibilityLevel;
      readonly mode?: IntentVisibilityOverrideMode;
      readonly scopeDepth?: ScopeIntentDepth;
      readonly scopedCandidateCardInstanceIds?: readonly EnemyCardInstanceId[];
      readonly scopedCandidateAbilityIds?: readonly MonsterAbilityId[];
    }
  | {
      readonly type: "EnemyPlanChanged";
      readonly monsterId: CombatantId;
      readonly fromAbilityId: MonsterAbilityId;
      readonly toAbilityId: MonsterAbilityId;
      readonly fromIntentId: MonsterIntentId;
      readonly toIntentId: MonsterIntentId;
      readonly reason: string;
    }
  | {
      readonly type: "EnemyPlanFinalized";
      readonly monsterId: CombatantId;
      readonly abilityId: MonsterAbilityId;
      readonly intentId: MonsterIntentId;
      readonly cardInstanceId?: EnemyCardInstanceId;
      readonly planMode?: EnemyPlanMode;
      readonly changed: boolean;
    }
  | {
      readonly type: "EnemyCardResolved";
      readonly monsterId: CombatantId;
      readonly cardInstanceId: EnemyCardInstanceId;
      readonly abilityId: MonsterAbilityId;
      readonly intentId: MonsterIntentId;
    }
  | {
      readonly type: "MonsterAbilityPlayed";
      readonly monsterId: CombatantId;
      readonly abilityId: MonsterAbilityId;
      readonly intentId: MonsterIntentId;
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
      readonly type: "CardCreated";
      readonly cardInstanceId: CardInstanceId;
      readonly cardId: CardId;
      readonly to: CardPile;
    }
  | { readonly type: "CardRetained"; readonly cardInstanceId: CardInstanceId; readonly cardId: CardId }
  | { readonly type: "EnergyGained"; readonly amount: number; readonly total: number }
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
      readonly type: "StatusApplicationBlocked";
      readonly targetId: CombatantId;
      readonly statusId: StatusId;
      readonly blockedByStatusId: StatusId;
    }
  | {
      readonly type: "StatusCleansed";
      readonly targetId: CombatantId;
      readonly statusId: StatusId;
      readonly stacksRemoved: number;
      readonly remainingStacks: number;
    }
  | {
      readonly type: "StatusConsumed";
      readonly targetId: CombatantId;
      readonly statusId: StatusId;
      readonly stacksConsumed: number;
      readonly remainingStacks: number;
    }
  | {
      readonly type: "StatusTicked";
      readonly targetId: CombatantId;
      readonly statusId: StatusId;
      readonly stacksBefore: number;
      readonly stacksAfter: number;
      readonly amount?: number;
    }
  | {
      readonly type: "StatusDurationChanged";
      readonly targetId: CombatantId;
      readonly statusId: StatusId;
      readonly durationBefore: number;
      readonly durationAfter: number;
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
  | {
      readonly type: "PlayerClassModifierActivated";
      readonly modifierId: PlayerClassModifierId;
      readonly reason: "cardPlayed" | "statusApplied";
    }
  | {
      readonly type: "TriggerQueueLimitReached";
      readonly maxDepth: number;
      readonly pendingEventCount: number;
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
  | { readonly type: "RunDeckCardUpgraded"; readonly cardId: CardId }
  | { readonly type: "RunDeckCardRemoved"; readonly cardId: CardId }
  | { readonly type: "RunDeckCardTransformed"; readonly fromCardId: CardId; readonly toCardId: CardId }
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
  | { readonly type: "SaveSnapshotMigrated"; readonly fromSchemaVersion: number; readonly toSchemaVersion: number }
  | { readonly type: "SaveSlotWritten"; readonly slotId: string; readonly updatedAt: string; readonly schemaVersion: number }
  | { readonly type: "SaveSlotLoaded"; readonly slotId: string; readonly updatedAt: string; readonly schemaVersion: number }
  | { readonly type: "SaveSlotDeleted"; readonly slotId: string }
  | { readonly type: "ValidationWarning"; readonly code: string; readonly message: string };

export const projectGameEventsForSchema = (
  events: readonly GameEvent[],
  schemaVersion: GameEventSchemaVersion
): readonly GameEvent[] => {
  if (schemaVersion >= GAME_EVENT_SCHEMA_VERSION) {
    return events;
  }

  const withoutV5Events = events
    .filter((event) =>
      event.type !== "EnemyDeckShuffled" &&
      event.type !== "EnemyCardMoved" &&
      event.type !== "EnemyPlanCreated" &&
      event.type !== "EnemyPlanChanged" &&
      event.type !== "EnemyPlanFinalized" &&
      event.type !== "EnemyCardResolved"
    )
    .map((event): GameEvent => {
      if (event.type !== "EnemyIntentVisibilityChanged") {
        return event;
      }

      return {
        type: "EnemyIntentVisibilityChanged",
        monsterId: event.monsterId,
        level: event.level,
        source: event.source,
        expires: event.expires
      };
    });

  if (schemaVersion >= GAME_EVENT_PREVIOUS_SCHEMA_VERSION) {
    return withoutV5Events;
  }

  const withoutV4Events = withoutV5Events.filter((event) =>
    event.type !== "StatusConsumed" &&
    event.type !== "EnemyIntentVisibilityChanged"
  );

  return withoutV4Events.filter((event) =>
    event.type !== "MonsterAbilityPlanned" &&
    event.type !== "MonsterAbilityPlayed"
  );
};
