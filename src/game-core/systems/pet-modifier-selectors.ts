import type { CardDefinition, CardType } from "../model/card";
import type {
  ModifyPetCommandCostRule,
  ModifyPetCommandEffectAmountRule
} from "../model/pet";

export const knownPetModifierSelectorCardTypes = [
  "attack",
  "skill",
  "power",
  "pet-command"
] as const satisfies readonly CardType[];

export const matchesPetModifierCardSelector = (
  card: CardDefinition,
  rule: ModifyPetCommandCostRule | ModifyPetCommandEffectAmountRule
): boolean => {
  const selector = rule.selector;

  if (selector.cardType !== undefined && card.type !== selector.cardType) {
    return false;
  }

  if (
    selector.requiresPetDefinitionId !== undefined &&
    card.requiresPetDefinitionId !== selector.requiresPetDefinitionId
  ) {
    return false;
  }

  if (selector.tagsAny && !selector.tagsAny.some((tag) => card.tags.includes(tag))) {
    return false;
  }

  if (selector.tagsAll && !selector.tagsAll.every((tag) => card.tags.includes(tag))) {
    return false;
  }

  return true;
};
