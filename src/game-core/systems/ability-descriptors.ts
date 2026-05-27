import type { CardDefinition } from "../model/card";
import type { MonsterAbilityDefinition } from "../model/monster";
import type { EffectDefinition } from "../model/effect";
import {
  getEffectSummaries,
  getEffectTargetProfile,
  type AbilityTargetProfile,
  type EffectSummary
} from "./effect-descriptors";

export type AbilityDescriptorSource = "card" | "monsterAbility";

export type AbilityDescriptor = {
  readonly source: AbilityDescriptorSource;
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly displayRole: string;
  readonly tags: readonly string[];
  readonly targetProfile: AbilityTargetProfile;
  readonly effectSummaries: readonly EffectSummary[];
  readonly effects: readonly EffectDefinition[];
};

export const getCardAbilityDescriptor = (card: CardDefinition): AbilityDescriptor => ({
  source: "card",
  id: card.id,
  name: card.name,
  description: card.description,
  displayRole: card.type,
  tags: card.tags,
  targetProfile: getEffectTargetProfile(card.effects, {
    petCommand: card.type === "pet-command",
    targetBinding: "manual"
  }),
  effectSummaries: getEffectSummaries(card.effects),
  effects: card.effects
});

export const getMonsterAbilityDescriptor = (ability: MonsterAbilityDefinition): AbilityDescriptor => ({
  source: "monsterAbility",
  id: ability.id,
  name: ability.name,
  description: ability.description,
  displayRole: ability.intentType,
  tags: ability.tags,
  targetProfile: getEffectTargetProfile(ability.effects, {
    targetBinding: "default"
  }),
  effectSummaries: getEffectSummaries(ability.effects),
  effects: ability.effects
});
