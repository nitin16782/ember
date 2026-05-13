import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { ENV, validateEnv } from "./env";
import { authRateLimiter, otpRequestLimiter } from "./rateLimit";
import { serveStatic, setupVite } from "./vite";
import { registerAllJobs, stopAllJobs, getJobStatus, buildHttpTrigger } from "../jobs/scheduler";

async function startServer() {
  validateEnv();

  const app = express();
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
