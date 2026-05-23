import type { EncounterDefinition } from "../engine/types";

export const ENCOUNTERS: EncounterDefinition[] = [
  {
    id: "ashen-goblin",
    name: "Ashen Goblin",
    kind: "monster",
    maxHealth: 24,
    assetId: "monster-ashen-goblin",
    intentSequence: [
      { type: "attack", amount: 5, label: "Rusty jab", cue: "attack" },
      { type: "guard", amount: 4, label: "Scrap guard", cue: "defend" },
    ],
  },
  {
    id: "crystal-wolf",
    name: "Crystal Wolf",
    kind: "monster",
    maxHealth: 30,
    assetId: "monster-crystal-wolf",
    intentSequence: [
      { type: "attack", amount: 7, label: "Shatter bite", cue: "attack" },
      { type: "attack", amount: 4, label: "Glass rake", cue: "attack" },
    ],
  },
  {
    id: "mire-shaman",
    name: "Mire Shaman",
    kind: "monster",
    maxHealth: 34,
    assetId: "monster-mire-shaman",
    intentSequence: [
      { type: "guard", amount: 6, label: "Bog ward", cue: "shield" },
      { type: "attack", amount: 8, label: "Hex bolt", cue: "attack" },
    ],
  },
  {
    id: "obsidian-drake",
    name: "Obsidian Drake",
    kind: "boss",
    maxHealth: 64,
    assetId: "boss-obsidian-drake",
    intentSequence: [
      { type: "attack", amount: 10, label: "Cinder breath", cue: "super-attack" },
      { type: "guard", amount: 8, label: "Basalt hide", cue: "shield" },
      { type: "attack", amount: 13, label: "Wing crush", cue: "attack" },
    ],
  },
];

export const ENCOUNTER_BY_ID = Object.fromEntries(
  ENCOUNTERS.map((encounter) => [encounter.id, encounter]),
);

export function getEncounter(encounterId: string): EncounterDefinition {
  const encounter = ENCOUNTER_BY_ID[encounterId];

  if (!encounter) {
    throw new Error(`Unknown encounter: ${encounterId}`);
  }

  return encounter;
}
