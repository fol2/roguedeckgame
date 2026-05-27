import { cardId, deckId, playerClassId } from "../../ids";
import type { StarterDeckDefinition } from "../../model/deck";

export const noviceTamerStarterDeck: StarterDeckDefinition = {
  id: deckId("novice_tamer_starter"),
  name: "Novice Tamer Starter",
  ownerPlayerClassId: playerClassId("novice_tamer"),
  cardIds: [
    cardId("strike"),
    cardId("strike"),
    cardId("strike"),
    cardId("defend"),
    cardId("defend"),
    cardId("focus"),
    cardId("fox_bite"),
    cardId("fox_guard"),
    cardId("fox_fetch")
  ],
  tags: ["starter", "novice-tamer", "ember-fox", "pet-command"],
  authoringNotes: "Phase 1 starter package for one active Ember Fox pet."
};

export const decks = [noviceTamerStarterDeck] as const;
