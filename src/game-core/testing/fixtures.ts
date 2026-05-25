import {
  cardId,
  petInstanceId,
  petDefinitionId,
  playerClassId,
  runId,
} from "../ids";
import type { PetInstance } from "../model/pet";
import type { RunState } from "../model/run";

export const createRunFixture = (overrides: Partial<RunState> = {}): RunState => ({
  id: runId("run_fixture"),
  seed: "fixture-seed",
  playerClassId: playerClassId("novice_tamer"),
  activePetInstanceIds: [petInstanceId("ember_fox_001")],
  status: "not_started",
  deckCardIds: [cardId("strike"), cardId("defend"), cardId("fox_bite")],
  runFlags: [],
  storyFlags: [],
  ...overrides
});

export const createEmberFoxInstanceFixture = (
  overrides: Partial<PetInstance> = {}
): PetInstance => ({
  id: petInstanceId("ember_fox_001"),
  definitionId: petDefinitionId("ember_fox"),
  nickname: "Ember",
  bondLevel: 1,
  bondXp: 0,
  unlockedUpgradeIds: [],
  chosenEvolutionNodeIds: [],
  unlockedEvolutionNodeIds: [],
  unlockedMemoryIds: [],
  storyFlags: [],
  seenStoryEventIds: [],
  ...overrides
});
