import { cardId } from "../../ids";
import { act1NormalBalance } from "../balance/act1-normal";
import type { CardDefinition } from "../../model/card";
import { attackCard, blockEffect, damageEffect, drawEffect, improveIntentVisibilityEffect, skillCard } from "../builders";

export const keepersTap: CardDefinition = attackCard({
  id: cardId("keepers_tap"),
  name: "Keeper's Tap",
  description: `Deal ${act1NormalBalance.cards.keepersTapDamage} damage.`,
  cost: act1NormalBalance.cards.keepersTapCost,
  tags: ["keeper", "attack", "signal"],
  rarity: "starter",
  source: "classBound",
  duplicatePolicy: { maxCopiesInRunDeck: 3 },
  effects: [damageEffect(act1NormalBalance.cards.keepersTapDamage, { type: "target" })]
});

export const fieldBrace: CardDefinition = skillCard({
  id: cardId("field_brace"),
  name: "Field Brace",
  description: `Gain ${act1NormalBalance.cards.fieldBraceBlock} Block.`,
  cost: act1NormalBalance.cards.fieldBraceCost,
  tags: ["keeper", "block", "guard"],
  rarity: "starter",
  source: "classBound",
  duplicatePolicy: { maxCopiesInRunDeck: 3 },
  effects: [blockEffect(act1NormalBalance.cards.fieldBraceBlock, { type: "self" })]
});

export const readTheAsh: CardDefinition = skillCard({
  id: cardId("read_the_ash"),
  name: "Read the Ash",
  description: `Draw ${act1NormalBalance.cards.readTheAshDraw}. Improve target enemy Intent visibility by ${act1NormalBalance.cards.readTheAshVisibilitySteps} level for the current plan.`,
  cost: act1NormalBalance.cards.readTheAshCost,
  tags: ["keeper", "signal", "scout", "draw", "reveal"],
  rarity: "starter",
  source: "classBound",
  duplicatePolicy: { maxCopiesInRunDeck: 2 },
  effects: [
    drawEffect(act1NormalBalance.cards.readTheAshDraw),
    improveIntentVisibilityEffect(
      { type: "target" },
      act1NormalBalance.cards.readTheAshVisibilitySteps,
      { maxLevel: "rough", source: "card", expires: "currentPlan" }
    )
  ]
});

// Legacy Phase-1 fixture cards remain registered so old traces and low-level tests
// still have stable card ids. They are no longer used by the Ashbound Keeper starter deck.
export const strike: CardDefinition = attackCard({
  id: cardId("strike"),
  name: "Strike",
  description: `Deal ${act1NormalBalance.cards.strikeDamage} damage.`,
  cost: act1NormalBalance.cards.strikeCost,
  tags: ["attack", "legacy"],
  rarity: "starter",
  source: "legacy",
  effects: [damageEffect(act1NormalBalance.cards.strikeDamage, { type: "target" })]
});

export const defend: CardDefinition = skillCard({
  id: cardId("defend"),
  name: "Defend",
  description: `Gain ${act1NormalBalance.cards.defendBlock} block.`,
  cost: act1NormalBalance.cards.defendCost,
  tags: ["block", "legacy"],
  rarity: "starter",
  source: "legacy",
  effects: [blockEffect(act1NormalBalance.cards.defendBlock, { type: "self" })]
});

export const focus: CardDefinition = skillCard({
  id: cardId("focus"),
  name: "Focus",
  description: `Draw ${act1NormalBalance.cards.focusDraw} card.`,
  cost: act1NormalBalance.cards.focusCost,
  tags: ["draw", "legacy"],
  rarity: "starter",
  source: "legacy",
  effects: [drawEffect(act1NormalBalance.cards.focusDraw)]
});

export const starterCards = [keepersTap, fieldBrace, readTheAsh, strike, defend, focus] as const;
