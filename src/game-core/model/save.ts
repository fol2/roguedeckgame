import type { StoryFlagId } from "../ids";
import type { PetInstance } from "./pet";
import type { RunState } from "./run";

export const SAVE_SCHEMA_VERSION = 1 as const;
export const UNKNOWN_SAVE_CONTENT_VERSION = "unknown" as const;

export type SaveSnapshot = {
  readonly schemaVersion: typeof SAVE_SCHEMA_VERSION;
  readonly contentVersion: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly profileId: string;
  readonly activeRun?: RunState;
  readonly petInstances: readonly PetInstance[];
  readonly globalStoryFlags: readonly StoryFlagId[];
};

export type SaveSlotMetadata = {
  readonly slotId: string;
  readonly updatedAt: string;
  readonly schemaVersion: number;
  readonly contentVersion?: string;
  readonly hasActiveRun: boolean;
};

export type SaveRestoredState = {
  readonly activeRun?: RunState;
  readonly petInstances: readonly PetInstance[];
  readonly globalStoryFlags: readonly StoryFlagId[];
};

export type SaveStore = {
  readonly write: (slotId: string, serializedSnapshot: string) => Promise<void> | void;
  readonly read: (slotId: string) => Promise<string | undefined> | string | undefined;
  readonly delete: (slotId: string) => Promise<void> | void;
  readonly list: () => Promise<readonly SaveSlotMetadata[]> | readonly SaveSlotMetadata[];
};
