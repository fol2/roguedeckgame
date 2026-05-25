import { cardInstanceId, combatantId, rewardOptionId, runNodeId } from "../ids";
import type { Rng } from "../systems/rng";
import type { CardDefinition } from "../model/card";
import type { GameContentRegistry } from "../model/registry";
import { starterRegistry } from "../data/registry";
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

export const invalidActionInjector = (
  snapshot: AgentRunDriverSnapshot,
  rng: Rng
): AgentAction => {
  const legalKeys = new Set(getLegalAgentActions(snapshot).map((action) => JSON.stringify(action)));
  const lockedNode = snapshot.run.map?.nodes.find((node) => node.status === "locked");
  const deadMonster = snapshot.combat?.monsters.find((monster) => !monster.alive);
  const handCard = snapshot.combat?.hand[0];
  const options: readonly AgentAction[] = [
    { type: "selectMapNode", nodeId: runNodeId("missing_node") },
    ...(lockedNode ? [{ type: "selectMapNode" as const, nodeId: lockedNode.id }] : []),
    { type: "playCard", cardInstanceId: cardInstanceId("missing_card"), targetId: combatantId("missing_target") },
    ...(deadMonster && handCard ? [{ type: "playCard" as const, cardInstanceId: handCard, targetId: deadMonster.id }] : []),
    { type: "claimReward", rewardOptionId: rewardOptionId("missing_reward_option") },
    { type: "endTurn" },
    { type: "completeCombatIfEnded" },
    { type: "skipReward" },
    { type: "completeNonCombatNode" }
  ];
  const invalidOptions = options.filter((action) => !legalKeys.has(JSON.stringify(action)));
  return rng.choice(invalidOptions.length > 0 ? invalidOptions : [{ type: "playCard", cardInstanceId: cardInstanceId("missing_card") }]);
};
