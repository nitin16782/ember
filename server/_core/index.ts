import "./crypto-polyfill";
import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { randomUUID } from "crypto";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { ENV, validateEnv } from "./env";
import { authRateLimiter, otpRequestLimiter } from "./rateLimit";
import { serveStatic, setupVite } from "./vite";
import { registerAllJobs, stopAllJobs, getJobStatus, buildHttpTrigger } from "../jobs/scheduler";
import { getDb } from "../db";
import { users, authCredentials } from "../../drizzle/schema";
import { hashPassword, validatePasswordStrength } from "../services/auth";

async function startServer() {
  validateEnv();

  const app = express();
  // Railway sits exactly one proxy hop in front of the app.
  // Setting this to 1 (not true) means we only trust the immediate proxy
  // and reject spoofed X-Forwarded-For headers from further upstream.
  app.set("trust proxy", 1);
  const server = createServer(app);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Health check for Railway
  app.get("/healthz", (_req, res) => {
    res.json({
      ok: true,
      service: "ember",
      env: ENV.nodeEnv,
      ts: new Date().toISOString(),
    });
  });

  // Rate-limit auth endpoints before they hit the tRPC handler.
  app.use("/api/trpc/auth.login", authRateLimiter);
  app.use("/api/trpc/auth.refresh", authRateLimiter);
  app.use("/api/trpc/auth.requestOtp", otpRequestLimiter);
  app.use("/api/trpc/auth.requestMagicLink", otpRequestLimiter);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Scheduled-job HTTP triggers — go through the scheduler so manual
  // fires share the same logging + status tracking as scheduled fires.
  app.post("/api/scheduled/idCardExpiry", buildHttpTrigger("idCardExpiry"));
  app.post("/api/scheduled/referralMilestones", buildHttpTrigger("referralMilestones"));
  app.post("/api/scheduled/abscondingDetection", buildHttpTrigger("abscondingDetection"));

  // Cron status — gated on the shared secret (operators / monitoring)
  app.get("/api/internal/cron/status", (req, res) => {
    const header = req.headers["x-ember-cron-secret"];
    if (!ENV.cronSharedSecret || header !== ENV.cronSharedSecret) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    res.json({ jobs: getJobStatus() });
  });

  // One-shot super_admin bootstrap. Gated on ADMIN_BOOTSTRAP_SECRET and
  // self-disables once any user row exists. Must sit BEFORE serveStatic
  // so the React catch-all doesn't intercept it.
  app.post("/api/internal/bootstrap-admin", async (req, res) => {
    const expected = process.env.ADMIN_BOOTSTRAP_SECRET;
    if (!expected) {
      res.status(503).json({ error: "Bootstrap disabled (no secret configured)" });
      return;
    }

    const header = req.headers["x-bootstrap-secret"];
    if (header !== expected) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const { email, password, name, phone } = req.body ?? {};
    if (!email || !password || !name) {
      res.status(400).json({ error: "email, password, name required" });
      return;
    }

    const strength = validatePasswordStrength(password);
    if (!strength.ok) {
      res.status(400).json({ error: strength.reason });
      return;
    }

    try {
      const db = await getDb();
      if (!db) {
        res.status(500).json({ error: "DB unavailable" });
        return;
      }

      const existing = await db.select().from(users).limit(1);
      if (existing.length > 0) {
        res.status(403).json({ error: "Bootstrap already complete (users exist)" });
        return;
      }

      const userId = randomUUID();
      await db.insert(users).values({
        id: userId,
        email: email.toLowerCase(),
        phone: phone ?? null,
        name,
        role: "super_admin",
        isActive: true,
      });

      const passwordHash = await hashPassword(password);
      await db.insert(authCredentials).values({
        id: randomUUID(),
        userId,
        passwordHash,
      });

      console.log(`[bootstrap] created super_admin: ${email} (id=${userId})`);
      res.json({ ok: true, userId, email });
    } catch (err) {
      console.error("[bootstrap] error:", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
  });

  if (ENV.nodeEnv === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  server.listen(ENV.port, () => {
    console.log(`[ember] listening on http://localhost:${ENV.port}/`);
    console.log(`[ember] env=${ENV.nodeEnv}`);

    // Register scheduled jobs only after HTTP is up. Failures must not
    // crash the server — log and continue serving requests.
    try {
      registerAllJobs();
    } catch (err) {
      console.error("[cron] failed to register jobs:", err);
    }
  });

  const shutdown = (signal: string) => {
    console.log(`[ember] ${signal} received, shutting down`);
    stopAllJobs();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

startServer().catch((err) => {
  console.error("[ember] fatal startup error:", err);
  process.exit(1);
});
