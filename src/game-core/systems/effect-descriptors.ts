import type { EffectDefinition } from "../model/effect";

export type EffectResolverKey =
  | "damageLike"
  | "blockLike"
  | "draw"
  | "pileMove"
  | "createCard"
  | "retain"
  | "gainEnergy"
  | "applyStatus"
  | "cleanseStatus"
  | "petReact"
  | "storyFlag";

export type EffectCombatantTargetRequirement = "none" | "required";
export type EffectPetTargetRequirement = "none" | "required";
export type EffectAmountRequirement = "none" | "nonNegativeNumber" | "nonNegativeInteger";
export type AbilityTargetKind =
  | "none"
  | "self"
  | "enemy"
  | "allEnemies"
  | "allAllies"
  | "pet"
  | "petAndEnemy"
  | "petAndSelf";
export type AbilityPlayMode = "immediate" | "selectEnemy" | "selectPet" | "unsupported";
export type AbilityTargetBinding = "manual" | "default";

export type EffectDescriptor<Type extends EffectDefinition["type"] = EffectDefinition["type"]> = {
  readonly type: Type;
  readonly resolverKey: EffectResolverKey;
  readonly combatantTarget: EffectCombatantTargetRequirement;
  readonly petTarget: EffectPetTargetRequirement;
  readonly amount: EffectAmountRequirement;
  readonly requiresStatusId: boolean;
  readonly requiresStacks: boolean;
  readonly requiresStoryFlagId: boolean;
  readonly requiresPetReaction: boolean;
};

export type AbilityTargetProfile = {
  readonly targetKind: AbilityTargetKind;
  readonly playMode: AbilityPlayMode;
  readonly requiresTargetBinding: boolean;
  readonly requiresManualTarget: boolean;
  readonly usesDefaultTarget: boolean;
  readonly hasPetTarget: boolean;
  readonly targetsSelf: boolean;
  readonly targetsAllEnemies: boolean;
  readonly targetsAllAllies: boolean;
};

export type EffectSummary = {
  readonly type: EffectDefinition["type"];
  readonly amount?: number;
  readonly cardId?: string;
  readonly to?: string;
  readonly combatantTarget?: EffectDefinition extends infer Effect
    ? Effect extends { readonly type: EffectDefinition["type"]; readonly target: infer Target }
      ? Target extends { readonly type: string }
        ? Target["type"]
        : never
      : never
    : never;
  readonly petTarget?: EffectDefinition extends infer Effect
    ? Effect extends { readonly type: EffectDefinition["type"]; readonly petTarget: infer Target }
      ? Target extends { readonly type: string }
        ? Target["type"]
        : never
      : never
    : never;
  readonly statusId?: string;
  readonly stacks?: number;
  readonly duration?: number;
  readonly tagsAny?: readonly string[];
  readonly flagId?: string;
  readonly reaction?: string;
};

export const effectDescriptors = {
  damage: {
    type: "damage",
    resolverKey: "damageLike",
    combatantTarget: "required",
    petTarget: "none",
    amount: "nonNegativeNumber",
    requiresStatusId: false,
    requiresStacks: false,
    requiresStoryFlagId: false,
    requiresPetReaction: false
  },
  block: {
    type: "block",
    resolverKey: "blockLike",
    combatantTarget: "required",
    petTarget: "none",
    amount: "nonNegativeNumber",
    requiresStatusId: false,
    requiresStacks: false,
    requiresStoryFlagId: false,
    requiresPetReaction: false
  },
  draw: {
    type: "draw",
    resolverKey: "draw",
    combatantTarget: "none",
    petTarget: "none",
    amount: "nonNegativeInteger",
    requiresStatusId: false,
    requiresStacks: false,
    requiresStoryFlagId: false,
    requiresPetReaction: false
  },
  discard: {
    type: "discard",
    resolverKey: "pileMove",
    combatantTarget: "none",
    petTarget: "none",
    amount: "nonNegativeInteger",
    requiresStatusId: false,
    requiresStacks: false,
    requiresStoryFlagId: false,
    requiresPetReaction: false
  },
  exhaust: {
    type: "exhaust",
    resolverKey: "pileMove",
    combatantTarget: "none",
    petTarget: "none",
    amount: "nonNegativeInteger",
    requiresStatusId: false,
    requiresStacks: false,
    requiresStoryFlagId: false,
    requiresPetReaction: false
  },
  retain: {
    type: "retain",
    resolverKey: "retain",
    combatantTarget: "none",
    petTarget: "none",
    amount: "nonNegativeInteger",
    requiresStatusId: false,
    requiresStacks: false,
    requiresStoryFlagId: false,
    requiresPetReaction: false
  },
  createCard: {
    type: "createCard",
    resolverKey: "createCard",
    combatantTarget: "none",
    petTarget: "none",
    amount: "none",
    requiresStatusId: false,
    requiresStacks: false,
    requiresStoryFlagId: false,
    requiresPetReaction: false
  },
  gainEnergy: {
    type: "gainEnergy",
    resolverKey: "gainEnergy",
    combatantTarget: "none",
    petTarget: "none",
    amount: "nonNegativeInteger",
    requiresStatusId: false,
    requiresStacks: false,
    requiresStoryFlagId: false,
    requiresPetReaction: false
  },
  applyStatus: {
    type: "applyStatus",
    resolverKey: "applyStatus",
    combatantTarget: "required",
    petTarget: "none",
    amount: "none",
    requiresStatusId: true,
    requiresStacks: true,
    requiresStoryFlagId: false,
    requiresPetReaction: false
  },
  cleanseStatus: {
    type: "cleanseStatus",
    resolverKey: "cleanseStatus",
    combatantTarget: "required",
    petTarget: "none",
    amount: "none",
    requiresStatusId: false,
    requiresStacks: false,
    requiresStoryFlagId: false,
    requiresPetReaction: false
  },
  petAttack: {
    type: "petAttack",
    resolverKey: "damageLike",
    combatantTarget: "required",
    petTarget: "required",
    amount: "nonNegativeNumber",
    requiresStatusId: false,
    requiresStacks: false,
    requiresStoryFlagId: false,
    requiresPetReaction: false
  },
  petBlock: {
    type: "petBlock",
    resolverKey: "blockLike",
    combatantTarget: "required",
    petTarget: "required",
    amount: "nonNegativeNumber",
    requiresStatusId: false,
    requiresStacks: false,
    requiresStoryFlagId: false,
    requiresPetReaction: false
  },
  petReact: {
    type: "petReact",
    resolverKey: "petReact",
    combatantTarget: "none",
    petTarget: "required",
    amount: "none",
    requiresStatusId: false,
    requiresStacks: false,
    requiresStoryFlagId: false,
    requiresPetReaction: true
  },
  setStoryFlag: {
    type: "setStoryFlag",
    resolverKey: "storyFlag",
    combatantTarget: "none",
    petTarget: "none",
    amount: "none",
    requiresStatusId: false,
    requiresStacks: false,
    requiresStoryFlagId: true,
    requiresPetReaction: false
  }
} as const satisfies {
  readonly [Type in EffectDefinition["type"]]: EffectDescriptor<Type>;
};

export const effectDescriptorList = Object.values(effectDescriptors);

export const knownEffectDescriptorTypes = effectDescriptorList.map((descriptor) => descriptor.type);

export const getEffectDescriptor = <Type extends EffectDefinition["type"]>(
  type: Type
): EffectDescriptor<Type> => effectDescriptors[type] as unknown as EffectDescriptor<Type>;

export const effectHasCombatantTarget = (effectDefinition: EffectDefinition): boolean =>
  getEffectDescriptor(effectDefinition.type).combatantTarget === "required";

export const effectHasPetTarget = (effectDefinition: EffectDefinition): boolean =>
  getEffectDescriptor(effectDefinition.type).petTarget === "required";

export const targetNeedsRuntimeTarget = (effectDefinition: EffectDefinition): boolean =>
  "target" in effectDefinition &&
  effectDefinition.target.type === "target" &&
  effectDefinition.target.combatantId === undefined;

export const getAbilityPlayMode = (targetKind: AbilityTargetKind): AbilityPlayMode => {
  if (targetKind === "enemy" || targetKind === "petAndEnemy") {
    return "selectEnemy";
  }

  if (
    targetKind === "none" ||
    targetKind === "self" ||
    targetKind === "pet" ||
    targetKind === "petAndSelf" ||
    targetKind === "allEnemies" ||
    targetKind === "allAllies"
  ) {
    return "immediate";
  }

  return "unsupported";
};

const effectTargetsSelf = (effectDefinition: EffectDefinition): boolean =>
  effectHasCombatantTarget(effectDefinition) && "target" in effectDefinition && effectDefinition.target.type === "self";

const effectTargetsAllEnemies = (effectDefinition: EffectDefinition): boolean =>
  effectHasCombatantTarget(effectDefinition) && "target" in effectDefinition && effectDefinition.target.type === "allEnemies";

const effectTargetsAllAllies = (effectDefinition: EffectDefinition): boolean =>
  effectHasCombatantTarget(effectDefinition) && "target" in effectDefinition && effectDefinition.target.type === "allAllies";

export const getEffectTargetProfile = (
  effects: readonly EffectDefinition[],
  options: {
    readonly petCommand?: boolean;
    readonly targetBinding?: AbilityTargetBinding;
  } = {}
): AbilityTargetProfile => {
  const targetBinding = options.targetBinding ?? "manual";
  const requiresTargetBinding = effects.some(targetNeedsRuntimeTarget);
  const hasPetTarget = effects.some(effectHasPetTarget);
  const targetsSelf = effects.some(effectTargetsSelf);
  const targetsAllEnemies = effects.some(effectTargetsAllEnemies);
  const targetsAllAllies = effects.some(effectTargetsAllAllies);
  const isPetCommand = options.petCommand === true;

  const targetKind = (() => {
    if (requiresTargetBinding && isPetCommand) {
      return "petAndEnemy";
    }

    if (requiresTargetBinding) {
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

    if (targetsAllAllies) {
      return "allAllies";
    }

    if (targetsSelf) {
      return "self";
    }

    return "none";
  })();

  return {
    targetKind,
    playMode: requiresTargetBinding && targetBinding === "default"
      ? "immediate"
      : getAbilityPlayMode(targetKind),
    requiresTargetBinding,
    requiresManualTarget: requiresTargetBinding && targetBinding === "manual",
    usesDefaultTarget: requiresTargetBinding && targetBinding === "default",
    hasPetTarget,
    targetsSelf,
    targetsAllEnemies,
    targetsAllAllies
  };
};

export const getEffectSummaries = (effects: readonly EffectDefinition[]): readonly EffectSummary[] =>
  effects.map((effectDefinition) => ({
    type: effectDefinition.type,
    ...("amount" in effectDefinition ? { amount: effectDefinition.amount } : {}),
    ...("cardId" in effectDefinition ? { cardId: effectDefinition.cardId } : {}),
    ...("to" in effectDefinition ? { to: effectDefinition.to } : {}),
    ...("target" in effectDefinition ? { combatantTarget: effectDefinition.target.type } : {}),
    ...("petTarget" in effectDefinition ? { petTarget: effectDefinition.petTarget.type } : {}),
    ...("statusId" in effectDefinition && effectDefinition.statusId !== undefined ? { statusId: effectDefinition.statusId } : {}),
    ...("stacks" in effectDefinition && effectDefinition.stacks !== undefined ? { stacks: effectDefinition.stacks } : {}),
    ...("duration" in effectDefinition && effectDefinition.duration !== undefined ? { duration: effectDefinition.duration } : {}),
    ...("tagsAny" in effectDefinition && effectDefinition.tagsAny !== undefined ? { tagsAny: effectDefinition.tagsAny } : {}),
    ...("flagId" in effectDefinition ? { flagId: effectDefinition.flagId } : {}),
    ...("reaction" in effectDefinition ? { reaction: effectDefinition.reaction } : {})
  }));
