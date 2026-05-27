import type { CardId, EncounterId, MonsterGroupId, MonsterId, PetDefinitionId, RewardPoolId, UpgradeId } from "../ids";
import type { CardRarity } from "./card";

export type EncounterType = "combat" | "elite" | "boss";

export type EncounterDifficultyBand = "tutorial" | "easy" | "normal" | "hard" | "elite" | "boss" | "rare";

export type EncounterMonsterGroupDefinition = {
  readonly id: MonsterGroupId;
  readonly monsterIds: readonly MonsterId[];
  readonly roles: readonly string[];
  readonly minCount?: number;
  readonly maxCount?: number;
};

export type EncounterAuthoringMetadata = {
  readonly actId?: string;
  readonly difficultyBand: EncounterDifficultyBand;
  readonly budget: number;
  readonly minPlayerLevel?: number;
  readonly monsterRoles: readonly string[];
  readonly monsterGroups: readonly EncounterMonsterGroupDefinition[];
  readonly rewardPoolId: RewardPoolId;
};

export type HeldRewardDefinition =
  | { readonly type: "playerCard"; readonly cardId: CardId; readonly rarity: CardRarity }
  | { readonly type: "petDefinition"; readonly petDefinitionId: PetDefinitionId }
  | { readonly type: "petCommandCard"; readonly cardId: CardId; readonly petDefinitionId: PetDefinitionId }
  | { readonly type: "petUpgrade"; readonly upgradeId: UpgradeId };

export type RewardDropRule = {
  readonly chancePercent: number;
  readonly pityKey?: string;
  readonly guaranteedFirstTime?: boolean;
  readonly fallbackRewardPoolId?: RewardPoolId;
};

export type EncounterRewardBearer = {
  readonly bearerKind: "cardBearer" | "petBearer" | "upgradeBearer";
  readonly heldReward: HeldRewardDefinition;
  readonly revealState: "knownBeforeCombat" | "rumored" | "hiddenUntilWin";
  readonly dropRule: RewardDropRule;
};

export type EncounterDefinition = {
  readonly id: EncounterId;
  readonly type: EncounterType;
  readonly name: string;
  readonly monsterIds: readonly MonsterId[];
  readonly tags: readonly string[];
  readonly rewardSeedSalt?: string;
  readonly authoring?: EncounterAuthoringMetadata;
  readonly rewardBearer?: EncounterRewardBearer;
};
