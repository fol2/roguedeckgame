import { describe, expect, it } from "vitest";
import {
  createMemorySaveStore,
  deleteSaveSlot,
  loadFromSlot,
  saveToSlot
} from "../../src/game-core";
import { createSaveSnapshotFixture } from "../../src/game-core/testing/save-fixtures";

describe("save store", () => {
  it("writes, reads, lists, loads, and deletes memory slots", async () => {
    const store = createMemorySaveStore();
    const snapshot = createSaveSnapshotFixture();
    const saved = await saveToSlot(store, "slot_a", snapshot);
    const loaded = await loadFromSlot(store, "slot_a");
    const metadata = await store.list();
    const deleted = await deleteSaveSlot(store, "slot_a");
    const missing = await loadFromSlot(store, "slot_a");

    expect(saved.ok).toBe(true);
    expect(loaded.ok).toBe(true);
    expect(loaded.state).toEqual(snapshot);
    expect(metadata).toEqual([{
      slotId: "slot_a",
      updatedAt: snapshot.updatedAt,
      schemaVersion: snapshot.schemaVersion,
      contentVersion: snapshot.contentVersion,
      hasActiveRun: true
    }]);
    expect(deleted.ok).toBe(true);
    expect(missing.errors[0].code).toBe("missing_save_slot");
  });

  it("returns ok false for corrupt slot data without browser APIs", async () => {
    const store = createMemorySaveStore();
    await store.write("corrupt", "{");

    const loaded = await loadFromSlot(store, "corrupt");

    expect(loaded.ok).toBe(false);
    expect(loaded.errors[0].code).toBe("corrupt_save_slot");
    expect(globalThis.localStorage).toBeUndefined();
  });

  it("returns ok false when store adapters throw or reject", async () => {
    const throwingStore = {
      write: () => {
        throw new Error("write failed");
      },
      read: () => {
        throw new Error("read failed");
      },
      delete: () => {
        throw new Error("delete failed");
      },
      list: () => []
    };
    const rejectingStore = {
      write: async () => {
        throw new Error("write rejected");
      },
      read: async () => {
        throw new Error("read rejected");
      },
      delete: async () => {
        throw new Error("delete rejected");
      },
      list: async () => []
    };

    await expect(saveToSlot(throwingStore, "slot_a", createSaveSnapshotFixture())).resolves.toMatchObject({
      ok: false,
      errors: [{ code: "save_slot_write_failed" }]
    });
    await expect(loadFromSlot(throwingStore, "slot_a")).resolves.toMatchObject({
      ok: false,
      errors: [{ code: "save_slot_read_failed" }]
    });
    await expect(deleteSaveSlot(throwingStore, "slot_a")).resolves.toMatchObject({
      ok: false,
      errors: [{ code: "save_slot_delete_failed" }]
    });
    await expect(saveToSlot(rejectingStore, "slot_a", createSaveSnapshotFixture())).resolves.toMatchObject({
      ok: false,
      errors: [{ code: "save_slot_write_failed" }]
    });
    await expect(loadFromSlot(rejectingStore, "slot_a")).resolves.toMatchObject({
      ok: false,
      errors: [{ code: "save_slot_read_failed" }]
    });
    await expect(deleteSaveSlot(rejectingStore, "slot_a")).resolves.toMatchObject({
      ok: false,
      errors: [{ code: "save_slot_delete_failed" }]
    });
  });
});
