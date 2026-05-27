import { COMBAT_TARGET_RING_TOKENS } from "../layout/combat-ui-tokens";

export type EnemyTargetVisualState =
  | "hidden"
  | "base"
  | "valid"
  | "hovered"
  | "focused"
  | "submitted"
  | "impact"
  | "invalid";

export type PetCommandVisualState =
  | "active"
  | "command_hover"
  | "command_selected"
  | "resolving"
  | "empowered";

export type CommandLineVisualState =
  | "hidden"
  | "hover"
  | "selected"
  | "resolving";

export type EnemyTargetVisualStateInput = {
  readonly hidden?: boolean;
  readonly invalid?: boolean;
  readonly valid?: boolean;
  readonly hovered?: boolean;
  readonly focused?: boolean;
  readonly submitted?: boolean;
  readonly impact?: boolean;
};

export type EnemyTargetRingStyle = {
  readonly strokeWidth: number;
  readonly strokeColour: number;
  readonly alpha: number;
  readonly pulseScale: number;
};

const ENEMY_TARGET_RING_STYLES: Record<EnemyTargetVisualState, EnemyTargetRingStyle> = {
  hidden: { strokeWidth: 0, strokeColour: 0x000000, alpha: 0, pulseScale: 1 },
  base: {
    strokeWidth: COMBAT_TARGET_RING_TOKENS.base.strokeWidth,
    strokeColour: COMBAT_TARGET_RING_TOKENS.base.colour,
    alpha: COMBAT_TARGET_RING_TOKENS.base.alpha,
    pulseScale: COMBAT_TARGET_RING_TOKENS.base.pulseScale
  },
  valid: {
    strokeWidth: COMBAT_TARGET_RING_TOKENS.valid.strokeWidth,
    strokeColour: COMBAT_TARGET_RING_TOKENS.valid.colour,
    alpha: COMBAT_TARGET_RING_TOKENS.valid.alpha,
    pulseScale: COMBAT_TARGET_RING_TOKENS.valid.pulseScale
  },
  focused: {
    strokeWidth: COMBAT_TARGET_RING_TOKENS.focused.strokeWidth,
    strokeColour: COMBAT_TARGET_RING_TOKENS.focused.colour,
    alpha: COMBAT_TARGET_RING_TOKENS.focused.alpha,
    pulseScale: COMBAT_TARGET_RING_TOKENS.focused.pulseScale
  },
  hovered: {
    strokeWidth: COMBAT_TARGET_RING_TOKENS.hovered.strokeWidth,
    strokeColour: COMBAT_TARGET_RING_TOKENS.hovered.colour,
    alpha: COMBAT_TARGET_RING_TOKENS.hovered.alpha,
    pulseScale: COMBAT_TARGET_RING_TOKENS.hovered.pulseScale
  },
  submitted: {
    strokeWidth: COMBAT_TARGET_RING_TOKENS.submitted.strokeWidth,
    strokeColour: COMBAT_TARGET_RING_TOKENS.submitted.colour,
    alpha: COMBAT_TARGET_RING_TOKENS.submitted.alpha,
    pulseScale: COMBAT_TARGET_RING_TOKENS.submitted.pulseScale
  },
  impact: {
    strokeWidth: COMBAT_TARGET_RING_TOKENS.impact.strokeWidth,
    strokeColour: COMBAT_TARGET_RING_TOKENS.impact.colour,
    alpha: COMBAT_TARGET_RING_TOKENS.impact.alpha,
    pulseScale: COMBAT_TARGET_RING_TOKENS.impact.pulseScale
  },
  invalid: {
    strokeWidth: COMBAT_TARGET_RING_TOKENS.invalid.strokeWidth,
    strokeColour: COMBAT_TARGET_RING_TOKENS.invalid.colour,
    alpha: COMBAT_TARGET_RING_TOKENS.invalid.alpha,
    pulseScale: COMBAT_TARGET_RING_TOKENS.invalid.pulseScale
  }
};

export const resolveEnemyTargetVisualState = ({
  hidden,
  invalid,
  valid,
  hovered,
  focused,
  submitted,
  impact
}: EnemyTargetVisualStateInput): EnemyTargetVisualState => {
  if (hidden) {
    return "hidden";
  }

  if (impact) {
    return "impact";
  }

  if (submitted) {
    return "submitted";
  }

  if (hovered) {
    return "hovered";
  }

  if (focused) {
    return "focused";
  }

  if (valid) {
    return "valid";
  }

  if (invalid) {
    return "invalid";
  }

  return "base";
};

export const getEnemyTargetRingStyle = (state: EnemyTargetVisualState): EnemyTargetRingStyle =>
  ENEMY_TARGET_RING_STYLES[state];
