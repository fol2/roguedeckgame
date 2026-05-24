import {
  cardId,
  petInstanceId,
  playerClassId,
  runId,
  storyFlagId
} from "../ids";
import type { RunState } from "../model/run";

export const createRunFixture = (overrides: Partial<RunState> = {}): RunState => ({
  id: runId("run_fixture"),
  seed: "fixture-seed",
  playerClassId: playerClassId("novice_tamer"),
  activePetInstanceIds: [petInstanceId("ember_fox_001")],
  deckCardIds: [cardId("strike"), cardId("defend"), cardId("fox_bite")],
  runFlags: [],
  storyFlags: [storyFlagId("ember_fox_memory_01_unlocked")],
  ...overrides
});
