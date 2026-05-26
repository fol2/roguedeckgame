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
import type { CardDefinition, CardType } from "../../game-core/model/card";
import type { CombatantTarget, EffectDefinition } from "../../game-core/model/effect";
import type { MonsterIntentType } from "../../game-core/model/monster";
import { formatCombatEventMessage } from "../animation/combat-event-messages";

export type CombatSandboxState = {
  readonly run: RunState;
  readonly petInstances: readonly PetInstance[];
  readonly combat: CombatState;
  readonly lastEvents: readonly GameEvent[];
};

export type CardTargetKind =
  | "none"
  | "self"
  | "enemy"
  | "allEnemies"
  | "pet"
  | "petAndEnemy"
  | "petAndSelf";

export type CardPlayMode = "immediate" | "selectEnemy" | "selectPet" | "unsupported";

export type CombatCardViewModel = {
  readonly cardInstanceId: CardInstanceId;
  readonly cardId: CardId;
  readonly name: string;
  readonly description: string;
  readonly type: CardType | "unknown";
  readonly cost: number;
  readonly tags: readonly string[];
  readonly playable: boolean;
  readonly unplayableReason?: string;
  readonly isPetCommand: boolean;
  readonly commandPetSlotIndex?: number;
  readonly targetKind: CardTargetKind;
  readonly playMode: CardPlayMode;
  readonly requiresManualTarget: boolean;
  readonly validTargetIds: readonly CombatantId[];
};

export type CombatantStatusViewModel = {
  readonly statusId: StatusId;
  readonly stacks: number;
  readonly label: string;
  readonly tooltip: string;
};

export type CombatantViewModel = {
  readonly id: CombatantId;
  readonly name: string;
  readonly type: "player" | "monster";
  readonly hp: number;
  readonly maxHp: number;
  readonly block: number;
  readonly statuses: readonly CombatantStatusViewModel[];
  readonly alive: boolean;
};

export type MonsterIntentViewModel = {
  readonly monsterId: CombatantId;
  readonly intentId: MonsterIntentId;
  readonly type: MonsterIntentType | "intent";
  readonly label: string;
  readonly description: string;
  readonly targetHint: "keeper" | "self" | "ally" | "allEnemies" | "pet" | "unknown";
  readonly amount?: number;
};

export type PetChargeViewModel = {
  readonly label: string;
  readonly current: number;
  readonly max: number;
  readonly tooltip: string;
};

export type PetViewModel = {
  readonly petInstanceId: PetInstanceId;
  readonly name: string;
  readonly nickname: string;
  readonly mood: string;
  readonly activeModifierCount: number;
  readonly slotIndex: number;
  readonly statusLabels: readonly string[];
  readonly charge?: PetChargeViewModel;
};

export type CombatViewModel = {
  readonly revision: number;
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
  readonly uiWarnings: readonly string[];
  readonly uiCaps: {
    readonly maxHandCards: number;
    readonly maxEnemies: number;
    readonly maxPetSlots: number;
    readonly maxEnemyVisibleStatuses: number;
    readonly maxPlayerVisibleStatuses: number;
    readonly maxPetVisibleStatuses: number;
    readonly maxCardVisibleTags: number;
  };
};

export const COMBAT_UI_CAPS = {
  maxHandCards: 10,
  maxEnemies: 3,
  maxPetSlots: 3,
  maxEnemyVisibleStatuses: 4,
  maxPlayerVisibleStatuses: 5,
  maxPetVisibleStatuses: 3,
  maxCardVisibleTags: 4
} as const;

const findCard = (registry: GameContentRegistry, cardId: CardId) =>
  registry.cards.find((card) => card.id === cardId);

const targetNeedsActionTarget = (target: CombatantTarget): boolean =>
  target.type === "target" && target.combatantId === undefined;

const effectHasActionTarget = (effectDefinition: EffectDefinition): boolean =>
  "target" in effectDefinition && targetNeedsActionTarget(effectDefinition.target);

const effectTargetsSelf = (effectDefinition: EffectDefinition): boolean =>
  "target" in effectDefinition && effectDefinition.target.type === "self";

const effectTargetsAllEnemies = (effectDefinition: EffectDefinition): boolean =>
  "target" in effectDefinition && effectDefinition.target.type === "allEnemies";

const effectHasPetTarget = (effectDefinition: EffectDefinition): boolean =>
  "petTarget" in effectDefinition;

const cardHasRequiredActivePet = (
  state: CombatState,
  cardDefinition: CardDefinition
): boolean => {
  if (!cardDefinition.requiresPetDefinitionId) {
    return true;
  }

  return state.petInstances
    .filter((petInstance) => state.activePetInstanceIds.includes(petInstance.id))
    .some((petInstance) => petInstance.definitionId === cardDefinition.requiresPetDefinitionId);
};

const getValidEnemyTargetIds = (state: CombatState): readonly CombatantId[] =>
  state.monsters.filter((monster) => monster.alive).map((monster) => monster.id);

const getTargetKind = (cardDefinition: CardDefinition): CardTargetKind => {
  const requiresManualTarget = cardDefinition.effects.some(effectHasActionTarget);
  const hasPetTarget = cardDefinition.effects.some(effectHasPetTarget);
  const targetsSelf = cardDefinition.effects.some(effectTargetsSelf);
  const targetsAllEnemies = cardDefinition.effects.some(effectTargetsAllEnemies);
  const isPetCommand = cardDefinition.type === "pet-command";

  if (requiresManualTarget && isPetCommand) {
    return "petAndEnemy";
  }

  if (requiresManualTarget) {
    return "enemy";
  }

  if (targetsSelf && isPetCommand) {
    return "petAndSelf";
  }

  if (hasPetTarget || isPetCommand) {
    return "pet";
  }

  if (targetsAllEnemies) {
    return "allEnemies";
  }

  if (targetsSelf) {
    return "self";
  }

  return "none";
};

const getPlayMode = (targetKind: CardTargetKind): CardPlayMode => {
  if (targetKind === "enemy" || targetKind === "petAndEnemy") {
    return "selectEnemy";
  }

  if (targetKind === "none" || targetKind === "self" || targetKind === "pet" || targetKind === "petAndSelf" || targetKind === "allEnemies") {
    return "immediate";
  }

  return "unsupported";
};

const getCommandPetSlotIndex = (
  state: CombatState,
  cardDefinition: CardDefinition
): number | undefined => {
  if (cardDefinition.type !== "pet-command") {
    return undefined;
  }

  if (!cardDefinition.requiresPetDefinitionId) {
    return 0;
  }

  const slotIndex = state.activePetInstanceIds.findIndex((petInstanceId) =>
    state.petInstances.some((petInstance) =>
      petInstance.id === petInstanceId &&
      petInstance.definitionId === cardDefinition.requiresPetDefinitionId
    )
  );

  return slotIndex >= 0 ? slotIndex : undefined;
};

const getUnplayableReason = (
  state: CombatState,
  cardDefinition: CardDefinition,
  cost: number,
  targetKind: CardTargetKind
): string | undefined => {
  if (state.phase !== "player_turn") {
    return "Not your turn.";
  }

  if (state.energy < cost) {
    return "Not enough energy.";
  }

  if (!cardHasRequiredActivePet(state, cardDefinition)) {
    return "No commandable active pet.";
  }

  if ((targetKind === "enemy" || targetKind === "petAndEnemy") && getValidEnemyTargetIds(state).length === 0) {
    return "No valid enemy target.";
  }

  return undefined;
};

const statusLabel = (statusId: StatusId, stacks: number): string =>
  `${statusId}${stacks > 0 ? ` ${stacks}` : ""}`;

const statusTooltip = (statusId: StatusId, stacks: number): string => {
  if (statusId === "burn") {
    return `Burn ${stacks}: takes damage at turn start, then decreases.`;
  }

  return `${statusId} ${stacks}`;
};

const toCombatantViewModel = (combatant: CombatantState): CombatantViewModel => ({
  id: combatant.id,
  name: combatant.name,
  type: combatant.type,
  hp: combatant.hp,
  maxHp: combatant.maxHp,
  block: combatant.block,
  statuses: combatant.statuses.map((status) => ({
    statusId: status.statusId,
    stacks: status.stacks,
    label: statusLabel(status.statusId, status.stacks),
    tooltip: statusTooltip(status.statusId, status.stacks)
  })),
  alive: combatant.alive
});

const getIntentAmount = (intentDefinition: { readonly effects: readonly EffectDefinition[] } | undefined): number | undefined => {
  const damageAmounts = intentDefinition?.effects
    .filter((effect): effect is Extract<EffectDefinition, { readonly type: "damage" }> => effect.type === "damage")
    .map((effect) => effect.amount) ?? [];

  if (damageAmounts.length === 0) {
    return undefined;
  }

  return damageAmounts.reduce((sum, amount) => sum + amount, 0);
};

const getIntentTargetHint = (
  intentDefinition: { readonly effects: readonly EffectDefinition[] } | undefined
): MonsterIntentViewModel["targetHint"] => {
  const firstTargetedEffect = intentDefinition?.effects.find((effect) => "target" in effect);

  if (!firstTargetedEffect || !("target" in firstTargetedEffect)) {
    return "unknown";
  }

  if (firstTargetedEffect.target.type === "self") {
    return "self";
  }

  if (firstTargetedEffect.target.type === "allEnemies") {
    return "allEnemies";
  }

  return "keeper";
};

const buildUiWarnings = (state: CombatState): readonly string[] => {
  const warnings: string[] = [];

  if (state.hand.length > COMBAT_UI_CAPS.maxHandCards) {
    warnings.push(`Unsupported Phase 1 hand size: ${state.hand.length}/${COMBAT_UI_CAPS.maxHandCards}.`);
  }

  if (state.monsters.length > COMBAT_UI_CAPS.maxEnemies) {
    warnings.push(`Unsupported Phase 1 enemy count: ${state.monsters.length}/${COMBAT_UI_CAPS.maxEnemies}.`);
  }

  if (state.activePetInstanceIds.length > COMBAT_UI_CAPS.maxPetSlots) {
    warnings.push(`Unsupported Phase 1 active pet slots: ${state.activePetInstanceIds.length}/${COMBAT_UI_CAPS.maxPetSlots}.`);
  }

  return warnings;
};

export const buildCombatViewModel = (
  state: CombatSandboxState,
  registry: GameContentRegistry = starterRegistry,
  revision = 0
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
    revision,
    phase: state.combat.phase,
    runNodeType: currentNode?.type,
    encounterId: currentNode?.encounterId,
    encounterLabel: encounter?.name ?? currentNode?.type ?? "Combat",
    turnNumber: state.combat.turnNumber,
    energy: state.combat.energy,
    maxEnergy: state.combat.maxEnergy,
    player: toCombatantViewModel(state.combat.player),
    pets: state.combat.activePetInstanceIds.map((petInstanceId, slotIndex) => {
      const petInstance = state.petInstances.find((candidate) => candidate.id === petInstanceId);
      const petDefinition = petInstance
        ? registry.pets.find((candidate) => candidate.id === petInstance.definitionId)
        : undefined;
      const petState = petStatesById.get(petInstanceId);
      const activeModifierCount = petState?.activeModifierIds.length ?? 0;

      return {
        petInstanceId,
        name: petDefinition?.name ?? "Unknown Pet",
        nickname: petInstance?.nickname ?? "Unknown",
        mood: petState?.mood ?? "calm",
        activeModifierCount,
        slotIndex,
        statusLabels: [
          petState?.mood ?? "calm",
          ...(activeModifierCount > 0 ? [`mods ${activeModifierCount}`] : [])
        ]
      };
    }),
    monsters: state.combat.monsters.map(toCombatantViewModel),
    monsterIntents: state.combat.monsterIntents.map((intent) => {
      const monster = state.combat.monsters.find((candidate) => candidate.id === intent.monsterCombatantId);
      const monsterDefinition = monster?.definitionId
        ? registry.monsters.find((candidate) => candidate.id === monster.definitionId)
        : undefined;
      const intentDefinition = monsterDefinition?.intentPool.find((candidate) => candidate.id === intent.intentId);
      const label = intentDefinition?.type ?? "intent";

      return {
        monsterId: intent.monsterCombatantId,
        intentId: intent.intentId,
        type: intentDefinition?.type ?? "intent",
        label,
        description: intentDefinition?.description ?? "Preparing an action.",
        targetHint: getIntentTargetHint(intentDefinition),
        amount: getIntentAmount(intentDefinition)
      };
    }),
    hand: state.combat.hand.map((cardInstanceId) => {
      const cardInstance = cardInstancesById.get(cardInstanceId);
      const cardDefinition = cardInstance ? findCard(registry, cardInstance.cardId) : undefined;
      const cost = cardDefinition?.cost ?? 0;
      const targetKind = cardDefinition ? getTargetKind(cardDefinition) : "none";
      const unplayableReason = cardDefinition
        ? getUnplayableReason(state.combat, cardDefinition, cost, targetKind)
        : "Missing card definition.";
      const requiresManualTarget = targetKind === "enemy" || targetKind === "petAndEnemy";

      return {
        cardInstanceId,
        cardId: cardInstance?.cardId ?? (cardInstanceId as unknown as CardId),
        name: cardDefinition?.name ?? "Unknown Card",
        description: cardDefinition?.description ?? "Missing card definition.",
        type: cardDefinition?.type ?? "unknown",
        cost,
        tags: cardDefinition?.tags ?? [],
        playable: unplayableReason === undefined,
        unplayableReason,
        isPetCommand: cardDefinition?.type === "pet-command",
        commandPetSlotIndex: cardDefinition ? getCommandPetSlotIndex(state.combat, cardDefinition) : undefined,
        targetKind,
        playMode: getPlayMode(targetKind),
        requiresManualTarget,
        validTargetIds: requiresManualTarget ? getValidEnemyTargetIds(state.combat) : []
      };
    }),
    drawPileCount: state.combat.drawPile.length,
    discardPileCount: state.combat.discardPile.length,
    continueAvailable: state.combat.phase === "won" || state.combat.phase === "lost",
    resetAvailable: state.run.status === "lost" || state.run.status === "completed",
    eventMessages: state.lastEvents.map(formatCombatEventMessage),
    uiWarnings: buildUiWarnings(state.combat),
    uiCaps: COMBAT_UI_CAPS
  };
};
