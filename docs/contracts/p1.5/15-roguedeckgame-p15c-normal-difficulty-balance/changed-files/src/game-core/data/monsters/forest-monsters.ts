import { monsterId, monsterIntentId, statusId } from "../../ids";
import { act1NormalBalance } from "../balance/act1-normal";
import type { MonsterDefinition } from "../../model/monster";

export const trainingSlime: MonsterDefinition = {
  id: monsterId("training_slime"),
  name: "Training Slime",
  maxHp: act1NormalBalance.monsters.trainingSlimeHp,
  tags: ["forest", "slime", "training"],
  intentPool: [
    {
      id: monsterIntentId("training_slime_attack"),
      type: "attack",
      description: "Attack for 6.",
      effects: [
        {
          type: "damage",
          amount: act1NormalBalance.monsters.trainingSlimeAttack,
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
          amount: act1NormalBalance.monsters.trainingSlimeBlock,
          target: { type: "self" }
        }
      ]
    }
  ]
};

export const ashMite: MonsterDefinition = {
  id: monsterId("ash_mite"),
  name: "Ash Mite",
  maxHp: act1NormalBalance.monsters.ashMiteHp,
  tags: ["forest", "mite", "fire", "burn"],
  intentPool: [
    {
      id: monsterIntentId("ash_mite_attack"),
      type: "attack",
      description: "Attack for 4.",
      effects: [
        {
          type: "damage",
          amount: act1NormalBalance.monsters.ashMiteAttack,
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
          stacks: act1NormalBalance.monsters.ashMiteBurn,
          target: { type: "target" }
        }
      ]
    }
  ]
};

export const charredStag: MonsterDefinition = {
  id: monsterId("charred_stag"),
  name: "Charred Stag",
  maxHp: act1NormalBalance.monsters.charredStagHp,
  tags: ["forest", "elite", "beast", "burn"],
  intentPool: [
    {
      id: monsterIntentId("charred_stag_antler_strike"),
      type: "attack",
      description: "Antler Strike: attack for 10.",
      effects: [
        {
          type: "damage",
          amount: act1NormalBalance.monsters.charredStagAntlerStrikeDamage,
          target: { type: "target" }
        }
      ]
    },
    {
      id: monsterIntentId("charred_stag_ember_hooves"),
      type: "special",
      description: "Ember Hooves: attack for 6 and apply 1 burn.",
      effects: [
        {
          type: "damage",
          amount: act1NormalBalance.monsters.charredStagEmberHoovesDamage,
          target: { type: "target" }
        },
        {
          type: "applyStatus",
          statusId: statusId("burn"),
          stacks: act1NormalBalance.monsters.charredStagEmberHoovesBurn,
          target: { type: "target" }
        }
      ]
    },
    {
      id: monsterIntentId("charred_stag_guarded_snort"),
      type: "block",
      description: "Guarded Snort: gain 7 block.",
      effects: [
        {
          type: "block",
          amount: act1NormalBalance.monsters.charredStagGuardedSnortBlock,
          target: { type: "self" }
        }
      ]
    }
  ]
};

export const forestWarden: MonsterDefinition = {
  id: monsterId("forest_warden"),
  name: "Forest Warden",
  maxHp: act1NormalBalance.monsters.forestWardenHp,
  tags: ["forest", "boss", "guardian", "burn"],
  intentPool: [
    {
      id: monsterIntentId("forest_warden_root_slam"),
      type: "attack",
      description: "Root Slam: attack for 12.",
      effects: [
        {
          type: "damage",
          amount: act1NormalBalance.monsters.forestWardenRootSlamDamage,
          target: { type: "target" }
        }
      ]
    },
    {
      id: monsterIntentId("forest_warden_cinder_bark"),
      type: "special",
      description: "Cinder Bark: gain 10 block and apply 1 burn.",
      effects: [
        {
          type: "block",
          amount: act1NormalBalance.monsters.forestWardenCinderBarkBlock,
          target: { type: "self" }
        },
        {
          type: "applyStatus",
          statusId: statusId("burn"),
          stacks: act1NormalBalance.monsters.forestWardenCinderBarkBurn,
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
          stacks: act1NormalBalance.monsters.forestWardenOldFlameBurn,
          target: { type: "target" }
        }
      ]
    }
  ]
};

export const forestMonsters = [trainingSlime, ashMite, charredStag, forestWarden] as const;
