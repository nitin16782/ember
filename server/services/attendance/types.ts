export type ShiftEventType = "check_in" | "check_out" | "break_start" | "break_end";

export type AttendanceStatus =
  | "present"
  | "partial"
  | "absent"
  | "leave"
  | "holiday"
  | "weekly_off"
  | "absconding";

export type AnomalyCode =
  | "late_arrival"
  | "early_departure"
  | "missed_checkout"
  | "missing_break_end"
  | "geofence_violation"
  | "below_minimum_hours"
  | "duplicate_event"
  | "manual_edit"
  | "marked_on_behalf";

export interface ShiftEventInput {
  personId: string;
  propertyId: string;
  eventType: ShiftEventType;
  eventAt: Date;
  latitude?: number;
  longitude?: number;
  selfieKey?: string;
  markedBy?: string;
  notes?: string;
}

export interface ShiftEvent extends ShiftEventInput {
  id: string;
  withinGeofence: boolean | null;
  geofenceDistanceMeters: number | null;
  edited: boolean;
  editedAt: Date | null;
  editedBy: string | null;
  editReason: string | null;
  createdAt: Date;
}

export interface PropertyGeofenceConfig {
  propertyId: string;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  lenient: boolean;
  weeklyOffDays: number[] | null;
  minimumDailyWorkMinutes: number;
}

export interface DailySummaryComputation {
  personId: string;
  propertyId: string | null;
  date: string;
  status: AttendanceStatus;
  totalMinutes: number;
  breakMinutes: number;
  netWorkMinutes: number;
  shiftCount: number;
  breakCount: number;
  firstCheckInAt: Date | null;
  lastCheckOutAt: Date | null;
  hasGeofenceViolation: boolean;
  geofenceViolationCount: number;
  hasAnomalies: boolean;
  anomalyCodes: AnomalyCode[];
  leaveApplicationId: string | null;
}

export interface ValidationResult {
  ok: boolean;
  reason?: string;
  code?: string;
}
