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
  base: { strokeWidth: 1, strokeColour: 0x7b8495, alpha: 0.2, pulseScale: 1 },
  valid: { strokeWidth: 2, strokeColour: 0xffb35b, alpha: 0.42, pulseScale: 1.02 },
  focused: { strokeWidth: 2, strokeColour: 0xffd166, alpha: 0.58, pulseScale: 1.04 },
  hovered: { strokeWidth: 3, strokeColour: 0xffd166, alpha: 0.76, pulseScale: 1.07 },
  submitted: { strokeWidth: 4, strokeColour: 0xffe0a3, alpha: 0.86, pulseScale: 1.1 },
  impact: { strokeWidth: 5, strokeColour: 0xff758f, alpha: 0.95, pulseScale: 1.16 },
  invalid: { strokeWidth: 2, strokeColour: 0x687386, alpha: 0.35, pulseScale: 1 }
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
