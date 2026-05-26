import { describe, expect, it } from "vitest";
import {
  attackCard,
  blockEffect,
  buildContentReport,
  cardId,
  damageEffect,
  drawEffect,
  petCommandCard,
  petDefinitionId,
  petReactEffect,
  starterRegistry
} from "../../src/game-core";

describe("content authoring helpers", () => {
  it("creates plain card definitions with explicit effects", () => {
    expect(attackCard({
      id: cardId("test_attack"),
      name: "Test Attack",
      description: "Deal test damage.",
      cost: 1,
      tags: ["attack"],
      rarity: "common",
      effects: [damageEffect(3, { type: "target" })]
    })).toEqual({
      id: cardId("test_attack"),
      name: "Test Attack",
      description: "Deal test damage.",
      type: "attack",
      cost: 1,
      tags: ["attack"],
      rarity: "common",
      effects: [{ type: "damage", amount: 3, target: { type: "target" } }]
    });

    expect(petCommandCard({
      id: cardId("test_command"),
      name: "Test Command",
      description: "Command a pet.",
      cost: 1,
      tags: ["pet", "command"],
      requiresPetDefinitionId: petDefinitionId("ember_fox"),
      effects: [
        blockEffect(2, { type: "self" }),
        drawEffect(1),
        petReactEffect({ type: "leading" }, "test")
      ]
    })).toMatchObject({
      type: "pet-command",
      requiresPetDefinitionId: petDefinitionId("ember_fox"),
      effects: [
        { type: "block", amount: 2, target: { type: "self" } },
        { type: "draw", amount: 1 },
        { type: "petReact", petTarget: { type: "leading" }, reaction: "test" }
      ]
    });
  });

  it("builds a deterministic starter content report", () => {
    expect(buildContentReport(starterRegistry)).toEqual({
      counts: {
        cards: 12,
        statuses: 1,
        pets: 1,
        monsters: 4,
        encounters: 5,
        runMapTemplates: 1,
        petUpgrades: 3,
        playerClassModifiers: 0
      },
      cardRarities: ["common", "starter", "uncommon"],
      cardTags: [
        "attack",
        "block",
        "burn",
        "combo",
        "command",
        "draw",
        "fetch",
        "fire",
        "fox",
        "guard",
        "pet",
        "setup"
      ],
      effectTypes: [
        "applyStatus",
        "block",
        "damage",
        "draw",
        "petAttack",
        "petReact"
      ],
      statusIds: ["burn"],
      runtimeSupportedStatusIds: ["burn"],
      metadataOnlyStatusIds: [],
      statusBehaviourTypes: ["startOfTurnDamage"],
      petModifierRuleTypes: [
        "modifyPetCommandCost",
        "modifyPetCommandEffectAmount",
        "triggerOnEnemyDefeatedWithStatus"
      ],
      playerClassModifierIds: [],
      encounterTypes: ["boss", "combat", "elite"],
      runMapNodeTypes: ["boss", "combat", "elite", "event", "rest"]
    });
  });
});
