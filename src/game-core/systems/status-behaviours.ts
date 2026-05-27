import type { GameContentRegistry } from "../model/registry";
import { burnStatusDefinition, type StatusBehaviourDefinition, type StatusDefinition, type StatusStackingDefinition } from "../model/status";

export const supportedStatusBehaviourTypes = [
  "startOfTurnDamage",
  "duration",
  "statusImmunity"
] as const satisfies readonly StatusBehaviourDefinition["type"][];

export const defaultStatusDefinitions = [burnStatusDefinition] as const;

export const getStatusDefinitions = (
  registry?: Pick<GameContentRegistry, "statuses">
): readonly StatusDefinition[] => registry?.statuses ?? defaultStatusDefinitions;

export const validateStatusBehaviourDefinition = (
  behaviour: unknown
): boolean => {
  if (typeof behaviour !== "object" || behaviour === null || Array.isArray(behaviour)) {
    return false;
  }

  const candidate = behaviour as Partial<StatusBehaviourDefinition>;
  if (candidate.type === "startOfTurnDamage") {
    return candidate.timing === "startOfTurn" &&
      candidate.damageAmount === "stacks" &&
      typeof candidate.ignoreBlock === "boolean" &&
      typeof candidate.decrementStacksBy === "number" &&
      Number.isInteger(candidate.decrementStacksBy) &&
      candidate.decrementStacksBy > 0 &&
      typeof candidate.expiresAtZero === "boolean";
  }

  if (candidate.type === "duration") {
    return (candidate.timing === "startOfTurn" || candidate.timing === "endOfTurn") &&
      typeof candidate.decrementDurationBy === "number" &&
      Number.isInteger(candidate.decrementDurationBy) &&
      candidate.decrementDurationBy > 0 &&
      typeof candidate.expiresAtZero === "boolean";
  }

  if (candidate.type === "statusImmunity") {
    const blocksStatusIds = "blocksStatusIds" in candidate ? candidate.blocksStatusIds : undefined;
    const blocksTagsAny = "blocksTagsAny" in candidate ? candidate.blocksTagsAny : undefined;
    return (blocksStatusIds === undefined || (
      Array.isArray(blocksStatusIds) &&
      blocksStatusIds.every((statusId) => typeof statusId === "string" && statusId.length > 0)
    )) &&
      (blocksTagsAny === undefined || (
        Array.isArray(blocksTagsAny) &&
        blocksTagsAny.every((tag) => typeof tag === "string" && tag.length > 0)
      )) &&
      (blocksStatusIds !== undefined || blocksTagsAny !== undefined);
  }

  return false;
};

export const validateStatusStackingDefinition = (
  stacking: unknown
): boolean => {
  if (typeof stacking !== "object" || stacking === null || Array.isArray(stacking)) {
    return false;
  }

  const candidate = stacking as Partial<StatusStackingDefinition>;
  return candidate.type === "additive" &&
    (
      candidate.maxStacks === undefined ||
      (Number.isInteger(candidate.maxStacks) && candidate.maxStacks > 0)
    ) &&
    (
      candidate.durationPolicy === undefined ||
      candidate.durationPolicy === "keep" ||
      candidate.durationPolicy === "max" ||
      candidate.durationPolicy === "replace"
    );
};

export const hasSupportedRuntimeStatusBehaviour = (status: StatusDefinition): boolean =>
  status.behaviour !== undefined &&
  supportedStatusBehaviourTypes.includes(status.behaviour.type) &&
  validateStatusBehaviourDefinition(status.behaviour);

export const getRuntimeSupportedStatusIds = (
  registry?: Pick<GameContentRegistry, "statuses">
): ReadonlySet<string> =>
  new Set(
    getStatusDefinitions(registry)
      .filter(hasSupportedRuntimeStatusBehaviour)
      .map((status) => status.id)
  );

export const findStatusDefinition = (
  registry: Pick<GameContentRegistry, "statuses"> | undefined,
  statusId: string
): StatusDefinition | undefined =>
  getStatusDefinitions(registry).find((status) => status.id === statusId);
