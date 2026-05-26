import { cardId } from "../../ids";
import { act1NormalBalance } from "../balance/act1-normal";
import type { CardDefinition } from "../../model/card";
import { attackCard, blockEffect, damageEffect, drawEffect, skillCard } from "../builders";

export const strike: CardDefinition = attackCard({
  id: cardId("strike"),
  name: "Strike",
  description: `Deal ${act1NormalBalance.cards.strikeDamage} damage.`,
  cost: act1NormalBalance.cards.strikeCost,
  tags: ["attack"],
  rarity: "starter",
  effects: [
    damageEffect(act1NormalBalance.cards.strikeDamage, { type: "target" })
  ]
});

export const defend: CardDefinition = skillCard({
  id: cardId("defend"),
  name: "Defend",
  description: `Gain ${act1NormalBalance.cards.defendBlock} block.`,
  cost: act1NormalBalance.cards.defendCost,
  tags: ["block"],
  rarity: "starter",
  effects: [
    blockEffect(act1NormalBalance.cards.defendBlock, { type: "self" })
  ]
});

export const focus: CardDefinition = skillCard({
  id: cardId("focus"),
  name: "Focus",
  description: `Draw ${act1NormalBalance.cards.focusDraw} card.`,
  cost: act1NormalBalance.cards.focusCost,
  tags: ["draw"],
  rarity: "starter",
  effects: [
    drawEffect(act1NormalBalance.cards.focusDraw)
  ]
});

export const starterCards = [strike, defend, focus] as const;
