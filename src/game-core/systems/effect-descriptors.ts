import type { EffectDefinition } from "../model/effect";

export type EffectResolverKey =
  | "damageLike"
  | "blockLike"
  | "draw"
  | "applyStatus"
  | "petReact"
  | "storyFlag";

export type EffectCombatantTargetRequirement = "none" | "required";
export type EffectPetTargetRequirement = "none" | "required";
export type EffectAmountRequirement = "none" | "nonNegativeNumber" | "nonNegativeInteger";

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
