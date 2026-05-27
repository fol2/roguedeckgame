import type { CardDefinition, CardType } from "../model/card";
import type {
  CardSelector,
  ModifyPetCommandCostRule,
  ModifyPetCommandEffectAmountRule
} from "../model/pet";

export const knownPetModifierSelectorCardTypes = [
  "attack",
  "skill",
  "power",
  "pet-command"
] as const satisfies readonly CardType[];

export const matchesCardSelector = (
  card: CardDefinition,
  selector: CardSelector
): boolean => {
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

export const matchesPetModifierCardSelector = (
  card: CardDefinition,
  rule: ModifyPetCommandCostRule | ModifyPetCommandEffectAmountRule
): boolean => matchesCardSelector(card, rule.selector);
