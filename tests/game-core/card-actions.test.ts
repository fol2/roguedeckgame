import { describe, expect, it } from "vitest";
import {
  cardId,
  effectDescriptorList,
  getCardActionProfile,
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
    expect(Object.fromEntries(effectDescriptorList.map((descriptor) => [descriptor.type, descriptor]))).toMatchObject({
      damage: { combatantTarget: "required", petTarget: "none", amount: "nonNegativeNumber", resolverKey: "damageLike" },
      block: { combatantTarget: "required", petTarget: "none", amount: "nonNegativeNumber", resolverKey: "blockLike" },
      draw: { combatantTarget: "none", petTarget: "none", amount: "nonNegativeInteger", resolverKey: "draw" },
      applyStatus: { combatantTarget: "required", petTarget: "none", amount: "none", requiresStatusId: true, requiresStacks: true, resolverKey: "applyStatus" },
      petAttack: { combatantTarget: "required", petTarget: "required", amount: "nonNegativeNumber", resolverKey: "damageLike" },
      petBlock: { combatantTarget: "required", petTarget: "required", amount: "nonNegativeNumber", resolverKey: "blockLike" },
      petReact: { combatantTarget: "none", petTarget: "required", amount: "none", requiresPetReaction: true, resolverKey: "petReact" },
      setStoryFlag: { combatantTarget: "none", petTarget: "none", amount: "none", requiresStoryFlagId: true, resolverKey: "storyFlag" }
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

  it("preserves the existing card target kind contract for all-allies effects", () => {
    const profile = getCardActionProfile(createCard({
      effects: [{ type: "block", amount: 3, target: { type: "allAllies" } }]
    }));

    expect(profile).toMatchObject({
      targetKind: "self",
      playMode: "immediate",
      requiresManualTarget: false,
      targetsSelf: false,
      targetsAllEnemies: false
    });
  });
});
