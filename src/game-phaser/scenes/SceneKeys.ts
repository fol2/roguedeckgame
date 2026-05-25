export const SceneKeys = {
  Boot: "BootScene",
  CoreSmoke: "CoreSmokeScene",
  Combat: "CombatScene"
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
