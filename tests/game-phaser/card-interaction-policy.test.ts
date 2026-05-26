import { describe, expect, it } from "vitest";
import { cardId, cardInstanceId, combatantId } from "../../src/game-core";
import {
  resolveCardDropAction,
  type CombatDropTarget
} from "../../src/game-phaser/interaction/card-interaction-policy";
import type {
  CardTargetKind,
  CombatCardViewModel
} from "../../src/game-phaser/view-models/combat-view-model";

const enemyId = combatantId("monster:0");

const createCard = (
  targetKind: CardTargetKind,
  validTargetIds = targetKind === "enemy" || targetKind === "petAndEnemy" ? [enemyId] : []
): CombatCardViewModel => ({
  cardInstanceId: cardInstanceId(`card:${targetKind}`),
  cardId: cardId(`card_${targetKind}`),
  name: targetKind,
  description: "Test card.",
  type: "skill",
  cost: 1,
  tags: [],
  playable: true,
  isPetCommand: targetKind.startsWith("pet"),
  tagTooltips: [],
  keywordExplanations: [],
  detail: { title: targetKind, lines: [] },
  targetKind,
  playMode: targetKind === "enemy" || targetKind === "petAndEnemy" ? "selectEnemy" : "immediate",
  requiresManualTarget: targetKind === "enemy" || targetKind === "petAndEnemy",
  validTargetIds
});

describe("card interaction policy", () => {
  it.each([
    ["enemy", { type: "enemy", id: enemyId }, enemyId],
    ["petAndEnemy", { type: "enemy", id: enemyId }, enemyId],
    ["self", { type: "player" }, undefined],
    ["petAndSelf", { type: "player" }, undefined],
    ["petAndSelf", { type: "pet", slotIndex: 0 }, undefined],
    ["pet", { type: "pet", slotIndex: 0 }, undefined],
    ["allEnemies", { type: "enemy", id: enemyId }, undefined],
    ["allEnemies", { type: "board" }, undefined],
    ["none", { type: "board" }, undefined]
  ] as const)("accepts %s cards on compatible %s drops", (targetKind, target, targetId) => {
    expect(resolveCardDropAction(createCard(targetKind), target)).toEqual({
      accepted: true,
      ...(targetId ? { targetId } : {})
    });
  });

  it.each([
    ["enemy", { type: "player" }],
    ["petAndEnemy", { type: "pet", slotIndex: 0 }],
    ["self", { type: "enemy", id: enemyId }],
    ["petAndSelf", { type: "board" }],
    ["pet", { type: "player" }],
    ["allEnemies", { type: "player" }],
    ["none", { type: "enemy", id: enemyId }]
  ] as readonly [CardTargetKind, CombatDropTarget][])("rejects %s cards on incompatible drops", (targetKind, target) => {
    expect(resolveCardDropAction(createCard(targetKind), target).accepted).toBe(false);
  });

  it("rejects enemy cards dropped on invalid enemies", () => {
    const resolution = resolveCardDropAction(
      createCard("enemy", [combatantId("monster:1")]),
      { type: "enemy", id: enemyId }
    );

    expect(resolution).toEqual({
      accepted: false,
      message: "Drop this card on a valid enemy target."
    });
  });
});
