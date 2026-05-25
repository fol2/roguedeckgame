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

export const charredStag: MonsterDefinition = {
  id: monsterId("charred_stag"),
  name: "Charred Stag",
  maxHp: 32,
  tags: ["forest", "elite", "beast", "burn"],
  intentPool: [
    {
      id: monsterIntentId("charred_stag_antler_strike"),
      type: "attack",
      description: "Antler Strike: attack for 9.",
      effects: [
        {
          type: "damage",
          amount: 9,
          target: { type: "target" }
        }
      ]
    },
    {
      id: monsterIntentId("charred_stag_ember_hooves"),
      type: "special",
      description: "Ember Hooves: attack for 5 and apply 1 burn.",
      effects: [
        {
          type: "damage",
          amount: 5,
          target: { type: "target" }
        },
        {
          type: "applyStatus",
          statusId: statusId("burn"),
          stacks: 1,
          target: { type: "target" }
        }
      ]
    },
    {
      id: monsterIntentId("charred_stag_guarded_snort"),
      type: "block",
      description: "Guarded Snort: gain 6 block.",
      effects: [
        {
          type: "block",
          amount: 6,
          target: { type: "self" }
        }
      ]
    }
  ]
};

export const forestWarden: MonsterDefinition = {
  id: monsterId("forest_warden"),
  name: "Forest Warden",
  maxHp: 40,
  tags: ["forest", "boss", "guardian", "burn"],
  intentPool: [
    {
      id: monsterIntentId("forest_warden_root_slam"),
      type: "attack",
      description: "Root Slam: attack for 10.",
      effects: [
        {
          type: "damage",
          amount: 10,
          target: { type: "target" }
        }
      ]
    },
    {
      id: monsterIntentId("forest_warden_cinder_bark"),
      type: "special",
      description: "Cinder Bark: gain 8 block and apply 1 burn.",
      effects: [
        {
          type: "block",
          amount: 8,
          target: { type: "self" }
        },
        {
          type: "applyStatus",
          statusId: statusId("burn"),
          stacks: 1,
          target: { type: "target" }
        }
      ]
    },
    {
      id: monsterIntentId("forest_warden_old_flame"),
      type: "debuff",
      description: "Old Flame: apply 2 burn.",
      effects: [
        {
          type: "applyStatus",
          statusId: statusId("burn"),
          stacks: 2,
          target: { type: "target" }
        }
      ]
    }
  ]
};

export const forestMonsters = [trainingSlime, ashMite, charredStag, forestWarden] as const;
