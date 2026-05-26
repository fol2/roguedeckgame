import { cardId } from "../../ids";
import { act1NormalBalance } from "../balance/act1-normal";
import type { CardDefinition } from "../../model/card";

export const strike: CardDefinition = {
  id: cardId("strike"),
  name: "Strike",
  description: `Deal ${act1NormalBalance.cards.strikeDamage} damage.`,
  type: "attack",
  cost: act1NormalBalance.cards.strikeCost,
  tags: ["attack"],
  rarity: "starter",
  effects: [
    {
      type: "damage",
      amount: act1NormalBalance.cards.strikeDamage,
      target: { type: "target" }
    }
  ]
};

export const defend: CardDefinition = {
  id: cardId("defend"),
  name: "Defend",
  description: `Gain ${act1NormalBalance.cards.defendBlock} block.`,
  type: "skill",
  cost: act1NormalBalance.cards.defendCost,
  tags: ["block"],
  rarity: "starter",
  effects: [
    {
      type: "block",
      amount: act1NormalBalance.cards.defendBlock,
      target: { type: "self" }
    }
  ]
};

export const focus: CardDefinition = {
  id: cardId("focus"),
  name: "Focus",
  description: `Draw ${act1NormalBalance.cards.focusDraw} card.`,
  type: "skill",
  cost: act1NormalBalance.cards.focusCost,
  tags: ["draw"],
  rarity: "starter",
  effects: [
    {
      type: "draw",
      amount: act1NormalBalance.cards.focusDraw
    }
  ]
};

export const starterCards = [strike, defend, focus] as const;
