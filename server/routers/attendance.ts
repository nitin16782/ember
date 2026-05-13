import { randomUUID } from "crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gte, lte, lt, inArray } from "drizzle-orm";
import { router, protectedProcedure, rolesProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  users,
  people,
  properties,
  assignments,
  shiftEvents,
  leaveApplications,
  dailySummaries,
  attendanceEditRequests,
  type Person,
} from "../../drizzle/schema";
import {
  validateShiftEvent,
  getCurrentState,
  checkGeofence,
  computeDailySummary,
  type ShiftEvent as EngineShiftEvent,
  type ShiftEventInput,
  type PropertyGeofenceConfig,
  type ShiftEventType,
} from "../services/attendance";
import { writeAudit, extractClientInfo } from "../services/attendance/audit";
import {
  summariesToCsv,
  minutesToDecimalHours,
  formatTimeHHMM,
  type CsvRow,
} from "../services/attendance/csv";
import { attendanceAuditLog } from "../../drizzle/schema";

const MARK_ROLES = [
  "associate",
  "supervisor",
  "property_manager",
  "ops_lead",
  "central_admin",
  "super_admin",
] as const;
const SUPERVISOR_ROLES = [
  "supervisor",
  "property_manager",
  "ops_lead",
  "central_admin",
  "super_admin",
] as const;
const GLOBAL_ROLES = ["ops_lead", "central_admin", "super_admin"];

const isoUuid = z.string().uuid();
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// ─── Helpers ─────────────────────────────────────────────────────────

function istDateString(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

const IST_OFFSET_MIN = 330;

function istDayBoundsUtc(date: string): { startUtc: Date; endUtc: Date } {
  const [y, m, d] = date.split("-").map(Number);
  const startUtcMs = Date.UTC(y, m - 1, d, 0, 0, 0) - IST_OFFSET_MIN * 60_000;
  const endUtcMs = startUtcMs + 24 * 60 * 60_000;
  return { startUtc: new Date(startUtcMs), endUtc: new Date(endUtcMs) };
}

function dbEventToEngineEvent(
  ev: typeof shiftEvents.$inferSelect,
  selfUserId: string | null
): EngineShiftEvent {
  return {
    id: ev.id,
    personId: ev.personId,
    propertyId: ev.propertyId ?? "",
    eventType: ev.eventType,
    eventAt: ev.occurredAt,
    latitude: ev.gpsLat ? Number(ev.gpsLat) : undefined,
    longitude: ev.gpsLng ? Number(ev.gpsLng) : undefined,
    selfieKey: ev.selfieKey ?? undefined,
    markedBy: selfUserId && ev.markedBy === selfUserId ? undefined : ev.markedBy ?? undefined,
    notes: ev.notes ?? undefined,
    withinGeofence: ev.withinGeofence,
    geofenceDistanceMeters: ev.geofenceDistanceM ?? null,
    edited: ev.edited,
    editedAt: ev.editedAt,
    editedBy: ev.editedBy,
    editReason: ev.editReason,
    createdAt: ev.createdAt,
  };
}

function buildGeofenceConfig(
  prop: typeof properties.$inferSelect
): PropertyGeofenceConfig {
  return {
    propertyId: prop.id,
    latitude: prop.gpsLat !== null && prop.gpsLat !== undefined ? Number(prop.gpsLat) : null,
    longitude: prop.gpsLng !== null && prop.gpsLng !== undefined ? Number(prop.gpsLng) : null,
    radiusMeters: prop.geofenceRadiusM ?? 100,
    lenient: prop.geofenceLenient,
    weeklyOffDays: Array.isArray(prop.weeklyOffDays) ? (prop.weeklyOffDays as number[]) : null,
    minimumDailyWorkMinutes: prop.minimumDailyWorkMinutes,
  };
}

async function getPersonByUserId(userId: string): Promise<Person | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(people).where(eq(people.userId, userId)).limit(1);
  return row ?? null;
}

async function getActiveAssignment(personId: string) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(assignments)
    .where(and(eq(assignments.personId, personId), eq(assignments.status, "active")))
    .orderBy(desc(assignments.startDate))
    .limit(1);
  return row ?? null;
}

async function getPropertyForGeofence(propertyId: string) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(properties)
    .where(eq(properties.id, propertyId))
    .limit(1);
  return row ?? null;
}

async function getEventsInRange(personId: string, startUtc: Date, endUtc: Date) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(shiftEvents)
    .where(
      and(
        eq(shiftEvents.personId, personId),
        gte(shiftEvents.occurredAt, startUtc),
        lt(shiftEvents.occurredAt, endUtc)
      )
    )
    .orderBy(asc(shiftEvents.occurredAt));
}

async function hasApprovedLeaveCoveringDate(personId: string, date: string): Promise<{
  covered: boolean;
  leaveApplicationId: string | null;
}> {
  const db = await getDb();
  if (!db) return { covered: false, leaveApplicationId: null };
  const dateAsDate = new Date(`${date}T00:00:00Z`);
  const [row] = await db
    .select()
    .from(leaveApplications)
    .where(
      and(
        eq(leaveApplications.personId, personId),
        eq(leaveApplications.status, "approved"),
        lte(leaveApplications.fromDate, dateAsDate),
        gte(leaveApplications.toDate, dateAsDate)
      )
    )
    .limit(1);
  return { covered: !!row, leaveApplicationId: row?.id ?? null };
}

function engineCodeToTRPC(code: string | undefined, message?: string): TRPCError {
  const fallbackMsg = message ?? "Attendance event rejected";
  return new TRPCError({
    code: "BAD_REQUEST",
    message: fallbackMsg,
    cause: { engineCode: code ?? "validation_failed" } as any,
  });
}

function canAccessPersonScope(role: string, callerPersonId: string | null, targetPersonId: string): {
  ok: boolean;
} {
  if (callerPersonId && callerPersonId === targetPersonId) return { ok: true };
  if (GLOBAL_ROLES.includes(role)) return { ok: true };
  if ((SUPERVISOR_ROLES as readonly string[]).includes(role)) return { ok: true };
  return { ok: false };
}

// ─── Procedures ──────────────────────────────────────────────────────

const markEvent = rolesProcedure(...MARK_ROLES)
  .input(
    z.object({
      eventType: z.enum(["check_in", "check_out", "break_start", "break_end"]),
      eventAt: z.string().datetime().optional(),
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
      selfieKey: z.string().max(512).optional(),
      notes: z.string().max(500).optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const person = await getPersonByUserId(ctx.user.id);
    if (!person) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No person record linked to this user",
        cause: { engineCode: "no_person_record" } as any,
      });
    }

    const assignment = await getActiveAssignment(person.id);
    if (!assignment) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No active property assignment",
        cause: { engineCode: "no_active_assignment" } as any,
      });
    }

    const property = await getPropertyForGeofence(assignment.propertyId);
    if (!property) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Assigned property not found",
        cause: { engineCode: "property_missing" } as any,
      });
    }

    const eventAt = input.eventAt ? new Date(input.eventAt) : new Date();
    const now = new Date();

    const windowStart = new Date(now.getTime() - 24 * 60 * 60_000);
    const recentDb = await getEventsInRange(person.id, windowStart, new Date(now.getTime() + 60_000));
    const recentEngine = recentDb.map((e) => dbEventToEngineEvent(e, ctx.user.id));

    const candidate: ShiftEventInput = {
      personId: person.id,
      propertyId: property.id,
      eventType: input.eventType,
      eventAt,
      latitude: input.latitude,
      longitude: input.longitude,
      selfieKey: input.selfieKey,
      notes: input.notes,
    };

    const validation = validateShiftEvent(candidate, recentEngine, now);
    if (!validation.ok) {
      throw engineCodeToTRPC(validation.code, validation.reason);
    }

    const geo = checkGeofence(buildGeofenceConfig(property), input.latitude, input.longitude);
    if (geo.blocked) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Event location is outside the property geofence (${Math.round(geo.distanceMeters)}m away)`,
        cause: { engineCode: "geofence_violation" } as any,
      });
    }

    const eventId = randomUUID();
    await db.insert(shiftEvents).values({
      id: eventId,
      personId: person.id,
      propertyId: property.id,
      eventType: input.eventType,
      occurredAt: eventAt,
      markMode: "verified_self",
      markedBy: ctx.user.id,
      gpsLat: input.latitude !== undefined ? String(input.latitude) : null,
      gpsLng: input.longitude !== undefined ? String(input.longitude) : null,
      withinGeofence: input.latitude !== undefined && input.longitude !== undefined ? geo.withinGeofence : null,
      geofenceDistanceM: input.latitude !== undefined && input.longitude !== undefined ? Math.round(geo.distanceMeters) : null,
      selfieUrl: null,
      selfieKey: input.selfieKey ?? null,
      notes: input.notes ?? null,
    });

    const peopleUpdate: Record<string, unknown> = { updatedAt: now };
    (peopleUpdate as any).lastSeenAt = now;
    if (!person.phoneVerifiedAt) {
      (peopleUpdate as any).phoneVerifiedAt = now;
    }
    await db.update(people).set(peopleUpdate as any).where(eq(people.id, person.id));

    const clientInfo = extractClientInfo(ctx.req);
    await writeAudit({
      db,
      actorUserId: ctx.user.id,
      actorRole: ctx.user.role,
      action: "mark_event",
      targetPersonId: person.id,
      targetEventId: eventId,
      payload: {
        eventType: input.eventType,
        eventAt: eventAt.toISOString(),
        withinGeofence: geo.withinGeofence,
        geofenceDistanceMeters: Math.round(geo.distanceMeters),
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });

    return {
      id: eventId,
      personId: person.id,
      propertyId: property.id,
      eventType: input.eventType,
      eventAt: eventAt.toISOString(),
      withinGeofence: geo.withinGeofence,
      geofenceDistanceMeters: Math.round(geo.distanceMeters),
    };
  });

const markEventOnBehalf = rolesProcedure(...SUPERVISOR_ROLES)
  .input(
    z.object({
      personId: isoUuid,
      eventType: z.enum(["check_in", "check_out", "break_start", "break_end"]),
      eventAt: z.string().datetime(),
      notes: z.string().min(1).max(500),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const [target] = await db.select().from(people).where(eq(people.id, input.personId)).limit(1);
    if (!target) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Target person not found" });
    }

    if (!GLOBAL_ROLES.includes(ctx.user.role)) {
      const assignment = await getActiveAssignment(target.id);
      if (!assignment) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Target person is not assigned to a property in your scope",
        });
      }
    }

    const assignment = await getActiveAssignment(target.id);
    if (!assignment) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Target person has no active assignment",
        cause: { engineCode: "no_active_assignment" } as any,
      });
    }

    const eventAt = new Date(input.eventAt);
    const now = new Date();

    const windowStart = new Date(now.getTime() - 24 * 60 * 60_000);
    const recentDb = await getEventsInRange(target.id, windowStart, new Date(now.getTime() + 60_000));
    const targetUserId = target.userId ?? null;
    const recentEngine = recentDb.map((e) => dbEventToEngineEvent(e, targetUserId));

    const candidate: ShiftEventInput = {
      personId: target.id,
      propertyId: assignment.propertyId,
      eventType: input.eventType,
      eventAt,
      markedBy: ctx.user.id,
      notes: input.notes,
    };

    const validation = validateShiftEvent(candidate, recentEngine, now);
    if (!validation.ok) {
      throw engineCodeToTRPC(validation.code, validation.reason);
    }

    const eventId = randomUUID();
    await db.insert(shiftEvents).values({
      id: eventId,
      personId: target.id,
      propertyId: assignment.propertyId,
      eventType: input.eventType,
      occurredAt: eventAt,
      markMode: "supervisor_marked",
      markedBy: ctx.user.id,
      gpsLat: null,
      gpsLng: null,
      withinGeofence: null,
      geofenceDistanceM: null,
      selfieKey: null,
      notes: input.notes,
    });

    const onBehalfClient = extractClientInfo(ctx.req);
    await writeAudit({
      db,
      actorUserId: ctx.user.id,
      actorRole: ctx.user.role,
      action: "mark_event_on_behalf",
      targetPersonId: target.id,
      targetEventId: eventId,
      payload: {
        eventType: input.eventType,
        eventAt: eventAt.toISOString(),
        reason: input.notes,
      },
      ipAddress: onBehalfClient.ipAddress,
      userAgent: onBehalfClient.userAgent,
    });

    return {
      id: eventId,
      personId: target.id,
      propertyId: assignment.propertyId,
      eventType: input.eventType,
      eventAt: eventAt.toISOString(),
      markedBy: ctx.user.id,
    };
  });

const todaysRoster = rolesProcedure(...SUPERVISOR_ROLES)
  .input(
    z.object({
      propertyId: isoUuid.optional(),
      date: dateString.optional(),
    })
  )
  .query(async ({ input, ctx }) => {
    const db = await getDb();
    const date = input.date ?? istDateString(new Date());

    let propertyId = input.propertyId ?? null;
    if (!propertyId && db) {
      const callerPerson = await getPersonByUserId(ctx.user.id);
      if (callerPerson) {
        const a = await getActiveAssignment(callerPerson.id);
        if (a) propertyId = a.propertyId;
      }
    }

    if (!db || !propertyId) {
      return { propertyId, date, rows: [] as RosterRow[] };
    }

    const assignedRows = await db
      .select()
      .from(assignments)
      .where(and(eq(assignments.propertyId, propertyId), eq(assignments.status, "active")));

    const { startUtc, endUtc } = istDayBoundsUtc(date);

    const rows: RosterRow[] = [];
    for (const a of assignedRows) {
      const [person] = await db.select().from(people).where(eq(people.id, a.personId)).limit(1);
      if (!person) continue;

      const events = await getEventsInRange(a.personId, startUtc, endUtc);
      const selfUserId = person.userId ?? null;
      const engineEvents = events.map((e) => dbEventToEngineEvent(e, selfUserId));
      const state = getCurrentState(engineEvents);

      const leave = await hasApprovedLeaveCoveringDate(a.personId, date);

      let status: RosterRow["status"] = "absent";
      if (leave.covered) status = "on_leave";
      else if (state.isCheckedIn && state.isOnBreak) status = "on_break";
      else if (state.isCheckedIn) status = "checked_in";
      else if (state.lastEventType === "check_out") status = "checked_out";

      const firstCheckIn = engineEvents.find((e) => e.eventType === "check_in") ?? null;
      const lastCheckOuts = engineEvents.filter((e) => e.eventType === "check_out");
      const lastCheckOut = lastCheckOuts.length ? lastCheckOuts[lastCheckOuts.length - 1] : null;
      const latestWithSelfie = [...engineEvents].reverse().find((e) => e.selfieKey) ?? null;
      const hasGeofenceViolation = engineEvents.some((e) => e.withinGeofence === false);

      let totalMinutes = 0;
      if (firstCheckIn) {
        const endRef = lastCheckOut?.eventAt ?? (engineEvents.length ? engineEvents[engineEvents.length - 1].eventAt : null);
        if (endRef) {
          totalMinutes = Math.max(
            0,
            Math.round((endRef.getTime() - firstCheckIn.eventAt.getTime()) / 60_000)
          );
        }
      }

      rows.push({
        personId: a.personId,
        personName: person.fullName,
        role: a.roleCode,
        employmentType: person.employmentType ?? null,
        status,
        firstCheckInAt: firstCheckIn?.eventAt?.toISOString() ?? null,
        lastEventAt: state.lastEventAt?.toISOString() ?? null,
        lastEventType: state.lastEventType,
        hasGeofenceViolation,
        latestSelfieKey: latestWithSelfie?.selfieKey ?? null,
        totalMinutesToday: totalMinutes,
        events: engineEvents.map((e) => ({
          id: e.id,
          eventType: e.eventType,
          eventAt: e.eventAt.toISOString(),
          withinGeofence: e.withinGeofence,
          markedByOnBehalf: e.markedBy !== undefined,
        })),
      });
    }

    return { propertyId, date, rows };
  });

type RosterRow = {
  personId: string;
  personName: string;
  role: string;
  employmentType: string | null;
  status: "checked_in" | "on_break" | "checked_out" | "absent" | "on_leave";
  firstCheckInAt: string | null;
  lastEventAt: string | null;
  lastEventType: ShiftEventType | null;
  hasGeofenceViolation: boolean;
  latestSelfieKey: string | null;
  totalMinutesToday: number;
  events: Array<{
    id: string;
    eventType: ShiftEventType;
    eventAt: string;
    withinGeofence: boolean | null;
    markedByOnBehalf: boolean;
  }>;
};

const dailySummaryProc = protectedProcedure
  .input(
    z.object({
      personId: isoUuid.optional(),
      date: dateString,
    })
  )
  .query(async ({ input, ctx }) => {
    const db = await getDb();
    const callerPerson = await getPersonByUserId(ctx.user.id);
    const callerPersonId = callerPerson?.id ?? null;

    const targetPersonId = input.personId ?? callerPersonId;
    if (!targetPersonId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No person record linked to this user",
        cause: { engineCode: "no_person_record" } as any,
      });
    }

    const access = canAccessPersonScope(ctx.user.role, callerPersonId, targetPersonId);
    if (!access.ok) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    if (!db) {
      return null;
    }

    const [cached] = await db
      .select()
      .from(dailySummaries)
      .where(and(eq(dailySummaries.personId, targetPersonId), eq(dailySummaries.date, input.date)))
      .limit(1);

    if (cached?.locked) return cached;

    const { startUtc, endUtc } = istDayBoundsUtc(input.date);
    const [person] = await db.select().from(people).where(eq(people.id, targetPersonId)).limit(1);
    if (!person) throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });

    const events = await getEventsInRange(targetPersonId, startUtc, endUtc);
    const engineEvents = events.map((e) => dbEventToEngineEvent(e, person.userId ?? null));

    const assignment = await getActiveAssignment(targetPersonId);
    let propertyConfig: PropertyGeofenceConfig | null = null;
    if (assignment) {
      const prop = await getPropertyForGeofence(assignment.propertyId);
      if (prop) propertyConfig = buildGeofenceConfig(prop);
    }

    const leave = await hasApprovedLeaveCoveringDate(targetPersonId, input.date);

    const dayOfWeek = new Date(`${input.date}T00:00:00Z`).getUTCDay();
    const isWeeklyOff = !!propertyConfig?.weeklyOffDays?.includes(dayOfWeek);

    const result = computeDailySummary({
      personId: targetPersonId,
      date: input.date,
      events: engineEvents,
      property: propertyConfig,
      isOnApprovedLeave: leave.covered,
      leaveApplicationId: leave.leaveApplicationId,
      isDeclaredHoliday: false,
      isWeeklyOff,
    });

    const row = {
      id: cached?.id ?? randomUUID(),
      personId: result.personId,
      propertyId: result.propertyId,
      date: result.date,
      status: result.status === "absconding" ? "absent" : result.status,
      totalMinutes: result.totalMinutes,
      breakMinutes: result.breakMinutes,
      netWorkMinutes: result.netWorkMinutes,
      shiftCount: result.shiftCount,
      breakCount: result.breakCount,
      firstCheckInAt: result.firstCheckInAt,
      lastCheckOutAt: result.lastCheckOutAt,
      hasGeofenceViolation: result.hasGeofenceViolation,
      geofenceViolationCount: result.geofenceViolationCount,
      hasAnomalies: result.hasAnomalies,
      anomalyCodes: result.anomalyCodes,
      leaveApplicationId: result.leaveApplicationId,
      computedAt: new Date(),
      locked: false,
    } as const;

    if (cached) {
      await db
        .update(dailySummaries)
        .set({
          status: row.status as any,
          totalMinutes: row.totalMinutes,
          breakMinutes: row.breakMinutes,
          netWorkMinutes: row.netWorkMinutes,
          shiftCount: row.shiftCount,
          breakCount: row.breakCount,
          firstCheckInAt: row.firstCheckInAt,
          lastCheckOutAt: row.lastCheckOutAt,
          hasGeofenceViolation: row.hasGeofenceViolation,
          geofenceViolationCount: row.geofenceViolationCount,
          hasAnomalies: row.hasAnomalies,
          anomalyCodes: row.anomalyCodes,
          leaveApplicationId: row.leaveApplicationId,
          computedAt: row.computedAt,
        })
        .where(eq(dailySummaries.id, cached.id));
    } else {
      await db.insert(dailySummaries).values({
        id: row.id,
        personId: row.personId,
        propertyId: row.propertyId,
        date: row.date,
        status: row.status as any,
        totalMinutes: row.totalMinutes,
        breakMinutes: row.breakMinutes,
        netWorkMinutes: row.netWorkMinutes,
        shiftCount: row.shiftCount,
        breakCount: row.breakCount,
        firstCheckInAt: row.firstCheckInAt,
        lastCheckOutAt: row.lastCheckOutAt,
        hasGeofenceViolation: row.hasGeofenceViolation,
        geofenceViolationCount: row.geofenceViolationCount,
        hasAnomalies: row.hasAnomalies,
        anomalyCodes: row.anomalyCodes,
        leaveApplicationId: row.leaveApplicationId,
        computedAt: row.computedAt,
      });
    }

    return row;
  });

const myStatus = protectedProcedure.query(async ({ ctx }) => {
  const db = await getDb();
  if (!db) {
    return {
      personId: null as string | null,
      personName: ctx.user.name ?? null,
      propertyName: null,
      propertyId: null,
      currentState: "off" as const,
      lastEventType: null,
      lastEventAt: null,
      todayMinutesWorked: 0,
      todayBreakMinutes: 0,
      canMarkCheckIn: false,
      canMarkCheckOut: false,
      canMarkBreakStart: false,
      canMarkBreakEnd: false,
    };
  }

  const person = await getPersonByUserId(ctx.user.id);
  if (!person) {
    return {
      personId: null as string | null,
      personName: ctx.user.name ?? null,
      propertyName: null,
      propertyId: null,
      currentState: "off" as const,
      lastEventType: null,
      lastEventAt: null,
      todayMinutesWorked: 0,
      todayBreakMinutes: 0,
      canMarkCheckIn: false,
      canMarkCheckOut: false,
      canMarkBreakStart: false,
      canMarkBreakEnd: false,
    };
  }

  const assignment = await getActiveAssignment(person.id);
  let propertyName: string | null = null;
  let propertyId: string | null = null;
  if (assignment) {
    const property = await getPropertyForGeofence(assignment.propertyId);
    propertyName = property?.name ?? null;
    propertyId = property?.id ?? null;
  }

  const today = istDateString(new Date());
  const { startUtc, endUtc } = istDayBoundsUtc(today);
  const events = await getEventsInRange(person.id, startUtc, endUtc);
  const engineEvents = events.map((e) => dbEventToEngineEvent(e, person.userId ?? null));
  const state = getCurrentState(engineEvents);

  const summary = computeDailySummary({
    personId: person.id,
    date: today,
    events: engineEvents,
    property: null,
    isOnApprovedLeave: false,
    leaveApplicationId: null,
    isDeclaredHoliday: false,
    isWeeklyOff: false,
  });

  const currentState =
    state.isCheckedIn && state.isOnBreak ? "on_break" : state.isCheckedIn ? "on_shift" : "off";

  return {
    personId: person.id as string | null,
    personName: person.fullName,
    propertyName,
    propertyId,
    currentState,
    lastEventType: state.lastEventType,
    lastEventAt: state.lastEventAt?.toISOString() ?? null,
    todayMinutesWorked: summary.netWorkMinutes,
    todayBreakMinutes: summary.breakMinutes,
    canMarkCheckIn: !state.isCheckedIn,
    canMarkCheckOut: state.isCheckedIn && !state.isOnBreak,
    canMarkBreakStart: state.isCheckedIn && !state.isOnBreak,
    canMarkBreakEnd: state.isOnBreak,
  };
});

const requestEdit = protectedProcedure
  .input(
    z.object({
      eventId: isoUuid,
      newEventAt: z.string().datetime(),
      reason: z.string().min(10).max(500),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const callerPerson = await getPersonByUserId(ctx.user.id);
    if (!callerPerson) {
      throw new TRPCError({ code: "FORBIDDEN", message: "No person record linked to this user" });
    }

    const [event] = await db.select().from(shiftEvents).where(eq(shiftEvents.id, input.eventId)).limit(1);
    if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
    if (event.personId !== callerPerson.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You can only edit your own events" });
    }

    const eventIstDate = istDateString(event.occurredAt);
    const todayIst = istDateString(new Date());
    const yesterdayIst = istDateString(new Date(Date.now() - 24 * 60 * 60_000));

    const newEventAt = new Date(input.newEventAt);
    const now = new Date();

    const reqEditClient = extractClientInfo(ctx.req);

    if (eventIstDate === todayIst) {
      await db
        .update(shiftEvents)
        .set({
          occurredAt: newEventAt,
          edited: true,
          editedAt: now,
          editedBy: ctx.user.id,
          editReason: input.reason,
        })
        .where(eq(shiftEvents.id, event.id));
      await writeAudit({
        db,
        actorUserId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "request_edit",
        targetPersonId: callerPerson.id,
        targetEventId: event.id,
        payload: {
          autoApproved: true,
          oldEventAt: event.occurredAt.toISOString(),
          newEventAt: newEventAt.toISOString(),
          reason: input.reason,
        },
        ipAddress: reqEditClient.ipAddress,
        userAgent: reqEditClient.userAgent,
      });
      return {
        status: "auto_approved" as const,
        message: "Edit applied immediately (same-day window)",
      };
    }

    if (eventIstDate === yesterdayIst) {
      const reqId = randomUUID();
      await db.insert(attendanceEditRequests).values({
        id: reqId,
        eventId: event.id,
        requestedBy: ctx.user.id,
        newEventAt,
        reason: input.reason,
        status: "pending",
      });
      await writeAudit({
        db,
        actorUserId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "request_edit",
        targetPersonId: callerPerson.id,
        targetEventId: event.id,
        targetEditRequestId: reqId,
        payload: {
          autoApproved: false,
          oldEventAt: event.occurredAt.toISOString(),
          newEventAt: newEventAt.toISOString(),
          reason: input.reason,
        },
        ipAddress: reqEditClient.ipAddress,
        userAgent: reqEditClient.userAgent,
      });
      return {
        status: "pending_supervisor" as const,
        message: "Edit request submitted for supervisor approval",
        editRequestId: reqId,
      };
    }

    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Edit window is closed for this event",
      cause: { engineCode: "edit_window_closed" } as any,
    });
  });

const approveEdit = rolesProcedure(...SUPERVISOR_ROLES)
  .input(
    z.object({
      editRequestId: isoUuid,
      decision: z.enum(["approve", "reject"]),
      reviewNote: z.string().max(500).optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const [req] = await db
      .select()
      .from(attendanceEditRequests)
      .where(eq(attendanceEditRequests.id, input.editRequestId))
      .limit(1);
    if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Edit request not found" });
    if (req.status !== "pending") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Edit request already ${req.status}`,
        cause: { engineCode: "not_pending" } as any,
      });
    }

    const now = new Date();
    const approveClient = extractClientInfo(ctx.req);
    let approvedEventTargetPersonId: string | null = null;
    let approvedEventTargetEventId: string | null = null;

    if (input.decision === "approve") {
      const [event] = await db.select().from(shiftEvents).where(eq(shiftEvents.id, req.eventId)).limit(1);
      if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Original event not found" });

      approvedEventTargetPersonId = event.personId;
      approvedEventTargetEventId = event.id;

      await db
        .update(shiftEvents)
        .set({
          occurredAt: req.newEventAt,
          edited: true,
          editedAt: now,
          editedBy: ctx.user.id,
          editReason: req.reason,
        })
        .where(eq(shiftEvents.id, event.id));

      await db
        .update(attendanceEditRequests)
        .set({
          status: "approved",
          reviewedBy: ctx.user.id,
          reviewedAt: now,
          reviewNote: input.reviewNote ?? null,
        })
        .where(eq(attendanceEditRequests.id, req.id));

      const eventDate = istDateString(req.newEventAt);
      await db
        .delete(dailySummaries)
        .where(and(eq(dailySummaries.personId, event.personId), eq(dailySummaries.date, eventDate)));
    } else {
      await db
        .update(attendanceEditRequests)
        .set({
          status: "rejected",
          reviewedBy: ctx.user.id,
          reviewedAt: now,
          reviewNote: input.reviewNote ?? null,
        })
        .where(eq(attendanceEditRequests.id, req.id));
    }

    await writeAudit({
      db,
      actorUserId: ctx.user.id,
      actorRole: ctx.user.role,
      action: input.decision === "approve" ? "approve_edit" : "reject_edit",
      targetPersonId: approvedEventTargetPersonId,
      targetEventId: approvedEventTargetEventId,
      targetEditRequestId: req.id,
      payload: {
        reviewNote: input.reviewNote ?? null,
        newEventAt: req.newEventAt.toISOString(),
      },
      ipAddress: approveClient.ipAddress,
      userAgent: approveClient.userAgent,
    });

    return { status: input.decision === "approve" ? "approved" : "rejected" };
  });

const recentEvents = protectedProcedure
  .input(
    z.object({
      personId: isoUuid.optional(),
      fromDate: dateString.optional(),
      toDate: dateString.optional(),
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().optional(),
    })
  )
  .query(async ({ input, ctx }) => {
    const db = await getDb();
    const callerPerson = await getPersonByUserId(ctx.user.id);
    const callerPersonId = callerPerson?.id ?? null;
    const targetPersonId = input.personId ?? callerPersonId;

    if (!targetPersonId) {
      return { events: [], nextCursor: null };
    }

    const access = canAccessPersonScope(ctx.user.role, callerPersonId, targetPersonId);
    if (!access.ok) throw new TRPCError({ code: "FORBIDDEN" });

    if (!db) return { events: [], nextCursor: null };

    const fromDate = input.fromDate ?? istDateString(new Date(Date.now() - 7 * 24 * 60 * 60_000));
    const toDate = input.toDate ?? istDateString(new Date());
    const fromBounds = istDayBoundsUtc(fromDate);
    const toBounds = istDayBoundsUtc(toDate);

    const rows = await db
      .select()
      .from(shiftEvents)
      .where(
        and(
          eq(shiftEvents.personId, targetPersonId),
          gte(shiftEvents.occurredAt, fromBounds.startUtc),
          lt(shiftEvents.occurredAt, toBounds.endUtc)
        )
      )
      .orderBy(desc(shiftEvents.occurredAt))
      .limit(input.limit + 1);

    const hasMore = rows.length > input.limit;
    const events = (hasMore ? rows.slice(0, input.limit) : rows).map((e) => ({
      id: e.id,
      personId: e.personId,
      propertyId: e.propertyId,
      eventType: e.eventType,
      eventAt: e.occurredAt.toISOString(),
      withinGeofence: e.withinGeofence,
      geofenceDistanceMeters: e.geofenceDistanceM,
      edited: e.edited,
      markedByOnBehalf: callerPersonId === targetPersonId
        ? e.markedBy !== ctx.user.id
        : e.markedBy !== (callerPerson?.userId ?? null),
      notes: e.notes,
    }));

    return {
      events,
      nextCursor: hasMore ? rows[input.limit - 1].id : null,
    };
  });

const pendingEditRequests = rolesProcedure(...SUPERVISOR_ROLES)
  .input(z.object({ propertyId: isoUuid.optional() }).optional())
  .query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [] as PendingEditRow[];

    const propertyId = input?.propertyId;

    const rows = await db
      .select({
        request: attendanceEditRequests,
        event: shiftEvents,
        person: people,
      })
      .from(attendanceEditRequests)
      .innerJoin(shiftEvents, eq(attendanceEditRequests.eventId, shiftEvents.id))
      .innerJoin(people, eq(shiftEvents.personId, people.id))
      .where(
        propertyId
          ? and(
              eq(attendanceEditRequests.status, "pending"),
              eq(shiftEvents.propertyId, propertyId)
            )
          : eq(attendanceEditRequests.status, "pending")
      )
      .orderBy(desc(attendanceEditRequests.createdAt))
      .limit(200);

    const result: PendingEditRow[] = rows.map((r) => ({
      id: r.request.id,
      eventId: r.event.id,
      personId: r.person.id,
      personName: r.person.fullName,
      propertyId: r.event.propertyId,
      originalEventAt: r.event.occurredAt.toISOString(),
      originalEventType: r.event.eventType,
      newEventAt: r.request.newEventAt.toISOString(),
      reason: r.request.reason,
      requestedAt: r.request.createdAt.toISOString(),
    }));

    return result;
  });

type PendingEditRow = {
  id: string;
  eventId: string;
  personId: string;
  personName: string;
  propertyId: string | null;
  originalEventAt: string;
  originalEventType: "check_in" | "check_out" | "break_start" | "break_end";
  newEventAt: string;
  reason: string;
  requestedAt: string;
};

// ─── Admin: cross-property summaries + CSV export + audit log ───────

const ADMIN_ROLES = [
  "property_manager",
  "ops_lead",
  "central_admin",
  "super_admin",
] as const;

const STATUS_VALUES = [
  "present",
  "partial",
  "absent",
  "leave",
  "holiday",
  "weekly_off",
  "absconding",
] as const;

const adminFilterSchema = z.object({
  fromDate: dateString,
  toDate: dateString,
  propertyIds: z.array(isoUuid).optional(),
  statuses: z.array(z.enum(STATUS_VALUES)).optional(),
  onlyAnomalies: z.boolean().optional(),
});

const BACKFILL_HARD_CAP = 500;
const EXPORT_HARD_CAP = 10_000;

interface AdminSummaryRow {
  id: string | null;
  personId: string;
  personName: string;
  role: string | null;
  employmentType: string | null;
  propertyId: string | null;
  propertyName: string | null;
  date: string;
  status: string;
  totalMinutes: number;
  breakMinutes: number;
  netWorkMinutes: number;
  shiftCount: number;
  breakCount: number;
  firstCheckInAt: string | null;
  lastCheckOutAt: string | null;
  hasGeofenceViolation: boolean;
  geofenceViolationCount: number;
  hasAnomalies: boolean;
  anomalyCodes: string[];
}

function isGlobalRole(role: string): boolean {
  return role === "ops_lead" || role === "central_admin" || role === "super_admin";
}

async function resolveScopeProperties(
  callerUserId: string,
  callerRole: string,
  requestedIds: string[] | undefined
): Promise<string[] | null> {
  const db = await getDb();
  if (!db) return [];

  if (isGlobalRole(callerRole)) {
    return requestedIds && requestedIds.length > 0 ? requestedIds : null;
  }

  const callerPerson = await getPersonByUserId(callerUserId);
  if (!callerPerson) return [];
  const assignments_ = await db
    .select()
    .from(assignments)
    .where(and(eq(assignments.personId, callerPerson.id), eq(assignments.status, "active")));
  const scope = Array.from(new Set(assignments_.map((a) => a.propertyId)));
  if (!requestedIds || requestedIds.length === 0) return scope;
  return requestedIds.filter((id) => scope.includes(id));
}

const adminSummaries = rolesProcedure(...ADMIN_ROLES)
  .input(
    adminFilterSchema.extend({
      limit: z.number().min(1).max(200).default(50),
      cursor: z.string().optional(),
    })
  )
  .query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) {
      return {
        rows: [] as AdminSummaryRow[],
        nextCursor: null as string | null,
        backfillTruncated: false,
      };
    }

    const scope = await resolveScopeProperties(ctx.user.id, ctx.user.role, input.propertyIds);
    if (scope !== null && scope.length === 0) {
      return { rows: [], nextCursor: null, backfillTruncated: false };
    }

    const backfillResult = await backfillSummariesIfMissing({
      db,
      fromDate: input.fromDate,
      toDate: input.toDate,
      propertyScope: scope,
      cap: BACKFILL_HARD_CAP,
    });

    const conditions: any[] = [
      gte(dailySummaries.date, input.fromDate),
      lte(dailySummaries.date, input.toDate),
    ];
    if (scope !== null && scope.length > 0) {
      conditions.push(inArray(dailySummaries.propertyId, scope));
    }
    if (input.statuses && input.statuses.length > 0) {
      conditions.push(inArray(dailySummaries.status, input.statuses));
    }
    if (input.onlyAnomalies) {
      conditions.push(eq(dailySummaries.hasAnomalies, true));
    }

    const rows = await db
      .select({
        summary: dailySummaries,
        person: people,
        property: properties,
      })
      .from(dailySummaries)
      .innerJoin(people, eq(dailySummaries.personId, people.id))
      .leftJoin(properties, eq(dailySummaries.propertyId, properties.id))
      .where(and(...conditions))
      .orderBy(desc(dailySummaries.date), asc(people.fullName))
      .limit(input.limit + 1);

    const hasMore = rows.length > input.limit;
    const sliced = hasMore ? rows.slice(0, input.limit) : rows;

    const shaped: AdminSummaryRow[] = sliced.map((r) => ({
      id: r.summary.id,
      personId: r.summary.personId,
      personName: r.person.fullName,
      role: null,
      employmentType: r.person.employmentType ?? null,
      propertyId: r.summary.propertyId,
      propertyName: r.property?.name ?? null,
      date: r.summary.date,
      status: r.summary.status,
      totalMinutes: r.summary.totalMinutes,
      breakMinutes: r.summary.breakMinutes,
      netWorkMinutes: r.summary.netWorkMinutes,
      shiftCount: r.summary.shiftCount,
      breakCount: r.summary.breakCount,
      firstCheckInAt: r.summary.firstCheckInAt ? r.summary.firstCheckInAt.toISOString() : null,
      lastCheckOutAt: r.summary.lastCheckOutAt ? r.summary.lastCheckOutAt.toISOString() : null,
      hasGeofenceViolation: r.summary.hasGeofenceViolation,
      geofenceViolationCount: r.summary.geofenceViolationCount,
      hasAnomalies: r.summary.hasAnomalies,
      anomalyCodes: Array.isArray(r.summary.anomalyCodes)
        ? (r.summary.anomalyCodes as string[])
        : [],
    }));

    return {
      rows: shaped,
      nextCursor: hasMore ? shaped[shaped.length - 1].id : null,
      backfillTruncated: backfillResult.truncated,
    };
  });

async function backfillSummariesIfMissing(args: {
  db: any;
  fromDate: string;
  toDate: string;
  propertyScope: string[] | null;
  cap: number;
}): Promise<{ created: number; truncated: boolean }> {
  const { db, fromDate, toDate, propertyScope, cap } = args;

  const assignmentConditions: any[] = [eq(assignments.status, "active")];
  if (propertyScope !== null && propertyScope.length > 0) {
    assignmentConditions.push(inArray(assignments.propertyId, propertyScope));
  }
  const activeAssignments = await db
    .select()
    .from(assignments)
    .where(and(...assignmentConditions));

  if (activeAssignments.length === 0) return { created: 0, truncated: false };

  const personPropertyMap = new Map<string, string>();
  for (const a of activeAssignments) {
    if (!personPropertyMap.has(a.personId)) {
      personPropertyMap.set(a.personId, a.propertyId);
    }
  }
  const personIds = Array.from(personPropertyMap.keys());

  const allDates = eachIstDate(fromDate, toDate);

  const existingRows = await db
    .select({ personId: dailySummaries.personId, date: dailySummaries.date })
    .from(dailySummaries)
    .where(
      and(
        inArray(dailySummaries.personId, personIds),
        gte(dailySummaries.date, fromDate),
        lte(dailySummaries.date, toDate)
      )
    );
  const existing = new Set(existingRows.map((r: any) => `${r.personId}|${r.date}`));

  const missing: Array<{ personId: string; date: string; propertyId: string }> = [];
  for (const personId of personIds) {
    const propertyId = personPropertyMap.get(personId)!;
    for (const date of allDates) {
      if (!existing.has(`${personId}|${date}`)) {
        missing.push({ personId, date, propertyId });
      }
    }
  }

  if (missing.length === 0) return { created: 0, truncated: false };

  const truncated = missing.length > cap;
  const toProcess = missing.slice(0, cap);

  let created = 0;
  for (const m of toProcess) {
    try {
      const { startUtc, endUtc } = istDayBoundsUtc(m.date);
      const eventsForDay = await getEventsInRange(m.personId, startUtc, endUtc);

      const [personRow] = await db
        .select()
        .from(people)
        .where(eq(people.id, m.personId))
        .limit(1);
      if (!personRow) continue;

      const [propRow] = await db
        .select()
        .from(properties)
        .where(eq(properties.id, m.propertyId))
        .limit(1);
      const propertyConfig: PropertyGeofenceConfig | null = propRow
        ? buildGeofenceConfig(propRow)
        : null;

      const dateAsDate = new Date(`${m.date}T00:00:00Z`);
      const [leave] = await db
        .select()
        .from(leaveApplications)
        .where(
          and(
            eq(leaveApplications.personId, m.personId),
            eq(leaveApplications.status, "approved"),
            lte(leaveApplications.fromDate, dateAsDate),
            gte(leaveApplications.toDate, dateAsDate)
          )
        )
        .limit(1);

      const engineEvents = eventsForDay.map((e: any) =>
        dbEventToEngineEvent(e, personRow.userId ?? null)
      );

      const dayOfWeek = new Date(`${m.date}T00:00:00Z`).getUTCDay();
      const isWeeklyOff = !!propertyConfig?.weeklyOffDays?.includes(dayOfWeek);

      const computed = computeDailySummary({
        personId: m.personId,
        date: m.date,
        events: engineEvents,
        property: propertyConfig,
        isOnApprovedLeave: !!leave,
        leaveApplicationId: leave?.id ?? null,
        isDeclaredHoliday: false,
        isWeeklyOff,
      });

      await db.insert(dailySummaries).values({
        id: randomUUID(),
        personId: computed.personId,
        propertyId: computed.propertyId,
        date: computed.date,
        status: (computed.status === "absconding" ? "absent" : computed.status) as any,
        totalMinutes: computed.totalMinutes,
        breakMinutes: computed.breakMinutes,
        netWorkMinutes: computed.netWorkMinutes,
        shiftCount: computed.shiftCount,
        breakCount: computed.breakCount,
        firstCheckInAt: computed.firstCheckInAt,
        lastCheckOutAt: computed.lastCheckOutAt,
        hasGeofenceViolation: computed.hasGeofenceViolation,
        geofenceViolationCount: computed.geofenceViolationCount,
        hasAnomalies: computed.hasAnomalies,
        anomalyCodes: computed.anomalyCodes,
        leaveApplicationId: computed.leaveApplicationId,
        computedAt: new Date(),
      });
      created += 1;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[adminSummaries] backfill failed for", m, err);
    }
  }

  return { created, truncated };
}

function eachIstDate(fromDate: string, toDate: string): string[] {
  const start = new Date(`${fromDate}T00:00:00Z`).getTime();
  const end = new Date(`${toDate}T00:00:00Z`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return [];
  const days: string[] = [];
  const MS = 24 * 60 * 60_000;
  const MAX = 366;
  for (let i = 0, t = start; t <= end && i < MAX; t += MS, i += 1) {
    days.push(new Date(t).toISOString().slice(0, 10));
  }
  return days;
}

const exportCsv = rolesProcedure(...ADMIN_ROLES)
  .input(adminFilterSchema)
  .mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) {
      return {
        csv: summariesToCsv([]),
        filename: `firebrick-attendance-${input.fromDate}-to-${input.toDate}.csv`,
        rowCount: 0,
        truncated: false,
      };
    }

    const scope = await resolveScopeProperties(ctx.user.id, ctx.user.role, input.propertyIds);
    if (scope !== null && scope.length === 0) {
      return {
        csv: summariesToCsv([]),
        filename: `firebrick-attendance-${input.fromDate}-to-${input.toDate}.csv`,
        rowCount: 0,
        truncated: false,
      };
    }

    await backfillSummariesIfMissing({
      db,
      fromDate: input.fromDate,
      toDate: input.toDate,
      propertyScope: scope,
      cap: BACKFILL_HARD_CAP,
    });

    const conditions: any[] = [
      gte(dailySummaries.date, input.fromDate),
      lte(dailySummaries.date, input.toDate),
    ];
    if (scope !== null && scope.length > 0) {
      conditions.push(inArray(dailySummaries.propertyId, scope));
    }
    if (input.statuses && input.statuses.length > 0) {
      conditions.push(inArray(dailySummaries.status, input.statuses));
    }
    if (input.onlyAnomalies) {
      conditions.push(eq(dailySummaries.hasAnomalies, true));
    }

    const rows = await db
      .select({
        summary: dailySummaries,
        person: people,
        property: properties,
      })
      .from(dailySummaries)
      .innerJoin(people, eq(dailySummaries.personId, people.id))
      .leftJoin(properties, eq(dailySummaries.propertyId, properties.id))
      .where(and(...conditions))
      .orderBy(desc(dailySummaries.date), asc(people.fullName))
      .limit(EXPORT_HARD_CAP + 1);

    const truncated = rows.length > EXPORT_HARD_CAP;
    const exportRows = truncated ? rows.slice(0, EXPORT_HARD_CAP) : rows;

    const csvRows: CsvRow[] = exportRows.map((r: any) => {
      const anomalyList = Array.isArray(r.summary.anomalyCodes)
        ? (r.summary.anomalyCodes as string[]).join("; ")
        : "";
      return {
        personName: r.person.fullName,
        employeeId: r.person.id,
        role: r.person.staffType ?? "",
        propertyName: r.property?.name ?? "",
        date: r.summary.date,
        status: r.summary.status,
        firstCheckIn: r.summary.firstCheckInAt ? formatTimeHHMM(r.summary.firstCheckInAt) : "",
        lastCheckOut: r.summary.lastCheckOutAt ? formatTimeHHMM(r.summary.lastCheckOutAt) : "",
        totalHours: minutesToDecimalHours(r.summary.totalMinutes),
        breakHours: minutesToDecimalHours(r.summary.breakMinutes),
        netWorkHours: minutesToDecimalHours(r.summary.netWorkMinutes),
        anomalies: anomalyList,
        geofenceViolations: r.summary.geofenceViolationCount,
        editedEvents: 0,
        markedOnBehalfEvents: 0,
      };
    });

    const csv = summariesToCsv(csvRows);

    return {
      csv,
      filename: `firebrick-attendance-${input.fromDate}-to-${input.toDate}.csv`,
      rowCount: csvRows.length,
      truncated,
    };
  });

const AUDIT_ROLES = ["ops_lead", "central_admin", "super_admin"] as const;

const auditLogQuery = rolesProcedure(...AUDIT_ROLES)
  .input(
    z.object({
      fromDate: dateString,
      toDate: dateString,
      actorUserId: isoUuid.optional(),
      action: z
        .enum([
          "mark_event",
          "mark_event_on_behalf",
          "request_edit",
          "approve_edit",
          "reject_edit",
          "manual_summary_recompute",
          "lock_summary",
        ])
        .optional(),
      targetPersonId: isoUuid.optional(),
      limit: z.number().min(1).max(200).default(100),
      cursor: z.string().optional(),
    })
  )
  .query(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      return { entries: [] as AuditEntryRow[], nextCursor: null as string | null };
    }

    const fromTs = new Date(`${input.fromDate}T00:00:00Z`);
    const toTs = new Date(`${input.toDate}T23:59:59Z`);

    const conditions: any[] = [
      gte(attendanceAuditLog.createdAt, fromTs),
      lte(attendanceAuditLog.createdAt, toTs),
    ];
    if (input.actorUserId) conditions.push(eq(attendanceAuditLog.actorUserId, input.actorUserId));
    if (input.action) conditions.push(eq(attendanceAuditLog.action, input.action));
    if (input.targetPersonId) {
      conditions.push(eq(attendanceAuditLog.targetPersonId, input.targetPersonId));
    }

    const rows = await db
      .select({
        audit: attendanceAuditLog,
        actor: users,
        target: people,
      })
      .from(attendanceAuditLog)
      .innerJoin(users, eq(attendanceAuditLog.actorUserId, users.id))
      .leftJoin(people, eq(attendanceAuditLog.targetPersonId, people.id))
      .where(and(...conditions))
      .orderBy(desc(attendanceAuditLog.createdAt))
      .limit(input.limit + 1);

    const hasMore = rows.length > input.limit;
    const sliced = hasMore ? rows.slice(0, input.limit) : rows;

    const entries: AuditEntryRow[] = sliced.map((r: any) => ({
      id: r.audit.id,
      actorUserId: r.audit.actorUserId,
      actorName: r.actor.name ?? r.actor.email,
      actorRole: r.audit.actorRole,
      action: r.audit.action,
      targetPersonId: r.audit.targetPersonId,
      targetPersonName: r.target?.fullName ?? null,
      targetEventId: r.audit.targetEventId,
      targetEditRequestId: r.audit.targetEditRequestId,
      payload: r.audit.payload,
      ipAddress: r.audit.ipAddress,
      userAgent: r.audit.userAgent,
      createdAt: r.audit.createdAt.toISOString(),
    }));

    return {
      entries,
      nextCursor: hasMore ? entries[entries.length - 1].id : null,
    };
  });

type AuditEntryRow = {
  id: string;
  actorUserId: string;
  actorName: string | null;
  actorRole: string;
  action: string;
  targetPersonId: string | null;
  targetPersonName: string | null;
  targetEventId: string | null;
  targetEditRequestId: string | null;
  payload: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

const legacyList = protectedProcedure
  .input(
    z
      .object({
        personId: isoUuid.optional(),
        propertyId: isoUuid.optional(),
        from: z.date().optional(),
        to: z.date().optional(),
        limit: z.number().optional(),
      })
      .optional()
  )
  .query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const opts = input ?? {};
    const conditions = [];
    if (opts.personId) conditions.push(eq(shiftEvents.personId, opts.personId));
    if (opts.propertyId) conditions.push(eq(shiftEvents.propertyId, opts.propertyId));
    if (opts.from) conditions.push(gte(shiftEvents.occurredAt, opts.from));
    if (opts.to) conditions.push(lte(shiftEvents.occurredAt, opts.to));
    const base = db.select().from(shiftEvents);
    const q = conditions.length ? base.where(and(...conditions)) : base;
    return q.orderBy(desc(shiftEvents.occurredAt)).limit(opts.limit ?? 200);
  });

export const attendanceRouter = router({
  markEvent,
  markEventOnBehalf,
  todaysRoster,
  dailySummary: dailySummaryProc,
  myStatus,
  requestEdit,
  approveEdit,
  pendingEditRequests,
  recentEvents,
  adminSummaries,
  exportCsv,
  auditLog: auditLogQuery,
  list: legacyList,
});
