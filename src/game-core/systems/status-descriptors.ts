import type { CombatStatusState, StatusDefinition } from "../model/status";

export type StatusDescriptor = {
  readonly id: string;
  readonly name: string;
  readonly tags: readonly string[];
  readonly currentStacks: number;
  readonly currentDuration?: number;
  readonly stacking: string;
  readonly behaviour: string;
  readonly lifecycle: readonly string[];
  readonly summaryLines: readonly string[];
};

const describeStacking = (definition?: StatusDefinition): string => {
  const stacking = definition?.stacking;
  if (!stacking) {
    return "Stacks add together; duration keeps the longest value when present.";
  }

  const cap = stacking.maxStacks === undefined ? "no stack cap" : `maximum ${stacking.maxStacks} stacks`;
  const duration = stacking.durationPolicy === "replace"
    ? "new duration replaces old duration"
    : stacking.durationPolicy === "keep"
      ? "existing duration is kept"
      : "duration keeps the longest value";

  return `Stacks add together with ${cap}; ${duration}.`;
};

const describeBehaviour = (definition?: StatusDefinition): string => {
  const behaviour = definition?.behaviour;
  if (!behaviour) {
    return "No runtime behaviour is configured.";
  }

  if (behaviour.type === "startOfTurnDamage") {
    const blockCopy = behaviour.ignoreBlock ? "ignoring Block" : "after Block";
    return `At ${behaviour.timing}, deals damage equal to stacks ${blockCopy}, then removes ${behaviour.decrementStacksBy} stack.`;
  }

  if (behaviour.type === "duration") {
    return `At ${behaviour.timing}, reduces duration by ${behaviour.decrementDurationBy}.`;
  }

  const statusIds = behaviour.blocksStatusIds?.join(", ");
  const tags = behaviour.blocksTagsAny?.join(", ");
  return `Blocks incoming statuses${statusIds ? ` by id: ${statusIds}` : ""}${tags ? ` by tag: ${tags}` : ""}.`;
};

const describeLifecycle = (definition?: StatusDefinition): readonly string[] => {
  const lines = ["Application emits StatusApplied or StatusApplicationBlocked."];
  const behaviour = definition?.behaviour;

  if (behaviour?.type === "startOfTurnDamage") {
    lines.push("Ticking emits StatusTicked before damage events.");
  }

  if (behaviour?.type === "duration") {
    lines.push("Duration changes emit StatusDurationChanged.");
  }

  if (behaviour && "expiresAtZero" in behaviour && behaviour.expiresAtZero) {
    lines.push("Expiry emits StatusExpired when stacks or duration reach zero.");
  }

  lines.push("Cleanse emits StatusCleansed; consume emits StatusConsumed.");
  return lines;
};

export const getStatusDescriptor = (
  status: CombatStatusState,
  definition?: StatusDefinition
): StatusDescriptor => {
  const stacking = describeStacking(definition);
  const behaviour = describeBehaviour(definition);
  const lifecycle = describeLifecycle(definition);
  const name = definition?.name ?? status.statusId;

  return {
    id: status.statusId,
    name,
    tags: definition?.tags ?? [],
    currentStacks: status.stacks,
    currentDuration: status.duration,
    stacking,
    behaviour,
    lifecycle,
    summaryLines: [
      `${name} ${status.stacks}${status.duration === undefined ? "" : ` (${status.duration} turns)`}`,
      definition?.description ?? "No status description is authored.",
      stacking,
      behaviour,
      ...lifecycle
    ]
  };
};
