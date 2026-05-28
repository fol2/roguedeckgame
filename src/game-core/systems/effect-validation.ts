import type { CombatantTarget, EffectDefinition, PetTarget } from "../model/effect";
import { knownEffectTypes } from "../model/effect";
import {
  getEffectDescriptor,
  type EffectDescriptor
} from "./effect-descriptors";
import { getRuntimeSupportedStatusIds } from "./status-behaviours";
import type { ValidationIssue } from "./validation";

export type EffectValidationContext = {
  readonly statusIds: ReadonlySet<string>;
};

const defaultEffectValidationContext: EffectValidationContext = {
  statusIds: getRuntimeSupportedStatusIds()
};

const issue = (
  severity: ValidationIssue["severity"],
  code: string,
  message: string,
  path: string
): ValidationIssue => ({ severity, code, message, path });

const combatantTargetTypes = new Set<CombatantTarget["type"]>(["self", "target", "allEnemies", "allAllies"]);
const petTargetTypes = new Set<PetTarget["type"]>(["specific", "leading", "allActive", "randomActive", "withTag"]);
const cardPileTypes = new Set(["draw", "hand", "discard", "exhaust"]);

const validateCombatantTargetPayload = (
  target: unknown,
  path: string
): ValidationIssue[] => {
  if (typeof target !== "object" || target === null || Array.isArray(target)) {
    return [issue("error", "invalid_effect_target", "Effect target must be an object.", path)];
  }

  const candidate = target as Partial<CombatantTarget>;
  const issues: ValidationIssue[] = [];
  if (!combatantTargetTypes.has(candidate.type as CombatantTarget["type"])) {
    issues.push(issue("error", "invalid_effect_target", `Effect target type '${String(candidate.type)}' is unknown.`, `${path}.type`));
  }

  if ("combatantId" in candidate && typeof candidate.combatantId !== "string") {
    issues.push(issue("error", "invalid_effect_target", "Effect combatantId must be a string when present.", `${path}.combatantId`));
  }

  return issues;
};

const validatePetTargetPayload = (
  target: unknown,
  path: string
): ValidationIssue[] => {
  if (typeof target !== "object" || target === null || Array.isArray(target)) {
    return [issue("error", "invalid_pet_target", "Pet target must be an object.", path)];
  }

  const candidate = target as Partial<PetTarget>;
  const issues: ValidationIssue[] = [];
  if (!petTargetTypes.has(candidate.type as PetTarget["type"])) {
    issues.push(issue("error", "invalid_pet_target", `Pet target type '${String(candidate.type)}' is unknown.`, `${path}.type`));
  }

  if (candidate.type === "specific" && (typeof candidate.petInstanceId !== "string" || candidate.petInstanceId.length === 0)) {
    issues.push(issue("error", "invalid_pet_target", "Specific pet target petInstanceId must be a non-empty string.", `${path}.petInstanceId`));
  }

  if (candidate.type === "withTag" && (typeof candidate.tag !== "string" || candidate.tag.length === 0)) {
    issues.push(issue("error", "invalid_pet_target", "Pet target tag must be a non-empty string.", `${path}.tag`));
  }

  if ("petInstanceId" in candidate && typeof candidate.petInstanceId !== "string") {
    issues.push(issue("error", "invalid_pet_target", "Pet target petInstanceId must be a string when present.", `${path}.petInstanceId`));
  }

  if ("tag" in candidate && (typeof candidate.tag !== "string" || candidate.tag.length === 0)) {
    issues.push(issue("error", "invalid_pet_target", "Pet target tag must be a non-empty string.", `${path}.tag`));
  }

  return issues;
};

const validateAmountPayload = (
  effectDefinition: EffectDefinition,
  descriptor: EffectDescriptor,
  path: string
): ValidationIssue[] => {
  if (descriptor.amount === "none") {
    return [];
  }

  const amount = "amount" in effectDefinition ? effectDefinition.amount : undefined;

  if (amount === undefined) {
    return [issue("error", "missing_effect_amount", "Effect is missing an amount.", `${path}.amount`)];
  }

  if (!Number.isFinite(amount) || amount < 0) {
    return [issue("error", "invalid_effect_amount", "Effect amount must be a non-negative finite number.", `${path}.amount`)];
  }

  if (descriptor.amount === "nonNegativeInteger" && !Number.isInteger(amount)) {
    return [issue("error", "invalid_effect_amount", "Draw effect amount must be an integer.", `${path}.amount`)];
  }

  return [];
};

const validateEffectPayload = (
  effectDefinition: EffectDefinition,
  path: string,
  context: EffectValidationContext
): ValidationIssue[] => {
  const descriptor = getEffectDescriptor(effectDefinition.type);
  const issues: ValidationIssue[] = [];

  if (descriptor.combatantTarget === "required" && !("target" in effectDefinition)) {
    issues.push(issue("error", "missing_effect_target", "Effect is missing a combatant target.", `${path}.target`));
  }

  if (descriptor.petTarget === "required" && !("petTarget" in effectDefinition)) {
    issues.push(issue("error", "missing_pet_target", "Effect is missing a pet target.", `${path}.petTarget`));
  }

  issues.push(...validateAmountPayload(effectDefinition, descriptor, path));

  if ("target" in effectDefinition) {
    issues.push(...validateCombatantTargetPayload(effectDefinition.target, `${path}.target`));
  }

  if ("petTarget" in effectDefinition) {
    issues.push(...validatePetTargetPayload(effectDefinition.petTarget, `${path}.petTarget`));
  }

  if (descriptor.requiresStatusId) {
    if (!("statusId" in effectDefinition)) {
      issues.push(issue("error", "missing_effect_status", "Status effect is missing a status id.", `${path}.statusId`));
    } else if (typeof effectDefinition.statusId !== "string" || !context.statusIds.has(effectDefinition.statusId)) {
      issues.push(issue("error", "unknown_effect_status", `Effect references unknown status '${effectDefinition.statusId}'.`, `${path}.statusId`));
    }
  }

  if (descriptor.requiresStacks) {
    if (!("stacks" in effectDefinition)) {
      issues.push(issue("error", "missing_effect_stacks", "Status effect is missing stacks.", `${path}.stacks`));
    } else if (typeof effectDefinition.stacks !== "number" || !Number.isInteger(effectDefinition.stacks) || effectDefinition.stacks <= 0) {
      issues.push(issue("error", "invalid_effect_stacks", "Status effect stacks must be a positive integer.", `${path}.stacks`));
    }
  }

  if (
    "duration" in effectDefinition &&
    effectDefinition.duration !== undefined &&
    (!Number.isInteger(effectDefinition.duration) || effectDefinition.duration <= 0)
  ) {
    issues.push(issue("error", "invalid_effect_duration", "Status effect duration must be a positive integer when present.", `${path}.duration`));
  }

  if (effectDefinition.type === "cleanseStatus") {
    if (
      effectDefinition.statusId !== undefined &&
      !context.statusIds.has(effectDefinition.statusId)
    ) {
      issues.push(issue("error", "unknown_effect_status", `Effect references unknown status '${effectDefinition.statusId}'.`, `${path}.statusId`));
    }

    if (
      effectDefinition.tagsAny !== undefined &&
      (
        !Array.isArray(effectDefinition.tagsAny) ||
        effectDefinition.tagsAny.some((tag) => typeof tag !== "string" || tag.length === 0)
      )
    ) {
      issues.push(issue("error", "invalid_effect_status_tags", "Cleanse status tagsAny must be a non-empty string array when present.", `${path}.tagsAny`));
    }

    if (
      effectDefinition.stacks !== undefined &&
      (!Number.isInteger(effectDefinition.stacks) || effectDefinition.stacks <= 0)
    ) {
      issues.push(issue("error", "invalid_effect_stacks", "Cleanse status stacks must be a positive integer when present.", `${path}.stacks`));
    }
  }

  if (
    effectDefinition.type === "consumeStatus" &&
    effectDefinition.stacks !== undefined &&
    (!Number.isInteger(effectDefinition.stacks) || effectDefinition.stacks <= 0)
  ) {
    issues.push(issue("error", "invalid_effect_stacks", "Consume status stacks must be a positive integer when present.", `${path}.stacks`));
  }

  if (effectDefinition.type === "revealIntent") {
    if (!["none", "unknown", "category", "rough", "exact", "scoped"].includes(effectDefinition.level)) {
      issues.push(issue("error", "invalid_intent_visibility_level", "Reveal intent level is unknown.", `${path}.level`));
    }
  }

  if (effectDefinition.type === "scopeIntent") {
    if (!["category", "candidateSet", "conditionHint", "exactIfLocked"].includes(effectDefinition.depth)) {
      issues.push(issue("error", "invalid_scope_intent_depth", "Scope intent depth is unknown.", `${path}.depth`));
    }
  }

  if (effectDefinition.type === "obscureIntent") {
    if (effectDefinition.amount !== undefined && (!Number.isInteger(effectDefinition.amount) || effectDefinition.amount < 0)) {
      issues.push(issue("error", "invalid_effect_amount", "Obscure intent amount must be a non-negative integer when present.", `${path}.amount`));
    }

    if (effectDefinition.level !== undefined && !["none", "unknown", "category", "rough", "exact", "scoped"].includes(effectDefinition.level)) {
      issues.push(issue("error", "invalid_intent_visibility_level", "Obscure intent level is unknown.", `${path}.level`));
    }
  }

  if (effectDefinition.type === "createCard") {
    if (typeof effectDefinition.cardId !== "string" || effectDefinition.cardId.length === 0) {
      issues.push(issue("error", "invalid_effect_card", "Create card effect cardId must be a non-empty string.", `${path}.cardId`));
    }

    if (!cardPileTypes.has(effectDefinition.to)) {
      issues.push(issue("error", "invalid_effect_pile", "Create card effect target pile is unsupported.", `${path}.to`));
    }
  }

  if (
    descriptor.requiresStoryFlagId &&
    (!("flagId" in effectDefinition) || typeof effectDefinition.flagId !== "string" || effectDefinition.flagId.length === 0)
  ) {
    issues.push(issue("error", "invalid_story_flag_effect", "Story flag effect flagId must be a non-empty string.", `${path}.flagId`));
  }

  if (
    descriptor.requiresPetReaction &&
    (!("reaction" in effectDefinition) || typeof effectDefinition.reaction !== "string" || effectDefinition.reaction.length === 0)
  ) {
    issues.push(issue("error", "invalid_pet_reaction_effect", "Pet reaction effect reaction must be a non-empty string.", `${path}.reaction`));
  }

  return issues;
};

export const validateEffects = (
  effects: readonly EffectDefinition[],
  path: string,
  context: EffectValidationContext = defaultEffectValidationContext
): ValidationIssue[] =>
  effects.flatMap((effectDefinition, index) => {
    if (typeof effectDefinition !== "object" || effectDefinition === null) {
      return [
        issue(
          "error",
          "invalid_effect_definition",
          "Effect definition must be an object.",
          `${path}.effects[${index}]`
        )
      ];
    }

    const effectPath = `${path}.effects[${index}]`;
    if (!knownEffectTypes.includes(effectDefinition.type)) {
      return [
        issue(
          "error",
          "unknown_effect_type",
          `Unknown effect type '${String(effectDefinition.type)}'.`,
          effectPath
        )
      ];
    }

    return validateEffectPayload(effectDefinition, effectPath, context);
  });
