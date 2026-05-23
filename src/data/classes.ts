import type { ClassDefinition, ClassId } from "../engine/types";

export const CLASSES: ClassDefinition[] = [
  {
    id: "iron-warden",
    name: "Iron Warden",
    epithet: "Keeper of old oaths",
    description: "A plate-bound guardian who turns defence into pressure.",
    assetId: "actor-iron-warden",
    classCardIds: [
      "iron-warden-strike",
      "iron-warden-defend",
      "iron-warden-super-attack",
      "iron-warden-thorn-riposte",
      "iron-warden-battle-chant",
    ],
    starterCardIds: ["iron-warden-strike", "iron-warden-defend", "general-field-mend"],
  },
  {
    id: "spellblade",
    name: "Spellblade",
    epithet: "Blade of the moon gate",
    description: "A quick duellist who bends action economy through rune craft.",
    assetId: "actor-spellblade",
    classCardIds: [
      "spellblade-strike",
      "spellblade-defend",
      "spellblade-super-attack",
      "spellblade-arcane-siphon",
      "spellblade-mirror-step",
    ],
    starterCardIds: ["spellblade-strike", "spellblade-defend", "general-field-mend"],
  },
];

export const CLASS_BY_ID = Object.fromEntries(CLASSES.map((role) => [role.id, role]));

export function getClass(classId: ClassId): ClassDefinition {
  const role = CLASS_BY_ID[classId];

  if (!role) {
    throw new Error(`Unknown class: ${classId}`);
  }

  return role;
}
