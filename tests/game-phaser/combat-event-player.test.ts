import { describe, expect, it } from "vitest";
import {
  cardId,
  cardInstanceId,
  combatantId,
  monsterIntentId,
  petInstanceId,
  petModifierId,
  statusId,
  upgradeId,
  type GameEvent
} from "../../src/game-core";
import { formatCombatEventMessage } from "../../src/game-phaser/animation/combat-event-messages";

describe("Combat event messages", () => {
  it("formats CardPlayed", () => {
    const event: GameEvent = {
      type: "CardPlayed",
      cardInstanceId: cardInstanceId("card:1"),
      cardId: cardId("strike"),
      sourceId: combatantId("player")
    };

    expect(formatCombatEventMessage(event)).toContain("strike");
  });

  it("formats DamageDealt with amount and blocked values", () => {
    const event: GameEvent = {
      type: "DamageDealt",
      sourceId: combatantId("player"),
      targetId: combatantId("monster:training_slime:0"),
      amount: 6,
      blocked: 2
    };

    expect(formatCombatEventMessage(event)).toContain("6 damage");
    expect(formatCombatEventMessage(event)).toContain("2 blocked");
  });

  it("formats StatusApplied stacks", () => {
    const event: GameEvent = {
      type: "StatusApplied",
      targetId: combatantId("monster:ash_mite:0"),
      statusId: statusId("burn"),
      stacks: 2
    };

    expect(formatCombatEventMessage(event)).toContain("2 burn");
  });

  it("formats pet command and modifier events", () => {
    const commanded: GameEvent = {
      type: "PetCommanded",
      petInstanceId: petInstanceId("sandbox:ember_fox"),
      cardInstanceId: cardInstanceId("card:fox_bite"),
      cardId: cardId("fox_bite")
    };
    const activated: GameEvent = {
      type: "PetModifierActivated",
      petInstanceId: petInstanceId("sandbox:ember_fox"),
      upgradeId: upgradeId("warm_bond"),
      modifierId: petModifierId("warm_bond_discount"),
      reason: "cardCost"
    };

    expect(formatCombatEventMessage(commanded)).toContain("fox_bite");
    expect(formatCombatEventMessage(activated)).toContain("warm_bond_discount");
  });

  it("formats monster intent and combat outcome events", () => {
    const intent: GameEvent = {
      type: "MonsterIntentResolved",
      monsterId: combatantId("monster:training_slime:0"),
      intentId: monsterIntentId("training_slime_attack")
    };
    const ended: GameEvent = { type: "CombatEnded", outcome: "won" };

    expect(formatCombatEventMessage(intent)).toContain("training_slime_attack");
    expect(formatCombatEventMessage(ended)).toBe("Combat won.");
  });

  it("formats unknown events with a safe fallback", () => {
    expect(formatCombatEventMessage({ type: "FutureEvent" })).toBe("Event: FutureEvent");
  });
});
