import type {
  CardId,
  CombatantId,
  PetInstanceId,
  StatusId,
  StoryFlagId
} from "../ids";
import type { IntentVisibilityExpiry, IntentVisibilityLevel, IntentVisibilitySource, ScopeIntentDepth } from "./combat";
import type { CardPile } from "./event";

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

export type DiscardEffect = {
  readonly type: "discard";
  readonly amount: number;
};

export type ExhaustEffect = {
  readonly type: "exhaust";
  readonly amount: number;
};

export type RetainEffect = {
  readonly type: "retain";
  readonly amount: number;
};

export type CreateCardEffect = {
  readonly type: "createCard";
  readonly cardId: CardId;
  readonly to: CardPile;
};

export type GainEnergyEffect = {
  readonly type: "gainEnergy";
  readonly amount: number;
};

export type ApplyStatusEffect = {
  readonly type: "applyStatus";
  readonly statusId: StatusId;
  readonly stacks: number;
  readonly duration?: number;
  readonly target: CombatantTarget;
};

export type CleanseStatusEffect = {
  readonly type: "cleanseStatus";
  readonly target: CombatantTarget;
  readonly statusId?: StatusId;
  readonly tagsAny?: readonly string[];
  readonly stacks?: number;
};

export type ConsumeStatusEffect = {
  readonly type: "consumeStatus";
  readonly target: CombatantTarget;
  readonly statusId: StatusId;
  readonly stacks?: number;
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

export type ImproveIntentVisibilityEffect = {
  readonly type: "improveIntentVisibility";
  readonly target: CombatantTarget;
  readonly amount: number;
  readonly maxLevel?: IntentVisibilityLevel;
  readonly source?: IntentVisibilitySource;
  readonly expires?: IntentVisibilityExpiry;
};

export type RevealIntentEffect = {
  readonly type: "revealIntent";
  readonly target: CombatantTarget;
  readonly level: IntentVisibilityLevel;
  readonly source?: IntentVisibilitySource;
  readonly expires?: IntentVisibilityExpiry;
};

export type ScopeIntentEffect = {
  readonly type: "scopeIntent";
  readonly target: CombatantTarget;
  readonly depth: ScopeIntentDepth;
  readonly source?: IntentVisibilitySource;
  readonly expires?: IntentVisibilityExpiry;
};

export type ObscureIntentEffect = {
  readonly type: "obscureIntent";
  readonly target: CombatantTarget;
  readonly amount?: number;
  readonly level?: IntentVisibilityLevel;
  readonly source?: IntentVisibilitySource;
  readonly expires?: IntentVisibilityExpiry;
};

export type SetStoryFlagEffect = {
  readonly type: "setStoryFlag";
  readonly flagId: StoryFlagId;
};

export type EffectDefinition =
  | DamageEffect
  | BlockEffect
  | DrawEffect
  | DiscardEffect
  | ExhaustEffect
  | RetainEffect
  | CreateCardEffect
  | GainEnergyEffect
  | ApplyStatusEffect
  | CleanseStatusEffect
  | ConsumeStatusEffect
  | PetAttackEffect
  | PetBlockEffect
  | PetReactEffect
  | ImproveIntentVisibilityEffect
  | RevealIntentEffect
  | ScopeIntentEffect
  | ObscureIntentEffect
  | SetStoryFlagEffect;

export const knownEffectTypes = [
  "damage",
  "block",
  "draw",
  "discard",
  "exhaust",
  "retain",
  "createCard",
  "gainEnergy",
  "applyStatus",
  "cleanseStatus",
  "consumeStatus",
  "petAttack",
  "petBlock",
  "petReact",
  "improveIntentVisibility",
  "revealIntent",
  "scopeIntent",
  "obscureIntent",
  "setStoryFlag"
] as const satisfies readonly EffectDefinition["type"][];
