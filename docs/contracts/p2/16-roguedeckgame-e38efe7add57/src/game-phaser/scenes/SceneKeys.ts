export const SceneKeys = {
  Boot: "BootScene",
  CoreSmoke: "CoreSmokeScene",
  Map: "MapScene",
  Combat: "CombatScene",
  Reward: "RewardScene"
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
