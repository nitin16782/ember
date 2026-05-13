import { describe, expect, it } from "vitest";
import { computeDailySummary, SummaryInput } from "./summary";
import { PropertyGeofenceConfig, ShiftEvent, ShiftEventType } from "./types";

const PERSON = "person-1";
const PROPERTY_ID = "prop-1";
const DATE = "2026-05-13";

function property(min = 360, overrides: Partial<PropertyGeofenceConfig> = {}): PropertyGeofenceConfig {
  return {
    propertyId: PROPERTY_ID,
    latitude: 12.971599,
    longitude: 77.594566,
    radiusMeters: 100,
    lenient: false,
    weeklyOffDays: null,
    minimumDailyWorkMinutes: min,
    ...overrides,
  };
}

function event(
  type: ShiftEventType,
  hhmm: string,
  overrides: Partial<ShiftEvent> = {}
): ShiftEvent {
  const eventAt = new Date(`${DATE}T${hhmm}:00Z`);
  return {
    id: `evt-${hhmm}-${type}`,
    personId: PERSON,
    propertyId: PROPERTY_ID,
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

function input(overrides: Partial<SummaryInput> = {}): SummaryInput {
  return {
    personId: PERSON,
    date: DATE,
    events: [],
    property: property(),
    isOnApprovedLeave: false,
    leaveApplicationId: null,
    isDeclaredHoliday: false,
    isWeeklyOff: false,
    ...overrides,
  };
}

describe("computeDailySummary", () => {
  it("no events → status absent, all zeros", () => {
    const r = computeDailySummary(input());
    expect(r.status).toBe("absent");
    expect(r.totalMinutes).toBe(0);
    expect(r.breakMinutes).toBe(0);
    expect(r.netWorkMinutes).toBe(0);
    expect(r.shiftCount).toBe(0);
    expect(r.breakCount).toBe(0);
    expect(r.firstCheckInAt).toBeNull();
    expect(r.lastCheckOutAt).toBeNull();
    expect(r.anomalyCodes).toEqual([]);
    expect(r.hasAnomalies).toBe(false);
  });

  it("approved leave with no events → status leave, leaveApplicationId set", () => {
    const r = computeDailySummary(input({ isOnApprovedLeave: true, leaveApplicationId: "leave-7" }));
    expect(r.status).toBe("leave");
    expect(r.leaveApplicationId).toBe("leave-7");
    expect(r.netWorkMinutes).toBe(0);
  });

  it("declared holiday → status holiday regardless of events", () => {
    const events = [event("check_in", "09:00"), event("check_out", "17:00")];
    const r = computeDailySummary(input({ events, isDeclaredHoliday: true }));
    expect(r.status).toBe("holiday");
    expect(r.totalMinutes).toBe(0);
    expect(r.netWorkMinutes).toBe(0);
  });

  it("weekly off → status weekly_off", () => {
    const r = computeDailySummary(input({ isWeeklyOff: true }));
    expect(r.status).toBe("weekly_off");
    expect(r.totalMinutes).toBe(0);
  });

  it("check_in 9 → check_out 17, no breaks → present, 480 total, 480 net", () => {
    const events = [event("check_in", "09:00"), event("check_out", "17:00")];
    const r = computeDailySummary(input({ events }));
    expect(r.status).toBe("present");
    expect(r.totalMinutes).toBe(480);
    expect(r.breakMinutes).toBe(0);
    expect(r.netWorkMinutes).toBe(480);
    expect(r.shiftCount).toBe(1);
    expect(r.breakCount).toBe(0);
    expect(r.anomalyCodes).toEqual([]);
  });

  it("full cycle with one 30-min break → present, 480 total, 30 break, 450 net", () => {
    const events = [
      event("check_in", "09:00"),
      event("break_start", "13:00"),
      event("break_end", "13:30"),
      event("check_out", "17:00"),
    ];
    const r = computeDailySummary(input({ events }));
    expect(r.status).toBe("present");
    expect(r.totalMinutes).toBe(480);
    expect(r.breakMinutes).toBe(30);
    expect(r.netWorkMinutes).toBe(450);
    expect(r.breakCount).toBe(1);
    expect(r.anomalyCodes).toEqual([]);
  });

  it("two breaks totalling 60 minutes are summed correctly", () => {
    const events = [
      event("check_in", "09:00"),
      event("break_start", "11:00"),
      event("break_end", "11:30"),
      event("break_start", "14:00"),
      event("break_end", "14:30"),
      event("check_out", "17:00"),
    ];
    const r = computeDailySummary(input({ events }));
    expect(r.breakMinutes).toBe(60);
    expect(r.breakCount).toBe(2);
    expect(r.netWorkMinutes).toBe(420);
  });

  it("check_in but no check_out → missed_checkout anomaly, last event used as effective checkout", () => {
    const events = [event("check_in", "09:00"), event("break_start", "13:00"), event("break_end", "13:30")];
    const r = computeDailySummary(input({ events }));
    expect(r.anomalyCodes).toContain("missed_checkout");
    expect(r.lastCheckOutAt).toBeNull();
    expect(r.totalMinutes).toBe(270);
    expect(r.breakMinutes).toBe(30);
    expect(r.netWorkMinutes).toBe(240);
  });

  it("break_start with no break_end → missing_break_end anomaly, break counted to last event", () => {
    const events = [
      event("check_in", "09:00"),
      event("break_start", "13:00"),
      event("check_out", "17:00"),
    ];
    const r = computeDailySummary(input({ events }));
    expect(r.anomalyCodes).toContain("missing_break_end");
    expect(r.totalMinutes).toBe(480);
    expect(r.breakMinutes).toBe(240);
    expect(r.netWorkMinutes).toBe(240);
  });

  it("net work 300 min with minimum 360 → partial, below_minimum_hours anomaly", () => {
    const events = [event("check_in", "09:00"), event("check_out", "14:00")];
    const r = computeDailySummary(input({ events, property: property(360) }));
    expect(r.netWorkMinutes).toBe(300);
    expect(r.status).toBe("partial");
    expect(r.anomalyCodes).toContain("below_minimum_hours");
  });

  it("event with withinGeofence=false → geofence_violation anomaly and counter", () => {
    const events = [
      event("check_in", "09:00", { withinGeofence: false, geofenceDistanceMeters: 250 }),
      event("check_out", "17:00"),
    ];
    const r = computeDailySummary(input({ events }));
    expect(r.hasGeofenceViolation).toBe(true);
    expect(r.geofenceViolationCount).toBe(1);
    expect(r.anomalyCodes).toContain("geofence_violation");
  });

  it("event with markedBy set → marked_on_behalf anomaly", () => {
    const events = [
      event("check_in", "09:00", { markedBy: "supervisor-1" }),
      event("check_out", "17:00"),
    ];
    const r = computeDailySummary(input({ events }));
    expect(r.anomalyCodes).toContain("marked_on_behalf");
  });

  it("event with edited=true → manual_edit anomaly", () => {
    const events = [
      event("check_in", "09:00", { edited: true, editedBy: "supervisor-1" }),
      event("check_out", "17:00"),
    ];
    const r = computeDailySummary(input({ events }));
    expect(r.anomalyCodes).toContain("manual_edit");
  });

  it("mixed: short day with missed checkout and marked-on-behalf → multiple anomalies", () => {
    const events = [
      event("check_in", "10:00", { markedBy: "supervisor-1" }),
      event("break_start", "13:00"),
    ];
    const r = computeDailySummary(input({ events, property: property(360) }));
    expect(r.anomalyCodes).toContain("missed_checkout");
    expect(r.anomalyCodes).toContain("missing_break_end");
    expect(r.anomalyCodes).toContain("marked_on_behalf");
    expect(r.anomalyCodes).toContain("below_minimum_hours");
    expect(r.status).toBe("partial");
  });

  it("anomalyCodes are deduplicated across multiple offending events", () => {
    const events = [
      event("check_in", "09:00", { withinGeofence: false, geofenceDistanceMeters: 200 }),
      event("break_start", "13:00", { withinGeofence: false, geofenceDistanceMeters: 210 }),
      event("break_end", "13:30", { withinGeofence: false, geofenceDistanceMeters: 220 }),
      event("check_out", "17:00"),
    ];
    const r = computeDailySummary(input({ events }));
    const geofenceOccurrences = r.anomalyCodes.filter((c) => c === "geofence_violation").length;
    expect(geofenceOccurrences).toBe(1);
    expect(r.geofenceViolationCount).toBe(3);
  });
});
