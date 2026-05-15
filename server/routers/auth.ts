import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, or } from "drizzle-orm";
import { randomUUID } from "crypto";
import { router, publicProcedure, protectedProcedure, rolesProcedure } from "../_core/trpc";
import type { Context } from "../_core/context";
import { getDb } from "../db";
import { users, authCredentials, people, type User } from "../../drizzle/schema";
import {
  hashPassword, verifyPassword, validatePasswordStrength, validatePin,
  issueTokens, rotateRefreshToken, revokeRefreshToken, revokeAllUserTokens,
  generateOtp, verifyOtp, generateMagicLink, consumeMagicLink,
  recordFailedLogin, clearFailedLogins, isAccountLocked,
} from "../services/auth";
import { sendEmail, magicLinkEmail, otpEmail } from "../services/email";
import { sendOtpSms, normalisePhone } from "../services/sms";
import { sendOtpWhatsApp, isWhatsAppOtpConfigured } from "../services/whatsapp";
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

/**
 * Resolve a user from a raw login identifier (email or phone).
 *
 * For phones, accept any common format the operator might type or that a
 * legacy row might already be stored in:
 *   "9711619114", "+919711619114", "919711619114", "+91 97116 19114"
 * all resolve to the same user. We canonicalise the input to the digits-
 * only form (the same one MSG91 expects) and additionally OR-match on a
 * few common variants so rows written before phone canonicalisation
 * landed still resolve.
 */
async function findUserByIdentifier(identifier: string): Promise<User | null> {
  const db = await getDb();
  if (!db) return null;
  const trimmed = identifier.trim();
  const isPhoneLike = /^[+\d][\d\s-]+$/.test(trimmed);

  if (isPhoneLike) {
    const canonical = normalisePhone(trimmed); // digits only, e.g. 919711619114
    const variants = new Set<string>([
      trimmed,
      trimmed.replace(/\s/g, ""),
      canonical,
      `+${canonical}`,
    ]);
    // Bare 10-digit Indian number → also try with country code
    if (canonical.length > 10) variants.add(canonical.slice(-10));

    const [user] = await db.select().from(users)
      .where(or(...Array.from(variants).map((v) => eq(users.phone, v))))
      .limit(1);
    if (!user) {
      console.warn(`[auth] no user found for phone variants: ${Array.from(variants).join(", ")}`);
    }
    return user ?? null;
  }

  const normalized = trimmed.toLowerCase();
  const [user] = await db.select().from(users)
    .where(eq(users.email, normalized))
    .limit(1);
  if (!user) {
    console.warn(`[auth] no user found for email: ${normalized}`);
  }
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
      // Canonicalize phones to the digits-only form so OTP storage,
      // user lookup, and MSG91 delivery all agree on the same key.
      const identifier = isPhone
        ? normalisePhone(input.identifier)
        : input.identifier.trim().toLowerCase();

      if (input.purpose === "login") {
        const user = await findUserByIdentifier(identifier);
        if (!user || !user.isActive) {
          console.warn(`[auth] requestOtp: no active user for identifier "${identifier}" — returning ok without sending`);
          await new Promise(r => setTimeout(r, 200));
          return { ok: true, expiresInMin: 10 };
        }
      }

      const { code } = await generateOtp(identifier, identifierType, input.purpose);

      if (identifierType === "phone") {
        // Prefer WhatsApp when the operator has set up a Meta-approved
        // template — bypasses TRAI/DLT, which silently drops SMS for
        // unregistered templates in India. Falls back to SMS when WA
        // isn't configured.
        if (isWhatsAppOtpConfigured()) {
          const result = await sendOtpWhatsApp({ to: identifier, code });
          if (!result.ok) {
            console.error("[auth] OTP WhatsApp delivery failed:", result.error);
          }
        } else {
          const result = await sendOtpSms({ to: identifier, code });
          if (!result.ok) {
            // Log but don't fail the request — we don't leak whether
            // a number is valid. User retries if no code arrives.
            console.error("[auth] OTP SMS delivery failed:", result.error);
          }
        }
      } else {
        const user = await findUserByIdentifier(identifier);
        const name = user?.name ?? "there";
        const tmpl = otpEmail(name, code, 10);
        const result = await sendEmail({ to: identifier, subject: tmpl.subject, html: tmpl.html, text: tmpl.text });
        if (!result.ok) {
          // Mirror the SMS path: log internally but don't leak success/failure to caller.
          console.error("[auth] OTP email delivery failed:", result.error);
        }
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
        ? normalisePhone(input.identifier)
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
        const result = await sendEmail({ to: input.email, subject: tmpl.subject, html: tmpl.html, text: tmpl.text });
        if (!result.ok) {
          // Log internally; response stays generic so we don't leak whether
          // the email exists in the system.
          console.error("[auth] Magic-link email delivery failed:", result.error);
        }
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

  /**
   * Associate login: employee code + 6-digit PIN.
   *
   * Path chosen over phone OTP because (a) many properties have poor
   * cellular signal and (b) housekeepers often share devices, so the
   * OTP never reaches the right person. Employee code + PIN is fully
   * offline, doesn't depend on phone-number ownership, and pins are
   * cheap to type on a numeric keypad.
   */
  loginWithEmployeeCode: publicProcedure
    .input(z.object({
      code: z.string().min(1),
      pin: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const normalized = input.code.trim().toUpperCase();

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [person] = await db.select().from(people)
        .where(eq(people.employeeCode, normalized)).limit(1);
      // Same generic error for all failure modes — don't leak whether
      // the employee code exists.
      const fail = () => new TRPCError({ code: "UNAUTHORIZED", message: "Invalid employee ID or PIN" });
      if (!person || !person.userId) throw fail();

      const [user] = await db.select().from(users)
        .where(eq(users.id, person.userId)).limit(1);
      if (!user || !user.isActive) throw fail();

      if (await isAccountLocked(user.id)) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Account locked. Try again in 15 minutes." });
      }

      const [cred] = await db.select().from(authCredentials)
        .where(eq(authCredentials.userId, user.id)).limit(1);
      if (!cred) {
        // No PIN set yet — surface a distinct message so the operator
        // knows to set one via the admin "Set PIN" button rather than
        // sending the user round in circles.
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "PIN not set yet. Ask your supervisor to set a PIN for you.",
        });
      }

      const ok = await verifyPassword(input.pin, cred.passwordHash);
      if (!ok) {
        const { locked } = await recordFailedLogin(user.id);
        if (locked) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Account locked. Try again in 15 minutes." });
        throw fail();
      }

      await clearFailedLogins(user.id);
      const tokens = await issueTokens(user, clientCtx(ctx));
      return {
        user: sanitizeUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt.toISOString(),
        mustChangePin: cred.mustChangePassword,
      };
    }),

  /**
   * Admin-only: set or reset an associate's PIN. Forces a change on
   * next login — admin picks a temporary PIN, the associate replaces
   * it the first time they sign in.
   */
  setAssociatePin: rolesProcedure("super_admin", "central_admin", "ops_lead")
    .input(z.object({
      personId: z.string().uuid(),
      pin: z.string(),
    }))
    .mutation(async ({ input }) => {
      const strength = validatePin(input.pin);
      if (!strength.ok) throw new TRPCError({ code: "BAD_REQUEST", message: strength.reason });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [person] = await db.select().from(people)
        .where(eq(people.id, input.personId)).limit(1);
      if (!person) throw new TRPCError({ code: "NOT_FOUND", message: "Associate not found" });
      if (!person.userId) throw new TRPCError({ code: "BAD_REQUEST", message: "Associate has no user account; run the backfill first." });

      const passwordHash = await hashPassword(input.pin);
      const [existing] = await db.select().from(authCredentials)
        .where(eq(authCredentials.userId, person.userId)).limit(1);

      if (existing) {
        await db.update(authCredentials)
          .set({
            passwordHash,
            passwordSetAt: new Date(),
            mustChangePassword: true,
            failedAttempts: 0,
            lockedUntil: null,
          })
          .where(eq(authCredentials.userId, person.userId));
      } else {
        await db.insert(authCredentials).values({
          id: randomUUID(),
          userId: person.userId,
          passwordHash,
          mustChangePassword: true,
        });
      }

      // Force any existing sessions to re-auth with the new PIN.
      await revokeAllUserTokens(person.userId);
      return { ok: true };
    }),

  /**
   * Change one's own PIN (used by the force-change-on-first-login
   * flow and by associates who want to pick a new one). Same shape
   * as changePassword but with PIN validation rules.
   */
  changeAssociatePin: protectedProcedure
    .input(z.object({
      currentPin: z.string().min(1),
      newPin: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const strength = validatePin(input.newPin);
      if (!strength.ok) throw new TRPCError({ code: "BAD_REQUEST", message: strength.reason });
      if (input.currentPin === input.newPin) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "New PIN must differ from current PIN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [cred] = await db.select().from(authCredentials)
        .where(eq(authCredentials.userId, ctx.user.id)).limit(1);
      if (!cred) throw new TRPCError({ code: "BAD_REQUEST", message: "PIN not set; ask your supervisor to set one" });

      const ok = await verifyPassword(input.currentPin, cred.passwordHash);
      if (!ok) throw new TRPCError({ code: "UNAUTHORIZED", message: "Current PIN incorrect" });

      const newHash = await hashPassword(input.newPin);
      await db.update(authCredentials)
        .set({
          passwordHash: newHash,
          passwordSetAt: new Date(),
          mustChangePassword: false,
          failedAttempts: 0,
          lockedUntil: null,
        })
        .where(eq(authCredentials.userId, ctx.user.id));

      await revokeAllUserTokens(ctx.user.id);
      const tokens = await issueTokens(ctx.user, clientCtx(ctx));
      return {
        ok: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt.toISOString(),
      };
    }),
});
