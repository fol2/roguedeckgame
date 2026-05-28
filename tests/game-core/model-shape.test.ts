import { describe, expect, it } from "vitest";
import {
  cardId,
  cardInstanceId,
  combatantId,
  rewardOfferId,
  rewardOptionId,
  petDefinitionId,
  petInstanceId,
  storyFlagId,
  statusId,
  upgradeId,
  petMemoryId,
  evolutionNodeId,
  storyEventId,
  monsterAbilityId,
  enemyCardInstanceId,
  monsterIntentId,
  GAME_EVENT_LEGACY_SCHEMA_VERSION,
  GAME_EVENT_PREVIOUS_SCHEMA_VERSION,
  projectGameActionResultForSchema,
  projectGameEventsForSchema,
  type GameEvent,
  petModifierId,
  runMapId,
  runNodeId,
  encounterId,
  type PetTarget,
  validateRunStateShape
} from "../../src/game-core";
import { createRunFixture } from "../../src/game-core/testing/fixtures";

describe("model shape", () => {
  it("uses activePetInstanceIds as an array on RunState", () => {
    const run = createRunFixture();

    expect(Array.isArray(run.activePetInstanceIds)).toBe(true);
    expect(run.activePetInstanceIds).toEqual([petInstanceId("ember_fox_001")]);
    expect(validateRunStateShape(run).errors).toEqual([]);
  });

  it("allows multiple active pet instance ids in the run model", () => {
    const run = createRunFixture({
      activePetInstanceIds: [petInstanceId("ember_fox_001"), petInstanceId("future_pet_002")]
    });

    expect(run.activePetInstanceIds).toHaveLength(2);
  });

  it("supports all required PetTarget variants", () => {
    const targets: readonly PetTarget[] = [
      { type: "leading" },
      { type: "allActive" },
      { type: "specific", petInstanceId: petInstanceId("ember_fox_001") },
      { type: "randomActive" },
      { type: "withTag", tag: "fox" }
    ];

    expect(targets.map((target) => target.type)).toEqual([
      "leading",
      "allActive",
      "specific",
      "randomActive",
      "withTag"
    ]);
  });

  it("models reward offers with card and pet upgrade options", () => {
    const rewardOffer = {
      id: rewardOfferId("reward_fixture"),
      source: "combat" as const,
      combatId: createRunFixture().id,
      seed: "reward-shape",
      status: "open" as const,
      options: [
        { id: rewardOptionId("reward_fixture:card:ember_spark"), type: "card" as const, cardId: cardId("ember_spark") },
        {
          id: rewardOptionId("reward_fixture:petUpgrade:ember_fox_001:burning_fang"),
          type: "petUpgrade" as const,
          petInstanceId: petInstanceId("ember_fox_001"),
          petDefinitionId: petDefinitionId("ember_fox"),
          upgradeId: upgradeId("burning_fang")
        }
      ]
    };

    expect(rewardOffer.options.map((option) => option.type)).toEqual(["card", "petUpgrade"]);
    expect(JSON.parse(JSON.stringify(rewardOffer))).toEqual(rewardOffer);
  });

  it("keeps GameEvent objects serializable as plain data", () => {
    const events: readonly GameEvent[] = [
      {
        type: "CardPlayed",
        cardInstanceId: cardInstanceId("fox_bite:1"),
        cardId: cardId("fox_bite"),
        sourceId: combatantId("player")
      },
      { type: "EnergySpent", amount: 1, remaining: 2 },
      { type: "CardDrawn", cardInstanceId: cardInstanceId("focus:1"), cardId: cardId("focus") },
      {
        type: "CardMoved",
        cardInstanceId: cardInstanceId("focus:1"),
        cardId: cardId("focus"),
        from: "draw",
        to: "hand"
      },
      {
        type: "DamageDealt",
        sourceId: combatantId("player"),
        targetId: combatantId("training_slime"),
        amount: 5,
        blocked: 0
      },
      { type: "BlockGained", targetId: combatantId("player"), amount: 5, total: 5 },
      { type: "StatusApplied", targetId: combatantId("training_slime"), statusId: statusId("burn"), stacks: 2 },
      {
        type: "PetCommanded",
        petInstanceId: petInstanceId("ember_fox_001"),
        cardInstanceId: cardInstanceId("fox_bite:1"),
        cardId: cardId("fox_bite")
      },
      { type: "PetReacted", petInstanceId: petInstanceId("ember_fox_001"), reaction: "guard" },
      { type: "DeckShuffled", from: "deck", to: "draw", count: 3 },
      { type: "ActionRejected", code: "sample", message: "Sample rejection" },
      { type: "CombatantDefeated", combatantId: combatantId("training_slime") },
      {
        type: "MonsterAbilityPlanned",
        monsterId: combatantId("monster:training_slime:0"),
        abilityId: monsterAbilityId("training_slime_attack"),
        intentId: monsterIntentId("training_slime_attack"),
        intentType: "attack",
        description: "Deal 6 damage."
      },
      {
        type: "MonsterAbilityPlayed",
        monsterId: combatantId("monster:training_slime:0"),
        abilityId: monsterAbilityId("training_slime_attack"),
        intentId: monsterIntentId("training_slime_attack")
      },
      {
        type: "RunCreated",
        runId: createRunFixture().id,
        seed: "shape-seed",
        playerClassId: createRunFixture().playerClassId,
        activePetInstanceIds: [petInstanceId("ember_fox_001")],
        playerHp: 70,
        playerMaxHp: 70
      },
      { type: "RunMapGenerated", runMapId: runMapId("shape_map"), nodeCount: 2 },
      { type: "RunNodeAvailable", nodeId: runNodeId("shape_node_1") },
      { type: "RunNodeSelected", nodeId: runNodeId("shape_node_1") },
      {
        type: "RunCombatStarted",
        nodeId: runNodeId("shape_node_1"),
        encounterId: encounterId("shape_encounter"),
        combatId: createRunFixture().id
      },
      { type: "RunCombatCompleted", nodeId: runNodeId("shape_node_1"), outcome: "won", playerHp: 70, playerMaxHp: 70 },
      { type: "RunRewardPending", nodeId: runNodeId("shape_node_1"), rewardOfferId: rewardOfferId("shape_reward") },
      { type: "RunNodeCompleted", nodeId: runNodeId("shape_node_1") },
      { type: "RunAdvanced", availableNodeIds: [runNodeId("shape_node_2")] },
      { type: "RunEnded", outcome: "completed" },
      {
        type: "RewardOffered",
        rewardOfferId: rewardOfferId("reward_fixture"),
        options: [{ id: rewardOptionId("reward_fixture:card:ember_spark"), type: "card", cardId: cardId("ember_spark") }]
      },
      {
        type: "RewardSelected",
        rewardOfferId: rewardOfferId("reward_fixture"),
        rewardOptionId: rewardOptionId("reward_fixture:card:ember_spark"),
        rewardType: "card"
      },
      { type: "RewardSkipped", rewardOfferId: rewardOfferId("reward_fixture") },
      { type: "CardRewardAdded", cardId: cardId("ember_spark") },
      {
        type: "PetUpgradeUnlocked",
        petInstanceId: petInstanceId("ember_fox_001"),
        upgradeId: upgradeId("burning_fang")
      },
      {
        type: "CardCostModified",
        cardInstanceId: cardInstanceId("fox_bite:1"),
        cardId: cardId("fox_bite"),
        originalCost: 1,
        modifiedCost: 0,
        modifierId: petModifierId("warm_bond_modifier"),
        petInstanceId: petInstanceId("ember_fox_001")
      },
      {
        type: "PetModifierActivated",
        petInstanceId: petInstanceId("ember_fox_001"),
        upgradeId: upgradeId("warm_bond"),
        modifierId: petModifierId("warm_bond_modifier"),
        reason: "cardCost"
      },
      {
        type: "PetModifierConsumed",
        petInstanceId: petInstanceId("ember_fox_001"),
        modifierId: petModifierId("warm_bond_modifier"),
        scope: "combat"
      },
      { type: "StoryFlagSet", flagId: storyFlagId("ember_fox_memory_01_unlocked") },
      {
        type: "PetStoryEventCompleted",
        petInstanceId: petInstanceId("ember_fox_001"),
        storyEventId: storyEventId("ember_fox_side_story")
      },
      {
        type: "PetMemoryUnlocked",
        petInstanceId: petInstanceId("ember_fox_001"),
        memoryId: petMemoryId("ember_fox_memory_burned_orchard")
      },
      { type: "PetBondXpAdded", petInstanceId: petInstanceId("ember_fox_001"), amount: 1, total: 1 },
      {
        type: "PetStoryFlagSet",
        petInstanceId: petInstanceId("ember_fox_001"),
        flagId: storyFlagId("ember_fox_memory_01_unlocked")
      },
      {
        type: "PetEvolutionNodeUnlocked",
        petInstanceId: petInstanceId("ember_fox_001"),
        evolutionNodeId: evolutionNodeId("ember_fox_kindled_path")
      },
      {
        type: "StoryEventSeen",
        petInstanceId: petInstanceId("ember_fox_001"),
        storyEventId: storyEventId("ember_fox_side_story")
      },
      {
        type: "SaveSnapshotCreated",
        profileId: "shape_profile",
        schemaVersion: 1,
        hasActiveRun: true
      },
      {
        type: "SaveSlotWritten",
        slotId: "shape_slot",
        updatedAt: "2026-05-25T00:00:00.000Z",
        schemaVersion: 1
      },
      {
        type: "SaveSlotLoaded",
        slotId: "shape_slot",
        updatedAt: "2026-05-25T00:00:00.000Z",
        schemaVersion: 1
      },
      { type: "SaveSlotDeleted", slotId: "shape_slot" },
      { type: "ValidationWarning", code: "sample", message: "Sample warning" }
    ];

    expect(JSON.parse(JSON.stringify(events))).toEqual(events);
  });

  it("projects v2 ability events for legacy event consumers", () => {
    const events: readonly GameEvent[] = [
      {
        type: "MonsterAbilityPlanned",
        monsterId: combatantId("monster:training_slime:0"),
        abilityId: monsterAbilityId("training_slime_attack"),
        intentId: monsterIntentId("training_slime_attack"),
        intentType: "attack",
        description: "Deal 6 damage."
      },
      {
        type: "MonsterIntentSet",
        monsterId: combatantId("monster:training_slime:0"),
        intentId: monsterIntentId("training_slime_attack"),
        intentType: "attack",
        description: "Deal 6 damage."
      },
      {
        type: "EnemyDeckShuffled",
        monsterId: combatantId("monster:training_slime:0"),
        from: "discard",
        to: "draw",
        count: 2
      },
      {
        type: "EnemyCardMoved",
        monsterId: combatantId("monster:training_slime:0"),
        cardInstanceId: enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_attack:0"),
        abilityId: monsterAbilityId("training_slime_attack"),
        from: "draw",
        to: "hand"
      },
      {
        type: "EnemyPlanCreated",
        monsterId: combatantId("monster:training_slime:0"),
        abilityId: monsterAbilityId("training_slime_attack"),
        intentId: monsterIntentId("training_slime_attack"),
        cardInstanceId: enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_attack:0"),
        candidateCardInstanceIds: [],
        planMode: "locked"
      },
      {
        type: "MonsterAbilityPlayed",
        monsterId: combatantId("monster:training_slime:0"),
        abilityId: monsterAbilityId("training_slime_attack"),
        intentId: monsterIntentId("training_slime_attack")
      },
      {
        type: "EnemyPlanFinalized",
        monsterId: combatantId("monster:training_slime:0"),
        abilityId: monsterAbilityId("training_slime_attack"),
        intentId: monsterIntentId("training_slime_attack"),
        cardInstanceId: enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_attack:0"),
        planMode: "locked",
        changed: false
      },
      {
        type: "EnemyCardResolved",
        monsterId: combatantId("monster:training_slime:0"),
        cardInstanceId: enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_attack:0"),
        abilityId: monsterAbilityId("training_slime_attack"),
        intentId: monsterIntentId("training_slime_attack")
      },
      {
        type: "MonsterIntentResolved",
        monsterId: combatantId("monster:training_slime:0"),
        intentId: monsterIntentId("training_slime_attack")
      }
    ];

    expect(projectGameEventsForSchema(events, GAME_EVENT_LEGACY_SCHEMA_VERSION).map((event) => event.type)).toEqual([
      "MonsterIntentSet",
      "MonsterIntentResolved"
    ]);
  });

  it("keeps v4 intent visibility events for schema 4 consumers", () => {
    const events: readonly GameEvent[] = [
      {
        type: "EnemyIntentVisibilityChanged",
        monsterId: combatantId("monster:training_slime:0"),
        previousLevel: "unknown",
        level: "scoped",
        source: "card",
        expires: "currentPlan",
        mode: "floor",
        scopeDepth: "candidateSet",
        scopedCandidateCardInstanceIds: [enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_attack:0")],
        scopedCandidateAbilityIds: [monsterAbilityId("training_slime_attack")]
      },
      {
        type: "MonsterIntentResolved",
        monsterId: combatantId("monster:training_slime:0"),
        intentId: monsterIntentId("training_slime_attack")
      }
    ];

    expect(projectGameEventsForSchema(events, GAME_EVENT_PREVIOUS_SCHEMA_VERSION)).toEqual([
      {
        type: "EnemyIntentVisibilityChanged",
        monsterId: combatantId("monster:training_slime:0"),
        level: "scoped",
        source: "card",
        expires: "currentPlan"
      },
      {
        type: "MonsterIntentResolved",
        monsterId: combatantId("monster:training_slime:0"),
        intentId: monsterIntentId("training_slime_attack")
      }
    ]);
  });

  it("strips v5 intent visibility payload fields for schema 4 consumers", () => {
    const events: readonly GameEvent[] = [
      {
        type: "EnemyIntentVisibilityChanged",
        monsterId: combatantId("monster:training_slime:0"),
        previousLevel: "unknown",
        level: "scoped",
        source: "card",
        expires: "currentPlan",
        mode: "floor",
        scopeDepth: "candidateSet",
        scopedCandidateCardInstanceIds: [],
        scopedCandidateAbilityIds: [monsterAbilityId("training_slime_attack")]
      }
    ];

    expect(projectGameEventsForSchema(events, GAME_EVENT_PREVIOUS_SCHEMA_VERSION)).toEqual([
      {
        type: "EnemyIntentVisibilityChanged",
        monsterId: combatantId("monster:training_slime:0"),
        level: "scoped",
        source: "card",
        expires: "currentPlan"
      }
    ]);
  });

  it("projects v5 enemy card lifecycle events away from schema 4 consumers", () => {
    const events: readonly GameEvent[] = [
      {
        type: "EnemyDeckShuffled",
        monsterId: combatantId("monster:charred_stag:0"),
        from: "discard",
        to: "draw",
        count: 2
      },
      {
        type: "EnemyCardMoved",
        monsterId: combatantId("monster:charred_stag:0"),
        cardInstanceId: enemyCardInstanceId("monster:charred_stag:0:enemy-card:charred_stag_antler_strike:0"),
        abilityId: monsterAbilityId("charred_stag_antler_strike"),
        from: "draw",
        to: "hand"
      },
      {
        type: "EnemyPlanCreated",
        monsterId: combatantId("monster:charred_stag:0"),
        abilityId: monsterAbilityId("charred_stag_antler_strike"),
        intentId: monsterIntentId("charred_stag_antler_strike"),
        cardInstanceId: enemyCardInstanceId("monster:charred_stag:0:enemy-card:charred_stag_antler_strike:0"),
        candidateCardInstanceIds: [],
        planMode: "adaptive"
      },
      {
        type: "EnemyPlanChanged",
        monsterId: combatantId("monster:charred_stag:0"),
        fromAbilityId: monsterAbilityId("charred_stag_antler_strike"),
        toAbilityId: monsterAbilityId("charred_stag_guarded_snort"),
        fromIntentId: monsterIntentId("charred_stag_antler_strike"),
        toIntentId: monsterIntentId("charred_stag_guarded_snort"),
        reason: "prefer_guard_if_player_overblocks"
      },
      {
        type: "EnemyPlanFinalized",
        monsterId: combatantId("monster:charred_stag:0"),
        abilityId: monsterAbilityId("charred_stag_guarded_snort"),
        intentId: monsterIntentId("charred_stag_guarded_snort"),
        planMode: "adaptive",
        changed: true
      },
      {
        type: "EnemyCardResolved",
        monsterId: combatantId("monster:charred_stag:0"),
        cardInstanceId: enemyCardInstanceId("monster:charred_stag:0:enemy-card:charred_stag_guarded_snort:0"),
        abilityId: monsterAbilityId("charred_stag_guarded_snort"),
        intentId: monsterIntentId("charred_stag_guarded_snort")
      },
      {
        type: "MonsterIntentResolved",
        monsterId: combatantId("monster:charred_stag:0"),
        intentId: monsterIntentId("charred_stag_guarded_snort")
      }
    ];

    expect(projectGameEventsForSchema(events, GAME_EVENT_PREVIOUS_SCHEMA_VERSION).map((event) => event.type)).toEqual([
      "MonsterIntentResolved"
    ]);
  });

  it("projects action result events and state events for legacy consumers", () => {
    const result = projectGameActionResultForSchema({
      ok: true,
      state: {
        events: [
          {
            type: "MonsterAbilityPlayed" as const,
            monsterId: combatantId("monster:training_slime:0"),
            abilityId: monsterAbilityId("training_slime_attack"),
            intentId: monsterIntentId("training_slime_attack")
          },
          {
            type: "MonsterIntentResolved" as const,
            monsterId: combatantId("monster:training_slime:0"),
            intentId: monsterIntentId("training_slime_attack")
          }
        ],
        lastEvents: [
          {
            type: "MonsterAbilityPlanned" as const,
            monsterId: combatantId("monster:training_slime:0"),
            abilityId: monsterAbilityId("training_slime_attack"),
            intentId: monsterIntentId("training_slime_attack"),
            intentType: "attack" as const,
            description: "Deal 6 damage."
          },
          {
            type: "MonsterIntentSet" as const,
            monsterId: combatantId("monster:training_slime:0"),
            intentId: monsterIntentId("training_slime_attack"),
            intentType: "attack" as const,
            description: "Deal 6 damage."
          }
        ]
      },
      events: [
        {
          type: "MonsterAbilityPlayed" as const,
          monsterId: combatantId("monster:training_slime:0"),
          abilityId: monsterAbilityId("training_slime_attack"),
          intentId: monsterIntentId("training_slime_attack")
        },
        {
          type: "MonsterIntentResolved" as const,
          monsterId: combatantId("monster:training_slime:0"),
          intentId: monsterIntentId("training_slime_attack")
        }
      ],
      errors: []
    }, GAME_EVENT_LEGACY_SCHEMA_VERSION);

    expect(result.events.map((event) => event.type)).toEqual(["MonsterIntentResolved"]);
    expect(result.state.events.map((event) => event.type)).toEqual(["MonsterIntentResolved"]);
    expect(result.state.lastEvents.map((event) => event.type)).toEqual(["MonsterIntentSet"]);
  });

  it("keeps v4 intent visibility events when projecting to previous schema", () => {
    const events: readonly GameEvent[] = [
      {
        type: "EnemyIntentVisibilityChanged",
        monsterId: combatantId("monster:training_slime:0"),
        level: "rough",
        source: "card",
        expires: "currentPlan"
      },
      {
        type: "MonsterIntentResolved",
        monsterId: combatantId("monster:training_slime:0"),
        intentId: monsterIntentId("training_slime_attack")
      }
    ];

    expect(projectGameEventsForSchema(events, GAME_EVENT_PREVIOUS_SCHEMA_VERSION).map((event) => event.type)).toEqual([
      "EnemyIntentVisibilityChanged",
      "MonsterIntentResolved"
    ]);
  });

  it("projects legacy action result state lastEvents without requiring state events", () => {
    const result = projectGameActionResultForSchema({
      ok: true,
      state: {
        lastEvents: [
          {
            type: "MonsterAbilityPlanned" as const,
            monsterId: combatantId("monster:training_slime:0"),
            abilityId: monsterAbilityId("training_slime_attack"),
            intentId: monsterIntentId("training_slime_attack"),
            intentType: "attack" as const,
            description: "Deal 6 damage."
          },
          {
            type: "MonsterIntentSet" as const,
            monsterId: combatantId("monster:training_slime:0"),
            intentId: monsterIntentId("training_slime_attack"),
            intentType: "attack" as const,
            description: "Deal 6 damage."
          }
        ]
      },
      events: [],
      errors: []
    }, GAME_EVENT_LEGACY_SCHEMA_VERSION);

    expect("events" in result.state).toBe(false);
    expect(result.state.lastEvents.map((event) => event.type)).toEqual(["MonsterIntentSet"]);
  });

  it("does not import Phaser from game-core", () => {
    const modules = import.meta.glob("../../src/game-core/**/*.ts", {
      eager: true,
      query: "?raw",
      import: "default"
    });
    const offenders = Object.entries(modules).filter(([, contents]) => {
      if (typeof contents !== "string") {
        return true;
      }

      return /from\s+["']phaser["']|from\s+["']Phaser["']|import\s+["']phaser["']|import\s+["']Phaser["']/.test(contents);
    });

    expect(offenders).toEqual([]);
  });

  it("keeps game-core independent from Phaser, app, and testing barrels", () => {
    const modules = import.meta.glob("../../src/game-core/**/*.ts", {
      eager: true,
      query: "?raw",
      import: "default"
    });
    const dependencyOffenders = Object.entries(modules).filter(([path, contents]) => {
      if (typeof contents !== "string") {
        return true;
      }

      if (path.endsWith("/game-core/testing/index.ts") || path.includes("/game-core/workbench/")) {
        return false;
      }

      return /from\s+["'][^"']*(game-phaser|\/app|phaser)["']|import\s+["'][^"']*(game-phaser|\/app|phaser)["']/.test(contents);
    });

    expect(dependencyOffenders).toEqual([]);

    const publicBarrel = modules["../../src/game-core/index.ts"];
    expect(publicBarrel).not.toContain("./testing/");
    expect(publicBarrel).not.toContain("./systems/content-workbench");
  });

  it("keeps Phaser runtime imports off the broad testing barrel", () => {
    const modules = import.meta.glob("../../src/game-phaser/**/*.ts", {
      eager: true,
      query: "?raw",
      import: "default"
    });
    const offenders = Object.entries(modules).filter(([, contents]) =>
      typeof contents !== "string" ||
      /from\s+["'][^"']*game-core\/testing["']/.test(contents)
    );

    expect(offenders).toEqual([]);
  });
});
