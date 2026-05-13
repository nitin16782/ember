import * as cron from "node-cron";
import type { ScheduledTask } from "node-cron";
import type { Request, Response } from "express";
import { ENV } from "../_core/env";
import {
  idCardExpiryJob,
  referralMilestonesJob,
  abscondingDetectionJob,
} from "../scheduled/handlers";

// ─── Types ──────────────────────────────────────────────────────────

export interface JobDefinition {
  name: string;
  /** node-cron expression. 5 or 6 fields. Timezone from ENV.cronTimezone. */
  cron: string;
  /** The actual work — should be idempotent and self-contained. Any return value is ignored. */
  handler: () => Promise<unknown>;
  /** Description shown in logs. */
  description: string;
  /** If false, registered but skipped at trigger time. Useful for staged rollouts. */
  enabled?: boolean;
}

interface RegisteredJob {
  definition: JobDefinition;
  task: ScheduledTask;
  lastRunAt: Date | null;
  lastRunStatus: "ok" | "error" | "running" | null;
  lastRunError: string | null;
  lastRunDurationMs: number | null;
  totalRuns: number;
}

// ─── State (module-singleton) ───────────────────────────────────────

const registry: Map<string, RegisteredJob> = new Map();

// ─── Wrapper that adds logging, error isolation, and metrics ────────

function wrapHandler(def: JobDefinition): () => Promise<void> {
  return async () => {
    const entry = registry.get(def.name);
    if (!entry) return;

    if (def.enabled === false) {
      console.log(`[cron] skipped ${def.name} (disabled)`);
      return;
    }

    const start = Date.now();
    entry.lastRunStatus = "running";
    entry.lastRunAt = new Date(start);

    console.log(`[cron] starting ${def.name}`);

    try {
      await def.handler();
      const duration = Date.now() - start;
      entry.lastRunStatus = "ok";
      entry.lastRunDurationMs = duration;
      entry.lastRunError = null;
      entry.totalRuns += 1;
      console.log(`[cron] ok ${def.name} (${duration}ms)`);
    } catch (err) {
      const duration = Date.now() - start;
      entry.lastRunStatus = "error";
      entry.lastRunDurationMs = duration;
      entry.lastRunError = err instanceof Error ? err.message : String(err);
      entry.totalRuns += 1;
      console.error(`[cron] FAILED ${def.name} (${duration}ms):`, err);
      // Errors are swallowed — one job's failure must not stop other jobs.
    }
  };
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Register a cron job. Idempotent — re-registering the same name replaces
 * the previous registration (useful for hot-reload during dev).
 */
export function registerJob(def: JobDefinition): void {
  const existing = registry.get(def.name);
  if (existing) {
    try { existing.task.stop(); } catch { /* ignore */ }
    registry.delete(def.name);
  }

  if (!cron.validate(def.cron)) {
    throw new Error(`[cron] invalid expression for ${def.name}: ${def.cron}`);
  }

  const task = cron.schedule(def.cron, wrapHandler(def), {
    name: def.name,
    timezone: ENV.cronTimezone,
    noOverlap: true,
  });

  registry.set(def.name, {
    definition: def,
    task,
    lastRunAt: null,
    lastRunStatus: null,
    lastRunError: null,
    lastRunDurationMs: null,
    totalRuns: 0,
  });

  console.log(`[cron] registered ${def.name} (${def.cron} ${ENV.cronTimezone})`);
}

/**
 * Manually trigger a registered job by name. Used by tests and the
 * super-admin "run now" tRPC mutation.
 */
export async function runJobNow(name: string): Promise<void> {
  const entry = registry.get(name);
  if (!entry) throw new Error(`[cron] no job named ${name}`);
  await wrapHandler(entry.definition)();
}

/**
 * Status snapshot of every registered job. Used by /api/internal/cron/status
 * and the cron.status tRPC procedure.
 */
export function getJobStatus() {
  return Array.from(registry.values()).map((entry: RegisteredJob) => ({
    name: entry.definition.name,
    description: entry.definition.description,
    cron: entry.definition.cron,
    enabled: entry.definition.enabled !== false,
    lastRunAt: entry.lastRunAt?.toISOString() ?? null,
    lastRunStatus: entry.lastRunStatus,
    lastRunError: entry.lastRunError,
    lastRunDurationMs: entry.lastRunDurationMs,
    totalRuns: entry.totalRuns,
  }));
}

/**
 * Build an Express handler that runs a registered job by name when the
 * caller provides the cron shared secret. Used by /api/scheduled/* so
 * the manual-trigger path goes through the same wrapHandler logging /
 * status tracking as the scheduled fire.
 */
export function buildHttpTrigger(name: string) {
  return async (req: Request, res: Response) => {
    const header = req.headers["x-ember-cron-secret"];
    if (!ENV.cronSharedSecret || header !== ENV.cronSharedSecret) {
      res.status(403).json({ error: "cron-only" });
      return;
    }
    try {
      await runJobNow(name);
      res.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: message });
    }
  };
}

/**
 * Stop and unregister all jobs. Called on SIGTERM for graceful shutdown.
 */
export function stopAllJobs(): void {
  console.log(`[cron] stopping ${registry.size} jobs`);
  for (const entry of Array.from(registry.values())) {
    try {
      const result = entry.task.stop();
      if (result && typeof (result as Promise<void>).then === "function") {
        (result as Promise<void>).catch((err) =>
          console.warn("[cron] async stop failed:", entry.definition.name, err)
        );
      }
    } catch (err) {
      console.warn("[cron] stop failed:", entry.definition.name, err);
    }
  }
  registry.clear();
}

// ─── Job registration: bootstrap call ───────────────────────────────

/**
 * Register every Phase 1 job. Called at server startup.
 *
 * Schedule conventions:
 *   - Most daily jobs run between 04:00 and 14:00 Asia/Kolkata
 *   - Stagger by minutes to avoid simultaneous DB/IO bursts
 *   - Heavy jobs (reports, payroll-touching) run pre-dawn for least contention
 *   - Notification-style jobs run after sunrise so users see them promptly
 */
export function registerAllJobs(): void {
  if (!ENV.cronEnabled) {
    console.log("[cron] disabled via CRON_ENABLED=false; skipping all registrations");
    return;
  }

  registerJob({
    name: "idCardExpiry",
    cron: "0 7 * * *",                   // daily 07:00 IST
    handler: idCardExpiryJob,
    description: "Expire ID cards past valid_until; flag for regeneration",
  });

  registerJob({
    name: "referralMilestones",
    cron: "0 8 * * *",                   // daily 08:00 IST
    handler: referralMilestonesJob,
    description: "Pay referral bounty tranches at 30d and 90d milestones",
  });

  registerJob({
    name: "abscondingDetection",
    cron: "0 4 * * *",                   // daily 04:00 IST
    handler: abscondingDetectionJob,
    description: "Flag associates with attendance gaps; escalate per threshold",
  });

  console.log(`[cron] all jobs registered (${registry.size} total)`);
}
