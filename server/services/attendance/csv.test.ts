import { describe, expect, it } from "vitest";
import {
  escapeCsvField,
  summariesToCsv,
  minutesToDecimalHours,
  formatTimeHHMM,
  type CsvRow,
} from "./csv";

function row(overrides: Partial<CsvRow> = {}): CsvRow {
  return {
    personName: "Test User",
    employeeId: "EMP1",
    role: "housekeeping",
    propertyName: "Sample Villa",
    date: "2026-05-13",
    status: "present",
    firstCheckIn: "09:00",
    lastCheckOut: "17:00",
    totalHours: "8.00",
    breakHours: "0.50",
    netWorkHours: "7.50",
    anomalies: "",
    geofenceViolations: 0,
    editedEvents: 0,
    markedOnBehalfEvents: 0,
    ...overrides,
  };
}

describe("escapeCsvField", () => {
  it("returns plain strings unchanged when safe", () => {
    expect(escapeCsvField("simple")).toBe("simple");
    expect(escapeCsvField(42)).toBe("42");
  });
  it("returns empty string for null and undefined", () => {
    expect(escapeCsvField(null)).toBe("");
    expect(escapeCsvField(undefined)).toBe("");
  });
  it("wraps and escapes when value contains commas", () => {
    expect(escapeCsvField("Doe, John")).toBe('"Doe, John"');
  });
  it("doubles embedded quotes and wraps the field", () => {
    expect(escapeCsvField('She said "hi"')).toBe('"She said ""hi"""');
  });
  it("wraps when the value contains a newline", () => {
    expect(escapeCsvField("line1\nline2")).toBe('"line1\nline2"');
    expect(escapeCsvField("line1\r\nline2")).toBe('"line1\r\nline2"');
  });
});

describe("summariesToCsv", () => {
  it("starts with the UTF-8 BOM so Excel auto-detects encoding", () => {
    const csv = summariesToCsv([]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("emits header row in plain English with CRLF terminator", () => {
    const csv = summariesToCsv([]);
    const lines = csv.slice(1).split("\r\n");
    expect(lines[0]).toBe(
      "Name,Employee ID,Role,Property,Date,Status,First check-in,Last check-out,Total hours,Break hours,Net work hours,Anomalies,Geofence violations,Edited events,Marked on behalf events"
    );
  });

  it("emits one row per CsvRow with CRLF separators", () => {
    const csv = summariesToCsv([row(), row({ personName: "Other" })]);
    const lines = csv.slice(1).split("\r\n");
    expect(lines.length).toBeGreaterThanOrEqual(3);
    expect(lines[1]).toContain("Test User");
    expect(lines[2]).toContain("Other");
  });

  it("escapes commas in personName", () => {
    const csv = summariesToCsv([row({ personName: "Doe, John" })]);
    expect(csv).toContain('"Doe, John"');
  });

  it("doubles quotes when present in fields", () => {
    const csv = summariesToCsv([row({ propertyName: 'The "Cove" Villa' })]);
    expect(csv).toContain('"The ""Cove"" Villa"');
  });

  it("includes semicolon-separated anomalies as a single field (no quoting needed)", () => {
    const csv = summariesToCsv([row({ anomalies: "late_arrival; missed_checkout" })]);
    expect(csv).toContain("late_arrival; missed_checkout");
  });

  it("wraps the anomaly field when it contains a comma", () => {
    const csv = summariesToCsv([row({ anomalies: "late_arrival, missed_checkout" })]);
    expect(csv).toContain('"late_arrival, missed_checkout"');
  });

  it("handles zero rows by emitting only the BOM + header + CRLF", () => {
    const csv = summariesToCsv([]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
    expect(csv.split("\r\n").length).toBe(2);
  });
});

describe("minutesToDecimalHours", () => {
  it("formats 480 minutes as 8.00", () => {
    expect(minutesToDecimalHours(480)).toBe("8.00");
  });
  it("formats 30 minutes as 0.50", () => {
    expect(minutesToDecimalHours(30)).toBe("0.50");
  });
  it("formats 493 minutes as 8.22", () => {
    expect(minutesToDecimalHours(493)).toBe("8.22");
  });
  it("returns 0.00 for zero and negative inputs", () => {
    expect(minutesToDecimalHours(0)).toBe("0.00");
    expect(minutesToDecimalHours(-5)).toBe("0.00");
  });
});

describe("formatTimeHHMM", () => {
  it("returns empty string for null", () => {
    expect(formatTimeHHMM(null)).toBe("");
  });
  it("formats a date as HH:MM in local time", () => {
    const d = new Date(2026, 4, 13, 9, 5);
    expect(formatTimeHHMM(d)).toBe("09:05");
  });
});
