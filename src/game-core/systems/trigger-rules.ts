import type { CombatantId, StatusId } from "../ids";
import type { CombatState } from "../model/combat";
import type { GameEvent } from "../model/event";
import type { TriggerOnEnemyDefeatedWithStatusRule } from "../model/pet";

export type PetModifierTriggerFrame = {
  readonly stateBeforeEffects: CombatState;
  readonly effectEvents: readonly GameEvent[];
};

export const burnedEnemiesDefeatedByEvents = (
  stateBeforeEvents: CombatState,
  events: readonly GameEvent[],
  requiredStatusId: StatusId
): readonly CombatantId[] => {
  const statusBearingCombatantIds = new Set<CombatantId>(
    stateBeforeEvents.monsters
      .filter((monster) => monster.statuses.some((status) => status.statusId === requiredStatusId && status.stacks > 0))
      .map((monster) => monster.id)
  );
  const defeatedIds: CombatantId[] = [];

  for (const event of events) {
    if (event.type === "StatusApplied" && event.statusId === requiredStatusId) {
      statusBearingCombatantIds.add(event.targetId);
      continue;
    }

    if (event.type === "StatusExpired" && event.statusId === requiredStatusId) {
      statusBearingCombatantIds.delete(event.targetId);
      continue;
    }

    if (event.type !== "CombatantDefeated") {
      continue;
    }

    const defeatedMonster = stateBeforeEvents.monsters.find((monster) => monster.id === event.combatantId);
    if (defeatedMonster && statusBearingCombatantIds.has(event.combatantId)) {
      defeatedIds.push(event.combatantId);
    }
  }

  return defeatedIds;
};

export const petModifierTriggerMatches = (
  rule: TriggerOnEnemyDefeatedWithStatusRule,
  frame: PetModifierTriggerFrame
): boolean =>
  burnedEnemiesDefeatedByEvents(
    frame.stateBeforeEffects,
    frame.effectEvents,
    rule.requiredStatusId
  ).length > 0;
