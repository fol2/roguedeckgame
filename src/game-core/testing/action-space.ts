import type { CardInstanceId, CombatantId } from "../ids";
import type { CardDefinition } from "../model/card";
import type { CombatantTarget, EffectDefinition } from "../model/effect";
import type { GameContentRegistry } from "../model/registry";
import { starterRegistry } from "../data/registry";
import { applyPetCommandCostModifiers, resolvePetCommandOwnerIds } from "../systems/pet-modifiers";
import { createRng } from "../systems/rng";
import type { AgentAction, AgentRunDriverSnapshot } from "./agent-actions";

const combatNodeTypes = new Set(["combat", "elite", "boss"]);

const compareText = (left: string, right: string): number => left.localeCompare(right, "en-GB");

const cardNeedsTarget = (card: CardDefinition): boolean =>
  card.effects.some((effect) => "target" in effect && needsActionTarget(effect.target));

const needsActionTarget = (target: CombatantTarget): boolean =>
  target.type === "target" && target.combatantId === undefined;

const cardByInstanceId = (
  snapshot: AgentRunDriverSnapshot,
  registry: GameContentRegistry
): Map<string, CardDefinition> => {
  const cardsById = new Map(registry.cards.map((card) => [card.id, card]));
  const result = new Map<string, CardDefinition>();

  for (const cardInstance of snapshot.combat?.cardInstances ?? []) {
    const card = cardsById.get(cardInstance.cardId);
    if (card) {
      result.set(cardInstance.id, card);
    }
  }

  return result;
};

const hasEffectTarget = (effect: EffectDefinition): effect is EffectDefinition & { readonly target: CombatantTarget } =>
  "target" in effect;

const effectiveCardCost = (
  snapshot: AgentRunDriverSnapshot,
  card: CardDefinition,
  cardInstanceId: CardInstanceId,
  registry: GameContentRegistry
): number => {
  if (!snapshot.combat || card.type !== "pet-command") {
    return card.cost;
  }

  const ownerPetResult = resolvePetCommandOwnerIds(
    snapshot.combat,
    registry,
    card,
    createRng(`${String(snapshot.combat.seed)}:${cardInstanceId}:legal-owner`)
  );
  if (!ownerPetResult.ok) {
    return Number.POSITIVE_INFINITY;
  }

  const modifiedCost = applyPetCommandCostModifiers(
    {
      state: snapshot.combat,
      card,
      cardInstanceId,
      cardId: card.id,
      ownerPetInstanceIds: ownerPetResult.value
    },
    registry
  );

  return modifiedCost.ok ? modifiedCost.value.cost : Number.POSITIVE_INFINITY;
};

export const getLegalAgentActions = (
  snapshot: AgentRunDriverSnapshot,
  registry: GameContentRegistry = starterRegistry
): readonly AgentAction[] => {
  const { run, combat } = snapshot;

  if (run.status === "completed" || run.status === "lost") {
    return [];
  }

  const activeNode = run.map?.nodes.find((node) => node.status === "active");
  if (run.status === "map_select" && activeNode && (activeNode.type === "event" || activeNode.type === "rest")) {
    return [{ type: "completeNonCombatNode" }];
  }

  if (run.status === "map_select") {
    return (run.map?.nodes ?? [])
      .filter((node) => node.status === "available")
      .sort((left, right) => left.layer - right.layer || compareText(left.id, right.id))
      .map((node) => ({ type: "selectMapNode", nodeId: node.id }));
  }

  if (run.status === "combat") {
    if (!combat) {
      return [];
    }

    if (combat.phase === "won" || combat.phase === "lost") {
      return [{ type: "completeCombatIfEnded" }];
    }

    if (combat.phase !== "player_turn") {
      return [];
    }

    const cards = cardByInstanceId(snapshot, registry);
    const aliveMonsters = combat.monsters.filter((monster) => monster.alive);
    const actions: AgentAction[] = [];

    for (const cardInstanceId of combat.hand) {
      const card = cards.get(cardInstanceId);
      if (!card || effectiveCardCost(snapshot, card, cardInstanceId, registry) > combat.energy) {
        continue;
      }

      const hasAnyActionTarget = card.effects.some((effect) => hasEffectTarget(effect) && needsActionTarget(effect.target));
      if (hasAnyActionTarget) {
        for (const monster of aliveMonsters) {
          actions.push({ type: "playCard", cardInstanceId, targetId: monster.id as CombatantId });
        }
      } else if (!cardNeedsTarget(card)) {
        actions.push({ type: "playCard", cardInstanceId });
      }
    }

    actions.push({ type: "endTurn" });
    return actions;
  }

  if (run.status === "reward") {
    const options = run.pendingRewardOffer?.status === "open" ? run.pendingRewardOffer.options : [];
    return [
      ...options.map((option): AgentAction => ({ type: "claimReward", rewardOptionId: option.id })),
      { type: "skipReward" }
    ];
  }

  if (activeNode && combatNodeTypes.has(activeNode.type)) {
    return [];
  }

  return [];
};
