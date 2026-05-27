import { describe, expect, it } from "vitest";
import {
  attackCard,
  blockEffect,
  cardId,
  damageEffect,
  drawEffect,
  petModifierId,
  petCommandCard,
  petDefinitionId,
  petReactEffect,
  starterRegistry
} from "../../src/game-core";
import { buildContentReport } from "../../src/game-core/testing";

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
    const report = buildContentReport(starterRegistry);

    expect(report).toMatchObject({
      counts: {
        cards: 12,
        statuses: 1,
        pets: 1,
        monsterAbilities: 10,
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
      statusBehaviourTypes: ["duration", "startOfTurnDamage", "statusImmunity"],
      petModifierRuleTypes: [
        "modifyPetCommandCost",
        "modifyPetCommandEffectAmount",
        "triggerOnEnemyDefeatedWithStatus"
      ],
      playerClassModifierIds: [],
      playerClassModifierRuleTypes: [
        "triggerOnCardPlayed",
        "triggerOnStatusApplied"
      ],
      deckOperationRewardTypes: ["remove", "transform", "upgrade"],
      scheduledMonsterIds: [],
      encounterTypes: ["boss", "combat", "elite"],
      runMapNodeTypes: ["boss", "combat", "elite", "event", "rest"]
    });
    expect(report.dependencyReferenceCount).toBeGreaterThan(0);
    expect(report.dependencyMissingReferenceCount).toBe(0);
    expect(report.unusedCardIds).toEqual([]);
    expect(report.unusedStatusIds).toEqual([]);
  });

  it("includes standalone pet modifiers in content report rule and effect coverage", () => {
    const report = buildContentReport({
      ...starterRegistry,
      petUpgrades: [],
      petModifiers: [{
        id: petModifierId("standalone_report_modifier"),
        name: "Standalone Report Modifier",
        description: "A modifier only attached through the standalone registry collection.",
        tags: ["test"],
        rules: [{
          type: "triggerOnEnemyDefeatedWithStatus",
          requiredStatusId: starterRegistry.statuses![0].id,
          effects: [{ type: "gainEnergy", amount: 1 }]
        }]
      }]
    });

    expect(report.petModifierRuleTypes).toContain("triggerOnEnemyDefeatedWithStatus");
    expect(report.effectTypes).toContain("gainEnergy");
    expect(report.counts.petUpgrades).toBe(0);
    expect(report.counts.petModifiers).toBe(1);
  });
});
