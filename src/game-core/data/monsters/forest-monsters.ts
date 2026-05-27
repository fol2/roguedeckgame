import { monsterAbilityId, monsterId, monsterIntentId, statusId } from "../../ids";
import { act1NormalBalance } from "../balance/act1-normal";
import type { MonsterAbilityDefinition, MonsterDefinition, MonsterIntentDefinition } from "../../model/monster";

const monsterAttack = (amount: number) => ({ type: "damage" as const, amount, target: { type: "target" as const } });
const monsterBlock = (amount: number) => ({ type: "block" as const, amount, target: { type: "self" as const } });
const monsterBurn = (stacks: number) => ({ type: "applyStatus" as const, statusId: statusId("burn"), stacks, target: { type: "target" as const } });
const monsterCleanseBurn = (stacks: number) => ({ type: "cleanseStatus" as const, statusId: statusId("burn"), stacks, target: { type: "self" as const } });

const intentFromAbility = (id: string, ability: MonsterAbilityDefinition): MonsterIntentDefinition => ({
  id: monsterIntentId(id),
  type: ability.intentType,
  description: ability.description,
  abilityId: ability.id,
  effects: ability.effects
});

export const ashSlimeTackleAbility: MonsterAbilityDefinition = {
  id: monsterAbilityId("training_slime_attack"),
  name: "Slime Tackle",
  intentType: "attack",
  description: `Attack for ${act1NormalBalance.monsters.ashSlimeAttack}.`,
  tags: ["attack", "basic", "slime"],
  tier: "basic",
  planMode: "locked",
  telegraph: { defaultVisibility: "category", amountLabelMode: "hidden", targetHint: "keeper" },
  effects: [monsterAttack(act1NormalBalance.monsters.ashSlimeAttack)]
};

export const ashSlimeJellyGuardAbility: MonsterAbilityDefinition = {
  id: monsterAbilityId("training_slime_block"),
  name: "Jelly Guard",
  intentType: "block",
  description: `Gain ${act1NormalBalance.monsters.ashSlimeBlock} Block.`,
  tags: ["block", "basic", "slime"],
  tier: "basic",
  planMode: "locked",
  telegraph: { defaultVisibility: "category", amountLabelMode: "hidden", targetHint: "self" },
  effects: [monsterBlock(act1NormalBalance.monsters.ashSlimeBlock)]
};

export const cinderMiteBiteAbility: MonsterAbilityDefinition = {
  id: monsterAbilityId("ash_mite_attack"),
  name: "Ash Bite",
  intentType: "attack",
  description: `Attack for ${act1NormalBalance.monsters.cinderMiteAttack}.`,
  tags: ["attack", "fire", "mite"],
  tier: "basic",
  planMode: "locked",
  telegraph: { defaultVisibility: "category", amountLabelMode: "hidden", targetHint: "keeper" },
  effects: [monsterAttack(act1NormalBalance.monsters.cinderMiteAttack)]
};

export const cinderMiteDustAbility: MonsterAbilityDefinition = {
  id: monsterAbilityId("ash_mite_burn"),
  name: "Cinder Dust",
  intentType: "debuff",
  description: `Apply ${act1NormalBalance.monsters.cinderMiteBurn} Burn.`,
  tags: ["debuff", "burn", "fire", "mite"],
  tier: "basic",
  planMode: "locked",
  telegraph: { defaultVisibility: "category", amountLabelMode: "hidden", targetHint: "keeper" },
  effects: [monsterBurn(act1NormalBalance.monsters.cinderMiteBurn)]
};

export const cinderMiteSkitterAbility: MonsterAbilityDefinition = {
  id: monsterAbilityId("cinder_mite_skitter"),
  name: "Skitter",
  intentType: "block",
  description: `Gain ${act1NormalBalance.monsters.cinderMiteBlock} Block.`,
  tags: ["block", "fire", "mite"],
  tier: "basic",
  planMode: "locked",
  telegraph: { defaultVisibility: "category", amountLabelMode: "hidden", targetHint: "self" },
  effects: [monsterBlock(act1NormalBalance.monsters.cinderMiteBlock)]
};

export const sootCrowPeckAbility: MonsterAbilityDefinition = {
  id: monsterAbilityId("soot_crow_peck"),
  name: "Peck",
  intentType: "attack",
  description: `Attack for ${act1NormalBalance.monsters.sootCrowPeck}.`,
  tags: ["attack", "crow", "information"],
  tier: "basic",
  planMode: "locked",
  telegraph: { defaultVisibility: "category", amountLabelMode: "hidden", targetHint: "keeper" },
  effects: [monsterAttack(act1NormalBalance.monsters.sootCrowPeck)]
};

export const sootCrowFlutterAbility: MonsterAbilityDefinition = {
  id: monsterAbilityId("soot_crow_flutter"),
  name: "Ash Flutter",
  intentType: "special",
  description: `Gain ${act1NormalBalance.monsters.sootCrowBlock} Block and hide behind ash.`,
  tags: ["block", "obscure", "crow", "information"],
  tier: "advanced",
  planMode: "locked",
  telegraph: { defaultVisibility: "unknown", amountLabelMode: "hidden", targetHint: "self" },
  effects: [monsterBlock(act1NormalBalance.monsters.sootCrowBlock)]
};

export const sootCrowBlackCawAbility: MonsterAbilityDefinition = {
  id: monsterAbilityId("soot_crow_black_caw"),
  name: "Black Caw",
  intentType: "debuff",
  description: `Apply ${act1NormalBalance.monsters.sootCrowBurn} Burn.`,
  tags: ["debuff", "burn", "crow", "information"],
  tier: "advanced",
  planMode: "locked",
  telegraph: { defaultVisibility: "category", amountLabelMode: "hidden", targetHint: "keeper" },
  effects: [monsterBurn(act1NormalBalance.monsters.sootCrowBurn)]
};

export const rootHuskSwipeAbility: MonsterAbilityDefinition = {
  id: monsterAbilityId("root_husk_swipe"),
  name: "Root Swipe",
  intentType: "attack",
  description: `Attack for ${act1NormalBalance.monsters.rootHuskSwipe}.`,
  tags: ["attack", "root", "guardian"],
  tier: "advanced",
  planMode: "locked",
  telegraph: { defaultVisibility: "category", amountLabelMode: "hidden", targetHint: "keeper" },
  effects: [monsterAttack(act1NormalBalance.monsters.rootHuskSwipe)]
};

export const rootHuskBarkOverAbility: MonsterAbilityDefinition = {
  id: monsterAbilityId("root_husk_bark_over"),
  name: "Bark Over",
  intentType: "block",
  description: `Gain ${act1NormalBalance.monsters.rootHuskBlock} Block.`,
  tags: ["block", "root", "guardian"],
  tier: "advanced",
  planMode: "locked",
  telegraph: { defaultVisibility: "category", amountLabelMode: "hidden", targetHint: "self" },
  effects: [monsterBlock(act1NormalBalance.monsters.rootHuskBlock)]
};

export const rootHuskEmberSapAbility: MonsterAbilityDefinition = {
  id: monsterAbilityId("root_husk_ember_sap"),
  name: "Ember Sap",
  intentType: "special",
  description: `Gain ${act1NormalBalance.monsters.rootHuskSapBlock} Block and prepare pressure.`,
  tags: ["block", "special", "root", "guardian"],
  tier: "advanced",
  planMode: "locked",
  telegraph: { defaultVisibility: "category", amountLabelMode: "hidden", targetHint: "self" },
  effects: [monsterBlock(act1NormalBalance.monsters.rootHuskSapBlock)]
};

export const charredStagAntlerStrikeAbility: MonsterAbilityDefinition = {
  id: monsterAbilityId("charred_stag_antler_strike"),
  name: "Antler Strike",
  intentType: "attack",
  description: `Antler Strike: attack for ${act1NormalBalance.monsters.charredStagAntlerStrikeDamage}.`,
  tags: ["attack", "elite", "adaptive"],
  tier: "elite",
  planMode: "adaptive",
  telegraph: { defaultVisibility: "unknown", amountLabelMode: "hidden", targetHint: "keeper" },
  effects: [monsterAttack(act1NormalBalance.monsters.charredStagAntlerStrikeDamage)]
};

export const charredStagEmberHoovesAbility: MonsterAbilityDefinition = {
  id: monsterAbilityId("charred_stag_ember_hooves"),
  name: "Ember Hooves",
  intentType: "special",
  description: `Ember Hooves: attack for ${act1NormalBalance.monsters.charredStagEmberHoovesDamage} and apply ${act1NormalBalance.monsters.charredStagEmberHoovesBurn} Burn.`,
  tags: ["attack", "burn", "elite", "special", "adaptive"],
  tier: "elite",
  planMode: "adaptive",
  telegraph: { defaultVisibility: "unknown", amountLabelMode: "hidden", targetHint: "keeper" },
  effects: [monsterAttack(act1NormalBalance.monsters.charredStagEmberHoovesDamage), monsterBurn(act1NormalBalance.monsters.charredStagEmberHoovesBurn)]
};

export const charredStagGuardedSnortAbility: MonsterAbilityDefinition = {
  id: monsterAbilityId("charred_stag_guarded_snort"),
  name: "Guarded Snort",
  intentType: "block",
  description: `Guarded Snort: gain ${act1NormalBalance.monsters.charredStagGuardedSnortBlock} Block.`,
  tags: ["block", "elite", "adaptive"],
  tier: "elite",
  planMode: "adaptive",
  telegraph: { defaultVisibility: "unknown", amountLabelMode: "hidden", targetHint: "self" },
  effects: [monsterBlock(act1NormalBalance.monsters.charredStagGuardedSnortBlock)]
};

export const charredStagPawTheAshAbility: MonsterAbilityDefinition = {
  id: monsterAbilityId("charred_stag_paw_the_ash"),
  name: "Paw the Ash",
  intentType: "charge",
  description: `Charge: gain ${act1NormalBalance.monsters.charredStagPawTheAshBlock} Block and prepare a stronger line.`,
  tags: ["charge", "elite", "adaptive"],
  tier: "elite",
  planMode: "charging",
  telegraph: { defaultVisibility: "unknown", amountLabelMode: "hidden", targetHint: "self" },
  effects: [monsterBlock(act1NormalBalance.monsters.charredStagPawTheAshBlock)]
};

export const charredStagCrownFlareAbility: MonsterAbilityDefinition = {
  id: monsterAbilityId("charred_stag_crown_flare"),
  name: "Crown Flare",
  intentType: "special",
  description: `Obscure and guard: gain ${act1NormalBalance.monsters.charredStagCrownFlareBlock} Block and apply ${act1NormalBalance.monsters.charredStagCrownFlareBurn} Burn.`,
  tags: ["special", "obscure", "burn", "elite", "adaptive"],
  tier: "elite",
  planMode: "adaptive",
  telegraph: { defaultVisibility: "unknown", amountLabelMode: "hidden", targetHint: "keeper" },
  effects: [monsterBlock(act1NormalBalance.monsters.charredStagCrownFlareBlock), monsterBurn(act1NormalBalance.monsters.charredStagCrownFlareBurn)]
};

export const cinderScribeInkSparkAbility: MonsterAbilityDefinition = {
  id: monsterAbilityId("cinder_scribe_ink_spark"),
  name: "Ink Spark",
  intentType: "special",
  description: `Deal ${act1NormalBalance.monsters.cinderScribeInkSparkDamage} and apply ${act1NormalBalance.monsters.cinderScribeInkSparkBurn} Burn.`,
  tags: ["attack", "burn", "rare-bearer", "scribe"],
  tier: "rareBearer",
  planMode: "locked",
  telegraph: { defaultVisibility: "unknown", amountLabelMode: "hidden", targetHint: "keeper" },
  effects: [monsterAttack(act1NormalBalance.monsters.cinderScribeInkSparkDamage), monsterBurn(act1NormalBalance.monsters.cinderScribeInkSparkBurn)]
};

export const cinderScribePageShieldAbility: MonsterAbilityDefinition = {
  id: monsterAbilityId("cinder_scribe_page_shield"),
  name: "Page Shield",
  intentType: "block",
  description: `Gain ${act1NormalBalance.monsters.cinderScribePageShieldBlock} Block.`,
  tags: ["block", "rare-bearer", "scribe"],
  tier: "rareBearer",
  planMode: "locked",
  telegraph: { defaultVisibility: "unknown", amountLabelMode: "hidden", targetHint: "self" },
  effects: [monsterBlock(act1NormalBalance.monsters.cinderScribePageShieldBlock)]
};

export const cinderScribeSmudgeAbility: MonsterAbilityDefinition = {
  id: monsterAbilityId("cinder_scribe_smudge"),
  name: "Smudge the Future",
  intentType: "special",
  description: `Obscure the future and gain ${act1NormalBalance.monsters.cinderScribeSmudgeBlock} Block.`,
  tags: ["obscure", "special", "rare-bearer", "scribe"],
  tier: "rareBearer",
  planMode: "locked",
  telegraph: { defaultVisibility: "unknown", amountLabelMode: "hidden", targetHint: "self" },
  effects: [monsterBlock(act1NormalBalance.monsters.cinderScribeSmudgeBlock)]
};

export const emberrootWardenRootSlamAbility: MonsterAbilityDefinition = {
  id: monsterAbilityId("forest_warden_root_slam"),
  name: "Root Slam",
  intentType: "attack",
  description: `Root Slam: attack for ${act1NormalBalance.monsters.emberrootWardenRootSlamDamage}.`,
  tags: ["attack", "boss", "adaptive"],
  tier: "boss",
  planMode: "adaptive",
  telegraph: { defaultVisibility: "unknown", amountLabelMode: "hidden", targetHint: "keeper" },
  effects: [monsterAttack(act1NormalBalance.monsters.emberrootWardenRootSlamDamage)]
};

export const emberrootWardenCinderBarkAbility: MonsterAbilityDefinition = {
  id: monsterAbilityId("forest_warden_cinder_bark"),
  name: "Cinder Bark",
  intentType: "special",
  description: `Cinder Bark: gain ${act1NormalBalance.monsters.emberrootWardenCinderBarkBlock} Block and apply ${act1NormalBalance.monsters.emberrootWardenCinderBarkBurn} Burn.`,
  tags: ["block", "burn", "boss", "special", "adaptive"],
  tier: "boss",
  planMode: "adaptive",
  telegraph: { defaultVisibility: "unknown", amountLabelMode: "hidden", targetHint: "keeper" },
  effects: [monsterBlock(act1NormalBalance.monsters.emberrootWardenCinderBarkBlock), monsterBurn(act1NormalBalance.monsters.emberrootWardenCinderBarkBurn)]
};

export const emberrootWardenOldFlameAbility: MonsterAbilityDefinition = {
  id: monsterAbilityId("forest_warden_old_flame"),
  name: "Old Flame",
  intentType: "debuff",
  description: `Old Flame: apply ${act1NormalBalance.monsters.emberrootWardenOldFlameBurn} Burn.`,
  tags: ["burn", "boss", "debuff", "adaptive"],
  tier: "boss",
  planMode: "adaptive",
  telegraph: { defaultVisibility: "unknown", amountLabelMode: "hidden", targetHint: "keeper" },
  effects: [monsterBurn(act1NormalBalance.monsters.emberrootWardenOldFlameBurn)]
};

export const emberrootWardenAshBloomAbility: MonsterAbilityDefinition = {
  id: monsterAbilityId("emberroot_warden_ash_bloom"),
  name: "Ash Bloom",
  intentType: "charge",
  description: "Charge: prepare an unstable boss branch.",
  tags: ["charge", "boss", "phase", "adaptive"],
  tier: "boss",
  planMode: "charging",
  telegraph: { defaultVisibility: "unknown", amountLabelMode: "hidden", targetHint: "unknown" },
  effects: []
};

export const emberrootWardenAncientShelterAbility: MonsterAbilityDefinition = {
  id: monsterAbilityId("emberroot_warden_ancient_shelter"),
  name: "Ancient Shelter",
  intentType: "block",
  description: `Gain ${act1NormalBalance.monsters.emberrootWardenAncientShelterBlock} Block and reduce Burn.`,
  tags: ["block", "cleanse", "boss", "adaptive"],
  tier: "boss",
  planMode: "adaptive",
  telegraph: { defaultVisibility: "unknown", amountLabelMode: "hidden", targetHint: "self" },
  effects: [monsterBlock(act1NormalBalance.monsters.emberrootWardenAncientShelterBlock), monsterCleanseBurn(act1NormalBalance.monsters.emberrootWardenAncientShelterCleanse)]
};

export const trainingSlime: MonsterDefinition = {
  id: monsterId("training_slime"),
  name: "Ash Slime",
  maxHp: act1NormalBalance.monsters.ashSlimeHp,
  tags: ["forest", "slime", "normal", "basic"],
  abilityIds: [ashSlimeTackleAbility.id, ashSlimeJellyGuardAbility.id],
  intentPool: [
    intentFromAbility("training_slime_attack", ashSlimeTackleAbility),
    intentFromAbility("training_slime_block", ashSlimeJellyGuardAbility)
  ],
  cardGame: {
    handSize: 1,
    planSlots: 1,
    defaultPlanMode: "locked",
    defaultIntentVisibility: "category",
    deck: [
      { abilityId: ashSlimeTackleAbility.id, copies: 2 },
      { abilityId: ashSlimeJellyGuardAbility.id, copies: 1 }
    ]
  }
};

export const ashMite: MonsterDefinition = {
  id: monsterId("ash_mite"),
  name: "Cinder Mite",
  maxHp: act1NormalBalance.monsters.cinderMiteHp,
  tags: ["forest", "mite", "fire", "burn", "normal"],
  abilityIds: [cinderMiteBiteAbility.id, cinderMiteDustAbility.id, cinderMiteSkitterAbility.id],
  intentPool: [
    intentFromAbility("ash_mite_attack", cinderMiteBiteAbility),
    intentFromAbility("ash_mite_burn", cinderMiteDustAbility),
    intentFromAbility("cinder_mite_skitter", cinderMiteSkitterAbility)
  ],
  cardGame: {
    handSize: 1,
    planSlots: 1,
    defaultPlanMode: "locked",
    defaultIntentVisibility: "category",
    deck: [
      { abilityId: cinderMiteBiteAbility.id, copies: 2 },
      { abilityId: cinderMiteDustAbility.id, copies: 1 },
      { abilityId: cinderMiteSkitterAbility.id, copies: 1 }
    ]
  }
};

export const sootCrow: MonsterDefinition = {
  id: monsterId("soot_crow"),
  name: "Soot Crow",
  maxHp: act1NormalBalance.monsters.sootCrowHp,
  tags: ["forest", "crow", "information", "normal"],
  abilityIds: [sootCrowPeckAbility.id, sootCrowFlutterAbility.id, sootCrowBlackCawAbility.id],
  intentPool: [
    intentFromAbility("soot_crow_peck", sootCrowPeckAbility),
    intentFromAbility("soot_crow_flutter", sootCrowFlutterAbility),
    intentFromAbility("soot_crow_black_caw", sootCrowBlackCawAbility)
  ],
  cardGame: {
    handSize: 1,
    planSlots: 1,
    defaultPlanMode: "locked",
    defaultIntentVisibility: "category",
    deck: [
      { abilityId: sootCrowPeckAbility.id, copies: 2 },
      { abilityId: sootCrowFlutterAbility.id, copies: 1 },
      { abilityId: sootCrowBlackCawAbility.id, copies: 1 }
    ]
  }
};

export const rootHusk: MonsterDefinition = {
  id: monsterId("root_husk"),
  name: "Root Husk",
  maxHp: act1NormalBalance.monsters.rootHuskHp,
  tags: ["forest", "root", "guardian", "normal", "block"],
  abilityIds: [rootHuskSwipeAbility.id, rootHuskBarkOverAbility.id, rootHuskEmberSapAbility.id],
  intentPool: [
    intentFromAbility("root_husk_swipe", rootHuskSwipeAbility),
    intentFromAbility("root_husk_bark_over", rootHuskBarkOverAbility),
    intentFromAbility("root_husk_ember_sap", rootHuskEmberSapAbility)
  ],
  cardGame: {
    handSize: 1,
    planSlots: 1,
    defaultPlanMode: "locked",
    defaultIntentVisibility: "category",
    deck: [
      { abilityId: rootHuskSwipeAbility.id, copies: 2 },
      { abilityId: rootHuskBarkOverAbility.id, copies: 2 },
      { abilityId: rootHuskEmberSapAbility.id, copies: 1 }
    ]
  }
};

export const charredStag: MonsterDefinition = {
  id: monsterId("charred_stag"),
  name: "Charred Stag",
  maxHp: act1NormalBalance.monsters.charredStagHp,
  tags: ["forest", "elite", "beast", "burn", "adaptive"],
  abilityIds: [
    charredStagAntlerStrikeAbility.id,
    charredStagEmberHoovesAbility.id,
    charredStagGuardedSnortAbility.id,
    charredStagPawTheAshAbility.id,
    charredStagCrownFlareAbility.id
  ],
  intentPool: [
    intentFromAbility("charred_stag_antler_strike", charredStagAntlerStrikeAbility),
    intentFromAbility("charred_stag_ember_hooves", charredStagEmberHoovesAbility),
    intentFromAbility("charred_stag_guarded_snort", charredStagGuardedSnortAbility),
    intentFromAbility("charred_stag_paw_the_ash", charredStagPawTheAshAbility),
    intentFromAbility("charred_stag_crown_flare", charredStagCrownFlareAbility)
  ],
  cardGame: {
    handSize: 2,
    planSlots: 2,
    defaultPlanMode: "adaptive",
    defaultIntentVisibility: "unknown",
    adaptiveRuleIds: ["prefer_attack_if_player_low_block", "prefer_guard_if_player_overblocks"],
    deck: [
      { abilityId: charredStagAntlerStrikeAbility.id, copies: 2 },
      { abilityId: charredStagEmberHoovesAbility.id, copies: 1 },
      { abilityId: charredStagGuardedSnortAbility.id, copies: 1 },
      { abilityId: charredStagPawTheAshAbility.id, copies: 1 },
      { abilityId: charredStagCrownFlareAbility.id, copies: 1 }
    ]
  }
};

export const cinderScribe: MonsterDefinition = {
  id: monsterId("cinder_scribe"),
  name: "Cinder Scribe",
  maxHp: act1NormalBalance.monsters.cinderScribeHp,
  tags: ["forest", "rare-bearer", "scribe", "information"],
  abilityIds: [cinderScribeInkSparkAbility.id, cinderScribePageShieldAbility.id, cinderScribeSmudgeAbility.id],
  intentPool: [
    intentFromAbility("cinder_scribe_ink_spark", cinderScribeInkSparkAbility),
    intentFromAbility("cinder_scribe_page_shield", cinderScribePageShieldAbility),
    intentFromAbility("cinder_scribe_smudge", cinderScribeSmudgeAbility)
  ],
  cardGame: {
    handSize: 2,
    planSlots: 1,
    defaultPlanMode: "locked",
    defaultIntentVisibility: "unknown",
    deck: [
      { abilityId: cinderScribeInkSparkAbility.id, copies: 2 },
      { abilityId: cinderScribePageShieldAbility.id, copies: 1 },
      { abilityId: cinderScribeSmudgeAbility.id, copies: 1 }
    ]
  }
};

export const forestWarden: MonsterDefinition = {
  id: monsterId("forest_warden"),
  name: "Emberroot Warden",
  maxHp: act1NormalBalance.monsters.emberrootWardenHp,
  tags: ["forest", "boss", "guardian", "burn", "adaptive"],
  abilityIds: [
    emberrootWardenRootSlamAbility.id,
    emberrootWardenCinderBarkAbility.id,
    emberrootWardenOldFlameAbility.id,
    emberrootWardenAshBloomAbility.id,
    emberrootWardenAncientShelterAbility.id
  ],
  intentPool: [
    intentFromAbility("forest_warden_root_slam", emberrootWardenRootSlamAbility),
    intentFromAbility("forest_warden_cinder_bark", emberrootWardenCinderBarkAbility),
    intentFromAbility("forest_warden_old_flame", emberrootWardenOldFlameAbility),
    intentFromAbility("emberroot_warden_ash_bloom", emberrootWardenAshBloomAbility),
    intentFromAbility("emberroot_warden_ancient_shelter", emberrootWardenAncientShelterAbility)
  ],
  cardGame: {
    handSize: 3,
    planSlots: 2,
    defaultPlanMode: "adaptive",
    defaultIntentVisibility: "unknown",
    adaptiveRuleIds: ["phase_after_half_hp", "prefer_charge_when_safe", "prefer_shelter_when_burning"],
    deck: [
      { abilityId: emberrootWardenRootSlamAbility.id, copies: 2 },
      { abilityId: emberrootWardenCinderBarkAbility.id, copies: 2 },
      { abilityId: emberrootWardenOldFlameAbility.id, copies: 1 },
      { abilityId: emberrootWardenAshBloomAbility.id, copies: 1 },
      { abilityId: emberrootWardenAncientShelterAbility.id, copies: 1 }
    ]
  }
};

export const forestMonsterAbilities = [
  ashSlimeTackleAbility,
  ashSlimeJellyGuardAbility,
  cinderMiteBiteAbility,
  cinderMiteDustAbility,
  cinderMiteSkitterAbility,
  sootCrowPeckAbility,
  sootCrowFlutterAbility,
  sootCrowBlackCawAbility,
  rootHuskSwipeAbility,
  rootHuskBarkOverAbility,
  rootHuskEmberSapAbility,
  charredStagAntlerStrikeAbility,
  charredStagEmberHoovesAbility,
  charredStagGuardedSnortAbility,
  charredStagPawTheAshAbility,
  charredStagCrownFlareAbility,
  cinderScribeInkSparkAbility,
  cinderScribePageShieldAbility,
  cinderScribeSmudgeAbility,
  emberrootWardenRootSlamAbility,
  emberrootWardenCinderBarkAbility,
  emberrootWardenOldFlameAbility,
  emberrootWardenAshBloomAbility,
  emberrootWardenAncientShelterAbility
] as const;

export const forestMonsters = [trainingSlime, ashMite, sootCrow, rootHusk, charredStag, cinderScribe, forestWarden] as const;
