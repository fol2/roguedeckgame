import { cardInstanceId, cardId, combatantId, monsterId, petDefinitionId, petInstanceId } from "../ids";
import { starterRegistry } from "../data/registry";
import type { CombatState } from "../model/combat";
import type { PetInstance } from "../model/pet";
import type { RunState } from "../model/run";
import { createCombat, type CreateCombatInput } from "../systems/combat";
import { createEmberFoxInstanceFixture, createRunFixture } from "./fixtures";

export const createSecondEmberFoxInstanceFixture = (
  overrides: Partial<PetInstance> = {}
): PetInstance => createEmberFoxInstanceFixture({
  id: petInstanceId("ember_fox_002"),
  nickname: "Cinder",
  ...overrides
});

export const createMultiPetRunFixture = (overrides: Partial<RunState> = {}): RunState =>
  createRunFixture({
    activePetInstanceIds: [petInstanceId("ember_fox_001"), petInstanceId("ember_fox_002")],
    ...overrides
  });

export const createCombatFixture = (
  overrides: Partial<CreateCombatInput> = {}
): CombatState => {
  const result = createCombat({
    run: createRunFixture({
      deckCardIds: [
        cardId("strike"),
        cardId("defend"),
        cardId("focus"),
        cardId("fox_bite"),
        cardId("fox_guard"),
        cardId("fox_fetch")
      ]
    }),
    registry: starterRegistry,
    petInstances: [createEmberFoxInstanceFixture()],
    monsterIds: [monsterId("training_slime")],
    seed: "combat-fixture",
    openingHandSize: 5,
    ...overrides
  });

  if (!result.ok || !result.state) {
    throw new Error(result.errors[0]?.message ?? "Could not create combat fixture.");
  }

  return result.state;
};

export const createHandTunedCombatFixture = (): CombatState => ({
  id: createRunFixture().id,
  seed: "hand-tuned-fixture",
  turnNumber: 1,
  phase: "player_turn",
  activeActorId: combatantId("player"),
  player: {
    id: combatantId("player"),
    definitionId: starterRegistry.players[0].id,
    name: "Novice Tamer",
    type: "player",
    hp: 70,
    maxHp: 70,
    block: 0,
    statuses: [],
    alive: true
  },
  monsters: [
    {
      id: combatantId("monster:training_slime:0"),
      definitionId: monsterId("training_slime"),
      name: "Training Slime",
      type: "monster",
      hp: 22,
      maxHp: 22,
      block: 0,
      statuses: [],
      alive: true
    }
  ],
  activePetInstanceIds: [petInstanceId("ember_fox_001")],
  petInstances: [createEmberFoxInstanceFixture()],
  runPetStates: [
    {
      petInstanceId: petInstanceId("ember_fox_001"),
      mood: "calm",
      temporaryModifierIds: [],
      fatigue: 0
    }
  ],
  cardInstances: [
    { id: cardInstanceId("strike:1"), cardId: cardId("strike"), ownerId: combatantId("player") },
    { id: cardInstanceId("defend:1"), cardId: cardId("defend"), ownerId: combatantId("player") },
    { id: cardInstanceId("focus:1"), cardId: cardId("focus"), ownerId: combatantId("player") },
    { id: cardInstanceId("fox_bite:1"), cardId: cardId("fox_bite"), ownerId: combatantId("player") },
    { id: cardInstanceId("fox_guard:1"), cardId: cardId("fox_guard"), ownerId: combatantId("player") },
    { id: cardInstanceId("fox_fetch:1"), cardId: cardId("fox_fetch"), ownerId: combatantId("player") },
    { id: cardInstanceId("strike:2"), cardId: cardId("strike"), ownerId: combatantId("player") }
  ],
  drawPile: [cardInstanceId("strike:2")],
  hand: [
    cardInstanceId("strike:1"),
    cardInstanceId("defend:1"),
    cardInstanceId("focus:1"),
    cardInstanceId("fox_bite:1"),
    cardInstanceId("fox_guard:1"),
    cardInstanceId("fox_fetch:1")
  ],
  discardPile: [],
  exhaustPile: [],
  energy: 3,
  maxEnergy: 3,
  events: []
});
