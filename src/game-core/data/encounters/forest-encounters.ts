import { cardId, encounterId, monsterGroupId, monsterId, rewardPoolId } from "../../ids";
import type { EncounterDefinition } from "../../model/encounter";

export const ashSlimeEncounter: EncounterDefinition = {
  id: encounterId("training_slime_encounter"),
  type: "combat",
  name: "Ash Slime and Cinder Mite",
  monsterIds: [monsterId("training_slime"), monsterId("ash_mite")],
  tags: ["forest", "tutorial", "attack", "guard", "burn", "multi-enemy"],
  authoring: {
    actId: "act1_forest",
    difficultyBand: "tutorial",
    budget: 3,
    monsterRoles: ["training", "block", "burn", "attack", "multi-enemy"],
    monsterGroups: [
      {
        id: monsterGroupId("ash_slime_group"),
        monsterIds: [monsterId("training_slime")],
        roles: ["training", "block"],
        minCount: 1,
        maxCount: 1
      },
      {
        id: monsterGroupId("ash_slime_mite_group"),
        monsterIds: [monsterId("ash_mite")],
        roles: ["burn", "attack"],
        minCount: 1,
        maxCount: 1
      }
    ],
    rewardPoolId: rewardPoolId("normal")
  }
};

export const cinderMiteEncounter: EncounterDefinition = {
  id: encounterId("ash_mite_encounter"),
  type: "combat",
  name: "Cinder Mite and Soot Crow",
  monsterIds: [monsterId("ash_mite"), monsterId("soot_crow")],
  tags: ["forest", "burn", "debuff", "information", "multi-enemy"],
  authoring: {
    actId: "act1_forest",
    difficultyBand: "easy",
    budget: 4,
    monsterRoles: ["burn", "attack", "information", "obscure", "multi-enemy"],
    monsterGroups: [
      {
        id: monsterGroupId("cinder_mite_group"),
        monsterIds: [monsterId("ash_mite")],
        roles: ["burn", "attack"],
        minCount: 1,
        maxCount: 1
      },
      {
        id: monsterGroupId("cinder_mite_crow_group"),
        monsterIds: [monsterId("soot_crow")],
        roles: ["information", "obscure"],
        minCount: 1,
        maxCount: 1
      }
    ],
    rewardPoolId: rewardPoolId("normal")
  }
};

export const sootCrowEncounter: EncounterDefinition = {
  id: encounterId("soot_crow_encounter"),
  type: "combat",
  name: "Soot Crow and Ash Slimes",
  monsterIds: [monsterId("soot_crow"), monsterId("training_slime"), monsterId("training_slime")],
  tags: ["forest", "information", "obscure", "guard", "training", "multi-enemy"],
  authoring: {
    actId: "act1_forest",
    difficultyBand: "normal",
    budget: 4,
    monsterRoles: ["information", "obscure", "block", "training", "multi-enemy"],
    monsterGroups: [
      {
        id: monsterGroupId("soot_crow_group"),
        monsterIds: [monsterId("soot_crow")],
        roles: ["information", "obscure"],
        minCount: 1,
        maxCount: 1
      },
      {
        id: monsterGroupId("soot_crow_first_slime_group"),
        monsterIds: [monsterId("training_slime")],
        roles: ["block", "training"],
        minCount: 1,
        maxCount: 1
      },
      {
        id: monsterGroupId("soot_crow_second_slime_group"),
        monsterIds: [monsterId("training_slime")],
        roles: ["block", "training"],
        minCount: 1,
        maxCount: 1
      }
    ],
    rewardPoolId: rewardPoolId("normal")
  }
};

export const rootHuskEncounter: EncounterDefinition = {
  id: encounterId("root_husk_encounter"),
  type: "combat",
  name: "Root Husk Patrol",
  monsterIds: [monsterId("root_husk"), monsterId("training_slime"), monsterId("ash_mite")],
  tags: ["forest", "guard", "burn-answer", "burn", "multi-enemy"],
  authoring: {
    actId: "act1_forest",
    difficultyBand: "hard",
    budget: 5,
    monsterRoles: ["block", "frontline", "slow-pressure", "training", "burn", "multi-enemy"],
    monsterGroups: [
      {
        id: monsterGroupId("root_husk_group"),
        monsterIds: [monsterId("root_husk")],
        roles: ["block", "frontline"],
        minCount: 1,
        maxCount: 1
      },
      {
        id: monsterGroupId("root_husk_slime_group"),
        monsterIds: [monsterId("training_slime")],
        roles: ["training", "block"],
        minCount: 1,
        maxCount: 1
      },
      {
        id: monsterGroupId("root_husk_mite_group"),
        monsterIds: [monsterId("ash_mite")],
        roles: ["burn", "attack"],
        minCount: 1,
        maxCount: 1
      }
    ],
    rewardPoolId: rewardPoolId("normal")
  }
};

export const forestDuoEncounter: EncounterDefinition = {
  id: encounterId("forest_duo_encounter"),
  type: "combat",
  name: "Ashwood Duo",
  monsterIds: [monsterId("ash_mite"), monsterId("root_husk"), monsterId("training_slime")],
  tags: ["forest", "multi-enemy", "guard", "burn", "training"],
  authoring: {
    actId: "act1_forest",
    difficultyBand: "normal",
    budget: 5,
    monsterRoles: ["block", "burn", "attack", "slow-pressure", "training", "multi-enemy"],
    monsterGroups: [
      {
        id: monsterGroupId("forest_duo_burn_group"),
        monsterIds: [monsterId("ash_mite")],
        roles: ["burn", "attack"],
        minCount: 1,
        maxCount: 1
      },
      {
        id: monsterGroupId("forest_duo_guardian_group"),
        monsterIds: [monsterId("root_husk")],
        roles: ["block", "slow-pressure"],
        minCount: 1,
        maxCount: 1
      },
      {
        id: monsterGroupId("forest_duo_training_group"),
        monsterIds: [monsterId("training_slime")],
        roles: ["block", "training"],
        minCount: 1,
        maxCount: 1
      }
    ],
    rewardPoolId: rewardPoolId("normal")
  }
};

export const crowMiteEncounter: EncounterDefinition = {
  id: encounterId("crow_mite_encounter"),
  type: "combat",
  name: "Crow, Cinder Mite, and Root Husk",
  monsterIds: [monsterId("soot_crow"), monsterId("ash_mite"), monsterId("root_husk")],
  tags: ["forest", "multi-enemy", "information", "burn"],
  authoring: {
    actId: "act1_forest",
    difficultyBand: "hard",
    budget: 5,
    monsterRoles: ["information", "burn", "block", "frontline", "multi-enemy"],
    monsterGroups: [
      {
        id: monsterGroupId("crow_mite_crow_group"),
        monsterIds: [monsterId("soot_crow")],
        roles: ["information"],
        minCount: 1,
        maxCount: 1
      },
      {
        id: monsterGroupId("crow_mite_mite_group"),
        monsterIds: [monsterId("ash_mite")],
        roles: ["burn"],
        minCount: 1,
        maxCount: 1
      },
      {
        id: monsterGroupId("crow_mite_root_group"),
        monsterIds: [monsterId("root_husk")],
        roles: ["block", "frontline"],
        minCount: 1,
        maxCount: 1
      }
    ],
    rewardPoolId: rewardPoolId("normal")
  }
};

export const forestElitePlaceholder: EncounterDefinition = {
  id: encounterId("forest_elite_placeholder"),
  type: "elite",
  name: "Charred Stag Warband",
  monsterIds: [monsterId("charred_stag"), monsterId("ash_mite")],
  tags: ["forest", "elite", "beast", "burn", "adaptive", "multi-enemy"],
  rewardSeedSalt: "elite",
  authoring: {
    actId: "act1_forest",
    difficultyBand: "elite",
    budget: 7,
    monsterRoles: ["elite", "burn", "beast", "adaptive", "attack", "multi-enemy"],
    monsterGroups: [
      {
        id: monsterGroupId("charred_stag_group"),
        monsterIds: [monsterId("charred_stag")],
        roles: ["elite", "burn", "beast", "adaptive"],
        minCount: 1,
        maxCount: 1
      },
      {
        id: monsterGroupId("charred_stag_mite_group"),
        monsterIds: [monsterId("ash_mite")],
        roles: ["burn", "attack"],
        minCount: 1,
        maxCount: 1
      }
    ],
    rewardPoolId: rewardPoolId("elite")
  }
};

export const cinderScribeEncounter: EncounterDefinition = {
  id: encounterId("cinder_scribe_encounter"),
  type: "elite",
  name: "Cinder Scribe Escort",
  monsterIds: [monsterId("cinder_scribe"), monsterId("soot_crow"), monsterId("training_slime")],
  tags: ["forest", "rare-bearer", "information", "scribe", "multi-enemy"],
  rewardSeedSalt: "rare-card-bearer",
  rewardBearer: {
    bearerKind: "cardBearer",
    heldReward: { type: "playerCard", cardId: cardId("ash_rewrite"), rarity: "rare" },
    revealState: "rumored",
    dropRule: { chancePercent: 45, guaranteedFirstTime: true, pityKey: "ash_rewrite_first", fallbackRewardPoolId: rewardPoolId("elite") }
  },
  authoring: {
    actId: "act1_forest",
    difficultyBand: "rare",
    budget: 8,
    monsterRoles: ["rare-bearer", "information", "burn", "block", "training", "multi-enemy"],
    monsterGroups: [
      {
        id: monsterGroupId("cinder_scribe_group"),
        monsterIds: [monsterId("cinder_scribe")],
        roles: ["rare-bearer", "information"],
        minCount: 1,
        maxCount: 1
      },
      {
        id: monsterGroupId("cinder_scribe_crow_group"),
        monsterIds: [monsterId("soot_crow")],
        roles: ["information", "obscure"],
        minCount: 1,
        maxCount: 1
      },
      {
        id: monsterGroupId("cinder_scribe_slime_group"),
        monsterIds: [monsterId("training_slime")],
        roles: ["block", "training"],
        minCount: 1,
        maxCount: 1
      }
    ],
    rewardPoolId: rewardPoolId("elite")
  }
};

export const forestBossPlaceholder: EncounterDefinition = {
  id: encounterId("forest_boss_placeholder"),
  type: "boss",
  name: "Emberroot Warden Guard",
  monsterIds: [monsterId("forest_warden"), monsterId("training_slime"), monsterId("soot_crow")],
  tags: ["forest", "boss", "guardian", "burn", "adaptive", "multi-enemy"],
  rewardSeedSalt: "boss",
  authoring: {
    actId: "act1_forest",
    difficultyBand: "boss",
    budget: 10,
    monsterRoles: ["boss", "guardian", "burn", "adaptive", "block", "training", "information", "multi-enemy"],
    monsterGroups: [
      {
        id: monsterGroupId("forest_warden_group"),
        monsterIds: [monsterId("forest_warden")],
        roles: ["boss", "guardian", "burn", "adaptive"],
        minCount: 1,
        maxCount: 1
      },
      {
        id: monsterGroupId("forest_warden_slime_group"),
        monsterIds: [monsterId("training_slime")],
        roles: ["block", "training"],
        minCount: 1,
        maxCount: 1
      },
      {
        id: monsterGroupId("forest_warden_crow_group"),
        monsterIds: [monsterId("soot_crow")],
        roles: ["information", "obscure"],
        minCount: 1,
        maxCount: 1
      }
    ],
    rewardPoolId: rewardPoolId("boss")
  }
};

export const forestEncounters = [
  ashSlimeEncounter,
  cinderMiteEncounter,
  sootCrowEncounter,
  rootHuskEncounter,
  forestDuoEncounter,
  crowMiteEncounter,
  forestElitePlaceholder,
  cinderScribeEncounter,
  forestBossPlaceholder
] as const;
