import type { CardDefinition } from "../model/card";
import type { CombatantTarget, EffectDefinition } from "../model/effect";

export type CardTargetKind =
  | "none"
  | "self"
  | "enemy"
  | "allEnemies"
  | "pet"
  | "petAndEnemy"
  | "petAndSelf";

export type CardPlayMode = "immediate" | "selectEnemy" | "selectPet" | "unsupported";

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
  "target" in effectDefinition && targetNeedsActionTarget(effectDefinition.target);

export const cardNeedsActionTarget = (card: CardDefinition): boolean =>
  card.effects.some(effectNeedsActionTarget);

const effectTargetsSelf = (effectDefinition: EffectDefinition): boolean =>
  "target" in effectDefinition && effectDefinition.target.type === "self";

const effectTargetsAllEnemies = (effectDefinition: EffectDefinition): boolean =>
  "target" in effectDefinition && effectDefinition.target.type === "allEnemies";

const effectHasPetTarget = (effectDefinition: EffectDefinition): boolean =>
  "petTarget" in effectDefinition;

const getTargetKind = (card: CardDefinition): CardTargetKind => {
  const requiresActionTarget = cardNeedsActionTarget(card);
  const hasPetTarget = card.effects.some(effectHasPetTarget);
  const targetsSelf = card.effects.some(effectTargetsSelf);
  const targetsAllEnemies = card.effects.some(effectTargetsAllEnemies);
  const isPetCommand = card.type === "pet-command";

  if (requiresActionTarget && isPetCommand) {
    return "petAndEnemy";
  }

  if (requiresActionTarget) {
    return "enemy";
  }

  if (targetsSelf && isPetCommand) {
    return "petAndSelf";
  }

  if (hasPetTarget || isPetCommand) {
    return "pet";
  }

  if (targetsAllEnemies) {
    return "allEnemies";
  }

  if (targetsSelf) {
    return "self";
  }

  return "none";
};

export const getCardPlayMode = (targetKind: CardTargetKind): CardPlayMode => {
  if (targetKind === "enemy" || targetKind === "petAndEnemy") {
    return "selectEnemy";
  }

  if (
    targetKind === "none" ||
    targetKind === "self" ||
    targetKind === "pet" ||
    targetKind === "petAndSelf" ||
    targetKind === "allEnemies"
  ) {
    return "immediate";
  }

  return "unsupported";
};

export const getCardActionProfile = (card: CardDefinition): CardActionProfile => {
  const targetKind = getTargetKind(card);

  return {
    targetKind,
    playMode: getCardPlayMode(targetKind),
    requiresManualTarget: targetKind === "enemy" || targetKind === "petAndEnemy",
    requiresActionTarget: cardNeedsActionTarget(card),
    hasPetTarget: card.effects.some(effectHasPetTarget),
    targetsSelf: card.effects.some(effectTargetsSelf),
    targetsAllEnemies: card.effects.some(effectTargetsAllEnemies)
  };
};
