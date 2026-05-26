import type { CardInstanceId } from "../ids";
import type { GameActionError, GameActionResult } from "../model/action";
import type { CombatState } from "../model/combat";
import type { GameEvent } from "../model/event";
import type { Rng } from "./rng";

const findCardInstance = (state: CombatState, cardInstanceId: CardInstanceId) =>
  state.cardInstances.find((cardInstance) => cardInstance.id === cardInstanceId);

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
  const hand = [...state.hand];
  const events: GameEvent[] = [];

  for (let index = 0; index < count; index += 1) {
    if (drawPile.length === 0 && discardPile.length > 0) {
      drawPile = rng.shuffle(discardPile);
      events.push({ type: "DeckShuffled", from: "discard", to: "draw", count: drawPile.length });
      discardPile = [];
    }

    const cardInstanceId = drawPile.shift();
    if (!cardInstanceId) {
      break;
    }

    const cardInstance = findCardInstance(state, cardInstanceId);
    if (!cardInstance) {
      return reject(state, "missing_card_instance", `Card instance '${cardInstanceId}' does not exist.`, "drawPile");
    }

    hand.push(cardInstanceId);
    events.push({
      type: "CardMoved",
      cardInstanceId,
      cardId: cardInstance.cardId,
      from: "draw",
      to: "hand"
    });
    events.push({ type: "CardDrawn", cardInstanceId, cardId: cardInstance.cardId });
  }

  const nextState: CombatState = {
    ...state,
    drawPile,
    hand,
    discardPile,
    events: [...state.events, ...events]
  };

  return { ok: true, state: nextState, events, errors: [] };
};
