import { playerClassModifierId } from "../../ids";
import type { PlayerClassModifierDefinition } from "../../model/player";

export const fieldSense: PlayerClassModifierDefinition = {
  id: playerClassModifierId("field_sense"),
  name: "Field Sense",
  description: "Normal enemies show category Intent. Elites, bosses, and rare bearers remain unknown unless revealed or scoped.",
  tags: ["field-sense", "intent", "passive", "reveal"],
  rules: [
    {
      type: "intentVisibilityPassive",
      level: "category",
      appliesTo: "normalEnemies"
    }
  ]
};

export const ashboundKeeperClassModifiers = [fieldSense] as const;
