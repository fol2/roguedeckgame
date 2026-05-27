import type { GameEvent } from "../../game-core";

export type CombatPlaybackPolicyKind = "animated" | "logOnly" | "stateSyncOnly";

export type CombatPlaybackVisualRoute = "fx" | "cardMovement" | "log" | "none";

export type CombatPlaybackPolicy = {
  readonly policy: CombatPlaybackPolicyKind;
  readonly visualRoute: CombatPlaybackVisualRoute;
};

export type CombatPlaybackOutcome =
  | "completed"
  | "recovered"
  | "skippedUnknown"
  | "timeout";

export type CombatPlaybackObservation = {
  readonly eventType: string;
  readonly policy: CombatPlaybackPolicyKind | "unknown";
  readonly visualRoute: CombatPlaybackVisualRoute;
  readonly startedAt: number;
  readonly endedAt?: number;
  readonly durationMs?: number;
  readonly outcome: CombatPlaybackOutcome;
  readonly fallbackUsed: boolean;
  readonly warningCode?: string;
  readonly errorSummary?: string;
};

export const combatPlaybackPolicies = {
  ActionRejected: { policy: "animated", visualRoute: "fx" },
  BlockGained: { policy: "animated", visualRoute: "fx" },
  CardCostModified: { policy: "logOnly", visualRoute: "log" },
  CardCreated: { policy: "logOnly", visualRoute: "log" },
  CardDrawn: { policy: "stateSyncOnly", visualRoute: "log" },
  CardMoved: { policy: "stateSyncOnly", visualRoute: "cardMovement" },
  CardPlayed: { policy: "animated", visualRoute: "fx" },
  CardRetained: { policy: "logOnly", visualRoute: "log" },
  CardRewardAdded: { policy: "logOnly", visualRoute: "log" },
  CombatEnded: { policy: "animated", visualRoute: "fx" },
  CombatStarted: { policy: "logOnly", visualRoute: "log" },
  CombatantDefeated: { policy: "animated", visualRoute: "fx" },
  DamageDealt: { policy: "animated", visualRoute: "fx" },
  DeckShuffled: { policy: "animated", visualRoute: "fx" },
  EnergyGained: { policy: "logOnly", visualRoute: "log" },
  EnergySpent: { policy: "animated", visualRoute: "fx" },
  MonsterAbilityPlanned: { policy: "animated", visualRoute: "fx" },
  MonsterAbilityPlayed: { policy: "animated", visualRoute: "fx" },
  MonsterIntentResolved: { policy: "animated", visualRoute: "fx" },
  MonsterIntentSet: { policy: "animated", visualRoute: "fx" },
  PetBondXpAdded: { policy: "logOnly", visualRoute: "log" },
  PetCommanded: { policy: "animated", visualRoute: "fx" },
  PetEvolutionNodeUnlocked: { policy: "logOnly", visualRoute: "log" },
  PetMemoryUnlocked: { policy: "logOnly", visualRoute: "log" },
  PetModifierActivated: { policy: "animated", visualRoute: "fx" },
  PetModifierConsumed: { policy: "logOnly", visualRoute: "log" },
  PetReacted: { policy: "animated", visualRoute: "fx" },
  PetStoryEventCompleted: { policy: "logOnly", visualRoute: "log" },
  PetStoryFlagSet: { policy: "logOnly", visualRoute: "log" },
  PetUpgradeUnlocked: { policy: "logOnly", visualRoute: "log" },
  PlayerClassModifierActivated: { policy: "animated", visualRoute: "fx" },
  RewardOffered: { policy: "logOnly", visualRoute: "log" },
  RewardSelected: { policy: "logOnly", visualRoute: "log" },
  RewardSkipped: { policy: "logOnly", visualRoute: "log" },
  RunAdvanced: { policy: "logOnly", visualRoute: "log" },
  RunCombatCompleted: { policy: "logOnly", visualRoute: "log" },
  RunCombatStarted: { policy: "logOnly", visualRoute: "log" },
  RunCreated: { policy: "logOnly", visualRoute: "log" },
  RunDeckCardRemoved: { policy: "logOnly", visualRoute: "log" },
  RunDeckCardTransformed: { policy: "logOnly", visualRoute: "log" },
  RunDeckCardUpgraded: { policy: "logOnly", visualRoute: "log" },
  RunEnded: { policy: "logOnly", visualRoute: "log" },
  RunMapGenerated: { policy: "logOnly", visualRoute: "log" },
  RunNodeAvailable: { policy: "logOnly", visualRoute: "log" },
  RunNodeCompleted: { policy: "logOnly", visualRoute: "log" },
  RunNodeSelected: { policy: "logOnly", visualRoute: "log" },
  RunPlayerHealed: { policy: "logOnly", visualRoute: "log" },
  RunRewardPending: { policy: "logOnly", visualRoute: "log" },
  SaveSlotDeleted: { policy: "logOnly", visualRoute: "log" },
  SaveSlotLoaded: { policy: "logOnly", visualRoute: "log" },
  SaveSlotWritten: { policy: "logOnly", visualRoute: "log" },
  SaveSnapshotCreated: { policy: "logOnly", visualRoute: "log" },
  SaveSnapshotMigrated: { policy: "logOnly", visualRoute: "log" },
  StatusApplied: { policy: "animated", visualRoute: "fx" },
  StatusApplicationBlocked: { policy: "animated", visualRoute: "fx" },
  StatusCleansed: { policy: "animated", visualRoute: "fx" },
  StatusConsumed: { policy: "animated", visualRoute: "fx" },
  StatusDurationChanged: { policy: "animated", visualRoute: "fx" },
  StatusExpired: { policy: "animated", visualRoute: "fx" },
  StatusTicked: { policy: "animated", visualRoute: "fx" },
  StoryEventSeen: { policy: "logOnly", visualRoute: "log" },
  StoryFlagSet: { policy: "logOnly", visualRoute: "log" },
  TriggerQueueLimitReached: { policy: "animated", visualRoute: "fx" },
  TurnEnded: { policy: "logOnly", visualRoute: "log" },
  TurnStarted: { policy: "logOnly", visualRoute: "log" },
  ValidationWarning: { policy: "logOnly", visualRoute: "log" }
} satisfies Record<GameEvent["type"], CombatPlaybackPolicy>;

export const getCombatPlaybackPolicy = (
  eventType: string
): CombatPlaybackPolicy | undefined =>
  combatPlaybackPolicies[eventType as GameEvent["type"]];
