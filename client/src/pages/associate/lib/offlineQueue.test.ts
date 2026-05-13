import { describe, it, expect, beforeEach } from "vitest";
import {
  queueMark,
  getQueue,
  removeFromQueue,
  incrementAttempt,
  clearQueue,
  STORAGE_KEY,
  type StorageLike,
} from "./offlineQueue";

function inMemoryStorage(): StorageLike & { _data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    _data: data,
    getItem: (k) => (data.has(k) ? data.get(k)! : null),
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

describe("offlineQueue", () => {
  let storage: ReturnType<typeof inMemoryStorage>;

  beforeEach(() => {
    storage = inMemoryStorage();
  });

  it("returns an empty list when storage has no key", () => {
    expect(getQueue(storage)).toEqual([]);
  });

  it("adds a queued mark and assigns an id and attemptCount=0", () => {
    const entry = queueMark(
      { eventType: "check_in", eventAt: "2026-05-13T09:00:00Z" },
      storage
    );
    expect(entry.id).toBeTruthy();
    expect(entry.attemptCount).toBe(0);
    expect(getQueue(storage)).toHaveLength(1);
  });

  it("persists queued items between reads", () => {
    queueMark({ eventType: "check_in", eventAt: "2026-05-13T09:00:00Z" }, storage);
    queueMark({ eventType: "check_out", eventAt: "2026-05-13T17:00:00Z" }, storage);
    expect(getQueue(storage)).toHaveLength(2);
  });

  it("removes an entry by id", () => {
    const a = queueMark({ eventType: "check_in", eventAt: "2026-05-13T09:00:00Z" }, storage);
    const b = queueMark({ eventType: "check_out", eventAt: "2026-05-13T17:00:00Z" }, storage);
    removeFromQueue(a.id, storage);
    const remaining = getQueue(storage);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(b.id);
  });

  it("incrementAttempt bumps the count and records error", () => {
    const a = queueMark({ eventType: "check_in", eventAt: "2026-05-13T09:00:00Z" }, storage);
    const updated = incrementAttempt(a.id, "network error", storage);
    expect(updated?.attemptCount).toBe(1);
    expect(updated?.lastError).toBe("network error");
    expect(updated?.lastAttemptAt).toBeTruthy();
  });

  it("incrementAttempt returns null for unknown id", () => {
    expect(incrementAttempt("not-a-real-id", "boom", storage)).toBeNull();
  });

  it("survives corrupted storage gracefully", () => {
    storage.setItem(STORAGE_KEY, "not valid json {");
    expect(getQueue(storage)).toEqual([]);
  });

  it("clearQueue removes all entries", () => {
    queueMark({ eventType: "check_in", eventAt: "2026-05-13T09:00:00Z" }, storage);
    queueMark({ eventType: "check_out", eventAt: "2026-05-13T17:00:00Z" }, storage);
    clearQueue(storage);
    expect(getQueue(storage)).toEqual([]);
  });

  it("preserves selfieKey and coordinates on queued entries", () => {
    queueMark(
      {
        eventType: "check_in",
        eventAt: "2026-05-13T09:00:00Z",
        latitude: 12.97,
        longitude: 77.59,
        selfieKey: "ember/dev/attendance/2026-05/person-1/abc.jpg",
      },
      storage
    );
    const [entry] = getQueue(storage);
    expect(entry.latitude).toBe(12.97);
    expect(entry.longitude).toBe(77.59);
    expect(entry.selfieKey).toContain("abc.jpg");
  });

  it("treats missing storage (null) as a no-op", () => {
    expect(getQueue(null)).toEqual([]);
    expect(() =>
      queueMark({ eventType: "check_in", eventAt: "2026-05-13T09:00:00Z" }, null)
    ).not.toThrow();
    expect(() => removeFromQueue("x", null)).not.toThrow();
    expect(incrementAttempt("x", "y", null)).toBeNull();
    expect(() => clearQueue(null)).not.toThrow();
  });
});
