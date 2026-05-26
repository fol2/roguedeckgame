import type { CardInstanceId } from "../ids";
import type { GameActionError, GameActionResult } from "../model/action";
import type { CombatState } from "../model/combat";
import type { GameEvent } from "../model/event";
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
  if (!Number.isInteger(count) || count < 0) {
    return reject(state, "invalid_draw_count", "Draw count must be a non-negative integer.", "count");
  }

  let drawPile = [...state.drawPile];
  let discardPile = [...state.discardPile];
  let nextState: CombatState = state;
  const events: GameEvent[] = [];

  for (let index = 0; index < count; index += 1) {
    if (drawPile.length === 0 && discardPile.length > 0) {
      drawPile = rng.shuffle(discardPile);
      const shuffledEvent: GameEvent = { type: "DeckShuffled", from: "discard", to: "draw", count: drawPile.length };
      events.push(shuffledEvent);
      nextState = {
        ...nextState,
        events: [...nextState.events, shuffledEvent]
      };
      discardPile = [];
    }

    const cardInstanceId = drawPile[0];
    if (!cardInstanceId) {
      break;
    }

    nextState = {
      ...nextState,
      drawPile,
      discardPile
    };
    const moveResult = moveCardBetweenPiles(nextState, {
      cardInstanceId,
      from: "draw",
      to: "hand"
    });
    if (!moveResult.ok) {
      return reject(state, moveResult.error.code, moveResult.error.message, moveResult.error.path);
    }

    nextState = moveResult.state;
    drawPile = [...nextState.drawPile];
    discardPile = [...nextState.discardPile];
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
