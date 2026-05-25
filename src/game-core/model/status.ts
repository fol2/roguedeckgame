import { statusId, type StatusId } from "../ids";

export type CombatStatusState = {
  readonly statusId: StatusId;
  readonly stacks: number;
};

export type StatusDefinition = {
  readonly id: StatusId;
  readonly name: string;
  readonly tags: readonly string[];
  readonly description: string;
};

export const burnStatusDefinition: StatusDefinition = {
  id: statusId("burn"),
  name: "Burn",
  tags: ["damage", "fire"],
  description: "At the start of this combatant's turn, take damage equal to Burn, then reduce Burn by 1."
};
