import type { AgentAction, AgentRunDriverSnapshot } from "../game-core/testing/agent-actions";
import { starterRegistry } from "../game-core/data/registry";

export type StateSummary = {
  readonly runStatus: string;
  readonly currentNodeId?: string;
  readonly player?: {
    readonly hp: number;
    readonly maxHp: number;
    readonly block: number;
    readonly energy: number;
  };
  readonly monsters: readonly {
    readonly id: string;
    readonly name: string;
    readonly hp: number;
    readonly maxHp: number;
    readonly block: number;
    readonly alive: boolean;
    readonly intentId?: string;
  }[];
  readonly hand: readonly {
    readonly cardInstanceId: string;
    readonly cardId: string;
    readonly name: string;
    readonly cost: number;
  }[];
  readonly rewards: readonly unknown[];
};

export const actionLabel = (action: AgentAction): string => {
  if (action.type === "selectMapNode") {
    return `Select node ${action.nodeId}`;
  }
  if (action.type === "playCard") {
    return `Play ${action.cardInstanceId}${action.targetId ? ` -> ${action.targetId}` : ""}`;
  }
  if (action.type === "claimReward") {
    return `Claim reward ${action.rewardOptionId}`;
  }
  return action.type;
};

export const createStateSummary = (snapshot: AgentRunDriverSnapshot): StateSummary => {
  const cardById = new Map(starterRegistry.cards.map((card) => [card.id, card]));
  const cardInstanceById = new Map(snapshot.combat?.cardInstances.map((cardInstance) => [cardInstance.id, cardInstance]) ?? []);

  return {
    runStatus: snapshot.run.status,
    currentNodeId: snapshot.run.map?.currentNodeId,
    player: snapshot.combat
      ? {
          hp: snapshot.combat.player.hp,
          maxHp: snapshot.combat.player.maxHp,
          block: snapshot.combat.player.block,
          energy: snapshot.combat.energy
        }
      : undefined,
    monsters:
      snapshot.combat?.monsters.map((monster) => ({
        id: monster.id,
        name: monster.name,
        hp: monster.hp,
        maxHp: monster.maxHp,
        block: monster.block,
        alive: monster.alive,
        intentId: snapshot.combat?.monsterIntents.find((intent) => intent.monsterCombatantId === monster.id)?.intentId
      })) ?? [],
    hand:
      snapshot.combat?.hand.map((cardInstanceId) => {
        const instance = cardInstanceById.get(cardInstanceId);
        const card = instance ? cardById.get(instance.cardId) : undefined;
        return {
          cardInstanceId,
          cardId: instance?.cardId ?? "missing",
          name: card?.name ?? "Missing card",
          cost: card?.cost ?? 0
        };
      }) ?? [],
    rewards: snapshot.run.pendingRewardOffer?.options ?? []
  };
};

export const formatHumanState = (
  snapshot: AgentRunDriverSnapshot,
  legalActions: readonly AgentAction[]
): string => {
  const summary = createStateSummary(snapshot);
  const lines = [`Status: ${summary.runStatus}`];
  if (summary.currentNodeId) {
    lines.push(`Node: ${summary.currentNodeId}`);
  }
  if (summary.player) {
    lines.push(`Player: ${summary.player.hp}/${summary.player.maxHp} hp, ${summary.player.block} block, ${summary.player.energy} energy`);
  }
  for (const monster of summary.monsters) {
    lines.push(`Monster: ${monster.name} (${monster.id}) ${monster.hp}/${monster.maxHp} hp, ${monster.block} block, ${monster.alive ? "alive" : "defeated"}${monster.intentId ? `, intent ${monster.intentId}` : ""}`);
  }
  if (summary.hand.length > 0) {
    lines.push("Hand:");
    summary.hand.forEach((card, index) => lines.push(`  ${index + 1}. ${card.name} [${card.cardInstanceId}] cost ${card.cost}`));
  }
  if (summary.rewards.length > 0) {
    lines.push(`Rewards: ${summary.rewards.length}`);
  }
  lines.push("Legal actions:");
  legalActions.forEach((action, index) => lines.push(`  ${index + 1}. ${actionLabel(action)}`));
  lines.push("Commands: number, end, skip, reset, help, quit");
  return lines.join("\n");
};

export const formatJsonState = (
  type: "state" | "result" | "error",
  ok: boolean,
  snapshot: AgentRunDriverSnapshot,
  legalActions: readonly AgentAction[],
  events: readonly unknown[] = [],
  errors: readonly unknown[] = []
): string => JSON.stringify({
  type,
  ok,
  stateSummary: createStateSummary(snapshot),
  legalActions,
  events,
  errors
});
