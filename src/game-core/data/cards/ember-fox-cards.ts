import { cardId, petDefinitionId, statusId } from "../../ids";
import { act1NormalBalance } from "../balance/act1-normal";
import type { CardDefinition } from "../../model/card";
import {
  applyStatusEffect,
  blockEffect,
  drawEffect,
  petAttackEffect,
  petBlockEffect,
  petCommandCard,
  petReactEffect
} from "../builders";

const emberFoxId = petDefinitionId("ember_fox");

export const foxBite: CardDefinition = petCommandCard({
  id: cardId("fox_bite"),
  name: "Fox Bite",
  description: `Command Ember Fox: pet attacks for ${act1NormalBalance.cards.foxBitePetAttack}, then apply ${act1NormalBalance.cards.foxBiteBurn} Burn.`,
  cost: act1NormalBalance.cards.foxBiteCost,
  tags: ["pet", "fox", "command", "attack", "burn"],
  requiresPetDefinitionId: emberFoxId,
  rarity: "starter",
  source: "petBound",
  duplicatePolicy: { maxCopiesInRunDeck: 2 },
  effects: [
    petAttackEffect({ type: "leading" }, act1NormalBalance.cards.foxBitePetAttack, { type: "target" }),
    applyStatusEffect(statusId("burn"), act1NormalBalance.cards.foxBiteBurn, { type: "target" })
  ]
});

export const tailguard: CardDefinition = petCommandCard({
  id: cardId("tailguard"),
  name: "Tailguard",
  description: `Command Ember Fox: gain ${act1NormalBalance.cards.tailguardBlock} Block; Ember Fox guards the Keeper.`,
  cost: act1NormalBalance.cards.tailguardCost,
  tags: ["pet", "fox", "command", "guard", "block"],
  requiresPetDefinitionId: emberFoxId,
  rarity: "starter",
  source: "petBound",
  duplicatePolicy: { maxCopiesInRunDeck: 2 },
  effects: [
    petBlockEffect({ type: "leading" }, act1NormalBalance.cards.tailguardBlock, { type: "self" }),
    petReactEffect({ type: "leading" }, "guard")
  ]
});

export const kindleMark: CardDefinition = petCommandCard({
  id: cardId("kindle_mark"),
  name: "Kindle Mark",
  description: `Command Ember Fox: apply ${act1NormalBalance.cards.kindleMarkBurn} Burn.`,
  cost: act1NormalBalance.cards.kindleMarkCost,
  tags: ["pet", "fox", "command", "burn", "setup", "mark"],
  requiresPetDefinitionId: emberFoxId,
  rarity: "starter",
  source: "petBound",
  duplicatePolicy: { maxCopiesInRunDeck: 2 },
  effects: [applyStatusEffect(statusId("burn"), act1NormalBalance.cards.kindleMarkBurn, { type: "target" })]
});

export const fetchSignal: CardDefinition = petCommandCard({
  id: cardId("fetch_signal"),
  name: "Fetch Signal",
  description: `Command Ember Fox: draw ${act1NormalBalance.cards.fetchSignalDraw}.`,
  cost: act1NormalBalance.cards.fetchSignalCost,
  tags: ["pet", "fox", "command", "fetch", "draw"],
  requiresPetDefinitionId: emberFoxId,
  rarity: "starter",
  source: "petBound",
  duplicatePolicy: { maxCopiesInRunDeck: 2 },
  effects: [
    drawEffect(act1NormalBalance.cards.fetchSignalDraw),
    petReactEffect({ type: "leading" }, "fetch")
  ]
});

// Legacy aliases kept registered for existing fixture ids and old smoke traces.
export const foxGuard: CardDefinition = petCommandCard({
  id: cardId("fox_guard"),
  name: "Fox Guard",
  description: `Legacy command: gain ${act1NormalBalance.cards.foxGuardBlock} Block and prompt Ember Fox to guard.`,
  cost: act1NormalBalance.cards.foxGuardCost,
  tags: ["pet", "fox", "guard", "block", "command", "legacy"],
  requiresPetDefinitionId: emberFoxId,
  rarity: "starter",
  source: "legacy",
  effects: [
    blockEffect(act1NormalBalance.cards.foxGuardBlock, { type: "self" }),
    petReactEffect({ type: "leading" }, "guard")
  ]
});

export const foxFetch: CardDefinition = petCommandCard({
  id: cardId("fox_fetch"),
  name: "Fox Fetch",
  description: `Legacy command: draw ${act1NormalBalance.cards.foxFetchDraw} and prompt Ember Fox to fetch.`,
  cost: act1NormalBalance.cards.foxFetchCost,
  tags: ["pet", "fox", "draw", "fetch", "command", "legacy"],
  requiresPetDefinitionId: emberFoxId,
  rarity: "starter",
  source: "legacy",
  effects: [
    drawEffect(act1NormalBalance.cards.foxFetchDraw),
    petReactEffect({ type: "leading" }, "fetch")
  ]
});

export const emberFoxCards = [foxBite, tailguard, kindleMark, fetchSignal, foxGuard, foxFetch] as const;
