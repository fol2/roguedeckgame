export const COMBAT_PLACEHOLDER_COLOURS = {
  background: 0x151923,
  panel: 0x10151f,
  panelStroke: 0x5f6f89,
  commandThread: 0xffb35b,
  commandMarker: 0xffd166,
  impact: 0xff758f,
  shield: 0x7dd3fc,
  status: 0xffd166,
  muted: 0xaab4c5
} as const;

export const COMBAT_TARGET_RING_TOKENS = {
  base: { strokeWidth: 1, alpha: 0.2, pulseScale: 1, colour: 0x7b8495 },
  valid: { strokeWidth: 2, alpha: 0.42, pulseScale: 1.02, colour: 0xffb35b },
  focused: { strokeWidth: 2, alpha: 0.58, pulseScale: 1.04, colour: 0xffd166 },
  hovered: { strokeWidth: 3, alpha: 0.76, pulseScale: 1.07, colour: 0xffd166 },
  submitted: { strokeWidth: 4, alpha: 0.86, pulseScale: 1.1, colour: 0xffe0a3 },
  impact: { strokeWidth: 5, alpha: 0.95, pulseScale: 1.16, colour: 0xff758f },
  invalid: { strokeWidth: 2, alpha: 0.35, pulseScale: 1, colour: 0x687386 }
} as const;

export const COMBAT_COMMAND_LINE_TOKENS = {
  hover: { width: 2, alpha: 0.32, markerRadius: 5, markerAlpha: 0.6 },
  selected: { width: 3, alpha: 0.68, markerRadius: 5, markerAlpha: 0.92 },
  resolving: { width: 4, alpha: 0.9, markerRadius: 8, markerAlpha: 0.92 },
  curveSampleCount: 18,
  controlLift: 84
} as const;

export const COMBAT_ANIMATION_DURATIONS = {
  eventFxMs: 170,
  popupFloatDistance: 24
} as const;
