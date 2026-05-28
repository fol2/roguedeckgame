import { describe, expect, it } from "vitest";
import {
  attackCard,
  blockEffect,
  cardId,
  damageEffect,
  drawEffect,
  monsterAbilityId,
  monsterId,
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
        cards: 25,
        statuses: 2,
        pets: 1,
        monsterAbilities: 27,
        monsters: 7,
        encounters: 9,
        runMapTemplates: 1,
        petUpgrades: 3,
        playerClassModifiers: 1
      },
      cardRarities: ["common", "rare", "starter", "uncommon"],
      cardTags: [
        "area",
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
        "keeper",
        "legacy",
        "mark",
        "pet",
        "rare",
        "reveal",
        "scope",
        "scout",
        "setup",
        "signal"
      ],
      effectTypes: [
        "applyStatus",
        "block",
        "cleanseStatus",
        "damage",
        "draw",
        "improveIntentVisibility",
        "obscureIntent",
        "petAttack",
        "petBlock",
        "petReact",
        "scopeIntent"
      ],
      statusIds: ["burn", "next_attack_boost"],
      runtimeSupportedStatusIds: ["burn", "next_attack_boost"],
      metadataOnlyStatusIds: [],
      statusBehaviourTypes: ["duration", "startOfTurnDamage", "statusImmunity"],
      petModifierRuleTypes: [
        "modifyPetCommandCost",
        "modifyPetCommandEffectAmount",
        "triggerOnEnemyDefeatedWithStatus"
      ],
      playerClassModifierIds: ["field_sense"],
      playerClassModifierRuleTypes: [
        "intentVisibilityPassive",
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

  it("keeps p3/23 Ashwood Trail enemy deck counts and costs aligned", () => {
    const monsterById = new Map(starterRegistry.monsters.map((monster) => [monster.id, monster]));
    const deckEntry = (monsterKey: ReturnType<typeof monsterId>, abilityKey: ReturnType<typeof monsterAbilityId>) =>
      monsterById.get(monsterKey)?.cardGame?.deck.find((entry) => entry.abilityId === abilityKey);

    expect(deckEntry(monsterId("training_slime"), monsterAbilityId("training_slime_attack"))).toMatchObject({ copies: 3, cost: 1 });
    expect(deckEntry(monsterId("ash_mite"), monsterAbilityId("ash_mite_burn"))).toMatchObject({ copies: 2, cost: 1 });
    expect(deckEntry(monsterId("soot_crow"), monsterAbilityId("soot_crow_flutter"))).toMatchObject({ copies: 2, cost: 1 });
    expect(deckEntry(monsterId("charred_stag"), monsterAbilityId("charred_stag_guarded_snort"))).toMatchObject({ copies: 2, cost: 1 });
    expect(deckEntry(monsterId("charred_stag"), monsterAbilityId("charred_stag_paw_the_ash"))).toMatchObject({ copies: 1, cost: 1 });
    expect(deckEntry(monsterId("charred_stag"), monsterAbilityId("charred_stag_crown_flare"))).toMatchObject({ copies: 1, cost: 1 });
    expect(deckEntry(monsterId("cinder_scribe"), monsterAbilityId("cinder_scribe_smudge"))).toMatchObject({ copies: 2, cost: 1 });
    expect(deckEntry(monsterId("cinder_scribe"), monsterAbilityId("cinder_scribe_borrowed_line"))).toMatchObject({ copies: 1, cost: 1 });
    expect(deckEntry(monsterId("forest_warden"), monsterAbilityId("forest_warden_old_flame"))).toMatchObject({ copies: 2, cost: 1 });
    expect(deckEntry(monsterId("forest_warden"), monsterAbilityId("emberroot_warden_root_bind"))).toMatchObject({ copies: 1, cost: 1 });
    expect(deckEntry(monsterId("forest_warden"), monsterAbilityId("emberroot_warden_command"))).toMatchObject({ copies: 1, cost: 1 });
  });

  it("keeps p3/23 setup enemy abilities backed by runtime effects", () => {
    const abilityById = new Map((starterRegistry.monsterAbilities ?? []).map((ability) => [ability.id, ability]));
    const effects = (abilityKey: ReturnType<typeof monsterAbilityId>) => abilityById.get(abilityKey)?.effects ?? [];

    expect(effects(monsterAbilityId("root_husk_ember_sap"))).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "applyStatus", statusId: "next_attack_boost", stacks: 3, target: { type: "self" } })
    ]));
    expect(effects(monsterAbilityId("charred_stag_paw_the_ash"))).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "applyStatus", statusId: "next_attack_boost", stacks: 5, target: { type: "self" } })
    ]));
    expect(effects(monsterAbilityId("cinder_scribe_borrowed_line"))).toEqual([
      { type: "draw", amount: 1 }
    ]);
    expect(effects(monsterAbilityId("emberroot_warden_ash_bloom"))).toEqual([
      { type: "applyStatus", statusId: "next_attack_boost", stacks: 3, target: { type: "self" } }
    ]);
    expect(effects(monsterAbilityId("emberroot_warden_command"))).toEqual([
      { type: "block", amount: 2, target: { type: "allAllies" } }
    ]);
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
