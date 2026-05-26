import { statusId, type StatusId } from "../ids";

export type CombatStatusState = {
  readonly statusId: StatusId;
  readonly stacks: number;
};

export type StatusBehaviourDefinition = {
  readonly type: "startOfTurnDamage";
  readonly timing: "startOfTurn";
  readonly damageAmount: "stacks";
  readonly ignoreBlock: boolean;
  readonly decrementStacksBy: number;
  readonly expiresAtZero: boolean;
};

export type StatusDefinition = {
  readonly id: StatusId;
  readonly name: string;
  readonly tags: readonly string[];
  readonly description: string;
  readonly behaviour?: StatusBehaviourDefinition;
};

export const burnStatusDefinition: StatusDefinition = {
  id: statusId("burn"),
  name: "Burn",
  tags: ["damage", "fire"],
  description: "At the start of this unit's turn, take damage equal to Burn ignoring Block, then reduce Burn by 1. Expires at 0.",
  behaviour: {
    type: "startOfTurnDamage",
    timing: "startOfTurn",
    damageAmount: "stacks",
    ignoreBlock: true,
    decrementStacksBy: 1,
    expiresAtZero: true
  }
};
