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
import {
  getCardActionProfile,
  type CardPlayMode,
  type CardTargetKind
} from "../../game-core";
import type { CardDefinition, CardType } from "../../game-core/model/card";
import type { EffectDefinition } from "../../game-core/model/effect";
import type { MonsterIntentType } from "../../game-core/model/monster";
import { formatCombatEventMessage } from "../animation/combat-event-messages";

export type { CardPlayMode, CardTargetKind } from "../../game-core";

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
  readonly type: CardType | "unknown";
  readonly cost: number;
  readonly tags: readonly string[];
  readonly playable: boolean;
  readonly unplayableReason?: string;
  readonly isPetCommand: boolean;
  readonly tagTooltips: readonly CombatTagTooltipViewModel[];
  readonly tagOverflowTooltip?: CombatTooltipCopyViewModel;
  readonly keywordExplanations: readonly CombatKeywordExplanationViewModel[];
  readonly detail: CombatDetailCopyViewModel;
  readonly commandPetSlotIndex?: number;
  readonly targetKind: CardTargetKind;
  readonly playMode: CardPlayMode;
  readonly requiresManualTarget: boolean;
  readonly validTargetIds: readonly CombatantId[];
};

export type CombatTooltipCopyViewModel = {
  readonly title: string;
  readonly body: string;
};

export type CombatDetailCopyViewModel = {
  readonly title: string;
  readonly subtitle?: string;
  readonly lines: readonly string[];
  readonly footer?: string;
};

export type CombatTagTooltipViewModel = {
  readonly tag: string;
  readonly title: string;
  readonly body: string;
};

export type CombatKeywordExplanationViewModel = {
  readonly keyword: string;
  readonly explanation: string;
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
  readonly statusOverflowTooltip?: CombatTooltipCopyViewModel;
  readonly alive: boolean;
  readonly tooltip: CombatTooltipCopyViewModel;
  readonly detail: CombatDetailCopyViewModel;
};

export type MonsterIntentViewModel = {
  readonly monsterId: CombatantId;
  readonly intentId: MonsterIntentId;
  readonly type: MonsterIntentType | "intent";
  readonly label: string;
  readonly description: string;
  readonly targetHint: "keeper" | "self" | "ally" | "allEnemies" | "pet" | "unknown";
  readonly amount?: number;
  readonly tooltip: CombatTooltipCopyViewModel;
  readonly detail: CombatDetailCopyViewModel;
};

export type CombatPileViewModel = {
  readonly label: string;
  readonly count: number;
  readonly tooltip: CombatTooltipCopyViewModel;
  readonly detail: CombatDetailCopyViewModel;
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
  readonly statusTooltips: readonly PetStatusTooltipViewModel[];
  readonly statusOverflowTooltip?: CombatTooltipCopyViewModel;
  readonly tooltip: CombatTooltipCopyViewModel;
  readonly detail: CombatDetailCopyViewModel;
  readonly charge?: PetChargeViewModel;
};

export type PetStatusTooltipViewModel = {
  readonly label: string;
  readonly title: string;
  readonly body: string;
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
  readonly drawPile: CombatPileViewModel;
  readonly drawPileCount: number;
  readonly discardPile: CombatPileViewModel;
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
    return [
      `Burn ${stacks}`,
      `At the start of this unit's turn, take ${stacks} damage ignoring Block.`,
      "Then Burn decreases. Expires at 0."
    ].join("\n");
  }

  return [
    statusLabel(statusId, stacks),
    "Timing and duration are not defined yet.",
    "No additional gameplay details available yet."
  ].join("\n");
};

const keywordCopyByTag: Readonly<Record<string, CombatKeywordExplanationViewModel>> = {
  attack: { keyword: "Attack", explanation: "Deals direct damage to an enemy target." },
  block: { keyword: "Block", explanation: "Prevents incoming attack damage." },
  burn: { keyword: "Burn", explanation: "Damages this unit at the start of its turn, ignores Block, then decreases and expires at 0." },
  command: { keyword: "Pet-Command", explanation: "Sends a command to the active pet before the effect resolves." },
  draw: { keyword: "Draw", explanation: "Adds cards from the draw pile to the hand." },
  fetch: { keyword: "Fetch", explanation: "Uses Ember Fox to help draw or recover cards." },
  fire: { keyword: "Fire", explanation: "A fire-themed effect that commonly works with Burn." },
  fox: { keyword: "Fox", explanation: "Works with Ember Fox or fox-tagged pet synergies." },
  guard: { keyword: "Guard", explanation: "Helps protect the Keeper from incoming damage." },
  pet: { keyword: "Pet", explanation: "Interacts with an active pet or pet-related modifier." },
  setup: { keyword: "Setup", explanation: "Builds advantage for a later action or turn." },
  combo: { keyword: "Combo", explanation: "Rewards being combined with another card, tag, or status." },
  finisher: { keyword: "Finisher", explanation: "Has extra value when ending a fight or defeating a target." },
  mark: { keyword: "Mark", explanation: "Flags a target for a later effect." }
};

const keywordCopyByCardType: Readonly<Partial<Record<CardType, CombatKeywordExplanationViewModel>>> = {
  "pet-command": keywordCopyByTag.command
};

const getKeywordCopy = (tag: string): CombatKeywordExplanationViewModel => {
  const knownCopy = keywordCopyByTag[tag];
  if (knownCopy) {
    return knownCopy;
  }

  return {
    keyword: tag,
    explanation: "Card tag used by card, pet, relic, or encounter synergies."
  };
};

export const getCardKeywordExplanations = (
  tags: readonly string[],
  cardType: CardType | "unknown"
): readonly CombatKeywordExplanationViewModel[] => {
  const copies = [
    ...(cardType !== "unknown" && keywordCopyByCardType[cardType] ? [keywordCopyByCardType[cardType]] : []),
    ...tags.map(getKeywordCopy)
  ].filter((copy): copy is CombatKeywordExplanationViewModel => copy !== undefined);
  const seen = new Set<string>();

  return copies.filter((copy) => {
    if (seen.has(copy.keyword)) {
      return false;
    }

    seen.add(copy.keyword);
    return true;
  });
};

const getCardTagTooltips = (tags: readonly string[]): readonly CombatTagTooltipViewModel[] =>
  tags.map((tag) => ({
    tag,
    title: getKeywordCopy(tag).keyword,
    body: getKeywordCopy(tag).explanation
  }));

const getCardTagOverflowTooltip = (tags: readonly string[]): CombatTooltipCopyViewModel | undefined => {
  const hiddenTags = tags.slice(COMBAT_UI_CAPS.maxCardVisibleTags);

  return hiddenTags.length > 0
    ? {
        title: "More tags",
        body: hiddenTags.join(", ")
      }
    : undefined;
};

const getPetStatusTooltips = (statusLabels: readonly string[]): readonly PetStatusTooltipViewModel[] =>
  statusLabels.map((label) => ({
    label,
    title: label,
    body: `Pet status: ${label}`
  }));

const getPetStatusOverflowTooltip = (statusLabels: readonly string[]): CombatTooltipCopyViewModel | undefined => {
  const hiddenStatuses = statusLabels.slice(COMBAT_UI_CAPS.maxPetVisibleStatuses);

  return hiddenStatuses.length > 0
    ? {
        title: "More pet statuses",
        body: hiddenStatuses.join(", ")
      }
    : undefined;
};

const buildCombatantStatusViewModels = (combatant: CombatantState): readonly CombatantStatusViewModel[] =>
  combatant.statuses.map((status) => ({
    statusId: status.statusId,
    stacks: status.stacks,
    label: statusLabel(status.statusId, status.stacks),
    tooltip: statusTooltip(status.statusId, status.stacks)
  }));

const getCombatantStatusDetailLines = (statuses: readonly CombatantStatusViewModel[], emptyLine: string): readonly string[] =>
  statuses.length > 0
    ? statuses.map((status) => `${status.label}: ${status.tooltip}`)
    : [emptyLine];

const getCombatantStatusOverflowTooltip = (
  statuses: readonly CombatantStatusViewModel[],
  limit: number
): CombatTooltipCopyViewModel | undefined => {
  const hiddenStatuses = statuses.slice(limit);

  return hiddenStatuses.length > 0
    ? {
        title: "More statuses",
        body: hiddenStatuses.map((status) => `${status.label}: ${status.tooltip}`).join("\n")
      }
    : undefined;
};

const toCombatantViewModel = (combatant: CombatantState): CombatantViewModel => {
  const statuses = buildCombatantStatusViewModels(combatant);
  const statusDetailLines = getCombatantStatusDetailLines(
    statuses,
    combatant.type === "player" ? "No player statuses." : "No enemy statuses."
  );
  const statusOverflowLimit = combatant.type === "player"
    ? COMBAT_UI_CAPS.maxPlayerVisibleStatuses
    : COMBAT_UI_CAPS.maxEnemyVisibleStatuses;
  const roleLabel = combatant.type === "player" ? "Keeper state" : "Enemy";
  const footer = combatant.type === "player" ? "Keeper detail." : "Enemy detail.";

  return {
    id: combatant.id,
    name: combatant.name,
    type: combatant.type,
    hp: combatant.hp,
    maxHp: combatant.maxHp,
    block: combatant.block,
    statuses,
    statusOverflowTooltip: getCombatantStatusOverflowTooltip(statuses, statusOverflowLimit),
    alive: combatant.alive,
    tooltip: {
      title: combatant.name,
      body: [`HP ${combatant.hp}/${combatant.maxHp}`, `Block ${combatant.block}`, ...statusDetailLines].join("\n")
    },
    detail: {
      title: combatant.name,
      subtitle: roleLabel,
      lines: [`HP: ${combatant.hp}/${combatant.maxHp}`, `Block: ${combatant.block}`, ...statusDetailLines],
      footer
    }
  };
};

const getPileViewModel = (label: string, count: number): CombatPileViewModel => ({
  label,
  count,
  tooltip: {
    title: label,
    body: `${count} card(s). Full pile inspection is deferred for Phase 1.`
  },
  detail: {
    title: label,
    subtitle: "Pile count",
    lines: [`Cards: ${count}`, "Full pile inspection is deferred for Phase 1."],
    footer: "Pile detail."
  }
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

      const statusLabels = [
        petState?.mood ?? "calm",
        ...(activeModifierCount > 0 ? [`mods ${activeModifierCount}`] : [])
      ];
      const chargeLine = petState
        ? "Ember Charge is not active."
        : "Ember Charge is not active.";

      return {
        petInstanceId,
        name: petDefinition?.name ?? "Unknown Pet",
        nickname: petInstance?.nickname ?? "Unknown",
        mood: petState?.mood ?? "calm",
        activeModifierCount,
        slotIndex,
        statusLabels,
        statusTooltips: getPetStatusTooltips(statusLabels),
        statusOverflowTooltip: getPetStatusOverflowTooltip(statusLabels),
        tooltip: {
          title: petInstance?.nickname ?? "Unknown",
          body: [
            petDefinition?.name ?? "Unknown Pet",
            `Mood: ${petState?.mood ?? "calm"}`,
            "No Ember Charge active.",
            `Statuses: ${statusLabels.join(", ") || "none"}`
          ].join("\n")
        },
        detail: {
          title: petInstance?.nickname ?? "Unknown",
          subtitle: petDefinition?.name ?? "Unknown Pet",
          lines: [
            `Mood: ${petState?.mood ?? "calm"}`,
            chargeLine,
            `Active modifiers: ${activeModifierCount}`,
            `Statuses: ${statusLabels.join(", ") || "none"}`
          ],
          footer: "This pet has no combat HP."
        }
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
      const description = intentDefinition?.description ?? "Preparing an action.";
      const targetHint = getIntentTargetHint(intentDefinition);
      const amount = getIntentAmount(intentDefinition);

      return {
        monsterId: intent.monsterCombatantId,
        intentId: intent.intentId,
        type: intentDefinition?.type ?? "intent",
        label,
        description,
        targetHint,
        amount,
        tooltip: {
          title: label,
          body: description
        },
        detail: {
          title: label,
          subtitle: monster?.name ?? "Enemy",
          lines: [
            description,
            `Target: ${targetHint}`,
            amount !== undefined ? `Amount: ${amount}` : "Amount: not shown"
          ],
          footer: "Intent detail."
        }
      };
    }),
    hand: state.combat.hand.map((cardInstanceId) => {
      const cardInstance = cardInstancesById.get(cardInstanceId);
      const cardDefinition = cardInstance ? findCard(registry, cardInstance.cardId) : undefined;
      const cost = cardDefinition?.cost ?? 0;
      const actionProfile = cardDefinition ? getCardActionProfile(cardDefinition) : undefined;
      const targetKind = actionProfile?.targetKind ?? "none";
      const unplayableReason = cardDefinition
        ? getUnplayableReason(state.combat, cardDefinition, cost, targetKind)
        : "Missing card definition.";
      const requiresManualTarget = actionProfile?.requiresManualTarget ?? false;
      const tags = cardDefinition?.tags ?? [];
      const type = cardDefinition?.type ?? "unknown";
      const keywordExplanations = getCardKeywordExplanations(tags, type);
      const detailLines = [
        `Cost: ${cost}`,
        `Rules: ${cardDefinition?.description ?? "Missing card definition."}`,
        `Tags: ${tags.join(", ") || "none"}`,
        "Keywords:",
        ...(keywordExplanations.length > 0
          ? keywordExplanations.map((keyword) => `${keyword.keyword}: ${keyword.explanation}`)
          : ["No keyword explanations available."]),
        `Play mode: ${actionProfile?.playMode ?? "immediate"}`,
        `Valid targets: ${requiresManualTarget ? getValidEnemyTargetIds(state.combat).join(", ") || "none" : "none"}`,
        cardDefinition?.type === "pet-command"
          ? "Pet-command: orange line marks the command relationship."
          : "Normal card: no pet-command line."
      ];

      return {
        cardInstanceId,
        cardId: cardInstance?.cardId ?? (cardInstanceId as unknown as CardId),
        name: cardDefinition?.name ?? "Unknown Card",
        description: cardDefinition?.description ?? "Missing card definition.",
        type,
        cost,
        tags,
        playable: unplayableReason === undefined,
        unplayableReason,
        isPetCommand: cardDefinition?.type === "pet-command",
        tagTooltips: getCardTagTooltips(tags),
        tagOverflowTooltip: getCardTagOverflowTooltip(tags),
        keywordExplanations,
        detail: {
          title: cardDefinition?.name ?? "Unknown Card",
          subtitle: `${type.toUpperCase()} · ${targetKind}`,
          lines: detailLines,
          footer: cardDefinition?.type === "pet-command" ? "Pet-command detail." : "Card detail."
        },
        commandPetSlotIndex: cardDefinition ? getCommandPetSlotIndex(state.combat, cardDefinition) : undefined,
        targetKind,
        playMode: actionProfile?.playMode ?? "immediate",
        requiresManualTarget,
        validTargetIds: requiresManualTarget ? getValidEnemyTargetIds(state.combat) : []
      };
    }),
    drawPile: getPileViewModel("Draw pile", state.combat.drawPile.length),
    drawPileCount: state.combat.drawPile.length,
    discardPile: getPileViewModel("Discard pile", state.combat.discardPile.length),
    discardPileCount: state.combat.discardPile.length,
    continueAvailable: state.combat.phase === "won" || state.combat.phase === "lost",
    resetAvailable: state.run.status === "lost" || state.run.status === "completed",
    eventMessages: state.lastEvents.map(formatCombatEventMessage),
    uiWarnings: buildUiWarnings(state.combat),
    uiCaps: COMBAT_UI_CAPS
  };
};
