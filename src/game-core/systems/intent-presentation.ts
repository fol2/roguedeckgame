import type { CombatantId, EnemyCardInstanceId, MonsterAbilityId, MonsterIntentId } from "../ids";
import type { CombatMonsterCardState, CombatState, IntentVisibilityLevel, ScopeIntentDepth } from "../model/combat";
import type { EffectDefinition } from "../model/effect";
import type { MonsterAbilityDefinition, MonsterDefinition, MonsterIntentDefinition, MonsterIntentType } from "../model/monster";
import type { GameContentRegistry } from "../model/registry";
import { createContentContext, type ContentContext } from "./content-index";
import { resolveEffectiveIntentVisibilityLevel } from "./intent-visibility";

export type CoreIntentTargetHint = "keeper" | "self" | "allEnemies" | "unknown";

export type CoreResolvedMonsterAbilityDisplay = {
  readonly ability: MonsterAbilityDefinition;
  readonly source: "plannedAbility" | "fallbackMetadata";
};

export type CoreIntentScopeCandidate = {
  readonly abilityId: MonsterAbilityId;
  readonly title: string;
  readonly kind: MonsterIntentType;
  readonly targetHint: CoreIntentTargetHint;
  readonly tags: readonly string[];
};

export type CoreIntentScopeReadout = {
  readonly depth: ScopeIntentDepth;
  readonly planMode: string;
  readonly candidateCount: number;
  readonly candidates: readonly CoreIntentScopeCandidate[];
  readonly lines: readonly string[];
  readonly unstable: boolean;
};

export type CoreMonsterIntentPresentation = {
  readonly intentDefinition?: MonsterIntentDefinition;
  readonly resolvedAbility?: CoreResolvedMonsterAbilityDisplay;
  readonly displaySource?: MonsterAbilityDefinition | MonsterIntentDefinition;
  readonly targetHint: CoreIntentTargetHint;
  readonly intentType: MonsterIntentType | "intent";
  readonly amount?: number;
  readonly visibilityLevel: IntentVisibilityLevel;
  readonly planMode: string;
  readonly scope?: CoreIntentScopeReadout;
};

export type CoreEnemyCardHoldingReadout = {
  readonly monsterId: CombatantId;
  readonly drawCount: number;
  readonly handCount: number;
  readonly plannedCount: number;
  readonly discardCount: number;
  readonly exhaustCount: number;
  readonly planMode: string;
  readonly candidateCount: number;
};

const getIntentAmount = (
  intentDefinition: { readonly effects: readonly EffectDefinition[] } | undefined,
  intentType: MonsterIntentType | "intent"
): number | undefined => {
  const amountTypes: readonly EffectDefinition["type"][] =
    intentType === "block" ? ["block", "petBlock"] :
      intentType === "attack" ? ["damage", "petAttack"] :
        [];
  const amounts = intentDefinition?.effects
    .filter((effect): effect is Extract<EffectDefinition, { readonly amount: number }> =>
      amountTypes.includes(effect.type) && "amount" in effect
    )
    .map((effect) => effect.amount) ?? [];

  if (amounts.length === 0) {
    return undefined;
  }

  return amounts.reduce((sum, amount) => sum + amount, 0);
};

const getIntentTargetHint = (
  intentDefinition: { readonly effects: readonly EffectDefinition[] } | undefined
): CoreIntentTargetHint => {
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

const getMonsterCardState = (
  state: CombatState,
  monsterCombatantId: CombatantId
): CombatMonsterCardState | undefined =>
  state.monsterCardStates?.find((cardState) => cardState.monsterCombatantId === monsterCombatantId);

const uniqueAbilityIds = (abilityIds: readonly MonsterAbilityId[]): readonly MonsterAbilityId[] => {
  const seen = new Set<MonsterAbilityId>();
  const unique: MonsterAbilityId[] = [];

  for (const abilityId of abilityIds) {
    if (!seen.has(abilityId)) {
      seen.add(abilityId);
      unique.push(abilityId);
    }
  }

  return unique;
};

const getAbilityIdsForEnemyCardInstances = (
  cardState: CombatMonsterCardState | undefined,
  cardInstanceIds: readonly EnemyCardInstanceId[]
): readonly MonsterAbilityId[] => {
  if (!cardState) {
    return [];
  }

  return uniqueAbilityIds(cardInstanceIds
    .map((cardInstanceId) => cardState.cardInstances.find((cardInstance) => cardInstance.id === cardInstanceId)?.abilityId)
    .filter((abilityId): abilityId is MonsterAbilityId => abilityId !== undefined));
};

const getPlannedEnemyCardInstanceIds = (
  cardState: CombatMonsterCardState | undefined
): readonly EnemyCardInstanceId[] => {
  if (!cardState) {
    return [];
  }

  const plannedIds = [
    cardState.planned.lockedCardInstanceId,
    ...cardState.planned.candidateCardInstanceIds
  ].filter((cardInstanceId): cardInstanceId is EnemyCardInstanceId => cardInstanceId !== undefined);

  return [...new Set(plannedIds)];
};

const getLatestScopeOverride = (
  state: CombatState,
  monsterCombatantId: CombatantId
) => [...(state.intentVisibilityOverrides ?? [])]
  .reverse()
  .find((override) => override.monsterCombatantId === monsterCombatantId && override.scopeDepth);

const getPlannedMonsterAbility = (
  state: CombatState,
  monsterCombatantId: CombatantId,
  intentId: MonsterIntentId,
  content: ContentContext
): CoreResolvedMonsterAbilityDisplay | undefined => {
  const plannedAbility = state.plannedMonsterAbilities?.find((planned) =>
    planned.monsterCombatantId === monsterCombatantId &&
    planned.intentId === intentId
  );
  const ability = plannedAbility
    ? content.index.monsterAbilitiesById?.get(plannedAbility.abilityId)
    : undefined;

  return ability
    ? { ability, source: "plannedAbility" }
    : undefined;
};

const getFallbackMonsterAbility = (
  intentDefinition: MonsterIntentDefinition | undefined,
  content: ContentContext
): CoreResolvedMonsterAbilityDisplay | undefined => {
  const ability = intentDefinition?.abilityId
    ? content.index.monsterAbilitiesById?.get(intentDefinition.abilityId)
    : undefined;

  return ability
    ? { ability, source: "fallbackMetadata" }
    : undefined;
};

export const buildIntentScopeReadout = (input: {
  readonly state: CombatState;
  readonly monsterCombatantId: CombatantId;
  readonly content: ContentContext;
}): CoreIntentScopeReadout | undefined => {
  const cardState = getMonsterCardState(input.state, input.monsterCombatantId);
  const scopeOverride = getLatestScopeOverride(input.state, input.monsterCombatantId);
  const planMode = cardState?.planned.planMode ?? "unknown";
  const plannedCardIds = scopeOverride?.scopedCandidateCardInstanceIds ??
    getPlannedEnemyCardInstanceIds(cardState);
  const plannedAbilityId = input.state.plannedMonsterAbilities?.find((planned) =>
    planned.monsterCombatantId === input.monsterCombatantId
  )?.abilityId;
  const abilityIds = uniqueAbilityIds([
    ...(scopeOverride?.scopedCandidateAbilityIds ?? []),
    ...getAbilityIdsForEnemyCardInstances(cardState, plannedCardIds),
    ...(plannedAbilityId ? [plannedAbilityId] : [])
  ]);
  const candidates = abilityIds
    .map((abilityId) => input.content.index.monsterAbilitiesById?.get(abilityId))
    .filter((ability): ability is MonsterAbilityDefinition => ability !== undefined)
    .map((ability) => ({
      abilityId: ability.id,
      title: ability.name,
      kind: ability.intentType,
      targetHint: getIntentTargetHint(ability),
      tags: ability.tags
    }));

  if (!scopeOverride?.scopeDepth && candidates.length === 0) {
    return undefined;
  }

  const depth = scopeOverride?.scopeDepth ?? "candidateSet";
  const unstable = planMode === "adaptive" || planMode === "charging" || planMode === "scriptedPhase";
  const candidateLine = candidates.length > 0
    ? `Candidates: ${candidates.map((candidate) => candidate.title).join(" / ")}.`
    : "Candidate set unavailable.";
  const stabilityLine = unstable
    ? `Plan mode: ${planMode}. Final action may change inside its candidate set.`
    : "Plan mode: locked unless a card or enemy effect changes it.";
  const detailLine = depth === "exactIfLocked"
    ? "Exact-if-locked scope can expose a locked card, but adaptive plans remain candidate-based."
    : depth === "conditionHint"
      ? "Condition scope exposes how the enemy may choose between candidates."
      : depth === "category"
        ? "Category scope exposes broad intent type only."
        : "Candidate scope exposes possible enemy cards, not guaranteed final order.";

  return {
    depth,
    planMode,
    candidateCount: candidates.length,
    candidates,
    lines: [candidateLine, stabilityLine, detailLine],
    unstable
  };
};

export const resolveMonsterIntentPresentation = (input: {
  readonly state: CombatState;
  readonly monsterCombatantId: CombatantId;
  readonly intentId: MonsterIntentId;
  readonly monsterDefinition?: MonsterDefinition;
  readonly registry: GameContentRegistry;
}): CoreMonsterIntentPresentation => {
  const content = createContentContext(input.registry);
  const intentDefinition = input.monsterDefinition?.intentPool.find((candidate) => candidate.id === input.intentId);
  const resolvedAbility = getPlannedMonsterAbility(input.state, input.monsterCombatantId, input.intentId, content) ??
    getFallbackMonsterAbility(intentDefinition, content);
  const ability = resolvedAbility?.ability;
  const displaySource = ability ?? intentDefinition;
  const targetHint = getIntentTargetHint(displaySource);
  const intentType = ability?.intentType ?? intentDefinition?.type ?? "intent";
  const amount = getIntentAmount(displaySource, intentType);
  const visibilityLevel = resolveEffectiveIntentVisibilityLevel({
    state: input.state,
    registry: input.registry,
    monsterCombatantId: input.monsterCombatantId,
    monsterDefinition: input.monsterDefinition,
    ability
  });
  const planMode = getMonsterCardState(input.state, input.monsterCombatantId)?.planned.planMode ?? "unknown";

  return {
    intentDefinition,
    resolvedAbility,
    displaySource,
    targetHint,
    intentType,
    amount,
    visibilityLevel,
    planMode,
    scope: visibilityLevel === "scoped"
      ? buildIntentScopeReadout({ state: input.state, monsterCombatantId: input.monsterCombatantId, content })
      : undefined
  };
};

export const buildEnemyCardHoldingReadouts = (
  state: CombatState
): readonly CoreEnemyCardHoldingReadout[] => (state.monsterCardStates ?? []).map((cardState) => {
  const plannedCount = (cardState.planned.lockedCardInstanceId ? 1 : 0) + cardState.planned.candidateCardInstanceIds.length;

  return {
    monsterId: cardState.monsterCombatantId,
    drawCount: cardState.drawPile.length,
    handCount: cardState.hand.length,
    plannedCount,
    discardCount: cardState.discardPile.length,
    exhaustCount: cardState.exhaustPile.length,
    planMode: cardState.planned.planMode ?? "unknown",
    candidateCount: plannedCount
  };
});
