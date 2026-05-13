import {
  AnomalyCode,
  AttendanceStatus,
  DailySummaryComputation,
  PropertyGeofenceConfig,
  ShiftEvent,
} from "./types";

export interface SummaryInput {
  personId: string;
  date: string;
  events: ShiftEvent[];
  property: PropertyGeofenceConfig | null;
  isOnApprovedLeave: boolean;
  leaveApplicationId: string | null;
  isDeclaredHoliday: boolean;
  isWeeklyOff: boolean;
}

const DEFAULT_MIN_WORK_MIN = 360;
const MS_PER_MINUTE = 60_000;

function zeroSummary(
  input: SummaryInput,
  status: AttendanceStatus,
  leaveApplicationId: string | null = null
): DailySummaryComputation {
  return {
    personId: input.personId,
    propertyId: input.property?.propertyId ?? null,
    date: input.date,
    status,
    totalMinutes: 0,
    breakMinutes: 0,
    netWorkMinutes: 0,
    shiftCount: 0,
    breakCount: 0,
    firstCheckInAt: null,
    lastCheckOutAt: null,
    hasGeofenceViolation: false,
    geofenceViolationCount: 0,
    hasAnomalies: false,
    anomalyCodes: [],
    leaveApplicationId,
  };
}

export function computeDailySummary(input: SummaryInput): DailySummaryComputation {
  if (input.isDeclaredHoliday) {
    return zeroSummary(input, "holiday");
  }
  if (input.isWeeklyOff) {
    return zeroSummary(input, "weekly_off");
  }
  if (input.isOnApprovedLeave) {
    return zeroSummary(input, "leave", input.leaveApplicationId);
  }
  if (input.events.length === 0) {
    return zeroSummary(input, "absent");
  }

  const events = [...input.events].sort((a, b) => a.eventAt.getTime() - b.eventAt.getTime());

  const checkIns = events.filter((e) => e.eventType === "check_in");
  const checkOuts = events.filter((e) => e.eventType === "check_out");
  const breakStarts = events.filter((e) => e.eventType === "break_start");

  const firstCheckInAt = checkIns.length ? checkIns[0].eventAt : null;
  const lastCheckOutAt = checkOuts.length ? checkOuts[checkOuts.length - 1].eventAt : null;
  const lastEventAt = events[events.length - 1].eventAt;

  const anomalies = new Set<AnomalyCode>();

  let effectiveCheckOutAt: Date | null = lastCheckOutAt;
  if (firstCheckInAt && !lastCheckOutAt) {
    anomalies.add("missed_checkout");
    effectiveCheckOutAt = lastEventAt;
  }

  let totalMinutes = 0;
  if (firstCheckInAt && effectiveCheckOutAt) {
    totalMinutes = Math.max(
      0,
      Math.round((effectiveCheckOutAt.getTime() - firstCheckInAt.getTime()) / MS_PER_MINUTE)
    );
  }

  let breakMinutes = 0;
  let openBreakStart: Date | null = null;
  for (const e of events) {
    if (e.eventType === "break_start") {
      openBreakStart = e.eventAt;
    } else if (e.eventType === "break_end" && openBreakStart) {
      breakMinutes += Math.max(
        0,
        Math.round((e.eventAt.getTime() - openBreakStart.getTime()) / MS_PER_MINUTE)
      );
      openBreakStart = null;
    }
  }
  if (openBreakStart) {
    anomalies.add("missing_break_end");
    const closeAt = effectiveCheckOutAt ?? lastEventAt;
    breakMinutes += Math.max(
      0,
      Math.round((closeAt.getTime() - openBreakStart.getTime()) / MS_PER_MINUTE)
    );
  }

  const netWorkMinutes = Math.max(0, totalMinutes - breakMinutes);

  const minWork = input.property?.minimumDailyWorkMinutes ?? DEFAULT_MIN_WORK_MIN;
  const status: AttendanceStatus = netWorkMinutes >= minWork ? "present" : "partial";

  if (netWorkMinutes < minWork) {
    anomalies.add("below_minimum_hours");
  }

  let geofenceViolationCount = 0;
  for (const e of events) {
    if (e.withinGeofence === false) {
      geofenceViolationCount += 1;
      anomalies.add("geofence_violation");
    }
    if (e.edited) {
      anomalies.add("manual_edit");
    }
    if (e.markedBy) {
      anomalies.add("marked_on_behalf");
    }
  }

  return {
    personId: input.personId,
    propertyId: input.property?.propertyId ?? null,
    date: input.date,
    status,
    totalMinutes,
    breakMinutes,
    netWorkMinutes,
    shiftCount: checkIns.length,
    breakCount: breakStarts.length,
    firstCheckInAt,
    lastCheckOutAt,
    hasGeofenceViolation: geofenceViolationCount > 0,
    geofenceViolationCount,
    hasAnomalies: anomalies.size > 0,
    anomalyCodes: Array.from(anomalies),
    leaveApplicationId: null,
  };
}
