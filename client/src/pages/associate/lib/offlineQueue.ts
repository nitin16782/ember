export type ShiftEventType = "check_in" | "check_out" | "break_start" | "break_end";

export interface QueuedMark {
  id: string;
  eventType: ShiftEventType;
  eventAt: string;
  latitude?: number;
  longitude?: number;
  selfieKey?: string;
  attemptCount: number;
  lastAttemptAt?: string;
  lastError?: string;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const STORAGE_KEY = "ember.attendance.offlineQueue";

function defaultStorage(): StorageLike | null {
  if (typeof globalThis !== "undefined" && (globalThis as any).localStorage) {
    return (globalThis as any).localStorage as StorageLike;
  }
  return null;
}

function readQueue(storage: StorageLike | null): QueuedMark[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(storage: StorageLike | null, queue: QueuedMark[]): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // quota / private mode — silently drop
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `mark-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function queueMark(
  mark: Omit<QueuedMark, "id" | "attemptCount">,
  storage: StorageLike | null = defaultStorage()
): QueuedMark {
  const queue = readQueue(storage);
  const entry: QueuedMark = { ...mark, id: newId(), attemptCount: 0 };
  queue.push(entry);
  writeQueue(storage, queue);
  return entry;
}

export function getQueue(storage: StorageLike | null = defaultStorage()): QueuedMark[] {
  return readQueue(storage);
}

export function removeFromQueue(
  id: string,
  storage: StorageLike | null = defaultStorage()
): void {
  const queue = readQueue(storage).filter((m) => m.id !== id);
  writeQueue(storage, queue);
}

export function incrementAttempt(
  id: string,
  error: string | undefined,
  storage: StorageLike | null = defaultStorage()
): QueuedMark | null {
  const queue = readQueue(storage);
  const idx = queue.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  queue[idx] = {
    ...queue[idx],
    attemptCount: queue[idx].attemptCount + 1,
    lastAttemptAt: new Date().toISOString(),
    lastError: error,
  };
  writeQueue(storage, queue);
  return queue[idx];
}

export function clearQueue(storage: StorageLike | null = defaultStorage()): void {
  if (storage) storage.removeItem(STORAGE_KEY);
}
