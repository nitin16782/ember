export const ANOMALY_LABELS: Record<string, string> = {
  late_arrival: "Late arrival",
  early_departure: "Early departure",
  missed_checkout: "Missed checkout",
  missing_break_end: "Missing break end",
  geofence_violation: "Geofence violation",
  below_minimum_hours: "Below minimum hours",
  duplicate_event: "Duplicate event",
  manual_edit: "Manually edited",
  marked_on_behalf: "Marked on behalf",
};

export function labelForAnomaly(code: string): string {
  return ANOMALY_LABELS[code] ?? code;
}

export interface RosterStatusInfo {
  label: string;
  bg: string;
  border: string;
  text: string;
}

export type RosterStatus =
  | "checked_in"
  | "on_break"
  | "checked_out"
  | "absent"
  | "on_leave";

export const ROSTER_STATUS_INFO: Record<RosterStatus, RosterStatusInfo> = {
  checked_in: {
    label: "On shift",
    bg: "bg-[#F2E7C7]",
    border: "border-[#7A5C0F]",
    text: "text-[#1A3A5C]",
  },
  on_break: {
    label: "On break",
    bg: "bg-[#F7F3EE]",
    border: "border-[#7A5C0F]",
    text: "text-[#1A3A5C]",
  },
  checked_out: {
    label: "Checked out",
    bg: "bg-white",
    border: "border-[#1A3A5C]",
    text: "text-[#1A3A5C]",
  },
  absent: {
    label: "Absent",
    bg: "bg-white",
    border: "border-red-400",
    text: "text-red-700",
  },
  on_leave: {
    label: "On leave",
    bg: "bg-[#F1EFEC]",
    border: "border-[#5C5C5C]",
    text: "text-[#5C5C5C]",
  },
};

export const ROSTER_STATUS_ORDER: RosterStatus[] = [
  "checked_in",
  "on_break",
  "checked_out",
  "absent",
  "on_leave",
];

export interface RosterRowLike {
  status: string;
  personName: string;
}

export function sortRoster<T extends RosterRowLike>(rows: T[]): T[] {
  const rank: Record<string, number> = {
    checked_in: 0,
    on_break: 1,
    checked_out: 2,
    absent: 3,
    on_leave: 4,
  };
  return [...rows].sort((a, b) => {
    const r = (rank[a.status] ?? 99) - (rank[b.status] ?? 99);
    if (r !== 0) return r;
    return a.personName.localeCompare(b.personName);
  });
}

export interface StatusCounts {
  checked_in: number;
  on_break: number;
  checked_out: number;
  absent: number;
  on_leave: number;
  total: number;
}

export function countStatuses<T extends { status: string }>(rows: T[]): StatusCounts {
  const c: StatusCounts = {
    checked_in: 0,
    on_break: 0,
    checked_out: 0,
    absent: 0,
    on_leave: 0,
    total: rows.length,
  };
  for (const r of rows) {
    if (r.status in c) (c as any)[r.status] += 1;
  }
  return c;
}
