import { describe, expect, it } from "vitest";
import { getCard } from "../src/data/cards";
import { playCard, startCombat, endTurn } from "../src/engine/combat";
import type { CombatState } from "../src/engine/types";

describe("combat engine", () => {
  it("starts combat with a deterministic starter hand and actions", () => {
    const state = startCombat("iron-warden", "ashen-goblin");

    expect(state.hand.map((card) => card.cardId)).toEqual([
      "iron-warden-strike",
      "iron-warden-defend",
      "general-field-mend",
    ]);
    expect(state.player.actions).toBe(3);
    expect(state.enemies[0].health).toBe(24);
  });

  it("plays attack cards against the active enemy and emits animation events", () => {
    const state = startCombat("iron-warden", "ashen-goblin");
    const strike = state.hand.find((card) => card.cardId === "iron-warden-strike")!;

    const result = playCard(state, {
      cardInstanceId: strike.instanceId,
      targetEnemyId: state.enemies[0].id,
    });

    expect(result.error).toBeUndefined();
    expect(result.state.enemies[0].health).toBe(18);
    expect(result.state.player.actions).toBe(2);
    expect(result.events.some((event) => event.type === "damage" && event.cue === "attack")).toBe(
      true,
    );
  });

  it("uses block to absorb enemy attacks before health changes", () => {
    const state = startCombat("iron-warden", "ashen-goblin");
    const defend = state.hand.find((card) => card.cardId === "iron-warden-defend")!;
    const defended = playCard(state, { cardInstanceId: defend.instanceId }).state;
    const afterEnemy = endTurn(defended).state;

    expect(afterEnemy.player.health).toBe(72);
    expect(afterEnemy.player.block).toBe(0);
  });

  it("heals without exceeding max health", () => {
    const state = damagePlayer(startCombat("spellblade", "ashen-goblin"), 10);
    const heal = state.hand.find((card) => card.cardId === "general-field-mend")!;

    const result = playCard(state, { cardInstanceId: heal.instanceId });

    expect(result.state.player.health).toBe(67);
    expect(playCard(result.state, { cardInstanceId: heal.instanceId }).error).toBe("Card is not in hand.");
  });

  it("gains action for the current turn only", () => {
    const state = withCardInHand(startCombat("spellblade", "ashen-goblin"), "general-second-wind");
    const actionCard = state.hand.find((card) => card.cardId === "general-second-wind")!;

    const result = playCard(state, { cardInstanceId: actionCard.instanceId });
    const nextTurn = endTurn(result.state).state;

    expect(result.state.player.actions).toBe(4);
    expect(nextTurn.player.actions).toBe(3);
  });

  it("repeats the next action once and then clears the modifier", () => {
    let state = withCardInHand(startCombat("iron-warden", "ashen-goblin"), "general-echo-rune");
    const echo = state.hand.find((card) => card.cardId === "general-echo-rune")!;
    state = playCard(state, { cardInstanceId: echo.instanceId }).state;
    const strike = state.hand.find((card) => card.cardId === "iron-warden-strike")!;

    const result = playCard(state, {
      cardInstanceId: strike.instanceId,
      targetEnemyId: state.enemies[0].id,
    });

    expect(result.state.enemies[0].health).toBe(12);
    expect(result.state.pendingRepeatCount).toBe(0);
    expect(result.events.filter((event) => event.type === "damage")).toHaveLength(2);
  });

  it("destroys a selected card for the current game session without deleting its definition", () => {
    const state = withCardInHand(startCombat("iron-warden", "ashen-goblin"), "general-cull-memory");
    const cull = state.hand.find((card) => card.cardId === "general-cull-memory")!;
    const defend = state.hand.find((card) => card.cardId === "iron-warden-defend")!;

    const result = playCard(state, {
      cardInstanceId: cull.instanceId,
      selectedCardInstanceId: defend.instanceId,
    });

    expect(result.error).toBeUndefined();
    expect(result.state.hand.some((card) => card.instanceId === defend.instanceId)).toBe(false);
    expect(result.state.destroyedCards).toContainEqual(defend);
    expect(getCard(defend.cardId).id).toBe(defend.cardId);
  });

  it("rejects invalid plays", () => {
    const state = startCombat("iron-warden", "ashen-goblin");
    const strike = state.hand.find((card) => card.cardId === "iron-warden-strike")!;

    const result = playCard(
      {
        ...state,
        player: { ...state.player, actions: 0 },
      },
      { cardInstanceId: strike.instanceId, targetEnemyId: state.enemies[0].id },
    );

    expect(result.error).toBe("Not enough actions.");
  });

  it("rejects invalid destroy targets", () => {
    const state = withCardInHand(startCombat("iron-warden", "ashen-goblin"), "general-cull-memory");
    const cull = state.hand.find((card) => card.cardId === "general-cull-memory")!;

    const result = playCard(state, {
      cardInstanceId: cull.instanceId,
      selectedCardInstanceId: "missing-card-instance",
    });

    expect(result.error).toBe("Choose a valid card to destroy.");
    expect(result.state.hand).toContainEqual(cull);
  });

  it("resolves victory and defeat states", () => {
    const nearlyWon = {
      ...startCombat("iron-warden", "ashen-goblin"),
      enemies: [{ ...startCombat("iron-warden", "ashen-goblin").enemies[0], health: 4 }],
    };
    const strike = nearlyWon.hand.find((card) => card.cardId === "iron-warden-strike")!;
    const victory = playCard(nearlyWon, {
      cardInstanceId: strike.instanceId,
      targetEnemyId: nearlyWon.enemies[0].id,
    }).state;

    const defeat = endTurn({
      ...startCombat("spellblade", "obsidian-drake"),
      player: { ...startCombat("spellblade", "obsidian-drake").player, health: 2, block: 0 },
    }).state;

    expect(victory.status).toBe("victory");
    expect(defeat.status).toBe("defeat");
  });
});

function damagePlayer(state: CombatState, amount: number): CombatState {
  return {
    ...state,
    player: {
      ...state.player,
      health: Math.max(0, state.player.health - amount),
    },
  };
}

function withCardInHand(state: CombatState, cardId: string): CombatState {
  return {
    ...state,
    hand: [
      ...state.hand,
      {
        cardId,
        instanceId: `test-${cardId}`,
      },
    ],
  };
}
