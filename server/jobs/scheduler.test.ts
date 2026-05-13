import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { registerJob, runJobNow, getJobStatus, stopAllJobs } from "./scheduler";

describe("scheduler", () => {
  beforeEach(() => {
    stopAllJobs();
  });

  afterEach(() => {
    stopAllJobs();
  });

  it("registers a job and lists it in status", () => {
    registerJob({
      name: "test-1",
      cron: "0 0 * * *",
      handler: async () => {},
      description: "Test job",
    });
    const status = getJobStatus();
    expect(status).toHaveLength(1);
    expect(status[0].name).toBe("test-1");
    expect(status[0].cron).toBe("0 0 * * *");
    expect(status[0].lastRunAt).toBeNull();
    expect(status[0].totalRuns).toBe(0);
  });

  it("re-registering a job replaces the prior registration", () => {
    registerJob({
      name: "test-2",
      cron: "0 0 * * *",
      handler: async () => {},
      description: "Test job v1",
    });
    registerJob({
      name: "test-2",
      cron: "0 6 * * *",
      handler: async () => {},
      description: "Test job v2",
    });
    const status = getJobStatus();
    const t2 = status.find((s) => s.name === "test-2");
    expect(t2?.cron).toBe("0 6 * * *");
    expect(t2?.description).toBe("Test job v2");
  });

  it("manually triggers a job and tracks success", async () => {
    let ran = false;
    registerJob({
      name: "test-3",
      cron: "0 0 * * *",
      handler: async () => { ran = true; },
      description: "Test job",
    });

    await runJobNow("test-3");
    expect(ran).toBe(true);

    const status = getJobStatus();
    const t3 = status.find((s) => s.name === "test-3");
    expect(t3?.lastRunStatus).toBe("ok");
    expect(t3?.totalRuns).toBe(1);
    expect(t3?.lastRunDurationMs).toBeGreaterThanOrEqual(0);
  });

  it("captures error from a failing job without throwing to caller", async () => {
    registerJob({
      name: "test-4",
      cron: "0 0 * * *",
      handler: async () => { throw new Error("boom"); },
      description: "Test failure",
    });

    await runJobNow("test-4");

    const status = getJobStatus();
    const t4 = status.find((s) => s.name === "test-4");
    expect(t4?.lastRunStatus).toBe("error");
    expect(t4?.lastRunError).toBe("boom");
    expect(t4?.totalRuns).toBe(1);
  });

  it("skips a disabled job", async () => {
    let ran = false;
    registerJob({
      name: "test-5",
      cron: "0 0 * * *",
      handler: async () => { ran = true; },
      description: "Disabled",
      enabled: false,
    });

    await runJobNow("test-5");
    expect(ran).toBe(false);
  });

  it("rejects invalid cron expressions", () => {
    expect(() => registerJob({
      name: "test-6",
      cron: "not a valid expression",
      handler: async () => {},
      description: "Should reject",
    })).toThrow();
  });
});
