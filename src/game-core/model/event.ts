import type {
  CardId,
  CombatantId,
  PetInstanceId,
  StatusId,
  StoryFlagId,
  UpgradeId
} from "../ids";

export type CardPile = "draw" | "hand" | "discard" | "exhaust";

export type GameEvent =
  | { readonly type: "CardPlayed"; readonly cardId: CardId; readonly sourceId: CombatantId }
  | { readonly type: "EnergySpent"; readonly amount: number; readonly remaining: number }
  | { readonly type: "CardDrawn"; readonly cardId: CardId }
  | { readonly type: "CardMoved"; readonly cardId: CardId; readonly from: CardPile; readonly to: CardPile }
  | { readonly type: "DamageDealt"; readonly sourceId: CombatantId; readonly targetId: CombatantId; readonly amount: number }
  | { readonly type: "BlockGained"; readonly targetId: CombatantId; readonly amount: number }
  | { readonly type: "StatusApplied"; readonly targetId: CombatantId; readonly statusId: StatusId; readonly stacks: number }
  | { readonly type: "PetCommanded"; readonly petInstanceId: PetInstanceId; readonly cardId: CardId }
  | { readonly type: "PetReacted"; readonly petInstanceId: PetInstanceId; readonly reaction: string }
  | { readonly type: "RewardOffered"; readonly upgradeIds: readonly UpgradeId[] }
  | { readonly type: "StoryFlagSet"; readonly flagId: StoryFlagId }
  | { readonly type: "ValidationWarning"; readonly code: string; readonly message: string };
