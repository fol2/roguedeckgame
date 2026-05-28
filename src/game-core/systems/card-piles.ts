import type { CardInstanceId } from "../ids";
import type { GameActionError } from "../model/action";
import type { CombatState } from "../model/combat";
import type { CardPile, GameEvent } from "../model/event";
import {
  findPlayerCardActor,
  moveActorCard,
  projectCombatStateFromCardActors,
  updateCardActor
} from "./card-actors";

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

export const moveCardBetweenPiles = (
  state: CombatState,
  input: MoveCardBetweenPilesInput
): MoveCardBetweenPilesResult => {
  const playerActor = findPlayerCardActor(state);
  if (!playerActor) {
    return {
      ok: false,
      error: error("missing_card_actor", "Player Card Actor is missing.", "cardActors")
    };
  }

  const cardInstance = playerActor.cardInstances.find((candidate) => candidate.id === input.cardInstanceId);
  if (!cardInstance) {
    return {
      ok: false,
      error: error("missing_card_instance", `Card instance '${input.cardInstanceId}' does not exist.`, input.from)
    };
  }

  const nextPlayerActor = moveActorCard(playerActor, input.cardInstanceId, input.from, input.to);
  if (!nextPlayerActor) {
    return {
      ok: false,
      error: error(
        "card_not_in_pile",
        `Card instance '${input.cardInstanceId}' is not in ${input.from}.`,
        input.from
      )
    };
  }

  const event: Extract<GameEvent, { readonly type: "CardMoved" }> = {
    type: "CardMoved",
    cardInstanceId: input.cardInstanceId,
    cardId: cardInstance.cardId!,
    from: input.from,
    to: input.to
  };
  const nextState = projectCombatStateFromCardActors(updateCardActor(state, nextPlayerActor));

  return {
    ok: true,
    state: {
      ...nextState,
      events: [...nextState.events, event]
    },
    event
  };
};
