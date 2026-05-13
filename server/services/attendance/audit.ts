import { randomUUID } from "crypto";
import { attendanceAuditLog } from "../../../drizzle/schema";

export type AttendanceAuditAction =
  | "mark_event"
  | "mark_event_on_behalf"
  | "request_edit"
  | "approve_edit"
  | "reject_edit"
  | "manual_summary_recompute"
  | "lock_summary";

export interface WriteAuditInput {
  db: any;
  actorUserId: string;
  actorRole: string;
  action: AttendanceAuditAction;
  targetPersonId?: string | null;
  targetEventId?: string | null;
  targetEditRequestId?: string | null;
  targetSummaryId?: string | null;
  payload?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Fire-and-forget audit write. Errors are logged but never re-thrown.
 * Caller does NOT need to await — but await is fine and lets tests check.
 */
export async function writeAudit(input: WriteAuditInput): Promise<void> {
  try {
    if (!input.db) return;
    await input.db.insert(attendanceAuditLog).values({
      id: randomUUID(),
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      action: input.action,
      targetPersonId: input.targetPersonId ?? null,
      targetEventId: input.targetEventId ?? null,
      targetEditRequestId: input.targetEditRequestId ?? null,
      targetSummaryId: input.targetSummaryId ?? null,
      payload: input.payload ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[attendance.writeAudit] failed:", err);
  }
}

export function extractClientInfo(req: {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
} | undefined): { ipAddress: string | null; userAgent: string | null } {
  if (!req) return { ipAddress: null, userAgent: null };
  const ip = req.ip ?? req.socket?.remoteAddress ?? null;
  const uaRaw = req.headers?.["user-agent"];
  const ua = typeof uaRaw === "string" ? uaRaw : Array.isArray(uaRaw) ? uaRaw[0] : null;
  return {
    ipAddress: ip ?? null,
    userAgent: ua ? ua.slice(0, 500) : null,
  };
}
