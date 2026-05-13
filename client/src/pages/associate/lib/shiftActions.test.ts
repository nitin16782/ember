import { describe, it, expect } from "vitest";
import { resolveShiftActions, formatDuration, statusBadgeText } from "./shiftActions";

describe("resolveShiftActions", () => {
  it("returns Start shift primary and no secondary when off", () => {
    const r = resolveShiftActions({
      currentState: "off",
      canMarkCheckIn: true,
      canMarkCheckOut: false,
      canMarkBreakStart: false,
      canMarkBreakEnd: false,
    });
    expect(r.primary?.label).toBe("Start shift");
    expect(r.primary?.eventType).toBe("check_in");
    expect(r.primary?.enabled).toBe(true);
    expect(r.secondary).toBeNull();
  });

  it("returns End shift primary and Start break secondary when on_shift", () => {
    const r = resolveShiftActions({
      currentState: "on_shift",
      canMarkCheckIn: false,
      canMarkCheckOut: true,
      canMarkBreakStart: true,
      canMarkBreakEnd: false,
    });
    expect(r.primary?.label).toBe("End shift");
    expect(r.primary?.eventType).toBe("check_out");
    expect(r.secondary?.label).toBe("Start break");
    expect(r.secondary?.eventType).toBe("break_start");
  });

  it("returns End break primary and no secondary when on_break", () => {
    const r = resolveShiftActions({
      currentState: "on_break",
      canMarkCheckIn: false,
      canMarkCheckOut: false,
      canMarkBreakStart: false,
      canMarkBreakEnd: true,
    });
    expect(r.primary?.label).toBe("End break");
    expect(r.primary?.eventType).toBe("break_end");
    expect(r.secondary).toBeNull();
  });

  it("reflects disabled state when canMarkX is false", () => {
    const r = resolveShiftActions({
      currentState: "off",
      canMarkCheckIn: false,
      canMarkCheckOut: false,
      canMarkBreakStart: false,
      canMarkBreakEnd: false,
    });
    expect(r.primary?.enabled).toBe(false);
  });
});

describe("formatDuration", () => {
  it("formats 0 minutes as 0m", () => {
    expect(formatDuration(0)).toBe("0m");
  });
  it("formats negative as 0m", () => {
    expect(formatDuration(-5)).toBe("0m");
  });
  it("formats minutes-only", () => {
    expect(formatDuration(45)).toBe("45m");
  });
  it("formats hours-only", () => {
    expect(formatDuration(120)).toBe("2h");
  });
  it("formats hours and minutes", () => {
    expect(formatDuration(263)).toBe("4h 23m");
  });
});

describe("statusBadgeText", () => {
  it("returns Ready to start when off", () => {
    expect(statusBadgeText("off", null)).toBe("Ready to start");
  });
  it("includes the last event time for on_shift", () => {
    const iso = new Date("2026-05-13T03:32:00.000Z").toISOString();
    const text = statusBadgeText("on_shift", iso);
    expect(text).toMatch(/On shift since \d\d:\d\d/);
  });
  it("falls back to bare state label when time is null", () => {
    expect(statusBadgeText("on_break", null)).toBe("On break");
  });
});
