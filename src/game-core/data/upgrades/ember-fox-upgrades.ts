import { petDefinitionId, petModifierId, storyFlagId, upgradeId } from "../../ids";
import type { PetUpgradeDefinition } from "../../model/pet";

export const burningFang: PetUpgradeDefinition = {
  id: upgradeId("burning_fang"),
  petDefinitionId: petDefinitionId("ember_fox"),
  name: "Burning Fang",
  description: "Pet attack commands with burn synergy become stronger later.",
  tags: ["fox", "burn", "attack"],
  modifiers: [
    {
      id: petModifierId("burning_fang_modifier"),
      name: "Burning Fang Modifier",
      description: "Reserved data hook for future burn-synergy pet attacks.",
      tags: ["fox", "burn", "attack"]
    }
  ]
};

export const warmBond: PetUpgradeDefinition = {
  id: upgradeId("warm_bond"),
  petDefinitionId: petDefinitionId("ember_fox"),
  name: "Warm Bond",
  description: "First pet command each combat may become cheaper later.",
  tags: ["fox", "energy", "opener"],
  modifiers: [
    {
      id: petModifierId("warm_bond_modifier"),
      name: "Warm Bond Modifier",
      description: "Reserved data hook for future opener command discounts.",
      tags: ["fox", "energy", "opener"]
    }
  ],
  storyFlagUnlocks: [storyFlagId("ember_fox_memory_01_unlocked")]
};

export const ashInstinct: PetUpgradeDefinition = {
  id: upgradeId("ash_instinct"),
  petDefinitionId: petDefinitionId("ember_fox"),
  name: "Ash Instinct",
  description: "When a burned enemy dies, draw later.",
  tags: ["fox", "burn", "draw", "trigger"],
  modifiers: [
    {
      id: petModifierId("ash_instinct_modifier"),
      name: "Ash Instinct Modifier",
      description: "Reserved data hook for future burned-enemy defeat triggers.",
      tags: ["fox", "burn", "draw", "trigger"]
    }
  ]
};

export const emberFoxUpgrades = [burningFang, warmBond, ashInstinct] as const;
