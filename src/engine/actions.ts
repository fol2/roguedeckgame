import { getCard } from "../data/cards";
import type { CardEffect, CombatEvent, CombatState, EnemyState } from "./types";

let eventSequence = 0;

export function makeEvent(event: Omit<CombatEvent, "id">): CombatEvent {
  eventSequence += 1;
  return {
    ...event,
    id: `event-${eventSequence}`,
  };
}

export function getCurrentIntent(enemy: EnemyState) {
  return enemy.intentIndex;
}

export function applyCardEffect(
  state: CombatState,
  effect: CardEffect,
  sourceCardId: string,
  targetEnemyId?: string,
  selectedCardInstanceId?: string,
): { state: CombatState; events: CombatEvent[]; playedCardDestroyed?: boolean } {
  const events: CombatEvent[] = [];

  if (effect.type === "damage") {
    const target = findTargetEnemy(state, targetEnemyId);

    if (!target) {
      return { state, events };
    }

    const damage = Math.max(0, effect.amount - target.block);
    const blockAfterHit = Math.max(0, target.block - effect.amount);
    const enemies = state.enemies.map((enemy) =>
      enemy.id === target.id
        ? {
            ...enemy,
            block: blockAfterHit,
            health: Math.max(0, enemy.health - damage),
          }
        : enemy,
    );

    events.push(
      makeEvent({
        type: "damage",
        cue: effect.cue ?? "attack",
        sourceCardId,
        targetActorId: target.id,
        amount: damage,
        message: `${getCard(sourceCardId).name} hits ${target.name} for ${damage}.`,
      }),
    );

    return { state: { ...state, enemies }, events };
  }

  if (effect.type === "block") {
    const block = state.player.block + effect.amount;
    events.push(
      makeEvent({
        type: "block",
        cue: effect.cue ?? "defend",
        sourceCardId,
        amount: effect.amount,
        message: `${getCard(sourceCardId).name} grants ${effect.amount} block.`,
      }),
    );

    return {
      state: {
        ...state,
        player: { ...state.player, block },
      },
      events,
    };
  }

  if (effect.type === "heal") {
    const before = state.player.health;
    const health = Math.min(state.player.maxHealth, state.player.health + effect.amount);
    const amount = health - before;

    events.push(
      makeEvent({
        type: "heal",
        cue: effect.cue ?? "heal",
        sourceCardId,
        amount,
        message: `${getCard(sourceCardId).name} restores ${amount} health.`,
      }),
    );

    return {
      state: {
        ...state,
        player: { ...state.player, health },
      },
      events,
    };
  }

  if (effect.type === "gain-action") {
    events.push(
      makeEvent({
        type: "gain-action",
        cue: effect.cue ?? "action",
        sourceCardId,
        amount: effect.amount,
        message: `${getCard(sourceCardId).name} grants ${effect.amount} action.`,
      }),
    );

    return {
      state: {
        ...state,
        player: { ...state.player, actions: state.player.actions + effect.amount },
      },
      events,
    };
  }

  if (effect.type === "repeat-next-action") {
    events.push(
      makeEvent({
        type: "repeat-armed",
        cue: effect.cue ?? "repeat",
        sourceCardId,
        amount: effect.count,
        message: `${getCard(sourceCardId).name} will repeat the next action.`,
      }),
    );

    return {
      state: {
        ...state,
        pendingRepeatCount: state.pendingRepeatCount + effect.count,
      },
      events,
    };
  }

  if (effect.type === "destroy-card") {
    const targetInstance = state.hand.find((card) => card.instanceId === selectedCardInstanceId);

    if (!targetInstance || targetInstance.cardId === sourceCardId) {
      return { state, events };
    }

    events.push(
      makeEvent({
        type: "card-destroyed",
        cue: effect.cue ?? "destroy",
        sourceCardId,
        amount: 1,
        message: `${getCard(targetInstance.cardId).name} is destroyed for this session.`,
      }),
    );

    return {
      state: {
        ...state,
        hand: state.hand.filter((card) => card.instanceId !== selectedCardInstanceId),
        destroyedCards: [...state.destroyedCards, targetInstance],
      },
      events,
    };
  }

  return { state, events };
}

function findTargetEnemy(state: CombatState, targetEnemyId?: string): EnemyState | undefined {
  const requested = targetEnemyId
    ? state.enemies.find((enemy) => enemy.id === targetEnemyId && enemy.health > 0)
    : undefined;

  return requested ?? state.enemies.find((enemy) => enemy.health > 0);
}
