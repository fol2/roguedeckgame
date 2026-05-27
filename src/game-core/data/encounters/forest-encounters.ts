import { encounterId, monsterGroupId, monsterId, rewardPoolId } from "../../ids";
import type { EncounterDefinition } from "../../model/encounter";

export const trainingSlimeEncounter: EncounterDefinition = {
  id: encounterId("training_slime_encounter"),
  type: "combat",
  name: "Training Slime",
  monsterIds: [monsterId("training_slime")],
  tags: ["forest", "training"],
  authoring: {
    actId: "act1_forest",
    difficultyBand: "tutorial",
    budget: 1,
    monsterRoles: ["training", "block"],
    monsterGroups: [{
      id: monsterGroupId("training_slime_group"),
      monsterIds: [monsterId("training_slime")],
      roles: ["training", "block"],
      minCount: 1,
      maxCount: 1
    }],
    rewardPoolId: rewardPoolId("normal")
  }
};

export const ashMiteEncounter: EncounterDefinition = {
  id: encounterId("ash_mite_encounter"),
  type: "combat",
  name: "Ash Mite",
  monsterIds: [monsterId("ash_mite")],
  tags: ["forest", "burn"],
  authoring: {
    actId: "act1_forest",
    difficultyBand: "easy",
    budget: 2,
    monsterRoles: ["burn", "attack"],
    monsterGroups: [{
      id: monsterGroupId("ash_mite_group"),
      monsterIds: [monsterId("ash_mite")],
      roles: ["burn", "attack"],
      minCount: 1,
      maxCount: 1
    }],
    rewardPoolId: rewardPoolId("normal")
  }
};

export const forestDuoEncounter: EncounterDefinition = {
  id: encounterId("forest_duo_encounter"),
  type: "combat",
  name: "Forest Duo",
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

export const forestElitePlaceholder: EncounterDefinition = {
  id: encounterId("forest_elite_placeholder"),
  type: "elite",
  name: "Charred Stag",
  monsterIds: [monsterId("charred_stag")],
  tags: ["forest", "elite", "beast", "burn"],
  rewardSeedSalt: "elite",
  authoring: {
    actId: "act1_forest",
    difficultyBand: "elite",
    budget: 5,
    monsterRoles: ["elite", "burn", "beast"],
    monsterGroups: [{
      id: monsterGroupId("charred_stag_group"),
      monsterIds: [monsterId("charred_stag")],
      roles: ["elite", "burn", "beast"],
      minCount: 1,
      maxCount: 1
    }],
    rewardPoolId: rewardPoolId("elite")
  }
};

export const forestBossPlaceholder: EncounterDefinition = {
  id: encounterId("forest_boss_placeholder"),
  type: "boss",
  name: "Forest Warden",
  monsterIds: [monsterId("forest_warden")],
  tags: ["forest", "boss", "guardian", "burn"],
  rewardSeedSalt: "boss",
  authoring: {
    actId: "act1_forest",
    difficultyBand: "boss",
    budget: 8,
    monsterRoles: ["boss", "guardian", "burn"],
    monsterGroups: [{
      id: monsterGroupId("forest_warden_group"),
      monsterIds: [monsterId("forest_warden")],
      roles: ["boss", "guardian", "burn"],
      minCount: 1,
      maxCount: 1
    }],
    rewardPoolId: rewardPoolId("boss")
  }
};

export const forestEncounters = [
  trainingSlimeEncounter,
  ashMiteEncounter,
  forestDuoEncounter,
  forestElitePlaceholder,
  forestBossPlaceholder
] as const;
