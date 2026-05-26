import type { CardDefinition } from "../model/card";
import type { EffectDefinition } from "../model/effect";
import type { GameContentRegistry } from "../model/registry";
import type { RewardOption } from "../model/reward";
import { starterRegistry } from "../data/registry";
import type { Rng } from "../systems/rng";
import type { AgentAction, AgentRunDriverSnapshot } from "./agent-actions";
import { getLegalAgentActions } from "./action-space";
import { deterministicSmokePolicy, randomLegalPolicy } from "./policies";

export type AgentPolicyId = "randomLegal" | "deterministicSmoke" | "greedyDamage" | "defensive";

export type AgentPolicyProfile = {
  readonly id: AgentPolicyId;
  readonly label: string;
  readonly description: string;
};

export const agentPolicyProfiles: readonly AgentPolicyProfile[] = [
  {
    id: "randomLegal",
    label: "Random legal",
    description: "Randomly chooses from legal actions. Useful as the broad baseline / chaos player."
  },
  {
    id: "greedyDamage",
    label: "Greedy damage",
    description: "Prioritises damage, burn, and pet-command attacks before defensive actions."
  },
  {
    id: "defensive",
    label: "Defensive",
    description: "Prioritises block and guard when incoming damage is expected, then plays attacks."
  },
  {
    id: "deterministicSmoke",
    label: "Deterministic smoke",
    description: "Stable deterministic policy used to prove the game can complete without forced outcomes."
  }
] as const;

const compareText = (left: string, right: string): number => left.localeCompare(right, "en-GB");

const cardByInstanceId = (
  snapshot: AgentRunDriverSnapshot,
  registry: GameContentRegistry
): Map<string, CardDefinition> => {
  const cardsById = new Map(registry.cards.map((card) => [card.id, card]));
  const result = new Map<string, CardDefinition>();
  for (const instance of snapshot.combat?.cardInstances ?? []) {
    const card = cardsById.get(instance.cardId);
    if (card) {
      result.set(instance.id, card);
    }
  }
  return result;
};

const cardForAction = (
  action: AgentAction,
  snapshot: AgentRunDriverSnapshot,
  registry: GameContentRegistry
): CardDefinition | undefined => {
  if (action.type !== "playCard") {
    return undefined;
  }
  return cardByInstanceId(snapshot, registry).get(action.cardInstanceId);
};

const targetHp = (action: AgentAction, snapshot: AgentRunDriverSnapshot): number => {
  if (action.type !== "playCard" || !action.targetId) {
    return Number.POSITIVE_INFINITY;
  }
  return snapshot.combat?.monsters.find((monster) => monster.id === action.targetId)?.hp ?? Number.POSITIVE_INFINITY;
};

const aliveMonsterCount = (snapshot: AgentRunDriverSnapshot): number =>
  snapshot.combat?.monsters.filter((monster) => monster.alive).length ?? 0;

const hasTag = (card: CardDefinition | undefined, tag: string): boolean => card?.tags.includes(tag) ?? false;

const effectValue = (effect: EffectDefinition, snapshot: AgentRunDriverSnapshot): number => {
  const enemies = Math.max(1, aliveMonsterCount(snapshot));
  if (effect.type === "damage") {
    return effect.amount * (effect.target.type === "allEnemies" ? enemies : 1);
  }
  if (effect.type === "petAttack") {
    return effect.amount * (effect.target.type === "allEnemies" ? enemies : 1);
  }
  if (effect.type === "applyStatus" && String(effect.statusId) === "burn") {
    return effect.stacks * 2 * (effect.target.type === "allEnemies" ? enemies : 1);
  }
  if (effect.type === "block" || effect.type === "petBlock") {
    return effect.amount;
  }
  if (effect.type === "draw") {
    return effect.amount;
  }
  return 0;
};

const offensiveScore = (card: CardDefinition | undefined, snapshot: AgentRunDriverSnapshot): number => {
  if (!card) {
    return -100;
  }
  const effectScore = card.effects
    .filter((effect) => effect.type === "damage" || effect.type === "petAttack" || effect.type === "applyStatus")
    .reduce((sum, effect) => sum + effectValue(effect, snapshot), 0);
  const tagBonus =
    (hasTag(card, "pet") ? 1 : 0) +
    (hasTag(card, "command") ? 1 : 0) +
    (hasTag(card, "burn") ? 1 : 0) +
    (hasTag(card, "combo") ? 1 : 0);
  return effectScore + tagBonus - card.cost * 0.5;
};

const defensiveScore = (card: CardDefinition | undefined): number => {
  if (!card) {
    return -100;
  }
  const effectScore = card.effects
    .filter((effect) => effect.type === "block" || effect.type === "petBlock")
    .reduce((sum, effect) => sum + effectValue(effect, { run: undefined as never, petInstances: [], lastEvents: [] }), 0);
  const tagBonus = (hasTag(card, "guard") ? 2 : 0) + (hasTag(card, "block") ? 1 : 0);
  return effectScore + tagBonus - card.cost * 0.25;
};

const drawScore = (card: CardDefinition | undefined): number => {
  if (!card) {
    return -100;
  }
  const effectScore = card.effects
    .filter((effect) => effect.type === "draw")
    .reduce((sum, effect) => sum + effectValue(effect, { run: undefined as never, petInstances: [], lastEvents: [] }), 0);
  return effectScore + (hasTag(card, "draw") ? 1 : 0) - card.cost * 0.25;
};

const estimateIncomingDamage = (
  snapshot: AgentRunDriverSnapshot,
  registry: GameContentRegistry
): number => {
  const combat = snapshot.combat;
  if (!combat) {
    return 0;
  }

  let incoming = 0;
  for (const activeIntent of combat.monsterIntents) {
    const monster = combat.monsters.find((candidate) => candidate.id === activeIntent.monsterCombatantId);
    const definition = registry.monsters.find((candidate) => candidate.id === monster?.definitionId);
    const intent = definition?.intentPool.find((candidate) => candidate.id === activeIntent.intentId);
    if (!monster?.alive || !intent) {
      continue;
    }
    for (const effect of intent.effects) {
      if (effect.type === "damage") {
        incoming += effect.amount;
      }
    }
  }
  return incoming;
};

const selectMapAction = (actions: readonly AgentAction[], snapshot: AgentRunDriverSnapshot): AgentAction | undefined => {
  const nodesById = new Map(snapshot.run.map?.nodes.map((node) => [node.id, node]) ?? []);
  return actions
    .filter((action): action is Extract<AgentAction, { readonly type: "selectMapNode" }> => action.type === "selectMapNode")
    .sort((left, right) => {
      const leftNode = nodesById.get(left.nodeId);
      const rightNode = nodesById.get(right.nodeId);
      const nodeRank = (node: typeof leftNode): number =>
        node?.type === "rest" ? 0 : node?.type === "event" ? 1 : node?.type === "combat" ? 2 : node?.type === "elite" ? 3 : node?.type === "boss" ? 4 : 5;
      return nodeRank(leftNode) - nodeRank(rightNode) || (leftNode?.layer ?? 0) - (rightNode?.layer ?? 0) || compareText(left.nodeId, right.nodeId);
    })[0];
};

const rewardCardScore = (
  option: RewardOption,
  registry: GameContentRegistry,
  strategy: "greedyDamage" | "defensive"
): number => {
  if (option.type === "petUpgrade") {
    const upgrade = registry.petUpgrades.find((candidate) => candidate.id === option.upgradeId);
    const tags = upgrade?.tags ?? [];
    if (strategy === "greedyDamage") {
      return 12 + (tags.includes("burn") ? 6 : 0) + (tags.includes("attack") ? 4 : 0) + (tags.includes("draw") ? 2 : 0);
    }
    return 10 + (tags.includes("energy") ? 5 : 0) + (tags.includes("draw") ? 4 : 0) + (tags.includes("burn") ? 2 : 0);
  }

  const card = registry.cards.find((candidate) => candidate.id === option.cardId);
  if (!card) {
    return -100;
  }
  if (strategy === "greedyDamage") {
    return offensiveScore(card, { run: undefined as never, petInstances: [], lastEvents: [] }) + drawScore(card);
  }
  return defensiveScore(card) * 1.4 + drawScore(card) + offensiveScore(card, { run: undefined as never, petInstances: [], lastEvents: [] }) * 0.35;
};

const selectRewardAction = (
  actions: readonly AgentAction[],
  snapshot: AgentRunDriverSnapshot,
  registry: GameContentRegistry,
  strategy: "greedyDamage" | "defensive"
): AgentAction | undefined => {
  const claims = actions.filter((action): action is Extract<AgentAction, { readonly type: "claimReward" }> => action.type === "claimReward");
  const optionsById = new Map(snapshot.run.pendingRewardOffer?.options.map((option) => [option.id, option]) ?? []);
  const best = claims
    .map((action) => ({ action, option: optionsById.get(action.rewardOptionId) }))
    .filter((entry): entry is { readonly action: Extract<AgentAction, { readonly type: "claimReward" }>; readonly option: RewardOption } => Boolean(entry.option))
    .sort((left, right) => rewardCardScore(right.option, registry, strategy) - rewardCardScore(left.option, registry, strategy) || compareText(left.action.rewardOptionId, right.action.rewardOptionId))[0];
  return best?.action ?? actions.find((action) => action.type === "skipReward");
};

const selectGreedyCombatAction = (
  actions: readonly AgentAction[],
  snapshot: AgentRunDriverSnapshot,
  registry: GameContentRegistry
): AgentAction | undefined => {
  const playActions = actions.filter((action) => action.type === "playCard");
  const attack = playActions
    .map((action) => ({ action, card: cardForAction(action, snapshot, registry) }))
    .filter((entry) => offensiveScore(entry.card, snapshot) > 0)
    .sort((left, right) => offensiveScore(right.card, snapshot) - offensiveScore(left.card, snapshot) || targetHp(left.action, snapshot) - targetHp(right.action, snapshot))[0]?.action;
  if (attack) {
    return attack;
  }

  const utility = playActions
    .map((action) => ({ action, card: cardForAction(action, snapshot, registry) }))
    .sort((left, right) => Math.max(drawScore(right.card), defensiveScore(right.card)) - Math.max(drawScore(left.card), defensiveScore(left.card)))[0]?.action;
  return utility ?? actions.find((action) => action.type === "endTurn");
};

const selectDefensiveCombatAction = (
  actions: readonly AgentAction[],
  snapshot: AgentRunDriverSnapshot,
  registry: GameContentRegistry
): AgentAction | undefined => {
  const combat = snapshot.combat;
  const playActions = actions.filter((action) => action.type === "playCard");
  const incoming = estimateIncomingDamage(snapshot, registry);
  const currentBlock = combat?.player.block ?? 0;
  const shouldBlock = incoming > currentBlock;

  if (shouldBlock) {
    const block = playActions
      .map((action) => ({ action, card: cardForAction(action, snapshot, registry) }))
      .filter((entry) => defensiveScore(entry.card) > 0)
      .sort((left, right) => defensiveScore(right.card) - defensiveScore(left.card) || drawScore(right.card) - drawScore(left.card))[0]?.action;
    if (block) {
      return block;
    }
  }

  const draw = playActions
    .map((action) => ({ action, card: cardForAction(action, snapshot, registry) }))
    .filter((entry) => drawScore(entry.card) > 0 && (entry.card?.cost ?? 0) === 0)
    .sort((left, right) => drawScore(right.card) - drawScore(left.card))[0]?.action;
  if (draw) {
    return draw;
  }

  return selectGreedyCombatAction(actions, snapshot, registry);
};

const chooseProfileAction = (
  policyId: Exclude<AgentPolicyId, "randomLegal" | "deterministicSmoke">,
  snapshot: AgentRunDriverSnapshot,
  registry: GameContentRegistry
): AgentAction | undefined => {
  const actions = getLegalAgentActions(snapshot, registry);
  const forced = actions.find((action) => action.type === "completeCombatIfEnded" || action.type === "completeNonCombatNode");
  if (forced) {
    return forced;
  }

  if (snapshot.run.status === "map_select") {
    return selectMapAction(actions, snapshot);
  }

  if (snapshot.run.status === "reward") {
    return selectRewardAction(actions, snapshot, registry, policyId);
  }

  if (snapshot.run.status === "combat") {
    return policyId === "defensive"
      ? selectDefensiveCombatAction(actions, snapshot, registry)
      : selectGreedyCombatAction(actions, snapshot, registry);
  }

  return actions[0];
};

export const chooseAgentPolicyAction = (
  policyId: AgentPolicyId,
  snapshot: AgentRunDriverSnapshot,
  rng: Rng,
  registry: GameContentRegistry = starterRegistry
): AgentAction | undefined => {
  if (policyId === "randomLegal") {
    return randomLegalPolicy(snapshot, rng, registry);
  }
  if (policyId === "deterministicSmoke") {
    return deterministicSmokePolicy(snapshot, registry);
  }
  return chooseProfileAction(policyId, snapshot, registry);
};

export const isAgentPolicyId = (value: string): value is AgentPolicyId =>
  agentPolicyProfiles.some((profile) => profile.id === value);
