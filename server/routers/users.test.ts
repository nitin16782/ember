import { randomUUID } from "crypto";
import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../routers";
import type { Context } from "../_core/context";

const uuid = () => randomUUID();

function mockContext(role: string = "super_admin"): Context {
  return {
    user: {
      id: uuid(),
      email: "admin@example.com",
      phone: null,
      name: "Admin User",
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

describe("users router — auth gates", () => {
  it("list rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(unauthContext());
    await expect(caller.users.list({})).rejects.toThrow();
  });

  it("list rejects associate role", async () => {
    const caller = appRouter.createCaller(mockContext("associate"));
    await expect(caller.users.list({})).rejects.toThrowError(/FORBIDDEN/);
  });

  it("list rejects ops_lead (admin-only view)", async () => {
    const caller = appRouter.createCaller(mockContext("ops_lead"));
    await expect(caller.users.list({})).rejects.toThrowError(/FORBIDDEN/);
  });

  it("list accepts super_admin and returns paginated shape", async () => {
    const caller = appRouter.createCaller(mockContext("super_admin"));
    const r = await caller.users.list({});
    expect(r).toHaveProperty("users");
    expect(r).toHaveProperty("total");
    expect(Array.isArray(r.users)).toBe(true);
  });

  it("list accepts central_admin", async () => {
    const caller = appRouter.createCaller(mockContext("central_admin"));
    const r = await caller.users.list({});
    expect(Array.isArray(r.users)).toBe(true);
  });

  it("create rejects supervisor role", async () => {
    const caller = appRouter.createCaller(mockContext("supervisor"));
    await expect(
      caller.users.create({
        email: "x@example.com",
        name: "X",
        role: "associate",
        sendMagicLink: false,
      })
    ).rejects.toThrowError(/FORBIDDEN/);
  });

  it("setActive rejects property_manager role", async () => {
    const caller = appRouter.createCaller(mockContext("property_manager"));
    await expect(
      caller.users.setActive({ id: uuid(), isActive: false })
    ).rejects.toThrowError(/FORBIDDEN/);
  });

  it("sendMagicLink rejects associate role", async () => {
    const caller = appRouter.createCaller(mockContext("associate"));
    await expect(
      caller.users.sendMagicLink({ id: uuid() })
    ).rejects.toThrowError(/FORBIDDEN/);
  });

  it("roleCounts rejects ops_lead", async () => {
    const caller = appRouter.createCaller(mockContext("ops_lead"));
    await expect(caller.users.roleCounts()).rejects.toThrowError(/FORBIDDEN/);
  });

  it("roleCounts accepts super_admin and returns a record per role", async () => {
    const caller = appRouter.createCaller(mockContext("super_admin"));
    const r = await caller.users.roleCounts();
    expect(r).toHaveProperty("super_admin");
    expect(r).toHaveProperty("associate");
    expect(typeof r.super_admin).toBe("number");
  });
});

describe("users router — input validation", () => {
  it("create rejects invalid email", async () => {
    const caller = appRouter.createCaller(mockContext("super_admin"));
    await expect(
      caller.users.create({
        email: "not-an-email",
        name: "X",
        role: "associate",
        sendMagicLink: false,
      } as any)
    ).rejects.toThrow();
  });

  it("create rejects unknown role", async () => {
    const caller = appRouter.createCaller(mockContext("super_admin"));
    await expect(
      caller.users.create({
        email: "x@example.com",
        name: "X",
        role: "ceo" as any,
        sendMagicLink: false,
      })
    ).rejects.toThrow();
  });

  it("create rejects associate without phone", async () => {
    const caller = appRouter.createCaller(mockContext("super_admin"));
    await expect(
      caller.users.create({
        email: "associate@example.com",
        name: "Test Associate",
        role: "associate",
        sendMagicLink: false,
      })
    ).rejects.toThrowError(/phone number/i);
  });

  it("create rejects empty name", async () => {
    const caller = appRouter.createCaller(mockContext("super_admin"));
    await expect(
      caller.users.create({
        email: "x@example.com",
        name: "",
        role: "ops_lead",
        sendMagicLink: false,
      })
    ).rejects.toThrow();
  });

  it("update rejects non-UUID id", async () => {
    const caller = appRouter.createCaller(mockContext("super_admin"));
    await expect(
      caller.users.update({ id: "not-a-uuid" as any, name: "Bob" })
    ).rejects.toThrow();
  });

  it("update raises when DB unavailable but auth ok", async () => {
    const caller = appRouter.createCaller(mockContext("super_admin"));
    await expect(
      caller.users.update({ id: uuid(), name: "Bob" })
    ).rejects.toThrow();
  });

  it("list rejects limit > 200", async () => {
    const caller = appRouter.createCaller(mockContext("super_admin"));
    await expect(caller.users.list({ limit: 250 } as any)).rejects.toThrow();
  });

  it("list accepts role filter", async () => {
    const caller = appRouter.createCaller(mockContext("super_admin"));
    const r = await caller.users.list({ role: "ops_lead" });
    expect(Array.isArray(r.users)).toBe(true);
  });

  it("list accepts isActive filter", async () => {
    const caller = appRouter.createCaller(mockContext("super_admin"));
    const r = await caller.users.list({ isActive: true });
    expect(Array.isArray(r.users)).toBe(true);
  });

  it("sendMagicLink rejects non-UUID id", async () => {
    const caller = appRouter.createCaller(mockContext("super_admin"));
    await expect(
      caller.users.sendMagicLink({ id: "not-a-uuid" as any })
    ).rejects.toThrow();
  });
});

describe("users router — returns from no-DB queries", () => {
  it("list returns empty array + total 0 when no DB", async () => {
    const caller = appRouter.createCaller(mockContext("super_admin"));
    const r = await caller.users.list({});
    expect(r.users).toEqual([]);
    expect(r.total).toBe(0);
  });

  it("roleCounts returns zeros for every role when no DB", async () => {
    const caller = appRouter.createCaller(mockContext("super_admin"));
    const r = await caller.users.roleCounts();
    expect(r.super_admin).toBe(0);
    expect(r.associate).toBe(0);
    expect(r.owner_portal).toBe(0);
  });
});
