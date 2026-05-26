import { cardId, petDefinitionId, statusId } from "../../ids";
import { act1NormalBalance } from "../balance/act1-normal";
import type { CardDefinition } from "../../model/card";

export const emberSpark: CardDefinition = {
  id: cardId("ember_spark"),
  name: "Ember Spark",
  description: "Deal 4 damage and apply 1 burn.",
  type: "attack",
  cost: 1,
  rarity: "common",
  tags: ["attack", "burn", "fire"],
  effects: [
    { type: "damage", amount: act1NormalBalance.cards.emberSparkDamage, target: { type: "target" } },
    { type: "applyStatus", statusId: statusId("burn"), stacks: act1NormalBalance.cards.emberSparkBurn, target: { type: "target" } }
  ]
};

export const quickGuard: CardDefinition = {
  id: cardId("quick_guard"),
  name: "Quick Guard",
  description: "Gain 6 block.",
  type: "skill",
  cost: 1,
  rarity: "common",
  tags: ["block", "guard"],
  effects: [{ type: "block", amount: act1NormalBalance.cards.quickGuardBlock, target: { type: "self" } }]
};

export const studyCommand: CardDefinition = {
  id: cardId("study_command"),
  name: "Study Command",
  description: "Draw 1 card.",
  type: "skill",
  cost: 0,
  rarity: "common",
  tags: ["draw", "command"],
  effects: [{ type: "draw", amount: act1NormalBalance.cards.studyCommandDraw }]
};

export const kindle: CardDefinition = {
  id: cardId("kindle"),
  name: "Kindle",
  description: "Apply 2 burn to all enemies.",
  type: "skill",
  cost: 1,
  rarity: "uncommon",
  tags: ["burn", "fire", "setup"],
  effects: [{ type: "applyStatus", statusId: statusId("burn"), stacks: act1NormalBalance.cards.kindleBurn, target: { type: "allEnemies" } }]
};

export const coordinatedStrike: CardDefinition = {
  id: cardId("coordinated_strike"),
  name: "Coordinated Strike",
  description: "Deal 5 damage and prompt the leading pet to follow up.",
  type: "attack",
  cost: 1,
  rarity: "uncommon",
  tags: ["attack", "pet", "command", "combo"],
  effects: [
    { type: "damage", amount: act1NormalBalance.cards.coordinatedStrikeDamage, target: { type: "target" } },
    { type: "petReact", petTarget: { type: "leading" }, reaction: "strike_followup" }
  ]
};

export const foxFlare: CardDefinition = {
  id: cardId("fox_flare"),
  name: "Fox Flare",
  description: "Command the leading pet to strike, then apply 3 burn.",
  type: "pet-command",
  cost: 1,
  rarity: "uncommon",
  requiresPetDefinitionId: petDefinitionId("ember_fox"),
  tags: ["pet", "fox", "burn", "command"],
  effects: [
    { type: "petAttack", petTarget: { type: "leading" }, amount: act1NormalBalance.cards.foxFlarePetAttack, target: { type: "target" } },
    { type: "applyStatus", statusId: statusId("burn"), stacks: act1NormalBalance.cards.foxFlareBurn, target: { type: "target" } }
  ]
};

export const rewardCards = [
  emberSpark,
  quickGuard,
  studyCommand,
  kindle,
  coordinatedStrike,
  foxFlare
] as const;
