import { cardId, deckId, playerClassId } from "../../ids";
import type { StarterDeckDefinition } from "../../model/deck";

export const noviceTamerStarterDeck: StarterDeckDefinition = {
  id: deckId("novice_tamer_starter"),
  name: "Ashbound Keeper Starter",
  ownerPlayerClassId: playerClassId("novice_tamer"),
  cardIds: [
    cardId("keepers_tap"),
    cardId("keepers_tap"),
    cardId("field_brace"),
    cardId("field_brace"),
    cardId("read_the_ash"),
    cardId("fox_bite"),
    cardId("fox_bite"),
    cardId("tailguard"),
    cardId("kindle_mark"),
    cardId("fetch_signal")
  ],
  tags: ["starter", "ashbound-keeper", "ember-fox", "pet-command", "scout"],
  authoringNotes: "v0.2 starter package for Ashbound Keeper with one active Ember Fox pet."
};

export const decks = [noviceTamerStarterDeck] as const;
