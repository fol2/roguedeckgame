import type { EncounterId, MonsterId } from "../ids";

export type EncounterType = "combat" | "elite" | "boss";

export type EncounterDefinition = {
  readonly id: EncounterId;
  readonly type: EncounterType;
  readonly name: string;
  readonly monsterIds: readonly MonsterId[];
  readonly tags: readonly string[];
  readonly rewardSeedSalt?: string;
};
