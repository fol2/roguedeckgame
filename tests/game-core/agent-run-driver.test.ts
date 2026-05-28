import { describe, expect, it } from "vitest";
import {
  enemyCardInstanceId,
  monsterAbilityId,
  monsterIntentId,
  petMemoryId,
  petInstanceId,
  starterRegistry,
  storyEventId,
  storyFlagId
} from "../../src/game-core";
import {
  createAgentRunDriver,
  createAgentStateHash,
  deterministicSmokePolicy,
  type AgentRunDriverSnapshot
} from "../../src/game-core/testing";

const driveUntil = (
  predicate: (snapshot: AgentRunDriverSnapshot) => boolean,
  seed = "driver"
): ReturnType<typeof createAgentRunDriver> => {
  const driver = createAgentRunDriver({ seed });
  for (let step = 0; step < 250; step += 1) {
    if (predicate(driver.getSnapshot())) {
      return driver;
    }
    const action = deterministicSmokePolicy(driver.getSnapshot());
    if (!action) {
      return driver;
    }
    driver.applyAction(action, "policy");
  }
  return driver;
};

describe("agent run driver", () => {
  it("creates deterministic initial runs", () => {
    const left = createAgentRunDriver({ seed: "driver-deterministic" });
    const right = createAgentRunDriver({ seed: "driver-deterministic" });

    expect(createAgentStateHash(left.getSnapshot())).toBe(createAgentStateHash(right.getSnapshot()));
    expect(left.getSnapshot().run.status).toBe("map_select");
  });

  it("selecting a combat node starts combat", () => {
    const driver = createAgentRunDriver({ seed: "driver-combat" });
    const result = driver.applyAction(driver.getLegalActions()[0], "legal");

    expect(result.ok).toBe(true);
    expect(result.state.run.status).toBe("combat");
    expect(result.state.combat?.phase).toBe("player_turn");
    expect(result.events.map((event) => event.type).slice(0, 3)).toEqual([
      "RunNodeSelected",
      "RunCombatStarted",
      "CombatStarted"
    ]);
  });

  it("plays cards with explicit targets and emits ordered combat events", () => {
    const driver = createAgentRunDriver({ seed: "driver-play-card" });
    driver.applyAction(driver.getLegalActions()[0], "legal");
    const action = driver.getLegalActions().find((candidate) => candidate.type === "playCard" && candidate.targetId);
    expect(action).toBeDefined();

    const result = driver.applyAction(action!, "legal");

    expect(result.ok).toBe(true);
    expect(result.events.map((event) => event.type).slice(0, 2)).toEqual(["CardPlayed", "EnergySpent"]);
    expect(result.events.some((event) => event.type === "DamageDealt" || event.type === "StatusApplied")).toBe(true);
  });

  it("rejects invalid actions without corrupting state", () => {
    const driver = createAgentRunDriver({ seed: "driver-invalid" });
    driver.applyAction(driver.getLegalActions()[0], "legal");
    const before = createAgentStateHash(driver.getSnapshot());
    const result = driver.applyAction({ type: "playCard", cardInstanceId: "missing_card" as never }, "invalid-injected");

    expect(result.ok).toBe(false);
    expect(result.events.map((event) => event.type)).toEqual(["ActionRejected"]);
    expect(createAgentStateHash(driver.getSnapshot())).toBe(before);
  });

  it("changes state hash when story or multi-pet progression fields change", () => {
    const driver = createAgentRunDriver({ seed: "driver-hash-story" });
    driver.applyAction(driver.getLegalActions()[0], "legal");
    const snapshot = driver.getSnapshot();
    const baseHash = createAgentStateHash(snapshot);

    const variants: readonly AgentRunDriverSnapshot[] = [
      { ...snapshot, run: { ...snapshot.run, activePetInstanceIds: [petInstanceId("ember_fox_alt")] } },
      { ...snapshot, run: { ...snapshot.run, runFlags: ["flag-a"], storyFlags: [storyFlagId("story-a")] } },
      {
        ...snapshot,
        petInstances: snapshot.petInstances.map((petInstance, index) =>
          index === 0
            ? { ...petInstance, unlockedMemoryIds: [petMemoryId("memory-a")] }
            : petInstance
        )
      },
      {
        ...snapshot,
        petInstances: snapshot.petInstances.map((petInstance, index) =>
          index === 0
            ? { ...petInstance, storyFlags: [storyFlagId("pet-story-a")] }
            : petInstance
        )
      },
      {
        ...snapshot,
        petInstances: snapshot.petInstances.map((petInstance, index) =>
          index === 0
            ? { ...petInstance, seenStoryEventIds: [storyEventId("seen-a")] }
            : petInstance
        )
      },
      {
        ...snapshot,
        petInstances: snapshot.petInstances.map((petInstance, index) =>
          index === 0 ? { ...petInstance, bondXp: petInstance.bondXp + 1 } : petInstance
        )
      },
      {
        ...snapshot,
        combat: snapshot.combat
          ? { ...snapshot.combat, activePetInstanceIds: [petInstanceId("ember_fox_alt")] }
          : snapshot.combat
      },
      {
        ...snapshot,
        combat: snapshot.combat
          ? {
              ...snapshot.combat,
              runPetStates: snapshot.combat.runPetStates.map((petState, index) =>
                index === 0 ? { ...petState, fatigue: petState.fatigue + 1 } : petState
              )
            }
          : snapshot.combat
      }
    ];

    for (const variant of variants) {
      expect(createAgentStateHash(variant)).not.toBe(baseHash);
    }
  });

  it("keeps story and pet progression out of legacy trace hash schemas", () => {
    const driver = createAgentRunDriver({ seed: "driver-hash-legacy-story" });
    driver.applyAction(driver.getLegalActions()[0], "legal");
    const snapshot = driver.getSnapshot();
    const changed: AgentRunDriverSnapshot = {
      ...snapshot,
      run: {
        ...snapshot.run,
        activePetInstanceIds: [petInstanceId("ember_fox_alt")],
        runFlags: ["flag-a"],
        storyFlags: [storyFlagId("story-a")]
      },
      petInstances: snapshot.petInstances.map((petInstance, index) =>
        index === 0
          ? {
              ...petInstance,
              bondXp: petInstance.bondXp + 1,
              unlockedMemoryIds: [petMemoryId("memory-a")],
              storyFlags: [storyFlagId("pet-story-a")],
              seenStoryEventIds: [storyEventId("seen-a")]
            }
          : petInstance
      ),
      combat: snapshot.combat
        ? {
            ...snapshot.combat,
            activePetInstanceIds: [petInstanceId("ember_fox_alt")],
            runPetStates: snapshot.combat.runPetStates.map((petState, index) =>
              index === 0 ? { ...petState, fatigue: petState.fatigue + 1 } : petState
            )
          }
        : snapshot.combat
    };

    expect(createAgentStateHash(changed, { schemaVersion: 1 })).toBe(createAgentStateHash(snapshot, { schemaVersion: 1 }));
    expect(createAgentStateHash(changed, { schemaVersion: 2 })).toBe(createAgentStateHash(snapshot, { schemaVersion: 2 }));
    expect(createAgentStateHash(changed, { schemaVersion: 3 })).not.toBe(createAgentStateHash(snapshot, { schemaVersion: 3 }));
  });

  it("includes intent visibility overrides only in v4 trace hashes", () => {
    const driver = createAgentRunDriver({ seed: "driver-hash-intent-visibility" });
    driver.applyAction(driver.getLegalActions()[0], "legal");
    const snapshot = driver.getSnapshot();
    const monster = snapshot.combat?.monsters[0];
    expect(monster).toBeDefined();

    const changed: AgentRunDriverSnapshot = {
      ...snapshot,
      combat: snapshot.combat
        ? {
            ...snapshot.combat,
            intentVisibilityOverrides: [{
              monsterCombatantId: monster!.id,
              level: "rough",
              source: "debug",
              expires: "never"
            }]
          }
        : snapshot.combat
    };

    expect(createAgentStateHash(changed, { schemaVersion: 3 })).toBe(createAgentStateHash(snapshot, { schemaVersion: 3 }));
    expect(createAgentStateHash(changed, { schemaVersion: 4 })).not.toBe(createAgentStateHash(snapshot, { schemaVersion: 4 }));
  });

  it("keeps reveal-scope intent metadata out of v4 trace hashes", () => {
    const driver = createAgentRunDriver({ seed: "driver-hash-reveal-scope-v5" });
    driver.applyAction(driver.getLegalActions()[0], "legal");
    const snapshot = driver.getSnapshot();
    const monster = snapshot.combat?.monsters[0];
    expect(monster).toBeDefined();

    const changed: AgentRunDriverSnapshot = {
      ...snapshot,
      combat: snapshot.combat
        ? {
            ...snapshot.combat,
            plannedMonsterAbilities: [{
              monsterCombatantId: monster!.id,
              abilityId: monsterAbilityId("training_slime_attack"),
              intentId: monsterIntentId("training_slime_attack"),
              cardInstanceId: enemyCardInstanceId("enemy:training_slime:attack:1"),
              planMode: "adaptive"
            }],
            intentVisibilityOverrides: [{
              monsterCombatantId: monster!.id,
              level: "scoped",
              source: "debug",
              expires: "never",
              mode: "floor",
              scopeDepth: "candidateSet",
              scopedCandidateCardInstanceIds: [enemyCardInstanceId("enemy:training_slime:attack:1")],
              scopedCandidateAbilityIds: [monsterAbilityId("training_slime_attack")]
            }],
            monsterCardStates: [{
              monsterCombatantId: monster!.id,
              drawPile: [],
              hand: [],
              discardPile: [],
              exhaustPile: [],
              cardInstances: [{
                id: enemyCardInstanceId("enemy:training_slime:attack:1"),
                abilityId: monsterAbilityId("training_slime_attack")
              }],
              planned: {
                lockedCardInstanceId: enemyCardInstanceId("enemy:training_slime:attack:1"),
                candidateCardInstanceIds: [],
                planMode: "adaptive"
              }
            }]
          }
        : snapshot.combat
    };
    const sameV4DifferentV5: AgentRunDriverSnapshot = {
      ...changed,
      combat: changed.combat
        ? {
            ...changed.combat,
            plannedMonsterAbilities: changed.combat.plannedMonsterAbilities?.map((planned) => ({
              ...planned,
              cardInstanceId: enemyCardInstanceId("enemy:training_slime:attack:2"),
              planMode: "locked"
            })),
            intentVisibilityOverrides: changed.combat.intentVisibilityOverrides?.map((override) => ({
              ...override,
              mode: "set",
              scopeDepth: "conditionHint",
              scopedCandidateCardInstanceIds: [enemyCardInstanceId("enemy:training_slime:attack:2")],
              scopedCandidateAbilityIds: [monsterAbilityId("training_slime_attack")]
            }))
          }
        : changed.combat
    };

    expect(createAgentStateHash(changed, { schemaVersion: 4 })).toBe(createAgentStateHash(sameV4DifferentV5, { schemaVersion: 4 }));
    expect(createAgentStateHash(changed, { schemaVersion: 5 })).not.toBe(createAgentStateHash(sameV4DifferentV5, { schemaVersion: 5 }));
  });

  it("rejects target ids on targetless card actions", () => {
    const driver = createAgentRunDriver({ seed: "driver-extra-target" });
    let targetlessAction = driver.getLegalActions().find((action) => action.type === "playCard" && !action.targetId);

    for (let step = 0; step < 80 && !targetlessAction; step += 1) {
      const action = deterministicSmokePolicy(driver.getSnapshot());
      expect(action).toBeDefined();
      driver.applyAction(action!, "policy");
      targetlessAction = driver.getLegalActions().find((candidate) => candidate.type === "playCard" && !candidate.targetId);
    }

    if (!targetlessAction || targetlessAction.type !== "playCard") {
      throw new Error("Expected to find a targetless play-card action.");
    }
    const aliveMonster = driver.getSnapshot().combat?.monsters.find((monster) => monster.alive);
    expect(aliveMonster).toBeDefined();
    const before = createAgentStateHash(driver.getSnapshot());

    const result = driver.applyAction(
      { type: "playCard", cardInstanceId: targetlessAction.cardInstanceId, targetId: aliveMonster!.id },
      "invalid-injected"
    );

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toEqual(["unexpected_card_target"]);
    expect(result.events.map((event) => event.type)).toEqual(["ActionRejected"]);
    expect(createAgentStateHash(driver.getSnapshot())).toBe(before);
  });

  it("ends the player turn and resolves the enemy turn", () => {
    const driver = createAgentRunDriver({ seed: "driver-end-turn" });
    driver.applyAction(driver.getLegalActions()[0], "legal");
    const result = driver.applyAction({ type: "endTurn" }, "legal");

    expect(result.ok).toBe(true);
    expect(result.events.some((event) => event.type === "TurnEnded")).toBe(true);
    expect(result.state.combat?.phase === "player_turn" || result.state.combat?.phase === "lost").toBe(true);
  });

  it("completed combat advances to reward, and claim/skip return to map selection", () => {
    const rewardDriver = driveUntil((snapshot) => snapshot.run.status === "reward", "driver-reward");
    expect(rewardDriver.getSnapshot().run.pendingRewardOffer?.status).toBe("open");

    const claim = rewardDriver.getLegalActions().find((action) => action.type === "claimReward");
    const claimResult = rewardDriver.applyAction(claim!, "legal");
    expect(claimResult.ok).toBe(true);
    expect(claimResult.state.run.status).toBe("map_select");

    const skipDriver = driveUntil((snapshot) => snapshot.run.status === "reward", "driver-skip");
    const skipResult = skipDriver.applyAction({ type: "skipReward" }, "legal");
    expect(skipResult.ok).toBe(true);
    expect(skipResult.state.run.status).toBe("map_select");
  });

  it("evaluates reachable pet side stories after completed run nodes", () => {
    const driver = createAgentRunDriver({ seed: "driver-side-story" });
    let storyResult: ReturnType<typeof driver.applyAction> | undefined;

    for (let step = 0; step < 250 && !storyResult; step += 1) {
      const action = deterministicSmokePolicy(driver.getSnapshot());
      expect(action).toBeDefined();
      const result = driver.applyAction(action!, "policy");
      if (result.events.some((event) => event.type === "PetStoryEventCompleted")) {
        storyResult = result;
      }
    }

    expect(storyResult).toBeDefined();
    expect(storyResult!.events.map((event) => event.type)).toContain("RunNodeCompleted");
    expect(storyResult!.events.map((event) => event.type)).toContain("PetStoryEventCompleted");
    expect(storyResult!.state.petInstances[0]).toMatchObject({
      unlockedMemoryIds: [petMemoryId("ember_fox_memory_burned_orchard")],
      storyFlags: [storyFlagId("ember_fox_memory_01_unlocked")],
      seenStoryEventIds: [storyEventId("ember_fox_side_story")],
      bondXp: 1
    });
  });

  it("does not commit reward advancement when node-completed side-story evaluation fails", () => {
    const brokenSideStory = {
      ...starterRegistry.petSideStories[0],
      memoryIds: [],
      events: [{
        ...starterRegistry.petSideStories[0].events[0],
        outcomes: [{
          type: "unlockPetMemory" as const,
          memoryId: petMemoryId("undeclared_memory")
        }]
      }]
    };
    const driver = driveUntil((snapshot) => snapshot.run.status === "reward", "driver-side-story-atomic");
    const rewardSnapshot = driver.getSnapshot();
    const rewardHash = createAgentStateHash(rewardSnapshot);
    const brokenDriver = createAgentRunDriver({
      seed: "driver-side-story-atomic",
      registry: {
        ...starterRegistry,
        petSideStories: [brokenSideStory]
      }
    });

    for (let step = 0; step < 250 && brokenDriver.getSnapshot().run.status !== "reward"; step += 1) {
      const action = deterministicSmokePolicy(brokenDriver.getSnapshot(), {
        ...starterRegistry,
        petSideStories: [brokenSideStory]
      });
      expect(action).toBeDefined();
      brokenDriver.applyAction(action!, "policy");
    }

    expect(brokenDriver.getSnapshot().run.status).toBe("reward");
    const before = createAgentStateHash(brokenDriver.getSnapshot());
    expect(before).toBe(rewardHash);
    const claim = brokenDriver.getLegalActions().find((action) => action.type === "claimReward");
    expect(claim).toBeDefined();
    const result = brokenDriver.applyAction(claim!, "legal");

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toEqual(["missing_pet_side_story_memory"]);
    expect(createAgentStateHash(brokenDriver.getSnapshot())).toBe(before);
    expect(brokenDriver.getSnapshot().run.status).toBe("reward");
  });

  it("reset returns to the deterministic initial state and snapshots are JSON-serializable", () => {
    const driver = createAgentRunDriver({ seed: "driver-reset" });
    const initial = createAgentStateHash(driver.getSnapshot());
    driver.applyAction(driver.getLegalActions()[0], "legal");
    const reset = driver.applyAction({ type: "reset" }, "cli");

    expect(reset.ok).toBe(true);
    expect(createAgentStateHash(reset.state)).toBe(initial);
    expect(JSON.parse(JSON.stringify(reset.state)).run.status).toBe("map_select");
  });

  it("surfaces invalid initial configuration failures", () => {
    const driver = createAgentRunDriver({
      seed: "driver-invalid-config",
      activePetInstanceIds: [petInstanceId("missing_pet")]
    });
    const reset = driver.reset();

    expect(reset.ok).toBe(false);
    expect(reset.errors.map((error) => error.code)).toEqual(["missing_active_pet_instance"]);
    expect(reset.state.run.status).toBe("not_started");
  });
});
