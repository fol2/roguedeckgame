import type { CardDefinition } from "../model/card";
import type { CombatantTarget, EffectDefinition } from "../model/effect";
import {
  getAbilityPlayMode,
  getEffectTargetProfile,
  targetNeedsRuntimeTarget,
  type AbilityPlayMode
} from "./effect-descriptors";

export type CardTargetKind =
  | "none"
  | "self"
  | "enemy"
  | "allEnemies"
  | "pet"
  | "petAndEnemy"
  | "petAndSelf";
export type CardPlayMode = AbilityPlayMode;

export type CardActionProfile = {
  readonly targetKind: CardTargetKind;
  readonly playMode: CardPlayMode;
  readonly requiresManualTarget: boolean;
  readonly requiresActionTarget: boolean;
  readonly hasPetTarget: boolean;
  readonly targetsSelf: boolean;
  readonly targetsAllEnemies: boolean;
};

export const targetNeedsActionTarget = (target: CombatantTarget): boolean =>
  target.type === "target" && target.combatantId === undefined;

export const effectNeedsActionTarget = (effectDefinition: EffectDefinition): boolean =>
  targetNeedsRuntimeTarget(effectDefinition);

export const cardNeedsActionTarget = (card: CardDefinition): boolean =>
  card.effects.some(effectNeedsActionTarget);

export const getCardPlayMode = (targetKind: CardTargetKind): CardPlayMode => {
  return getAbilityPlayMode(targetKind);
};

export const getCardActionProfile = (card: CardDefinition): CardActionProfile => {
  const targetProfile = getEffectTargetProfile(card.effects, {
    petCommand: card.type === "pet-command",
    targetBinding: "manual"
  });
  const targetKind = targetProfile.targetKind === "allAllies"
    ? "self"
    : targetProfile.targetKind;

  return {
    targetKind,
    playMode: getCardPlayMode(targetKind),
    requiresManualTarget: targetProfile.requiresManualTarget,
    requiresActionTarget: targetProfile.requiresTargetBinding,
    hasPetTarget: targetProfile.hasPetTarget,
    targetsSelf: targetProfile.targetsSelf,
    targetsAllEnemies: targetProfile.targetsAllEnemies
  };
};
