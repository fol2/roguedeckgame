import type { CombatantTarget, PetTarget } from "../../model/effect";
import type { IntentVisibilityExpiry, IntentVisibilityLevel, IntentVisibilitySource } from "../../model/combat";
import type { StatusId, StoryFlagId } from "../../ids";
import type {
  ApplyStatusEffect,
  BlockEffect,
  DamageEffect,
  DrawEffect,
  ImproveIntentVisibilityEffect,
  PetAttackEffect,
  PetBlockEffect,
  PetReactEffect,
  SetStoryFlagEffect
} from "../../model/effect";

export const damageEffect = (amount: number, target: CombatantTarget): DamageEffect => ({
  type: "damage",
  amount,
  target
});

export const blockEffect = (amount: number, target: CombatantTarget): BlockEffect => ({
  type: "block",
  amount,
  target
});

export const drawEffect = (amount: number): DrawEffect => ({
  type: "draw",
  amount
});

export const applyStatusEffect = (
  statusId: StatusId,
  stacks: number,
  target: CombatantTarget
): ApplyStatusEffect => ({
  type: "applyStatus",
  statusId,
  stacks,
  target
});

export const improveIntentVisibilityEffect = (
  target: CombatantTarget,
  amount: number,
  options: {
    readonly maxLevel?: IntentVisibilityLevel;
    readonly source?: IntentVisibilitySource;
    readonly expires?: IntentVisibilityExpiry;
  } = {}
): ImproveIntentVisibilityEffect => ({
  type: "improveIntentVisibility",
  target,
  amount,
  ...options
});

export const petAttackEffect = (
  petTarget: PetTarget,
  amount: number,
  target: CombatantTarget
): PetAttackEffect => ({
  type: "petAttack",
  petTarget,
  amount,
  target
});

export const petBlockEffect = (
  petTarget: PetTarget,
  amount: number,
  target: CombatantTarget
): PetBlockEffect => ({
  type: "petBlock",
  petTarget,
  amount,
  target
});

export const petReactEffect = (
  petTarget: PetTarget,
  reaction: string
): PetReactEffect => ({
  type: "petReact",
  petTarget,
  reaction
});

export const setStoryFlagEffect = (flagId: StoryFlagId): SetStoryFlagEffect => ({
  type: "setStoryFlag",
  flagId
});
