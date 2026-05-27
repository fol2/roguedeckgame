import type { CardId, PetDefinitionId, RewardPoolId } from "../ids";
import type { EffectDefinition } from "./effect";

export type CardType = "attack" | "skill" | "power" | "pet-command" | "pet-support" | "other";
export type CardRarity = "starter" | "common" | "uncommon" | "rare" | "special" | "unique";

export type CardSource =
  | "universalPlayer"
  | "classBound"
  | "petBound"
  | "petSupport"
  | "encounterReward"
  | "eventOnly"
  | "enemyCommon"
  | "enemySignature"
  | "eliteOnly"
  | "bossOnly"
  | "temporary"
  | "legacy";

export type RewardDropSource = {
  readonly kind: "normalPool" | "elitePool" | "bossPool" | "cardBearer" | "petBearer" | "event";
  readonly sourceId?: string;
};

export type CardDuplicatePolicy = {
  readonly maxCopiesInRunDeck?: number;
  readonly duplicateAllowed?: boolean;
};

export type CardDefinition = {
  readonly id: CardId;
  readonly name: string;
  readonly description: string;
  readonly type: CardType;
  readonly cost: number;
  readonly tags: readonly string[];
  readonly effects: readonly EffectDefinition[];
  readonly requiresPetDefinitionId?: PetDefinitionId;
  readonly rarity?: CardRarity;
  readonly source?: CardSource;
  readonly rewardPools?: readonly RewardPoolId[];
  readonly dropSources?: readonly RewardDropSource[];
  readonly duplicatePolicy?: CardDuplicatePolicy;
};
