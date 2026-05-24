import type { CardId, UpgradeId } from "../ids";

export type RewardDefinition =
  | { readonly type: "petUpgrade"; readonly upgradeId: UpgradeId }
  | { readonly type: "card"; readonly cardId: CardId };
