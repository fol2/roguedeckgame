import {
  starterRegistry,
  type CardId,
  type CardInstanceId,
  type CombatantId,
  type CombatantState,
  type CombatPhase,
  type CombatState,
  type GameContentRegistry,
  type GameEvent,
  type EncounterId,
  type MonsterIntentId,
  type PetInstance,
  type PetInstanceId,
  type RunState,
  type RunNodeType,
  type StatusId
} from "../../game-core";
import { formatCombatEventMessage } from "../animation/combat-event-messages";

export type CombatSandboxState = {
  readonly run: RunState;
  readonly petInstances: readonly PetInstance[];
  readonly combat: CombatState;
  readonly lastEvents: readonly GameEvent[];
};

export type CombatCardViewModel = {
  readonly cardInstanceId: CardInstanceId;
  readonly cardId: CardId;
  readonly name: string;
  readonly description: string;
  readonly cost: number;
  readonly tags: readonly string[];
  readonly playable: boolean;
};

export type CombatantViewModel = {
  readonly id: CombatantId;
  readonly name: string;
  readonly type: "player" | "monster";
  readonly hp: number;
  readonly maxHp: number;
  readonly block: number;
  readonly statuses: readonly { readonly statusId: StatusId; readonly stacks: number }[];
  readonly alive: boolean;
};

export type MonsterIntentViewModel = {
  readonly monsterId: CombatantId;
  readonly intentId: MonsterIntentId;
  readonly label: string;
  readonly description: string;
};

export type PetViewModel = {
  readonly petInstanceId: PetInstanceId;
  readonly name: string;
  readonly nickname: string;
  readonly mood: string;
  readonly activeModifierCount: number;
};

export type CombatViewModel = {
  readonly phase: CombatPhase;
  readonly runNodeType?: RunNodeType;
  readonly encounterId?: EncounterId;
  readonly encounterLabel: string;
  readonly turnNumber: number;
  readonly energy: number;
  readonly maxEnergy: number;
  readonly player: CombatantViewModel;
  readonly pets: readonly PetViewModel[];
  readonly monsters: readonly CombatantViewModel[];
  readonly monsterIntents: readonly MonsterIntentViewModel[];
  readonly hand: readonly CombatCardViewModel[];
  readonly drawPileCount: number;
  readonly discardPileCount: number;
  readonly continueAvailable: boolean;
  readonly resetAvailable: boolean;
  readonly eventMessages: readonly string[];
};

const findCard = (registry: GameContentRegistry, cardId: CardId) =>
  registry.cards.find((card) => card.id === cardId);

const toCombatantViewModel = (combatant: CombatantState): CombatantViewModel => ({
  id: combatant.id,
  name: combatant.name,
  type: combatant.type,
  hp: combatant.hp,
  maxHp: combatant.maxHp,
  block: combatant.block,
  statuses: combatant.statuses.map((status) => ({
    statusId: status.statusId,
    stacks: status.stacks
  })),
  alive: combatant.alive
});

export const buildCombatViewModel = (
  state: CombatSandboxState,
  registry: GameContentRegistry = starterRegistry
): CombatViewModel => {
  const cardInstancesById = new Map(
    state.combat.cardInstances.map((cardInstance) => [cardInstance.id, cardInstance])
  );
  const petStatesById = new Map(
    state.combat.runPetStates.map((runPetState) => [runPetState.petInstanceId, runPetState])
  );
  const currentNode = state.run.map?.nodes.find((node) => node.id === state.run.map?.currentNodeId);
  const encounter = currentNode?.encounterId
    ? registry.encounters.find((candidate) => candidate.id === currentNode.encounterId)
    : undefined;

  return {
    phase: state.combat.phase,
    runNodeType: currentNode?.type,
    encounterId: currentNode?.encounterId,
    encounterLabel: encounter?.name ?? currentNode?.type ?? "Combat",
    turnNumber: state.combat.turnNumber,
    energy: state.combat.energy,
    maxEnergy: state.combat.maxEnergy,
    player: toCombatantViewModel(state.combat.player),
    pets: state.combat.activePetInstanceIds.map((petInstanceId) => {
      const petInstance = state.petInstances.find((candidate) => candidate.id === petInstanceId);
      const petDefinition = petInstance
        ? registry.pets.find((candidate) => candidate.id === petInstance.definitionId)
        : undefined;
      const petState = petStatesById.get(petInstanceId);

      return {
        petInstanceId,
        name: petDefinition?.name ?? "Unknown Pet",
        nickname: petInstance?.nickname ?? "Unknown",
        mood: petState?.mood ?? "calm",
        activeModifierCount: petState?.activeModifierIds.length ?? 0
      };
    }),
    monsters: state.combat.monsters.map(toCombatantViewModel),
    monsterIntents: state.combat.monsterIntents.map((intent) => {
      const monster = state.combat.monsters.find((candidate) => candidate.id === intent.monsterCombatantId);
      const monsterDefinition = monster?.definitionId
        ? registry.monsters.find((candidate) => candidate.id === monster.definitionId)
        : undefined;
      const intentDefinition = monsterDefinition?.intentPool.find((candidate) => candidate.id === intent.intentId);

      return {
        monsterId: intent.monsterCombatantId,
        intentId: intent.intentId,
        label: intentDefinition?.type ?? "intent",
        description: intentDefinition?.description ?? "Preparing an action."
      };
    }),
    hand: state.combat.hand.map((cardInstanceId) => {
      const cardInstance = cardInstancesById.get(cardInstanceId);
      const cardDefinition = cardInstance ? findCard(registry, cardInstance.cardId) : undefined;
      const cost = cardDefinition?.cost ?? 0;

      return {
        cardInstanceId,
        cardId: cardInstance?.cardId ?? (cardInstanceId as unknown as CardId),
        name: cardDefinition?.name ?? "Unknown Card",
        description: cardDefinition?.description ?? "Missing card definition.",
        cost,
        tags: cardDefinition?.tags ?? [],
        playable: state.combat.phase === "player_turn" && state.combat.energy >= cost
      };
    }),
    drawPileCount: state.combat.drawPile.length,
    discardPileCount: state.combat.discardPile.length,
    continueAvailable: state.combat.phase === "won" || state.combat.phase === "lost",
    resetAvailable: state.run.status === "lost" || state.run.status === "completed",
    eventMessages: state.lastEvents.map(formatCombatEventMessage)
  };
};
