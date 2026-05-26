import { cardInstanceId, combatantId, rewardOptionId, runNodeId } from "../ids";
import type { Rng } from "../systems/rng";
import type { CardDefinition } from "../model/card";
import type { GameContentRegistry } from "../model/registry";
import { starterRegistry } from "../data/registry";
import { cardNeedsActionTarget } from "../systems/card-actions";
import type { AgentAction, AgentRunDriverSnapshot } from "./agent-actions";
import { getLegalAgentActions } from "./action-space";

const findCardForAction = (
  action: AgentAction,
  snapshot: AgentRunDriverSnapshot,
  registry: GameContentRegistry
): CardDefinition | undefined => {
  if (action.type !== "playCard") {
    return undefined;
  }

  const instance = snapshot.combat?.cardInstances.find((cardInstance) => cardInstance.id === action.cardInstanceId);
  return instance ? registry.cards.find((card) => card.id === instance.cardId) : undefined;
};

const actionTargetHp = (action: AgentAction, snapshot: AgentRunDriverSnapshot): number => {
  if (action.type !== "playCard" || !action.targetId) {
    return Number.POSITIVE_INFINITY;
  }
  return snapshot.combat?.monsters.find((monster) => monster.id === action.targetId)?.hp ?? Number.POSITIVE_INFINITY;
};

const selectMapAction = (actions: readonly AgentAction[], snapshot: AgentRunDriverSnapshot): AgentAction | undefined => {
  const nodeById = new Map(snapshot.run.map?.nodes.map((node) => [node.id, node]) ?? []);
  return actions
    .filter((action): action is Extract<AgentAction, { readonly type: "selectMapNode" }> => action.type === "selectMapNode")
    .sort((left, right) => {
      const leftNode = nodeById.get(left.nodeId);
      const rightNode = nodeById.get(right.nodeId);
      const leftCombatRank = leftNode?.type === "combat" ? 0 : leftNode?.type === "elite" ? 1 : leftNode?.type === "boss" ? 2 : 3;
      const rightCombatRank = rightNode?.type === "combat" ? 0 : rightNode?.type === "elite" ? 1 : rightNode?.type === "boss" ? 2 : 3;
      return leftCombatRank - rightCombatRank || (leftNode?.layer ?? 0) - (rightNode?.layer ?? 0) || left.nodeId.localeCompare(right.nodeId, "en-GB");
    })[0];
};

const selectCardAction = (
  actions: readonly AgentAction[],
  snapshot: AgentRunDriverSnapshot,
  registry: GameContentRegistry
): AgentAction | undefined => {
  const playActions = actions.filter((action) => action.type === "playCard");
  const rank = (action: AgentAction): number => {
    const card = findCardForAction(action, snapshot, registry);
    if (!card) {
      return 100;
    }
    if (card.tags.some((tag) => tag === "attack" || tag === "burn" || tag === "pet" || tag === "command")) {
      return 0;
    }
    if (card.tags.some((tag) => tag === "block" || tag === "draw" || tag === "guard")) {
      return 1;
    }
    return 2;
  };

  return playActions.sort((left, right) => rank(left) - rank(right) || actionTargetHp(left, snapshot) - actionTargetHp(right, snapshot))[0];
};

export const deterministicSmokePolicy = (
  snapshot: AgentRunDriverSnapshot,
  registry: GameContentRegistry = starterRegistry
): AgentAction | undefined => {
  const actions = getLegalAgentActions(snapshot, registry);
  const forced = actions.find((action) => action.type === "completeCombatIfEnded" || action.type === "completeNonCombatNode");
  if (forced) {
    return forced;
  }

  if (snapshot.run.status === "map_select") {
    return selectMapAction(actions, snapshot);
  }

  if (snapshot.run.status === "combat") {
    return selectCardAction(actions, snapshot, registry) ?? actions.find((action) => action.type === "endTurn");
  }

  if (snapshot.run.status === "reward") {
    const petUpgrade = actions.find((action) => {
      if (action.type !== "claimReward") {
        return false;
      }
      const option = snapshot.run.pendingRewardOffer?.options.find((candidate) => candidate.id === action.rewardOptionId);
      return option?.type === "petUpgrade";
    });
    return petUpgrade ?? actions.find((action) => action.type === "claimReward") ?? actions.find((action) => action.type === "skipReward");
  }

  return actions[0];
};

export const randomLegalPolicy = (
  snapshot: AgentRunDriverSnapshot,
  rng: Rng,
  registry: GameContentRegistry = starterRegistry
): AgentAction | undefined => {
  const actions = getLegalAgentActions(snapshot, registry);
  return actions.length > 0 ? rng.choice(actions) : undefined;
};

const uniqueActions = (actions: readonly AgentAction[]): readonly AgentAction[] => {
  const seen = new Set<string>();
  const result: AgentAction[] = [];
  for (const action of actions) {
    const key = JSON.stringify(action);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(action);
    }
  }
  return result;
};

/**
 * Enumerates intentionally invalid actions for the current state.
 *
 * This is broader than the random injector so tests and simulations can sweep
 * protocol validation holes deterministically. Every returned action is filtered
 * against the legal action space, but it may still expose a core validation bug
 * if the driver accepts it.
 */
export const enumerateInvalidAgentActions = (
  snapshot: AgentRunDriverSnapshot,
  registry: GameContentRegistry = starterRegistry
): readonly AgentAction[] => {
  const legalKeys = new Set(getLegalAgentActions(snapshot, registry).map((action) => JSON.stringify(action)));
  const lockedNode = snapshot.run.map?.nodes.find((node) => node.status === "locked");
  const completedNode = snapshot.run.map?.nodes.find((node) => node.status === "completed");
  const skippedNode = snapshot.run.map?.nodes.find((node) => node.status === "skipped");
  const deadMonster = snapshot.combat?.monsters.find((monster) => !monster.alive);
  const aliveMonster = snapshot.combat?.monsters.find((monster) => monster.alive);
  const playerTargetId = snapshot.combat?.player.id;
  const handCard = snapshot.combat?.hand[0];
  const nonHandCard = snapshot.combat
    ? [...snapshot.combat.drawPile, ...snapshot.combat.discardPile, ...snapshot.combat.exhaustPile][0]
    : undefined;
  const validRewardOption = snapshot.run.pendingRewardOffer?.options[0];
  const cardByInstance = new Map(
    snapshot.combat?.cardInstances.map((instance) => [
      instance.id,
      registry.cards.find((card) => card.id === instance.cardId)
    ]) ?? []
  );

  const candidates: AgentAction[] = [
    { type: "selectMapNode", nodeId: runNodeId("missing_node") },
    ...(lockedNode ? [{ type: "selectMapNode" as const, nodeId: lockedNode.id }] : []),
    ...(completedNode ? [{ type: "selectMapNode" as const, nodeId: completedNode.id }] : []),
    ...(skippedNode ? [{ type: "selectMapNode" as const, nodeId: skippedNode.id }] : []),
    { type: "playCard", cardInstanceId: cardInstanceId("missing_card"), targetId: combatantId("missing_target") },
    ...(nonHandCard ? [{ type: "playCard" as const, cardInstanceId: nonHandCard, targetId: aliveMonster?.id }] : []),
    ...(deadMonster && handCard ? [{ type: "playCard" as const, cardInstanceId: handCard, targetId: deadMonster.id }] : []),
    ...(handCard && playerTargetId ? [{ type: "playCard" as const, cardInstanceId: handCard, targetId: playerTargetId }] : []),
    { type: "claimReward", rewardOptionId: rewardOptionId("missing_reward_option") },
    ...(validRewardOption ? [{ type: "claimReward" as const, rewardOptionId: validRewardOption.id }] : []),
    { type: "endTurn" },
    { type: "completeCombatIfEnded" },
    { type: "skipReward" },
    { type: "completeNonCombatNode" }
  ];

  for (const candidateCardInstanceId of snapshot.combat?.hand ?? []) {
    const card = cardByInstance.get(candidateCardInstanceId);
    if (!card) {
      continue;
    }

    if (cardNeedsActionTarget(card)) {
      candidates.push({ type: "playCard", cardInstanceId: candidateCardInstanceId });
      if (playerTargetId) {
        candidates.push({ type: "playCard", cardInstanceId: candidateCardInstanceId, targetId: playerTargetId });
      }
    } else if (aliveMonster) {
      candidates.push({ type: "playCard", cardInstanceId: candidateCardInstanceId, targetId: aliveMonster.id });
    }
  }

  return uniqueActions(candidates).filter((action) => !legalKeys.has(JSON.stringify(action)));
};

export const invalidActionInjector = (
  snapshot: AgentRunDriverSnapshot,
  rng: Rng,
  registry: GameContentRegistry = starterRegistry
): AgentAction => {
  const invalidOptions = enumerateInvalidAgentActions(snapshot, registry);
  return rng.choice(invalidOptions.length > 0 ? invalidOptions : [{ type: "playCard", cardInstanceId: cardInstanceId("missing_card") }]);
};
