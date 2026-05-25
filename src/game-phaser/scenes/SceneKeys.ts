export const SceneKeys = {
  Boot: "BootScene",
  CoreSmoke: "CoreSmokeScene"
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
