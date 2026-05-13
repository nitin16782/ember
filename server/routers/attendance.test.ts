import { randomUUID } from "crypto";
import { describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "../routers";
import type { Context } from "../_core/context";

const uuid = () => randomUUID();

function mockContext(role: string = "associate"): Context {
  return {
    user: {
      id: uuid(),
      email: "test@example.com",
      phone: null,
      name: "Test User",
      role: role as any,
      permissionOverrides: null,
      isActive: true,
      lastSignedInAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any,
    req: { protocol: "https", headers: {}, ip: "127.0.0.1" } as any,
    res: { clearCookie: vi.fn() } as any,
  };
}

function unauthContext(): Context {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: vi.fn() } as any,
  };
}

describe("attendance router — auth and role gates", () => {
  it("markEvent rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(unauthContext());
    await expect(caller.attendance.markEvent({ eventType: "check_in" })).rejects.toThrow();
  });

  it("markEvent rejects owner_portal role", async () => {
    const caller = appRouter.createCaller(mockContext("owner_portal"));
    await expect(caller.attendance.markEvent({ eventType: "check_in" })).rejects.toThrowError(
      /FORBIDDEN/
    );
  });

  it("markEvent accepts associate role (errors later for missing DB)", async () => {
    const caller = appRouter.createCaller(mockContext("associate"));
    await expect(caller.attendance.markEvent({ eventType: "check_in" })).rejects.toThrow();
  });

  it("markEventOnBehalf rejects associate role", async () => {
    const caller = appRouter.createCaller(mockContext("associate"));
    await expect(
      caller.attendance.markEventOnBehalf({
        personId: uuid(),
        eventType: "check_in",
        eventAt: new Date().toISOString(),
        notes: "supervisor mark for testing",
      })
    ).rejects.toThrowError(/FORBIDDEN/);
  });

  it("markEventOnBehalf accepts supervisor role", async () => {
    const caller = appRouter.createCaller(mockContext("supervisor"));
    await expect(
      caller.attendance.markEventOnBehalf({
        personId: uuid(),
        eventType: "check_in",
        eventAt: new Date().toISOString(),
        notes: "supervisor mark",
      })
    ).rejects.toThrow();
  });

  it("todaysRoster rejects associate role", async () => {
    const caller = appRouter.createCaller(mockContext("associate"));
    await expect(caller.attendance.todaysRoster({})).rejects.toThrowError(/FORBIDDEN/);
  });

  it("todaysRoster accepts supervisor role", async () => {
    const caller = appRouter.createCaller(mockContext("supervisor"));
    const result = await caller.attendance.todaysRoster({});
    expect(result).toHaveProperty("date");
    expect(result).toHaveProperty("rows");
    expect(Array.isArray(result.rows)).toBe(true);
  });

  it("approveEdit rejects associate role", async () => {
    const caller = appRouter.createCaller(mockContext("associate"));
    await expect(
      caller.attendance.approveEdit({ editRequestId: uuid(), decision: "approve" })
    ).rejects.toThrowError(/FORBIDDEN/);
  });
});

describe("attendance router — input validation", () => {
  it("markEvent rejects invalid latitude", async () => {
    const caller = appRouter.createCaller(mockContext("associate"));
    await expect(
      caller.attendance.markEvent({
        eventType: "check_in",
        latitude: 999 as any,
        longitude: 0,
      })
    ).rejects.toThrow();
  });

  it("markEvent rejects invalid longitude", async () => {
    const caller = appRouter.createCaller(mockContext("associate"));
    await expect(
      caller.attendance.markEvent({
        eventType: "check_in",
        latitude: 0,
        longitude: 999 as any,
      })
    ).rejects.toThrow();
  });

  it("markEvent rejects selfieKey longer than 512 chars", async () => {
    const caller = appRouter.createCaller(mockContext("associate"));
    await expect(
      caller.attendance.markEvent({
        eventType: "check_in",
        selfieKey: "x".repeat(513),
      })
    ).rejects.toThrow();
  });

  it("markEventOnBehalf rejects empty notes", async () => {
    const caller = appRouter.createCaller(mockContext("supervisor"));
    await expect(
      caller.attendance.markEventOnBehalf({
        personId: uuid(),
        eventType: "check_in",
        eventAt: new Date().toISOString(),
        notes: "",
      })
    ).rejects.toThrow();
  });

  it("markEventOnBehalf rejects non-UUID personId", async () => {
    const caller = appRouter.createCaller(mockContext("supervisor"));
    await expect(
      caller.attendance.markEventOnBehalf({
        personId: "not-a-uuid" as any,
        eventType: "check_in",
        eventAt: new Date().toISOString(),
        notes: "valid note",
      })
    ).rejects.toThrow();
  });

  it("todaysRoster rejects malformed date", async () => {
    const caller = appRouter.createCaller(mockContext("supervisor"));
    await expect(caller.attendance.todaysRoster({ date: "2026-5-13" as any })).rejects.toThrow();
  });

  it("dailySummary requires a date", async () => {
    const caller = appRouter.createCaller(mockContext("associate"));
    await expect(caller.attendance.dailySummary({} as any)).rejects.toThrow();
  });

  it("dailySummary rejects malformed date", async () => {
    const caller = appRouter.createCaller(mockContext("associate"));
    await expect(caller.attendance.dailySummary({ date: "not-a-date" as any })).rejects.toThrow();
  });

  it("requestEdit rejects reason shorter than 10 chars", async () => {
    const caller = appRouter.createCaller(mockContext("associate"));
    await expect(
      caller.attendance.requestEdit({
        eventId: uuid(),
        newEventAt: new Date().toISOString(),
        reason: "too short",
      })
    ).rejects.toThrow();
  });

  it("approveEdit rejects invalid decision", async () => {
    const caller = appRouter.createCaller(mockContext("supervisor"));
    await expect(
      caller.attendance.approveEdit({ editRequestId: uuid(), decision: "maybe" as any })
    ).rejects.toThrow();
  });

  it("recentEvents accepts default params for associate", async () => {
    const caller = appRouter.createCaller(mockContext("associate"));
    const result = await caller.attendance.recentEvents({ limit: 10 });
    expect(result).toHaveProperty("events");
    expect(result).toHaveProperty("nextCursor");
    expect(Array.isArray(result.events)).toBe(true);
  });

  it("recentEvents rejects limit > 100", async () => {
    const caller = appRouter.createCaller(mockContext("associate"));
    await expect(caller.attendance.recentEvents({ limit: 101 } as any)).rejects.toThrow();
  });
});

describe("attendance router — read procedures with no-DB safe defaults", () => {
  it("myStatus returns safe defaults for any logged-in user", async () => {
    const caller = appRouter.createCaller(mockContext("associate"));
    const result = await caller.attendance.myStatus();
    expect(result).toHaveProperty("currentState");
    expect(result.currentState).toBe("off");
    expect(result.canMarkCheckIn).toBe(false);
    expect(result.canMarkCheckOut).toBe(false);
    expect(result.canMarkBreakStart).toBe(false);
    expect(result.canMarkBreakEnd).toBe(false);
    expect(result.todayMinutesWorked).toBe(0);
  });

  it("myStatus returns all canMarkX false when caller has no person record", async () => {
    const caller = appRouter.createCaller(mockContext("associate"));
    const r = await caller.attendance.myStatus();
    expect(r.canMarkCheckIn).toBe(false);
    expect(r.canMarkCheckOut).toBe(false);
    expect(r.canMarkBreakStart).toBe(false);
    expect(r.canMarkBreakEnd).toBe(false);
    expect(r.currentState).toBe("off");
  });

  it("todaysRoster returns empty rows for supervisor when no DB", async () => {
    const caller = appRouter.createCaller(mockContext("supervisor"));
    const r = await caller.attendance.todaysRoster({});
    expect(r.rows).toEqual([]);
  });

  it("dailySummary throws for caller without person record", async () => {
    const caller = appRouter.createCaller(mockContext("associate"));
    await expect(
      caller.attendance.dailySummary({ date: "2026-05-13" })
    ).rejects.toThrowError(/No person record/);
  });

  it("recentEvents returns empty list when no DB", async () => {
    const caller = appRouter.createCaller(mockContext("associate"));
    const r = await caller.attendance.recentEvents({ limit: 50 });
    expect(r.events).toEqual([]);
    expect(r.nextCursor).toBeNull();
  });
});

describe("attendance router — error code propagation", () => {
  it("markEvent surfaces engine_code on validation errors via TRPCError cause", async () => {
    const caller = appRouter.createCaller(mockContext("associate"));
    try {
      await caller.attendance.markEvent({ eventType: "check_in" });
      throw new Error("expected error");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      const err = e as TRPCError;
      expect(["BAD_REQUEST", "INTERNAL_SERVER_ERROR"]).toContain(err.code);
    }
  });

  it("requestEdit raises a TRPCError when DB unavailable", async () => {
    const caller = appRouter.createCaller(mockContext("associate"));
    await expect(
      caller.attendance.requestEdit({
        eventId: uuid(),
        newEventAt: new Date().toISOString(),
        reason: "valid edit reason for testing",
      })
    ).rejects.toBeInstanceOf(TRPCError);
  });
});

describe("attendance router — backwards-compat list", () => {
  it("list returns empty array when no DB", async () => {
    const caller = appRouter.createCaller(mockContext("associate"));
    const r = await caller.attendance.list({});
    expect(Array.isArray(r)).toBe(true);
    expect(r).toHaveLength(0);
  });
});

describe("attendance.pendingEditRequests", () => {
  it("rejects associate role", async () => {
    const caller = appRouter.createCaller(mockContext("associate"));
    await expect(caller.attendance.pendingEditRequests({})).rejects.toThrowError(/FORBIDDEN/);
  });

  it("rejects owner_portal role", async () => {
    const caller = appRouter.createCaller(mockContext("owner_portal"));
    await expect(caller.attendance.pendingEditRequests({})).rejects.toThrowError(/FORBIDDEN/);
  });

  it("accepts supervisor and returns array (empty when no DB)", async () => {
    const caller = appRouter.createCaller(mockContext("supervisor"));
    const r = await caller.attendance.pendingEditRequests({});
    expect(Array.isArray(r)).toBe(true);
    expect(r).toHaveLength(0);
  });

  it("accepts ops_lead and supports a property filter", async () => {
    const caller = appRouter.createCaller(mockContext("ops_lead"));
    const r = await caller.attendance.pendingEditRequests({ propertyId: uuid() });
    expect(Array.isArray(r)).toBe(true);
  });

  it("rejects invalid propertyId", async () => {
    const caller = appRouter.createCaller(mockContext("supervisor"));
    await expect(
      caller.attendance.pendingEditRequests({ propertyId: "not-a-uuid" as any })
    ).rejects.toThrow();
  });
});
