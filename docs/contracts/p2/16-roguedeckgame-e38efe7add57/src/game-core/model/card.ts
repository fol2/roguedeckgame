import type { CardId, PetDefinitionId } from "../ids";
import type { EffectDefinition } from "./effect";

export type CardType = "attack" | "skill" | "power" | "pet-command";
export type CardRarity = "starter" | "common" | "uncommon" | "rare" | "special";

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
};
