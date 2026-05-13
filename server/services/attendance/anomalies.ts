import { ShiftEvent } from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_MINUTE = 60_000;

export interface AbscondingCheckInput {
  personId: string;
  recentEvents: ShiftEvent[];
  consecutiveDaysWithoutEvent: number;
  hasApprovedLeaveInPeriod: boolean;
}

export function checkAbsconding(
  input: AbscondingCheckInput,
  thresholdDays: number = 3,
  now: Date = new Date()
): {
  isAbsconding: boolean;
  daysSinceLastEvent: number;
  lastEventAt: Date | null;
} {
  const lastEventAt = input.recentEvents.length
    ? input.recentEvents.reduce(
        (max, e) => (e.eventAt.getTime() > max.getTime() ? e.eventAt : max),
        input.recentEvents[0].eventAt
      )
    : null;

  const daysSinceLastEvent = lastEventAt
    ? Math.floor((now.getTime() - lastEventAt.getTime()) / MS_PER_DAY)
    : input.consecutiveDaysWithoutEvent;

  const hasRecentCheckIn = input.recentEvents.some((e) => e.eventType === "check_in");

  const isAbsconding =
    hasRecentCheckIn &&
    !input.hasApprovedLeaveInPeriod &&
    input.consecutiveDaysWithoutEvent >= thresholdDays;

  return { isAbsconding, daysSinceLastEvent, lastEventAt };
}

export function detectLateArrival(
  firstCheckInAt: Date | null,
  expectedStartAt: Date | null,
  graceMinutes: number = 15
): number {
  if (!firstCheckInAt || !expectedStartAt) return 0;
  const diffMin = Math.round(
    (firstCheckInAt.getTime() - expectedStartAt.getTime()) / MS_PER_MINUTE
  );
  if (diffMin <= graceMinutes) return 0;
  return diffMin;
}
