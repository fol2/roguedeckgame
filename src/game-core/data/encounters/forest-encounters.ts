import { cardId, encounterId, monsterGroupId, monsterId, rewardPoolId } from "../../ids";
import type { EncounterDefinition } from "../../model/encounter";

export const ashSlimeEncounter: EncounterDefinition = {
  id: encounterId("training_slime_encounter"),
  type: "combat",
  name: "Ash Slime",
  monsterIds: [monsterId("training_slime")],
  tags: ["forest", "tutorial", "attack", "guard"],
  authoring: {
    actId: "act1_forest",
    difficultyBand: "tutorial",
    budget: 1,
    monsterRoles: ["training", "block"],
    monsterGroups: [{
      id: monsterGroupId("ash_slime_group"),
      monsterIds: [monsterId("training_slime")],
      roles: ["training", "block"],
      minCount: 1,
      maxCount: 1
    }],
    rewardPoolId: rewardPoolId("normal")
  }
};

export const cinderMiteEncounter: EncounterDefinition = {
  id: encounterId("ash_mite_encounter"),
  type: "combat",
  name: "Cinder Mite",
  monsterIds: [monsterId("ash_mite")],
  tags: ["forest", "burn", "debuff"],
  authoring: {
    actId: "act1_forest",
    difficultyBand: "easy",
    budget: 2,
    monsterRoles: ["burn", "attack"],
    monsterGroups: [{
      id: monsterGroupId("cinder_mite_group"),
      monsterIds: [monsterId("ash_mite")],
      roles: ["burn", "attack"],
      minCount: 1,
      maxCount: 1
    }],
    rewardPoolId: rewardPoolId("normal")
  }
};

export const sootCrowEncounter: EncounterDefinition = {
  id: encounterId("soot_crow_encounter"),
  type: "combat",
  name: "Soot Crow",
  monsterIds: [monsterId("soot_crow")],
  tags: ["forest", "information", "obscure"],
  authoring: {
    actId: "act1_forest",
    difficultyBand: "normal",
    budget: 3,
    monsterRoles: ["information", "obscure", "burn"],
    monsterGroups: [{
      id: monsterGroupId("soot_crow_group"),
      monsterIds: [monsterId("soot_crow")],
      roles: ["information", "obscure"],
      minCount: 1,
      maxCount: 1
    }],
    rewardPoolId: rewardPoolId("normal")
  }
};

export const rootHuskEncounter: EncounterDefinition = {
  id: encounterId("root_husk_encounter"),
  type: "combat",
  name: "Root Husk",
  monsterIds: [monsterId("root_husk")],
  tags: ["forest", "guard", "burn-answer"],
  authoring: {
    actId: "act1_forest",
    difficultyBand: "normal",
    budget: 3,
    monsterRoles: ["block", "frontline", "slow-pressure"],
    monsterGroups: [{
      id: monsterGroupId("root_husk_group"),
      monsterIds: [monsterId("root_husk")],
      roles: ["block", "frontline"],
      minCount: 1,
      maxCount: 1
    }],
    rewardPoolId: rewardPoolId("normal")
  }
};

export const forestDuoEncounter: EncounterDefinition = {
  id: encounterId("forest_duo_encounter"),
  type: "combat",
  name: "Ashwood Duo",
  monsterIds: [monsterId("training_slime"), monsterId("ash_mite")],
  tags: ["forest", "multi-enemy"],
  authoring: {
    actId: "act1_forest",
    difficultyBand: "normal",
    budget: 3,
    monsterRoles: ["block", "burn", "multi-enemy"],
    monsterGroups: [
      {
        id: monsterGroupId("forest_duo_frontline_group"),
        monsterIds: [monsterId("training_slime")],
        roles: ["block", "frontline"],
        minCount: 1,
        maxCount: 1
      },
      {
        id: monsterGroupId("forest_duo_burn_group"),
        monsterIds: [monsterId("ash_mite")],
        roles: ["burn", "attack"],
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
  name: "Crow and Cinder Mite",
  monsterIds: [monsterId("soot_crow"), monsterId("ash_mite")],
  tags: ["forest", "multi-enemy", "information", "burn"],
  authoring: {
    actId: "act1_forest",
    difficultyBand: "normal",
    budget: 4,
    monsterRoles: ["information", "burn", "multi-enemy"],
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
      }
    ],
    rewardPoolId: rewardPoolId("normal")
  }
};

export const forestElitePlaceholder: EncounterDefinition = {
  id: encounterId("forest_elite_placeholder"),
  type: "elite",
  name: "Charred Stag",
  monsterIds: [monsterId("charred_stag")],
  tags: ["forest", "elite", "beast", "burn", "adaptive"],
  rewardSeedSalt: "elite",
  authoring: {
    actId: "act1_forest",
    difficultyBand: "elite",
    budget: 5,
    monsterRoles: ["elite", "burn", "beast", "adaptive"],
    monsterGroups: [{
      id: monsterGroupId("charred_stag_group"),
      monsterIds: [monsterId("charred_stag")],
      roles: ["elite", "burn", "beast", "adaptive"],
      minCount: 1,
      maxCount: 1
    }],
    rewardPoolId: rewardPoolId("elite")
  }
};

export const cinderScribeEncounter: EncounterDefinition = {
  id: encounterId("cinder_scribe_encounter"),
  type: "elite",
  name: "Cinder Scribe",
  monsterIds: [monsterId("cinder_scribe")],
  tags: ["forest", "rare-bearer", "information", "scribe"],
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
    budget: 5,
    monsterRoles: ["rare-bearer", "information", "burn"],
    monsterGroups: [{
      id: monsterGroupId("cinder_scribe_group"),
      monsterIds: [monsterId("cinder_scribe")],
      roles: ["rare-bearer", "information"],
      minCount: 1,
      maxCount: 1
    }],
    rewardPoolId: rewardPoolId("elite")
  }
};

export const forestBossPlaceholder: EncounterDefinition = {
  id: encounterId("forest_boss_placeholder"),
  type: "boss",
  name: "Emberroot Warden",
  monsterIds: [monsterId("forest_warden")],
  tags: ["forest", "boss", "guardian", "burn", "adaptive"],
  rewardSeedSalt: "boss",
  authoring: {
    actId: "act1_forest",
    difficultyBand: "boss",
    budget: 8,
    monsterRoles: ["boss", "guardian", "burn", "adaptive"],
    monsterGroups: [{
      id: monsterGroupId("forest_warden_group"),
      monsterIds: [monsterId("forest_warden")],
      roles: ["boss", "guardian", "burn", "adaptive"],
      minCount: 1,
      maxCount: 1
    }],
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
