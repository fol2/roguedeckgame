import type { CardInstanceId } from "../ids";
import type { GameActionError, GameActionResult } from "../model/action";
import type { CombatState } from "../model/combat";
import type { GameEvent } from "../model/event";
import {
  findPlayerCardActor,
  projectCombatStateFromCardActors,
  updateCardActor
} from "./card-actors";
import { moveCardBetweenPiles } from "./card-piles";
import type { Rng } from "./rng";

const reject = (
  state: CombatState,
  code: string,
  message: string,
  path?: string
): GameActionResult<CombatState> => {
  const error: GameActionError = { code, message, path };
  const event: GameEvent = { type: "ActionRejected", code, message, path };

  return { ok: false, state, events: [event], errors: [error] };
};

export const drawCards = (
  state: CombatState,
  count: number,
  rng: Rng
): GameActionResult<CombatState> => {
  state = projectCombatStateFromCardActors(state);
  if (!Number.isInteger(count) || count < 0) {
    return reject(state, "invalid_draw_count", "Draw count must be a non-negative integer.", "count");
  }

  let nextState: CombatState = state;
  const events: GameEvent[] = [];
  let playerActor = findPlayerCardActor(state);
  if (!playerActor) {
    return reject(state, "missing_card_actor", "Player Card Actor is missing.", "cardActors");
  }
  const drawLimit = playerActor
    ? Math.max(0, Math.min(count, playerActor.maxHandSize - playerActor.hand.length))
    : count;

  for (let index = 0; index < drawLimit; index += 1) {
    playerActor = findPlayerCardActor(nextState);
    if (!playerActor) {
      return reject(state, "missing_card_actor", "Player Card Actor is missing.", "cardActors");
    }

    if (playerActor.drawPile.length === 0 && playerActor.discardPile.length > 0) {
      const drawPile = rng.shuffle(playerActor.discardPile);
      const shuffledEvent: GameEvent = { type: "DeckShuffled", from: "discard", to: "draw", count: drawPile.length };
      events.push(shuffledEvent);
      nextState = projectCombatStateFromCardActors(updateCardActor(
        { ...nextState, events: [...nextState.events, shuffledEvent] },
        { ...playerActor, drawPile, discardPile: [] }
      ));
      playerActor = findPlayerCardActor(nextState);
    }

    const cardInstanceId = playerActor?.drawPile[0] as CardInstanceId | undefined;
    if (!cardInstanceId) {
      break;
    }

    const moveResult = moveCardBetweenPiles(nextState, {
      cardInstanceId,
      from: "draw",
      to: "hand"
    });
    if (!moveResult.ok) {
      return reject(state, moveResult.error.code, moveResult.error.message, moveResult.error.path);
    }

    nextState = moveResult.state;
    events.push(moveResult.event);
    const drawnEvent: GameEvent = {
      type: "CardDrawn",
      cardInstanceId,
      cardId: moveResult.event.cardId
    };
    nextState = {
      ...nextState,
      events: [...nextState.events, drawnEvent]
    };
    events.push(drawnEvent);
  }

  return { ok: true, state: nextState, events, errors: [] };
};
