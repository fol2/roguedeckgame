import { describe, expect, it } from "vitest";
import {
  cardId,
  getCardAbilityDescriptor,
  getEffectTargetProfile,
  getMonsterAbilityDescriptor,
  monsterAbilityId,
  petDefinitionId,
  starterRegistry,
  statusId,
  storyFlagId
} from "../../src/game-core";
import type { CardDefinition } from "../../src/game-core";

const createCard = (
  overrides: Pick<CardDefinition, "effects"> & Partial<CardDefinition>
): CardDefinition => ({
  id: cardId("descriptor_card"),
  name: "Descriptor Card",
  description: "Descriptor card.",
  type: "skill",
  cost: 1,
  tags: [],
  rarity: "common",
  ...overrides
});

describe("ability descriptors", () => {
  it.each([
    [
      "enemy",
      createCard({
        type: "attack",
        effects: [{ type: "damage", amount: 6, target: { type: "target" } }]
      })
    ],
    [
      "allEnemies",
      createCard({
        type: "attack",
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
      "petAndEnemy",
      createCard({
        type: "pet-command",
        requiresPetDefinitionId: petDefinitionId("ember_fox"),
        effects: [{ type: "petAttack", petTarget: { type: "leading" }, amount: 5, target: { type: "target" } }]
      })
    ],
    [
      "none",
      createCard({
        effects: [{ type: "setStoryFlag", flagId: storyFlagId("descriptor_story") }]
      })
    ]
  ] as const)("describes %s card target contracts", (expectedTargetKind, card) => {
    const descriptor = getCardAbilityDescriptor(card);

    expect(descriptor.source).toBe("card");
    expect(descriptor.targetProfile.targetKind).toBe(expectedTargetKind);
    expect(descriptor.targetProfile.requiresManualTarget).toBe(expectedTargetKind === "enemy" || expectedTargetKind === "petAndEnemy");
    expect(descriptor.effectSummaries.map((effect) => effect.type)).toEqual(card.effects.map((effect) => effect.type));
  });

  it("describes monster ability target contracts without requiring manual target input", () => {
    const ability = starterRegistry.monsterAbilities!.find((candidate) => candidate.id === monsterAbilityId("training_slime_attack"));
    if (!ability) {
      throw new Error("Expected Training Slime attack ability.");
    }

    const descriptor = getMonsterAbilityDescriptor(ability);

    expect(descriptor).toMatchObject({
      source: "monsterAbility",
      id: "training_slime_attack",
      displayRole: "attack",
      targetProfile: {
        targetKind: "enemy",
        playMode: "immediate",
        requiresTargetBinding: true,
        requiresManualTarget: false,
        usesDefaultTarget: true
      }
    });
    expect(descriptor.effectSummaries).toEqual([
      { type: "damage", amount: 6, combatantTarget: "target" }
    ]);
  });

  it("keeps status and pet target preview summaries stable for editors", () => {
    const card = createCard({
      type: "pet-command",
      requiresPetDefinitionId: petDefinitionId("ember_fox"),
      effects: [
        { type: "applyStatus", statusId: statusId("burn"), stacks: 2, duration: 3, target: { type: "allEnemies" } },
        { type: "petReact", petTarget: { type: "withTag", tag: "fox" }, reaction: "guard" }
      ]
    });

    expect(getCardAbilityDescriptor(card).effectSummaries).toEqual([
      { type: "applyStatus", combatantTarget: "allEnemies", statusId: "burn", stacks: 2, duration: 3 },
      { type: "petReact", petTarget: "withTag", reaction: "guard" }
    ]);
  });

  it("summarises required scalar payloads for editor-safe effect previews", () => {
    const descriptor = getCardAbilityDescriptor(createCard({
      effects: [
        { type: "createCard", cardId: cardId("strike"), to: "draw" },
        { type: "cleanseStatus", statusId: statusId("burn"), tagsAny: ["debuff"], stacks: 1, target: { type: "self" } },
        { type: "setStoryFlag", flagId: storyFlagId("descriptor_story") }
      ]
    }));

    expect(descriptor.effectSummaries).toEqual([
      { type: "createCard", cardId: "strike", to: "draw" },
      { type: "cleanseStatus", combatantTarget: "self", statusId: "burn", stacks: 1, tagsAny: ["debuff"] },
      { type: "setStoryFlag", flagId: "descriptor_story" }
    ]);
  });

  it("supports all-allies target contracts for future shared abilities", () => {
    const profile = getEffectTargetProfile([
      { type: "block", amount: 3, target: { type: "allAllies" } }
    ]);

    expect(profile).toMatchObject({
      targetKind: "allAllies",
      requiresManualTarget: false,
      targetsAllAllies: true
    });
  });
});
