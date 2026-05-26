import { describe, expect, it } from "vitest";
import {
  createAgentRunDriver,
  createAgentStateHash,
  deterministicSmokePolicy,
  petInstanceId,
  type AgentRunDriverSnapshot
} from "../../src/game-core";

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
