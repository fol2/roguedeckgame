import { encounterId, monsterId } from "../../ids";
import type { EncounterDefinition } from "../../model/encounter";

export const trainingSlimeEncounter: EncounterDefinition = {
  id: encounterId("training_slime_encounter"),
  type: "combat",
  name: "Training Slime",
  monsterIds: [monsterId("training_slime")],
  tags: ["forest", "training"]
};

export const ashMiteEncounter: EncounterDefinition = {
  id: encounterId("ash_mite_encounter"),
  type: "combat",
  name: "Ash Mite",
  monsterIds: [monsterId("ash_mite")],
  tags: ["forest", "burn"]
};

export const forestDuoEncounter: EncounterDefinition = {
  id: encounterId("forest_duo_encounter"),
  type: "combat",
  name: "Forest Duo",
  monsterIds: [monsterId("training_slime"), monsterId("ash_mite")],
  tags: ["forest", "multi-enemy"]
};

export const forestElitePlaceholder: EncounterDefinition = {
  id: encounterId("forest_elite_placeholder"),
  type: "elite",
  name: "Forest Elite Placeholder",
  monsterIds: [monsterId("ash_mite"), monsterId("ash_mite")],
  tags: ["forest", "elite", "placeholder"],
  rewardSeedSalt: "elite"
};

export const forestBossPlaceholder: EncounterDefinition = {
  id: encounterId("forest_boss_placeholder"),
  type: "boss",
  name: "Forest Boss Placeholder",
  monsterIds: [monsterId("training_slime"), monsterId("ash_mite")],
  tags: ["forest", "boss", "placeholder"],
  rewardSeedSalt: "boss"
};

export const forestEncounters = [
  trainingSlimeEncounter,
  ashMiteEncounter,
  forestDuoEncounter,
  forestElitePlaceholder,
  forestBossPlaceholder
] as const;
