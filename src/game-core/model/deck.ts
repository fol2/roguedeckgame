import type { CardId, DeckId, PlayerClassId } from "../ids";

export type DeckUnlockRequirementDefinition = {
  readonly type: string;
  readonly [key: string]: unknown;
};

export type StarterDeckDefinition = {
  readonly id: DeckId;
  readonly name: string;
  readonly ownerPlayerClassId: PlayerClassId;
  readonly cardIds: readonly CardId[];
  readonly tags: readonly string[];
  readonly authoringNotes?: string;
  readonly unlockRequirements?: readonly DeckUnlockRequirementDefinition[];
};

export type DeckDefinition = StarterDeckDefinition;
