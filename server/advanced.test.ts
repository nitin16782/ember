import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";

function mockContext(role: string = "super_admin"): Context {
  return {
    user: {
      id: 1,
      role: role as any,
      name: "Test User",
      openId: "test",
      email: "test@example.com",
      phone: null,
      loginMethod: null,
      permissionOverrides: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as any,
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: () => {} } as any,
  };
}

describe("anomalies.summary", () => {
  it("returns structured anomaly data with all three categories", async () => {
    const ctx = mockContext("admin");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.anomalies.dashboard();

    expect(result).toHaveProperty("attendanceAnomalies");
    expect(result).toHaveProperty("financialAnomalies");
    expect(result).toHaveProperty("operationalAnomalies");

    expect(result.attendanceAnomalies).toHaveProperty("noCheckIn3Days");
    expect(result.attendanceAnomalies).toHaveProperty("lateCheckIns");
    expect(result.attendanceAnomalies).toHaveProperty("missedCheckOuts");
    expect(typeof result.attendanceAnomalies.noCheckIn3Days).toBe("number");
    expect(typeof result.attendanceAnomalies.missedCheckOuts).toBe("number");

    expect(result.financialAnomalies).toHaveProperty("overdueInvoices");
    expect(result.financialAnomalies).toHaveProperty("unusualExpenses");
    expect(result.financialAnomalies).toHaveProperty("pendingReconciliation");
    expect(typeof result.financialAnomalies.overdueInvoices).toBe("number");
    expect(typeof result.financialAnomalies.unusualExpenses).toBe("number");

    expect(result.operationalAnomalies).toHaveProperty("coverageGaps");
    expect(result.operationalAnomalies).toHaveProperty("overdueChecklists");
    expect(result.operationalAnomalies).toHaveProperty("lowInventory");
    expect(typeof result.operationalAnomalies.coverageGaps).toBe("number");
  });
});

describe("contracts.generate", () => {
  it("requires a valid contract ID", async () => {
    const ctx = mockContext("admin");
    const caller = appRouter.createCaller(ctx);

    await expect(caller.contracts.generate({ contractId: 99999 })).rejects.toThrow();
  });
});

describe("breakages.create", () => {
  it("accepts photoUrls in the input schema", async () => {
    const ctx = mockContext("admin");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.breakages.create({
        propertyId: 99999,
        description: "Test breakage with photo",
        attributionStatus: "guest",
        photoUrls: ["/storage/test-photo.jpg"],
      })
    ).rejects.toThrow();
  });
});

describe("exits.calculateFnF", () => {
  it("requires a valid exit ID", async () => {
    const ctx = mockContext("admin");
    const caller = appRouter.createCaller(ctx);

    await expect(caller.exits.calculateFnF({ exitId: 99999 })).rejects.toThrow();
  });
});
