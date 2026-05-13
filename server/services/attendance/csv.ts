export interface CsvRow {
  personName: string;
  employeeId: string;
  role: string;
  propertyName: string;
  date: string;
  status: string;
  firstCheckIn: string;
  lastCheckOut: string;
  totalHours: string;
  breakHours: string;
  netWorkHours: string;
  anomalies: string;
  geofenceViolations: number;
  editedEvents: number;
  markedOnBehalfEvents: number;
}

const HEADERS: Array<{ key: keyof CsvRow; label: string }> = [
  { key: "personName", label: "Name" },
  { key: "employeeId", label: "Employee ID" },
  { key: "role", label: "Role" },
  { key: "propertyName", label: "Property" },
  { key: "date", label: "Date" },
  { key: "status", label: "Status" },
  { key: "firstCheckIn", label: "First check-in" },
  { key: "lastCheckOut", label: "Last check-out" },
  { key: "totalHours", label: "Total hours" },
  { key: "breakHours", label: "Break hours" },
  { key: "netWorkHours", label: "Net work hours" },
  { key: "anomalies", label: "Anomalies" },
  { key: "geofenceViolations", label: "Geofence violations" },
  { key: "editedEvents", label: "Edited events" },
  { key: "markedOnBehalfEvents", label: "Marked on behalf events" },
];

const BOM = "﻿";
const CRLF = "\r\n";

export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "string" ? value : String(value);
  if (str === "") return "";
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function summariesToCsv(rows: CsvRow[]): string {
  const header = HEADERS.map((h) => escapeCsvField(h.label)).join(",");
  const body = rows
    .map((row) =>
      HEADERS.map((h) => escapeCsvField(row[h.key])).join(",")
    )
    .join(CRLF);
  return BOM + header + CRLF + body + (body ? CRLF : "");
}

export function minutesToDecimalHours(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "0.00";
  return (minutes / 60).toFixed(2);
}

export function formatTimeHHMM(d: Date | null): string {
  if (!d) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
