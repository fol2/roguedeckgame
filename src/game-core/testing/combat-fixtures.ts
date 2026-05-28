import {
  cardInstanceId,
  cardId,
  combatantId,
  enemyCardInstanceId,
  encounterId,
  monsterAbilityId,
  monsterId,
  monsterIntentId,
  petInstanceId,
  runNodeId,
  statusId,
  type CombatantId
} from "../ids";
import { starterRegistry } from "../data/registry";
import type { CombatState } from "../model/combat";
import type { MonsterIntentDefinition } from "../model/monster";
import type { PetInstance } from "../model/pet";
import type { RunState } from "../model/run";
import type { CardActorState } from "../model/combat";
import { findCardActor, findPlayerCardActor, projectCombatStateFromCardActors, updateCardActor } from "../systems/card-actors";
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
    runNodeId: runNodeId("act1_forest_0_combat_a"),
    encounterId: encounterId("training_slime_encounter"),
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
  runNodeId: runNodeId("act1_forest_0_combat_a"),
  encounterId: encounterId("training_slime_encounter"),
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
      activeModifierIds: [],
      temporaryModifierIds: [],
      usedModifierIdsThisCombat: [],
      usedModifierIdsThisTurn: [],
      fatigue: 0
    }
  ],
  monsterIntents: [
    {
      monsterCombatantId: combatantId("monster:training_slime:0"),
      intentId: monsterIntentId("training_slime_attack")
    }
  ],
  plannedMonsterAbilities: [
    {
      monsterCombatantId: combatantId("monster:training_slime:0"),
      intentId: monsterIntentId("training_slime_attack"),
      abilityId: monsterAbilityId("training_slime_attack")
    }
  ],
  cardActors: [
    {
      actorId: combatantId("player"),
      ownerCombatantId: combatantId("player"),
      actorKind: "player",
      side: "playerSide",
      teamId: "player",
      controllerKind: "human",
      cardInstances: [
        { id: cardInstanceId("strike:1"), cardId: cardId("strike"), ownerActorId: combatantId("player") },
        { id: cardInstanceId("defend:1"), cardId: cardId("defend"), ownerActorId: combatantId("player") },
        { id: cardInstanceId("focus:1"), cardId: cardId("focus"), ownerActorId: combatantId("player") },
        { id: cardInstanceId("fox_bite:1"), cardId: cardId("fox_bite"), ownerActorId: combatantId("player") },
        { id: cardInstanceId("fox_guard:1"), cardId: cardId("fox_guard"), ownerActorId: combatantId("player") },
        { id: cardInstanceId("fox_fetch:1"), cardId: cardId("fox_fetch"), ownerActorId: combatantId("player") },
        { id: cardInstanceId("strike:2"), cardId: cardId("strike"), ownerActorId: combatantId("player") }
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
      planned: { candidateCardInstanceIds: [] },
      playArea: [],
      discardPile: [],
      exhaustPile: [],
      removedPile: [],
      openingHandSize: 5,
      drawPerTurn: 3,
      maxHandSize: 10,
      maxEnergy: 3,
      energy: 3,
      energyRefill: 3,
      unplayedHandPolicy: "retain"
    },
    {
      actorId: combatantId("monster:training_slime:0"),
      ownerCombatantId: combatantId("monster:training_slime:0"),
      actorKind: "enemy",
      side: "enemySide",
      teamId: "enemy",
      controllerKind: "heuristicAi",
      cardInstances: [
        {
          id: enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_attack:0"),
          abilityId: monsterAbilityId("training_slime_attack"),
          ownerActorId: combatantId("monster:training_slime:0")
        },
        {
          id: enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_block:0"),
          abilityId: monsterAbilityId("training_slime_block"),
          ownerActorId: combatantId("monster:training_slime:0")
        }
      ],
      drawPile: [],
      hand: [enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_block:0")],
      planned: {
        planMode: "locked",
        lockedCardInstanceId: enemyCardInstanceId("monster:training_slime:0:enemy-card:training_slime_attack:0"),
        candidateCardInstanceIds: []
      },
      playArea: [],
      discardPile: [],
      exhaustPile: [],
      removedPile: [],
      openingHandSize: 2,
      drawPerTurn: 1,
      maxHandSize: 3,
      maxEnergy: 1,
      energy: 0,
      energyRefill: 1,
      unplayedHandPolicy: "retain"
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

export const createEnemyTurnFixture = (): CombatState => {
  const baseState = createHandTunedCombatFixture();
  return {
    ...baseState,
    phase: "enemy_turn",
    cardActors: baseState.cardActors.map((actor) =>
      actor.actorKind === "player"
        ? { ...actor, hand: [], discardPile: [...baseState.hand], energy: 0 }
        : actor
    ),
    hand: [],
    discardPile: [...baseState.hand],
    energy: 0,
    events: []
  };
};

export const createForcedIntentCombatFixture = (
  intentId = monsterIntentId("training_slime_attack")
): CombatState => {
  const baseState = createEnemyTurnFixture();
  const abilityId = monsterAbilityId(intentId);
  const monsterCombatantId = baseState.monsters[0].id;
  const updatedState = {
    ...baseState,
    cardActors: baseState.cardActors.map((actor) => {
      if (actor.actorId !== monsterCombatantId) {
        return actor;
      }

      const selectedCardInstanceId = actor.cardInstances.find((cardInstance) =>
        cardInstance.abilityId === abilityId
      )?.id;

      return {
        ...actor,
        hand: selectedCardInstanceId
          ? actor.hand.filter((cardInstanceIdValue) => cardInstanceIdValue !== selectedCardInstanceId)
          : actor.hand,
        planned: {
          planMode: actor.planned.planMode,
          ...(selectedCardInstanceId ? { lockedCardInstanceId: selectedCardInstanceId } : {}),
          candidateCardInstanceIds: []
        },
        energy: selectedCardInstanceId ? Math.max(0, actor.energyRefill - 1) : actor.energy
      };
    }),
    monsterIntents: [
      {
        monsterCombatantId,
        intentId
      }
    ],
    plannedMonsterAbilities: [
      {
        monsterCombatantId,
        intentId,
        abilityId
      }
    ]
  };

  return projectCombatStateFromCardActors(updatedState);
};

export const createBurningMonsterFixture = (stacks = 2): CombatState => {
  const baseState = createEnemyTurnFixture();
  return {
    ...baseState,
    monsters: [
      {
        ...baseState.monsters[0],
        statuses: [{ statusId: statusId("burn"), stacks }]
      }
    ]
  };
};

export const createNearlyDeadPlayerFixture = (): CombatState => {
  const baseState = createForcedIntentCombatFixture(monsterIntentId("training_slime_attack"));
  return {
    ...baseState,
    player: { ...baseState.player, hp: 5 }
  };
};

export const createNearlyDeadMonsterFixture = (): CombatState => {
  const baseState = createHandTunedCombatFixture();
  return {
    ...baseState,
    monsters: [{ ...baseState.monsters[0], hp: 6 }]
  };
};

export const createWonCombatFixture = (overrides: Partial<CombatState> = {}): CombatState => {
  const baseState = createCombatFixture();
  return {
    ...baseState,
    phase: "won",
    activeActorId: combatantId("player"),
    monsters: baseState.monsters.map((monster) => ({ ...monster, hp: 0, alive: false })),
    monsterIntents: [],
    plannedMonsterAbilities: [],
    events: [],
    ...overrides
  };
};

export const createLostCombatFixture = (overrides: Partial<CombatState> = {}): CombatState => {
  const baseState = createCombatFixture();
  return {
    ...baseState,
    phase: "lost",
    player: { ...baseState.player, hp: 0, alive: false },
    monsterIntents: [],
    plannedMonsterAbilities: [],
    events: [],
    ...overrides
  };
};

export const withPlayerCardActorState = (
  state: CombatState,
  update: (actor: CardActorState) => CardActorState
): CombatState => {
  const playerActor = findPlayerCardActor(state);
  if (!playerActor) {
    throw new Error("Player Card Actor is missing from combat fixture.");
  }

  return projectCombatStateFromCardActors(updateCardActor(state, update(playerActor)));
};

export const withEnemyCardActorState = (
  state: CombatState,
  enemyActorId: CombatantId,
  update: (actor: CardActorState) => CardActorState
): CombatState => {
  const enemyActor = findCardActor(state, enemyActorId);
  if (!enemyActor || enemyActor.actorKind !== "enemy") {
    throw new Error(`Enemy Card Actor '${enemyActorId}' is missing from combat fixture.`);
  }

  return projectCombatStateFromCardActors(updateCardActor(state, update(enemyActor)));
};

export const createRegistryWithForcedTrainingSlimeIntent = (
  intent: MonsterIntentDefinition
) => ({
  ...starterRegistry,
  monsters: starterRegistry.monsters.map((monster) =>
    monster.id === monsterId("training_slime")
      ? { ...monster, intentPool: [intent] }
      : monster
  )
});
