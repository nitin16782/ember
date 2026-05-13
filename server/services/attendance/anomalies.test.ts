import { describe, expect, it } from "vitest";
import { checkAbsconding, detectLateArrival } from "./anomalies";
import { ShiftEvent, ShiftEventType } from "./types";

const NOW = new Date("2026-05-13T12:00:00Z");

function event(type: ShiftEventType, eventAt: Date, overrides: Partial<ShiftEvent> = {}): ShiftEvent {
  return {
    id: `evt-${eventAt.getTime()}-${type}`,
    personId: "person-1",
    propertyId: "prop-1",
    eventType: type,
    eventAt,
    withinGeofence: true,
    geofenceDistanceMeters: 0,
    edited: false,
    editedAt: null,
    editedBy: null,
    editReason: null,
    createdAt: eventAt,
    ...overrides,
  };
}

describe("checkAbsconding", () => {
  it("flags as absconding when 5 consecutive days without events and not on leave", () => {
    const lastEvent = new Date(NOW.getTime() - 5 * 24 * 3600_000);
    const r = checkAbsconding(
      {
        personId: "person-1",
        recentEvents: [event("check_in", lastEvent), event("check_out", new Date(lastEvent.getTime() + 8 * 3600_000))],
        consecutiveDaysWithoutEvent: 5,
        hasApprovedLeaveInPeriod: false,
      },
      3,
      NOW
    );
    expect(r.isAbsconding).toBe(true);
    expect(r.daysSinceLastEvent).toBeGreaterThanOrEqual(4);
  });

  it("does not flag when person has an event yesterday", () => {
    const yesterday = new Date(NOW.getTime() - 1 * 24 * 3600_000);
    const r = checkAbsconding(
      {
        personId: "person-1",
        recentEvents: [event("check_in", yesterday)],
        consecutiveDaysWithoutEvent: 0,
        hasApprovedLeaveInPeriod: false,
      },
      3,
      NOW
    );
    expect(r.isAbsconding).toBe(false);
  });

  it("does not flag when person is on approved leave for the missing days", () => {
    const lastEvent = new Date(NOW.getTime() - 10 * 24 * 3600_000);
    const r = checkAbsconding(
      {
        personId: "person-1",
        recentEvents: [event("check_in", lastEvent)],
        consecutiveDaysWithoutEvent: 10,
        hasApprovedLeaveInPeriod: true,
      },
      3,
      NOW
    );
    expect(r.isAbsconding).toBe(false);
  });

  it("does not flag at exactly 2 consecutive days with threshold 3", () => {
    const r = checkAbsconding(
      {
        personId: "person-1",
        recentEvents: [event("check_in", new Date(NOW.getTime() - 2 * 24 * 3600_000))],
        consecutiveDaysWithoutEvent: 2,
        hasApprovedLeaveInPeriod: false,
      },
      3,
      NOW
    );
    expect(r.isAbsconding).toBe(false);
  });

  it("flags at exactly 3 consecutive days with threshold 3", () => {
    const r = checkAbsconding(
      {
        personId: "person-1",
        recentEvents: [event("check_in", new Date(NOW.getTime() - 3 * 24 * 3600_000))],
        consecutiveDaysWithoutEvent: 3,
        hasApprovedLeaveInPeriod: false,
      },
      3,
      NOW
    );
    expect(r.isAbsconding).toBe(true);
  });

  it("does not flag a person who has never checked in (not yet 'active')", () => {
    const r = checkAbsconding(
      {
        personId: "person-1",
        recentEvents: [],
        consecutiveDaysWithoutEvent: 10,
        hasApprovedLeaveInPeriod: false,
      },
      3,
      NOW
    );
    expect(r.isAbsconding).toBe(false);
    expect(r.lastEventAt).toBeNull();
  });
});

describe("detectLateArrival", () => {
  it("returns 0 when within grace window", () => {
    const expected = new Date("2026-05-13T09:00:00Z");
    const checkIn = new Date("2026-05-13T09:14:00Z");
    expect(detectLateArrival(checkIn, expected, 15)).toBe(0);
  });

  it("returns minutes late when beyond grace window", () => {
    const expected = new Date("2026-05-13T09:00:00Z");
    const checkIn = new Date("2026-05-13T09:30:00Z");
    expect(detectLateArrival(checkIn, expected, 15)).toBe(30);
  });

  it("returns 0 when no expected start time given", () => {
    const checkIn = new Date("2026-05-13T09:30:00Z");
    expect(detectLateArrival(checkIn, null, 15)).toBe(0);
  });

  it("returns 0 when no check-in time given", () => {
    const expected = new Date("2026-05-13T09:00:00Z");
    expect(detectLateArrival(null, expected, 15)).toBe(0);
  });

  it("returns 0 for arrivals before expected start", () => {
    const expected = new Date("2026-05-13T09:00:00Z");
    const checkIn = new Date("2026-05-13T08:30:00Z");
    expect(detectLateArrival(checkIn, expected, 15)).toBe(0);
  });
});
