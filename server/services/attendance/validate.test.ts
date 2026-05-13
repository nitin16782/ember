import { describe, expect, it } from "vitest";
import { getCurrentState, validateShiftEvent } from "./validate";
import { ShiftEvent, ShiftEventInput, ShiftEventType } from "./types";

const PERSON = "person-1";
const PROPERTY = "prop-1";

function event(
  type: ShiftEventType,
  eventAt: Date,
  overrides: Partial<ShiftEvent> = {}
): ShiftEvent {
  return {
    id: `evt-${eventAt.getTime()}-${type}`,
    personId: PERSON,
    propertyId: PROPERTY,
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

function input(
  type: ShiftEventType,
  eventAt: Date,
  overrides: Partial<ShiftEventInput> = {}
): ShiftEventInput {
  return {
    personId: PERSON,
    propertyId: PROPERTY,
    eventType: type,
    eventAt,
    ...overrides,
  };
}

const NOW = new Date("2026-05-13T12:00:00Z");

describe("validateShiftEvent", () => {
  it("allows check_in with no prior events", () => {
    const result = validateShiftEvent(input("check_in", NOW), [], NOW);
    expect(result.ok).toBe(true);
  });

  it("rejects check_in when already checked in", () => {
    const prior = [event("check_in", new Date(NOW.getTime() - 3600_000))];
    const result = validateShiftEvent(input("check_in", NOW), prior, NOW);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("already_checked_in");
  });

  it("rejects check_out without prior check_in", () => {
    const result = validateShiftEvent(input("check_out", NOW), [], NOW);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("no_active_check_in");
  });

  it("rejects check_out while on break", () => {
    const prior = [
      event("check_in", new Date(NOW.getTime() - 7200_000)),
      event("break_start", new Date(NOW.getTime() - 600_000)),
    ];
    const result = validateShiftEvent(input("check_out", NOW), prior, NOW);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("must_end_break_first");
  });

  it("rejects break_start without check_in", () => {
    const result = validateShiftEvent(input("break_start", NOW), [], NOW);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("no_active_check_in");
  });

  it("rejects break_start when already on break", () => {
    const prior = [
      event("check_in", new Date(NOW.getTime() - 7200_000)),
      event("break_start", new Date(NOW.getTime() - 1200_000)),
    ];
    const result = validateShiftEvent(input("break_start", NOW), prior, NOW);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("already_on_break");
  });

  it("rejects break_end without break_start", () => {
    const prior = [event("check_in", new Date(NOW.getTime() - 3600_000))];
    const result = validateShiftEvent(input("break_end", NOW), prior, NOW);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("no_active_break");
  });

  it("rejects duplicate event within 60 seconds", () => {
    const prior = [event("check_in", new Date(NOW.getTime() - 30_000))];
    const result = validateShiftEvent(input("check_in", NOW), prior, NOW);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("duplicate_event");
  });

  it("rejects event 25 hours in the past without markedBy", () => {
    const eventAt = new Date(NOW.getTime() - 25 * 3600_000);
    const result = validateShiftEvent(input("check_in", eventAt), [], NOW);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("too_far_in_past");
  });

  it("allows event 25 hours in the past WITH markedBy (supervisor override)", () => {
    const eventAt = new Date(NOW.getTime() - 25 * 3600_000);
    const result = validateShiftEvent(
      input("check_in", eventAt, { markedBy: "supervisor-1" }),
      [],
      NOW
    );
    expect(result.ok).toBe(true);
  });

  it("rejects event in the future", () => {
    const eventAt = new Date(NOW.getTime() + 10 * 60_000);
    const result = validateShiftEvent(input("check_in", eventAt), [], NOW);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("future_event");
  });

  it("allows a full valid cycle", () => {
    const t0 = new Date(NOW.getTime() - 8 * 3600_000);
    const t1 = new Date(NOW.getTime() - 4 * 3600_000);
    const t2 = new Date(NOW.getTime() - 3.5 * 3600_000);
    const t3 = NOW;

    let history: ShiftEvent[] = [];
    expect(validateShiftEvent(input("check_in", t0), history, NOW).ok).toBe(true);
    history = [...history, event("check_in", t0)];

    expect(validateShiftEvent(input("break_start", t1), history, NOW).ok).toBe(true);
    history = [...history, event("break_start", t1)];

    expect(validateShiftEvent(input("break_end", t2), history, NOW).ok).toBe(true);
    history = [...history, event("break_end", t2)];

    expect(validateShiftEvent(input("check_out", t3), history, NOW).ok).toBe(true);
  });
});

describe("getCurrentState", () => {
  it("returns blank state for empty history", () => {
    const s = getCurrentState([]);
    expect(s).toEqual({
      isCheckedIn: false,
      isOnBreak: false,
      lastEventType: null,
      lastEventAt: null,
    });
  });

  it("reflects checked-in state after check_in", () => {
    const t0 = new Date(NOW.getTime() - 3600_000);
    const s = getCurrentState([event("check_in", t0)]);
    expect(s.isCheckedIn).toBe(true);
    expect(s.isOnBreak).toBe(false);
    expect(s.lastEventType).toBe("check_in");
    expect(s.lastEventAt).toEqual(t0);
  });

  it("reflects on-break state after break_start", () => {
    const t0 = new Date(NOW.getTime() - 3600_000);
    const t1 = new Date(NOW.getTime() - 1200_000);
    const s = getCurrentState([event("check_in", t0), event("break_start", t1)]);
    expect(s.isCheckedIn).toBe(true);
    expect(s.isOnBreak).toBe(true);
    expect(s.lastEventType).toBe("break_start");
  });

  it("clears on-break after break_end", () => {
    const t0 = new Date(NOW.getTime() - 3600_000);
    const t1 = new Date(NOW.getTime() - 1200_000);
    const t2 = new Date(NOW.getTime() - 600_000);
    const s = getCurrentState([
      event("check_in", t0),
      event("break_start", t1),
      event("break_end", t2),
    ]);
    expect(s.isOnBreak).toBe(false);
    expect(s.lastEventType).toBe("break_end");
  });

  it("clears checked-in after check_out", () => {
    const t0 = new Date(NOW.getTime() - 3600_000);
    const t1 = NOW;
    const s = getCurrentState([event("check_in", t0), event("check_out", t1)]);
    expect(s.isCheckedIn).toBe(false);
    expect(s.lastEventType).toBe("check_out");
  });
});
