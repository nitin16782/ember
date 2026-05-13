import { describe, it, expect } from "vitest";
import {
  ANOMALY_LABELS,
  labelForAnomaly,
  ROSTER_STATUS_INFO,
  ROSTER_STATUS_ORDER,
  countStatuses,
  sortRoster,
} from "./anomalyLabels";

describe("ANOMALY_LABELS", () => {
  it("provides plain-English copy for every engine code", () => {
    const expectedCodes = [
      "late_arrival",
      "early_departure",
      "missed_checkout",
      "missing_break_end",
      "geofence_violation",
      "below_minimum_hours",
      "duplicate_event",
      "manual_edit",
      "marked_on_behalf",
    ];
    for (const code of expectedCodes) {
      expect(ANOMALY_LABELS[code]).toBeTruthy();
    }
  });

  it("labelForAnomaly falls back to the raw code on unknown", () => {
    expect(labelForAnomaly("late_arrival")).toBe("Late arrival");
    expect(labelForAnomaly("unmapped_code")).toBe("unmapped_code");
  });
});

describe("ROSTER_STATUS_INFO", () => {
  it("has an entry for each expected status", () => {
    for (const s of ROSTER_STATUS_ORDER) {
      expect(ROSTER_STATUS_INFO[s]).toBeDefined();
      expect(ROSTER_STATUS_INFO[s].label).toBeTruthy();
    }
  });

  it("uses the Firebrick gold for the active-shift chip background", () => {
    expect(ROSTER_STATUS_INFO.checked_in.bg).toMatch(/F2E7C7/);
  });

  it("uses red border for absent", () => {
    expect(ROSTER_STATUS_INFO.absent.border).toMatch(/red/);
  });
});

describe("countStatuses", () => {
  it("counts each status correctly", () => {
    const rows = [
      { status: "checked_in" as const, personName: "A" },
      { status: "checked_in" as const, personName: "B" },
      { status: "on_break" as const, personName: "C" },
      { status: "absent" as const, personName: "D" },
      { status: "on_leave" as const, personName: "E" },
      { status: "checked_out" as const, personName: "F" },
    ];
    const counts = countStatuses(rows);
    expect(counts.checked_in).toBe(2);
    expect(counts.on_break).toBe(1);
    expect(counts.absent).toBe(1);
    expect(counts.on_leave).toBe(1);
    expect(counts.checked_out).toBe(1);
    expect(counts.total).toBe(6);
  });

  it("returns zeros for an empty roster", () => {
    const c = countStatuses([]);
    expect(c.total).toBe(0);
    expect(c.checked_in).toBe(0);
  });

  it("ignores unknown statuses gracefully", () => {
    const c = countStatuses([{ status: "weird_state" }]);
    expect(c.total).toBe(1);
    expect(c.checked_in).toBe(0);
  });
});

describe("sortRoster", () => {
  it("places active statuses first, then by name", () => {
    const rows = [
      { status: "absent", personName: "Zara" },
      { status: "checked_in", personName: "Bea" },
      { status: "on_break", personName: "Charlie" },
      { status: "checked_in", personName: "Aaron" },
      { status: "on_leave", personName: "Daisy" },
    ];
    const sorted = sortRoster(rows);
    expect(sorted.map((r) => r.personName)).toEqual([
      "Aaron",
      "Bea",
      "Charlie",
      "Zara",
      "Daisy",
    ]);
  });
});
