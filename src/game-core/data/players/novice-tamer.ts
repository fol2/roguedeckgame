import { cardId, deckId, playerClassId, playerClassModifierId } from "../../ids";
import { act1NormalBalance } from "../balance/act1-normal";
import type { PlayerClassDefinition } from "../../model/player";

export const noviceTamer: PlayerClassDefinition = {
  id: playerClassId("novice_tamer"),
  name: "Ashbound Keeper",
  startingDeckId: deckId("novice_tamer_starter"),
  startingDeckCardIds: [
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
  startingRelicIds: [],
  classModifierIds: [playerClassModifierId("field_sense")],
  maxHp: act1NormalBalance.player.maxHp,
  maxActivePets: 1,
  petSlotCount: 1,
  classTags: ["starter", "keeper", "pet", "command", "burn", "scout", "fieldcraft"]
};

export const players = [noviceTamer] as const;
