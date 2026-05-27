import type { EncounterId, MonsterGroupId, MonsterId, RewardPoolId } from "../ids";

export type EncounterType = "combat" | "elite" | "boss";

export type EncounterDifficultyBand = "tutorial" | "easy" | "normal" | "hard" | "elite" | "boss";

export type EncounterMonsterGroupDefinition = {
  readonly id: MonsterGroupId;
  readonly monsterIds: readonly MonsterId[];
  readonly roles: readonly string[];
  readonly minCount?: number;
  readonly maxCount?: number;
};

export type EncounterAuthoringMetadata = {
  readonly actId?: string;
  readonly difficultyBand: EncounterDifficultyBand;
  readonly budget: number;
  readonly minPlayerLevel?: number;
  readonly monsterRoles: readonly string[];
  readonly monsterGroups: readonly EncounterMonsterGroupDefinition[];
  readonly rewardPoolId: RewardPoolId;
};

export type EncounterDefinition = {
  readonly id: EncounterId;
  readonly type: EncounterType;
  readonly name: string;
  readonly monsterIds: readonly MonsterId[];
  readonly tags: readonly string[];
  readonly rewardSeedSalt?: string;
  readonly authoring?: EncounterAuthoringMetadata;
};
