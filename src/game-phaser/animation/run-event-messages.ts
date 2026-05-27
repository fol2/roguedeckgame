import type { GameEvent } from "../../game-core";

export const formatRunEventMessage = (event: GameEvent): string => {
  switch (event.type) {
    case "RunCreated":
      return `Run created: ${event.runId}`;
    case "RunMapGenerated":
      return `Map generated: ${event.nodeCount} nodes`;
    case "RunNodeAvailable":
      return `Node available: ${event.nodeId}`;
    case "RunNodeSelected":
      return `Node selected: ${event.nodeId}`;
    case "RunCombatStarted":
      return `Combat started: ${event.encounterId}`;
    case "RunCombatCompleted":
      return `Combat completed: ${event.outcome}`;
    case "RunRewardPending":
      return `Reward pending: ${event.rewardOfferId}`;
    case "RunPlayerHealed":
      return `Rest healed: ${event.hpBefore} -> ${event.hpAfter}`;
    case "RewardOffered":
      return `Reward offered: ${event.options.length} options`;
    case "RewardSelected":
      return `Reward selected: ${event.rewardOptionId}`;
    case "RewardSkipped":
      return `Reward skipped: ${event.rewardOfferId}`;
    case "CardRewardAdded":
      return `Card added: ${event.cardId}`;
    case "PetUpgradeUnlocked":
      return `Pet upgrade unlocked: ${event.upgradeId}`;
    case "RunNodeCompleted":
      return `Node completed: ${event.nodeId}`;
    case "RunAdvanced":
      return event.availableNodeIds.length > 0
        ? `Run advanced: ${event.availableNodeIds.length} node(s) available`
        : "Run advanced: no nodes available";
    case "RunEnded":
      return `Run ended: ${event.outcome}`;
    case "ActionRejected":
      return `Rejected: ${event.message}`;
    case "CombatEnded":
      return `Combat ended: ${event.outcome}`;
    case "MonsterIntentSet":
      return `Intent set: ${event.intentType}`;
    case "MonsterIntentResolved":
      return `Intent resolved: ${event.intentId}`;
    case "DamageDealt":
      return `${event.sourceId} dealt ${event.amount} damage to ${event.targetId}`;
    case "BlockGained":
      return `${event.targetId} gained ${event.amount} block`;
    case "StatusApplied":
      return `${event.targetId} gained ${event.stacks} ${event.statusId}`;
    case "StatusConsumed":
      return `${event.targetId} consumed ${event.stacksConsumed} ${event.statusId}`;
    case "StatusTicked":
      return `${event.statusId} ticked on ${event.targetId}`;
    case "PetModifierActivated":
      return `Pet modifier activated: ${event.modifierId}`;
    case "CardCostModified":
      return `Card cost modified: ${event.cardId} ${event.originalCost} -> ${event.modifiedCost}`;
    default:
      return `Event: ${event.type}`;
  }
};
