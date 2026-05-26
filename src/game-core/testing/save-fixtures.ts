import { storyFlagId } from "../ids";
import type { SaveSnapshot } from "../model/save";
import { SAVE_SCHEMA_VERSION, UNKNOWN_SAVE_CONTENT_VERSION } from "../model/save";
import { starterRegistry } from "../data/registry";
import { createEmberFoxInstanceFixture } from "./fixtures";
import { createStartedRunFixture } from "./run-fixtures";

export const createSaveSnapshotFixture = (
  overrides: Partial<SaveSnapshot> = {}
): SaveSnapshot => ({
  schemaVersion: SAVE_SCHEMA_VERSION,
  contentVersion: starterRegistry.contentVersion ?? UNKNOWN_SAVE_CONTENT_VERSION,
  createdAt: "2026-05-25T00:00:00.000Z",
  updatedAt: "2026-05-25T00:00:00.000Z",
  profileId: "profile_fixture",
  activeRun: createStartedRunFixture({ status: "map_select" }),
  petInstances: [createEmberFoxInstanceFixture()],
  globalStoryFlags: [storyFlagId("chapter:act1:unlocked")],
  ...overrides
});
