import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Will be wired to real auth in Prompt 3. Throws until then so every
// existing protected route returns 401 — this keeps us honest about
// which routes need auth.
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Auth not yet implemented" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

// Same gate as protectedProcedure until Prompt 3 introduces role checks.
export const adminProcedure = protectedProcedure;
