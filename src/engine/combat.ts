import { getCard } from "../data/cards";
import { getClass } from "../data/classes";
import { getEncounter } from "../data/encounters";
import { applyCardEffect, makeEvent } from "./actions";
import { createStarterDeck, drawCards } from "./deck";
import type { ClassId, CombatEvent, CombatState, EngineResult, PlayCardCommand } from "./types";

const HAND_SIZE = 5;

export function startCombat(classId: ClassId, encounterId: string): CombatState {
  const role = getClass(classId);
  const encounter = getEncounter(encounterId);
  const starterDeck = createStarterDeck(classId);
  const drawn = drawCards(starterDeck, [], [], HAND_SIZE);

  return {
    classId,
    player: {
      maxHealth: 72,
      health: 72,
      block: 0,
      baseActions: 3,
      actions: 3,
    },
    enemies: [
      {
        id: `${encounter.id}-1`,
        definitionId: encounter.id,
        name: encounter.name,
        kind: encounter.kind,
        maxHealth: encounter.maxHealth,
        health: encounter.maxHealth,
        block: 0,
        intentIndex: 0,
        assetId: encounter.assetId,
      },
    ],
    drawPile: drawn.drawPile,
    hand: drawn.hand,
    discardPile: drawn.discardPile,
    destroyedCards: [],
    turn: 1,
    pendingRepeatCount: 0,
    status: "active",
    eventLog: [
      makeEvent({
        type: "turn-started",
        cue: "action",
        sourceActorId: role.assetId,
        message: `${role.name} enters the wilds.`,
      }),
    ],
  };
}

export function playCard(state: CombatState, command: PlayCardCommand): EngineResult {
  if (state.status !== "active") {
    return failed(state, "Combat is already complete.");
  }

  const cardInstance = state.hand.find((card) => card.instanceId === command.cardInstanceId);

  if (!cardInstance) {
    return failed(state, "Card is not in hand.");
  }

  const card = getCard(cardInstance.cardId);

  if (state.player.actions < card.cost) {
    return failed(state, "Not enough actions.");
  }

  if (card.target === "enemy" && !state.enemies.some((enemy) => enemy.health > 0)) {
    return failed(state, "No valid enemy target.");
  }

  if (card.target === "card-in-hand" && !command.selectedCardInstanceId) {
    return failed(state, "Choose a card to destroy.");
  }

  if (
    card.target === "card-in-hand" &&
    !state.hand.some((item) => item.instanceId === command.selectedCardInstanceId)
  ) {
    return failed(state, "Choose a valid card to destroy.");
  }

  if (command.selectedCardInstanceId === cardInstance.instanceId) {
    return failed(state, "A card cannot destroy itself.");
  }

  const repeatApplications = state.pendingRepeatCount > 0 ? state.pendingRepeatCount + 1 : 1;
  const shouldRepeatEffects = !card.effects.some((effect) => effect.type === "repeat-next-action");
  let nextState: CombatState = {
    ...state,
    player: {
      ...state.player,
      actions: state.player.actions - card.cost,
    },
    hand: state.hand.filter((item) => item.instanceId !== cardInstance.instanceId),
    pendingRepeatCount: shouldRepeatEffects ? 0 : state.pendingRepeatCount,
  };
  const events: CombatEvent[] = [
    makeEvent({
      type: "card-played",
      cue: card.animationCue,
      sourceCardId: card.id,
      message: `${card.name} is played.`,
    }),
  ];
  let playedCardDestroyed = false;

  const applications = shouldRepeatEffects ? repeatApplications : 1;

  for (let repeatIndex = 0; repeatIndex < applications; repeatIndex += 1) {
    for (const effect of card.effects) {
      const result = applyCardEffect(
        nextState,
        effect,
        card.id,
        command.targetEnemyId,
        command.selectedCardInstanceId,
      );

      nextState = result.state;
      events.push(...result.events);
      playedCardDestroyed = playedCardDestroyed || Boolean(result.playedCardDestroyed);
    }
  }

  nextState = {
    ...nextState,
    discardPile: playedCardDestroyed ? nextState.discardPile : [...nextState.discardPile, cardInstance],
  };

  const completedState = resolveCombatStatus({
    ...nextState,
    eventLog: [...nextState.eventLog, ...events],
  });

  const newEvents = completedState.eventLog.slice(state.eventLog.length);

  return { state: completedState, events: newEvents };
}

export function endTurn(state: CombatState): EngineResult {
  if (state.status !== "active") {
    return failed(state, "Combat is already complete.");
  }

  let playerHealth = state.player.health;
  let playerBlock = state.player.block;
  const events: CombatEvent[] = [];

  const enemies = state.enemies.map((enemy) => {
    if (enemy.health <= 0) {
      return enemy;
    }

    const encounter = getEncounter(enemy.definitionId);
    const intent = encounter.intentSequence[enemy.intentIndex % encounter.intentSequence.length];

    if (intent.type === "attack") {
      const damage = Math.max(0, intent.amount - playerBlock);
      playerBlock = Math.max(0, playerBlock - intent.amount);
      playerHealth = Math.max(0, playerHealth - damage);
      events.push(
        makeEvent({
          type: "enemy-intent",
          cue: intent.cue,
          sourceActorId: enemy.id,
          amount: damage,
          message: `${enemy.name} uses ${intent.label} for ${damage}.`,
        }),
      );
    }

    if (intent.type === "guard") {
      events.push(
        makeEvent({
          type: "enemy-intent",
          cue: intent.cue,
          sourceActorId: enemy.id,
          amount: intent.amount,
          message: `${enemy.name} uses ${intent.label} and gains ${intent.amount} block.`,
        }),
      );

      return {
        ...enemy,
        block: enemy.block + intent.amount,
        intentIndex: enemy.intentIndex + 1,
      };
    }

    return {
      ...enemy,
      intentIndex: enemy.intentIndex + 1,
    };
  });

  const nextDeck = drawCards(
    state.drawPile,
    [...state.discardPile, ...state.hand],
    [],
    HAND_SIZE,
  );
  const nextState = resolveCombatStatus({
    ...state,
    enemies,
    player: {
      ...state.player,
      health: playerHealth,
      block: 0,
      actions: state.player.baseActions,
    },
    drawPile: nextDeck.drawPile,
    hand: nextDeck.hand,
    discardPile: nextDeck.discardPile,
    turn: state.turn + 1,
    pendingRepeatCount: 0,
    eventLog: [
      ...state.eventLog,
      ...events,
      makeEvent({
        type: "turn-started",
        cue: "action",
        message: `Turn ${state.turn + 1} begins.`,
      }),
    ],
  });

  return {
    state: nextState,
    events: nextState.eventLog.slice(state.eventLog.length),
  };
}

function failed(state: CombatState, error: string): EngineResult {
  return { state, events: [], error };
}

function resolveCombatStatus(state: CombatState): CombatState {
  if (state.player.health <= 0) {
    const defeatEvent = makeEvent({
      type: "defeat",
      cue: "destroy",
      message: "The run falls in battle.",
    });

    return {
      ...state,
      status: "defeat",
      eventLog: state.eventLog.some((event) => event.type === "defeat")
        ? state.eventLog
        : [...state.eventLog, defeatEvent],
    };
  }

  if (state.enemies.every((enemy) => enemy.health <= 0)) {
    const victoryEvent = makeEvent({
      type: "victory",
      cue: "action",
      message: "The encounter is cleared.",
    });

    return {
      ...state,
      status: "victory",
      eventLog: state.eventLog.some((event) => event.type === "victory")
        ? state.eventLog
        : [...state.eventLog, victoryEvent],
    };
  }

  return state;
}
