import type {
  CardId,
  CardInstanceId,
  CombatantId,
  PetInstanceId,
  StatusId,
  StoryFlagId,
  UpgradeId
} from "../ids";

export type CardPile = "draw" | "hand" | "discard" | "exhaust";

export type GameEvent =
  | { readonly type: "CombatStarted"; readonly combatId: string; readonly seed: string | number }
  | { readonly type: "TurnStarted"; readonly turnNumber: number; readonly actorId: CombatantId }
  | { readonly type: "TurnEnded"; readonly turnNumber: number; readonly actorId: CombatantId }
  | {
      readonly type: "CardPlayed";
      readonly cardInstanceId: CardInstanceId;
      readonly cardId: CardId;
      readonly sourceId: CombatantId;
    }
  | { readonly type: "EnergySpent"; readonly amount: number; readonly remaining: number }
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
      readonly type: "PetCommanded";
      readonly petInstanceId: PetInstanceId;
      readonly cardInstanceId: CardInstanceId;
      readonly cardId: CardId;
    }
  | { readonly type: "PetReacted"; readonly petInstanceId: PetInstanceId; readonly reaction: string }
  | { readonly type: "DeckShuffled"; readonly from: CardPile | "deck"; readonly to: CardPile; readonly count: number }
  | { readonly type: "ActionRejected"; readonly code: string; readonly message: string; readonly path?: string }
  | { readonly type: "CombatantDefeated"; readonly combatantId: CombatantId }
  | { readonly type: "RewardOffered"; readonly upgradeIds: readonly UpgradeId[] }
  | { readonly type: "StoryFlagSet"; readonly flagId: StoryFlagId }
  | { readonly type: "ValidationWarning"; readonly code: string; readonly message: string };
