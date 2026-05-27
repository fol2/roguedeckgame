import { monsterAbilityId, monsterId, monsterIntentId, statusId } from "../../ids";
import { act1NormalBalance } from "../balance/act1-normal";
import type { MonsterAbilityDefinition, MonsterDefinition } from "../../model/monster";

export const trainingSlimeAttackAbility: MonsterAbilityDefinition = {
  id: monsterAbilityId("training_slime_attack"),
  name: "Slime Tackle",
  intentType: "attack",
  description: `Attack for ${act1NormalBalance.monsters.trainingSlimeAttack}.`,
  tags: ["attack", "training"],
  effects: [
    {
      type: "damage",
      amount: act1NormalBalance.monsters.trainingSlimeAttack,
      target: { type: "target" }
    }
  ]
};

export const trainingSlimeBlockAbility: MonsterAbilityDefinition = {
  id: monsterAbilityId("training_slime_block"),
  name: "Jelly Guard",
  intentType: "block",
  description: `Gain ${act1NormalBalance.monsters.trainingSlimeBlock} block.`,
  tags: ["block", "training"],
  effects: [
    {
      type: "block",
      amount: act1NormalBalance.monsters.trainingSlimeBlock,
      target: { type: "self" }
    }
  ]
};

export const ashMiteAttackAbility: MonsterAbilityDefinition = {
  id: monsterAbilityId("ash_mite_attack"),
  name: "Ash Bite",
  intentType: "attack",
  description: `Attack for ${act1NormalBalance.monsters.ashMiteAttack}.`,
  tags: ["attack", "fire"],
  effects: [
    {
      type: "damage",
      amount: act1NormalBalance.monsters.ashMiteAttack,
      target: { type: "target" }
    }
  ]
};

export const ashMiteBurnAbility: MonsterAbilityDefinition = {
  id: monsterAbilityId("ash_mite_burn"),
  name: "Cinder Dust",
  intentType: "debuff",
  description: `Apply ${act1NormalBalance.monsters.ashMiteBurn} burn.`,
  tags: ["debuff", "burn", "fire"],
  effects: [
    {
      type: "applyStatus",
      statusId: statusId("burn"),
      stacks: act1NormalBalance.monsters.ashMiteBurn,
      target: { type: "target" }
    }
  ]
};

export const charredStagAntlerStrikeAbility: MonsterAbilityDefinition = {
  id: monsterAbilityId("charred_stag_antler_strike"),
  name: "Antler Strike",
  intentType: "attack",
  description: `Antler Strike: attack for ${act1NormalBalance.monsters.charredStagAntlerStrikeDamage}.`,
  tags: ["attack", "elite"],
  effects: [
    {
      type: "damage",
      amount: act1NormalBalance.monsters.charredStagAntlerStrikeDamage,
      target: { type: "target" }
    }
  ]
};

export const charredStagEmberHoovesAbility: MonsterAbilityDefinition = {
  id: monsterAbilityId("charred_stag_ember_hooves"),
  name: "Ember Hooves",
  intentType: "special",
  description: `Ember Hooves: attack for ${act1NormalBalance.monsters.charredStagEmberHoovesDamage} and apply ${act1NormalBalance.monsters.charredStagEmberHoovesBurn} burn.`,
  tags: ["attack", "burn", "elite", "special"],
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
};

export const charredStagGuardedSnortAbility: MonsterAbilityDefinition = {
  id: monsterAbilityId("charred_stag_guarded_snort"),
  name: "Guarded Snort",
  intentType: "block",
  description: `Guarded Snort: gain ${act1NormalBalance.monsters.charredStagGuardedSnortBlock} block.`,
  tags: ["block", "elite"],
  effects: [
    {
      type: "block",
      amount: act1NormalBalance.monsters.charredStagGuardedSnortBlock,
      target: { type: "self" }
    }
  ]
};

export const forestWardenRootSlamAbility: MonsterAbilityDefinition = {
  id: monsterAbilityId("forest_warden_root_slam"),
  name: "Root Slam",
  intentType: "attack",
  description: `Root Slam: attack for ${act1NormalBalance.monsters.forestWardenRootSlamDamage}.`,
  tags: ["attack", "boss"],
  effects: [
    {
      type: "damage",
      amount: act1NormalBalance.monsters.forestWardenRootSlamDamage,
      target: { type: "target" }
    }
  ]
};

export const forestWardenCinderBarkAbility: MonsterAbilityDefinition = {
  id: monsterAbilityId("forest_warden_cinder_bark"),
  name: "Cinder Bark",
  intentType: "special",
  description: `Cinder Bark: gain ${act1NormalBalance.monsters.forestWardenCinderBarkBlock} block and apply ${act1NormalBalance.monsters.forestWardenCinderBarkBurn} burn.`,
  tags: ["block", "burn", "boss", "special"],
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
};

export const forestWardenOldFlameAbility: MonsterAbilityDefinition = {
  id: monsterAbilityId("forest_warden_old_flame"),
  name: "Old Flame",
  intentType: "debuff",
  description: `Old Flame: apply ${act1NormalBalance.monsters.forestWardenOldFlameBurn} burn.`,
  tags: ["burn", "boss", "debuff"],
  effects: [
    {
      type: "applyStatus",
      statusId: statusId("burn"),
      stacks: act1NormalBalance.monsters.forestWardenOldFlameBurn,
      target: { type: "target" }
    }
  ]
};

export const trainingSlime: MonsterDefinition = {
  id: monsterId("training_slime"),
  name: "Training Slime",
  maxHp: act1NormalBalance.monsters.trainingSlimeHp,
  tags: ["forest", "slime", "training"],
  abilityIds: [trainingSlimeAttackAbility.id, trainingSlimeBlockAbility.id],
  intentPool: [
    {
      id: monsterIntentId("training_slime_attack"),
      type: trainingSlimeAttackAbility.intentType,
      description: trainingSlimeAttackAbility.description,
      abilityId: trainingSlimeAttackAbility.id,
      effects: trainingSlimeAttackAbility.effects
    },
    {
      id: monsterIntentId("training_slime_block"),
      type: trainingSlimeBlockAbility.intentType,
      description: trainingSlimeBlockAbility.description,
      abilityId: trainingSlimeBlockAbility.id,
      effects: trainingSlimeBlockAbility.effects
    }
  ]
};

export const ashMite: MonsterDefinition = {
  id: monsterId("ash_mite"),
  name: "Ash Mite",
  maxHp: act1NormalBalance.monsters.ashMiteHp,
  tags: ["forest", "mite", "fire", "burn"],
  abilityIds: [ashMiteAttackAbility.id, ashMiteBurnAbility.id],
  intentPool: [
    {
      id: monsterIntentId("ash_mite_attack"),
      type: ashMiteAttackAbility.intentType,
      description: ashMiteAttackAbility.description,
      abilityId: ashMiteAttackAbility.id,
      effects: ashMiteAttackAbility.effects
    },
    {
      id: monsterIntentId("ash_mite_burn"),
      type: ashMiteBurnAbility.intentType,
      description: ashMiteBurnAbility.description,
      abilityId: ashMiteBurnAbility.id,
      effects: ashMiteBurnAbility.effects
    }
  ]
};

export const charredStag: MonsterDefinition = {
  id: monsterId("charred_stag"),
  name: "Charred Stag",
  maxHp: act1NormalBalance.monsters.charredStagHp,
  tags: ["forest", "elite", "beast", "burn"],
  abilityIds: [
    charredStagAntlerStrikeAbility.id,
    charredStagEmberHoovesAbility.id,
    charredStagGuardedSnortAbility.id
  ],
  intentPool: [
    {
      id: monsterIntentId("charred_stag_antler_strike"),
      type: charredStagAntlerStrikeAbility.intentType,
      description: charredStagAntlerStrikeAbility.description,
      abilityId: charredStagAntlerStrikeAbility.id,
      effects: charredStagAntlerStrikeAbility.effects
    },
    {
      id: monsterIntentId("charred_stag_ember_hooves"),
      type: charredStagEmberHoovesAbility.intentType,
      description: charredStagEmberHoovesAbility.description,
      abilityId: charredStagEmberHoovesAbility.id,
      effects: charredStagEmberHoovesAbility.effects
    },
    {
      id: monsterIntentId("charred_stag_guarded_snort"),
      type: charredStagGuardedSnortAbility.intentType,
      description: charredStagGuardedSnortAbility.description,
      abilityId: charredStagGuardedSnortAbility.id,
      effects: charredStagGuardedSnortAbility.effects
    }
  ]
};

export const forestWarden: MonsterDefinition = {
  id: monsterId("forest_warden"),
  name: "Forest Warden",
  maxHp: act1NormalBalance.monsters.forestWardenHp,
  tags: ["forest", "boss", "guardian", "burn"],
  abilityIds: [
    forestWardenRootSlamAbility.id,
    forestWardenCinderBarkAbility.id,
    forestWardenOldFlameAbility.id
  ],
  intentPool: [
    {
      id: monsterIntentId("forest_warden_root_slam"),
      type: forestWardenRootSlamAbility.intentType,
      description: forestWardenRootSlamAbility.description,
      abilityId: forestWardenRootSlamAbility.id,
      effects: forestWardenRootSlamAbility.effects
    },
    {
      id: monsterIntentId("forest_warden_cinder_bark"),
      type: forestWardenCinderBarkAbility.intentType,
      description: forestWardenCinderBarkAbility.description,
      abilityId: forestWardenCinderBarkAbility.id,
      effects: forestWardenCinderBarkAbility.effects
    },
    {
      id: monsterIntentId("forest_warden_old_flame"),
      type: forestWardenOldFlameAbility.intentType,
      description: forestWardenOldFlameAbility.description,
      abilityId: forestWardenOldFlameAbility.id,
      effects: forestWardenOldFlameAbility.effects
    }
  ]
};

export const forestMonsterAbilities = [
  trainingSlimeAttackAbility,
  trainingSlimeBlockAbility,
  ashMiteAttackAbility,
  ashMiteBurnAbility,
  charredStagAntlerStrikeAbility,
  charredStagEmberHoovesAbility,
  charredStagGuardedSnortAbility,
  forestWardenRootSlamAbility,
  forestWardenCinderBarkAbility,
  forestWardenOldFlameAbility
] as const;

export const forestMonsters = [trainingSlime, ashMite, charredStag, forestWarden] as const;
