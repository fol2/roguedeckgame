import { describe, expect, it } from "vitest";
import {
  cardId,
  effectDescriptorList,
  getCardActionProfile,
  getEffectDescriptor,
  knownEffectTypes,
  petDefinitionId,
  statusId,
  storyFlagId
} from "../../src/game-core";
import type { CardDefinition } from "../../src/game-core";

const createCard = (
  overrides: Pick<CardDefinition, "effects"> & Partial<CardDefinition>
): CardDefinition => ({
  id: cardId("test_card"),
  name: "Test Card",
  description: "Test card.",
  type: "skill",
  cost: 1,
  tags: [],
  rarity: "common",
  ...overrides
});

describe("card action profiles", () => {
  it("keeps effect descriptors aligned with known effect types", () => {
    expect(effectDescriptorList.map((descriptor) => descriptor.type).sort()).toEqual([...knownEffectTypes].sort());
    expect(getEffectDescriptor("damage")).toMatchObject({
      combatantTarget: "required",
      petTarget: "none",
      amount: "nonNegativeNumber",
      resolverKey: "damageLike"
    });
    expect(getEffectDescriptor("petReact")).toMatchObject({
      combatantTarget: "none",
      petTarget: "required",
      requiresPetReaction: true,
      resolverKey: "petReact"
    });
  });

  it.each([
    [
      "enemy",
      createCard({
        effects: [{ type: "damage", amount: 6, target: { type: "target" } }]
      })
    ],
    [
      "allEnemies",
      createCard({
        effects: [{ type: "damage", amount: 4, target: { type: "allEnemies" } }]
      })
    ],
    [
      "self",
      createCard({
        effects: [{ type: "block", amount: 5, target: { type: "self" } }]
      })
    ],
    [
      "pet",
      createCard({
        type: "pet-command",
        requiresPetDefinitionId: petDefinitionId("ember_fox"),
        effects: [{ type: "petReact", petTarget: { type: "leading" }, reaction: "guard" }]
      })
    ],
    [
      "petAndEnemy",
      createCard({
        type: "pet-command",
        requiresPetDefinitionId: petDefinitionId("ember_fox"),
        effects: [{ type: "petAttack", petTarget: { type: "leading" }, amount: 5, target: { type: "target" } }]
      })
    ],
    [
      "petAndSelf",
      createCard({
        type: "pet-command",
        requiresPetDefinitionId: petDefinitionId("ember_fox"),
        effects: [{ type: "petBlock", petTarget: { type: "leading" }, amount: 4, target: { type: "self" } }]
      })
    ],
    [
      "none",
      createCard({
        effects: [{ type: "setStoryFlag", flagId: storyFlagId("story_flag") }]
      })
    ]
  ] as const)("derives %s target kind from effects", (expectedTargetKind, card) => {
    const profile = getCardActionProfile(card);

    expect(profile.targetKind).toBe(expectedTargetKind);
    expect(profile.playMode).toBe(expectedTargetKind === "enemy" || expectedTargetKind === "petAndEnemy" ? "selectEnemy" : "immediate");
    expect(profile.requiresManualTarget).toBe(expectedTargetKind === "enemy" || expectedTargetKind === "petAndEnemy");
  });

  it("keeps all-enemies cards targetless even when they deal damage", () => {
    const profile = getCardActionProfile(createCard({
      effects: [
        { type: "damage", amount: 4, target: { type: "allEnemies" } },
        { type: "applyStatus", statusId: statusId("burn"), stacks: 1, target: { type: "allEnemies" } }
      ]
    }));

    expect(profile).toMatchObject({
      targetKind: "allEnemies",
      requiresActionTarget: false,
      requiresManualTarget: false,
      targetsAllEnemies: true
    });
  });
});
