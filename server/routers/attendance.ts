import { randomUUID } from "crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gte, lte, lt } from "drizzle-orm";
import { router, protectedProcedure, rolesProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
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

    if (input.decision === "approve") {
      const [event] = await db.select().from(shiftEvents).where(eq(shiftEvents.id, req.eventId)).limit(1);
      if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Original event not found" });

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
  recentEvents,
  list: legacyList,
});
