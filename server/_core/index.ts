import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { ENV, validateEnv } from "./env";
import { authRateLimiter, otpRequestLimiter } from "./rateLimit";
import { serveStatic, setupVite } from "./vite";

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

  // Auth routes (mounted in Prompt 3)
  // Webhook routes (mounted in Phase 6 — Cashfree)
  // Scheduled job triggers (mounted in Prompt 7 — node-cron)

  if (ENV.nodeEnv === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  server.listen(ENV.port, () => {
    console.log(`[ember] listening on http://localhost:${ENV.port}/`);
    console.log(`[ember] env=${ENV.nodeEnv}`);
  });

  const shutdown = (signal: string) => {
    console.log(`[ember] ${signal} received, shutting down`);
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
