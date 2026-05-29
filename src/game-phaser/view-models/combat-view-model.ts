import {
  starterRegistry,
  createContentContext,
  type ContentContext,
  type CardId,
  type CardInstanceId,
  type CombatantId,
  type CombatantState,
  type CombatPhase,
  type CombatState,
  type EffectDefinition,
  type GameContentRegistry,
  type GameEvent,
  type EncounterId,
  type MonsterAbilityId,
  type IntentVisibilityLevel,
  type ScopeIntentDepth,
  type MonsterId,
  type MonsterIntentId,
  type PetInstance,
  type PetInstanceId,
  type RunState,
  type RunNodeType,
  type StatusDefinition,
  type StatusId,
  buildEnemyCardHoldingReadouts,
  resolveMonsterIntentPresentation,
  type CoreIntentScopeReadout,
  type CoreResolvedMonsterAbilityDisplay
} from "../../game-core";
import {
  buildCardActionContract,
  getStatusDescriptor,
  type CardPlayMode,
  type CardTargetKind
} from "../../game-core";
import type { CardRarity, CardSource, CardType } from "../../game-core/model/card";
import type { MonsterDefinition, MonsterIntentDefinition, MonsterIntentType } from "../../game-core/model/monster";
import { formatCombatEventMessage } from "../animation/combat-event-messages";
import { CombatAssetKeys, type CombatAssetKey } from "../assets/combat-asset-keys";
import { COMBAT_UI_CAPS } from "../layout/combat-ui-caps";
import { buildCombatPileViewModel } from "./combat-pile-view-model";

export type { CardPlayMode, CardTargetKind } from "../../game-core";
export { COMBAT_UI_CAPS } from "../layout/combat-ui-caps";

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
  readonly rarity: CardRarity | "unknown";
  readonly source: CardSource | "unknown";
  readonly cost: number;
  readonly tags: readonly string[];
  readonly artKey?: CombatAssetKey;
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

export type IntentVisibilityDisplayLevel =
  | "none"
  | "unknown"
  | "category"
  | "rough"
  | "exact"
  | "scoped";

export type CombatIntentTargetHint = "keeper" | "self" | "ally" | "allEnemies" | "pet" | "unknown";

export type CombatIntentScopeCandidateViewModel = {
  readonly abilityId: MonsterAbilityId;
  readonly title: string;
  readonly kind: MonsterIntentType | "intent";
  readonly targetHint: CombatIntentTargetHint;
  readonly tags: readonly string[];
};

export type CombatIntentScopeViewModel = {
  readonly depth: ScopeIntentDepth;
  readonly planMode: "locked" | "adaptive" | "charging" | "scriptedPhase" | "unknown";
  readonly candidateCount: number;
  readonly candidates: readonly CombatIntentScopeCandidateViewModel[];
  readonly lines: readonly string[];
  readonly unstable: boolean;
};

export type CombatIntentTokenViewModel = {
  readonly monsterId: CombatantId;
  readonly visibility: IntentVisibilityDisplayLevel;
  readonly kind: "attack" | "defend" | "buff" | "debuff" | "special" | "unknown" | "charging";
  readonly iconKey: CombatAssetKey;
  readonly amountLabel?: string;
  readonly strengthLabel?: "Low" | "Med" | "High";
  readonly targetHint?: CombatIntentTargetHint;
  readonly scope?: CombatIntentScopeViewModel;
  readonly tooltip: CombatTooltipCopyViewModel;
  readonly detail: CombatDetailCopyViewModel;
  readonly debug?: {
    readonly source?: MonsterPlannedActionViewModel["source"];
    readonly abilityId?: MonsterAbilityId;
    readonly intentId?: MonsterIntentId;
    readonly tags?: readonly string[];
  };
};

export type MonsterIntentViewModel = {
  readonly monsterId: CombatantId;
  readonly intentId: MonsterIntentId;
  readonly abilityId?: MonsterAbilityId;
  readonly type: MonsterIntentType | "intent";
  readonly label: string;
  readonly description: string;
  readonly targetHint: CombatIntentTargetHint;
  readonly amount?: number;
  readonly visibilityLevel: IntentVisibilityLevel;
  readonly tooltip: CombatTooltipCopyViewModel;
  readonly detail: CombatDetailCopyViewModel;
  readonly token: CombatIntentTokenViewModel;
  readonly scope?: CombatIntentScopeViewModel;
  readonly plannedAction: MonsterPlannedActionViewModel;
};

export type MonsterPlannedActionViewModel = {
  readonly source: "plannedAbility" | "fallbackMetadata" | "unknown";
  readonly revealPolicy: IntentVisibilityLevel;
  readonly title: string;
  readonly subtitle: string;
  readonly abilityId?: MonsterAbilityId;
  readonly intentId: MonsterIntentId;
  readonly intentType: MonsterIntentType | "intent";
  readonly tags: readonly string[];
  readonly planMode?: "locked" | "adaptive" | "charging" | "scriptedPhase" | "unknown";
  readonly scope?: CombatIntentScopeViewModel;
  readonly effectLines: readonly string[];
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

export type EnemyCardHoldingViewModel = {
  readonly monsterId: CombatantId;
  readonly drawCount: number;
  readonly handCount: number;
  readonly plannedCount: number;
  readonly discardCount: number;
  readonly exhaustCount: number;
  readonly planMode: "locked" | "adaptive" | "charging" | "scriptedPhase" | "unknown";
  readonly candidateCount: number;
  readonly tooltip: CombatTooltipCopyViewModel;
  readonly detail: CombatDetailCopyViewModel;
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
  readonly enemyCardHoldings: readonly EnemyCardHoldingViewModel[];
  readonly hand: readonly CombatCardViewModel[];
  readonly drawPile: CombatPileViewModel;
  readonly discardPile: CombatPileViewModel;
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

const findCard = (content: ContentContext, cardId: CardId) =>
  content.index.cardsById.get(cardId);

const statusLabel = (statusId: StatusId, stacks: number, definition?: StatusDefinition): string =>
  `${definition?.name ?? statusId}${stacks > 0 ? ` ${stacks}` : ""}`;

const statusTooltip = (status: { readonly statusId: StatusId; readonly stacks: number; readonly duration?: number }, definition?: StatusDefinition): string => [
  ...getStatusDescriptor(status, definition).summaryLines
].join("\n");

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

const buildCombatantStatusViewModels = (
  combatant: CombatantState,
  content: ContentContext
): readonly CombatantStatusViewModel[] =>
  combatant.statuses.map((status) => {
    const definition = content.index.statusesById.get(status.statusId);

    return {
      statusId: status.statusId,
      stacks: status.stacks,
      label: statusLabel(status.statusId, status.stacks, definition),
      tooltip: statusTooltip(status, definition)
    };
  });

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

const toCombatantViewModel = (combatant: CombatantState, content: ContentContext): CombatantViewModel => {
  const statuses = buildCombatantStatusViewModels(combatant, content);
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

const toPlanModeViewModel = (
  planMode: string | undefined
): "locked" | "adaptive" | "charging" | "scriptedPhase" | "unknown" =>
  planMode === "locked" ||
  planMode === "adaptive" ||
  planMode === "charging" ||
  planMode === "scriptedPhase"
    ? planMode
    : "unknown";

const buildIntentScopeViewModel = (
  scopeReadout: CoreIntentScopeReadout | undefined
): CombatIntentScopeViewModel | undefined => {
  if (!scopeReadout) {
    return undefined;
  }

  const depth = scopeReadout.depth;
  const planMode = toPlanModeViewModel(scopeReadout.planMode);

  return {
    depth,
    planMode,
    candidateCount: scopeReadout.candidateCount,
    candidates: scopeReadout.candidates,
    lines: scopeReadout.lines,
    unstable: scopeReadout.unstable
  };
};

const buildEnemyCardHoldingViewModels = (
  state: CombatState
): readonly EnemyCardHoldingViewModel[] => buildEnemyCardHoldingReadouts(state).map((readout) => {
  const monster = state.monsters.find((candidate) => candidate.id === readout.monsterId);
  const planMode = toPlanModeViewModel(readout.planMode);
  const title = `${monster?.name ?? readout.monsterId} enemy deck`;
  const lines = [
    `Draw pile: ${readout.drawCount}`,
    `Hand: ${readout.handCount}`,
    `Planned cards: ${readout.plannedCount}`,
    `Candidates: ${readout.candidateCount}`,
    `Discard pile: ${readout.discardCount}`,
    `Exhaust pile: ${readout.exhaustCount}`,
    `Plan mode: ${planMode}`
  ];

  return {
    monsterId: readout.monsterId,
    drawCount: readout.drawCount,
    handCount: readout.handCount,
    plannedCount: readout.plannedCount,
    discardCount: readout.discardCount,
    exhaustCount: readout.exhaustCount,
    planMode,
    candidateCount: readout.candidateCount,
    tooltip: {
      title,
      body: lines.join("\n")
    },
    detail: {
      title,
      subtitle: "Enemy card holdings",
      lines,
      footer: "Debug/readout only. Enemy cards are still presented through Intent UI."
    }
  };
});

const getCombatantTargetLabel = (target: { readonly type: string }): string => {
  if (target.type === "self") {
    return "self";
  }

  if (target.type === "allEnemies") {
    return "all enemies";
  }

  if (target.type === "allAllies") {
    return "all allies";
  }

  return "target";
};

const describeMonsterEffect = (effect: EffectDefinition): string => {
  switch (effect.type) {
    case "damage":
      return `Damage ${effect.amount} to ${getCombatantTargetLabel(effect.target)}.`;
    case "block":
      return `Block ${effect.amount} to ${getCombatantTargetLabel(effect.target)}.`;
    case "applyStatus":
      return `Apply ${effect.stacks} ${effect.statusId} to ${getCombatantTargetLabel(effect.target)}.`;
    case "cleanseStatus":
      return `Cleanse status from ${getCombatantTargetLabel(effect.target)}.`;
    case "consumeStatus":
      return `Consume ${effect.stacks ?? "all"} ${effect.statusId} from ${getCombatantTargetLabel(effect.target)}.`;
    case "draw":
      return `Draw ${effect.amount}.`;
    case "discard":
      return `Discard ${effect.amount}.`;
    case "exhaust":
      return `Exhaust ${effect.amount}.`;
    case "retain":
      return `Retain ${effect.amount}.`;
    case "createCard":
      return `Create ${effect.cardId} in ${effect.to}.`;
    case "gainEnergy":
      return `Gain ${effect.amount} energy.`;
    case "petAttack":
      return `Pet attack ${effect.amount} to ${getCombatantTargetLabel(effect.target)}.`;
    case "petBlock":
      return `Pet block ${effect.amount} to ${getCombatantTargetLabel(effect.target)}.`;
    case "petReact":
      return `Pet reaction: ${effect.reaction}.`;
    case "improveIntentVisibility":
      return `Improve Intent visibility by ${effect.amount}.`;
    case "revealIntent":
      return `Reveal Intent to ${effect.level}.`;
    case "scopeIntent":
      return `Scope Intent (${effect.depth}).`;
    case "obscureIntent":
      return effect.level
        ? `Obscure Intent to ${effect.level}.`
        : `Obscure Intent by ${effect.amount ?? 1}.`;
    case "setStoryFlag":
      return `Set story flag ${effect.flagId}.`;
  }
};

const buildPlannedActionViewModel = (
  intent: { readonly intentId: MonsterIntentId },
  intentDefinition: MonsterIntentDefinition | undefined,
  resolvedAbility: CoreResolvedMonsterAbilityDisplay | undefined,
  targetHint: MonsterIntentViewModel["targetHint"],
  amount: number | undefined,
  visibilityLevel: IntentVisibilityLevel,
  planMode?: MonsterPlannedActionViewModel["planMode"],
  scope?: CombatIntentScopeViewModel
): MonsterPlannedActionViewModel => {
  if (resolvedAbility) {
    return {
      source: resolvedAbility.source,
      revealPolicy: visibilityLevel,
      title: resolvedAbility.ability.name,
      subtitle: `${resolvedAbility.ability.intentType} intent debug`,
      abilityId: resolvedAbility.ability.id,
      intentId: intent.intentId,
      intentType: resolvedAbility.ability.intentType,
      tags: resolvedAbility.ability.tags,
      planMode,
      scope,
      effectLines: resolvedAbility.ability.effects.map(describeMonsterEffect)
    };
  }

  return {
    source: intentDefinition ? "fallbackMetadata" : "unknown",
    revealPolicy: visibilityLevel,
    title: intentDefinition?.description ?? "Unknown planned action",
    subtitle: `${intentDefinition?.type ?? "intent"} intent debug`,
    intentId: intent.intentId,
    intentType: intentDefinition?.type ?? "intent",
    tags: [],
    planMode,
    scope,
    effectLines: [
      intentDefinition?.description ?? "No planned action metadata available.",
      `Target: ${targetHint}`,
      amount !== undefined ? `Amount: ${amount}` : "Amount: not shown"
    ]
  };
};

type VisibleIntentCopy = {
  readonly abilityId?: MonsterAbilityId;
  readonly type: MonsterIntentViewModel["type"];
  readonly label: string;
  readonly description: string;
  readonly targetHint: MonsterIntentViewModel["targetHint"];
  readonly amount?: number;
  readonly strengthLabel?: "Low" | "Med" | "High";
  readonly scope?: CombatIntentScopeViewModel;
  readonly plannedAction: MonsterPlannedActionViewModel;
};

const getRoughStrengthLabel = (amount: number | undefined): "Low" | "Med" | "High" | undefined => {
  if (amount === undefined) {
    return undefined;
  }

  if (amount <= 4) {
    return "Low";
  }

  if (amount <= 8) {
    return "Med";
  }

  return "High";
};

const buildVisibleIntentCopy = (input: {
  readonly intent: { readonly intentId: MonsterIntentId };
  readonly intentDefinition: MonsterIntentDefinition | undefined;
  readonly resolvedAbility: CoreResolvedMonsterAbilityDisplay | undefined;
  readonly targetHint: MonsterIntentViewModel["targetHint"];
  readonly amount: number | undefined;
  readonly visibilityLevel: IntentVisibilityLevel;
  readonly planMode?: MonsterPlannedActionViewModel["planMode"];
  readonly scope?: CombatIntentScopeViewModel;
}): VisibleIntentCopy => {
  const { intent, intentDefinition, resolvedAbility, visibilityLevel, planMode, scope } = input;
  const ability = resolvedAbility?.ability;
  const intentType = ability?.intentType ?? intentDefinition?.type ?? "intent";
  const source = resolvedAbility?.source ?? (intentDefinition ? "fallbackMetadata" : "unknown");

  if (visibilityLevel === "exact") {
    return {
      abilityId: ability?.id,
      type: intentType,
      label: ability?.intentType ?? intentDefinition?.type ?? "intent",
      description: (ability ?? intentDefinition)?.description ?? "Preparing an action.",
      targetHint: input.targetHint,
      amount: input.amount,
      scope,
      plannedAction: buildPlannedActionViewModel(
        intent,
        intentDefinition,
        resolvedAbility,
        input.targetHint,
        input.amount,
        visibilityLevel,
        planMode,
        scope
      )
    };
  }

  if (visibilityLevel === "scoped") {
    const scopeLines = scope?.lines ?? [
      `Candidate category: ${intentType}`,
      `Likely target: ${input.targetHint}`,
      "Specific card name, amount, and effects are hidden."
    ];

    return {
      abilityId: undefined,
      type: intentType,
      label: scope?.candidateCount ? `${intentType} scoped (${scope.candidateCount})` : `${intentType} scoped`,
      description: scope?.unstable
        ? `Scoped ${intentType} intent. This plan may adapt inside its candidate set.`
        : `Scoped ${intentType} intent. Candidate cards are visible, but exact resolution may still be hidden.`,
      targetHint: input.targetHint,
      amount: undefined,
      scope,
      plannedAction: {
        source,
        revealPolicy: visibilityLevel,
        title: scope?.candidateCount ? "Scoped candidate set" : `${intentType} candidate`,
        subtitle: "Scoped enemy intent",
        intentId: intent.intentId,
        intentType,
        tags: [],
        planMode,
        scope,
        effectLines: scopeLines
      }
    };
  }

  if (visibilityLevel === "rough") {
    const roughTarget = ability?.telegraph?.targetHint ?? input.targetHint;
    const strengthLabel = getRoughStrengthLabel(input.amount);
    const strengthCopy = strengthLabel ?? "Unknown";

    return {
      abilityId: undefined,
      type: intentType,
      label: `${intentType} intent`,
      description: `Rough ${intentType} intent. Strength: ${strengthCopy}.`,
      targetHint: roughTarget,
      amount: undefined,
      strengthLabel,
      plannedAction: {
        source,
        revealPolicy: visibilityLevel,
        title: `${intentType} intent`,
        subtitle: "Rough enemy intent",
        intentId: intent.intentId,
        intentType,
        tags: [],
        planMode,
        effectLines: [`Rough strength: ${strengthCopy}`, "Specific action details are hidden."]
      }
    };
  }

  if (visibilityLevel === "category") {
    return {
      abilityId: undefined,
      type: intentType,
      label: `${intentType} intent`,
      description: `Enemy is preparing a ${intentType} action.`,
      targetHint: "unknown",
      plannedAction: {
        source,
        revealPolicy: visibilityLevel,
        title: `${intentType} intent`,
        subtitle: "Category enemy intent",
        intentId: intent.intentId,
        intentType,
        tags: [],
        planMode,
        effectLines: ["Action name, amount, target, and effects are hidden."]
      }
    };
  }

  if (visibilityLevel === "none") {
    return {
      abilityId: undefined,
      type: "unknown",
      label: "Idle",
      description: "No useful intent is available.",
      targetHint: "unknown",
      plannedAction: {
        source: "unknown",
        revealPolicy: visibilityLevel,
        title: "Idle",
        subtitle: "No intent",
        intentId: intent.intentId,
        intentType: "unknown",
        tags: [],
        planMode,
        effectLines: ["No useful intent marker."]
      }
    };
  }

  return {
    abilityId: undefined,
    type: "unknown",
    label: "?",
    description: "Intent hidden.",
    targetHint: "unknown",
    plannedAction: {
      source: "unknown",
      revealPolicy: visibilityLevel,
      title: "?",
      subtitle: "Hidden enemy intent",
      intentId: intent.intentId,
      intentType: "unknown",
      tags: [],
      planMode,
      effectLines: ["Intent hidden."]
    }
  };
};

const getIntentTokenKind = (
  intentType: MonsterIntentType | "intent"
): CombatIntentTokenViewModel["kind"] => {
  switch (intentType) {
    case "attack":
      return "attack";
    case "block":
      return "defend";
    case "buff":
      return "buff";
    case "debuff":
      return "debuff";
    case "charge":
      return "charging";
    case "special":
      return "special";
    case "unknown":
    case "intent":
      return "unknown";
  }
};

const getIntentTitle = (kind: CombatIntentTokenViewModel["kind"]): string => {
  switch (kind) {
    case "attack":
      return "Attack";
    case "defend":
      return "Guard";
    case "buff":
      return "Buff";
    case "debuff":
      return "Debuff";
    case "special":
      return "Special";
    case "charging":
      return "Charging";
    case "unknown":
      return "Unknown intent";
  }
};

const getIntentGlyph = (kind: CombatIntentTokenViewModel["kind"]): string => {
  switch (kind) {
    case "attack":
      return "ATK";
    case "defend":
      return "BLK";
    case "buff":
      return "UP";
    case "debuff":
      return "HEX";
    case "special":
      return "SP";
    case "charging":
      return "...";
    case "unknown":
      return "?";
  }
};

const getIntentIconKey = (kind: CombatIntentTokenViewModel["kind"]): CombatAssetKey => {
  switch (kind) {
    case "attack":
      return CombatAssetKeys.icons.intentAttack;
    case "defend":
      return CombatAssetKeys.icons.intentDefend;
    case "buff":
      return CombatAssetKeys.icons.intentBuff;
    case "debuff":
      return CombatAssetKeys.icons.intentDebuff;
    case "special":
      return CombatAssetKeys.icons.intentSpecial;
    case "charging":
      return CombatAssetKeys.icons.intentCharging;
    case "unknown":
      return CombatAssetKeys.icons.intentUnknown;
  }
};

const getIntentTargetCopy = (targetHint: CombatIntentTargetHint): string => {
  switch (targetHint) {
    case "keeper":
      return "Keeper";
    case "self":
      return "Self";
    case "ally":
      return "Ally";
    case "allEnemies":
      return "All enemies";
    case "pet":
      return "Pet";
    case "unknown":
      return "Unknown";
  }
};

const getIntentExplanation = (
  kind: CombatIntentTokenViewModel["kind"],
  targetHint: CombatIntentTargetHint
): string => {
  switch (kind) {
    case "attack":
      return `This enemy is preparing to attack ${getIntentTargetCopy(targetHint).toLowerCase()}.`;
    case "defend":
      return "This enemy is preparing to protect itself or an ally.";
    case "debuff":
      return `This enemy is preparing to weaken ${getIntentTargetCopy(targetHint).toLowerCase()}.`;
    case "special":
      return "This enemy is preparing a special action.";
    case "buff":
      return "This enemy is preparing to strengthen itself or an ally.";
    case "charging":
      return "This enemy is building up for a future action.";
    case "unknown":
      return "This enemy is preparing an action, but the details are hidden.";
  }
};

const getIntentAmountLine = (
  kind: CombatIntentTokenViewModel["kind"],
  amount: number | undefined
): string | undefined => {
  if (amount === undefined) {
    return undefined;
  }

  if (kind === "attack") {
    return `Damage: ${amount}`;
  }

  if (kind === "defend") {
    return `Block: ${amount}`;
  }

  return `Amount: ${amount}`;
};

const getTokenVisibility = (
  visibilityLevel: IntentVisibilityLevel,
  kind: CombatIntentTokenViewModel["kind"]
): IntentVisibilityDisplayLevel => {
  if (visibilityLevel === "exact" || visibilityLevel === "scoped" || visibilityLevel === "rough" || visibilityLevel === "category" || visibilityLevel === "none") {
    return visibilityLevel;
  }

  return kind === "unknown" ? "unknown" : "category";
};

const describeKnownIntentDetail = (visibility: IntentVisibilityDisplayLevel): string => {
  switch (visibility) {
    case "exact":
      return "Exact";
    case "scoped":
      return "Scoped";
    case "rough":
      return "Rough";
    case "category":
      return "Category only";
    case "none":
      return "None";
    case "unknown":
      return "Unknown";
  }
};

const buildIntentTokenViewModel = ({
  monsterId,
  plannedAction,
  intentType,
  targetHint,
  amount,
  strengthLabel,
  description,
  visibilityLevel,
  scope
}: {
  readonly monsterId: CombatantId;
  readonly plannedAction: MonsterPlannedActionViewModel;
  readonly intentType: MonsterIntentType | "intent";
  readonly targetHint: CombatIntentTargetHint;
  readonly amount: number | undefined;
  readonly strengthLabel?: "Low" | "Med" | "High";
  readonly description: string;
  readonly visibilityLevel: IntentVisibilityLevel;
  readonly scope?: CombatIntentScopeViewModel;
}): CombatIntentTokenViewModel => {
  const kind = getIntentTokenKind(intentType);
  const title = getIntentTitle(kind);
  const amountLine = getIntentAmountLine(kind, amount);
  const strengthLine = strengthLabel ? `Strength: ${strengthLabel}` : undefined;
  const scopeLine = scope
    ? `Scoped candidates: ${scope.candidateCount}${scope.unstable ? " (adaptive)" : ""}`
    : undefined;
  const explanation = getIntentExplanation(kind, targetHint);
  const visibility = getTokenVisibility(visibilityLevel, kind);

  return {
    monsterId,
    visibility,
    kind,
    iconKey: getIntentIconKey(kind),
    amountLabel: amount !== undefined ? String(amount) : undefined,
    strengthLabel,
    targetHint,
    scope,
    tooltip: {
      title,
      body: [
        explanation,
        amountLine,
        strengthLine,
        scopeLine,
        `Target: ${getIntentTargetCopy(targetHint)}`
      ].filter((line): line is string => Boolean(line)).join("\n")
    },
    detail: {
      title,
      subtitle: "Enemy intent",
      lines: [
        description,
        explanation,
        amountLine,
        strengthLine,
        `Target: ${getIntentTargetCopy(targetHint)}`,
        `Known detail: ${describeKnownIntentDetail(visibility)}`,
        ...(scope?.lines ?? [])
      ].filter((line): line is string => Boolean(line)),
      footer: "Intent detail."
    },
    debug: {
      source: plannedAction.source,
      abilityId: plannedAction.abilityId,
      intentId: plannedAction.intentId,
      tags: plannedAction.tags
    }
  };
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
  registryOrContent: GameContentRegistry | ContentContext = starterRegistry,
  revision = 0
): CombatViewModel => {
  const content = "index" in registryOrContent
    ? registryOrContent
    : createContentContext(registryOrContent);
  const cardInstancesById = new Map(
    state.combat.cardInstances.map((cardInstance) => [cardInstance.id, cardInstance])
  );
  const petStatesById = new Map(
    state.combat.runPetStates.map((runPetState) => [runPetState.petInstanceId, runPetState])
  );
  const currentNode = state.run.map?.nodes.find((node) => node.id === state.run.map?.currentNodeId);
  const encounter = currentNode?.encounterId
    ? content.index.encountersById.get(currentNode.encounterId)
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
    player: toCombatantViewModel(state.combat.player, content),
    pets: state.combat.activePetInstanceIds.map((petInstanceId, slotIndex) => {
      const petInstance = state.petInstances.find((candidate) => candidate.id === petInstanceId);
      const petDefinition = petInstance
        ? content.index.petsById.get(petInstance.definitionId)
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
    monsters: state.combat.monsters.map((monster) => toCombatantViewModel(monster, content)),
    monsterIntents: state.combat.monsterIntents.map((intent) => {
      const monster = state.combat.monsters.find((candidate) => candidate.id === intent.monsterCombatantId);
      const monsterDefinition = monster?.definitionId && monster.type === "monster"
        ? content.index.monstersById.get(monster.definitionId as MonsterId)
        : undefined;
      const presentation = monster
        ? resolveMonsterIntentPresentation({
            state: state.combat,
            monsterCombatantId: intent.monsterCombatantId,
            intentId: intent.intentId,
            monsterDefinition,
            registry: content.registry
          })
        : undefined;
      const intentDefinition = presentation?.intentDefinition;
      const resolvedAbility = presentation?.resolvedAbility;
      const targetHint = presentation?.targetHint ?? "unknown";
      const intentType = presentation?.intentType ?? "intent";
      const amount = presentation?.amount;
      const visibilityLevel = presentation?.visibilityLevel ?? "unknown";
      const planMode = toPlanModeViewModel(presentation?.planMode);
      const scope = buildIntentScopeViewModel(presentation?.scope);
      const visibleIntent = buildVisibleIntentCopy({
        intent,
        intentDefinition,
        resolvedAbility,
        targetHint,
        amount,
        visibilityLevel,
        planMode,
        scope
      });
      const token = buildIntentTokenViewModel({
        monsterId: intent.monsterCombatantId,
        plannedAction: visibleIntent.plannedAction,
        intentType: visibleIntent.type,
        targetHint: visibleIntent.targetHint,
        amount: visibleIntent.amount,
        strengthLabel: visibleIntent.strengthLabel,
        description: visibleIntent.description,
        visibilityLevel,
        scope: visibleIntent.scope
      });

      return {
        monsterId: intent.monsterCombatantId,
        intentId: intent.intentId,
        abilityId: visibleIntent.abilityId,
        visibilityLevel,
        type: visibleIntent.type,
        label: visibleIntent.label,
        description: visibleIntent.description,
        targetHint: visibleIntent.targetHint,
        amount: visibleIntent.amount,
        tooltip: token.tooltip,
        detail: token.detail,
        token,
        scope: visibleIntent.scope,
        plannedAction: visibleIntent.plannedAction
      };
    }),
    enemyCardHoldings: buildEnemyCardHoldingViewModels(state.combat),
    hand: state.combat.hand.map((cardInstanceId) => {
      const cardInstance = cardInstancesById.get(cardInstanceId);
      const cardDefinition = cardInstance ? findCard(content, cardInstance.cardId) : undefined;
      const actionContract = buildCardActionContract(state.combat, { cardInstanceId }, content.registry);
      const cost = actionContract.effectiveCost;
      const targetKind = actionContract.targetKind;
      const unplayableReason = cardDefinition
        ? actionContract.unplayableReason
        : "Missing card definition.";
      const requiresManualTarget = actionContract.requiresManualTarget;
      const tags = cardDefinition?.tags ?? [];
      const type = cardDefinition?.type ?? "unknown";
      const rarity = cardDefinition?.rarity ?? "unknown";
      const source = cardDefinition?.source ?? "unknown";
      const keywordExplanations = getCardKeywordExplanations(tags, type);
      const detailLines = [
        `Cost: ${cost}`,
        `Rarity: ${rarity}`,
        `Source: ${source}`,
        `Rules: ${cardDefinition?.description ?? "Missing card definition."}`,
        `Tags: ${tags.join(", ") || "none"}`,
        "Keywords:",
        ...(keywordExplanations.length > 0
          ? keywordExplanations.map((keyword) => `${keyword.keyword}: ${keyword.explanation}`)
          : ["No keyword explanations available."]),
        `Play mode: ${actionContract.playMode}`,
        `Valid targets: ${requiresManualTarget ? actionContract.validEnemyTargetIds.join(", ") || "none" : "none"}`,
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
        rarity,
        source,
        cost,
        tags,
        playable: cardDefinition ? actionContract.playable : false,
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
        commandPetSlotIndex: cardDefinition ? actionContract.commandPetSlotIndex : undefined,
        targetKind,
        playMode: actionContract.playMode,
        requiresManualTarget,
        validTargetIds: requiresManualTarget ? actionContract.validEnemyTargetIds : []
      };
    }),
    drawPile: buildCombatPileViewModel("Draw pile", state.combat.drawPile.length),
    discardPile: buildCombatPileViewModel("Discard pile", state.combat.discardPile.length),
    continueAvailable: state.combat.phase === "won" || state.combat.phase === "lost",
    resetAvailable: state.run.status === "lost" || state.run.status === "completed",
    eventMessages: state.lastEvents.map(formatCombatEventMessage),
    uiWarnings: buildUiWarnings(state.combat),
    uiCaps: COMBAT_UI_CAPS
  };
};
