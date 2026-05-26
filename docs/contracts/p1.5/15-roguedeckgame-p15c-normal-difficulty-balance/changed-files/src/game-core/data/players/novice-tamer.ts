import { cardId, playerClassId } from "../../ids";
import { act1NormalBalance } from "../balance/act1-normal";
import type { PlayerClassDefinition } from "../../model/player";

export const noviceTamer: PlayerClassDefinition = {
  id: playerClassId("novice_tamer"),
  name: "Novice Tamer",
  startingDeckCardIds: [
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
  startingRelicIds: [],
  maxHp: act1NormalBalance.player.maxHp,
  maxActivePets: 1,
  petSlotCount: 1,
  classTags: ["starter", "pet", "command"]
};

export const players = [noviceTamer] as const;
