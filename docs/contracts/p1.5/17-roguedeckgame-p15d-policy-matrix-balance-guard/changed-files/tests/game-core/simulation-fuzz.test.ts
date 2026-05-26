import { describe, expect, it } from "vitest";
import {
  createAgentRunDriver,
  createAgentStateHash,
  createRng,
  enumerateInvalidAgentActions,
  invalidActionInjector,
  runFuzzSimulation,
  starterRegistry
} from "../../src/game-core";

describe("agent simulation fuzz", () => {
  it("runs a small deterministic fuzz sample with invalid injection", () => {
    const result = runFuzzSimulation({ seed: "ci-fuzz", runs: 20, maxSteps: 300, invalidActionRate: 0.15 });

    expect(result.ok).toBe(true);
    expect(result.failures).toEqual([]);
    expect(result.traces.some((trace) => trace.steps.some((step) => step.source === "invalid-injected"))).toBe(true);
    expect(
      result.traces
        .flatMap((trace) => trace.steps)
        .filter((step) => step.source === "invalid-injected")
        .every((step) => !step.ok && step.events.every((event) => event.type === "ActionRejected"))
    ).toBe(true);
  }, 10000);



  it("enumerates broader invalid actions for deterministic validation sweeps", () => {
    const driver = createAgentRunDriver({ seed: "invalid-enumeration" });
    driver.applyAction(driver.getLegalActions()[0], "legal");

    const snapshot = driver.getSnapshot();
    const invalidActions = enumerateInvalidAgentActions(snapshot);
    const legalKeys = new Set(driver.getLegalActions().map((action) => JSON.stringify(action)));
    const cardsById = new Map(starterRegistry.cards.map((card) => [card.id, card]));
    const cardByInstanceId = new Map(
      snapshot.combat?.cardInstances.map((instance) => [instance.id, cardsById.get(instance.cardId)]) ?? []
    );
    const aliveMonsterId = snapshot.combat?.monsters.find((monster) => monster.alive)?.id;
    const targetRequiredCardInstanceId = snapshot.combat?.hand.find((cardInstanceId) =>
      cardByInstanceId.get(cardInstanceId)?.effects.some((effect) =>
        "target" in effect && effect.target.type === "target" && effect.target.combatantId === undefined
      )
    );
    const targetlessCardInstanceId = snapshot.combat?.hand.find((cardInstanceId) =>
      !cardByInstanceId.get(cardInstanceId)?.effects.some((effect) =>
        "target" in effect && effect.target.type === "target" && effect.target.combatantId === undefined
      )
    );

    expect(invalidActions.length).toBeGreaterThan(0);
    expect(targetRequiredCardInstanceId).toBeDefined();
    expect(targetlessCardInstanceId).toBeDefined();
    expect(aliveMonsterId).toBeDefined();
    expect(invalidActions).toContainEqual({
      type: "playCard",
      cardInstanceId: targetRequiredCardInstanceId,
      targetId: snapshot.combat?.player.id
    });
    expect(invalidActions).toContainEqual({
      type: "playCard",
      cardInstanceId: targetRequiredCardInstanceId
    });
    expect(invalidActions).toContainEqual({
      type: "playCard",
      cardInstanceId: targetlessCardInstanceId,
      targetId: aliveMonsterId
    });
    expect(invalidActions.every((action) => !legalKeys.has(JSON.stringify(action)))).toBe(true);
  });

  it("rejects invalid injected actions safely", () => {
    const driver = createAgentRunDriver({ seed: "invalid-injection" });
    const before = createAgentStateHash(driver.getSnapshot());
    const action = invalidActionInjector(driver.getSnapshot(), createRng("invalid-injection"));
    const result = driver.applyAction(action, "invalid-injected");

    expect(result.ok).toBe(false);
    expect(result.events.map((event) => event.type)).toEqual(["ActionRejected"]);
    expect(createAgentStateHash(driver.getSnapshot())).toBe(before);
  });
});
