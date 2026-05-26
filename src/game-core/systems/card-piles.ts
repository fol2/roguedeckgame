import type { CardInstanceId } from "../ids";
import type { GameActionError } from "../model/action";
import type { CombatState } from "../model/combat";
import type { CardPile, GameEvent } from "../model/event";

export type MoveCardBetweenPilesInput = {
  readonly cardInstanceId: CardInstanceId;
  readonly from: CardPile;
  readonly to: CardPile;
};

export type MoveCardBetweenPilesResult =
  | {
      readonly ok: true;
      readonly state: CombatState;
      readonly event: Extract<GameEvent, { readonly type: "CardMoved" }>;
    }
  | {
      readonly ok: false;
      readonly error: GameActionError;
    };

const error = (code: string, message: string, path?: string): GameActionError => ({
  code,
  message,
  path
});

const getPile = (state: CombatState, pile: CardPile): readonly CardInstanceId[] => {
  if (pile === "draw") {
    return state.drawPile;
  }

  if (pile === "hand") {
    return state.hand;
  }

  if (pile === "discard") {
    return state.discardPile;
  }

  return state.exhaustPile;
};

const setPile = (
  state: CombatState,
  pile: CardPile,
  cards: readonly CardInstanceId[]
): CombatState => {
  if (pile === "draw") {
    return { ...state, drawPile: cards };
  }

  if (pile === "hand") {
    return { ...state, hand: cards };
  }

  if (pile === "discard") {
    return { ...state, discardPile: cards };
  }

  return { ...state, exhaustPile: cards };
};

const removeFirst = (
  cards: readonly CardInstanceId[],
  cardInstanceId: CardInstanceId
): readonly CardInstanceId[] | undefined => {
  const index = cards.indexOf(cardInstanceId);

  if (index < 0) {
    return undefined;
  }

  return [
    ...cards.slice(0, index),
    ...cards.slice(index + 1)
  ];
};

export const moveCardBetweenPiles = (
  state: CombatState,
  input: MoveCardBetweenPilesInput
): MoveCardBetweenPilesResult => {
  const cardInstance = state.cardInstances.find((candidate) => candidate.id === input.cardInstanceId);
  if (!cardInstance) {
    return {
      ok: false,
      error: error("missing_card_instance", `Card instance '${input.cardInstanceId}' does not exist.`, input.from)
    };
  }

  const fromPile = getPile(state, input.from);
  const nextFromPile = removeFirst(fromPile, input.cardInstanceId);
  if (!nextFromPile) {
    return {
      ok: false,
      error: error(
        "card_not_in_pile",
        `Card instance '${input.cardInstanceId}' is not in ${input.from}.`,
        input.from
      )
    };
  }

  const stateWithoutCard = setPile(state, input.from, nextFromPile);
  const toPile = getPile(stateWithoutCard, input.to);
  const event: Extract<GameEvent, { readonly type: "CardMoved" }> = {
    type: "CardMoved",
    cardInstanceId: input.cardInstanceId,
    cardId: cardInstance.cardId,
    from: input.from,
    to: input.to
  };
  const nextState = setPile(stateWithoutCard, input.to, [...toPile, input.cardInstanceId]);

  return {
    ok: true,
    state: {
      ...nextState,
      events: [...nextState.events, event]
    },
    event
  };
};
