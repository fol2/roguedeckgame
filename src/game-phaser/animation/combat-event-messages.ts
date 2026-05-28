import type { GameEvent } from "../../game-core";

type EventLike = GameEvent | { readonly type: string; readonly [key: string]: unknown };

export const formatCombatEventMessage = (event: EventLike): string => {
  switch (event.type) {
    case "ActionRejected":
      return `Rejected: ${event.message}`;
    case "BlockGained":
      return `${event.targetId} gained ${event.amount} block (${event.total} total).`;
    case "CardDrawn":
      return `Drew ${event.cardId}.`;
    case "CardMoved":
      return `${event.cardId} moved ${event.from} -> ${event.to}.`;
    case "CardPlayed":
      return `Played ${event.cardId}.`;
    case "CardCostModified":
      return `${event.cardId} cost changed ${event.originalCost} -> ${event.modifiedCost}.`;
    case "CombatantDefeated":
      return `${event.combatantId} was defeated.`;
    case "CombatEnded":
      return event.outcome === "won" ? "Combat won." : "Combat lost.";
    case "CombatStarted":
      return `Combat started (${event.seed}).`;
    case "DamageDealt":
      return `${event.sourceId} dealt ${event.amount} damage to ${event.targetId} (${event.blocked} blocked).`;
    case "DeckShuffled":
      return `Shuffled ${event.count} card(s) into ${event.to}.`;
    case "EnergySpent":
      return `Spent ${event.amount} energy (${event.remaining} remaining).`;
    case "EnemyIntentVisibilityChanged":
      return `${event.monsterId} intent visibility is now ${event.level}.`;
    case "EnemyDeckShuffled":
      return `${event.monsterId} shuffled ${event.count} enemy card(s).`;
    case "EnemyCardMoved":
      return `${event.monsterId} enemy card moved ${event.from} -> ${event.to}.`;
    case "EnemyPlanCreated":
      return `${event.monsterId} created an enemy plan.`;
    case "EnemyPlanChanged":
      return `${event.monsterId} changed plan: ${event.fromIntentId} -> ${event.toIntentId} (${event.reason}).`;
    case "EnemyPlanFinalized":
      return `${event.monsterId} finalised ${event.intentId}.`;
    case "EnemyCardResolved":
      return `${event.monsterId} resolved an enemy card.`;
    case "MonsterAbilityPlanned":
      return `${event.monsterId} planned a monster card.`;
    case "MonsterAbilityPlayed":
      return `${event.monsterId} played ${event.abilityId}.`;
    case "MonsterIntentResolved":
      return `${event.monsterId} resolved ${event.intentId}.`;
    case "MonsterIntentSet":
      return `${event.monsterId} set an intent.`;
    case "PetCommanded":
      return `${event.petInstanceId} was commanded by ${event.cardId}.`;
    case "PetModifierActivated":
      return `${event.petInstanceId} activated ${event.modifierId} (${event.reason}).`;
    case "PetModifierConsumed":
      return `${event.petInstanceId} consumed ${event.modifierId}.`;
    case "PetReacted":
      return `${event.petInstanceId} reacted: ${event.reaction}.`;
    case "RunCombatStarted":
      return `Encounter ${event.encounterId} started.`;
    case "RunCombatCompleted":
      return `Run combat completed: ${event.outcome}.`;
    case "RunEnded":
      return `Run ended: ${event.outcome}.`;
    case "StatusApplied":
      return `${event.targetId} gained ${event.stacks} ${event.statusId}.`;
    case "StatusApplicationBlocked":
      return `${event.targetId} blocked ${event.statusId} with ${event.blockedByStatusId}.`;
    case "StatusCleansed":
      return `${event.targetId} cleansed ${event.stacksRemoved} ${event.statusId} (${event.remainingStacks} left).`;
    case "StatusConsumed":
      return `${event.targetId} consumed ${event.stacksConsumed} ${event.statusId} (${event.remainingStacks} left).`;
    case "StatusDurationChanged":
      return `${event.statusId} duration changed on ${event.targetId} (${event.durationBefore} -> ${event.durationAfter}).`;
    case "StatusExpired":
      return `${event.statusId} expired on ${event.targetId}.`;
    case "StatusTicked":
      return `${event.statusId} ticked on ${event.targetId} (${event.stacksBefore} -> ${event.stacksAfter}).`;
    case "TurnEnded":
      return `Turn ${event.turnNumber} ended.`;
    case "TurnStarted":
      return `Turn ${event.turnNumber} started.`;
    default:
      return `Event: ${event.type}`;
  }
};
