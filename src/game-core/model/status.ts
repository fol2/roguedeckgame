import { statusId, type StatusId } from "../ids";

export type CombatStatusState = {
  readonly statusId: StatusId;
  readonly stacks: number;
  readonly duration?: number;
};

export type StatusStackingDefinition = {
  readonly type: "additive";
  readonly maxStacks?: number;
  readonly durationPolicy?: "keep" | "max" | "replace";
};

export type StatusTurnTiming = "startOfTurn" | "endOfTurn";

export type StartOfTurnDamageStatusBehaviourDefinition = {
  readonly type: "startOfTurnDamage";
  readonly timing: "startOfTurn";
  readonly damageAmount: "stacks";
  readonly ignoreBlock: boolean;
  readonly decrementStacksBy: number;
  readonly expiresAtZero: boolean;
};

export type DurationStatusBehaviourDefinition = {
  readonly type: "duration";
  readonly timing: StatusTurnTiming;
  readonly decrementDurationBy: number;
  readonly expiresAtZero: boolean;
};

export type StatusImmunityBehaviourDefinition = {
  readonly type: "statusImmunity";
  readonly blocksStatusIds?: readonly StatusId[];
  readonly blocksTagsAny?: readonly string[];
};

export type StatusBehaviourDefinition =
  | StartOfTurnDamageStatusBehaviourDefinition
  | DurationStatusBehaviourDefinition
  | StatusImmunityBehaviourDefinition;

export type StatusDefinition = {
  readonly id: StatusId;
  readonly name: string;
  readonly tags: readonly string[];
  readonly description: string;
  readonly stacking?: StatusStackingDefinition;
  readonly behaviour?: StatusBehaviourDefinition;
};

export const burnStatusDefinition: StatusDefinition = {
  id: statusId("burn"),
  name: "Burn",
  tags: ["damage", "fire"],
  description: "At the start of this unit's turn, take damage equal to Burn ignoring Block, then reduce Burn by 1. Expires at 0.",
  stacking: {
    type: "additive",
    durationPolicy: "max"
  },
  behaviour: {
    type: "startOfTurnDamage",
    timing: "startOfTurn",
    damageAmount: "stacks",
    ignoreBlock: true,
    decrementStacksBy: 1,
    expiresAtZero: true
  }
};

export const nextAttackBoostStatusDefinition: StatusDefinition = {
  id: statusId("next_attack_boost"),
  name: "Next Attack Boost",
  tags: ["buff", "attack", "temporary"],
  description: "The next direct attack from this unit gains damage equal to this status, then consumes the status.",
  stacking: {
    type: "additive",
    durationPolicy: "max"
  }
};
