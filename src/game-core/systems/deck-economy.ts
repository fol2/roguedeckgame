import type { CardId } from "../ids";
import type { GameActionError, GameActionResult } from "../model/action";
import type { GameEvent } from "../model/event";
import type { GameContentRegistry } from "../model/registry";
import type { RunState } from "../model/run";
import type { Rng } from "./rng";

export type DeckOperationInput = {
  readonly run: RunState;
  readonly registry: GameContentRegistry;
  readonly cardId: CardId;
};

const error = (code: string, message: string, path?: string): GameActionError => ({
  code,
  message,
  path
});

const rejectedEvent = (actionError: GameActionError): GameEvent => ({
  type: "ActionRejected",
  code: actionError.code,
  message: actionError.message,
  path: actionError.path
});

const reject = (run: RunState, actionError: GameActionError): GameActionResult<RunState> => ({
  ok: false,
  state: run,
  events: [rejectedEvent(actionError)],
  errors: [actionError]
});

const removeFirstCard = (
  deckCardIds: readonly CardId[],
  cardId: CardId
): readonly CardId[] | undefined => {
  const index = deckCardIds.indexOf(cardId);
  if (index < 0) {
    return undefined;
  }

  return [...deckCardIds.slice(0, index), ...deckCardIds.slice(index + 1)];
};

export const upgradeRunDeckCard = (
  input: DeckOperationInput
): GameActionResult<RunState> => {
  if (!input.run.deckCardIds.includes(input.cardId)) {
    return reject(input.run, error("missing_deck_card", `Run deck does not contain card '${input.cardId}'.`, "cardId"));
  }

  const state: RunState = {
    ...input.run,
    upgradedDeckCardIds: [...(input.run.upgradedDeckCardIds ?? []), input.cardId]
  };
  const event: GameEvent = { type: "RunDeckCardUpgraded", cardId: input.cardId };

  return { ok: true, state, events: [event], errors: [] };
};

export const removeRunDeckCard = (
  input: DeckOperationInput
): GameActionResult<RunState> => {
  const deckCardIds = removeFirstCard(input.run.deckCardIds, input.cardId);
  if (!deckCardIds) {
    return reject(input.run, error("missing_deck_card", `Run deck does not contain card '${input.cardId}'.`, "cardId"));
  }

  const upgradedDeckCardIds = removeFirstCard(input.run.upgradedDeckCardIds ?? [], input.cardId) ?? (input.run.upgradedDeckCardIds ?? []);
  const state: RunState = { ...input.run, deckCardIds, upgradedDeckCardIds };
  const event: GameEvent = { type: "RunDeckCardRemoved", cardId: input.cardId };

  return { ok: true, state, events: [event], errors: [] };
};

export const transformRunDeckCard = (
  input: DeckOperationInput & { readonly rng: Rng }
): GameActionResult<RunState> => {
  const deckCardIds = removeFirstCard(input.run.deckCardIds, input.cardId);
  if (!deckCardIds) {
    return reject(input.run, error("missing_deck_card", `Run deck does not contain card '${input.cardId}'.`, "cardId"));
  }

  const candidates = input.registry.cards
    .filter((card) => card.id !== input.cardId)
    .filter((card) => card.rarity !== "starter" && card.rarity !== "special")
    .map((card) => card.id);
  if (candidates.length === 0) {
    return reject(input.run, error("missing_transform_candidate", "No eligible transform card exists.", "registry.cards"));
  }

  const toCardId = input.rng.choice(candidates);
  const upgradedDeckCardIds = removeFirstCard(input.run.upgradedDeckCardIds ?? [], input.cardId) ?? (input.run.upgradedDeckCardIds ?? []);
  const state: RunState = { ...input.run, deckCardIds: [...deckCardIds, toCardId], upgradedDeckCardIds };
  const event: GameEvent = { type: "RunDeckCardTransformed", fromCardId: input.cardId, toCardId };

  return { ok: true, state, events: [event], errors: [] };
};
