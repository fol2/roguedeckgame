import { petDefinitionId, petModifierId, statusId, storyFlagId, upgradeId } from "../../ids";
import type { PetUpgradeDefinition } from "../../model/pet";

const emberFoxBurnCommandSelector = {
  cardType: "pet-command",
  requiresPetDefinitionId: petDefinitionId("ember_fox"),
  tagsAll: ["burn"]
} as const;

const emberFoxCommandSelector = {
  cardType: "pet-command",
  requiresPetDefinitionId: petDefinitionId("ember_fox")
} as const;

export const burningFang: PetUpgradeDefinition = {
  id: upgradeId("burning_fang"),
  petDefinitionId: petDefinitionId("ember_fox"),
  name: "Burning Fang",
  description: "Ember Fox burn commands hit harder and apply more Burn.",
  tags: ["fox", "burn", "attack"],
  modifiers: [
    {
      id: petModifierId("burning_fang_modifier"),
      name: "Burning Fang Modifier",
      description: "Burn-tagged Ember Fox commands gain stronger pet attacks and Burn stacks.",
      tags: ["fox", "burn", "attack"],
      rules: [
        {
          type: "modifyPetCommandEffectAmount",
          selector: emberFoxBurnCommandSelector,
          effectType: "petAttack",
          amount: 2
        },
        {
          type: "modifyPetCommandEffectAmount",
          selector: emberFoxBurnCommandSelector,
          effectType: "applyStatus",
          statusId: statusId("burn"),
          amount: 1
        }
      ]
    }
  ]
};

export const warmBond: PetUpgradeDefinition = {
  id: upgradeId("warm_bond"),
  petDefinitionId: petDefinitionId("ember_fox"),
  name: "Warm Bond",
  description: "The first Ember Fox command each combat costs 1 less.",
  tags: ["fox", "energy", "opener"],
  modifiers: [
    {
      id: petModifierId("warm_bond_modifier"),
      name: "Warm Bond Modifier",
      description: "Discounts the first reducible Ember Fox command each combat.",
      tags: ["fox", "energy", "opener"],
      rules: [
        {
          type: "modifyPetCommandCost",
          selector: emberFoxCommandSelector,
          amount: -1,
          minCost: 0,
          limit: { type: "oncePerCombat" }
        }
      ]
    }
  ],
  storyFlagUnlocks: [storyFlagId("ember_fox_memory_01_unlocked")]
};

export const ashInstinct: PetUpgradeDefinition = {
  id: upgradeId("ash_instinct"),
  petDefinitionId: petDefinitionId("ember_fox"),
  name: "Ash Instinct",
  description: "When a burned enemy dies during your turn, draw 1 card.",
  tags: ["fox", "burn", "draw", "trigger"],
  modifiers: [
    {
      id: petModifierId("ash_instinct_modifier"),
      name: "Ash Instinct Modifier",
      description: "Draws after a burned non-final enemy is defeated during the player turn.",
      tags: ["fox", "burn", "draw", "trigger"],
      rules: [
        {
          type: "triggerOnEnemyDefeatedWithStatus",
          requiredStatusId: statusId("burn"),
          effects: [{ type: "draw", amount: 1 }],
          limit: { type: "oncePerTurn" }
        }
      ]
    }
  ]
};

export const emberFoxUpgrades = [burningFang, warmBond, ashInstinct] as const;
