import { cardId, petDefinitionId, statusId } from "../../ids";
import { act1NormalBalance } from "../balance/act1-normal";
import type { CardDefinition } from "../../model/card";
import {
  applyStatusEffect,
  blockEffect,
  drawEffect,
  petAttackEffect,
  petCommandCard,
  petReactEffect
} from "../builders";

export const foxBite: CardDefinition = petCommandCard({
  id: cardId("fox_bite"),
  name: "Fox Bite",
  description: `Command the leading pet to strike for ${act1NormalBalance.cards.foxBitePetAttack}, then apply ${act1NormalBalance.cards.foxBiteBurn} burn.`,
  cost: act1NormalBalance.cards.foxBiteCost,
  tags: ["pet", "fox", "attack", "burn", "command"],
  requiresPetDefinitionId: petDefinitionId("ember_fox"),
  rarity: "starter",
  effects: [
    petAttackEffect({ type: "leading" }, act1NormalBalance.cards.foxBitePetAttack, { type: "target" }),
    applyStatusEffect(statusId("burn"), act1NormalBalance.cards.foxBiteBurn, { type: "target" })
  ]
});

export const foxGuard: CardDefinition = petCommandCard({
  id: cardId("fox_guard"),
  name: "Fox Guard",
  description: `Gain ${act1NormalBalance.cards.foxGuardBlock} block and prompt the leading pet to guard.`,
  cost: act1NormalBalance.cards.foxGuardCost,
  tags: ["pet", "fox", "guard", "block", "command"],
  requiresPetDefinitionId: petDefinitionId("ember_fox"),
  rarity: "starter",
  effects: [
    blockEffect(act1NormalBalance.cards.foxGuardBlock, { type: "self" }),
    petReactEffect({ type: "leading" }, "guard")
  ]
});

export const foxFetch: CardDefinition = petCommandCard({
  id: cardId("fox_fetch"),
  name: "Fox Fetch",
  description: `Draw ${act1NormalBalance.cards.foxFetchDraw} card and prompt the leading pet to fetch.`,
  cost: act1NormalBalance.cards.foxFetchCost,
  tags: ["pet", "fox", "draw", "fetch", "command"],
  requiresPetDefinitionId: petDefinitionId("ember_fox"),
  rarity: "starter",
  effects: [
    drawEffect(act1NormalBalance.cards.foxFetchDraw),
    petReactEffect({ type: "leading" }, "fetch")
  ]
});

export const emberFoxCards = [foxBite, foxGuard, foxFetch] as const;
