import { ShiftEvent, ShiftEventInput, ShiftEventType, ValidationResult } from "./types";

const ONE_MINUTE_MS = 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const DUPLICATE_WINDOW_MS = 60 * 1000;

export function getCurrentState(events: ShiftEvent[]): {
  isCheckedIn: boolean;
  isOnBreak: boolean;
  lastEventType: ShiftEventType | null;
  lastEventAt: Date | null;
} {
  let isCheckedIn = false;
  let isOnBreak = false;
  let lastEventType: ShiftEventType | null = null;
  let lastEventAt: Date | null = null;

  for (const e of events) {
    lastEventType = e.eventType;
    lastEventAt = e.eventAt;
    switch (e.eventType) {
      case "check_in":
        isCheckedIn = true;
        isOnBreak = false;
        break;
      case "check_out":
        isCheckedIn = false;
        isOnBreak = false;
        break;
      case "break_start":
        isOnBreak = true;
        break;
      case "break_end":
        isOnBreak = false;
        break;
    }
  }

  return { isCheckedIn, isOnBreak, lastEventType, lastEventAt };
}

export function validateShiftEvent(
  candidate: ShiftEventInput,
  recentEvents: ShiftEvent[],
  now: Date = new Date()
): ValidationResult {
  if (candidate.eventAt.getTime() > now.getTime() + ONE_MINUTE_MS) {
    return { ok: false, code: "future_event", reason: "Event time is in the future" };
  }

  const isSupervisorOverride = Boolean(candidate.markedBy);
  if (!isSupervisorOverride && candidate.eventAt.getTime() < now.getTime() - ONE_DAY_MS) {
    return {
      ok: false,
      code: "too_far_in_past",
      reason: "Event more than 24 hours in the past requires supervisor override",
    };
  }

  for (const e of recentEvents) {
    if (e.eventType !== candidate.eventType) continue;
    const diff = Math.abs(candidate.eventAt.getTime() - e.eventAt.getTime());
    if (diff < DUPLICATE_WINDOW_MS) {
      return {
        ok: false,
        code: "duplicate_event",
        reason: "An event of the same type was recorded less than 60 seconds ago",
      };
    }
  }

  const state = getCurrentState(recentEvents);

  switch (candidate.eventType) {
    case "check_in":
      if (state.isCheckedIn) {
        return { ok: false, code: "already_checked_in", reason: "Person is already checked in" };
      }
      return { ok: true };
    case "check_out":
      if (!state.isCheckedIn) {
        return { ok: false, code: "no_active_check_in", reason: "Cannot check out without an active check-in" };
      }
      if (state.isOnBreak) {
        return { ok: false, code: "must_end_break_first", reason: "End the current break before checking out" };
      }
      return { ok: true };
    case "break_start":
      if (!state.isCheckedIn) {
        return { ok: false, code: "no_active_check_in", reason: "Cannot start a break without an active check-in" };
      }
      if (state.isOnBreak) {
        return { ok: false, code: "already_on_break", reason: "A break is already in progress" };
      }
      return { ok: true };
    case "break_end":
      if (!state.isOnBreak) {
        return { ok: false, code: "no_active_break", reason: "Cannot end a break without an active break_start" };
      }
      return { ok: true };
  }
}
