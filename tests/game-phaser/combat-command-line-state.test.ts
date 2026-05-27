import { describe, expect, it } from "vitest";
import { cardId, cardInstanceId, combatantId } from "../../src/game-core";
import { resolveCombatCommandLineState } from "../../src/game-phaser/interaction/combat-command-line-state";
import type { CombatCardViewModel } from "../../src/game-phaser/view-models/combat-view-model";

const enemyId = combatantId("monster:0");
const normalCardId = cardInstanceId("card:normal");
const petCommandCardId = cardInstanceId("card:pet-command");

const card = (overrides: Partial<CombatCardViewModel> = {}): CombatCardViewModel => ({
  cardInstanceId: normalCardId,
  cardId: cardId("strike"),
  name: "Strike",
  description: "Deal damage.",
  type: "attack",
  cost: 1,
  tags: [],
  playable: true,
  isPetCommand: false,
  tagTooltips: [],
  keywordExplanations: [],
  detail: { title: "Strike", lines: [] },
  targetKind: "enemy",
  playMode: "selectEnemy",
  requiresManualTarget: true,
  validTargetIds: [enemyId],
  ...overrides
});

describe("combat command line state", () => {
  it("keeps normal attack cards hidden even when hovered or selected", () => {
    const normalAttack = card();

    expect(resolveCombatCommandLineState(normalAttack, undefined)).toBe("hidden");
    expect(resolveCombatCommandLineState(normalAttack, normalCardId)).toBe("hidden");
  });

  it("shows the pet-command relationship only for pet-command hover and selection", () => {
    const petCommand = card({
      cardInstanceId: petCommandCardId,
      cardId: cardId("fox_guard"),
      name: "Fox Guard",
      type: "pet-command",
      isPetCommand: true,
      commandPetSlotIndex: 0
    });

    expect(resolveCombatCommandLineState(petCommand, undefined)).toBe("hover");
    expect(resolveCombatCommandLineState(petCommand, petCommandCardId)).toBe("selected");
  });
});
