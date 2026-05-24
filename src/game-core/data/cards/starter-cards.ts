import { cardId } from "../../ids";
import type { CardDefinition } from "../../model/card";

export const strike: CardDefinition = {
  id: cardId("strike"),
  name: "Strike",
  description: "Deal 6 damage.",
  type: "attack",
  cost: 1,
  tags: ["attack"],
  rarity: "starter",
  effects: [
    {
      type: "damage",
      amount: 6,
      target: { type: "target" }
    }
  ]
};

export const defend: CardDefinition = {
  id: cardId("defend"),
  name: "Defend",
  description: "Gain 5 block.",
  type: "skill",
  cost: 1,
  tags: ["block"],
  rarity: "starter",
  effects: [
    {
      type: "block",
      amount: 5,
      target: { type: "self" }
    }
  ]
};

export const focus: CardDefinition = {
  id: cardId("focus"),
  name: "Focus",
  description: "Draw 1 card.",
  type: "skill",
  cost: 0,
  tags: ["draw"],
  rarity: "starter",
  effects: [
    {
      type: "draw",
      amount: 1
    }
  ]
};

export const starterCards = [strike, defend, focus] as const;
