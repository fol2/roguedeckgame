import type { CardId, PetDefinitionId } from "../../ids";
import type { CardDefinition, CardRarity } from "../../model/card";
import type { EffectDefinition } from "../../model/effect";

type CardBuilderInput = {
  readonly id: CardId;
  readonly name: string;
  readonly description: string;
  readonly cost: number;
  readonly tags: readonly string[];
  readonly rarity?: CardRarity;
  readonly effects: readonly EffectDefinition[];
  readonly requiresPetDefinitionId?: PetDefinitionId;
};

export const attackCard = (input: CardBuilderInput): CardDefinition => ({
  ...input,
  type: "attack"
});

export const skillCard = (input: CardBuilderInput): CardDefinition => ({
  ...input,
  type: "skill"
});

export const petCommandCard = (
  input: CardBuilderInput & { readonly requiresPetDefinitionId: PetDefinitionId }
): CardDefinition => ({
  ...input,
  type: "pet-command"
});
