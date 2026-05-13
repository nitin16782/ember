import type { ShiftEventType } from "./offlineQueue";

export type CurrentState = "off" | "on_shift" | "on_break";

export interface ShiftActionsInput {
  currentState: CurrentState;
  canMarkCheckIn: boolean;
  canMarkCheckOut: boolean;
  canMarkBreakStart: boolean;
  canMarkBreakEnd: boolean;
}

export interface ShiftAction {
  label: string;
  eventType: ShiftEventType;
  enabled: boolean;
}

export interface ResolvedShiftActions {
  primary: ShiftAction | null;
  secondary: ShiftAction | null;
}

export function resolveShiftActions(input: ShiftActionsInput): ResolvedShiftActions {
  switch (input.currentState) {
    case "off":
      return {
        primary: { label: "Start shift", eventType: "check_in", enabled: input.canMarkCheckIn },
        secondary: null,
      };
    case "on_shift":
      return {
        primary: { label: "End shift", eventType: "check_out", enabled: input.canMarkCheckOut },
        secondary: { label: "Start break", eventType: "break_start", enabled: input.canMarkBreakStart },
      };
    case "on_break":
      return {
        primary: { label: "End break", eventType: "break_end", enabled: input.canMarkBreakEnd },
        secondary: null,
      };
  }
}

export function statusBadgeText(state: CurrentState, lastEventAt: string | null): string {
  const time = lastEventAt ? formatTime(lastEventAt) : null;
  switch (state) {
    case "off":
      return "Ready to start";
    case "on_shift":
      return time ? `On shift since ${time}` : "On shift";
    case "on_break":
      return time ? `On break since ${time}` : "On break";
  }
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
