import { describe, expect, it } from "vitest";
import {
  cardId,
  monsterAbilityId,
  monsterIntentId,
  runNodeId,
  starterRegistry,
  upgradeId
} from "../../src/game-core";
import {
  createAgentRunDriver,
  checkAgentRunInvariants
} from "../../src/game-core/testing";

describe("agent simulation invariants", () => {
  it("passes a clean driver snapshot", () => {
    const driver = createAgentRunDriver({ seed: "invariant-clean" });

    expect(checkAgentRunInvariants(driver.getSnapshot()).ok).toBe(true);
  });

  it("fails duplicate card instances across piles", () => {
    const driver = createAgentRunDriver({ seed: "invariant-duplicate-card" });
    driver.applyAction({ type: "selectMapNode", nodeId: runNodeId("act1_forest_0_combat_a") }, "legal");
    const snapshot = driver.getSnapshot();
    const duplicated = {
      ...snapshot,
      combat: {
        ...snapshot.combat!,
        discardPile: [...snapshot.combat!.discardPile, snapshot.combat!.hand[0]]
      }
    };

    expect(checkAgentRunInvariants(duplicated).issues.map((issue) => issue.code)).toContain("duplicate_card_instance_across_piles");
  });

  it("fails reward status mismatch", () => {
    const driver = createAgentRunDriver({ seed: "invariant-reward" });
    const snapshot = driver.getSnapshot();
    const mismatched = {
      ...snapshot,
      run: {
        ...snapshot.run,
        status: "reward" as const
      }
    };

    expect(checkAgentRunInvariants(mismatched).issues.map((issue) => issue.code)).toContain("reward_status_without_open_offer");
  });

  it("fails missing active pet instance", () => {
    const driver = createAgentRunDriver({ seed: "invariant-pet" });
    const snapshot = { ...driver.getSnapshot(), petInstances: [] };

    expect(checkAgentRunInvariants(snapshot).issues.map((issue) => issue.code)).toContain("missing_active_pet_instance");
  });

  it("fails won combat with alive monster and lost combat with alive player", () => {
    const driver = createAgentRunDriver({ seed: "invariant-combat-outcomes" });
    driver.applyAction(driver.getLegalActions()[0], "legal");
    const snapshot = driver.getSnapshot();

    const wonWithAliveMonster = {
      ...snapshot,
      combat: { ...snapshot.combat!, phase: "won" as const }
    };
    const lostWithAlivePlayer = {
      ...snapshot,
      combat: { ...snapshot.combat!, phase: "lost" as const }
    };

    expect(checkAgentRunInvariants(wonWithAliveMonster).issues.map((issue) => issue.code)).toContain("won_combat_with_alive_monster");
    expect(checkAgentRunInvariants(lostWithAlivePlayer).issues.map((issue) => issue.code)).toContain("lost_combat_with_alive_player");
  });

  it("fails active monster intents without matching planned abilities", () => {
    const driver = createAgentRunDriver({ seed: "invariant-unplanned-intent" });
    driver.applyAction(driver.getLegalActions()[0], "legal");
    const snapshot = driver.getSnapshot();
    const broken = {
      ...snapshot,
      combat: { ...snapshot.combat!, plannedMonsterAbilities: [] }
    };

    expect(checkAgentRunInvariants(broken).issues.map((issue) => issue.code)).toContain("monster_intent_without_planned_ability");
  });

  it("fails planned monster abilities without matching active intents", () => {
    const driver = createAgentRunDriver({ seed: "invariant-stale-planned-ability" });
    driver.applyAction(driver.getLegalActions()[0], "legal");
    const snapshot = driver.getSnapshot();
    const broken = {
      ...snapshot,
      combat: {
        ...snapshot.combat!,
        monsterIntents: [],
        plannedMonsterAbilities: [
          {
            monsterCombatantId: snapshot.combat!.monsters[0].id,
            intentId: monsterIntentId("training_slime_attack"),
            abilityId: monsterAbilityId("training_slime_attack")
          }
        ]
      }
    };

    expect(checkAgentRunInvariants(broken).issues.map((issue) => issue.code)).toContain("planned_ability_without_monster_intent");
  });

  it("fails duplicate planned monster abilities", () => {
    const driver = createAgentRunDriver({ seed: "invariant-duplicate-planned-ability" });
    driver.applyAction(driver.getLegalActions()[0], "legal");
    const snapshot = driver.getSnapshot();
    const plannedAbility = snapshot.combat!.plannedMonsterAbilities![0];
    const broken = {
      ...snapshot,
      combat: {
        ...snapshot.combat!,
        plannedMonsterAbilities: [plannedAbility, plannedAbility]
      }
    };

    expect(checkAgentRunInvariants(broken).issues.map((issue) => issue.code)).toContain("duplicate_planned_monster_ability");
  });

  it("fails planned monster ability id mismatches", () => {
    const driver = createAgentRunDriver({ seed: "invariant-planned-ability-mismatch" });
    driver.applyAction(driver.getLegalActions()[0], "legal");
    const snapshot = driver.getSnapshot();
    const plannedAbility = snapshot.combat!.plannedMonsterAbilities![0];
    const mismatchedAbilityId = plannedAbility.abilityId === monsterAbilityId("training_slime_attack")
      ? monsterAbilityId("training_slime_block")
      : monsterAbilityId("training_slime_attack");
    const broken = {
      ...snapshot,
      combat: {
        ...snapshot.combat!,
        plannedMonsterAbilities: [
          {
            ...plannedAbility,
            abilityId: mismatchedAbilityId
          }
        ]
      }
    };

    expect(checkAgentRunInvariants(broken).issues.map((issue) => issue.code)).toContain("planned_monster_ability_id_mismatch");
  });

  it("validates planned monster abilities against the supplied registry", () => {
    const customAbilityId = monsterAbilityId("training_slime_custom_attack");
    const registry = {
      ...starterRegistry,
      monsterAbilities: [
        ...(starterRegistry.monsterAbilities ?? []),
        {
          id: customAbilityId,
          name: "Custom Slime Tackle",
          intentType: "attack" as const,
          description: "Attack for 1.",
          tags: ["attack", "custom"],
          effects: [{ type: "damage" as const, amount: 1, target: { type: "target" as const } }]
        }
      ],
      monsters: starterRegistry.monsters.map((monster) => ({
        ...monster,
        abilityIds: [...(monster.abilityIds ?? []), customAbilityId],
        intentPool: [
          {
            id: monster.intentPool[0].id,
            type: "attack" as const,
            description: "Attack for 1.",
            abilityId: customAbilityId,
            effects: [{ type: "damage" as const, amount: 1, target: { type: "target" as const } }]
          }
        ]
      }))
    };
    const driver = createAgentRunDriver({ seed: "invariant-custom-registry", registry });
    driver.applyAction(driver.getLegalActions()[0], "legal");
    const snapshot = driver.getSnapshot();

    expect(snapshot.combat?.plannedMonsterAbilities?.[0]).toMatchObject({ abilityId: customAbilityId });
    expect(checkAgentRunInvariants(snapshot, registry).issues.map((issue) => issue.code)).not.toContain("planned_monster_ability_id_mismatch");
    expect(checkAgentRunInvariants(snapshot).issues.map((issue) => issue.code)).toContain("planned_monster_ability_id_mismatch");
  });

  it("fails reward options that reference unregistered cards", () => {
    const driver = createAgentRunDriver({ seed: "invariant-reward-card" });
    const snapshot = driver.getSnapshot();
    const broken = {
      ...snapshot,
      run: {
        ...snapshot.run,
        status: "reward" as const,
        pendingRewardOffer: {
          id: "offer" as never,
          source: "combat" as const,
          combatId: snapshot.run.id,
          seed: "broken",
          status: "open" as const,
          options: [{ id: "option" as never, type: "card" as const, cardId: cardId("missing_card") }]
        }
      }
    };

    expect(checkAgentRunInvariants(broken).issues.map((issue) => issue.code)).toContain("reward_card_missing");
  });

  it("validates reward options against the supplied registry", () => {
    const customCardId = cardId("custom_reward_card");
    const customUpgradeId = upgradeId("custom_pet_upgrade");
    const registry = {
      ...starterRegistry,
      cards: [{ ...starterRegistry.cards[0], id: customCardId }, ...starterRegistry.cards],
      petUpgrades: [{ ...starterRegistry.petUpgrades[0], id: customUpgradeId }, ...starterRegistry.petUpgrades]
    };
    const driver = createAgentRunDriver({ seed: "invariant-custom-reward" });
    const snapshot = driver.getSnapshot();
    const withCustomRewards = {
      ...snapshot,
      run: {
        ...snapshot.run,
        status: "reward" as const,
        pendingRewardOffer: {
          id: "offer" as never,
          source: "combat" as const,
          combatId: snapshot.run.id,
          seed: "custom",
          status: "open" as const,
          options: [
            { id: "card-option" as never, type: "card" as const, cardId: customCardId },
            {
              id: "upgrade-option" as never,
              type: "petUpgrade" as const,
              petInstanceId: snapshot.petInstances[0].id,
              petDefinitionId: snapshot.petInstances[0].definitionId,
              upgradeId: customUpgradeId
            }
          ]
        }
      }
    };

    const customIssues = checkAgentRunInvariants(withCustomRewards, registry).issues.map((issue) => issue.code);
    expect(customIssues).not.toContain("reward_card_missing");
    expect(customIssues).not.toContain("reward_pet_upgrade_missing");

    const defaultIssues = checkAgentRunInvariants(withCustomRewards).issues.map((issue) => issue.code);
    expect(defaultIssues).toContain("reward_card_missing");
    expect(defaultIssues).toContain("reward_pet_upgrade_missing");
  });

  it("accepts legacy combat snapshots without planned ability storage", () => {
    const driver = createAgentRunDriver({ seed: "invariant-legacy-combat-shape" });
    driver.applyAction(driver.getLegalActions()[0], "legal");
    const snapshot = driver.getSnapshot();
    const { plannedMonsterAbilities: _plannedMonsterAbilities, ...legacyCombat } = snapshot.combat!;
    const legacySnapshot = {
      ...snapshot,
      combat: legacyCombat
    };

    expect(checkAgentRunInvariants(legacySnapshot).issues.map((issue) => issue.code)).not.toContain("monster_intent_without_planned_ability");
  });
});
