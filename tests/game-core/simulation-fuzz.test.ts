import { describe, expect, it } from "vitest";
import {
  cardId,
  createRng,
  starterRegistry
} from "../../src/game-core";
import {
  createAgentRunDriver,
  createAgentStateHash,
  enumerateInvalidAgentActions,
  invalidActionInjector,
  runFuzzSimulation,
  runSmokeSimulation
} from "../../src/game-core/testing";

describe("agent simulation fuzz", () => {
  it("runs a small deterministic fuzz sample with invalid injection", () => {
    const result = runFuzzSimulation({ seed: "ci-fuzz", runs: 8, maxSteps: 260, invalidActionRate: 0.15 });

    expect(result.ok).toBe(true);
    expect(result.failures).toEqual([]);
    expect(result.traces.some((trace) => trace.steps.some((step) => step.source === "invalid-injected"))).toBe(true);
    expect(
      result.traces
        .flatMap((trace) => trace.steps)
        .filter((step) => step.source === "invalid-injected")
        .every((step) => !step.ok && step.events.every((event) => event.type === "ActionRejected"))
    ).toBe(true);
  }, 15000);

  it("threads custom registries into smoke policy card selection", () => {
    const strike = starterRegistry.cards.find((card) => card.id === "keepers_tap")!;
    const customStrike = {
      ...strike,
      id: cardId("custom_policy_strike"),
      name: "Custom Policy Strike"
    };
    const result = runSmokeSimulation({
      mode: "smoke",
      seed: "custom-policy-registry",
      maxSteps: 30,
      registry: {
        ...starterRegistry,
        cards: [
          customStrike,
          ...starterRegistry.cards.filter((card) => card.id !== "strike")
        ],
        decks: starterRegistry.decks?.map((deck) => ({
          ...deck,
          cardIds: deck.cardIds.map((cardIdValue) =>
            cardIdValue === "keepers_tap" ? customStrike.id : cardIdValue
          )
        })),
        players: [{
          ...starterRegistry.players[0],
          startingDeckCardIds: starterRegistry.players[0].startingDeckCardIds.map((cardIdValue) =>
            cardIdValue === "keepers_tap" ? customStrike.id : cardIdValue
          )
        }]
      }
    });

    expect(result.traces.flatMap((trace) => trace.steps).flatMap((step) => step.events)).toContainEqual(
      expect.objectContaining({
        type: "CardPlayed",
        cardId: customStrike.id
      })
    );
  });



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
