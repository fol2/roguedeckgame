import { cardId, petDefinitionId, statusId } from "../../ids";
import { act1NormalBalance } from "../balance/act1-normal";
import type { CardDefinition } from "../../model/card";
import {
  applyStatusEffect,
  attackCard,
  blockEffect,
  damageEffect,
  drawEffect,
  petAttackEffect,
  petCommandCard,
  petReactEffect,
  skillCard
} from "../builders";

export const emberSpark: CardDefinition = attackCard({
  id: cardId("ember_spark"),
  name: "Ember Spark",
  description: `Deal ${act1NormalBalance.cards.emberSparkDamage} damage and apply ${act1NormalBalance.cards.emberSparkBurn} burn.`,
  cost: act1NormalBalance.cards.emberSparkCost,
  rarity: "common",
  tags: ["attack", "burn", "fire"],
  effects: [
    damageEffect(act1NormalBalance.cards.emberSparkDamage, { type: "target" }),
    applyStatusEffect(statusId("burn"), act1NormalBalance.cards.emberSparkBurn, { type: "target" })
  ]
});

export const quickGuard: CardDefinition = skillCard({
  id: cardId("quick_guard"),
  name: "Quick Guard",
  description: `Gain ${act1NormalBalance.cards.quickGuardBlock} block.`,
  cost: act1NormalBalance.cards.quickGuardCost,
  rarity: "common",
  tags: ["block", "guard"],
  effects: [blockEffect(act1NormalBalance.cards.quickGuardBlock, { type: "self" })]
});

export const studyCommand: CardDefinition = skillCard({
  id: cardId("study_command"),
  name: "Study Command",
  description: `Draw ${act1NormalBalance.cards.studyCommandDraw} card.`,
  cost: act1NormalBalance.cards.studyCommandCost,
  rarity: "common",
  tags: ["draw", "command"],
  effects: [drawEffect(act1NormalBalance.cards.studyCommandDraw)]
});

export const kindle: CardDefinition = skillCard({
  id: cardId("kindle"),
  name: "Kindle",
  description: `Apply ${act1NormalBalance.cards.kindleBurn} burn to all enemies.`,
  cost: act1NormalBalance.cards.kindleCost,
  rarity: "uncommon",
  tags: ["burn", "fire", "setup"],
  effects: [applyStatusEffect(statusId("burn"), act1NormalBalance.cards.kindleBurn, { type: "allEnemies" })]
});

export const coordinatedStrike: CardDefinition = attackCard({
  id: cardId("coordinated_strike"),
  name: "Coordinated Strike",
  description: `Deal ${act1NormalBalance.cards.coordinatedStrikeDamage} damage and prompt the leading pet to follow up.`,
  cost: act1NormalBalance.cards.coordinatedStrikeCost,
  rarity: "uncommon",
  tags: ["attack", "pet", "command", "combo"],
  effects: [
    damageEffect(act1NormalBalance.cards.coordinatedStrikeDamage, { type: "target" }),
    petReactEffect({ type: "leading" }, "strike_followup")
  ]
});

export const foxFlare: CardDefinition = petCommandCard({
  id: cardId("fox_flare"),
  name: "Fox Flare",
  description: `Command the leading pet to strike for ${act1NormalBalance.cards.foxFlarePetAttack}, then apply ${act1NormalBalance.cards.foxFlareBurn} burn.`,
  cost: act1NormalBalance.cards.foxFlareCost,
  rarity: "uncommon",
  requiresPetDefinitionId: petDefinitionId("ember_fox"),
  tags: ["pet", "fox", "burn", "command"],
  effects: [
    petAttackEffect({ type: "leading" }, act1NormalBalance.cards.foxFlarePetAttack, { type: "target" }),
    applyStatusEffect(statusId("burn"), act1NormalBalance.cards.foxFlareBurn, { type: "target" })
  ]
});

export const rewardCards = [
  emberSpark,
  quickGuard,
  studyCommand,
  kindle,
  coordinatedStrike,
  foxFlare
] as const;
