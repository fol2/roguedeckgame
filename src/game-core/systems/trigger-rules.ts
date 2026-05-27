import type { CombatantId, StatusId } from "../ids";
import type { CombatState } from "../model/combat";
import type { GameEvent } from "../model/event";
import type { PetModifierRule, TriggerOnEnemyDefeatedWithStatusRule } from "../model/pet";

export type TriggerWindowOutcome = "ongoing" | "won" | "lost";
export type TriggerCascadePolicy = "none" | "bounded";

export type TriggerWindow = {
  readonly stateBeforeEffects: CombatState;
  readonly stateAfterEffects: CombatState;
  readonly effectEvents: readonly GameEvent[];
  readonly phase: CombatState["phase"];
  readonly outcome: TriggerWindowOutcome;
  readonly cascadePolicy: TriggerCascadePolicy;
};

export type PetModifierTriggerFrame = Pick<TriggerWindow, "stateBeforeEffects" | "effectEvents"> & {
  readonly stateAfterEffects?: CombatState;
  readonly phase?: CombatState["phase"];
  readonly outcome?: TriggerWindowOutcome;
  readonly cascadePolicy?: TriggerCascadePolicy;
};

export const createTriggerWindow = (input: {
  readonly stateBeforeEffects: CombatState;
  readonly stateAfterEffects: CombatState;
  readonly effectEvents: readonly GameEvent[];
  readonly cascadePolicy?: TriggerCascadePolicy;
}): TriggerWindow => ({
  stateBeforeEffects: input.stateBeforeEffects,
  stateAfterEffects: input.stateAfterEffects,
  effectEvents: input.effectEvents,
  phase: input.stateBeforeEffects.phase,
  outcome: input.stateAfterEffects.phase === "won" || input.stateAfterEffects.phase === "lost"
    ? input.stateAfterEffects.phase
    : "ongoing",
  cascadePolicy: input.cascadePolicy ?? "none"
});

const normaliseTriggerWindow = (frame: PetModifierTriggerFrame): TriggerWindow => ({
  stateBeforeEffects: frame.stateBeforeEffects,
  stateAfterEffects: frame.stateAfterEffects ?? frame.stateBeforeEffects,
  effectEvents: frame.effectEvents,
  phase: frame.phase ?? frame.stateBeforeEffects.phase,
  outcome: frame.outcome ?? (
    frame.stateAfterEffects?.phase === "won" || frame.stateAfterEffects?.phase === "lost"
      ? frame.stateAfterEffects.phase
      : "ongoing"
  ),
  cascadePolicy: frame.cascadePolicy ?? "none"
});

type TriggerMatcher<Type extends PetModifierRule["type"]> = (
  rule: Extract<PetModifierRule, { readonly type: Type }>,
  frame: TriggerWindow
) => boolean;

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

const defeatedWithStatusMatcher: TriggerMatcher<"triggerOnEnemyDefeatedWithStatus"> = (rule, frame) =>
  burnedEnemiesDefeatedByEvents(
    frame.stateBeforeEffects,
    frame.effectEvents,
    rule.requiredStatusId
  ).length > 0;

const petModifierTriggerMatchers = {
  triggerOnEnemyDefeatedWithStatus: defeatedWithStatusMatcher
} as const satisfies Partial<{
  readonly [Type in PetModifierRule["type"]]: TriggerMatcher<Type>;
}>;

export const petModifierTriggerMatches = (
  rule: TriggerOnEnemyDefeatedWithStatusRule,
  frame: PetModifierTriggerFrame
): boolean =>
  petModifierTriggerMatchers[rule.type](rule, normaliseTriggerWindow(frame));
