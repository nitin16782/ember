import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, or } from "drizzle-orm";
import { randomUUID } from "crypto";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import type { Context } from "../_core/context";
import { getDb } from "../db";
import { users, authCredentials, type User } from "../../drizzle/schema";
import {
  hashPassword, verifyPassword, validatePasswordStrength,
  issueTokens, rotateRefreshToken, revokeRefreshToken, revokeAllUserTokens,
  generateOtp, verifyOtp, generateMagicLink, consumeMagicLink,
  recordFailedLogin, clearFailedLogins, isAccountLocked,
} from "../services/auth";
import { sendEmail, magicLinkEmail, otpEmail } from "../services/email";
import { sendSms, otpSms } from "../services/sms";
import { ENV } from "../_core/env";

// ─── Helpers ────────────────────────────────────────────────────────

function clientCtx(ctx: Context): { userAgent?: string; ip?: string } {
  const ua = ctx.req?.headers?.["user-agent"];
  const ip = ctx.req?.ip ?? ctx.req?.socket?.remoteAddress;
  return {
    userAgent: typeof ua === "string" ? ua : undefined,
    ip: typeof ip === "string" ? ip : undefined,
  };
}

async function findUserByIdentifier(identifier: string): Promise<User | null> {
  const db = await getDb();
  if (!db) return null;
  const trimmed = identifier.trim();
  const normalized = trimmed.toLowerCase();
  const [user] = await db.select().from(users)
    .where(or(eq(users.email, normalized), eq(users.phone, trimmed)))
    .limit(1);
  return user ?? null;
}

function sanitizeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    name: user.name,
    role: user.role,
    permissionOverrides: user.permissionOverrides,
    lastSignedInAt: user.lastSignedInAt,
  };
}

// ─── Router ─────────────────────────────────────────────────────────

export const authRouter = router({
  /** Password login — staff path */
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const user = await findUserByIdentifier(input.email);
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
      if (!user.isActive) throw new TRPCError({ code: "FORBIDDEN", message: "Account is disabled" });

      if (await isAccountLocked(user.id)) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Account locked. Try again in 15 minutes." });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [cred] = await db.select().from(authCredentials)
        .where(eq(authCredentials.userId, user.id)).limit(1);
      if (!cred) throw new TRPCError({ code: "UNAUTHORIZED", message: "Password not set. Use magic link to sign in." });

      const ok = await verifyPassword(input.password, cred.passwordHash);
      if (!ok) {
        const { locked } = await recordFailedLogin(user.id);
        if (locked) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Account locked. Try again in 15 minutes." });
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
      }

      await clearFailedLogins(user.id);
      const tokens = await issueTokens(user, clientCtx(ctx));
      return {
        user: sanitizeUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt.toISOString(),
      };
    }),

  /** Refresh tokens — rotates the refresh token */
  refresh: publicProcedure
    .input(z.object({ refreshToken: z.string().min(32) }))
    .mutation(async ({ input, ctx }) => {
      const next = await rotateRefreshToken(input.refreshToken, clientCtx(ctx));
      if (!next) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or expired refresh token" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { decodeJwt } = await import("jose");
      const subject = decodeJwt(next.accessToken).sub as string | undefined;
      const [user] = subject
        ? await db.select().from(users).where(eq(users.id, subject)).limit(1)
        : [];

      return {
        user: user ? sanitizeUser(user) : null,
        accessToken: next.accessToken,
        refreshToken: next.refreshToken,
        expiresAt: next.expiresAt.toISOString(),
      };
    }),

  /** Logout — revokes the supplied refresh token */
  logout: publicProcedure
    .input(z.object({ refreshToken: z.string().min(32) }))
    .mutation(async ({ input }) => {
      await revokeRefreshToken(input.refreshToken);
      return { ok: true };
    }),

  /** Logout from all devices — revokes every active token for the user */
  logoutAll: protectedProcedure
    .mutation(async ({ ctx }) => {
      await revokeAllUserTokens(ctx.user.id);
      return { ok: true };
    }),

  /** Request OTP — associate + owner login path */
  requestOtp: publicProcedure
    .input(z.object({
      identifier: z.string().min(3),
      purpose: z.enum(["login", "password_reset", "phone_verify", "email_verify"]).default("login"),
    }))
    .mutation(async ({ input }) => {
      const isPhone = /^[+\d][\d\s-]+$/.test(input.identifier);
      const identifierType: "phone" | "email" = isPhone ? "phone" : "email";
      const identifier = isPhone
        ? input.identifier.replace(/\s/g, "")
        : input.identifier.trim().toLowerCase();

      if (input.purpose === "login") {
        const user = await findUserByIdentifier(identifier);
        if (!user || !user.isActive) {
          await new Promise(r => setTimeout(r, 200));
          return { ok: true, expiresInMin: 10 };
        }
      }

      const { code } = await generateOtp(identifier, identifierType, input.purpose);

      if (identifierType === "phone") {
        await sendSms({ to: identifier, body: otpSms(code, 10) });
      } else {
        const user = await findUserByIdentifier(identifier);
        const name = user?.name ?? "there";
        const tmpl = otpEmail(name, code, 10);
        await sendEmail({ to: identifier, subject: tmpl.subject, html: tmpl.html, text: tmpl.text });
      }

      return { ok: true, expiresInMin: 10 };
    }),

  /** Verify OTP and issue tokens */
  verifyOtp: publicProcedure
    .input(z.object({
      identifier: z.string().min(3),
      code: z.string().length(6),
    }))
    .mutation(async ({ input, ctx }) => {
      const isPhone = /^[+\d][\d\s-]+$/.test(input.identifier);
      const identifier = isPhone
        ? input.identifier.replace(/\s/g, "")
        : input.identifier.trim().toLowerCase();

      const result = await verifyOtp(identifier, input.code, "login");
      if (!result.ok) throw new TRPCError({ code: "UNAUTHORIZED", message: result.reason });

      const user = await findUserByIdentifier(identifier);
      if (!user || !user.isActive) throw new TRPCError({ code: "UNAUTHORIZED", message: "Account not found" });

      const tokens = await issueTokens(user, clientCtx(ctx));
      return {
        user: sanitizeUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt.toISOString(),
      };
    }),

  /** Request a magic link via email */
  requestMagicLink: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const user = await findUserByIdentifier(input.email);
      if (user && user.isActive) {
        const { token } = await generateMagicLink(user.id, "login");
        const base = ENV.isProduction
          ? `https://${ENV.staffHostname}`
          : "http://localhost:3000";
        const url = `${base}/auth/magic?token=${token}`;
        const tmpl = magicLinkEmail(user.name ?? "there", url, 15);
        await sendEmail({ to: input.email, subject: tmpl.subject, html: tmpl.html, text: tmpl.text });
      } else {
        await new Promise(r => setTimeout(r, 200));
      }
      return { ok: true, expiresInMin: 15 };
    }),

  /** Consume a magic link */
  consumeMagicLink: publicProcedure
    .input(z.object({ token: z.string().length(64) }))
    .mutation(async ({ input, ctx }) => {
      const user = await consumeMagicLink(input.token);
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or expired link" });
      const tokens = await issueTokens(user, clientCtx(ctx));
      return {
        user: sanitizeUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt.toISOString(),
      };
    }),

  /** Currently authenticated user */
  me: protectedProcedure.query(({ ctx }) => sanitizeUser(ctx.user)),

  /** Change password — requires current password */
  changePassword: protectedProcedure
    .input(z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(10),
    }))
    .mutation(async ({ input, ctx }) => {
      const strength = validatePasswordStrength(input.newPassword);
      if (!strength.ok) throw new TRPCError({ code: "BAD_REQUEST", message: strength.reason });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [cred] = await db.select().from(authCredentials)
        .where(eq(authCredentials.userId, ctx.user.id)).limit(1);
      if (!cred) throw new TRPCError({ code: "BAD_REQUEST", message: "Password not set; use set-password flow" });

      const ok = await verifyPassword(input.currentPassword, cred.passwordHash);
      if (!ok) throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password incorrect" });

      const newHash = await hashPassword(input.newPassword);
      await db.update(authCredentials)
        .set({ passwordHash: newHash, passwordSetAt: new Date(), mustChangePassword: false })
        .where(eq(authCredentials.userId, ctx.user.id));

      await revokeAllUserTokens(ctx.user.id);
      const tokens = await issueTokens(ctx.user, clientCtx(ctx));
      return { ok: true, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
    }),

  /** Set initial password — first login flow */
  setInitialPassword: protectedProcedure
    .input(z.object({ newPassword: z.string().min(10) }))
    .mutation(async ({ input, ctx }) => {
      const strength = validatePasswordStrength(input.newPassword);
      if (!strength.ok) throw new TRPCError({ code: "BAD_REQUEST", message: strength.reason });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [existing] = await db.select().from(authCredentials)
        .where(eq(authCredentials.userId, ctx.user.id)).limit(1);
      if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "Password already set; use changePassword" });

      const passwordHash = await hashPassword(input.newPassword);
      await db.insert(authCredentials).values({
        id: randomUUID(),
        userId: ctx.user.id,
        passwordHash,
      });

      return { ok: true };
    }),
});
