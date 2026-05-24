import { monsterId, monsterIntentId, statusId } from "../../ids";
import type { MonsterDefinition } from "../../model/monster";

export const trainingSlime: MonsterDefinition = {
  id: monsterId("training_slime"),
  name: "Training Slime",
  maxHp: 22,
  tags: ["forest", "slime", "training"],
  intentPool: [
    {
      id: monsterIntentId("training_slime_attack"),
      type: "attack",
      description: "Attack for 5.",
      effects: [
        {
          type: "damage",
          amount: 5,
          target: { type: "target" }
        }
      ]
    },
    {
      id: monsterIntentId("training_slime_block"),
      type: "block",
      description: "Gain 4 block.",
      effects: [
        {
          type: "block",
          amount: 4,
          target: { type: "self" }
        }
      ]
    }
  ]
};

export const ashMite: MonsterDefinition = {
  id: monsterId("ash_mite"),
  name: "Ash Mite",
  maxHp: 18,
  tags: ["forest", "mite", "fire", "burn"],
  intentPool: [
    {
      id: monsterIntentId("ash_mite_attack"),
      type: "attack",
      description: "Attack for 4.",
      effects: [
        {
          type: "damage",
          amount: 4,
          target: { type: "target" }
        }
      ]
    },
    {
      id: monsterIntentId("ash_mite_burn"),
      type: "debuff",
      description: "Apply 1 burn.",
      effects: [
        {
          type: "applyStatus",
          statusId: statusId("burn"),
          stacks: 1,
          target: { type: "target" }
        }
      ]
    }
  ]
};

export const forestMonsters = [trainingSlime, ashMite] as const;
