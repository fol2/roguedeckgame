import type { GameContentRegistry } from "../model/registry";
import { burnStatusDefinition, type StatusBehaviourDefinition, type StatusDefinition } from "../model/status";

export const supportedStatusBehaviourTypes = ["startOfTurnDamage"] as const satisfies readonly StatusBehaviourDefinition["type"][];

export const defaultStatusDefinitions = [burnStatusDefinition] as const;

export const getStatusDefinitions = (
  registry?: Pick<GameContentRegistry, "statuses">
): readonly StatusDefinition[] => registry?.statuses ?? defaultStatusDefinitions;

export const hasSupportedRuntimeStatusBehaviour = (status: StatusDefinition): boolean =>
  status.behaviour !== undefined &&
  supportedStatusBehaviourTypes.includes(status.behaviour.type);

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

export const validateStatusBehaviourDefinition = (
  behaviour: unknown
): boolean => {
  if (typeof behaviour !== "object" || behaviour === null || Array.isArray(behaviour)) {
    return false;
  }

  const candidate = behaviour as Partial<StatusBehaviourDefinition>;
  return candidate.type === "startOfTurnDamage" &&
    candidate.timing === "startOfTurn" &&
    candidate.damageAmount === "stacks" &&
    typeof candidate.ignoreBlock === "boolean" &&
    typeof candidate.decrementStacksBy === "number" &&
    Number.isInteger(candidate.decrementStacksBy) &&
    candidate.decrementStacksBy > 0 &&
    typeof candidate.expiresAtZero === "boolean";
};
