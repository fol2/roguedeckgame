import { cardId, petDefinitionId, statusId } from "../../ids";
import { act1NormalBalance } from "../balance/act1-normal";
import type { CardDefinition } from "../../model/card";

export const foxBite: CardDefinition = {
  id: cardId("fox_bite"),
  name: "Fox Bite",
  description: `Command the leading pet to strike for ${act1NormalBalance.cards.foxBitePetAttack}, then apply ${act1NormalBalance.cards.foxBiteBurn} burn.`,
  type: "pet-command",
  cost: act1NormalBalance.cards.foxBiteCost,
  tags: ["pet", "fox", "attack", "burn", "command"],
  requiresPetDefinitionId: petDefinitionId("ember_fox"),
  rarity: "starter",
  effects: [
    {
      type: "petAttack",
      petTarget: { type: "leading" },
      amount: act1NormalBalance.cards.foxBitePetAttack,
      target: { type: "target" }
    },
    {
      type: "applyStatus",
      statusId: statusId("burn"),
      stacks: act1NormalBalance.cards.foxBiteBurn,
      target: { type: "target" }
    }
  ]
};

export const foxGuard: CardDefinition = {
  id: cardId("fox_guard"),
  name: "Fox Guard",
  description: `Gain ${act1NormalBalance.cards.foxGuardBlock} block and prompt the leading pet to guard.`,
  type: "pet-command",
  cost: act1NormalBalance.cards.foxGuardCost,
  tags: ["pet", "fox", "guard", "block", "command"],
  requiresPetDefinitionId: petDefinitionId("ember_fox"),
  rarity: "starter",
  effects: [
    {
      type: "block",
      amount: act1NormalBalance.cards.foxGuardBlock,
      target: { type: "self" }
    },
    {
      type: "petReact",
      petTarget: { type: "leading" },
      reaction: "guard"
    }
  ]
};

export const foxFetch: CardDefinition = {
  id: cardId("fox_fetch"),
  name: "Fox Fetch",
  description: `Draw ${act1NormalBalance.cards.foxFetchDraw} card and prompt the leading pet to fetch.`,
  type: "pet-command",
  cost: act1NormalBalance.cards.foxFetchCost,
  tags: ["pet", "fox", "draw", "fetch", "command"],
  requiresPetDefinitionId: petDefinitionId("ember_fox"),
  rarity: "starter",
  effects: [
    {
      type: "draw",
      amount: act1NormalBalance.cards.foxFetchDraw
    },
    {
      type: "petReact",
      petTarget: { type: "leading" },
      reaction: "fetch"
    }
  ]
};

export const emberFoxCards = [foxBite, foxGuard, foxFetch] as const;
