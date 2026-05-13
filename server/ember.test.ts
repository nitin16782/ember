import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(overrides?: Partial<AuthenticatedUser>): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-001",
    email: "admin@ember.test",
    name: "Test Admin",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
      ip: "127.0.0.1",
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("auth.me", () => {
  it("returns the authenticated user", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.name).toBe("Test Admin");
    expect(result?.role).toBe("admin");
  });

  it("returns null for unauthenticated requests", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

describe("dashboard.stats", () => {
  it("returns stats object with expected shape", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.dashboard.stats();
    expect(stats).toHaveProperty("people");
    expect(stats).toHaveProperty("properties");
    expect(stats).toHaveProperty("expenses");
    expect(stats).toHaveProperty("leaves");
    expect(stats.people).toHaveProperty("total");
    expect(stats.people).toHaveProperty("active");
    expect(stats.properties).toHaveProperty("total");
    expect(stats.properties).toHaveProperty("live");
    expect(typeof stats.expenses.pending).toBe("number");
    expect(typeof stats.leaves.pending).toBe("number");
  });
});

describe("people", () => {
  it("lists people with default params", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.people.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("gets people stats", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.people.stats();
    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("active");
    expect(typeof stats.total).toBe("number");
  });

  it("rejects unauthenticated access to people.list", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.people.list({})).rejects.toThrow();
  });
});

describe("properties", () => {
  it("lists properties with default params", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.properties.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("gets property stats", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.properties.stats();
    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("live");
  });
});

describe("attendance", () => {
  it("lists shift events with default params", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.attendance.list({});
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("leave", () => {
  it("lists leave applications", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.leave.list({});
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("expenses", () => {
  it("lists expenses", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.expenses.list({});
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("invoices", () => {
  it("lists invoices", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.invoices.list({});
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("payments", () => {
  it("lists payments", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.payments.list({});
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("vendors", () => {
  it("lists vendors", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.vendors.list({});
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("inventory", () => {
  it("lists inventory items", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.inventory.list({});
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("bookings", () => {
  it("lists bookings", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.bookings.list({});
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("assignments", () => {
  it("lists assignments", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.assignments.list({});
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("hiring", () => {
  it("lists requisitions", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.hiring.requisitions({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("lists candidates", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.hiring.candidates({});
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("dailyOps", () => {
  it("lists checklists", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.dailyOps.checklists({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("lists breakages", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.dailyOps.breakages({});
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("training", () => {
  it("lists training modules", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.training.modules({});
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("auditLog", () => {
  it("lists audit entries", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auditLog.list({});
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("requests", () => {
  it("lists owner requests", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.requests.list({});
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("payroll", () => {
  it("lists payroll runs", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.payroll.runs({});
    expect(Array.isArray(result)).toBe(true);
  });
});
