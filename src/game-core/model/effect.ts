import type {
  CombatantId,
  PetInstanceId,
  StatusId,
  StoryFlagId
} from "../ids";

export type CombatantTarget =
  | { readonly type: "self" }
  | { readonly type: "target"; readonly combatantId?: CombatantId }
  | { readonly type: "allEnemies" }
  | { readonly type: "allAllies" };

export type PetTarget =
  | { readonly type: "specific"; readonly petInstanceId: PetInstanceId }
  | { readonly type: "leading" }
  | { readonly type: "allActive" }
  | { readonly type: "randomActive" }
  | { readonly type: "withTag"; readonly tag: string };

export type DamageEffect = {
  readonly type: "damage";
  readonly amount: number;
  readonly target: CombatantTarget;
};

export type BlockEffect = {
  readonly type: "block";
  readonly amount: number;
  readonly target: CombatantTarget;
};

export type DrawEffect = {
  readonly type: "draw";
  readonly amount: number;
};

export type ApplyStatusEffect = {
  readonly type: "applyStatus";
  readonly statusId: StatusId;
  readonly stacks: number;
  readonly target: CombatantTarget;
};

export type PetAttackEffect = {
  readonly type: "petAttack";
  readonly petTarget: PetTarget;
  readonly amount: number;
  readonly target: CombatantTarget;
};

export type PetBlockEffect = {
  readonly type: "petBlock";
  readonly petTarget: PetTarget;
  readonly amount: number;
  readonly target: CombatantTarget;
};

export type PetReactEffect = {
  readonly type: "petReact";
  readonly petTarget: PetTarget;
  readonly reaction: string;
};

export type SetStoryFlagEffect = {
  readonly type: "setStoryFlag";
  readonly flagId: StoryFlagId;
};

export type EffectDefinition =
  | DamageEffect
  | BlockEffect
  | DrawEffect
  | ApplyStatusEffect
  | PetAttackEffect
  | PetBlockEffect
  | PetReactEffect
  | SetStoryFlagEffect;

export const knownEffectTypes = [
  "damage",
  "block",
  "draw",
  "applyStatus",
  "petAttack",
  "petBlock",
  "petReact",
  "setStoryFlag"
] as const satisfies readonly EffectDefinition["type"][];
