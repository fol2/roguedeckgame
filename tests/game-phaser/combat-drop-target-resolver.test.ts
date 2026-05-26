import { describe, expect, it } from "vitest";
import { combatantId } from "../../src/game-core";
import { COMBAT_BOARD, getMonsterPosition, KEEPER_AVATAR } from "../../src/game-phaser/layout/combat-layout";
import { getPetSlotPosition } from "../../src/game-phaser/layout/pet-layout";
import { resolveCombatDropTarget } from "../../src/game-phaser/interaction/combat-drop-target-resolver";
import type { CombatViewModel } from "../../src/game-phaser/view-models/combat-view-model";

const aliveMonsterId = combatantId("monster:alive");
const deadMonsterId = combatantId("monster:dead");

const createViewModel = (): Pick<CombatViewModel, "monsters" | "pets"> => ({
  monsters: [
    {
      id: aliveMonsterId,
      type: "monster",
      name: "Alive",
      hp: 10,
      maxHp: 10,
      block: 0,
      statuses: [],
      alive: true,
      detail: { title: "Alive", lines: [] },
      tooltip: { title: "Alive", body: "Alive" }
    },
    {
      id: deadMonsterId,
      type: "monster",
      name: "Dead",
      hp: 0,
      maxHp: 10,
      block: 0,
      statuses: [],
      alive: false,
      detail: { title: "Dead", lines: [] },
      tooltip: { title: "Dead", body: "Dead" }
    }
  ],
  pets: [
    {
      petInstanceId: "pet:0" as never,
      name: "Ember Fox",
      nickname: "Ember",
      mood: "calm",
      activeModifierCount: 0,
      slotIndex: 0,
      statusLabels: [],
      statusTooltips: [],
      detail: { title: "Ember", lines: [] },
      tooltip: { title: "Ember", body: "Pet" }
    }
  ]
});

describe("combat drop target resolver", () => {
  it("resolves alive enemy hit zones before the board fallback", () => {
    const target = resolveCombatDropTarget(getMonsterPosition(0, 2), createViewModel());

    expect(target).toEqual({ type: "enemy", id: aliveMonsterId });
  });

  it("does not resolve dead monster hit zones as enemy targets", () => {
    const target = resolveCombatDropTarget(getMonsterPosition(1, 2), createViewModel());

    expect(target).toEqual({ type: "board" });
  });

  it("resolves the player and active pet zones", () => {
    expect(resolveCombatDropTarget({ x: KEEPER_AVATAR.x, y: KEEPER_AVATAR.y }, createViewModel())).toEqual({
      type: "player"
    });
    expect(resolveCombatDropTarget(getPetSlotPosition(0), createViewModel())).toEqual({
      type: "pet",
      slotIndex: 0
    });
  });

  it("resolves combat board and outside drops", () => {
    expect(resolveCombatDropTarget({
      x: COMBAT_BOARD.x + 12,
      y: COMBAT_BOARD.y + 12
    }, createViewModel())).toEqual({ type: "board" });
    expect(resolveCombatDropTarget({ x: 4, y: 4 }, createViewModel())).toBeUndefined();
  });
});
