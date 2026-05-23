import type { AnimationCue } from "../../engine/types";

export interface EffectDefinition {
  cue: AnimationCue;
  duration: number;
  colour: string;
  secondaryColour: string;
  ringRadius: number;
  ringOpacity: number;
  auraRadius: number;
  particleCount: number;
  actorMotion: {
    x: number;
    y: number;
    z: number;
    rotationY: number;
  };
}

export interface SampledActorMotion {
  position: [number, number, number];
  rotationY: number;
}

export const EFFECT_LIBRARY: Record<AnimationCue, EffectDefinition> = {
  attack: {
    cue: "attack",
    duration: 0.48,
    colour: "#ffd36f",
    secondaryColour: "#f08a42",
    ringRadius: 0.82,
    ringOpacity: 0.58,
    auraRadius: 0.56,
    particleCount: 7,
    actorMotion: { x: 0.2, y: 0.02, z: 0, rotationY: -0.08 },
  },
  "super-attack": {
    cue: "super-attack",
    duration: 0.68,
    colour: "#ff7868",
    secondaryColour: "#ffd36f",
    ringRadius: 1.18,
    ringOpacity: 0.72,
    auraRadius: 0.78,
    particleCount: 12,
    actorMotion: { x: 0.34, y: 0.04, z: 0, rotationY: -0.14 },
  },
  defend: {
    cue: "defend",
    duration: 0.55,
    colour: "#8ec8ff",
    secondaryColour: "#d9edff",
    ringRadius: 0.92,
    ringOpacity: 0.5,
    auraRadius: 0.64,
    particleCount: 6,
    actorMotion: { x: -0.06, y: 0, z: 0, rotationY: 0.05 },
  },
  heal: {
    cue: "heal",
    duration: 0.8,
    colour: "#94ffb8",
    secondaryColour: "#e0ffe9",
    ringRadius: 0.86,
    ringOpacity: 0.56,
    auraRadius: 0.7,
    particleCount: 10,
    actorMotion: { x: 0, y: 0.12, z: 0, rotationY: 0 },
  },
  shield: {
    cue: "shield",
    duration: 0.64,
    colour: "#6fb7ff",
    secondaryColour: "#d9edff",
    ringRadius: 1,
    ringOpacity: 0.62,
    auraRadius: 0.76,
    particleCount: 8,
    actorMotion: { x: -0.04, y: 0.02, z: 0, rotationY: 0.04 },
  },
  action: {
    cue: "action",
    duration: 0.52,
    colour: "#f3df86",
    secondaryColour: "#fff5c2",
    ringRadius: 0.82,
    ringOpacity: 0.44,
    auraRadius: 0.58,
    particleCount: 6,
    actorMotion: { x: 0, y: 0.08, z: 0, rotationY: 0 },
  },
  repeat: {
    cue: "repeat",
    duration: 0.72,
    colour: "#c0a6ff",
    secondaryColour: "#f0e8ff",
    ringRadius: 1.05,
    ringOpacity: 0.58,
    auraRadius: 0.68,
    particleCount: 9,
    actorMotion: { x: 0, y: 0.06, z: 0, rotationY: 0.12 },
  },
  destroy: {
    cue: "destroy",
    duration: 0.58,
    colour: "#ff8d7e",
    secondaryColour: "#ffd2c9",
    ringRadius: 0.94,
    ringOpacity: 0.58,
    auraRadius: 0.62,
    particleCount: 10,
    actorMotion: { x: -0.1, y: 0.02, z: 0, rotationY: 0.09 },
  },
};

export function getEffectDefinition(cue?: AnimationCue): EffectDefinition | undefined {
  return cue ? EFFECT_LIBRARY[cue] : undefined;
}

export function sampleActorMotion(
  cue: AnimationCue | undefined,
  progress: number,
  sideSign: number,
): SampledActorMotion {
  const effect = getEffectDefinition(cue);

  if (!effect) {
    return { position: [0, 0, 0], rotationY: 0 };
  }

  const shaped = Math.sin(Math.min(Math.max(progress, 0), 1) * Math.PI);

  return {
    position: [
      effect.actorMotion.x * shaped * sideSign,
      effect.actorMotion.y * shaped,
      effect.actorMotion.z * shaped,
    ],
    rotationY: effect.actorMotion.rotationY * shaped * sideSign,
  };
}
