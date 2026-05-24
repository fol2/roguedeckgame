import type { StatusId } from "../ids";

export type StatusDefinition = {
  readonly id: StatusId;
  readonly name: string;
  readonly tags: readonly string[];
  readonly description: string;
};
