import type {
  CardId,
  CardInstanceId,
  CombatantId,
  MonsterIntentId,
  PetModifierId,
  PetInstanceId,
  RewardOfferId,
  RewardOptionId,
  StatusId,
  StoryFlagId,
  UpgradeId
} from "../ids";
import type { MonsterIntentType } from "./monster";
import type { RewardOption } from "./reward";

export type CardPile = "draw" | "hand" | "discard" | "exhaust";

export type GameEvent =
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
  | { readonly type: "ValidationWarning"; readonly code: string; readonly message: string };
